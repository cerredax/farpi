'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import { selectNoteMatches, selectSortedNotes } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import type { Note, NoteDraft } from '@/types'

/**
 * Estado de la pantalla de notas: búsqueda y sheet. No hay filtros ni pestañas,
 * y es a propósito: una nota no tiene fecha ni persona por la que filtrar, así
 * que lo único que la encuentra es el buscador.
 */
export function useNotesState() {
  const { notes, createNote, updateNote, deleteNote } = useStore()

  const [sheetOpen,   setSheetOpen]   = useState(false)
  const [sheetMode,   setSheetMode]   = useState<'create' | 'edit'>('create')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [busqueda,    setBusqueda]    = useState('')

  const sheetKey = editingNote ? `edit-${editingNote.id}` : 'create'

  const ordenadas = useMemo(() => selectSortedNotes(notes), [notes])
  const filtered  = useMemo(() => selectNoteMatches(ordenadas, busqueda), [ordenadas, busqueda])

  const puedeBuscar = notes.length >= MINIMO_PARA_BUSCAR

  function openCreate() {
    setEditingNote(null)
    setSheetMode('create')
    setSheetOpen(true)
  }

  function openEdit(note: Note) {
    setEditingNote(note)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  function handleSave(draft: NoteDraft) {
    if (sheetMode === 'edit' && editingNote) updateNote(editingNote.id, draft)
    else createNote(draft)
  }

  return {
    notes, filtered,
    busqueda, setBusqueda, puedeBuscar,
    sheetOpen, setSheetOpen, sheetMode, sheetKey, editingNote,
    openCreate, openEdit, handleSave, deleteNote,
  }
}
