# CLAUDE.md

Guía para Claude Code (claude.ai/code) y para cualquier otro agente que trabaje en
este repositorio. Es el único sitio con las reglas: `AGENTS.md` solo apunta aquí.

La documentación está en español; escribe código, comentarios y docs en español.

## Producto

Nido es una app familiar privada, mobile-first y de alcance pequeño. Debe responder
rápido a una pregunta:

> ¿Qué tenemos que saber hoy en casa?

Sencilla, visual y útil para una familia. No es un SaaS ni aspira a serlo.

## Lee primero

- `docs/project-status.md` — estado real y pendientes (fuente de verdad).
- `docs/architecture.md` — decisiones técnicas, RLS, RPCs, repositorios.
- `docs/roadmap.md` — orden de trabajo.
- `docs/testing-checklist.md` — QA manual, y qué está ya automatizado.
- `docs/produccion.md` — checklist de despliegue (Vercel + Supabase) y variables de entorno.
- `docs/supabase-validation.md` — resultado de la última validación de RLS.
- `docs/notificaciones.md` — qué falta para activar las notificaciones push.

## Reglas de trabajo

- **Supabase está conectado y en producción con datos reales de una familia.** No
  ejecutar nada que escriba o borre en la base real salvo petición explícita. La
  excepción es `scripts/validate-rls.mjs`, que crea y borra sus propios usuarios y
  familias de prueba sin tocar los datos de nadie. Ojo: local y producción apuntan
  al **mismo** proyecto Supabase, no hay entorno de desarrollo separado.
- Mantener el modo demo/mock funcionando: es el fallback sin credenciales y el
  entorno donde corre la suite e2e.
- Mobile-first siempre. No cambiar el diseño visual de forma amplia sin confirmación.
- No introducir backend complejo, Docker, NestJS, librerías pesadas de validación ni
  arquitectura grande. No sobrerrefactorizar.
- Si tocas lógica pura (fechas, recurrencia, selectores, validadores), añade o ajusta
  su test en `e2e/unit/` y ejecuta `npm run test:unit`.
- Si cambias un flujo del mock, comprueba la persistencia en `localStorage`.
- Si tocas una migración, una policy o una RPC: ejecuta `node scripts/validate-rls.mjs`
  y actualiza `docs/supabase-validation.md`.
- Para cambios relevantes, ejecuta `npm run lint` y `npm run build`.
- Si aparecen warnings por archivos temporales, límpialos o exclúyelos.

## Comandos

```bash
npm run dev            # dev server (Next 16, puerto 3000)
npm run build          # build de producción
npm run lint           # eslint (flat config, eslint.config.mjs)
npm run test:unit      # 150 tests de lógica pura (~0,6 s, sin servidor)
npm run test:e2e       # suite completa: unitarios + 48 de navegador (levanta dev en :3100 en modo demo forzado)

node scripts/validate-rls.mjs      # valida RLS/RPCs contra el Supabase real
node scripts/gen-all-in-one.mjs    # regenera supabase/all_in_one.sql (--check solo comprueba)

npx playwright test e2e/smoke.spec.ts            # un solo archivo
npx playwright test -g "nombre del test"         # un solo test por título
npx playwright test --ui                         # modo interactivo
```

Variables de entorno: la plantilla con todas las que usa la app está en `.env.example`
(no la carga Next, es documentación). Las reales van en `.env.local`, que no se versiona.

## Arquitectura

### Frontera de datos: demo vs Supabase

La decisión central del proyecto. La UI nunca habla con Supabase directamente:

```
Pantallas (src/components/**)
  -> StoreProvider (src/lib/store-context.tsx)   [async: isLoading / error / reload()]
    -> contrato Repos (src/lib/repos/types.ts)
       ├─ supabaseRepos (src/lib/supabase-repos/*)   ← IS_DEMO_MODE = false
       └─ mockRepos     (src/lib/mock-repos.ts)      ← IS_DEMO_MODE = true
            -> src/lib/store/* (módulos del mock) -> localStorage (`nido_store_v1`)
```

