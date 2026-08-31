import type { Note, NoteDraft } from '@/types'
import { db } from './db'

export function getNotes(familyId: string): Note[] {
  return db.notes.filter(n => n.family_id === familyId)
}

export function createNote(familyId: string, draft: NoteDraft): Note {
  const now = new Date().toISOString()
  const n: Note = {
    id: crypto.randomUUID(),
    family_id: familyId,
    title: draft.title.trim(),
    // Vacío es `null` y no `''`, como en la base: si no, el mock devolvería una
    // cadena donde Supabase devuelve nulo y la tarjeta pintaría una línea en
    // blanco solo en modo demo.
    body: draft.body.trim() || null,
    emoji: draft.emoji || null,
    pinned: draft.pinned,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.notes = [...db.notes, n]
  return n
}

export function updateNote(id: string, draft: NoteDraft): void {
  db.notes = db.notes.map(n =>
    n.id !== id ? n : {
      ...n,
      title: draft.title.trim(),
      body: draft.body.trim() || null,
      emoji: draft.emoji || null,
      pinned: draft.pinned,
      // Imita al trigger `set_notes_updated_at`. Importa más que en otras
      // tablas: es la mitad del orden de la pantalla.
      updated_at: new Date().toISOString(),
    }
  )
}

export function deleteNote(id: string): void {
  db.notes = db.notes.filter(n => n.id !== id)
}
