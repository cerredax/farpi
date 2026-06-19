# Estado del proyecto

Última revisión: 2026-06-19.

## Resumen

Nido tiene un MVP mock funcional y Supabase ya está subido como backend base. La UI sigue funcionando principalmente con modo demo/mock; Supabase está en fase de validación aislada antes de conectar repositorios reales.

## Implementado

- Inicio / Hoy.
- Calendario.
- Tareas.
- Listas.
- Comidas.
- Documentos mock.
- Ajustes de familia: miembros, invitaciones, hijos.
- Modo demo con persistencia en `localStorage`.
- Migraciones Supabase aplicadas/preparadas (001–009).
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_my_family_profile` para editar solo campos seguros del perfil.
- Tabla de invitaciones con policies idempotentes y `with check`.
- Bucket privado `documents` preparado con policies completas.
- Triggers de integridad cross-family para evitar cruces entre `family_id`, `list_id` y `child_id`.
- RPCs admin `remove_family_member` y `update_family_member_role` con control de último admin.
- RPC `accept_family_invite(invite_id uuid)` para aceptar invitaciones pendientes.
- Script `supabase/validate_rls.sql` para validar RLS, RPCs, triggers e invitaciones desde SQL Editor.
- Refactor: constantes, validadores, fechas, selectores, BottomSheet, repos contracts.
- Validación de documentos corregida (MIME, tamaño, sin conversión silenciosa).
- `Child.birth_date` nullable en types, mock y UI.
- `TaskSheet` corregido: botón de acción en footer fijo, accesible con teclado abierto.
- `.gitignore` actualizado para excluir `.claude/`.
- Playwright eliminado (no había tests; se añadirá en Fase 8 con `@playwright/test`).

## Correcciones de seguridad

- `my_family_ids()` con `set search_path = public` (evita search path hijacking).
- Eliminada policy de update libre sobre `family_members`; reemplazada por RPC `update_my_family_profile`.
- `family_invites` update con `using` + `with check`.

## Regla del último admin — DECISIÓN TOMADA

Una familia debe tener siempre al menos un admin. Las siguientes operaciones están prohibidas cuando quedaría cero admins:

- Eliminar al único admin de una familia.
- Degradar al único admin de `admin` a `member`.

**Aplicación actual (mock):** No implementada en el mock. El modo demo no valida este caso porque se asume que el usuario que prueba la app es el único admin. Impacto: bajo para QA.

**Aplicación en Supabase:** La validación se hace mediante RPCs `security definer`, no mediante policies RLS. Ver sección de RPCs implementadas en `architecture.md`.

**Nota sobre policies:** La policy genérica `Admin gestiona miembros` queda sustituida por `Admin inserta miembros`; UPDATE y DELETE de miembros deben pasar por RPCs con control de último admin.

## Cambios recientes

- `FamilySheet`, `OffDayConfirmDialog` y `OffDayConfirmSheet` migrados a `BottomSheet` compartido.
- `reload()` en `StoreProvider` funcional: re-lee todos los slices del store.

## Estado Supabase

- Proyecto Supabase creado y migraciones base subidas.
- Validación aislada pendiente de cerrar/documentar completamente.
- La UI no debe considerarse conectada a Supabase todavía.
- No documentar URLs privadas, anon keys ni secretos en el repositorio.

## Pendientes de validación Supabase

- Ejecutar o completar `supabase/validate_rls.sql` en SQL Editor.
- Verificar aislamiento RLS con dos usuarios y dos familias.
- Verificar que miembro no admin no puede gestionar miembros ni invitaciones.
- Verificar que no se puede eliminar o degradar al último admin.
- Verificar bucket privado `documents` con paths `{family_id}/{document_id}/{filename}`.
- Verificar constraints/triggers cross-family con intentos inválidos.
- Documentar resultados en `docs/supabase-validation.md`.

## Pendientes para conectar Supabase

- Implementar repositorios reales usando interfaces de `src/lib/repos/types.ts`.
- Cambiar `StoreProvider` para consumir repos async.
- Crear onboarding real: formulario "crea tu familia" + lista de invitaciones pendientes (llamar a `create_family_with_admin` o `accept_family_invite`).
- Cargar familia activa desde Supabase.
- Añadir estado para usuario autenticado sin familia.
- Añadir logout visible.
- Implementar upload, descarga y borrado real de documentos en Storage.
- Decidir flujo de invitaciones por email (magic link vs. deep link con `invite_id`).
- Reemplazar `useFamily.ts` experimental por el patrón de repositorios definitivo.

## Siguiente paso recomendado

Cerrar validación Supabase aislada (`validate_rls.sql`, usuarios A/B, Storage) → documentar resultados → empezar conexión progresiva de repositorios reales.