- `IS_DEMO_MODE` se calcula **en un solo sitio**: `src/lib/supabase/env.ts` (URL/anon key ausentes o placeholder). Lo comparten cliente, servidor, proxy y rutas API — no reimplementar esa detección en otra capa.
- Cualquier operación nueva se añade **primero al contrato** `repos/types.ts` y después a las **dos** implementaciones. El mock debe imitar el comportamiento de Supabase (filtrado por `family_id`, `child_id = null` al borrar un hijo, comidas únicas por familia/fecha/slot, invitaciones separadas de miembros).
- El mock persiste con `SCHEMA_VER` en `src/lib/store/persist.ts`: si cambia la forma de los datos, sube la versión y revisa la migración de `localStorage`.

### Next.js 16

- App Router. Rutas de app bajo el grupo `src/app/(app)/` (home, calendar, tasks, lists, meals, docs, settings); auth en `src/app/auth/`; onboarding en `src/app/onboarding/`.
- El middleware es **`src/proxy.ts`** (renombrado en Next 16, exporta `proxy()`), que delega en `src/lib/supabase/middleware.ts` para refrescar la sesión.
- Ante dudas de API o convención, consultar la documentación local en `node_modules/next/dist/docs/` antes de asumir comportamiento antiguo.

### Clientes Supabase

`src/lib/supabase/`: `client.ts` (browser), `server.ts` (RSC/route handlers, cookies), `admin.ts` (service role, **solo** en rutas API server-side), `middleware.ts` (refresco de sesión), `env.ts` (detección de modo demo).

### Rutas API

- `/api/invite` — invitación por magic link (`inviteUserByEmail`, service role) → `/auth/callback?invite_id=…` → RPC `accept_family_invite`.
- `/api/account/delete` — borrado de cuenta; bloquea si dejaría una familia compartida sin admin.
- `/api/push` — alta/baja de suscripciones Web Push.
- `/api/cron/reminders` — cron diario (`vercel.json`, 07:00 UTC): keep-alive de Supabase + envío de recordatorios.

### Base de datos

`supabase/migrations/001…016`. Se aplican a mano por el SQL Editor (no hay CLI de Supabase enlazada). `all_in_one.sql` es la concatenación de las 16 para levantar un proyecto de cero: **está generado**, no se edita a mano (`node scripts/gen-all-in-one.mjs`, y `--check` avisa si se ha quedado atrás).

Regla de RLS: un usuario solo accede a datos de familias donde figura en `family_members`, vía `my_family_ids()` (`security definer`, `search_path` fijo).

Lo que **no** se hace con policies va por RPC `security definer`: `create_family_with_admin`, `update_family_member_profile`, `remove_family_member`, `update_family_member_role`, `accept_family_invite`. Regla del último admin (una familia siempre tiene ≥1 admin) validada en esas RPCs y en `/api/account/delete`; la UI solo la refuerza.

Si tocas una migración: actualiza tipos en `src/types/index.ts`, el mock y la documentación, y regenera `all_in_one.sql`.

## Convenciones de código

- Constantes compartidas en `src/lib/constants.ts`; fechas **locales** en `src/lib/date-utils.ts` (no usar `toISOString().split('T')[0]` para fechas familiares); validaciones ligeras en `src/lib/validators.ts`; datos derivados en `src/lib/selectors.ts`; recurrencias en `src/lib/recurrence.ts`.
- Contratos de repositorios en `src/lib/repos/types.ts`.
- Todos los sheets usan `src/components/ui/BottomSheet.tsx` (patrón `form` + `footer` fijo), con `useSheetForm`/`useSheetDelete` para el estado. No crear overlays propios.
- Tailwind v4 (sin `tailwind.config`; tokens en `src/app/globals.css`).
