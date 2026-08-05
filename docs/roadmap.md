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

## Fase 2 - QA visual del MVP mock

Objetivo: detectar problemas baratos de corregir antes de depender de datos reales.

- [ ] Probar checklist completa en móvil (390×844).
- [ ] Revisar bottom sheets (scroll, teclado, footer fijo).
- [ ] Revisar navegación y bottom nav.
- [ ] Revisar flujos CRUD en todas las secciones.
- [ ] Revisar persistencia en `localStorage`.
- [ ] Revisar multi-familia mock.

Documento guía: `docs/testing-checklist.md`

## Fase 3 - Validación Supabase ✅

Objetivo: validar base de datos, RLS, RPCs y Storage contra el proyecto real.

**Cerrada el 2026-08-03 con 47/47 comprobaciones correctas.** Se hizo con
sesiones de usuario reales (JWT → PostgREST → RLS), no con `set role` desde el
SQL Editor, así que valida el mismo trayecto que recorre la app. Resultados en
`docs/supabase-validation.md`.

- ✅ Crear proyecto Supabase y subir migraciones.
- ✅ Tablas, columnas, índices, triggers y policies revisados.
- ✅ RPCs probadas: `create_family_with_admin`, `update_family_member_profile`,
  `remove_family_member`, `update_family_member_role`, `accept_family_invite`.
- ✅ Aislamiento entre dos familias con dos usuarios reales.
- ✅ Bucket privado `documents` y signed URLs.
- ✅ Resultados documentados.

No es una fase que se cierre para siempre: se repite con
`node scripts/validate-rls.mjs` después de tocar una migración, una policy o una
RPC. **Pendiente ahora mismo**: aplicar 015 y 016 en Supabase y volver a pasarlo.

## Fase 4 - Repositorios Supabase ✅

Objetivo: implementar acceso a datos real sin reescribir pantallas.

- ✅ Repos reales con interfaces de `src/lib/repos/types.ts` (`src/lib/supabase-repos/`).
- ✅ Familia, miembros, invitaciones.
- ✅ Hijos, eventos, tareas.
- ✅ Listas e ítems, comidas, documentos (metadata).
- ✅ RPC `remove_family_member` para borrar miembros.
- ✅ RPC `update_family_member_role` para cambiar roles.
- ✅ RPC `accept_family_invite` para aceptar invitaciones.
- ✅ `useFamily.ts` experimental eliminado; patrón de repositorios definitivo en uso.

## Fase 5 - StoreProvider async ✅

Objetivo: cambiar de mock síncrono a datos async.

- ✅ Estados loading y error.
- ✅ Cargar familia activa (resuelta en `AppShell`).
- ✅ Soportar usuario sin familia (onboarding real).
- ✅ Mantener modo demo como fallback.

## Fase 6 - Documentos reales

Objetivo: conectar Supabase Storage.

- ✅ Upload real con validación MIME y tamaño.
- ✅ Metadata en tabla `documents`.
- ✅ Descargar o abrir documento (signed URLs, 60 s).
- ✅ Borrar archivo y metadata.

## Fase 7 - Invitaciones reales ✅

Objetivo: convertir invitaciones mock en flujo usable.

- ✅ Crear invitación por email (magic link vía `/api/invite`).
- ✅ Aceptar invitación en `/auth/callback` → `accept_family_invite` crea `family_member` y marca `accepted`.
- ✅ Cancelar invitación.

## Fase 8 - Pulido

Objetivo: preparar uso diario.

- ✅ PWA: iconos any + maskable + apple-touch, manifest con purposes y service worker offline (fallback `/offline`).
- Mejoras responsive.
- ✅ Tests e2e con `@playwright/test` (smoke demo: login → /home). Ejecutar con `npm run test:e2e`.
- ✅ Revisión de accesibilidad: BottomSheet como diálogo (role/aria/Escape/foco/inert), botones de icono etiquetados y label↔input asociados en los sheets.
- Backup/export sencillo si se considera necesario.
