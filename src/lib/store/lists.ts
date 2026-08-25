import type { List, ListItem, ListDraft, ListItemDraft } from '@/types'
import { MAX_UNIDADES } from '../constants'
import { db } from './db'

export function getLists(familyId: string): List[] {
  return db.lists.filter(l => l.family_id === familyId)
}

export function getListItems(familyId: string): ListItem[] {
  return db.listItems.filter(i => i.family_id === familyId)
}

export function createList(familyId: string, draft: ListDraft): List {
  const now = new Date().toISOString()
  const l: List = {
    id: crypto.randomUUID(),
    family_id: familyId,
    name: draft.name.trim(),
    emoji: draft.emoji || null,
    color: null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.lists = [...db.lists, l]
  return l
}

export function updateList(id: string, draft: ListDraft): void {
  db.lists = db.lists.map(l =>
    l.id !== id ? l : { ...l, name: draft.name.trim(), emoji: draft.emoji || null, updated_at: new Date().toISOString() }
  )
}

export function deleteList(id: string): void {
  db.lists     = db.lists.filter(l => l.id !== id)
  db.listItems = db.listItems.filter(i => i.list_id !== id)
}

export function createListItem(listId: string, familyId: string, draft: ListItemDraft): ListItem {
  const maxOrder = db.listItems.filter(i => i.list_id === listId).reduce((m, i) => Math.max(m, i.sort_order), -1)
  const item: ListItem = {
    id: crypto.randomUUID(),
    list_id: listId,
    family_id: familyId,
    text: draft.text.trim(),
    // Se apunta lo que falta, y de partida hace falta uno.
    quantity: 1,
    completed: false,
    completed_at: null,
    completed_by: null,
    sort_order: maxOrder + 1,
    created_by: 'u1',
    created_at: new Date().toISOString(),
  }
  db.listItems = [...db.listItems, item]
  return item
}

export function updateListItem(id: string, draft: ListItemDraft): void {
  const item = db.listItems.find(i => i.id === id)
  if (!item) return

  // Imita al trigger check_list_item_family (migración 007): un ítem no puede
  // acabar en la lista de otra familia. Sin esto el mock aceptaría lo que
  // Supabase rechaza, y el fallo solo saldría en producción.
  let listId = item.list_id
  if (draft.list_id && draft.list_id !== item.list_id) {
    const destino = db.lists.find(l => l.id === draft.list_id)
    if (!destino || destino.family_id !== item.family_id) {
      throw new Error('list_items: list_id no pertenece a la misma family_id')
    }
    listId = destino.id
  }

  db.listItems = db.listItems.map(i =>
    i.id !== id ? i : { ...i, text: draft.text.trim(), list_id: listId }
  )
}

export function deleteListItem(id: string): void {
  db.listItems = db.listItems.filter(i => i.id !== id)
}

/**
 * Las unidades, acotadas aquí igual que en la base (`check` de la 021). El mock
 * tiene que imitar a Supabase también cuando dice que no.
 */
export function setListItemQuantity(id: string, quantity: number): void {
  const acotada = Math.min(Math.max(Math.round(quantity), 1), MAX_UNIDADES)
  db.listItems = db.listItems.map(i => (i.id !== id ? i : { ...i, quantity: acotada }))
}

export function toggleListItem(id: string): void {
  const now = new Date().toISOString()
  db.listItems = db.listItems.map(i =>
    i.id !== id ? i : {
      ...i,
      completed: !i.completed,
      completed_at: !i.completed ? now : null,
      completed_by: !i.completed ? 'u1' : null,
    }
  )
}
