import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createAdminClient, FALTA_SERVICE_ROLE, respuestaSinServiceRole } from '@/lib/supabase/admin'
import { enviarNotificacion, secretoCorrecto, ZONA_DE_LA_FAMILIA } from '@/lib/cron'
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

  // **Reclamar antes de enviar.** La clave primaria de la tabla decide quién gana:
  // si dos ejecuciones se solapan, o el cron llega dos veces, solo a una de ellas le
  // devuelve la fila. Un `select` para mirar si ya se avisó y un `insert` después
  // dejaría una ventana en la que las dos ven «no avisado».
  const { data: reclamados, error: reclamarError } = await supabase
    .from('event_reminders_sent')
    .upsert(
      pendientes.map(p => ({ event_id: p.evento.id, fire_at: p.fireAt })),
      { onConflict: 'event_id,fire_at', ignoreDuplicates: true },
    )
    .select('event_id, fire_at')
  if (reclamarError) return fallo('reclamar los avisos', reclamarError.message)

  const mios = new Set((reclamados ?? []).map(r => `${r.event_id}|${new Date(r.fire_at).toISOString()}`))
  const porMandar = pendientes.filter(p => mios.has(`${p.evento.id}|${p.fireAt}`))
  if (porMandar.length === 0) return NextResponse.json({ ok: true, sent: 0, yaAvisados: pendientes.length })

  // A toda la casa que tenga los avisos activados: los miembros de la familia del
  // evento que tengan alguna suscripción.
  const familias = [...new Set(porMandar.map(p => p.evento.family_id))]
  const { data: miembros, error: miembrosError } = await supabase
    .from('family_members')
    .select('user_id, family_id')
    .in('family_id', familias)
  if (miembrosError) return fallo('consulta de miembros', miembrosError.message)

  const usuarios = [...new Set((miembros ?? []).map(m => m.user_id))]
  const { data: suscripciones, error: suscripcionesError } = usuarios.length === 0
    ? { data: [], error: null }
    : await supabase.from('push_subscriptions').select('user_id, endpoint, p256dh, auth').in('user_id', usuarios)
  if (suscripcionesError) return fallo('consulta de suscripciones', suscripcionesError.message)

  let sent = 0
  let fallidos = 0
  let caducadas = 0

  for (const { evento, fireAt } of porMandar) {
    const { title, body } = avisoDeEvento(evento, ZONA_DE_LA_FAMILIA)
    const payload = JSON.stringify({ title, body, url: '/calendar' })
    const deLaCasa = new Set((miembros ?? []).filter(m => m.family_id === evento.family_id).map(m => m.user_id))

    let enviadasDeEste = 0
    let fallidasDeEste = 0
    for (const sub of (suscripciones ?? []).filter(s => deLaCasa.has(s.user_id))) {
      const resultado = await enviarNotificacion(supabase, sub, payload)
      if (resultado === 'enviada') enviadasDeEste++
      else if (resultado === 'caducada') caducadas++
      else fallidasDeEste++
    }
    sent += enviadasDeEste
    fallidos += fallidasDeEste

    // Si no llegó a nadie **y hubo fallos**, se suelta el aviso reclamado: la
    // siguiente vuelta, cinco minutos después y aún dentro del margen, lo reintenta.
    // Si no había a quién mandárselo (nadie tiene los avisos activados) se queda
    // reclamado: no hay nada que reintentar.
    if (enviadasDeEste === 0 && fallidasDeEste > 0) {
      await supabase.from('event_reminders_sent').delete().eq('event_id', evento.id).eq('fire_at', fireAt)
    }
  }

  return NextResponse.json({ ok: true, sent, fallidos, caducadas, avisos: porMandar.length })
}
