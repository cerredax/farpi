import type { SupabaseClient } from '@supabase/supabase-js'
import { endpointDePushValido } from './push'

/** Solo consulta una suscripción guardada por la persona que pide la prueba. */
export async function enviarPruebaDeAviso(
  supabase: Pick<SupabaseClient, 'from'>,
  usuario: string,
  endpoint: unknown,
  prueba: unknown,
  enviar: (suscripcion: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<unknown>,
): Promise<{ estado: number; error?: string; aceptada?: true }> {
  if (!endpointDePushValido(endpoint) || typeof prueba !== 'string' || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(prueba)) {
    return { estado: 400, error: 'Prueba inválida' }
  }

  const { data, error } = await supabase.from('push_subscriptions')
    .select('endpoint, p256dh, auth').eq('user_id', usuario).eq('endpoint', endpoint).maybeSingle()
  if (error) return { estado: 500, error: 'No se pudo consultar la suscripción' }
  if (!data) return { estado: 404, error: 'Activa los avisos en este dispositivo antes de probarlos' }

  try {
    await enviar({ endpoint: data.endpoint, keys: { p256dh: data.p256dh, auth: data.auth } }, JSON.stringify({
      title: 'Farpi - Prueba de avisos',
      body: 'La prueba ha llegado a este dispositivo.',
      url: '/settings?seccion=cuenta',
      prueba,
    }))
    // La aceptación del proveedor no demuestra que el móvil lo haya recibido.
    return { estado: 200, aceptada: true }
  } catch (error) {
    const codigo = (error as { statusCode?: number })?.statusCode
    if (codigo === 404 || codigo === 410) {
      return { estado: 410, error: 'La suscripción ha caducado. Desactiva y vuelve a activar los avisos en este dispositivo.' }
    }
    return { estado: 502, error: 'El servicio de notificaciones no ha aceptado la prueba. Inténtalo de nuevo.' }
  }
}
