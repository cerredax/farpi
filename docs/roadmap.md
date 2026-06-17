# Roadmap

Este roadmap prioriza estabilidad y simplicidad. No busca convertir Nido en SaaS.

## Fase 1 - Cierre pre-Supabase ✅

Objetivo: dejar el MVP mock y las migraciones listas para una primera subida segura.

- ✅ Corregir validación de documentos (MIME, tamaño, sin conversión silenciosa).
- ✅ Hacer idempotentes las policies de Storage.
- ✅ Añadir `with check` a update de Storage y `family_invites`.
- ✅ Alinear `Child.birth_date` con nullable.
- ✅ Mejorar RPC `create_family_with_admin` (nombre normalizado).
- ✅ Endurecer RLS de `family_members` (eliminar policy de update libre, añadir RPC segura).
- ✅ Añadir `set search_path = public` a `my_family_ids()`.
- ✅ `.gitignore` actualizado.
- ✅ Playwright eliminado (sin tests, sin config, sin binarios).
- ✅ Decidir y documentar la regla del último admin.
- ✅ `npm run lint` sin warnings.
- ✅ `npm run build` sin errores.

## Fase 2 - QA visual del MVP mock ← ACTUAL

Objetivo: detectar problemas baratos de corregir antes de depender de datos reales.

- [ ] Probar checklist completa en móvil (390×844).
- [ ] Revisar bottom sheets (scroll, teclado, footer fijo).
- [ ] Revisar navegación y bottom nav.
- [ ] Revisar flujos CRUD en todas las secciones.
- [ ] Revisar persistencia en `localStorage`.
- [ ] Revisar multi-familia mock.

Documento guía: `docs/testing-checklist.md`

## Fase 3 - Subir Supabase

Objetivo: validar base de datos, RLS, RPCs y Storage sin conectar todavía toda la UI.

- Crear proyecto Supabase.
- Ejecutar migraciones 001–004.
- Revisar tablas y columnas.
- Revisar policies RLS.
- Probar RPC `create_family_with_admin`.
- Probar RPC `update_my_family_profile`.
- Crear dos usuarios.
- Crear dos familias.
- Verificar aislamiento por RLS.
- Verificar bucket privado `documents`.

## Fase 4 - Repositorios Supabase

Objetivo: implementar acceso a datos real sin reescribir pantallas.

- Implementar repos reales con interfaces de `src/lib/repos/types.ts`.
- Familia, miembros, invitaciones.
- Hijos, eventos, tareas.
- Listas e ítems, comidas, documentos (metadata).
- Implementar RPC `remove_family_member` con control de último admin.
- Implementar RPC `update_family_member_role` con control de último admin.
- Reemplazar `useFamily.ts` experimental por el patrón definitivo.

## Fase 5 - StoreProvider async

Objetivo: cambiar de mock síncrono a datos async.

- Añadir estados loading y error.
- Cargar familia activa.
- Soportar usuario sin familia (onboarding real).
- Mantener modo demo como fallback o modo explícito.

## Fase 6 - Documentos reales

Objetivo: conectar Supabase Storage.

- Upload real con validación MIME y tamaño.
- Metadata en tabla `documents`.
- Descargar o abrir documento (signed URLs).
- Borrar archivo y metadata.

## Fase 7 - Invitaciones reales

Objetivo: convertir invitaciones mock en flujo usable.

- Crear invitación por email.
- Detectar invitaciones pendientes al iniciar sesión.
- Aceptar invitación → crear `family_member` → marcar `accepted`.
- Cancelar invitación.

## Fase 8 - Pulido

Objetivo: preparar uso diario.

- PWA básica (iconos y manifest ya preparados).
- Mejoras responsive.
- Tests e2e con `@playwright/test` (smoke: login demo → /home).
- Revisión de accesibilidad.
- Backup/export sencillo si se considera necesario.
