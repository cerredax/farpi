import type { List, ListItem, ListDraft, ListItemDraft, PendingItem } from '@/types'
import { selectPendingItems } from '../selectors'
import { db } from './db'

export function getLists(familyId: string): List[] {
  return db.lists.filter(l => l.family_id === familyId)
}

export function getListItems(familyId: string): ListItem[] {
  return db.listItems.filter(i => i.family_id === familyId)
}

export function getPendingItems(familyId: string): PendingItem[] {
  return selectPendingItems(getListItems(familyId), getLists(familyId))
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
  db.listItems = db.listItems.map(i => i.id !== id ? i : { ...i, text: draft.text.trim() })
}

export function deleteListItem(id: string): void {
  db.listItems = db.listItems.filter(i => i.id !== id)
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
