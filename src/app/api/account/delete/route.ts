import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { IS_DEMO_MODE } from '@/lib/supabase/env'

export const runtime = 'nodejs'

export async function POST() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ error: 'No disponible en modo demo' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Familias del usuario donde es el único miembro → se borran por completo
  // (cascade elimina su contenido). También limpiamos sus archivos de Storage.
  const { data: memberships } = await admin
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)

  for (const { family_id } of memberships ?? []) {
    const { count } = await admin
      .from('family_members')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', family_id)

    if ((count ?? 0) <= 1) {
      const { data: docs } = await admin
        .from('documents')
        .select('storage_path')
        .eq('family_id', family_id)
      const paths = (docs ?? []).map(d => d.storage_path).filter(Boolean)
      if (paths.length > 0) {
        await admin.storage.from('documents').remove(paths)
      }
      await admin.from('families').delete().eq('id', family_id)
    }
  }

  // Borrar el usuario de Auth. Cascade elimina family_members y push_subscriptions;
  // las referencias created_by/completed_by/invited_by quedan en NULL (migración 011).
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
