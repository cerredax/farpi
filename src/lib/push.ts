import { IS_DEMO_MODE } from './supabase/env'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

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
 * Un iPhone que todavía no tiene Nido en la pantalla de inicio.
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
