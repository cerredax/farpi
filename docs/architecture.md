# Arquitectura

## Objetivo técnico

Mantener Nido simple: una app web privada, mobile-first, con Supabase como backend base y sin introducir backend complejo.

## Capas actuales

```text
UI / Pantallas
  -> StoreProvider (store-context.tsx)   [async: loading / error / reload]
    -> Repos (contrato src/lib/repos/types.ts)
       ├─ supabaseRepos (src/lib/supabase-repos/*)   ← IS_DEMO_MODE = false
       └─ mockRepos     (src/lib/mock-repos.ts)      ← IS_DEMO_MODE = true
            -> src/lib/store/* -> localStorage
```

La UI ya consume Supabase de forma general a través de la frontera de repositorios. `StoreProvider` selecciona `supabaseRepos` o `mockRepos` según `IS_DEMO_MODE` (definido en `src/lib/supabase/env.ts`), sin duplicar pantallas. El modo demo persiste en `localStorage` y sirve como fallback y como entorno de pruebas e2e.

## Modo demo

Archivos principales:

- `src/lib/store/` (módulos del mock, uno por dominio)
- `src/lib/store-context.tsx`
- `src/lib/family-config.ts`

Persistencia:

- Clave: `nido_store_v1`
- Ubicación: `localStorage`
- Versión interna: `SCHEMA_VER = 6`, en `src/lib/store/persist.ts`

El mock debe comportarse lo más parecido posible a Supabase:

- Datos siempre filtrados por `family_id`.
- Borrado de hijo con `child_id = null` en eventos/documentos.
- Comidas sin duplicados por familia, fecha y slot.
- Invitaciones separadas de miembros reales.

## Supabase

Usos:

- Auth.
- PostgreSQL.
- Row Level Security.
- Storage privado para documentos.

Estado:

- Proyecto Supabase creado y migraciones subidas.
- UI conectada mediante repositorios reales (`src/lib/supabase-repos/`, un módulo por dominio igual que el mock).
- Auth, invitaciones por magic link, roles y documentos en Storage operativos.
- Validación aislada completada (2026-08-03): 47/47 comprobaciones de RLS, RPCs, integridad y Storage. Ver `docs/supabase-validation.md`.

La detección de "modo demo" (sin credenciales reales) está centralizada en `src/lib/supabase/env.ts` y la comparten cliente, servidor, proxy (`middleware.ts`) y rutas API, para evitar divergencias entre capas.

Migraciones:

- `001_initial_schema.sql` — tablas, índices, triggers `updated_at`
- `002_rls_policies.sql` — RLS + función `my_family_ids()` (security definer, search_path fijo)
- `003_rpc.sql` — `create_family_with_admin`, `update_my_family_profile` (sustituida en `014`)
- `004_family_invites_storage.sql` — tabla `family_invites`, policies, bucket `documents`
- `005_task_recurrence.sql` — columnas `recurrence` y `recurrence_end` en `tasks`
- `006_event_recurrence.sql` — columna `recurrence_group_id` en `events`
- `007_cross_family_integrity.sql` — triggers que impiden que `list_items`, `events` y `documents` crucen familias
- `008_admin_rpcs.sql` — `remove_family_member`, `update_family_member_role` (security definer); reemplaza policy `Admin gestiona miembros` por `Admin inserta miembros`
- `009_accept_invite_rpc.sql` — `accept_family_invite(p_invite_id)` (security definer): crea `family_member` y marca la invitación como aceptada; devuelve el `family_id`
- `010_push_subscriptions.sql` — tabla `push_subscriptions` con RLS por usuario
- `011_account_deletion.sql` — `created_by` pasa a nullable (`on delete set null`)
- `012_member_assignment.sql` — `member_id` en `events` y `documents`, para asignar a adultos y no solo a hijos
- `013_event_kind.sql` — `kind` en `events` (`evento` | `vacaciones`), con `check` que obliga a las vacaciones a tener día final

Regla central de RLS:

