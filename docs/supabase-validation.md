# Validación Supabase

Última revisión: 2026-08-03. **Fase 3 cerrada: 39/39 comprobaciones correctas.**

## Estado

Backend validado contra el proyecto real con dos usuarios y dos familias de prueba, creados y eliminados durante la ejecución. Los datos reales de la familia no se tocaron.

**Método.** En lugar de `set role` desde el SQL Editor, las pruebas se ejecutaron con **sesiones de usuario reales**: se autentican los dos usuarios, se obtiene su JWT y se ataca la API REST con él. Es el mismo trayecto que recorre la app (JWT → PostgREST → RLS), así que valida también que las policies se aplican con el token del usuario y no solo a nivel de rol de base de datos.

No se incluyen aquí URLs privadas, claves ni datos personales.

## Migraciones

Verificadas por la existencia de sus objetos (tablas, funciones, columnas y bucket) en el proyecto:

- [x] `001_initial_schema.sql` — las 10 tablas del MVP existen
- [x] `002_rls_policies.sql` — RLS activo; `my_family_ids()` expuesta
- [x] `003_rpc.sql` — `create_family_with_admin`, `update_my_family_profile`
- [x] `004_family_invites_storage.sql` — `family_invites` y bucket `documents` privado
- [x] `005_task_recurrence.sql` — columnas de recurrencia en `tasks`
- [x] `006_event_recurrence.sql` — `recurrence_group_id` en `events`
- [x] `007_cross_family_integrity.sql` — triggers verificados en caliente (ver Integridad)
- [x] `008_admin_rpcs.sql` — `remove_family_member`, `update_family_member_role`
- [x] `009_accept_invite_rpc.sql` — `accept_family_invite(p_invite_id uuid)`
- [x] `010_push_subscriptions.sql` — tabla `push_subscriptions`
- [x] `011_account_deletion.sql` — `created_by` es nullable en las tablas de contenido

## Validación RLS

- [x] Usuario A puede ver datos de familia A.
- [x] Usuario A no puede ver datos de familia B.
- [x] Usuario B puede ver datos de familia B.
- [x] Usuario B no puede ver datos de familia A.
- [x] Miembro no admin no puede gestionar miembros.
- [x] Miembro no admin no puede gestionar invitaciones.

Tablas cubiertas, comprobando que B recibe 0 filas de la familia de A:

- [x] `families` — B no la ve; su UPDATE afecta a 0 filas
- [x] `family_members` — B no puede auto-insertarse (error de la BD)
- [x] `family_invites` — B recibe 403 al intentar invitar en la familia de A
- [x] `children`
- [x] `events`
- [x] `tasks` — además, el DELETE de B sobre una tarea de A afecta a 0 filas
- [x] `lists`
- [x] `list_items`
- [x] `meal_plans`
- [x] `documents`

Detalle importante: los intentos de lectura ajena **no dan error, devuelven lista vacía**, que es el comportamiento correcto de RLS. Los de escritura sí devuelven 403.

## Validación RPCs

- [x] `create_family_with_admin` — crea la familia y deja al llamante como `admin`
- [x] `update_my_family_profile` — A edita su perfil; el intento de B no cambia nada
- [x] `remove_family_member`
- [x] `update_family_member_role`
- [x] `accept_family_invite`

Casos obligatorios:

- [x] No se puede borrar al último admin (400).
- [x] No se puede degradar al último admin (400).
- [x] Un usuario ajeno no puede eliminar ni cambiar el rol de miembros de otra familia.
- [x] Una invitación pendiente solo la puede aceptar el email invitado.
- [x] Aceptar invitación crea `family_member` y marca la invitación como `accepted`.
- [x] Tras aceptar, el nuevo miembro **sí** ve los datos de la familia, y como no-admin no puede eliminar miembros ni invitar.

## Validación Storage

- [x] Bucket `documents` existe.
- [x] Bucket `documents` es privado (`public = false`).
- [x] Path esperado: `{family_id}/{document_id}/{filename}` (lo impone `supabase-repos.ts`).
- [ ] Subida/lectura/borrado por un miembro de la familia — pendiente de prueba manual desde la app.
- [ ] Fuga cross-family con signed URL conociendo el path — pendiente de prueba manual.

## Validación Integridad

- [x] No se puede crear `list_item` con `family_id` de una familia y `list_id` de otra.
- [x] No se puede crear `event` con `child_id` de otra familia.
- [x] No se puede crear `document` con `child_id` de otra familia.

Los tres devuelven 400 desde el trigger de `007_cross_family_integrity.sql`.

## Resultado

**El aislamiento entre familias funciona.** Un usuario solo ve y escribe en las familias donde figura en `family_members`; lo demás le resulta invisible en lectura y prohibido en escritura. La regla del último admin la aplica el servidor, no solo la UI. Los triggers de integridad impiden mezclar identificadores entre familias.

Queda como único pendiente la comprobación manual de Storage (subir un documento desde la app y verificar que otra familia no puede abrirlo con signed URL), que necesita interacción real con el navegador.

### Nota sobre la documentación

Durante la validación se detectó que `architecture.md` y `project-status.md` documentaban la RPC como `accept_family_invite(invite_id)`, cuando la migración y el código usan `p_invite_id`. Corregido.
