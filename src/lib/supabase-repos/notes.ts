import { createClient } from '../supabase/client'
import { assertNoError, currentUserId } from './shared'
import type { Note, NoteDraft } from '@/types'
import type { NotesRepo } from '../repos/types'

/**
 * Las notas de la familia. La tabla más sencilla de todo el proyecto: no tiene
 * hijos, ni asignado, ni fecha, ni serie.
 *
 * El orden lo pone la pantalla (`selectSortedNotes`) y no este `order`: lo que
 * se pide aquí es lo mismo que dice el índice `notes_family_idx`, para que la
 * lista llegue ya casi ordenada, pero quien manda es el selector, que es el que
 * comparten Supabase y el mock.
 */
export const notesRepo: NotesRepo = {
  async getNotes(familyId: string): Promise<Note[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('family_id', familyId)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    assertNoError(error)
    return data ?? []
  },

  async createNote(familyId: string, draft: NoteDraft): Promise<Note> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('notes')
      .insert({
        family_id: familyId,
        title: draft.title.trim(),
        // Vacío es `null`, no cadena vacía: la columna admite nulo y así el
        // mock y esto devuelven lo mismo.
        body: draft.body.trim() || null,
        emoji: draft.emoji || null,
        pinned: draft.pinned,
        created_by: userId,
      })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateNote(id: string, draft: NoteDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('notes')
      .update({
        title: draft.title.trim(),
        body: draft.body.trim() || null,
        emoji: draft.emoji || null,
        pinned: draft.pinned,
      })
      .eq('id', id)
    assertNoError(error)
  },

  async deleteNote(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('notes').delete().eq('id', id)
    assertNoError(error)
  },
}
