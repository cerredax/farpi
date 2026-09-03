import { IS_DEMO_MODE } from './supabase/env'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

/**
 * Los servidores de push que existen. Todo lo demás no se guarda.
 *
 * Una suscripción es una **URL que el servidor de Farpi visita**: el cron le hace
 * un POST a cada una, todos los días. Sin esta lista, cualquiera de la familia
 * podía dejar apuntada una dirección cualquiera y convertir el cron en un
 * mensajero: pedirle que llame a un servicio interno, a una IP de la red privada
 * de Vercel o a un sitio de fuera que solo quiere saber que alguien llamó. No es
 * un agujero grande —hace falta sesión, y el cuerpo va cifrado con las claves del
 * navegador— pero el cron no tiene por qué visitar más que estos cuatro sitios.
 *
 * El endpoint lo da el navegador, no la persona, así que la lista es la de los
 * cuatro que reparten push en la web:
 *
 *   Chrome, Edge y los Chromium   fcm.googleapis.com
 *   Firefox                       updates.push.services.mozilla.com
 *   Safari, iOS incluido          web.push.apple.com
 *   Edge antiguo (WNS)            wns2-….notify.windows.com
 *
 * Si un día aparece un navegador con su propio servidor, el síntoma será que a
 * esa persona no le llegan los avisos y en el log queda su host: se añade aquí.
 * Es el precio de la lista blanca, y es el mismo criterio que `PUBLIC_ROUTES` o
 * que el `connect-src` de la CSP —se nombra lo que vale, no lo que no—.
 */
const HOSTS_DE_PUSH = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]

/** WNS reparte por región, así que el host lleva delante el centro de datos. */
const SUFIJO_WNS = '.notify.windows.com'

/** Ninguna URL de push real se acerca; el tope está para que no entre una barbaridad. */
const MAX_LARGO_ENDPOINT = 1000

/**
 * ¿Es esto la dirección de un servidor de push de verdad?
 *
 * Pura y aquí —y no dentro de la ruta API— porque es una regla que hay que poder
 * probar sin levantar nada, y porque el día que se añada un host se toca un solo
 * sitio.
 */
export function endpointDePushValido(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > MAX_LARGO_ENDPOINT) return false

  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }

  // `https:` y nada más. Un `http:` no lo emite ningún navegador, y los esquemas
  // raros —`file:`, `data:`— son justo lo que se está cerrando.
  if (url.protocol !== 'https:') return false

  return (
    HOSTS_DE_PUSH.includes(url.hostname) ||
    // Con el punto delante, para que `malonotify.windows.com` no cuele.
    url.hostname.endsWith(SUFIJO_WNS)
  )
}

/**
 * Las dos claves con las que se cifra el aviso, tal y como las escribe el
 * navegador: base64url, la pública de 65 bytes y el secreto de 16.
 *
 * No se comprueba el largo exacto que tendrían al descodificar, sino un margen:
 * lo que importa aquí es que sea base64url y de un tamaño sensato, porque una
 * clave con la forma correcta y el contenido equivocado la rechaza igual
 * `web-push` al cifrar. Lo que esto evita es guardar una fila que no puede
 * funcionar y que el cron contará como fallo todos los días sin que nadie sepa
 * por qué.
 */
export function clavesDePushValidas(
  keys: { p256dh?: string; auth?: string } | undefined,
): keys is { p256dh: string; auth: string } {
  if (!keys) return false
  const { p256dh, auth } = keys
  const base64url = /^[A-Za-z0-9_-]+=*$/
  return (
    typeof p256dh === 'string' && p256dh.length >= 80 && p256dh.length <= 120 && base64url.test(p256dh) &&
    typeof auth === 'string' && auth.length >= 16 && auth.length <= 32 && base64url.test(auth)
  )
}

/** El navegador soporta Service Worker + Push + Notification. */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Hay backend real y clave VAPID: las notificaciones pueden activarse. */
export function pushConfigured(): boolean {
  return !IS_DEMO_MODE && VAPID_PUBLIC_KEY.length > 0
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

/**
 * Un iPhone que todavía no tiene Farpi en la pantalla de inicio.
 *
 * iOS solo da push a las apps instaladas (16.4+), así que en una pestaña normal
 * de Safari `PushManager` no existe y `pushSupported()` dice que no. Sin
 * distinguir este caso, la tarjeta de Ajustes le suelta a media familia que su
 * navegador no admite notificaciones, cuando lo que hace falta es instalarla.
 */
export function iosSinInstalar(): boolean {
  if (typeof window === 'undefined') return false

  const esIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS se hace pasar por escritorio; lo delata que tenga táctil.
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

  const instalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  return esIOS && !instalada
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** Cuánto se espera a que el service worker quede activo antes de rendirse. */
const ESPERA_SW_MS = 10_000

/**
 * El service worker, listo y con límite de paciencia.
 *
 * `navigator.serviceWorker.ready` tiene una trampa: si no hay ningún worker
 * activado en el scope, la promesa se queda **pendiente para siempre**. No
 * rechaza, así que no hay `catch` que valga y el botón de Ajustes se quedaba en
 * "Guardando…" hasta recargar, sin decir qué pasaba. Aquí se corrige por los dos
 * lados: se asegura el registro —`register()` es idempotente, si ya existe
 * devuelve el mismo y no reinstala nada— y la espera lleva reloj.
 */
async function registroListo(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js')

  let reloj: ReturnType<typeof setTimeout>
  const seAcabaElTiempo = new Promise<never>((_, reject) => {
    reloj = setTimeout(
      () => reject(new Error('No se pudo preparar el aviso en este dispositivo. Recarga la página y vuelve a intentarlo.')),
      ESPERA_SW_MS,
    )
  })

  try {
    return await Promise.race([navigator.serviceWorker.ready, seAcabaElTiempo])
  } finally {
    clearTimeout(reloj!)
  }
}

/** Pide permiso, se suscribe a push y guarda la suscripción en el backend. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Tu navegador no admite notificaciones.')
  if (!pushConfigured()) throw new Error('Las notificaciones aún no están configuradas.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado.')

  const registration = await registroListo()
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }))

  const json = subscription.toJSON()
  const res = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  })
  if (!res.ok) throw new Error('No se pudo guardar la suscripción.')
}

/** Cancela la suscripción local y la borra del backend. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  // Mismo motivo que al activar: desactivar también se colgaba sin decir nada.
  const registration = await registroListo()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await fetch('/api/push', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {})
  await subscription.unsubscribe()
}