> Un usuario solo puede ver, crear, editar o borrar datos de las familias a las que pertenece como miembro en `family_members`.

Detalles de seguridad:

- `my_family_ids()` es `security definer` con `set search_path = public`.
- No existe policy de UPDATE directo sobre `family_members`. El perfil se edita con `update_family_member_profile` (RPC, `014`), que restringe los campos a `display_name` y `color`, y permite hacerlo a uno mismo o a un admin de esa familia. Sustituye a `update_my_family_profile`, que solo dejaba editarse a uno mismo.
- Las policies de `family_invites` para UPDATE incluyen `using` y `with check`.

## Regla del último admin

**Decisión de producto:** Una familia debe tener siempre al menos un admin. Está prohibido eliminar o degradar al único admin de una familia.

**Implementación:** No se implementa con policies RLS (que no tienen acceso fácil a recuentos de roles). Se implementa mediante RPCs `security definer` en Supabase para la gestión de miembros, y el endpoint `/api/account/delete` bloquea borrar la cuenta si eso dejaría una familia compartida sin admin.

### RPCs implementadas (migración 008)

- `remove_family_member(p_member_id uuid)` — elimina un miembro; valida que el llamante es admin y que no es el único admin.
- `update_family_member_role(p_member_id uuid, p_role text)` — cambia el rol; mismas validaciones.

Ambas son `security definer` con `set search_path = public, auth`. La policy `Admin gestiona miembros` (`for all`) queda reemplazada por `Admin inserta miembros` (`for insert`) — UPDATE y DELETE deben hacerse vía RPC.

### Invitaciones

La migración `009_accept_invite_rpc.sql` añade `accept_family_invite(p_invite_id uuid)`.

Esta RPC:

1. Verifica que el usuario está autenticado.
2. Busca una invitación pendiente para el email del usuario.
3. Crea el `family_member`.
4. Marca la invitación como `accepted`.
5. Devuelve el `family_id`.

Canal de entrega elegido: **magic link** vía `admin.auth.admin.inviteUserByEmail` en `/api/invite`, con `redirectTo` a `/auth/callback?invite_id=...`.

`/auth/callback` es una **página de cliente**, no un route handler, y no es un detalle
menor: los enlaces de invitación devuelven la sesión en el **fragmento** de la URL
(`#access_token=…`, flujo implícito), y el fragmento nunca llega al servidor. Resuelto
en servidor, la invitación se perdía en silencio y el usuario quedaba autenticado pero
fuera de la familia. La página atiende los dos flujos —fragmento y `?code=` de PKCE— y
muestra un mensaje claro cuando el enlace ha caducado o ya se usó.

## Asignación de eventos y documentos

Un evento o un documento puede pertenecer a **toda la familia**, a **un miembro adulto**
o a **un hijo**, nunca a dos a la vez. Se modela con dos columnas nullables, `child_id` y
`member_id`, y un `check` que impide que ambas estén rellenas.

Son conceptos distintos y por eso no se unificaron en una sola columna: un miembro tiene
cuenta y entra en la app; un hijo es alguien de quien la familia lleva registro. Los hijos
guardan su color en la base de datos; los miembros lo reciben por su posición, en
`src/lib/assignees.ts`, que es la única fuente de ese cálculo para que el color sea el
mismo en Ajustes, calendario y documentos.

Al eliminar a un miembro, sus asignaciones pasan a ser de toda la familia
(`on delete set null`); el mock lo imita en `store/family.ts`.

El color con el que se pinta un evento sale de `eventColor()`, en el mismo archivo: el
color propio del evento, si no el de quien lo lleve, y si no hay nadie el `FAMILY_COLOR`
amarillo. Está centralizado porque cuando el cálculo estaba copiado en cada pantalla,
Inicio se quedó sin el último escalón y los eventos de toda la familia salían sin marca.

## Vacaciones

Unas vacaciones **no son una entidad aparte**: son un evento de varios días
asignado a una persona. Reutilizan las policies, la asignación y la integridad
entre familias, así que la única diferencia es `kind = 'vacaciones'` y que
`end_at`, que en un evento normal marca la hora de fin, aquí marca el último día.

