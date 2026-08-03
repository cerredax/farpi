'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import type { Document, DocumentDraft } from '@/types'

/** Estado de la pantalla de documentos: filtro por categoría y sheet de alta/edición. */
export function useDocsState() {
  const { documents, kids, createDocument, updateDocument, deleteDocument, getDocumentUrl } = useStore()

  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [sheetMode,    setSheetMode]    = useState<'create' | 'edit'>('create')
  const [editingDoc,   setEditingDoc]   = useState<Document | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

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

  const filtered = activeFilter
    ? documents.filter(d => d.category === activeFilter)
    : documents

  return {
    documents, kids, filtered,
    activeFilter, setActiveFilter,
    sheetOpen, setSheetOpen, sheetMode, sheetKey, editingDoc,
    openCreate, openEdit, handleSave,
    deleteDocument, getDocumentUrl,
  }
}
