-- ============================================================
-- NIDO — Script de validación de Supabase
-- Ejecutar en Dashboard > SQL Editor como rol postgres (service role).
-- Sustituir los placeholders USER_A_ID, USER_B_ID, FAMILY_A_ID, FAMILY_B_ID
-- con los UUIDs reales obtenidos tras crear los usuarios de prueba.
-- ============================================================

-- NOTA SOBRE COMMIT/ROLLBACK:
-- La mayoría de bloques usan ROLLBACK para que no persistan datos de prueba.
-- Para tests que necesitan datos de pasos anteriores (p. ej. test 10 → 16)
-- cambia ROLLBACK por COMMIT en el bloque que crea los datos,
-- y limpia manualmente con DELETE cuando termines.
-- ─────────────────────────────────────────────────────────────

-- ─── 0. PREPARACIÓN ─────────────────────────────────────────
-- Ejecutar primero como postgres para ver los UUIDs creados:

-- Ver usuarios de Auth:
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- Tras crear las familias con la RPC, ver families y members:
SELECT f.id AS family_id, f.name, m.user_id, m.role
FROM public.families f
JOIN public.family_members m ON m.family_id = f.id
ORDER BY f.created_at;


-- ─── 1. CREAR FAMILIAS DE PRUEBA ────────────────────────────
-- Llamar a create_family_with_admin desde el cliente JS o desde SQL Editor
-- simulando un usuario autenticado:

-- Como Usuario A:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated","email":"usuario-a@test.com"}';
  SELECT public.create_family_with_admin('Familia Test A');
ROLLBACK;
-- Nota: usar COMMIT en lugar de ROLLBACK para que persista.

-- Como Usuario B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated","email":"usuario-b@test.com"}';
  SELECT public.create_family_with_admin('Familia Test B');
ROLLBACK;


-- ─── 2. RLS: FAMILIES ───────────────────────────────────────

-- Usuario A solo ve su familia:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  SELECT id, name FROM public.families;
  -- ESPERADO: 1 fila (Familia Test A). NO debe aparecer Familia Test B.
ROLLBACK;

-- Usuario B solo ve su familia:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated"}';
  SELECT id, name FROM public.families;
  -- ESPERADO: 1 fila (Familia Test B). NO debe aparecer Familia Test A.
ROLLBACK;

-- Usuario A no puede actualizar familia B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  UPDATE public.families SET name = 'Hackeada' WHERE id = 'FAMILY_B_ID'::uuid;
  -- ESPERADO: 0 rows updated (RLS bloquea la operación).
ROLLBACK;


-- ─── 3. RLS: FAMILY_MEMBERS ─────────────────────────────────

-- Usuario A solo ve miembros de su familia:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  SELECT id, family_id, display_name, role FROM public.family_members;
  -- ESPERADO: solo miembros de FAMILY_A_ID.
ROLLBACK;

-- Usuario A (admin) puede insertar nuevo miembro en su familia:
-- (Esto simula aceptar una invitación internamente; en prod se haría via RPC)
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  INSERT INTO public.family_members (family_id, user_id, display_name, role)
  VALUES ('FAMILY_A_ID'::uuid, gen_random_uuid(), 'Invitado Test', 'member');
  -- ESPERADO: éxito (admin puede insertar miembros en su familia).
ROLLBACK;

-- Usuario A no puede insertar miembro en familia B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  INSERT INTO public.family_members (family_id, user_id, display_name, role)
  VALUES ('FAMILY_B_ID'::uuid, gen_random_uuid(), 'Intruso', 'member');
  -- ESPERADO: falla (policy "Admin inserta miembros" bloquea).
ROLLBACK;

-- Usuario A no puede DELETE directo de family_members (solo vía RPC):
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  DELETE FROM public.family_members WHERE family_id = 'FAMILY_A_ID'::uuid;
  -- ESPERADO: 0 rows deleted (no hay policy DELETE, solo INSERT).
ROLLBACK;


-- ─── 4. RLS: CHILDREN ───────────────────────────────────────

-- Crear hijo en familia A:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  INSERT INTO public.children (family_id, name, color)
  VALUES ('FAMILY_A_ID'::uuid, 'Hijo Test A', '#FF5733');
  -- ESPERADO: éxito.
ROLLBACK;

