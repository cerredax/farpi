# Validación Supabase

Última revisión: 2026-06-19.

## Estado

Supabase ya está creado y las migraciones base de Nido se han subido/preparado para validación. La UI sigue funcionando principalmente en modo demo/mock; este documento registra la validación aislada del backend antes de conectar repositorios reales.

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

## Pendientes Antes De Conectar UI

- Implementar repositorios Supabase reales.
- Preparar `StoreProvider` async con loading/error.
- Crear onboarding para usuario sin familia.
- Añadir logout visible.
- Implementar documentos reales con Storage.
- Decidir entrega de invitaciones reales: magic link, deep link o flujo interno.
