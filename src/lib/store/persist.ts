import { db } from './db'

const STORAGE_KEY = 'farpi_store_v1'
/**
 * Cómo se llamaba la clave cuando la app era Nido (31-08-2026). Se lee una vez y
 * se borra: sin esto, el rebranding vaciaba el modo demo de todo el que lo
 * tuviera abierto, y el modo demo es el fallback sin credenciales.
 *
 * Es de usar y tirar. Se puede quitar cuando nadie quede con la clave vieja —de
 * la familia, dos navegadores— y se lleve consigo `migrarClaveVieja`.
 */
const STORAGE_KEY_NIDO = 'nido_store_v1'

/** Trae lo que hubiera bajo la clave vieja y la retira. Silenciosa a propósito. */
function migrarClaveVieja(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) {
      localStorage.removeItem(STORAGE_KEY_NIDO)
      return
    }
    const viejo = localStorage.getItem(STORAGE_KEY_NIDO)
    if (viejo) localStorage.setItem(STORAGE_KEY, viejo)
    localStorage.removeItem(STORAGE_KEY_NIDO)
  } catch { /* ignore */ }
}
const SCHEMA_VER  = 12 // v12: notes (lo que hay que tener apuntado y no es fecha, tarea ni papel)

export function loadFromStorage(): void {
  if (typeof window === 'undefined') return
  migrarClaveVieja()
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
    if (Array.isArray(d.notes))     db.notes     = d.notes
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
      notes:     db.notes,
      documents: db.documents,
    }))
  } catch { /* ignore */ }
}
