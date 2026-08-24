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
- `docs/architecture.md` — decisiones técnicas (RLS, RPCs, repositorios) y también las
  **decisiones de producto** y el **tono de la interfaz**.
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
  Dos límites que no se negocian y que `e2e/movil.spec.ts` comprueba: nada desborda
  a lo ancho a **390 px** (un iPhone normal, más estrecho que el Pixel 7 con el que
  corre el resto de la suite) y ningún control baja de **24×24 px** (mínimo WCAG 2.5.8).
- **El escritorio se hace en `lg:` y no toca nada por debajo.** La navegación cambia
  ahí: `BottomNav` se va con `lg:hidden` y entra `SideNav` con `hidden lg:flex`. Si un
  cambio de escritorio necesita tocar un valor que ya se usa en móvil, no se toca: se
  mueve a una clase con el mismo valor base y se le añade la variante `lg:` (así se
  hizo con las columnas de `WeekGrid`, que estaban en un `style` en línea imposible de
  sobreescribir). `e2e/escritorio.spec.ts` lo vigila desde los dos lados: a 1440 px y a
  **1023 px**, un píxel por debajo del corte, donde todo tiene que seguir igual.
- No introducir backend complejo, Docker, NestJS, librerías pesadas de validación ni
  arquitectura grande. No sobrerrefactorizar.
- Antes de "arreglar" algo que parezca una incoherencia —las listas marcan lo que
  falta y no lo hecho, el catálogo se pide con `+` y no con un tic, lo atrasado se
  arrastra a hoy, las vacaciones no salen en los planes del día—, lee "Decisiones de
  producto" en `docs/architecture.md`. Está así a propósito y costó varias vueltas.
- Si tocas lógica pura (fechas, recurrencia, selectores, validadores), añade o ajusta
  su test en `e2e/unit/` y ejecuta `npm run test:unit`. Playwright es el **único**
  runner, para los unitarios y para los de navegador: no añadir Jest ni Vitest.
- `e2e/runtime.spec.ts` falla ante **cualquier** `console.error` o excepción, tanto al
  recorrer las rutas como al abrir los sheets de creación. Un log de depuración
  olvidado no es un warning: tumba la suite.
- Si cambias un flujo del mock, comprueba la persistencia en `localStorage`.
- Si tocas una migración, una policy o una RPC: ejecuta `node scripts/validate-rls.mjs`
  y actualiza `docs/supabase-validation.md`.
- Para cambios relevantes, ejecuta `npm run lint` y `npm run build`.
- Si aparecen warnings por archivos temporales, límpialos o exclúyelos.

## Comandos

