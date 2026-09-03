# CLAUDE.md

Guía para Claude Code (claude.ai/code) y para cualquier otro agente que trabaje en
este repositorio. Es el único sitio con las reglas: `AGENTS.md` solo apunta aquí.

La documentación está en español; escribe código, comentarios y docs en español.

## Producto

Farpi es una app familiar privada, mobile-first y de alcance pequeño. Debe responder
rápido a una pregunta:

> ¿Qué tenemos que saber hoy en casa?

Sencilla, visual y útil para una familia. No es un SaaS ni aspira a serlo.

## Lee primero

- `docs/project-status.md` — estado real y pendientes (fuente de verdad). Cuenta
  **cómo está** el proyecto, no cómo se llegó: lo ya cerrado vive en
  `docs/historial.md` desde el 28-08-2026, cuando el historial se había comido al
  estado (1030 de 1488 líneas) y dejaba de leerse justo lo que había que leer.
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
  arrastra a hoy, las vacaciones no salen en los planes del día, un mes de Finanzas
  que ya terminó no se puede tocar—, lee "Decisiones de producto" en
  `docs/architecture.md`. Está así a propósito y costó varias vueltas.
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
- **La suite entera se corre una vez, justo antes del commit.** `npm run test:e2e` levanta
  el servidor y tarda unos dos minutos; encadenarla tras cada retoque no aporta nada y se
  come la sesión. Mientras se trabaja basta con `npx tsc --noEmit`, `npm run lint` y, si
  hace falta, el archivo o el test concretos (`npx playwright test <archivo>`,
  `-g "<título>"`). La pasada completa es la que da el visto bueno antes de commitear, no
  un cronómetro de fondo.
- Si aparecen warnings por archivos temporales, límpialos o exclúyelos.

## Comandos

```bash
npm run dev            # dev server (Next 16, puerto 3000)
npm run build          # build de producción
npm run start          # sirve el build (comprobar cabeceras y service worker de verdad)
npm run lint           # eslint (flat config, eslint.config.mjs)
npm run test:unit      # 416 tests de lógica pura (~2 s, sin servidor)
npm run test:e2e       # suite completa: 546 (416 unitarios + 130 de navegador; levanta dev en :3100 en modo demo forzado)

node scripts/validate-rls.mjs      # valida RLS/RPCs contra el Supabase real
node scripts/gen-vapid.cjs         # par de claves VAPID para las push (no caducan; rotarlas invalida las suscripciones)
node scripts/gen-icons.cjs         # PNG de la PWA desde el SVG (necesita sharp)
node scripts/gen-capturas.mjs      # capturas de la portada + og.png, contra la app en modo demo
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
            -> src/lib/store/* (módulos del mock) -> localStorage (`farpi_store_v1`)
```

- **Toda escritura declara qué datos toca.** `runMutation(accion, ['tasks'])` recarga solo
  esa porción; sin el segundo argumento se recargan las 18, que es lo que hacían todas
  hasta el 03-09-2026 —marcar la leche en la compra volvía a descargar los eventos, las
  comidas, los gastos y los documentos—. Qué declarar **no** es «la tabla en la que
  escribo», es esa y todas a las que llegue el esquema solo: `supabase/schema.sql` está
  lleno de `on delete set null` y `on delete cascade`. Borrar una partida toca los gastos
  **y** las líneas de los meses cerrados; borrar un hijo o echar a un miembro toca seis
  tablas, y por eso esas dos no declaran nada. **Si hay duda, no se declara**: declarar de
  menos deja un dato viejo en la pantalla de alguien, no declarar cuesta unas consultas.
  La lista y la regla, en el bloque de `Porcion` en `store-context.tsx`.
- `IS_DEMO_MODE` se calcula **en un solo sitio**: `src/lib/supabase/env.ts` (URL/anon key ausentes o placeholder). Lo comparten cliente, servidor, proxy y rutas API — no reimplementar esa detección en otra capa.
- Cualquier operación nueva se añade **primero al contrato** `repos/types.ts` y después a las **dos** implementaciones. El mock debe imitar el comportamiento de Supabase (filtrado por `family_id`, `child_id = null` al borrar un hijo, comidas únicas por familia/fecha/slot, invitaciones separadas de miembros).
- El mock persiste con `SCHEMA_VER` en `src/lib/store/persist.ts`: si cambia la forma de los datos, sube la versión y revisa la migración de `localStorage`.

### Next.js 16

- App Router. Rutas de app bajo el grupo `src/app/(app)/` (home, calendar, tasks, lists, meals, notes, docs, settings); auth en `src/app/auth/`; onboarding en `src/app/onboarding/`. Fuera del grupo y sin sesión: `/privacidad` y `/terminos` (públicas, y requisito para publicar en Google Play) y `/offline` (fallback del service worker).
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

