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
- Migraciones 001–018 aplicadas y revalidadas. Las 017 y 018 entraron el 2026-08-21 y `node scripts/validate-rls.mjs` volvió a dar 51/51 ese mismo día, el mismo recuento que tras las 015 y 016: ninguna de las dos toca policies ni aislamiento.

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
- `014_member_profile.sql` — `color` en `family_members` y RPC `update_family_member_profile`, que sustituye a `update_my_family_profile`
- `015_task_assignment.sql` — `child_id`, `member_id` y `completed_by` en `tasks`, con el mismo `check` de exclusión que eventos y documentos, y los triggers cross-family correspondientes
- `016_document_expiry.sql` — `expires_on` en `documents` (nullable) e índice por `(family_id, expires_on)`
- `017_event_kind_descanso.sql` — amplía el `check` de `events.kind` a `descanso` y le exige día completo y fecha final, igual que a las vacaciones
- `018_person_kind.sql` — `kind` en `children` (`hijo` | `adulto`), para los adultos de la familia que no tienen cuenta

Se aplican a mano por el SQL Editor: no hay CLI de Supabase enlazada, así que los
ficheros numerados son el único registro de qué se aplicó y en qué orden.
`all_in_one.sql` es la concatenación de todas para levantar un proyecto de cero, y
**está generado** por `scripts/gen-all-in-one.mjs` (con `--check` avisa si se ha
quedado atrás). Antes se mantenía a mano, con el riesgo evidente de que dejara de
coincidir en silencio.

Regla central de RLS:

> Un usuario solo puede ver, crear, editar o borrar datos de las familias a las que pertenece como miembro en `family_members`.

Detalles de seguridad:

- `my_family_ids()` es `security definer` con `set search_path = public`.
- No existe policy de UPDATE directo sobre `family_members`. El perfil se edita con `update_family_member_profile` (RPC, `014`), que restringe los campos a `display_name` y `color`, y permite hacerlo a uno mismo o a un admin de esa familia. Sustituye a `update_my_family_profile`, que solo dejaba editarse a uno mismo.
- Las policies de `family_invites` para UPDATE incluyen `using` y `with check`.

## Superficie de seguridad fuera de la base de datos

La validación 47/47 cubre RLS, RPCs y Storage: la base de datos. Lo que queda por
encima —las rutas API y el callback de correo— se revisó el 2026-08-05:

- `/api/invite` usa la service role **solo** para mandar el email; la invitación
  se inserta con el cliente del usuario (RLS) y antes comprueba que quien llama
  es admin de esa familia.
- `/api/account/delete` aplica la regla del último admin y borra los documentos
  de Storage antes que la familia.
- `/api/push` se apoya en la policy de `push_subscriptions`: un upsert con el
  endpoint de otra persona no puede robar su suscripción porque el `using` de la
  policy no deja tocar filas ajenas.
- `/api/cron/reminders` se protege con `CRON_SECRET`, y el proxy la deja pasar
  sin sesión a propósito.
- El proxy (`src/proxy.ts`) manda al login todo lo que no sea público.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app.
  Sin eso, un enlace de correo legítimo podía acabar en otra web justo después
  de iniciar sesión.
- Cabeceras en `next.config.ts`. Sin CSP a propósito: Next inyecta scripts en
  línea y una CSP mal puesta rompe producción sin avisar en local.

No hay `dangerouslySetInnerHTML` ni `eval` en todo el código.

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

## Asignación de eventos, tareas y documentos

Un evento, una tarea o un documento puede pertenecer a **toda la familia**, a **un miembro
adulto** o a **un hijo**, nunca a dos a la vez. Se modela con dos columnas nullables,
`child_id` y `member_id`, y un `check` que impide que ambas estén rellenas.

Las tareas llegaron las últimas (migración 015) y son donde más falta hacía: en una casa
compartida la pregunta de una tarea es "¿quién la hace?". Guardan además `completed_by`,
porque `completed_at` decía cuándo pero no quién.

Son conceptos distintos y por eso no se unificaron en una sola columna: un miembro tiene
cuenta y entra en la app; un hijo es alguien de quien la familia lleva registro. Los hijos
guardan su color en la base de datos; los miembros lo reciben por su posición, en
`src/lib/assignees.ts`, que es la única fuente de ese cálculo para que el color sea el
mismo en Ajustes, calendario y documentos.

Al eliminar a un miembro, sus asignaciones pasan a ser de toda la familia
(`on delete set null`); el mock lo imita en `store/family.ts`.

