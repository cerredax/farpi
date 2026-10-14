import { NextRequest, NextResponse } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { clavesDePushValidas, endpointDePushValido } from '@/lib/push'
import { COLUMNA_DE_PREFERENCIA, preferenciasValidas, type PreferenciasDeAvisos } from '@/lib/reminders'

/**
 * ¿Qué direcciones tiene guardadas este usuario?
 *
 * Existe porque la tarjeta de Ajustes decidía si los avisos estaban activados
 * mirando **solo al navegador** (`pushManager.getSubscription()`), y eso miente
 * en los dos sentidos: el cron borra la suscripción en cuanto el servidor de push
 * la da por muerta, y un alta puede no haberse llegado a guardar. El resultado era
 * un móvil que decía «Desactivar notificaciones» sin tener fila en la base — y por
 * tanto sin recibir un aviso jamás, sin nada que lo delatara. Pasó de verdad: entre
 * el 11 y el 15-09-2026 la única suscripción de la casa era la de otro navegador.
 *
 * Devuelve los endpoints del propio usuario y es quien llama quien compara con el
 * suyo: así no hay que meter una dirección de push en una query string, que acaba
 * escrita en los registros de la plataforma.
 */
export async function GET(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  // El `eq` sobra con la RLS delante y se queda igual: esta tabla guarda las
  // direcciones que el cron visita cada día, y aquí no se cuelan las de nadie más.
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, notify_daily, notify_events, notify_birthdays')
    .eq('user_id', user.id)
  if (error) {
    console.error('[push] consulta de suscripciones:', error.message)
    return NextResponse.json({ error: 'No se pudo consultar la suscripción' }, { status: 500 })
  }

  // Las preferencias van por endpoint, igual que las suscripciones: cada
  // dispositivo tiene las suyas, y es quien llama quien busca la de este.
  const preferencias: Record<string, PreferenciasDeAvisos> = {}
  for (const fila of data ?? []) {
    preferencias[fila.endpoint] = { resumen: fila.notify_daily, eventos: fila.notify_events, cumples: fila.notify_birthdays }
  }
  return NextResponse.json({ endpoints: (data ?? []).map(fila => fila.endpoint), preferencias })
}

/**
 * Qué avisos quiere este dispositivo. Solo toca las columnas de preferencias y
 * solo la fila del propio usuario (`user_id` en el `update`, con la RLS detrás):
 * ni se crea una suscripción desde aquí ni se puede tocar la de otra persona.
 */
export async function PATCH(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  const { endpoint, preferencias } = await req.json().catch(() => ({})) as { endpoint?: string; preferencias?: unknown }
  const cambios = preferenciasValidas(preferencias)
  if (typeof endpoint !== 'string' || !endpoint || !cambios) {
    return NextResponse.json({ error: 'Preferencias inválidas' }, { status: 400 })
  }

  const fila: Record<string, boolean> = {}
  for (const [clave, valor] of Object.entries(cambios)) {
    fila[COLUMNA_DE_PREFERENCIA[clave as keyof PreferenciasDeAvisos]] = valor
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .update(fila)
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)
    .select('id')
  if (error) {
    console.error('[push] preferencias de avisos:', error.message)
    return NextResponse.json({ error: 'No se pudieron guardar las preferencias' }, { status: 500 })
  }
  // Sin fila no hay nada guardado: este dispositivo no está dado de alta en el
  // servidor, y decir «hecho» dejaría el interruptor mintiendo.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Este dispositivo no tiene los avisos activados' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * Lo que se guarda aquí **no es un dato, es una dirección que el servidor
 * visita**: el cron le hace un POST a cada suscripción todos los días. Por eso se
 * comprueba que sea uno de los cuatro servidores de push que existen y no
 * cualquier URL — el detalle, en `endpointDePushValido`.
 */
export async function POST(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  const body = await req.json().catch(() => ({})) as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  const { endpoint, keys } = body
  if (!endpointDePushValido(endpoint) || !clavesDePushValidas(keys)) {
    // El motivo va al log y no a la respuesta, como el resto de los fallos de esta
    // ruta: a quien usa la app no le dice nada, y a quien prueba a ver qué acepta,
    // demasiado. Aquí importa además el host: si un navegador nuevo trae su propio
    // servidor de push, este log es lo único que lo va a contar.
    console.error('[push] suscripción rechazada:', typeof endpoint === 'string' ? endpoint.slice(0, 120) : typeof endpoint)
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' },
    )
  if (error) {
    // El motivo va al log del servidor y no a la respuesta: el mensaje de
    // Postgres no le dice nada a quien usa la app y sí a quien sondea.
    console.error('[push] alta de suscripción:', error.message)
    return NextResponse.json({ error: 'No se pudo guardar la suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * Darse de baja **no comprueba el host**, y no es un olvido: aquí solo se borra, y
 * el `delete` va atado a `user_id`, así que lo peor que puede pasar es que alguien
 * borre una fila suya. Validar además tendría un efecto malo: una suscripción
 * guardada antes de que existiera la lista blanca —o de un host que se retire de
 * ella— se quedaría sin forma de quitarse.
 */
export async function DELETE(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  const { endpoint } = await req.json().catch(() => ({})) as { endpoint?: string }
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', user.id)
  if (error) {
    // El motivo va al log del servidor y no a la respuesta: el mensaje de
    // Postgres no le dice nada a quien usa la app y sí a quien sondea.
    console.error('[push] baja de suscripción:', error.message)
    return NextResponse.json({ error: 'No se pudo borrar la suscripción' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
