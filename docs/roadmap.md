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

Hecha el 2026-08-05 a 390×844 (iPhone normal, más estrecho que el Pixel 7 con el
que corre el resto de la suite): capturas de las nueve pantallas revisadas una a
una, más comprobaciones automáticas que quedan fijas en `e2e/movil.spec.ts`.

- ✅ Ninguna pantalla desborda a lo ancho.
- ✅ Ningún control por debajo de 24×24 px (mínimo WCAG 2.5.8).
- ✅ Revisadas Inicio, Calendario (semana y mes), Tareas, sheet de tarea, Listas,
  detalle de lista, Comidas, Documentos, Ajustes y login.
- ✅ Flujos CRUD y persistencia en `localStorage`, cubiertos por la suite e2e.
- ✅ Bottom nav y navegación entre secciones.

Lo que salió y se arregló está en el commit correspondiente: el color repetido
entre un adulto y un hijo, títulos de tarea comidos por las etiquetas, "Sin
planes" en un día que sí tenía tareas y cinco controles demasiado pequeños.

**Probada en un móvil real el 2026-08-05, sin incidencias.** Es lo que ni
Playwright ni Chromium podían ver, porque la suite corre sobre un Pixel 7
*emulado*: emulación no tiene teclado que se abra ni inercia de scroll.

- [x] Teclado real abriéndose sobre un sheet: el footer fijo no lo tapa.
- [x] Scroll con inercia y toques accidentales al pasar el dedo por las filas.
- [ ] Safari de iOS, si la prueba fue en Android: es otro motor.
- [ ] PWA instalada: icono, splash, safe-area del notch y la barra inferior.

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
RPC.

**Pendiente ahora mismo**: 015 y 016 ya están aplicadas en Supabase (05-08-2026),
así que queda volver a pasar el script y anotar el resultado. Serán **51
comprobaciones** en vez de 47: dos nuevas de los triggers cross-family de `tasks`
(015) y dos del perfil del miembro (014).

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
- ✅ Mejoras responsive (lo que salió de la Fase 2, arreglado el 05-08-2026).
- ✅ Tests: 198 con el runner de Playwright — 150 unitarios (`npm run test:unit`) y
  48 de navegador entre `smoke`, `runtime` y `movil` (`npm run test:e2e`).
- ✅ Revisión de accesibilidad: BottomSheet como diálogo (role/aria/Escape/foco/inert), botones de icono etiquetados y label↔input asociados en los sheets.
- [ ] Medir el contraste de la paleta. Es lo único de accesibilidad que quedó sin
  comprobar, y es lo único que no se ve leyendo el código.
- [ ] Backup/export sencillo si se considera necesario.

## Fase 9 - Uso diario

Objetivo: que la app funcione sola, sin nadie mirándola.

- [ ] **Un teléfono de verdad.** Los cuatro puntos abiertos de la Fase 2. Es lo
  primero, porque es lo que puede sacar un fallo que no ve ninguna herramienta.
- [ ] **Notificaciones push.** El código está entero; faltan las claves VAPID en
  Vercel (`node scripts/gen-vapid.cjs`) y un redespliegue. Ver `docs/notificaciones.md`.
- [ ] **Confirmar el cron automático** de las 07:00 UTC en los logs de Vercel. La
  llamada manual ya responde `keptAlive: true`.
- [ ] **Revalidar RLS** tras las migraciones 015 y 016 (Fase 3, 51 comprobaciones).
- [ ] **Google Play (TWA)**, si se decide publicar: package name, SHA-256 de la
  firma, `public/.well-known/assetlinks.json` y la guía `docs/play-store.md`. La PWA
  y la política de privacidad ya están.
