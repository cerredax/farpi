import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient, FALTA_SERVICE_ROLE, respuestaSinServiceRole } from '@/lib/supabase/admin'
import { DIAS_AVISO_CADUCIDAD } from '@/lib/constants'
import { fraseDeCumples, proximosCumples } from '@/lib/birthdays'
import { RANGE_KINDS } from '@/lib/events'

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

/**
 * Una consulta que falla no puede acabar en un 200. El envío push ya contaba sus
 * fallos, pero las consultas de arriba seguían perdiéndose en silencio: si la de
 * suscripciones petaba, la respuesta era exactamente la misma que un día en que
 * nadie se ha suscrito, y el cron salía en verde en el panel de Vercel mientras
 * las notificaciones llevaban semanas sin llegar. El contexto viaja en el cuerpo
 * porque a esta ruta solo llega quien trae el `CRON_SECRET`.
 */
function fallo(contexto: string, mensaje: string) {
  console.error(`[cron] ${contexto}:`, mensaje)
  return NextResponse.json({ error: 'No se pudieron preparar los recordatorios', contexto }, { status: 500 })
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

  if (FALTA_SERVICE_ROLE) return respuestaSinServiceRole('cron')

  const supabase = createAdminClient()

  // El keep-alive es lo único que puede fallar sin abortar: su trabajo es que
  // Supabase no duerma el proyecto, y si no lo consigue el resto ya se quejará.
  // Pero entonces `keptAlive` tiene que decir la verdad.
  const { error: keepAliveError } = await supabase.from('families').select('id').limit(1)
  if (keepAliveError) console.error('[cron] Keep-alive:', keepAliveError.message)
  const keptAlive = !keepAliveError

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publicKey || !privateKey || !subject) {
    return NextResponse.json({ skipped: 'VAPID no configurado', keptAlive })
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)

  const { data: subs, error: subsError } = await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth')
  if (subsError) return fallo('consulta de suscripciones', subsError.message)
  // Cada salida temprana se distingue de las demás: si todas devolvieran
  // `{ sent: 0 }`, la primera vez que esto se ejecute de verdad no habría forma
  // de saber si es que nadie se ha suscrito o es que no había nada que contar.
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, keptAlive, sinSuscripciones: true })
  }

  const userIds = [...new Set(subs.map(s => s.user_id))]

  const { data: members, error: membersError } = await supabase
    .from('family_members')
    .select('user_id, family_id')
    .in('user_id', userIds)
  if (membersError) return fallo('consulta de miembros', membersError.message)

  const familyIds = [...new Set((members ?? []).map(m => m.family_id))]
  if (familyIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, keptAlive, sinFamilias: true })
  }

  const todayParts = getZonedDateParts(new Date(), REMINDER_TIME_ZONE)
  const tomorrowParts = addDays(todayParts, 1)
  const today = formatDate(todayParts)
  const startOfDay = zonedMidnightToUtc(todayParts, REMINDER_TIME_ZONE).toISOString()
  const endOfDay = zonedMidnightToUtc(tomorrowParts, REMINDER_TIME_ZONE).toISOString()

  // Lo que caduca se avisa con un mes: es lo que tarda en darse cita y renovar
  // un DNI. Un papel caducado no avisa por su cuenta.
  const limiteCaducidad = formatDate(addDays(todayParts, DIAS_AVISO_CADUCIDAD))

  const [eventsRes, tasksRes, docsRes, kidsRes] = await Promise.all([
    // Solo planes, igual que `selectTodayEvents`: ni vacaciones, ni descansos, ni
    // festivos. Avisar de que "tenéis 1 evento" el día que empiezan contradice lo
    // que enseña la pantalla de inicio esa misma mañana, y un festivo no es un
    // plan que haya que recordarle a nadie a las siete. El filtro se arma con la
    // misma lista que usa `isPlan`, para que no puedan separarse otra vez.
    supabase.from('events').select('family_id').not('kind', 'in', `(${RANGE_KINDS.join(',')})`).gte('start_at', startOfDay).lt('start_at', endOfDay).in('family_id', familyIds),
    supabase.from('tasks').select('family_id').eq('completed', false).lte('due_date', today).in('family_id', familyIds),
    // `expires_on` viene con los datos porque un papel vencido y uno que vence
    // la semana que viene no se cuentan en la misma frase.
    supabase.from('documents').select('family_id, expires_on').not('expires_on', 'is', null).lte('expires_on', limiteCaducidad).in('family_id', familyIds),
    // Los cumpleaños no son eventos: se deducen de la fecha de nacimiento de las
    // personas de la casa, así que no se pueden filtrar por fecha aquí. Se traen
    // las que tienen fecha —nunca son muchas— y el día se resuelve abajo, con la
    // misma función que usa Inicio.
    supabase.from('children').select('family_id, name, birth_date').not('birth_date', 'is', null).in('family_id', familyIds),
  ])

  // Con una sola de las tres rota, los recuentos salen incompletos: mejor no
  // mandar nada que avisar de una tarea cuando había tres eventos más.
  const errorDelDia = eventsRes.error ?? tasksRes.error ?? docsRes.error ?? kidsRes.error
  if (errorDelDia) return fallo('consulta de eventos, tareas, documentos o personas', errorDelDia.message)
  const { data: events } = eventsRes
  const { data: tasks } = tasksRes
  const { data: docs } = docsRes
  const { data: kids } = kidsRes

  let sent = 0
  let fallidos = 0
  let caducadas = 0

  for (const userId of userIds) {
    const fams = (members ?? []).filter(m => m.user_id === userId).map(m => m.family_id)
    const eventCount = (events ?? []).filter(e => fams.includes(e.family_id)).length
    const taskCount = (tasks ?? []).filter(t => fams.includes(t.family_id)).length
    const docsUsuario = (docs ?? []).filter(d => fams.includes(d.family_id))
    const vencidos = docsUsuario.filter(d => d.expires_on !== null && d.expires_on < today).length
    const porVencer = docsUsuario.length - vencidos
    // Con ventana de cero días: hoy o nada. Felicitar con antelación no es un
    // recordatorio, es adelantar el cumpleaños.
    const cumplesHoy = proximosCumples((kids ?? []).filter(k => fams.includes(k.family_id)), today, 0)
    if (eventCount === 0 && taskCount === 0 && docsUsuario.length === 0 && cumplesHoy.length === 0) continue

    const parts: string[] = []
    if (eventCount > 0) parts.push(`${eventCount} evento${eventCount !== 1 ? 's' : ''}`)
    if (taskCount > 0) parts.push(`${taskCount} tarea${taskCount !== 1 ? 's' : ''} pendiente${taskCount !== 1 ? 's' : ''}`)

    // Lo que caduca va en frase aparte: no es de hoy, es un aviso con margen, y
    // colarlo en "para hoy" haría correr por algo que aún no corre prisa.
    const cuerpo = parts.length > 0 ? `Tenéis ${parts.join(' y ')} para hoy.` : ''

    // Lo ya vencido se sigue avisando cada día a propósito —un papel caducado no
    // avisa por su cuenta, igual que en la tarjeta del documento—, pero no puede
    // decir que "caduca este mes" algo que venció en marzo. Son dos frases.
    const avisos: string[] = []
    if (vencidos > 0) {
      avisos.push(vencidos === 1 ? '1 documento está caducado.' : `${vencidos} documentos están caducados.`)
    }
    if (porVencer > 0) {
      avisos.push(porVencer === 1 ? '1 documento caduca este mes.' : `${porVencer} documentos caducan este mes.`)
    }
    const caducan = avisos.join(' ')

    // El cumpleaños abre el aviso. Es lo único de los tres que **caduca el mismo
    // día** —una tarea se hace por la tarde, un papel caduca dentro de un mes—, y
    // leído detrás de "tenéis 2 tareas pendientes" se queda en la segunda línea
    // que ya nadie mira.
    const felicitacion = fraseDeCumples(cumplesHoy)

    const payload = JSON.stringify({
      title: 'Hoy en casa',
      body: [felicitacion, cuerpo, caducan].filter(Boolean).join(' '),
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
