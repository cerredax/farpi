# Estado del proyecto

Última revisión: 2026-07-30.

## Resumen

Nido está conectado a Supabase de extremo a extremo: autenticación, repositorios reales, `StoreProvider` async, onboarding, invitaciones por magic link y documentos reales en Storage. La UI consume la frontera de repositorios y elige implementación real o mock según `IS_DEMO_MODE`. El modo demo/mock sigue funcionando como fallback y como entorno de pruebas (e2e).

## Implementado

### Pantallas / producto

- Inicio / Hoy.
- Calendario (eventos, series semanales y anuales).
- Tareas (con recurrencia).
- Listas e ítems.
- Comidas (día/semana, copiar día).
- Documentos: subir, abrir/descargar (signed URL 60 s), editar y borrar.
- Ajustes de familia: miembros, invitaciones, hijos, cambio de rol admin/miembro.
- Modo demo con persistencia en `localStorage`.

### Conexión Supabase (completada)

- Auth real (login/signup, recuperación de contraseña, logout).
- Repositorios reales en `src/lib/supabase-repos.ts` + mock en `src/lib/mock-repos.ts`, tras el contrato `src/lib/repos/types.ts`.
- `StoreProvider` async con estados loading/error y `reload()`.
- Onboarding real (`/onboarding` → `create_family_with_admin`) y resolución de familia activa en `AppShell`.
- Invitaciones por email vía magic link (`/api/invite` con service role) y aceptación automática en `/auth/callback` (`accept_family_invite`).
- Documentos reales en Storage con path `{family_id}/{document_id}/{filename}`, subida con rollback y descarga por signed URL.
- Gestión de roles desde Ajustes (`update_family_member_role`) con bloqueo del último admin en la UI.
- Detección de modo demo unificada en `src/lib/supabase/env.ts` (cliente, servidor, proxy y API).

### Backend / migraciones

- Migraciones Supabase aplicadas/preparadas (001–009).
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_my_family_profile` para editar solo campos seguros del perfil.
- Tabla de invitaciones con policies idempotentes y `with check`.
- Bucket privado `documents` con policies completas (SELECT por familia habilita signed URLs).
- Triggers de integridad cross-family (`family_id`, `list_id`, `child_id`).
- RPCs admin `remove_family_member` y `update_family_member_role` con control de último admin.
- RPC `accept_family_invite(invite_id uuid)`.
- Script `supabase/validate_rls.sql` para validar RLS, RPCs, triggers e invitaciones desde SQL Editor.

### Calidad / infraestructura

- Refactor: constantes, validadores, fechas, selectores, contratos de repos.
- Los 5 sheets con overlay propio (Event, Doc, Task, Item, List) unificados en el `BottomSheet` compartido.
- Código muerto eliminado: stubs `src/lib/repos/*` (salvo `types.ts`), hook `useFamily.ts`, endpoint temporal `/api/check-config`.
- PWA: iconos any + maskable + apple-touch y `manifest.json` con purposes (script `scripts/gen-icons.cjs`).
- Tests e2e smoke con `@playwright/test` (login demo → /home). Ejecutar con `npm run test:e2e`.

## Correcciones de seguridad

- `my_family_ids()` con `set search_path = public` (evita search path hijacking).
- Eliminada policy de update libre sobre `family_members`; reemplazada por RPC `update_my_family_profile`.
- `family_invites` update con `using` + `with check`.

## Regla del último admin — DECISIÓN TOMADA

Una familia debe tener siempre al menos un admin. Están prohibidas cuando quedaría cero admins:

- Eliminar al único admin de una familia.
- Degradar al único admin de `admin` a `member`.

**Aplicación en Supabase:** validación mediante RPCs `security definer` (`remove_family_member`, `update_family_member_role`), no mediante policies RLS. Ver `architecture.md`.

**Aplicación en la UI:** `MemberSheet` bloquea degradar al único admin (calculado en `SettingsView`); el servidor es la validación autoritativa.

**Nota sobre policies:** `Admin gestiona miembros` queda sustituida por `Admin inserta miembros`; UPDATE y DELETE de miembros pasan por RPCs.

## Estado Supabase

- Proyecto Supabase creado, migraciones subidas y UI conectada.
- La validación aislada (RLS con dos usuarios, RPCs, Storage) sigue **pendiente de ejecutar y documentar**.
- No documentar URLs privadas, anon keys ni secretos en el repositorio.

## Pendientes de validación Supabase

- Ejecutar o completar `supabase/validate_rls.sql` en SQL Editor.
- Verificar aislamiento RLS con dos usuarios y dos familias.
- Verificar que miembro no admin no puede gestionar miembros ni invitaciones.
- Verificar que no se puede eliminar o degradar al último admin.
- Verificar bucket privado `documents` con paths `{family_id}/{document_id}/{filename}`.
- Verificar constraints/triggers cross-family con intentos inválidos.
- Documentar resultados en `docs/supabase-validation.md`.

## Siguiente paso recomendado

1. Cerrar la validación Supabase aislada (usuarios A/B, RPCs, Storage) y documentarla.
2. Revisión de accesibilidad (labels, foco, contraste, roles).
3. Refactor de tokens de color (con la UI congelada).
