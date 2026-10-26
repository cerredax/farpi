import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient, FALTA_SERVICE_ROLE, respuestaSinServiceRole } from '@/lib/supabase/admin'
import { enviarNotificacion, secretoCorrecto, ZONA_DE_LA_FAMILIA } from '@/lib/cron'
import { enviarAvisosPendientes } from '@/lib/envio-avisos'
import { ANTELACIONES_DE_AVISO } from '@/lib/constants'
import { avisoDeEvento, avisosDeEventoPendientes } from '@/lib/reminders'

export const runtime = 'nodejs'

/**
 * El aviso de cada evento («30 minutos antes»).
 *
 * **Lo llama Supabase, no Vercel**, cada cinco minutos (`pg_cron` + `pg_net`; el
 * SQL está en `docs/notificaciones.md`). Vercel Hobby solo admite un cron al día,
 * y por eso esta ruta no está en `vercel.json`. Como el resumen de las siete, cae
 * fuera del control de sesión del proxy por el prefijo `/api/cron/`, y su única
 * defensa es el `CRON_SECRET`.
 *
 * Lo que decide **cuándo** avisar está en `lib/reminders.ts`, con sus tests: aquí
 * solo se consulta, se reclama y se envía.
 */

/** Una consulta que falla no puede acabar en un 200: sería idéntico a un rato sin nada que avisar. */
function fallo(contexto: string, mensaje: string) {
  console.error(`[cron/eventos] ${contexto}:`, mensaje)
  return NextResponse.json({ error: 'No se pudieron preparar los avisos', contexto }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/eventos] Falta CRON_SECRET: la tarea no se ejecuta.')
    return NextResponse.json({ error: 'Cron no configurado' }, { status: 503 })
  }
  if (!secretoCorrecto(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (FALTA_SERVICE_ROLE) return respuestaSinServiceRole('cron/eventos')

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) return NextResponse.json({ skipped: 'VAPID no configurado' })
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const supabase = createAdminClient()
  const ahora = new Date()

  // Lo que puede tocar avisar ahora tiene que empezar dentro de la mayor de las
  // antelaciones: un evento que empieza dentro de tres días no puede tener su aviso
  // hoy. Con esto la consulta no crece con la agenda entera.
  const mayorAntelacion = Math.max(...ANTELACIONES_DE_AVISO.map(a => a.minutos))
  const horizonte = new Date(ahora.getTime() + mayorAntelacion * 60_000)

  const { data: candidatos, error: candidatosError } = await supabase
    .from('events')
    .select('id, family_id, title, start_at, remind_before_minutes')
    .not('remind_before_minutes', 'is', null)
    .gt('start_at', ahora.toISOString())
    .lte('start_at', horizonte.toISOString())
  if (candidatosError) return fallo('consulta de eventos', candidatosError.message)

  const pendientes = avisosDeEventoPendientes(
    (candidatos ?? []).map(e => ({ ...e, remind_before_minutes: e.remind_before_minutes as number })),
    ahora,
  )
  if (pendientes.length === 0) return NextResponse.json({ ok: true, sent: 0, sinAvisos: true })

  try {
    const resultado = await enviarAvisosPendientes(pendientes, {
      miembros: async familias => {
        const { data, error } = await supabase.from('family_members')
          .select('user_id, family_id').in('family_id', familias)
        if (error) throw new Error(error.message)
        return data ?? []
      },
      suscripciones: async usuarios => {
        const { data, error } = await supabase.from('push_subscriptions')
          .select('user_id, endpoint, p256dh, auth, notify_events').in('user_id', usuarios)
        if (error) throw new Error(error.message)
        return data ?? []
      },
      reclamar: async avisos => {
        const { data, error } = await supabase.from('event_reminders_sent')
          .upsert(avisos.map(p => ({ event_id: p.evento.id, fire_at: p.fireAt })),
            { onConflict: 'event_id,fire_at', ignoreDuplicates: true })
          .select('event_id, fire_at')
        if (error) throw new Error(error.message)
        return data ?? []
      },
      liberar: async ({ evento, fireAt }) => {
        const { error } = await supabase.from('event_reminders_sent').delete()
          .eq('event_id', evento.id).eq('fire_at', fireAt)
        if (error) throw new Error(error.message)
      },
    }, async (sub, evento) => {
      const { title, body } = avisoDeEvento(evento, ZONA_DE_LA_FAMILIA)
      return enviarNotificacion(supabase, sub, JSON.stringify({ title, body, url: '/calendar', tipo: 'evento' }))
    })
    return NextResponse.json({ ok: true, ...resultado })
  } catch (error) {
    return fallo('preparar y enviar los avisos', error instanceof Error ? error.message : String(error))
  }
}
