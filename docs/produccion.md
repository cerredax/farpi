# Puesta en producción

Estado y pasos para llevar Nido a producción en Vercel + Supabase. Marca las casillas a medida que las completes.

> Última actualización: 2026-07-30.

---

## 1. Resumen del estado

La app está **funcionalmente completa** y verificada (build, lint y 14 tests e2e en verde):

- Supabase conectado de extremo a extremo: auth, repositorios reales, store async.
- Onboarding, invitaciones por magic link, gestión de miembros y roles.
- Documentos reales en Storage: subir, abrir/descargar (signed URL) y borrar.
- PWA instalable (iconos + manifest), accesibilidad revisada.
- Código refactorizado: sin código muerto, sheets y detección de demo unificados, paleta tokenizada.

Lo único que **falta para dar por seguro el backend** es la validación manual de RLS/RPCs/Storage (ver §4).

Arquitectura y detalle: `architecture.md`. Estado: `project-status.md`. Roadmap: `roadmap.md`.

---

## 2. Requisitos antes del primer deploy

### 2.1 Variables de entorno en Vercel

En **Vercel → proyecto `nido` → Settings → Environment Variables** (marca *Production* y *Preview*):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — service role (solo servidor; necesaria para enviar invitaciones). **Nunca** exponer al cliente.
- [ ] `NEXT_PUBLIC_SITE_URL` — dominio de producción (p. ej. `https://nido.vercel.app`). Se usa para el `redirectTo` del magic link.
- [ ] `NEXT_PUBLIC_DONATION_URL` — *(opcional)* enlace de donación en Ajustes.

> Sin `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` válidas, la app arranca en **modo demo** (datos locales). Es el comportamiento correcto, pero no es lo que quieres en producción.

### 2.2 Supabase — base de datos

- [ ] Migraciones `001`–`009` aplicadas en el proyecto de producción (SQL Editor o CLI).
- [ ] Bucket `documents` existe y es **privado** (`storage.buckets.public = false`).
- [ ] RLS activo en todas las tablas privadas.

### 2.3 Supabase — Auth

- [ ] **Authentication → URL Configuration → Site URL**: el dominio de producción.
- [ ] **Redirect URLs**: añadir `https://<dominio>/auth/callback` (y el de preview si usas invitaciones en preview).
- [ ] **Email**: proveedor SMTP configurado (Auth → Emails). Sin esto, las invitaciones por magic link y la confirmación de cuenta no se envían.

---

## 3. Desplegar

El proyecto está vinculado a Vercel y a GitHub (`cerredax/nido`).

- **Auto-deploy**: `git push origin main` → Vercel construye y despliega producción.
- **Manual**: `vercel --prod` (requiere Vercel CLI: `npm i -g vercel`).

Build local de comprobación: `npm run build`.

---

## 4. Validación Supabase (Fase 3) — PENDIENTE

Sigue la guía **`docs/supabase-validation-guide.md`**. En resumen:

- [ ] Crear 2 usuarios y 2 familias de prueba.
- [ ] Ejecutar `supabase/validate_rls.sql` (RLS por tabla, aislamiento entre familias).
- [ ] Probar las 5 RPCs (incl. regla del último admin).
- [ ] Probar triggers de integridad cross-family.
- [ ] Probar Storage privado + fuga cross-family (signed URL de otra familia debe fallar).
- [ ] Registrar resultados en `docs/supabase-validation.md`.

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
- [ ] Configurar env vars en Vercel (§2.1).
- [ ] Configurar Auth de Supabase: Site URL, Redirect URLs y SMTP (§2.3).
- [ ] Cerrar validación Supabase (§4).

### Recomendadas (no bloqueantes)
- [ ] Verificar `NEXT_PUBLIC_SITE_URL` = dominio final antes de invitar a nadie.
- [ ] Revisar límites de envío de email del proveedor (invitaciones).

### Mejoras futuras (opcional)
- [x] PWA **offline** (service worker registrado en producción, con fallback `/offline`).
- [ ] Backup/export de datos de la familia.
- [ ] Tokenizar los ~70 colores one-off restantes (login/degradados) — retorno bajo.
- [ ] Tests e2e de flujos CRUD completos (hoy hay smoke + apertura de sheets).

---

## 7. Notas y limitaciones conocidas

- **Modo demo**: si faltan credenciales, la app funciona con datos en `localStorage`. La sección "Reiniciar datos de demo" en Ajustes solo aparece en ese modo.
- **Regla del último admin**: se valida en el servidor (RPCs `security definer`) y la UI la refuerza; el mock no la valida (asume un único admin).
- **Comandos útiles**: `npm run dev` (arranca), `npm run build`, `npm run lint`, `npm run test:e2e`.
