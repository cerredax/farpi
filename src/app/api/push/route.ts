import { NextRequest, NextResponse } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'

export async function POST(req: NextRequest) {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  const body = await req.json().catch(() => ({})) as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  const { endpoint, keys } = body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
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
