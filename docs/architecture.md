# Arquitectura

## Objetivo técnico

Mantener Nido simple: una app web privada, mobile-first y preparada para Supabase sin introducir backend complejo.

## Capas actuales

```text
UI / Pantallas
  -> StoreProvider (store-context.tsx)
    -> mock-store.ts
      -> localStorage
```

La app todavía no consume Supabase desde la UI. El modo demo es la fuente de datos activa.

## Modo demo

Archivos principales:

- `src/lib/mock-store.ts`
- `src/lib/store-context.tsx`
- `src/lib/family-config.ts`

Persistencia:

- Clave: `nido_store_v1`
- Ubicación: `localStorage`
- Versión interna: `SCHEMA_VER = 3`

El mock debe comportarse lo más parecido posible a Supabase:

- Datos siempre filtrados por `family_id`.
- Borrado de hijo con `child_id = null` en eventos/documentos.
- Comidas sin duplicados por familia, fecha y slot.
- Invitaciones separadas de miembros reales.

## Supabase previsto

Usos previstos:

- Auth.
- PostgreSQL.
- Row Level Security.
- Storage privado para documentos.

Migraciones:

- `001_initial_schema.sql` — tablas, índices, triggers `updated_at`
- `002_rls_policies.sql` — RLS + función `my_family_ids()` (security definer, search_path fijo)
- `003_rpc.sql` — `create_family_with_admin`, `update_my_family_profile`
- `004_family_invites_storage.sql` — tabla `family_invites`, policies, bucket `documents`

Regla central de RLS:

> Un usuario solo puede ver, crear, editar o borrar datos de las familias a las que pertenece como miembro en `family_members`.

Detalles de seguridad:

- `my_family_ids()` es `security definer` con `set search_path = public`.
- No existe policy de UPDATE directo sobre `family_members`. Para editar el propio perfil existe `update_my_family_profile` (RPC) que restringe los campos a `display_name` y `avatar_url`.
- Las policies de `family_invites` para UPDATE incluyen `using` y `with check`.

## Regla del último admin

**Decisión de producto:** Una familia debe tener siempre al menos un admin. Está prohibido eliminar o degradar al único admin de una familia.

**Implementación:** No se implementa con policies RLS (que no tienen acceso fácil a recuentos de roles). Se implementará mediante RPCs `security definer` en Supabase.

### RPCs previstas (Fase 4)

```sql
-- Eliminar miembro de una familia
-- Valida: llamante es admin, no se elimina el último admin
create or replace function public.remove_family_member(member_id uuid)
returns void ...

-- Cambiar rol de un miembro
-- Valida: llamante es admin, no degrada al último admin
create or replace function public.update_family_member_role(member_id uuid, role text)
returns void ...
```

Ambas RPCs deberán:

1. Verificar que `auth.uid()` es admin de la familia del miembro objetivo.
2. Contar los admins restantes antes de aplicar el cambio.
3. Rechazar la operación si quedaría 0 admins.
4. No permitir cambiar `family_id` ni `user_id`.
5. Usar `security definer` + `set search_path = public`.

La policy `Admin gestiona miembros` (`for all`) de `002_rls_policies.sql` puede mantenerse mientras no haya UI real para borrar/degradar miembros. En Fase 4 se sustituirá por policies más granulares o se dependerá solo de las RPCs.

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

Esto permitirá mantener modo demo y Supabase sin duplicar la UI.

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

- Cómo aceptar invitaciones reales (email + deep link o magic link).
- Cómo representar familia activa con Supabase (sesión + tabla de miembros).
- Si el modo demo será permanente o solo de desarrollo.
- Cuándo migrar `StoreProvider` a acciones async (Fase 5).
- Cuándo añadir tests e2e con `@playwright/test` (Fase 8).
