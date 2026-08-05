'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import { selectDocumentMatches } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import type { Document, DocumentDraft } from '@/types'

/** Estado de la pantalla de documentos: búsqueda, filtro por categoría y sheet. */
export function useDocsState() {
  const { documents, kids, members, createDocument, updateDocument, deleteDocument, getDocumentUrl } = useStore()

  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [sheetMode,    setSheetMode]    = useState<'create' | 'edit'>('create')
  const [editingDoc,   setEditingDoc]   = useState<Document | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [busqueda,     setBusqueda]     = useState('')

  const sheetKey = editingDoc ? `edit-${editingDoc.id}` : 'create'

  function openCreate() {
    setEditingDoc(null)
    setSheetMode('create')
    setSheetOpen(true)
  }

  function openEdit(doc: Document) {
    setEditingDoc(doc)
    setSheetMode('edit')
    setSheetOpen(true)
  }

  function handleSave(draft: DocumentDraft) {
    if (sheetMode === 'edit' && editingDoc) updateDocument(editingDoc.id, draft)
    else createDocument(draft)
  }

  // La búsqueda manda sobre el filtro: si buscas "seguro" y está en Personal,
  // encontrarlo no debería depender de qué pestaña tuvieras abierta.
  const porCategoria = activeFilter
    ? documents.filter(d => d.category === activeFilter)
    : documents
  const filtered = selectDocumentMatches(porCategoria, busqueda)

  const puedeBuscar = documents.length >= MINIMO_PARA_BUSCAR

  return {
    documents, kids, members, filtered,
    busqueda, setBusqueda, puedeBuscar,
    activeFilter, setActiveFilter,
    sheetOpen, setSheetOpen, sheetMode, sheetKey, editingDoc,
    openCreate, openEdit, handleSave,
    deleteDocument, getDocumentUrl,
  }
}