**Son dos cachés y no una** desde el 03-09-2026: `farpi-paginas-v1` guarda las
navegaciones y `farpi-estaticos-v1` el precache y lo estático. Están separadas porque
**cerrar sesión vacía la de páginas** —lo que se cacheó de una navegación se vio con la
sesión abierta— y con una sola caché había que elegir entre dejarlas ahí o llevarse por
delante `/offline`, que solo se repone en el `install` del worker siguiente. Lo pide la
app (`signOut` manda `farpi:vaciar-paginas`), porque es ella la que sabe que se está
saliendo.

Si cambias `PRECACHE` —la lista o el **contenido** de lo que precachea, iconos
incluidos—, sube el número de las dos y añádelas a `CACHES_VIGENTES`, o los móviles que
ya tienen la app instalada se quedan con la caché vieja. Lo que importa no es el número
sino que la cadena cambie: es la misma clase de regla que el `SCHEMA_VER` del mock.

Y **el service worker se prueba contra `npm run start`**, nunca contra `npm run dev`, que
no sirve lo mismo. La suite no lo cubre —Playwright corre en modo demo sobre el dev
server—, así que un cambio aquí se comprueba a mano: registrar el worker, navegar, mirar
`caches.keys()` y su contenido.

### Documentos: los archivos no los guarda Farpi

Desde el 27-08-2026 el archivo de cada documento vive en el **Google Drive de quien lo
sube**; en la base solo queda la ficha. La familia los ve igual y **nadie más tiene que
conectar nada**: conectar hace falta para subir, no para mirar.

Es una segunda frontera, distinta de la de `repos/types.ts` y **solo de servidor**:
`src/lib/document-storage/` con el contrato `DocumentStorageProvider` y `googleDrive`
como única implementación. Reglas que no se negocian:

- **El proveedor es el disco y no decide permisos.** Quien manda sigue siendo la RLS.
- **Leer va por proxy** (`/api/documents/[id]/file`): Farpi usa el token del **dueño** y
  sirve el archivo. En esas rutas se comprueba **primero** con el cliente del usuario que
  puede ver la ficha, y **solo después** se toca el cliente de servicio. Al revés son una
  puerta a los documentos de cualquier familia.
- **Subir va directo** del navegador a Drive por sesión reanudable: una función de Vercel
  no admite un cuerpo de 20 MB. Por eso `connect-src` abre `www.googleapis.com`.
- Scope **`drive.file`** y ninguno más (no sensible: sin verificación ni CASA).
- Los tokens viven cifrados en `storage_connections`, tabla con RLS y **sin ninguna
  policy**. No añadir una: para saber si hay conexión está `/api/documents/providers`.
- El bucket `documents` **ya no existe**. Si algo lo menciona, es que está desactualizado.
- La pantalla de consentimiento de Google tiene que estar **"In production"**. En
  "Testing" los refresh tokens caducan a los 7 días y todo se cae sin avisar.

Detalle completo en `docs/architecture.md`, sección "Documentos en Google Drive".

### Cabeceras de seguridad

`next.config.ts` pone cinco en todas las rutas, porque Farpi guarda DNI, informes médicos
y el libro de familia: `Content-Security-Policy`, `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy` y `Permissions-Policy`.

**La CSP lleva `'unsafe-inline'` en los scripts** porque Next los inyecta, así que no para
un XSS en línea; sí para cargar scripts de otro dominio, `<object>`, el iframe, reescribir
`base`, **enviar un formulario fuera** y hablar con cualquier servidor que no sea Supabase.
`connect-src` se arma con la URL real del proyecto, no con un comodín.

Si se toca: **probarla contra el build servido** (`npm run build && npm run start`), no
contra `npm run dev`, que no sirve lo mismo. La forma de comprobarlo es recorrer las rutas
escuchando `securitypolicyviolation`, y hacerlo dos veces: con credenciales reales —que
prueba el `connect-src` de Supabase— y con un build en modo demo, que es el único que deja
entrar en las pantallas con sesión sin credenciales.

### Rutas API

- `/api/invite` — invitación por magic link (`inviteUserByEmail`, service role) → `/auth/callback?invite_id=…` → RPC `accept_family_invite`.
- `/api/account/delete` — borrado de cuenta; bloquea si dejaría una familia compartida sin admin.
- `/api/push` — alta/baja de suscripciones Web Push.
- `/api/cron/reminders` — cron diario (`vercel.json`, 07:00 UTC): keep-alive de Supabase + envío de recordatorios.
- `/api/salud` — si Supabase responde, y cuánto tarda. 200 o 503, para un vigía externo. **Fuera del `matcher` de `src/proxy.ts`**: lo que vigila a Supabase no puede pasar por la pieza que puede estar colgada.
- `/api/documents/*` — los documentos en Google Drive: abrir sesión de subida, guardar la ficha, servir el archivo por proxy, borrar y gestionar la conexión con el proveedor.

