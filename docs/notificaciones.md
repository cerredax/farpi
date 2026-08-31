# Notificaciones (Web Push)

Estado y pasos para activar los recordatorios por notificación push.

## Qué está hecho (en el repo)

- **Service worker** (`public/sw.js`): maneja `push` (muestra la notificación) y `notificationclick` (enfoca/abre la app).
- **Cliente** (`src/lib/push.ts`): pedir permiso, suscribirse y cancelar. Degrada solo si el navegador no soporta o falta configuración.
- **API** (`src/app/api/push/route.ts`): `POST` guarda la suscripción, `DELETE` la borra (autenticado; bloqueada en modo demo).
- **BD** (`supabase/schema.sql`): tabla `push_subscriptions` con RLS por usuario, ya aplicada.
- **UI**: tarjeta "Recordatorios" en Ajustes (solo en modo real) para activar/desactivar.

La UI solo ofrece activar cuando hay **backend real** y **clave VAPID pública**; si no, muestra "Estarán disponibles próximamente".

## Estado: funcionando desde el 28-08-2026

No falta nada. El camino se recorrió entero por primera vez ese día: claves VAPID
en Vercel, activar los avisos desde Ajustes con una cuenta real y el cron
devolviendo `{ ok: true, sent: 1, fallidos: 0 }`. Lo que sigue queda como
referencia de configuración, no como pendientes.

Costó encontrar por qué no arrancaba, y el motivo no estaba en nada de esto: ver
**"El botón que se quedaba en Guardando…"** al final.

### 1. Generar claves VAPID (una vez)
```bash
node scripts/gen-vapid.cjs
```
Imprime el par de claves ya con el nombre de cada variable, listo para copiar.
No caducan y **no se rotan**: cambiarlas invalida todas las suscripciones que
ya existen y obliga a cada persona a volver a activar los avisos. La privada va
donde guardes las contraseñas, nunca en el repositorio.

Después de guardarlas en Vercel hay que **volver a desplegar**: las variables
`NEXT_PUBLIC_*` se incrustan en el build, así que sin redeploy el botón de
activar avisos sigue sin aparecer.

### 2. Variables de entorno (local y Vercel)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — la pública (la usa el cliente para suscribirse).
- `VAPID_PRIVATE_KEY` — la privada (solo servidor, para enviar).
- `VAPID_SUBJECT` — un `mailto:tuemail` o URL.
- `FARPI_TIME_ZONE` — **opcional, y nunca se ha definido**. Zona horaria para calcular "hoy" en los recordatorios; sin ella vale `Europe/Madrid`, que es lo que se ha usado siempre. Se llamó `NIDO_TIME_ZONE` hasta el 31-08-2026.

