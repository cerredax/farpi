# Puesta en producción

Estado y pasos para llevar Nido a producción en Vercel + Supabase. Marca las casillas a medida que las completes.

> Última actualización: 2026-08-04.

---

## 1. Resumen del estado

La app está **funcionalmente completa** y verificada (build, lint y 14 tests e2e en verde):

- Supabase conectado de extremo a extremo: auth, repositorios reales, store async.
- Onboarding, invitaciones por magic link, gestión de miembros y roles.
- Documentos reales en Storage: subir, abrir/descargar (signed URL) y borrar.
- PWA instalable (iconos + manifest), accesibilidad revisada.
- Código refactorizado: sin código muerto, sheets y detección de demo unificados, paleta tokenizada.

El backend está **validado** (§4): 47/47 comprobaciones de RLS, RPCs, integridad y Storage. La app está desplegada y operativa en https://nido-xi.vercel.app.

Arquitectura y detalle: `architecture.md`. Estado: `project-status.md`. Roadmap: `roadmap.md`.

---

## 2. Requisitos antes del primer deploy

### 2.1 Variables de entorno en Vercel

En **Vercel → proyecto `nido` → Settings → Environment Variables** (marca *Production* y *Preview*):

- [x] `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase.
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública (formato nuevo `sb_publishable_…`).
- [x] `SUPABASE_SERVICE_ROLE_KEY` — clave de servicio `sb_secret_…` (solo servidor; necesaria para enviar invitaciones). **Nunca** exponer al cliente.
- [x] `NEXT_PUBLIC_SITE_URL` — dominio de producción. Se usa para el `redirectTo` del magic link.

- [x] `CRON_SECRET` — **obligatoria para que el cron diario funcione**. Cualquier cadena larga y aleatoria. Vercel la envía sola en la cabecera `Authorization` cuando la variable se llama así. Sin ella, `/api/cron/reminders` responde 503 y no se ejecuta el keep-alive de Supabase. *(Añadida el 04-08-2026; el endpoint responde 200 con `keptAlive: true`.)*

- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — *(opcional)* sin ellas las notificaciones push quedan desactivadas: el botón de activarlas no aparece (`src/lib/push.ts`) y el cron responde `skipped: 'VAPID no configurado'` pero mantiene el keep-alive. Se generan con `npx web-push generate-vapid-keys`.

> La lista completa, incluidas las de notificaciones push (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), `CRON_SECRET` y `NIDO_TIME_ZONE`, está en **`.env.example`** en la raíz del repositorio. Ese fichero es la plantilla de referencia: no lo lee ningún código, pero es el inventario de lo que la app necesita.

> **Cuidado al pegarlas.** En la puesta en marcha se colaron dos veces valores recortados (un espacio delante y la última letra perdida), y el síntoma fue un "Failed to fetch" opaco en el navegador. Para comprobar qué valores hay realmente horneados en producción, basta con buscar la URL en el JS servido: `curl -s https://<dominio>/auth/login` y seguir los chunks de `/_next/static`.
- [ ] `NEXT_PUBLIC_DONATION_URL` — *(opcional)* enlace de donación en Ajustes.

> Sin `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` válidas, la app arranca en **modo demo** (datos locales). Es el comportamiento correcto, pero no es lo que quieres en producción.

### 2.2 Supabase — base de datos

- [x] Migraciones `001`–`013` aplicadas en el proyecto de producción (SQL Editor o CLI). Verificado el 04-08-2026 contra la base real: existen `events.kind` (013), `events.member_id` y `documents.member_id` (012).
- [x] Bucket `documents` existe y es **privado** (`storage.buckets.public = false`).
- [x] RLS activo en todas las tablas privadas.

### 2.3 Supabase — Auth

- [x] **Authentication → URL Configuration → Site URL**: el dominio de producción.
- [x] **Redirect URLs**: añadir `https://<dominio>/auth/callback` (y `http://localhost:3000/auth/callback` para desarrollo).
- [x] **Email**: proveedor SMTP configurado (Auth → Emails, en `.../auth/smtp`). Sin esto, las invitaciones por magic link y la confirmación de cuenta no se envían.
- [x] **Confirm email** (Auth → Sign In / Providers → Email): debe estar **activado** en producción. Si lo desactivas para probar en local, acuérdate de volver a activarlo.
- [ ] **Google** (opcional): el botón "Continuar con Google" del login se muestra solo si el proveedor está habilitado en Supabase — la app lo consulta en `/auth/v1/settings` (ver `src/lib/supabase/auth-providers.ts`). Si lo habilitas, añade también el redirect `https://<dominio>/auth/callback`.

