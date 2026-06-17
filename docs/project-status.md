# Estado del proyecto

Última revisión: 2026-06-17.

## Resumen

Nido tiene un MVP mock funcional para probar la organización familiar diaria sin Supabase real.

## Implementado

- Inicio / Hoy.
- Calendario.
- Tareas.
- Listas.
- Comidas.
- Documentos mock.
- Ajustes de familia: miembros, invitaciones, hijos.
- Modo demo con persistencia en `localStorage`.
- Migraciones Supabase iniciales (001–004).
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_my_family_profile` para editar solo campos seguros del perfil.
- Tabla de invitaciones con policies idempotentes y `with check`.
- Bucket privado `documents` preparado con policies completas.
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

**Aplicación en Supabase (Fase 4):** La validación se hará en RPCs `security definer`, no en policies RLS. Ver sección de RPCs previstas en `architecture.md`.

**Nota sobre la policy actual `Admin gestiona miembros` (`for all`):** Cubre SELECT, INSERT, UPDATE y DELETE para admins. Al conectar Supabase, esta policy genérica debe sustituirse por RPCs que incluyan la comprobación del último admin. La policy puede mantenerse mientras no haya UI real que permita borrar/degradar miembros.

## Pendientes antes de subir Supabase

- QA visual completa del MVP mock en móvil ← en curso.
- Probar migraciones en un proyecto Supabase real.
- Verificar aislamiento RLS con dos usuarios y dos familias.
- Verificar bucket privado `documents`.

## Pendientes para conectar Supabase

- Implementar repositorios reales usando interfaces de `src/lib/repos/types.ts`.
- Cambiar `StoreProvider` para consumir repos async.
- Crear onboarding real para usuarios sin familia.
- Cargar familia activa desde Supabase.
- Implementar upload, descarga y borrado real de documentos en Storage.
- Implementar aceptación real de invitaciones por email.
- Reemplazar `useFamily.ts` experimental por el patrón de repositorios definitivo.
- Implementar RPCs `remove_family_member` y `update_family_member_role` con control de último admin.

## Siguiente paso recomendado

Completar QA visual → subir migraciones a Supabase en vacío.