Con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` presente, la tarjeta de Ajustes ya deja **activar** y guarda la suscripción en `push_subscriptions`.

### 3. Aplicar la migración (hecho)
`010_push_subscriptions.sql` ya está aplicada en el proyecto real, con la tabla
`push_subscriptions` y su RLS por usuario verificadas en la validación del
2026-08-03.

### 3 bis. Probarlo en local

Así se recorrió por primera vez, y sigue siendo la forma de comprobarlo sin
esperar a las 07:00. **Ojo con `npm run dev`: en desarrollo el service worker no se
registra a propósito** (`ServiceWorkerRegister.tsx` corta si `NODE_ENV !==
'production'`), así que ahí el botón de activar no puede funcionar. Para probar el
flujo entero hace falta el build servido:

```bash
npm run build && npm run start
```

Con las tres variables (más `CRON_SECRET`) en `.env.local`:

1. Ajustes → **Activar notificaciones**. Eso guarda una suscripción real en
   `push_subscriptions` de la base de producción, porque `.env.local` apunta ahí. Es
   la acción normal de un usuario y se deshace con el botón de desactivar.
2. Dispara el cron a mano (PowerShell):

```powershell
Invoke-RestMethod http://localhost:3000/api/cron/reminders -Headers @{ Authorization = "Bearer TU_CRON_SECRET" }
```

Cómo leer la respuesta:

- `{ sent: 1 }` — ha salido. Mira el móvil o el escritorio.
- `{ sent: 0, fallidos: 0 }` — no había nada que contar. Es lo normal si hoy no
  tienes ningún evento, ninguna tarea que venza ni ningún documento por caducar:
  crea uno y repite.
- `{ sent: 0, fallidos: 2 }` — los envíos fallaron. El motivo sale por consola
  (`[cron] Envío push fallido: …`), normalmente una clave mal pegada.
- `{ skipped: 'VAPID no configurado' }` — faltan variables, o no reiniciaste `dev`
  después de tocar `.env.local`.

### 4. El emisor de recordatorios (hecho)
Ya está implementado en `src/app/api/cron/reminders/route.ts` y programado en `vercel.json` (**cron diario a las 07:00 UTC**). Cada ejecución:
1. Hace un **keep-alive** a Supabase (evita la pausa por inactividad del plan free).
2. Lee `push_subscriptions`, agrupa por usuario y busca sus eventos de hoy, sus tareas pendientes que vencen (o vencidas), los documentos que caducan dentro de `DIAS_AVISO_CADUCIDAD` (30 días, en `src/lib/constants.ts`) y los **cumpleaños de hoy**, deducidos de la fecha de nacimiento de las personas de la casa con `proximosCumples` (`src/lib/birthdays.ts`).
3. Envía el push con `web-push` (payload `{ title, body, url }`).
4. Borra las suscripciones caducadas (respuesta 404/410).

Para que envíe (además de las claves VAPID) conviene proteger el endpoint con:
- `CRON_SECRET` — Vercel añade `Authorization: Bearer <CRON_SECRET>` a las llamadas del cron; el endpoint lo verifica.

> Nota: el plan **Hobby de Vercel** permite crons **una vez al día**, justo lo que usamos. El cron corre a las 07:00 UTC y el endpoint calcula "hoy" con `FARPI_TIME_ZONE` (`Europe/Madrid` por defecto), incluyendo correctamente eventos de todo el día.

## El botón que se quedaba en "Guardando…"

Lo que tuvo paradas las notificaciones no fue ninguna clave ni ningún despliegue:
en producción, darle a **Activar recordatorios** dejaba el botón girando para
siempre. Sin mensaje de error, y al salir y volver a entrar seguía desactivado.

La causa son dos cosas que se juntan, y las dos están arregladas:

1. **`navigator.serviceWorker.ready` no rechaza nunca.** Si no hay ningún worker
   activado en el scope, esa promesa se queda **pendiente para siempre**: no
   resuelve y no falla. Un `try/catch` alrededor no sirve de nada, porque no hay
   nada que capturar. Por eso el botón se quedaba colgado en vez de dar un error.
2. **El service worker podía no registrarse.** `ServiceWorkerRegister.tsx`
   registraba dentro de un `window.addEventListener('load', …)`, y si el evento
   `load` ya había ocurrido cuando React monta el efecto, ese listener no se
   dispara jamás. Es una carrera contra la hidratación: unas visitas registraban y
   otras no, que es justo por qué el fallo parecía aleatorio y no salía en local.

De ahí dos reglas para lo que venga:

- **No esperar a `serviceWorker.ready` a pelo.** En `src/lib/push.ts` está
  `registroListo()`, que asegura el registro (`register()` es idempotente) y pone
  reloj a la espera. Activar y desactivar pasan las dos por ahí.
- **Registrar comprobando `document.readyState === 'complete'`**, no solo
  escuchando `load`. Un evento que ya pasó no vuelve.

Y una lección de interfaz que vale más allá de las notificaciones: **un botón en
estado de carga tiene que poder rendirse**. Mientras la espera no tuvo límite, el
fallo se veía como una app rota sin explicación; con límite, se ve como un error
que dice qué hacer.

## Notas
- iOS soporta Web Push solo si la PWA está **instalada** en la pantalla de inicio (iOS 16.4+).
  En una pestaña normal de Safari no existe `PushManager`, así que la tarjeta de Ajustes
  detecta el caso (`iosSinInstalar()` en `src/lib/push.ts`) y explica cómo añadirla a la
  pantalla de inicio, en vez de decir que el navegador no admite notificaciones.
- Cada dispositivo/navegador genera su propia suscripción; por eso la tabla es por `endpoint`.
- El aviso diario no cuenta las vacaciones como evento del día, igual que
  `selectTodayEvents`: son del calendario, no un plan de hoy.
- El cumpleaños abre el cuerpo del aviso, delante de las tareas y de lo que caduca: es lo
  único de los tres que caduca el mismo día. Y solo se felicita **el día**, sin
  antelación: avisar con once días de margen a las siete de la mañana no es algo que haya
  que saber hoy en casa.
