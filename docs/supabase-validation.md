# Validación Supabase

Última revisión: 2026-07-30.

## Estado

Supabase está creado, las migraciones subidas y la UI ya conectada mediante repositorios reales. Lo que **sigue pendiente** es la validación aislada del backend (RLS con dos usuarios, RPCs, Storage e integridad) y documentar aquí sus resultados. Los checklists de abajo siguen sin marcar hasta ejecutarlos en el Dashboard / SQL Editor.

Para ejecutarla paso a paso, sigue **`docs/supabase-validation-guide.md`** (arrancar la app, crear usuarios, rellenar `supabase/validate_rls.sql`, probar Storage y registrar resultados aquí).

No incluir en este documento URLs privadas, anon keys, service role keys ni datos personales reales.

## Migraciones

- [ ] `001_initial_schema.sql`
- [ ] `002_rls_policies.sql`
- [ ] `003_rpc.sql`
- [ ] `004_family_invites_storage.sql`
- [ ] `005_task_recurrence.sql`
- [ ] `006_event_recurrence.sql`
- [ ] `007_cross_family_integrity.sql`
- [ ] `008_admin_rpcs.sql`
- [ ] `009_accept_invite_rpc.sql`

## Validación RLS

- [ ] Usuario A puede ver datos de familia A.
- [ ] Usuario A no puede ver datos de familia B.
- [ ] Usuario B puede ver datos de familia B.
- [ ] Usuario B no puede ver datos de familia A.
- [ ] Miembro no admin no puede gestionar miembros.
- [ ] Miembro no admin no puede gestionar invitaciones.

Tablas a cubrir:

- [ ] `families`
- [ ] `family_members`
- [ ] `family_invites`
- [ ] `children`
- [ ] `events`
- [ ] `tasks`
- [ ] `lists`
- [ ] `list_items`
- [ ] `meal_plans`
- [ ] `documents`

## Validación RPCs

- [ ] `create_family_with_admin`
- [ ] `update_my_family_profile`
- [ ] `remove_family_member`
- [ ] `update_family_member_role`
- [ ] `accept_family_invite`

Casos obligatorios:

- [ ] No se puede borrar al último admin.
- [ ] No se puede degradar al último admin.
- [ ] Una invitación pendiente solo la puede aceptar el email invitado.
- [ ] Aceptar invitación crea `family_member` y marca la invitación como `accepted`.

## Validación Storage

- [ ] Bucket `documents` existe.
- [ ] Bucket `documents` es privado.
- [ ] Path esperado: `{family_id}/{document_id}/{filename}`.
- [ ] Usuario de la familia puede leer/subir/borrar según policy.
- [ ] Usuario de otra familia no puede acceder aunque conozca el path.

## Validación Integridad

- [ ] No se puede crear `list_item` con `family_id` de una familia y `list_id` de otra.
- [ ] No se puede crear `event` con `child_id` de otra familia.
- [ ] No se puede crear `document` con `child_id` de otra familia.

## Resultado

Pendiente de completar con los resultados reales de `supabase/validate_rls.sql` y pruebas manuales en Dashboard.

## Conexión UI — completada

- ✅ Repositorios Supabase reales (`supabase-repos.ts`).
- ✅ `StoreProvider` async con loading/error.
- ✅ Onboarding para usuario sin familia.
- ✅ Logout visible.
- ✅ Documentos reales con Storage (subida, signed URL, borrado).
- ✅ Invitaciones por magic link.
