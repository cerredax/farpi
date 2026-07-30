import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocalDateString } from '@/lib/date-utils'

export const runtime = 'nodejs'

// Cron diario (ver vercel.json). Envía a cada usuario suscrito un resumen de
// lo que tiene hoy: eventos del día y tareas pendientes que vencen (o vencidas).
// La propia consulta mantiene el proyecto Supabase despierto (evita la pausa).

export async function GET(req: NextRequest) {
  // Vercel Cron añade este header si defines la env var CRON_SECRET.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Keep-alive: una lectura ligera evita que el proyecto Supabase se pause
  // por inactividad (plan free), aunque las notificaciones no estén activas.
  await supabase.from('families').select('id').limit(1)

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ skipped: 'VAPID no configurado', keptAlive: true })
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const { data: subs } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth')
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const userIds = [...new Set(subs.map(s => s.user_id))]

  const { data: members } = await supabase
    .from('family_members')
    .select('user_id, family_id')
    .in('user_id', userIds)

  const familyIds = [...new Set((members ?? []).map(m => m.family_id))]
  if (familyIds.length === 0) return NextResponse.json({ sent: 0 })

  const today = getLocalDateString()
  const startOfDay = `${today}T00:00:00.000Z`
  const endOfDay = `${today}T23:59:59.999Z`

  const [{ data: events }, { data: tasks }] = await Promise.all([
    supabase.from('events').select('family_id').gte('start_at', startOfDay).lte('start_at', endOfDay).in('family_id', familyIds),
    supabase.from('tasks').select('family_id').eq('completed', false).lte('due_date', today).in('family_id', familyIds),
  ])

  let sent = 0

  for (const userId of userIds) {
    const fams = (members ?? []).filter(m => m.user_id === userId).map(m => m.family_id)
    const eventCount = (events ?? []).filter(e => fams.includes(e.family_id)).length
    const taskCount = (tasks ?? []).filter(t => fams.includes(t.family_id)).length
    if (eventCount === 0 && taskCount === 0) continue

    const parts: string[] = []
    if (eventCount > 0) parts.push(`${eventCount} evento${eventCount !== 1 ? 's' : ''}`)
    if (taskCount > 0) parts.push(`${taskCount} tarea${taskCount !== 1 ? 's' : ''} pendiente${taskCount !== 1 ? 's' : ''}`)

    const payload = JSON.stringify({
      title: 'Hoy en casa',
      body: `Tenéis ${parts.join(' y ')} para hoy.`,
      url: '/home',
    })

    for (const sub of subs.filter(s => s.user_id === userId)) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