Eso obligó a cambiar una suposición que estaba repartida por el calendario: que
un evento vivía en un solo día. Los tres sitios que comparaban `start_at` con el
día usan ahora `eventCoversDay` (`src/lib/events.ts`), que pregunta si el evento
cubre esa fecha. Las comparaciones se hacen sobre cadenas `yyyy-MM-dd`, no sobre
`Date`, para no arrastrar líos de zona horaria.

En la rejilla del mes se dibujan como una franja continua bajo el número del día,
con el color de la persona y los extremos redondeados; no como un punto más,
porque de unas vacaciones lo que importa es el tramo.

## Repositorios

Frontera de datos ya implementada:

```text
UI / Pantallas
  -> StoreProvider (async)
    -> Repos (contrato src/lib/repos/types.ts)
       ├─ supabaseRepos (src/lib/supabase-repos/*)
       └─ mockRepos     (src/lib/mock-repos.ts)
```

`StoreProvider` consume la frontera async de repositorios y elige implementación según `IS_DEMO_MODE`, manteniendo modo demo y Supabase sin duplicar la UI. El hook experimental `src/hooks/useFamily.ts` y los stubs sueltos de `src/lib/repos/*` (salvo `types.ts`) se eliminaron por quedar obsoletos.

## Fechas

Usar helpers de:

- `src/lib/date-utils.ts`

Regla:

- Para fechas familiares como comidas o "hoy", usar fecha local.
- Evitar `toISOString().split('T')[0]` para representar fechas locales.
- Los eventos con hora pueden usar datetime, pero hay que tratar con cuidado eventos de todo el día.

## Validaciones

Usar:

- `src/lib/validators.ts`
- `src/lib/constants.ts`

No añadir librerías pesadas de validación salvo que el proyecto crezca.

## UI compartida

Componentes clave:

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/BottomSheet.tsx`
- `src/components/ui/Field.tsx` — etiqueta + control con el espaciado estándar
- `src/components/ui/SheetFooter.tsx` — pie con error, acción principal y borrado
- `src/components/ui/SelectChip.tsx` y `src/components/ui/DotOption.tsx` — opciones seleccionables
- `src/components/ui/CircleCheck.tsx` y `src/components/ui/CirclePlus.tsx` — el círculo de marcar y su hermano de sumar, con las mismas medidas y área de toque. El `+` es para lo que no está pendiente sino esperando a volver a hacer falta (el catálogo de las listas), donde un tic diría "hecho"
- `src/hooks/useSheetForm.ts` — `useSheetForm` (draft, error, foco, submit validado) y `useSheetDelete`
- `src/hooks/useConfirmAction.ts`

Un sheet con formulario se monta así: `useSheetForm` para el estado, `Field` para cada campo,
`SheetFooter` para el pie y `useSheetDelete` cuando hay borrado. Las vistas remontan los sheets
con `key` al abrirlos, por eso el draft inicial se evalúa una sola vez.

Todos los sheets usan el `BottomSheet` compartido (patrón `form` + `footer`), que ya resuelve el comportamiento en móvil pequeño y aporta modal centrado en escritorio:

- Altura máxima con `max-h-[92dvh]`.
- Scroll interno con `flex-1 overflow-y-auto min-h-0`.
- Botón principal en el `footer` fijo, siempre visible aunque el teclado esté abierto.

## Decisiones tomadas

- Invitaciones: **magic link** (`inviteUserByEmail` + `/auth/callback?invite_id`).
- Familia activa: sesión Supabase + tabla `family_members`, resuelta en `AppShell` y persistida con `family-config`.
- `StoreProvider` migrado a acciones async (Fase 5, hecho).
- Tests e2e smoke con `@playwright/test` añadidos (Fase 8).

## Decisiones pendientes

- Si el modo demo será permanente o solo de desarrollo/pruebas.
- Alcance de la migración a tokens de color (refactor de UI, sin urgencia).
