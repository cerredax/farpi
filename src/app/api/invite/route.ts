import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PLACEHOLDER_URLS = ['your-supabase-project-url', 'placeholder', 'https://placeholder.supabase.co']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const IS_DEMO_MODE =
  !SUPABASE_URL ||
  PLACEHOLDER_URLS.some(p => SUPABASE_URL.includes(p)) ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'your-anon-key'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: 'No disponible en modo demo' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

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
    return NextResponse.json(
      { error: isDuplicate ? 'Ya existe una invitación pendiente para ese email' : inviteError.message },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  // Enviar el magic link vía Supabase Auth admin (requiere service role key)
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? req.nextUrl.origin
  const redirectTo = `${origin}/auth/callback?invite_id=${invite.id}`

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
