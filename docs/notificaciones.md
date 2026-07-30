# Notificaciones (Web Push)

Estado y pasos para activar los recordatorios por notificación push.

## Qué está hecho (en el repo)

- **Service worker** (`public/sw.js`): maneja `push` (muestra la notificación) y `notificationclick` (enfoca/abre la app).
- **Cliente** (`src/lib/push.ts`): pedir permiso, suscribirse y cancelar. Degrada solo si el navegador no soporta o falta configuración.
- **API** (`src/app/api/push/route.ts`): `POST` guarda la suscripción, `DELETE` la borra (autenticado; bloqueada en modo demo).
- **BD** (`supabase/migrations/010_push_subscriptions.sql`): tabla `push_subscriptions` con RLS por usuario. Incluida en `all_in_one.sql`.
- **UI**: tarjeta "Recordatorios" en Ajustes (solo en modo real) para activar/desactivar.

La UI solo ofrece activar cuando hay **backend real** y **clave VAPID pública**; si no, muestra "Estarán disponibles próximamente".

## Qué falta para que funcione (pendiente)

### 1. Generar claves VAPID (una vez)
```bash
npx web-push generate-vapid-keys
```
Da una **public key** y una **private key**.

### 2. Variables de entorno (local y Vercel)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — la pública (la usa el cliente para suscribirse).
- `VAPID_PRIVATE_KEY` — la privada (solo servidor, para enviar).
- `VAPID_SUBJECT` — un `mailto:tuemail` o URL.

Con `NEXT_PUBLIC_VAPID_PUBLIC_KEY` presente, la tarjeta de Ajustes ya deja **activar** y guarda la suscripción en `push_subscriptions`.

### 3. Aplicar la migración
Ejecutar `010_push_subscriptions.sql` (o el `all_in_one.sql` actualizado) en Supabase.

### 4. El emisor de recordatorios (lo que envía)
Falta el proceso que, periódicamente, mira eventos/tareas próximos y envía el push. Opciones:

- **Vercel Cron** → una ruta `/api/cron/reminders` (protegida) que:
  1. Busca eventos de hoy / tareas que vencen.
  2. Para cada usuario afectado, lee sus filas de `push_subscriptions`.
  3. Envía con la librería `web-push` usando las claves VAPID.
  4. Borra las suscripciones que devuelvan 404/410 (caducadas).
- **Supabase Edge Function + pg_cron** como alternativa.

Payload esperado por el SW: `{ "title": "...", "body": "...", "url": "/home" }`.

## Notas
- iOS soporta Web Push solo si la PWA está **instalada** en la pantalla de inicio (iOS 16.4+).
- Cada dispositivo/navegador genera su propia suscripción; por eso la tabla es por `endpoint`.
