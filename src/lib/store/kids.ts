import type { Child, ChildDraft } from '@/types'
import { db } from './db'

export function getKids(familyId: string): Child[] {
  return db.kids.filter(c => c.family_id === familyId)
}

export function createKid(familyId: string, draft: ChildDraft): Child {
  const c: Child = {
    id: crypto.randomUUID(),
    family_id: familyId,
    name: draft.name.trim(),
    birth_date: draft.birth_date || null,
    color: draft.color,
    created_at: new Date().toISOString(),
  }
  db.kids = [...db.kids, c]
  return c
}

export function updateKid(id: string, draft: ChildDraft): void {
  db.kids = db.kids.map(c =>
    c.id !== id ? c : { ...c, name: draft.name.trim(), birth_date: draft.birth_date || null, color: draft.color }
  )
}

export function deleteKid(id: string): void {
  db.kids      = db.kids.filter(c => c.id !== id)
  // Mirrors ON DELETE SET NULL: clear child_id references
  db.events    = db.events.map(e => e.child_id === id ? { ...e, child_id: null } : e)
  db.documents = db.documents.map(d => d.child_id === id ? { ...d, child_id: null } : d)
}
