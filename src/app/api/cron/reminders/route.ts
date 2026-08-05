import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'
import { DIAS_AVISO_CADUCIDAD } from '@/lib/constants'

export const runtime = 'nodejs'

const REMINDER_TIME_ZONE = process.env.NIDO_TIME_ZONE ?? 'Europe/Madrid'

interface ZonedDateParts {
  year: number
  month: number
  day: number
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find(part => part.type === type)?.value)
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: readPart(parts, 'year'),
    month: readPart(parts, 'month'),
    day: readPart(parts, 'day'),
  }
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const asUtc = Date.UTC(
    readPart(parts, 'year'),
    readPart(parts, 'month') - 1,
    readPart(parts, 'day'),
    readPart(parts, 'hour'),
    readPart(parts, 'minute'),
    readPart(parts, 'second'),
  )

  return asUtc - date.getTime()
}

function zonedMidnightToUtc(parts: ZonedDateParts, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0))
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone)
  return new Date(utcGuess.getTime() - offsetMs)
}

function addDays(parts: ZonedDateParts, days: number): ZonedDateParts {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 0, 0, 0))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

function formatDate(parts: ZonedDateParts): string {
  return [
    String(parts.year),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

export async function GET(req: NextRequest) {
  // Esta ruta queda fuera del control de sesión del proxy (el cron de Vercel
  // llama sin cookies), así que el secreto es su única defensa: sin él
  // configurado, no se atiende a nadie. Vercel envía la cabecera por su cuenta
  // cuando existe una variable de entorno llamada CRON_SECRET.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] Falta CRON_SECRET: la tarea no se ejecuta.')
    return NextResponse.json({ error: 'Cron no configurado' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createAdminClient()

  await supabase.from('families').select('id').limit(1)

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ skipped: 'VAPID no configurado', keptAlive: true })
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const { data: subs } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth')
  // Cada salida temprana se distingue de las demás: si todas devolvieran
  // `{ sent: 0 }`, la primera vez que esto se ejecute de verdad no habría forma
  // de saber si es que nadie se ha suscrito o es que no había nada que contar.
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, keptAlive: true, sinSuscripciones: true })
  }

  const userIds = [...new Set(subs.map(s => s.user_id))]

  const { data: members } = await supabase
    .from('family_members')
    .select('user_id, family_id')
    .in('user_id', userIds)

  const familyIds = [...new Set((members ?? []).map(m => m.family_id))]
  if (familyIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, keptAlive: true, sinFamilias: true })
  }

  const todayParts = getZonedDateParts(new Date(), REMINDER_TIME_ZONE)
  const tomorrowParts = addDays(todayParts, 1)
  const today = formatDate(todayParts)
  const startOfDay = zonedMidnightToUtc(todayParts, REMINDER_TIME_ZONE).toISOString()
  const endOfDay = zonedMidnightToUtc(tomorrowParts, REMINDER_TIME_ZONE).toISOString()

  // Lo que caduca se avisa con un mes: es lo que tarda en darse cita y renovar
  // un DNI. Un papel caducado no avisa por su cuenta.
  const limiteCaducidad = formatDate(addDays(todayParts, DIAS_AVISO_CADUCIDAD))

  const [{ data: events }, { data: tasks }, { data: docs }] = await Promise.all([
    // Sin vacaciones, igual que `selectTodayEvents`: no son un plan del día, y
    // avisar de que "tenéis 1 evento" el día que empiezan contradice lo que
    // enseña la pantalla de inicio esa misma mañana.
    supabase.from('events').select('family_id').neq('kind', 'vacaciones').gte('start_at', startOfDay).lt('start_at', endOfDay).in('family_id', familyIds),
    supabase.from('tasks').select('family_id').eq('completed', false).lte('due_date', today).in('family_id', familyIds),
    supabase.from('documents').select('family_id').not('expires_on', 'is', null).lte('expires_on', limiteCaducidad).in('family_id', familyIds),
  ])

  let sent = 0
  let fallidos = 0
  let caducadas = 0

  for (const userId of userIds) {
    const fams = (members ?? []).filter(m => m.user_id === userId).map(m => m.family_id)
    const eventCount = (events ?? []).filter(e => fams.includes(e.family_id)).length
    const taskCount = (tasks ?? []).filter(t => fams.includes(t.family_id)).length
    const docCount = (docs ?? []).filter(d => fams.includes(d.family_id)).length
    if (eventCount === 0 && taskCount === 0 && docCount === 0) continue

    const parts: string[] = []
    if (eventCount > 0) parts.push(`${eventCount} evento${eventCount !== 1 ? 's' : ''}`)
    if (taskCount > 0) parts.push(`${taskCount} tarea${taskCount !== 1 ? 's' : ''} pendiente${taskCount !== 1 ? 's' : ''}`)

    // Lo que caduca va en frase aparte: no es de hoy, es un aviso con margen, y
    // colarlo en "para hoy" haría correr por algo que aún no corre prisa.
    const cuerpo = parts.length > 0 ? `Tenéis ${parts.join(' y ')} para hoy.` : ''
    const caducan = docCount > 0
      ? `${docCount} documento${docCount !== 1 ? 's' : ''} caduca${docCount !== 1 ? 'n' : ''} este mes.`
      : ''

    const payload = JSON.stringify({
      title: 'Hoy en casa',
      body: [cuerpo, caducan].filter(Boolean).join(' '),
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
          // El navegador ya no conoce esa suscripción: se limpia y no es un fallo.
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          caducadas++
        } else {
          // Lo demás sí importa y antes se perdía en silencio. Sin esto, una
          // clave VAPID mal pegada devuelve 200 con `sent: 0`, exactamente igual
          // que un día tranquilo en el que no había nada que contar.
          fallidos++
          console.error('[cron] Envío push fallido:', statusCode ?? 'sin estado', (err as Error).message)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, fallidos, caducadas })
}
