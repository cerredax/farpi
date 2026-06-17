import { getFamily as storeGetFamily, getMembers as storeGetMembers } from '@/lib/mock-store'
import type { Family, FamilyMember } from '@/types'

// TODO: reemplazar con → supabase.from('families').select('*').eq('id', familyId).single()
export async function getFamily(familyId: string): Promise<Family> {
  return storeGetFamily(familyId)!
}

// TODO: reemplazar con → supabase.from('family_members').select('*').eq('family_id', familyId)
export async function getMembers(familyId: string): Promise<FamilyMember[]> {
  return storeGetMembers(familyId)
}
