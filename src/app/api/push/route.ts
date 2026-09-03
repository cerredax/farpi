import { NextRequest, NextResponse } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { clavesDePushValidas, endpointDePushValido } from '@/lib/push'

/**
 * Lo que se guarda aquí **no es un dato, es una dirección que el servidor
 * visita**: el cron le hace un POST a cada suscripción todos los días. Por eso se
 * comprueba que sea uno de los cuatro servidores de push que existen y no
 * cualquier URL — el detalle, en `endpointDePushValido`.
 */
export async function POST(req: NextRequest) {
  const guardia = await requiereSesion()
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
  const guardia = await requiereSesion()
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