Los colores que se pueden elegir son `PERSON_COLORS`, en `src/lib/constants.ts`, y son
**ocho, no doce, y de claridad escalonada a propósito**. El porqué está escrito en el
propio archivo, junto a la lista: doce pasteles no se distinguen entre sí —es geometría,
no mala suerte al elegirlos— y con daltonismo rojo-verde solo queda la claridad para
separarlos. `e2e/unit/assignees.spec.ts` vigila lo que se puede vigilar sin meter
CIEDE2000 en el repositorio: que no se repitan, que ninguno sea el `FAMILY_COLOR` ni el
verde de la app, y que todos aguanten las iniciales blancas a 3:1.

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
- `src/components/layout/SaveStatus.tsx` — el único sitio que cuenta qué pasa con los datos: si algo se está guardando, si ha fallado y si lo último se puede deshacer. Vive en el armazón, así que cubre todas las pantallas

El deshacer lo sirve el store (`undoLabel` / `undo()` / `clearUndo()`). Devolver una tarea marcada no es solo desmarcarla: si se repite, marcarla no la completa sino que le empuja `due_date` a la siguiente vez. `restaurarTarea` compara con el estado anterior y revierte solo lo que cambió, para no repetir en la UI la bifurcación que ya vive en el repo.

Un sheet con formulario se monta así: `useSheetForm` para el estado, `Field` para cada campo,
`SheetFooter` para el pie y `useSheetDelete` cuando hay borrado. Las vistas remontan los sheets
con `key` al abrirlos, por eso el draft inicial se evalúa una sola vez.

Todos los sheets usan el `BottomSheet` compartido (patrón `form` + `footer`), que ya resuelve el comportamiento en móvil pequeño y aporta modal centrado en escritorio:

- Altura máxima con `max-h-[92dvh]`.
- Scroll interno con `flex-1 overflow-y-auto min-h-0`.
- Botón principal en el `footer` fijo, siempre visible aunque el teclado esté abierto.

## Decisiones de producto

Estas decisiones se tomaron con motivo y costaron varias vueltas cada una. Vistas desde
fuera parecen incoherencias que hay que arreglar, y no lo son: si algo aquí va a
cambiar, que sea a propósito.

**Una lista de casa no es una lista de tareas.** "Leche" no se completa: se acaba,
se compra y se vuelve a acabar. Por eso las listas marcan **lo que falta**, no lo
que se ha hecho. Arriba lo pendiente; debajo, plegado, "Apuntar de lo de siempre",
que es el catálogo de lo que compráis siempre y del que se tira con un toque. Lo
del catálogo no sale tachado ni atenuado: no está muerto, está a un toque de volver
a hacer falta. Nada de barras de progreso ni de "2/5" — a nadie le importa haber
comprado el 40% de la compra. En la base de datos no cambia nada: un ítem que hace
falta es el que antes estaba pendiente. Cambia lo que significa en pantalla.

**El catálogo se pide con un `+`, no con un tic.** Un tic ahí diría "hecho", que en
este modelo no significa nada. De ahí que `CircleCheck` y `CirclePlus` sean dos
componentes hermanos con las mismas medidas.

**Lo atrasado se arrastra al día de hoy.** El tramo del calendario empieza hoy, así
que todo lo vencido caía fuera: lo que más urge era lo único invisible. Una tarea
vencida aparece en el día de hoy marcada como atrasada — con la palabra en Inicio y
con un icono etiquetado en el calendario, donde a 390 px no cabe. Desaparecer no es
lo que le pasa a una tarea sin hacer.

El efecto de esa regla es que hoy acumula todo el atraso, y en la agenda eso se
notaba demasiado: seis tareas hacían la fila de hoy seis veces más alta que las
demás, con seis triángulos rojos seguidos, y el calendario abría enseñando la lista
de tareas en vez de los planes. Desde `TAREAS_PARA_PLEGAR` (3) van plegadas bajo una
línea que dice cuántas hay y cuántas van tarde, y se abre de un toque. **Resumir no
es esconder**: el recuento está a la vista, que es lo que la regla pedía. Los eventos
no se pliegan nunca — esto es el calendario, y lo que pasa manda sobre lo que hay que
hacer.

**Las vacaciones son del calendario, no un plan de hoy.** Un evento con
`kind = 'vacation'` se pinta como franja en el calendario y queda **fuera** de la
lista de eventos, de los planes de hoy (`selectTodayEvents`) y del recordatorio
diario. Estar de vacaciones no es un plan que haya que recordarle a nadie a las
siete de la mañana.

**En el móvil, un día por horas; nunca siete columnas.** La semana plegada enseña el
día elegido sobre un eje de horas (`DayTimeline`), no la rejilla de siete columnas de
un calendario de escritorio. A 390 px cada columna sería de unos 45 px: bloques de
color sin texto, que hay que tocar para saber qué son. Es también por lo que Google
Calendar no pone esa vista por defecto en el teléfono. Con el mes desplegado la
pregunta cambia a "¿qué hay por delante?", y ahí sí manda una lista (`AgendaList`).

