import { NextResponse } from 'next/server'
import { createAdminClient, FALTA_SERVICE_ROLE, respuestaSinServiceRole } from '@/lib/supabase/admin'
import { requiereSesion } from '@/lib/supabase/guard'

export const runtime = 'nodejs'

/**
 * El motivo va al log del servidor y no a la respuesta, como en `/api/push` y
 * `/api/invite`: el mensaje de Postgres o del Admin API no le dice nada a quien
 * borra su cuenta y sí a quien sondea. La única excepción es el aviso del
 * último administrador, que es una regla de negocio y hay que poder leerla.
 */
function fallo(contexto: string, mensaje: string) {
  console.error(`[account/delete] ${contexto}:`, mensaje)
  return NextResponse.json({ error: 'No se pudo borrar la cuenta' }, { status: 500 })
}

export async function POST() {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { user } = guardia

  if (FALTA_SERVICE_ROLE) return respuestaSinServiceRole('account/delete')

  const admin = createAdminClient()

  const { data: memberships, error: membershipsError } = await admin
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', user.id)

  if (membershipsError) {
    return fallo('lectura de membresías', membershipsError.message)
  }

  const familyIdsToDelete: string[] = []

  for (const membership of memberships ?? []) {
    const { data: familyMembers, error: membersError } = await admin
      .from('family_members')
      .select('id, role')
      .eq('family_id', membership.family_id)

    if (membersError) {
      return fallo('lectura de los miembros de la familia', membersError.message)
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
      return fallo('lectura de documentos', docsError.message)
    }

    const paths = (docs ?? []).map(doc => doc.storage_path).filter(Boolean)
    if (paths.length > 0) {
      const { error: storageError } = await admin.storage.from('documents').remove(paths)
      if (storageError) {
        return fallo('borrado de archivos', storageError.message)
      }
    }

    const { error: familyDeleteError } = await admin.from('families').delete().eq('id', familyId)
    if (familyDeleteError) {
      return fallo('borrado de la familia', familyDeleteError.message)
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return fallo('borrado del usuario', deleteError.message)
  }

  return NextResponse.json({ ok: true })
}