Las tres primeras las llama la UI, así que **cortan al principio si `IS_DEMO_MODE`**: sin
esa guarda, el modo demo intenta hablar con Supabase y la suite e2e se cae. La del cron no
la necesita porque solo la invoca Vercel. Una ruta API nueva que la UI vaya a llamar tiene
que hacer lo mismo.

Y un detalle que se paga caro: **sin sesión, el proxy contesta 307 a `/auth/login` antes de
que la ruta llegue a devolver su 401**, y `fetch` sigue el redirect, así que lo que ve quien
llamó es un 200 con el HTML del login. Un `res.ok` no basta para dar por buena la respuesta;
hay que mirar `res.redirected`. Está resuelto en `src/lib/supabase-repos/api-farpi.ts`, que es
por donde pasan todas las llamadas de la UI a rutas propias.

### Base de datos

El esquema entero vive en **`supabase/schema.sql`**, un solo archivo: tablas, restricciones, índices, triggers, funciones, RLS y RPCs. **Ya no hay Storage**: el bucket de documentos se borró el 27-08-2026 (ver "Documentos" más abajo). Se aplica a mano por el SQL Editor (no hay CLI de Supabase enlazada, a propósito: local y producción son el mismo proyecto). Las 21 migraciones numeradas que había antes se aplastaron el 26-08-2026 y siguen en el historial de git.

Regla de RLS: un usuario solo accede a datos de familias donde figura en `family_members`, vía `my_family_ids()` (`security definer`, `search_path` fijo).

Lo que **no** se hace con policies va por RPC `security definer`: `create_family_with_admin`, `update_family_member_profile`, `remove_family_member`, `update_family_member_role`, `accept_family_invite`. Regla del último admin (una familia siempre tiene ≥1 admin) validada en esas RPCs y en `/api/account/delete`; la UI solo la refuerza.

Si tocas el esquema: edita `supabase/schema.sql` **y** aplica el `alter` suelto en el SQL Editor —las dos cosas, o el archivo miente—, y actualiza los tipos en `src/types/index.ts`, el mock y la documentación.

## Convenciones de código

- Constantes compartidas en `src/lib/constants.ts`; fechas **locales** en `src/lib/date-utils.ts` (no usar `toISOString().split('T')[0]` para fechas familiares); validaciones ligeras en `src/lib/validators.ts`; datos derivados en `src/lib/selectors.ts`; recurrencias en `src/lib/recurrence.ts`. También hay lógica ya escrita en `assignees.ts` (a quién se asigna algo), `events.ts` (qué días ocupa un evento y quién no está disponible), `meal-slots.ts` (qué franjas se pueden apagar), `push.ts`, `family-config.ts`, `agenda.ts` (los tramos de la agenda) y `text.ts`: mírala antes de reescribirla.
- Contratos de repositorios en `src/lib/repos/types.ts`.
- Todos los sheets usan `src/components/ui/BottomSheet.tsx` (patrón `form` + `footer` fijo), con `useSheetForm`/`useSheetDelete` para el estado. No crear overlays propios.
- Antes de escribir un componente, mira `src/components/ui/`: Button, Card, Field, EmptyState, SearchField, ColorPicker, AssigneePicker, SelectChip, DeleteButton, SectionLink, Suggestions y algunos más.
- **El botón de alta va arriba, en `ViewHeader`**, nunca flotando sobre el contenido.
  Lo usan las seis pantallas de contenido y existe justamente porque habían
  divergido. Finanzas volvió al redil el 02-09-2026.
- **Los gráficos se dibujan a mano, con SVG en línea**: ninguna librería de
  visualización. Y el color se **calcula, no se elige**: la paleta de marca es de
  baja saturación y dos tonos que parecen distintos pueden no serlo (el verde y el
  salmón están a ΔE 2,3 en protanopía). Los tokens y el porqué, en `globals.css`,
  bloque «Gráficos de Finanzas».
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
  toque en `docs/roadmap.md`. Son la fuente de verdad y se desactualizan solas. El
  **relato** del cierre va a `docs/historial.md`, bajo su fecha; en `project-status.md`
  solo lo que siga siendo verdad hoy. Escribir el relato en el estado es exactamente
  lo que lo infló hasta hacerlo ilegible.