-- Usuario A no ve hijos de familia B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  SELECT * FROM public.children;
  -- ESPERADO: solo hijos de FAMILY_A_ID.
ROLLBACK;

-- Usuario A no puede crear hijo en familia B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';
  INSERT INTO public.children (family_id, name, color)
  VALUES ('FAMILY_B_ID'::uuid, 'Intruso', '#000000');
  -- ESPERADO: falla.
ROLLBACK;


-- ─── 5. RLS: EVENTS ─────────────────────────────────────────

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  -- Crear evento en familia A:
  INSERT INTO public.events (family_id, title, start_at, all_day, created_by)
  VALUES ('FAMILY_A_ID'::uuid, 'Evento Test A', now(), true, 'USER_A_ID'::uuid);

  -- Ver solo eventos de familia A:
  SELECT id, family_id, title FROM public.events;
  -- ESPERADO: solo eventos de FAMILY_A_ID.

  -- Intentar crear evento en familia B (falla):
  INSERT INTO public.events (family_id, title, start_at, all_day, created_by)
  VALUES ('FAMILY_B_ID'::uuid, 'Intruso', now(), true, 'USER_A_ID'::uuid);
  -- ESPERADO: falla (RLS).
ROLLBACK;


-- ─── 6. RLS: TASKS ──────────────────────────────────────────

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.tasks (family_id, title, created_by)
  VALUES ('FAMILY_A_ID'::uuid, 'Tarea Test A', 'USER_A_ID'::uuid);

  SELECT id, family_id, title FROM public.tasks;
  -- ESPERADO: solo tareas de FAMILY_A_ID.

  INSERT INTO public.tasks (family_id, title, created_by)
  VALUES ('FAMILY_B_ID'::uuid, 'Intruso', 'USER_A_ID'::uuid);
  -- ESPERADO: falla.
ROLLBACK;


-- ─── 7. RLS: LISTS + LIST_ITEMS ─────────────────────────────

-- Crear lista en familia A:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.lists (family_id, name, created_by)
  VALUES ('FAMILY_A_ID'::uuid, 'Lista Test A', 'USER_A_ID'::uuid)
  RETURNING id; -- guardar este ID como LIST_A_ID para el paso siguiente

  SELECT id, family_id, name FROM public.lists;
  -- ESPERADO: solo listas de FAMILY_A_ID.
ROLLBACK;

-- Crear item de lista (familia A, lista A): debe funcionar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.list_items (list_id, family_id, text, created_by)
  VALUES ('LIST_A_ID'::uuid, 'FAMILY_A_ID'::uuid, 'Item Test', 'USER_A_ID'::uuid);
  -- ESPERADO: éxito.
ROLLBACK;


-- ─── 8. RLS: MEAL_PLANS ─────────────────────────────────────

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.meal_plans (family_id, date, slot, name, created_by)
  VALUES ('FAMILY_A_ID'::uuid, current_date, 'lunch', 'Paella', 'USER_A_ID'::uuid);

  SELECT id, family_id, name FROM public.meal_plans;
  -- ESPERADO: solo comidas de FAMILY_A_ID.

  INSERT INTO public.meal_plans (family_id, date, slot, name, created_by)
  VALUES ('FAMILY_B_ID'::uuid, current_date, 'dinner', 'Intruso', 'USER_A_ID'::uuid);
  -- ESPERADO: falla.
ROLLBACK;


-- ─── 9. RLS: DOCUMENTS ──────────────────────────────────────

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.documents (family_id, name, storage_path, mime_type, size_bytes, created_by)
  VALUES ('FAMILY_A_ID'::uuid, 'Doc Test', 'FAMILY_A_ID/doc-id/test.pdf', 'application/pdf', 1024, 'USER_A_ID'::uuid);

  SELECT id, family_id, name FROM public.documents;
  -- ESPERADO: solo documentos de FAMILY_A_ID.

  INSERT INTO public.documents (family_id, name, storage_path, mime_type, size_bytes, created_by)
  VALUES ('FAMILY_B_ID'::uuid, 'Intruso', 'FAMILY_B_ID/doc-id/hack.pdf', 'application/pdf', 1024, 'USER_A_ID'::uuid);
  -- ESPERADO: falla.
ROLLBACK;


