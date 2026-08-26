import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requiereSesion } from '@/lib/supabase/guard'

export const runtime = 'nodejs'

export async function POST() {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { user } = guardia

  const admin = createAdminClient()

  const { data: memberships, error: membershipsError } = await admin
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 })
  }

  const familyIdsToDelete: string[] = []

  for (const membership of memberships ?? []) {
    const { data: familyMembers, error: membersError } = await admin
      .from('family_members')
      .select('id, role')
      .eq('family_id', membership.family_id)

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    const memberCount = familyMembers?.length ?? 0
    const adminCount = familyMembers?.filter(member => member.role === 'admin').length ?? 0

    if (memberCount <= 1) {
      familyIdsToDelete.push(membership.family_id)
      continue
    }

    if (membership.role === 'admin' && adminCount <= 1) {
      return NextResponse.json(
        { error: 'Antes de borrar tu cuenta, nombra administrador a otra persona de la familia.' },
        { status: 409 },
      )
    }
  }

  for (const familyId of familyIdsToDelete) {
    const { data: docs, error: docsError } = await admin
      .from('documents')
      .select('storage_path')
      .eq('family_id', familyId)

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    const paths = (docs ?? []).map(doc => doc.storage_path).filter(Boolean)
    if (paths.length > 0) {
      const { error: storageError } = await admin.storage.from('documents').remove(paths)
      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 500 })
      }
    }

    const { error: familyDeleteError } = await admin.from('families').delete().eq('id', familyId)
    if (familyDeleteError) {
      return NextResponse.json({ error: familyDeleteError.message }, { status: 500 })
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
