import { getKids } from '@/lib/mock-store'
import type { Child } from '@/types'

// TODO: reemplazar con → supabase.from('children').select('*').eq('family_id', familyId)
export async function getChildren(familyId: string): Promise<Child[]> {
  return getKids(familyId)
}