-- ─── 10. RLS: FAMILY_INVITES ─────────────────────────────────

-- Admin puede crear invitación en su familia:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.family_invites (family_id, email, invited_by)
  VALUES ('FAMILY_A_ID'::uuid, 'nuevo@test.com', 'USER_A_ID'::uuid);
  -- ESPERADO: éxito (admin puede invitar).

  SELECT id, family_id, email, status FROM public.family_invites;
  -- ESPERADO: solo invitaciones de FAMILY_A_ID.
ROLLBACK;

-- Admin A no puede crear invitación en familia B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  INSERT INTO public.family_invites (family_id, email, invited_by)
  VALUES ('FAMILY_B_ID'::uuid, 'intruso@test.com', 'USER_A_ID'::uuid);
  -- ESPERADO: falla (policy "Admins gestionan invitaciones" bloquea).
ROLLBACK;


-- ─── 11. INTEGRIDAD CROSS-FAMILY: TRIGGERS ───────────────────

-- 11a. list_item con list_id de familia B pero family_id de familia A → debe fallar
BEGIN;
  -- Como postgres (sin RLS) para aislar el test del trigger:
  INSERT INTO public.list_items (list_id, family_id, text, created_by)
  VALUES ('LIST_B_ID'::uuid, 'FAMILY_A_ID'::uuid, 'Cross-family item', gen_random_uuid());
  -- ESPERADO: exception 'list_items: list_id no pertenece a la misma family_id'
ROLLBACK;

-- 11b. event con child_id de familia B pero family_id de familia A → debe fallar
BEGIN;
  INSERT INTO public.events (family_id, child_id, title, start_at, all_day, created_by)
  VALUES ('FAMILY_A_ID'::uuid, 'CHILD_B_ID'::uuid, 'Cross-family event', now(), true, gen_random_uuid());
  -- ESPERADO: exception 'events: child_id no pertenece a la misma family_id'
ROLLBACK;

-- 11c. document con child_id de familia B pero family_id de familia A → debe fallar
BEGIN;
  INSERT INTO public.documents (family_id, child_id, name, storage_path, mime_type, size_bytes, created_by)
  VALUES ('FAMILY_A_ID'::uuid, 'CHILD_B_ID'::uuid, 'Test', 'x/y/z.pdf', 'application/pdf', 1024, gen_random_uuid());
  -- ESPERADO: exception 'documents: child_id no pertenece a la misma family_id'
ROLLBACK;

-- 11d. event con child_id null → debe funcionar (child_id es opcional)
BEGIN;
  INSERT INTO public.events (family_id, child_id, title, start_at, all_day, created_by)
  VALUES ('FAMILY_A_ID'::uuid, NULL, 'Evento sin hijo', now(), true, gen_random_uuid());
  -- ESPERADO: éxito
ROLLBACK;


-- ─── 12. RPCs DE ADMIN: remove_family_member ─────────────────

-- Setup: crear dos miembros en familia A para probar las RPCs
-- (usar UUIDs reales de family_members obtenidos tras crear las familias)

-- 12a. Admin elimina miembro (no-admin): debe funcionar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.remove_family_member('MEMBER_B_IN_FAMILY_A_ID'::uuid);
  -- ESPERADO: éxito (admin puede eliminar miembro)
ROLLBACK;

-- 12b. Admin intenta eliminarse a sí mismo siendo el único admin: debe fallar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.remove_family_member('MEMBER_A_ID'::uuid);
  -- ESPERADO: exception 'No se puede eliminar al único administrador de la familia'
ROLLBACK;

-- 12c. Non-admin intenta eliminar un miembro: debe fallar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated"}';
  -- (asumiendo USER_B está en FAMILY_A como member, no admin)
  SELECT public.remove_family_member('MEMBER_A_ID'::uuid);
  -- ESPERADO: exception 'Acceso denegado: el usuario no es administrador de esta familia'
ROLLBACK;


-- ─── 13. RPC: update_family_member_role ──────────────────────

-- 13a. Admin degrada al único admin → debe fallar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.update_family_member_role('MEMBER_A_ID'::uuid, 'member');
  -- ESPERADO: exception 'No se puede degradar al único administrador de la familia'
ROLLBACK;

