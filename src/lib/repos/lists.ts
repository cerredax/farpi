import { getLists as storeLists, getListItems, getPendingItems } from '@/lib/mock-store'
import type { List, ListItem, PendingItem } from '@/types'

// TODO: reemplazar con → supabase.from('lists').select('*').eq('family_id', familyId)
export async function getLists(familyId: string): Promise<List[]> {
  return storeLists(familyId)
}

// TODO: reemplazar con → supabase.from('list_items').select('*').eq('family_id', familyId)
export async function getItems(familyId: string): Promise<ListItem[]> {
  return getListItems(familyId)
}

// TODO: reemplazar con → supabase.from('list_items').select('*, lists(name)').eq('family_id', familyId).eq('completed', false)
export async function fetchPendingItems(familyId: string): Promise<PendingItem[]> {
  return getPendingItems(familyId)
}
