# Notificaciones (Web Push)

Estado y pasos para activar los recordatorios por notificación push.

## Qué está hecho (en el repo)

- **Service worker** (`public/sw.js`): maneja `push` (muestra la notificación) y `notificationclick` (enfoca/abre la app).
- **Cliente** (`src/lib/push.ts`): pedir permiso, suscribirse y cancelar. Degrada solo si el navegador no soporta o falta configuración.
- **API** (`src/app/api/push/route.ts`): `POST` guarda la suscripción, `DELETE` la borra (autenticado; bloqueada en modo demo).
- **BD** (`supabase/migrations/010_push_subscriptions.sql`): tabla `push_subscriptions` con RLS por usuario. Incluida en `all_in_one.sql`.
- **UI**: tarjeta "Recordatorios" en Ajustes (solo en modo real) para activar/desactivar.

La UI solo ofrece activar cuando hay **backend real** y **clave VAPID pública**; si no, muestra "Estarán disponibles próximamente".

## Qué falta para que funcione

Solo los pasos 1 y 2: **generar las claves VAPID y ponerlas en Vercel**. Todo lo
demás (la migración, el emisor y el cron) ya está hecho y funcionando.

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
- `NIDO_TIME_ZONE` — zona horaria para calcular "hoy" en recordatorios. Por defecto: `Europe/Madrid`.

Con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` presente, la tarjeta de Ajustes ya deja **activar** y guarda la suscripción en `push_subscriptions`.

### 3. Aplicar la migración (hecho)
`010_push_subscriptions.sql` ya está aplicada en el proyecto real, con la tabla
`push_subscriptions` y su RLS por usuario verificadas en la validación del
2026-08-03.

### 3 bis. Probarlo en local antes de tocar producción

**Este camino no se ha ejecutado nunca.** Sin claves VAPID el emisor sale por el
`skipped` en la primera línea, así que conviene verlo funcionar en local antes de
poner nada en Vercel. Con las tres variables (más `CRON_SECRET`) en `.env.local`:

```bash
npm run dev
```

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
2. Lee `push_subscriptions`, agrupa por usuario y busca sus eventos de hoy, sus tareas pendientes que vencen (o vencidas) y los documentos que caducan dentro de `DIAS_AVISO_CADUCIDAD` (30 días, en `src/lib/constants.ts`).
3. Envía el push con `web-push` (payload `{ title, body, url }`).
4. Borra las suscripciones caducadas (respuesta 404/410).

Para que envíe (además de las claves VAPID) conviene proteger el endpoint con:
- `CRON_SECRET` — Vercel añade `Authorization: Bearer <CRON_SECRET>` a las llamadas del cron; el endpoint lo verifica.

> Nota: el plan **Hobby de Vercel** permite crons **una vez al día**, justo lo que usamos. El cron corre a las 07:00 UTC y el endpoint calcula "hoy" con `NIDO_TIME_ZONE` (`Europe/Madrid` por defecto), incluyendo correctamente eventos de todo el día.

## Notas
- iOS soporta Web Push solo si la PWA está **instalada** en la pantalla de inicio (iOS 16.4+).
  En una pestaña normal de Safari no existe `PushManager`, así que la tarjeta de Ajustes
  detecta el caso (`iosSinInstalar()` en `src/lib/push.ts`) y explica cómo añadirla a la
  pantalla de inicio, en vez de decir que el navegador no admite notificaciones.
- Cada dispositivo/navegador genera su propia suscripción; por eso la tabla es por `endpoint`.
- El aviso diario no cuenta las vacaciones como evento del día, igual que
  `selectTodayEvents`: son del calendario, no un plan de hoy.