-- 13b. Admin cambia rol de miembro a admin → debe funcionar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.update_family_member_role('MEMBER_NON_ADMIN_ID'::uuid, 'admin');
  -- ESPERADO: éxito
ROLLBACK;

-- 13c. Rol inválido → debe fallar
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.update_family_member_role('MEMBER_NON_ADMIN_ID'::uuid, 'superadmin');
  -- ESPERADO: exception 'Rol inválido: debe ser "admin" o "member"'
ROLLBACK;


-- ─── 14. RPC: update_my_family_profile ───────────────────────

-- Usuario A actualiza su propio perfil:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.update_my_family_profile('MEMBER_A_ID'::uuid, 'Nuevo nombre', null);
  -- ESPERADO: éxito

  -- Verificar:
  SELECT display_name FROM public.family_members WHERE id = 'MEMBER_A_ID'::uuid;
ROLLBACK;

-- Usuario A no puede actualizar el perfil de Usuario B:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_A_ID","role":"authenticated"}';

  SELECT public.update_my_family_profile('MEMBER_B_ID'::uuid, 'Hacked', null);
  -- ESPERADO: exception 'Acceso denegado: el miembro no pertenece al usuario autenticado'
ROLLBACK;


-- ─── 16. RPC: accept_family_invite ──────────────────────────
-- Para este test necesitas datos persistidos:
--   1. Crear invitación (COMMIT en test 10a).
--   2. Obtener el INVITE_ID de esa invitación.

-- 16a. Usuario B acepta invitación para su email → debe funcionar y devolver family_id:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated"}';

  SELECT public.accept_family_invite('INVITE_ID'::uuid);
  -- ESPERADO: devuelve FAMILY_A_ID (la familia a la que se unió B)

  -- Verificar que B ahora es miembro de familia A:
  SELECT family_id, display_name, role FROM public.family_members WHERE user_id = 'USER_B_ID'::uuid;
  -- ESPERADO: fila con family_id = FAMILY_A_ID

  -- Verificar que la invitación pasó a 'accepted':
  SELECT status, accepted_at FROM public.family_invites WHERE id = 'INVITE_ID'::uuid;
  -- ESPERADO: status = 'accepted', accepted_at != null
ROLLBACK;

-- 16b. Email incorrecto → debe fallar:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated"}';
  -- Intentar aceptar una invitación dirigida a otro email:
  SELECT public.accept_family_invite('INVITE_FOR_ANOTHER_EMAIL_ID'::uuid);
  -- ESPERADO: exception 'Acceso denegado: la invitación no pertenece a este usuario'
ROLLBACK;

-- 16c. Invitación ya aceptada → debe fallar:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated"}';
  SELECT public.accept_family_invite('ALREADY_ACCEPTED_INVITE_ID'::uuid);
  -- ESPERADO: exception 'La invitación ya fue aceptada'
ROLLBACK;

-- 16d. Invitación cancelada → debe fallar:
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"sub":"USER_B_ID","role":"authenticated"}';
  SELECT public.accept_family_invite('CANCELLED_INVITE_ID'::uuid);
  -- ESPERADO: exception 'La invitación fue cancelada'
ROLLBACK;

-- 16e. Usuario no autenticado → debe fallar:
BEGIN;
  SET LOCAL ROLE anon;
  SELECT public.accept_family_invite('INVITE_ID'::uuid);
  -- ESPERADO: exception 'Acceso denegado: usuario no autenticado'
ROLLBACK;

-- 16f. Aceptar invitación ya siendo miembro (p. ej. admin que se auto-invitó) → idempotente:
-- ESPERADO: devuelve family_id sin crear duplicado en family_members ni lanzar error.


-- ─── 17. VERIFICAR FUNCIÓN accept_family_invite EN pg_catalog ─
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'accept_family_invite';
-- ESPERADO: 1 fila, security_type = 'DEFINER'


-- ─── 15. VERIFICACIÓN DE ESTRUCTURA ─────────────────────────
-- Ejecutar como postgres para confirmar tablas, índices, triggers, policies:

-- Tablas:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Índices:
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Triggers:
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- RLS policies:
SELECT schemaname, tablename, policyname, cmd, qual IS NOT NULL AS has_using, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename, policyname;

-- Funciones RPC:
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Bucket Storage:
SELECT id, name, public FROM storage.buckets;
