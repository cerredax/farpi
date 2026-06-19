import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code     = requestUrl.searchParams.get('code')
  const inviteId = requestUrl.searchParams.get('invite_id')
  const next     = requestUrl.searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Flujo de invitación: aceptar automáticamente tras autenticar al usuario.
    // La RPC acepta_family_invite crea el family_member y marca la invitación
    // como aceptada en una sola transacción.
    if (inviteId) {
      await supabase.rpc('accept_family_invite', { p_invite_id: inviteId })
      // Redirigir siempre aunque falle (invitación ya aceptada, etc.)
      return NextResponse.redirect(new URL('/home', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
