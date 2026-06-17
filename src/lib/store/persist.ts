import { db } from './db'

const STORAGE_KEY = 'nido_store_v1'
const SCHEMA_VER  = 6  // v6: Event.recurrence_group_id

export function loadFromStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const d = JSON.parse(raw)

    if (!d._v || d._v < SCHEMA_VER) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    if (Array.isArray(d.families))  db.families  = d.families
    if (Array.isArray(d.members))   db.members   = d.members
    if (Array.isArray(d.invites))   db.invites   = d.invites
    if (Array.isArray(d.kids))      db.kids      = d.kids
    if (Array.isArray(d.events))    db.events    = d.events
    if (Array.isArray(d.tasks))     db.tasks     = d.tasks
    if (Array.isArray(d.lists))     db.lists     = d.lists
    if (Array.isArray(d.listItems)) db.listItems = d.listItems
    if (Array.isArray(d.mealPlans)) db.mealPlans = d.mealPlans
    if (Array.isArray(d.documents)) db.documents = d.documents
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function persistAll(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      _v: SCHEMA_VER,
      families:  db.families,
      members:   db.members,
      invites:   db.invites,
      kids:      db.kids,
      events:    db.events,
      tasks:     db.tasks,
      lists:     db.lists,
      listItems: db.listItems,
      mealPlans: db.mealPlans,
      documents: db.documents,
    }))
  } catch { /* ignore */ }
}
