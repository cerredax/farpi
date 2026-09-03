import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, FALTA_SERVICE_ROLE, respuestaSinServiceRole } from '@/lib/supabase/admin'
import { requiereSesion } from '@/lib/supabase/guard'
import { isValidEmail, normalizeEmail } from '@/lib/validators'

/**
 * Cuántas invitaciones puede mandar una misma persona en 24 horas (03-09-2026).
 *
 * Esta ruta manda un correo de verdad, con `inviteUserByEmail`, desde el SMTP y
 * el dominio de Farpi. Y no hacía falta ser de la casa para usarla: el registro
 * está abierto, crear una familia te hace admin de ella, y admin es lo único que
 * pedía. Cualquiera podía registrarse y pedirle a Farpi que mandara correos con
 * pinta de invitación legítima a las direcciones que quisiera. Lo que se arriesga
 * ahí no es la máquina, es la reputación del dominio: si `farpi.app` acaba
 * marcado como spam, las invitaciones de verdad y los correos de recuperar
 * contraseña dejan de llegar a la familia que sí los espera.
 *
 * Diez porque una casa invita a dos o tres personas en toda su vida, y quien
 * está montando la familia el primer día tiene que poder equivocarse varias
 * veces sin quedarse fuera hasta mañana. Se cuenta por **quien invita** y no por
 * familia: las familias se crean gratis, así que un tope por familia se salta
 * creando otra.
 *
 * No hay Redis ni memoria compartida, y no hace falta: la cuenta está en
 * `family_invites`, que es donde queda el rastro de cada envío.
 */
const MAX_INVITACIONES_DIARIAS = 10

export async function POST(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  const { supabase, user } = guardia

  // El `catch` no es adorno: sin él, un cuerpo que no es JSON hace que `json()`
  // lance y la ruta contesta un 500 sin dueño, cuando lo que ha pasado es que
  // falta un parámetro y eso ya se cuenta abajo con un 400. Las demás rutas de la
  // app lo hacen así.
  const body = (await req.json().catch(() => ({}))) as { familyId?: string; email?: string }
  const { familyId, email } = body

  if (!familyId || !email) {
    return NextResponse.json({ error: 'Faltan parámetros: familyId y email son obligatorios' }, { status: 400 })
  }

  // La forma del correo se comprueba aquí y no solo en el sheet: el navegador es
  // donde se proponen las cosas, no donde se validan. Es el mismo validador que
  // usa la interfaz, así que las dos puertas dicen lo mismo.
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Ese correo no tiene forma de correo' }, { status: 400 })
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

  // El tope de envíos, contado sobre las invitaciones que ya lleva hechas esta
  // persona. Va después de la comprobación de admin para no contarle nada a
  // quien no iba a poder invitar de todas formas.
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: cuentaError } = await supabase
    .from('family_invites')
    .select('id', { count: 'exact', head: true })
    .eq('invited_by', user.id)
    .gte('created_at', desde)

  if (cuentaError) {
    console.error('[invite] recuento de invitaciones:', cuentaError.message)
    return NextResponse.json({ error: 'No se pudo crear la invitación' }, { status: 500 })
  }
  if ((count ?? 0) >= MAX_INVITACIONES_DIARIAS) {
    // El motivo sí se cuenta: es una regla de la casa y no una pista para quien
    // sondea, igual que el aviso del último administrador.
    return NextResponse.json(
      { error: 'Has mandado muchas invitaciones hoy. Prueba de nuevo mañana.' },
      { status: 429 },
    )
  }

  // Insertar la invitación en la BD
  const { data: invite, error: inviteError } = await supabase
    .from('family_invites')
    .insert({ family_id: familyId, email: normalizeEmail(email), invited_by: user.id })
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