Dos cosas que los datos no traen y decide la vista: un evento **sin hora de fin** se
dibuja con 45 minutos, porque el formulario acepta dejarla vacía y un bloque sin
duración no se puede pintar; y las **tareas**, que vencen un día pero no ocurren a una
hora, van en la franja de "todo el día". El eje se recorta a las horas que tienen
algo: el día de una familia son dos o tres citas, y de 00:00 a 24:00 era casi todo
blanco.

**Un abuelo es un adulto sin cuenta, y vive en `children`.** La frontera de la app
no es adulto/niño, es **con cuenta / sin cuenta**. `family_members` cuelga de
`auth.users` con `user_id not null`: para estar ahí hace falta correo, cuenta y
sesión, y de esa tabla dependen `my_family_ids()`, las policies y la regla del
último admin. Una abuela que recoge a los niños los martes no tiene nada de eso y
sin embargo hay que poder asignarle cosas.

Por eso los adultos sin cuenta van en `children` con `kind = 'adulto'` (migración
018) y no en `family_members` con el usuario a null. `children` es ya la tabla de
las personas de las que la familia lleva registro: nombre, color, asignación por
`child_id` en eventos, tareas y documentos, y sus triggers de integridad entre
familias. Se descartó tocar `family_members` porque habría metido mano en la tabla
de la que cuelga toda la seguridad para no ganar nada, y se descartó una tabla nueva
por lo mismo que lo descartó la 012: duplicar policies, triggers e integridad para
lo mismo.

El precio es que la tabla se llama `children` y guarda abuelos. Se paga a gusto:
renombrarla arrastraría claves ajenas, policies y triggers de media base. En Ajustes
son tres bloques —**Adultos** (con cuenta, se invitan por correo), **Otros adultos**
(sin cuenta, se añaden con un nombre y un color) e **Hijos**—, y en "asignar a" los
adultos van juntos, con cuenta o sin ella: a la hora de asignar algo da igual quién
entra en la app.

Y una regla que las cruza todas: **buscando sí se enseña todo**, incluido el
catálogo y el pasado del calendario. Esconder algo que sí coincide sería contestar
"no hay nada" a una búsqueda que encontró algo. En el calendario eso significa que
buscar cambia la vista: el día por horas deja paso a la lista de resultados, porque
una búsqueda atraviesa el calendario entero y no cabe en un día.

## Tono de la interfaz

La app habla como se habla en una casa, y desafina en cuanto se cuela el registro
de una herramienta de trabajo. Al escribir textos nuevos:

- **Vosotros, no el usuario.** "Ya tenéis leche", "no lo habíais apuntado nunca".
- **Los vacíos dicen qué pasa, no que no hay datos.** "Sin planes", "No falta nada",
  "Sin menú para hoy" — nunca "No se han encontrado elementos".
- **Las etiquetas dicen lo que hace el toque**, con el nombre de la cosa dentro:
  "Apuntar que hace falta Leche", "Ya tenéis Leche, quitar de lo que falta". No
  "marcar como hecho".
- **Nada de jerga de gestor de proyectos**: ni completado, ni progreso, ni
  porcentajes. Salvo en Tareas, que sí son tareas.
- **Los ejemplos son de esta casa**: "Ej: Cartilla vacunas Ana", "Ej: Leche entera".
- Frases cortas y sin signos de admiración. La única excepción del repo es
  «Lista vacía. ¡Añade el primer ítem!» (`ListDetailView.tsx`), que se quedó de antes
  y desafina: no la tomes como modelo.

## Decisiones técnicas

- Invitaciones: **magic link** (`inviteUserByEmail` + `/auth/callback?invite_id`).
- Familia activa: sesión Supabase + tabla `family_members`, resuelta en `AppShell` y persistida con `family-config`.
- `StoreProvider` migrado a acciones async (Fase 5, hecho).
- Tests con `@playwright/test`, un solo runner para dos cosas: los unitarios de
  lógica pura en `e2e/unit/` (sin servidor, ~0,6 s) y los de navegador. Se eligió así
  para no añadir una dependencia más solo por los unitarios.
- Migración a tokens de color completada (2026-08-03): de 109 apariciones a 36. Lo
  que queda literal son datos, marca de terceros y decorativos de un solo uso.

## Decisiones pendientes

- Si el modo demo será permanente o solo de desarrollo/pruebas.
- Si se publica en Google Play como TWA. Afecta poco al código (assetlinks y package
  name), pero fija el dominio para siempre.
