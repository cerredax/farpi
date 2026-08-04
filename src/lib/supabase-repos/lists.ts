import { createClient } from '../supabase/client'
import { assertNoError, currentUserId } from './shared'
import type { List, ListDraft, ListItem, ListItemDraft } from '@/types'
import type { ListItemsRepo, ListsRepo } from '../repos/types'

export const listsRepo: ListsRepo = {
  async getLists(familyId: string): Promise<List[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('lists').select('*').eq('family_id', familyId).order('created_at')
    assertNoError(error)
    return data ?? []
  },

  async createList(familyId: string, draft: ListDraft): Promise<List> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('lists')
      .insert({ family_id: familyId, name: draft.name.trim(), emoji: draft.emoji || null, color: null, created_by: userId })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateList(id: string, draft: ListDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('lists').update({ name: draft.name.trim(), emoji: draft.emoji || null }).eq('id', id)
    assertNoError(error)
  },

  async deleteList(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('lists').delete().eq('id', id)
    assertNoError(error)
  },
}

export const listItemsRepo: ListItemsRepo = {
  async getListItems(familyId: string): Promise<ListItem[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('list_items')
      .select('*')
      .eq('family_id', familyId)
      .order('sort_order')
    assertNoError(error)
    return data ?? []
  },

  async createListItem(listId: string, familyId: string, draft: ListItemDraft): Promise<ListItem> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data: existing, error: orderError } = await supabase
      .from('list_items')
      .select('sort_order')
      .eq('list_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)
    assertNoError(orderError)
    const sortOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1
    const { data, error } = await supabase
      .from('list_items')
      .insert({ list_id: listId, family_id: familyId, text: draft.text.trim(), sort_order: sortOrder, created_by: userId })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateListItem(id: string, draft: ListItemDraft): Promise<void> {
    const supabase = createClient()
    // `list_id` solo viaja si se pide mover: mandarlo siempre obligaría a la
    // UI a conocer la lista actual en cada edición. Que la lista destino sea
    // de la misma familia lo garantiza el trigger check_list_item_family.
    const cambios = draft.list_id
      ? { text: draft.text.trim(), list_id: draft.list_id }
      : { text: draft.text.trim() }
    const { error } = await supabase.from('list_items').update(cambios).eq('id', id)
    assertNoError(error)
  },

  async deleteListItem(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('list_items').delete().eq('id', id)
    assertNoError(error)
  },

  // Marcar no archiva: devuelve el ítem al catálogo de lo que se compra siempre.
  // Se guarda quién y cuándo para poder deshacerlo sin reescribir el texto.
  async toggleListItem(id: string): Promise<void> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data: item, error: getError } = await supabase.from('list_items').select('*').eq('id', id).single()
    assertNoError(getError)
    const completed = !item.completed
    const { error } = await supabase
      .from('list_items')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? userId : null,
      })
      .eq('id', id)
    assertNoError(error)
  },
}
