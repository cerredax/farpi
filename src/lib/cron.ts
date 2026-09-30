import { timingSafeEqual } from 'node:crypto'
import webpush from 'web-push'
import type { createAdminClient } from '@/lib/supabase/admin'

/**
 * Lo que comparten los crons: comprobar el secreto y mandar una notificación.
 *
 * Vive aquí y no dentro de una ruta porque una ruta de Next solo puede exportar
 * sus manejadores, y son ya dos las que lo necesitan —el resumen de las siete y el
 * aviso de cada evento—. Solo se importa desde rutas de servidor.
 */

// Nunca se ha definido en ninguna parte —ni en `.env.local` ni en Vercel—, así que el
// cron siempre ha calculado "hoy" con el valor de aquí. Está para poder cambiarla sin
// tocar código el día que haga falta, no porque haga falta hoy.
//
// Se llamó `NIDO_TIME_ZONE` hasta el 31-08-2026. No se lee la vieja: comprobado que no
// existe en ningún entorno, y un respaldo que no respalda nada es una línea que el
// próximo que pase tiene que entender para nada.
export const ZONA_DE_LA_FAMILIA = process.env.FARPI_TIME_ZONE ?? 'Europe/Madrid'

/**
 * El secreto del cron, comparado en tiempo constante.
 *
 * Con `!==` el tiempo que tarda en decir no depende de cuántos caracteres ha
 * acertado quien prueba, y eso deja adivinarlo carácter a carácter midiendo. Por
 * red y con una función serverless de por medio el ruido se come esa señal, así que
 * esto no arregla un agujero abierto: es que comparar secretos así no cuesta nada y
 * la alternativa hay que justificarla.
 *
 * `timingSafeEqual` exige el mismo tamaño o lanza, así que la longitud se comprueba
 * antes — y esa sí se filtra, que es la parte que no tiene arreglo y no importa.
 */
export function secretoCorrecto(cabecera: string | null, secret: string): boolean {
  if (!cabecera) return false
  const esperado = Buffer.from(`Bearer ${secret}`)
  const recibido = Buffer.from(cabecera)
  if (esperado.length !== recibido.length) return false
  return timingSafeEqual(esperado, recibido)
}

export interface SuscripcionPush {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Manda una notificación a una suscripción y dice cómo acabó.
 *
 * Una suscripción que el navegador ya no conoce (404 o 410) se borra y no cuenta
 * como fallo: es lo normal cuando alguien desinstala la app. Lo demás sí importa y
 * se registra, porque antes se perdía en silencio: una clave VAPID mal pegada
 * devolvía 200 con `sent: 0`, exactamente igual que un día tranquilo.
 */
export async function enviarNotificacion(
  supabase: ReturnType<typeof createAdminClient>,
  sub: SuscripcionPush,
  payload: string,
): Promise<'enviada' | 'caducada' | 'fallida'> {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
    return 'enviada'
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      return 'caducada'
    }
    console.error('[cron] Envío push fallido:', statusCode ?? 'sin estado', (err as Error).message)
    return 'fallida'
  }
}
