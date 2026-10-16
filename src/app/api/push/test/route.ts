import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { requiereSesion } from '@/lib/supabase/guard'
import { enviarPruebaDeAviso } from '@/lib/prueba-avisos'

export const runtime = 'nodejs'

/** Prueba solicitada desde Ajustes: un solo dispositivo de la propia cuenta. */
export async function POST(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: 'Las notificaciones aún no están configuradas' }, { status: 503 })
  }

  const { endpoint, prueba } = await req.json().catch(() => ({})) ?? {}
  const resultado = await enviarPruebaDeAviso(supabase, user.id, endpoint, prueba, (suscripcion, payload) =>
    webpush.sendNotification(suscripcion, payload, {
      vapidDetails: { subject, publicKey, privateKey },
      TTL: 60,
      urgency: 'high',
      timeout: 10_000,
    }),
  )
  const { estado, ...respuesta } = resultado
  return NextResponse.json(respuesta, { status: estado })
}
