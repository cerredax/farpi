import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, FALTA_SERVICE_ROLE, respuestaSinServiceRole } from '@/lib/supabase/admin'
import { requiereSesion } from '@/lib/supabase/guard'

export async function POST(req: NextRequest) {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  const body = await req.json() as { familyId?: string; email?: string }
  const { familyId, email } = body

  if (!familyId || !email) {
    return NextResponse.json({ error: 'Faltan parámetros: familyId y email son obligatorios' }, { status: 400 })
  }

  // Verificar que el llamante es admin de esa familia (RLS garantiza que solo ve sus propias filas)
  const { data: member } = await supabase
    .from('family_members')
    .select('role')
    .eq('family_id', familyId)
    .eq('user_id', user.id)
    .single()

  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Solo los administradores pueden invitar miembros' }, { status: 403 })
  }

  // Insertar la invitación en la BD
  const { data: invite, error: inviteError } = await supabase
    .from('family_invites')
    .insert({ family_id: familyId, email: email.toLowerCase().trim(), invited_by: user.id })
    .select('id')
    .single()

  if (inviteError) {
    const isDuplicate = inviteError.code === '23505'
    if (!isDuplicate) console.error('[invite] alta de invitación:', inviteError.message)
    return NextResponse.json(
      // El duplicado sí se cuenta —es útil y no revela nada—; el resto va al log.
      { error: isDuplicate ? 'Ya existe una invitación pendiente para ese email' : 'No se pudo crear la invitación' },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  // Enviar el magic link vía Supabase Auth admin (requiere service role key)
  /**
   * El dominio al que apunta el magic link. **No se adivina en producción.**
   *
   * Caía a `req.nextUrl.origin`, que sale de la cabecera `Host`: si `SITE_URL`
   * falta —un entorno nuevo, un preview— un `Host` falsificado haría que el enlace
   * de la invitación llevara a otro dominio, y ese enlace **inicia sesión**. Ahora
   * solo se admite el fallback en local, que es donde hace falta para poder probar;
   * en cualquier otro sitio se corta.
   *
   * Se llamó `NEXT_PUBLIC_SITE_URL` hasta el 01-09-2026. El prefijo no hacía falta
   * —solo se lee aquí, en servidor— y Vercel ya obliga a clasificar como públicas
   * las variables que lo llevan. Se sigue leyendo la vieja como respaldo para no
   * dejar sin invitaciones el rato que pasa entre desplegar y cambiar la variable.
   */
  const configurado = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL)?.replace(/\/$/, '')
  const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.nextUrl.origin)
  if (!configurado && !esLocal) {
    console.error('[invite] Falta SITE_URL: no se envía la invitación.')
    return NextResponse.json(
      { error: 'La invitación no se puede enviar: falta configurar el dominio de la app.' },
      { status: 500 },
    )
  }
  const origin = configurado ?? req.nextUrl.origin
  const redirectTo = `${origin}/auth/callback?invite_id=${invite.id}`

  if (FALTA_SERVICE_ROLE) return respuestaSinServiceRole('invite')

  const admin = createAdminClient()
  const { error: magicError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  if (magicError) {
    // Rollback: eliminar la invitación para que no quede huérfana
    await supabase.from('family_invites').delete().eq('id', invite.id)
    console.error('[invite] Error enviando magic link:', magicError.message)
    return NextResponse.json({ error: 'Error al enviar el email de invitación' }, { status: 500 })
  }

  return NextResponse.json({ inviteId: invite.id })
}