```bash
npm run dev            # dev server (Next 16, puerto 3000)
npm run build          # build de producción
npm run start          # sirve el build (comprobar cabeceras y service worker de verdad)
npm run lint           # eslint (flat config, eslint.config.mjs)
npm run test:unit      # ~190 tests de lógica pura (~0,7 s, sin servidor)
npm run test:e2e       # suite completa: unitarios + ~73 de navegador (levanta dev en :3100 en modo demo forzado)

node scripts/validate-rls.mjs      # valida RLS/RPCs contra el Supabase real
node scripts/gen-all-in-one.mjs    # regenera supabase/all_in_one.sql (--check solo comprueba)
node scripts/gen-vapid.cjs         # par de claves VAPID para las push (no caducan; rotarlas invalida las suscripciones)
node scripts/gen-icons.cjs         # PNG de la PWA desde el SVG (necesita sharp)
python scripts/gen-email-templates.py   # plantillas de correo de Supabase, a mano cuando cambie el diseño

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

- App Router. Rutas de app bajo el grupo `src/app/(app)/` (home, calendar, tasks, lists, meals, docs, settings); auth en `src/app/auth/`; onboarding en `src/app/onboarding/`. Fuera del grupo y sin sesión: `/privacidad` y `/terminos` (públicas, y requisito para publicar en Google Play) y `/offline` (fallback del service worker).
- El middleware es **`src/proxy.ts`** (renombrado en Next 16, exporta `proxy()`), que delega en `src/lib/supabase/middleware.ts` para refrescar la sesión.
- **Las rutas públicas son una lista blanca a mano**: `PUBLIC_ROUTES` en `src/lib/supabase/middleware.ts`. Si añades una página que se ve sin sesión y no la metes ahí, redirige al login. Lo mismo por el otro lado: el `matcher` de `src/proxy.ts` deja fuera `sw.js` y `manifest.json` a propósito — si pasan por el control de sesión responden con redirect y el navegador se niega a registrar el service worker.
- Ante dudas de API o convención, consultar la documentación local en `node_modules/next/dist/docs/` antes de asumir comportamiento antiguo.

### Clientes Supabase

`src/lib/supabase/`: `client.ts` (browser), `server.ts` (RSC/route handlers, cookies), `admin.ts` (service role, **solo** en rutas API server-side), `middleware.ts` (refresco de sesión), `env.ts` (detección de modo demo).

### PWA

`public/manifest.json`, los iconos (`any` + `maskable`) y `public/sw.js`, que registra
`src/components/ServiceWorkerRegister.tsx`. El service worker hace network-first en
las navegaciones con fallback a `/offline`, stale-while-revalidate en los estáticos y
**nunca** cachea `/api`, `/auth` ni Supabase.

Si cambias `PRECACHE`, sube `CACHE` (`nido-v1`, en `public/sw.js`) o los móviles que
ya tienen la app instalada se quedan con la caché vieja. Es la misma clase de regla
que el `SCHEMA_VER` del mock.

### Cabeceras de seguridad

`next.config.ts` pone cuatro en todas las rutas (`X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy`, `Permissions-Policy`), porque Nido guarda DNI, informes médicos y el
libro de familia. **No hay CSP a propósito**: Next inyecta scripts en línea y una CSP mal
puesta rompe producción sin haber avisado en local. No añadir una sin probarla contra el
build servido (`npm run build && npm run start`), no contra `npm run dev`.

### Rutas API

- `/api/invite` — invitación por magic link (`inviteUserByEmail`, service role) → `/auth/callback?invite_id=…` → RPC `accept_family_invite`.
- `/api/account/delete` — borrado de cuenta; bloquea si dejaría una familia compartida sin admin.
- `/api/push` — alta/baja de suscripciones Web Push.
- `/api/cron/reminders` — cron diario (`vercel.json`, 07:00 UTC): keep-alive de Supabase + envío de recordatorios.

Las tres primeras las llama la UI, así que **cortan al principio si `IS_DEMO_MODE`**: sin
esa guarda, el modo demo intenta hablar con Supabase y la suite e2e se cae. La del cron no
la necesita porque solo la invoca Vercel. Una ruta API nueva que la UI vaya a llamar tiene
que hacer lo mismo.

### Base de datos

`supabase/migrations/001…019`. Se aplican a mano por el SQL Editor (no hay CLI de Supabase enlazada). `all_in_one.sql` es la concatenación de las 19 para levantar un proyecto de cero: **está generado**, no se edita a mano (`node scripts/gen-all-in-one.mjs`, y `--check` avisa si se ha quedado atrás).

Regla de RLS: un usuario solo accede a datos de familias donde figura en `family_members`, vía `my_family_ids()` (`security definer`, `search_path` fijo).

Lo que **no** se hace con policies va por RPC `security definer`: `create_family_with_admin`, `update_family_member_profile`, `remove_family_member`, `update_family_member_role`, `accept_family_invite`. Regla del último admin (una familia siempre tiene ≥1 admin) validada en esas RPCs y en `/api/account/delete`; la UI solo la refuerza.

Si tocas una migración: actualiza tipos en `src/types/index.ts`, el mock y la documentación, y regenera `all_in_one.sql`.

## Convenciones de código

- Constantes compartidas en `src/lib/constants.ts`; fechas **locales** en `src/lib/date-utils.ts` (no usar `toISOString().split('T')[0]` para fechas familiares); validaciones ligeras en `src/lib/validators.ts`; datos derivados en `src/lib/selectors.ts`; recurrencias en `src/lib/recurrence.ts`. También hay lógica ya escrita en `assignees.ts` (a quién se asigna algo), `events.ts` (qué días ocupa un evento), `push.ts`, `family-config.ts` y `text.ts`: mírala antes de reescribirla.
- Contratos de repositorios en `src/lib/repos/types.ts`.
- Todos los sheets usan `src/components/ui/BottomSheet.tsx` (patrón `form` + `footer` fijo), con `useSheetForm`/`useSheetDelete` para el estado. No crear overlays propios.
- Antes de escribir un componente, mira `src/components/ui/`: Button, Card, Field, EmptyState, SearchField, ColorPicker, SelectChip, DeleteButton, Suggestions y algunos más.
- Hooks compartidos en `src/hooks/`: además de los dos de los sheets, `useConfirmAction`, `useIsClient` y `useMediaQuery`.
- Tailwind v4 (sin `tailwind.config`; tokens en `src/app/globals.css`).

## Entregar el trabajo

- **Asunto**: español, minúscula, con prefijo `feat:`, `fix:`, `refactor:`, `docs:` o
  `chore:`. Cuenta qué cambia **para quien usa la app**, no qué archivo se tocó: «las
  listas enseñan lo que falta, no lo que se ha hecho», no «update ListSheet props».
- **Cuerpo, siempre.** Ningún commit del historial va sin él, y es donde vive el porqué:
  qué estaba mal, qué se decidió y qué se descartó. Escríbelo pensando en quien lo lea
  dentro de un año sin contexto — de ahí salieron las decisiones de producto que ahora
  están en `docs/architecture.md`. Un cambio que no merece explicación probablemente no
  merece commit propio.
- Autor: Omar García <cerredax@gmail.com>. Y cierra con el trailer
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, como el resto del historial.
- Al cerrar un trabajo relevante, actualiza `docs/project-status.md` y marca lo que
  toque en `docs/roadmap.md`. Son la fuente de verdad y se desactualizan solas.
