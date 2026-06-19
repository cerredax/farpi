# Arquitectura

## Objetivo técnico

Mantener Nido simple: una app web privada, mobile-first, con Supabase como backend base y sin introducir backend complejo.

## Capas actuales

```text
UI / Pantallas
  -> StoreProvider (store-context.tsx)
    -> mock-store.ts
      -> localStorage
```

La app todavía no consume Supabase desde la UI de forma general. El modo demo sigue siendo la fuente de datos activa mientras se validan RLS, RPCs y Storage.

## Modo demo

Archivos principales:

- `src/lib/mock-store.ts`
- `src/lib/store-context.tsx`
- `src/lib/family-config.ts`

Persistencia:

- Clave: `nido_store_v1`
- Ubicación: `localStorage`
- Versión interna: `SCHEMA_VER = 6`

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

- Proyecto Supabase creado.
- Migraciones base subidas/preparadas.
- Validación aislada en curso.
- UI todavía pendiente de conectar mediante repositorios reales.

Migraciones:

- `001_initial_schema.sql` — tablas, índices, triggers `updated_at`
- `002_rls_policies.sql` — RLS + función `my_family_ids()` (security definer, search_path fijo)
- `003_rpc.sql` — `create_family_with_admin`, `update_my_family_profile`
- `004_family_invites_storage.sql` — tabla `family_invites`, policies, bucket `documents`
- `005_task_recurrence.sql` — columnas `recurrence` y `recurrence_end` en `tasks`
- `006_event_recurrence.sql` — columna `recurrence_group_id` en `events`
- `007_cross_family_integrity.sql` — triggers que impiden que `list_items`, `events` y `documents` crucen familias
- `008_admin_rpcs.sql` — `remove_family_member`, `update_family_member_role` (security definer); reemplaza policy `Admin gestiona miembros` por `Admin inserta miembros`
- `009_accept_invite_rpc.sql` — `accept_family_invite(invite_id)` (security definer): crea `family_member` y marca la invitación como aceptada; devuelve el `family_id`

Regla central de RLS:

> Un usuario solo puede ver, crear, editar o borrar datos de las familias a las que pertenece como miembro en `family_members`.

Detalles de seguridad:

- `my_family_ids()` es `security definer` con `set search_path = public`.
- No existe policy de UPDATE directo sobre `family_members`. Para editar el propio perfil existe `update_my_family_profile` (RPC) que restringe los campos a `display_name` y `avatar_url`.
- Las policies de `family_invites` para UPDATE incluyen `using` y `with check`.

## Regla del último admin

**Decisión de producto:** Una familia debe tener siempre al menos un admin. Está prohibido eliminar o degradar al único admin de una familia.

**Implementación:** No se implementa con policies RLS (que no tienen acceso fácil a recuentos de roles). Se implementa mediante RPCs `security definer` en Supabase.

### RPCs implementadas (migración 008)

- `remove_family_member(p_member_id uuid)` — elimina un miembro; valida que el llamante es admin y que no es el único admin.
- `update_family_member_role(p_member_id uuid, p_role text)` — cambia el rol; mismas validaciones.

Ambas son `security definer` con `set search_path = public, auth`. La policy `Admin gestiona miembros` (`for all`) queda reemplazada por `Admin inserta miembros` (`for insert`) — UPDATE y DELETE deben hacerse vía RPC.

### Invitaciones

La migración `009_accept_invite_rpc.sql` añade `accept_family_invite(invite_id uuid)`.

Esta RPC:

1. Verifica que el usuario está autenticado.
2. Busca una invitación pendiente para el email del usuario.
3. Crea el `family_member`.
4. Marca la invitación como `accepted`.
5. Devuelve el `family_id`.

Pendiente de producto: decidir el canal de entrega de invitaciones (magic link, deep link o email con instrucciones).

## Repositorios

Ya existen contratos en:

- `src/lib/repos/types.ts`

Objetivo futuro:

```text
UI / Pantallas
  -> StoreProvider o hooks de datos
    -> repositorios
      -> mockRepository o supabaseRepository
```

Esto permitirá mantener modo demo y Supabase sin duplicar la UI. La siguiente etapa técnica es implementar repositorios reales y hacer que `StoreProvider` consuma la frontera async de repositorios en lugar del store mock directo.

El hook `src/hooks/useFamily.ts` es experimental y no está conectado a ninguna UI. Será reemplazado por los repositorios definitivos en Fase 4.

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
- `src/hooks/useConfirmAction.ts`

Los sheets deben funcionar bien en móvil pequeño:

- Altura máxima con `max-h-[92dvh]`.
- Scroll interno con `flex-1 overflow-y-auto min-h-0`.
- Botón principal en `flex-shrink-0` footer, siempre visible aunque el teclado esté abierto.

## Decisiones pendientes

- Cómo entregar invitaciones reales (email + deep link o magic link).
- Cómo representar familia activa con Supabase (sesión + tabla de miembros).
- Si el modo demo será permanente o solo de desarrollo.
- Cuándo migrar `StoreProvider` a acciones async (Fase 5).
- Cuándo añadir tests e2e con `@playwright/test` (Fase 8).