> Estado a 2026-08-03: esquema completo (11 tablas), claves nuevas funcionando, SMTP propio configurado y primer usuario creado. Solo está activo el proveedor `email`; Google sigue desactivado.

---

## 3. Desplegar

El proyecto está vinculado a Vercel y a GitHub (`cerredax/nido`).

- **Auto-deploy**: `git push origin main` → Vercel construye y despliega producción.
- **Manual**: `vercel --prod` (requiere Vercel CLI: `npm i -g vercel`).

Build local de comprobación: `npm run build`.

---

## 4. Validación Supabase (Fase 3) — COMPLETADA (2026-08-03)

Resultados en **`docs/supabase-validation.md`**: 47/47 comprobaciones correctas. Repetible con `node scripts/validate-rls.mjs`.

- [x] Dos usuarios y dos familias de prueba (creados y eliminados durante la ejecución).
- [x] RLS por tabla y aislamiento entre familias, con sesiones de usuario reales.
- [x] Las 5 RPCs, incluida la regla del último admin.
- [x] Triggers de integridad cross-family.
- [x] Bucket `documents` privado.
- [x] Storage: subida real, signed URL y fuga cross-family (un ajeno no puede firmar, descargar, listar ni borrar).
- [x] Resultados registrados en `docs/supabase-validation.md`.

---

## 5. Smoke post-deploy (manual, en el dominio real)

- [ ] `/auth/login` muestra el **formulario real** (no "Modo local activo").
- [ ] Registro → confirmación por email → login.
- [ ] Onboarding: crear familia.
- [ ] Crear evento, tarea, lista + ítem y comida; recargar y comprobar persistencia.
- [ ] Subir un documento y pulsar **Abrir documento** (signed URL).
- [ ] Invitar a un segundo email → llega el magic link → aceptar → se une a la familia.
- [ ] Cambiar rol de un miembro; comprobar que no se puede degradar al único admin.
- [ ] Cerrar sesión.
- [ ] Instalar como PWA en móvil (icono correcto).

---

## 6. Tareas pendientes (backlog)

### Bloqueantes para producción
- [x] Configurar env vars en Vercel (§2.1).
- [x] Configurar Auth de Supabase: Site URL, Redirect URLs y SMTP (§2.3).
- [x] Cerrar validación Supabase (§4).

### Recomendadas (no bloqueantes)
- [x] Verificar `NEXT_PUBLIC_SITE_URL` = dominio final antes de invitar a nadie.
- [x] `CRON_SECRET` en Vercel y cron respondiendo 200 (04-08-2026).
- [ ] Revisar límites de envío de email del proveedor (Gmail SMTP: ~500/día).
- [ ] Claves VAPID si se quieren notificaciones push reales (§2.1).
- [ ] Comprobar en los logs de Vercel que la ejecución automática de las 07:00 UTC devuelve `keptAlive: true` (la manual ya lo hace).

### Mejoras futuras (opcional)
- [x] PWA **offline** (service worker registrado en producción, con fallback `/offline`).
- [ ] Backup/export de datos de la familia.
- [x] Tokenizar los colores one-off (hecho 2026-08-03: 109 → 36 apariciones).
- [ ] Tests e2e de flujos CRUD completos (hoy hay smoke + apertura de sheets).

---

## 7. Notas y limitaciones conocidas

- **Páginas legales**: `/privacidad` y `/terminos` son públicas (rutas abiertas en `src/lib/supabase/middleware.ts`) y su correo de contacto es `cerredax@gmail.com`. La URL de `/privacidad` es la que pide Google Play.
- **Modo demo**: si faltan credenciales, la app funciona con datos en `localStorage`. La sección "Reiniciar datos de demo" en Ajustes solo aparece en ese modo.
- **Regla del último admin**: se valida en el servidor (RPCs `security definer` y borrado de cuenta) y la UI la refuerza; el mock no la valida (asume un único admin).
- **Comandos útiles**: `npm run dev` (arranca), `npm run build`, `npm run lint`, `npm run test:e2e`.
