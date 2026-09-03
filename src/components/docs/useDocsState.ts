'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import { useIsClient } from '@/hooks/useIsClient'
import { docCategoryOf, selectDocCategoryFilters, selectDocumentMatches } from '@/lib/selectors'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import type { DocCategory, Document, DocumentDraft } from '@/types'

/** Estado de la pantalla de documentos: búsqueda, filtro por categoría y sheet. */
export function useDocsState() {
  const {
    documents, kids, members, createDocument, updateDocument, deleteDocument, getDocumentUrl,
    storageConnection, reloadStorageConnection, connectStorageUrl,
  } = useStore()

  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [sheetMode,    setSheetMode]    = useState<'create' | 'edit'>('create')
  const [editingDoc,   setEditingDoc]   = useState<Document | null>(null)
  const [activeFilter, setActiveFilter] = useState<DocCategory | null>(null)
  const [busqueda,     setBusqueda]     = useState('')

  const [avisoCerrado, setAvisoCerrado] = useState(false)
  const esCliente = useIsClient()

  const sheetKey = editingDoc ? `edit-${editingDoc.id}` : 'create'

  /**
   * Cómo fue la vuelta de conectar Google Drive.
   *
   * Se **deriva** del parámetro en cada render en vez de copiarse a un estado
   * desde un efecto: guardarlo sería tener dos veces el mismo dato y es lo que
   * prohíbe `react-hooks/set-state-in-effect`. `useIsClient` es lo que evita que
   * el render del servidor —donde no hay `location`— pinte algo distinto de lo
   * que se ve al hidratar.
   *
   * No se usa `useSearchParams` para no arrastrar la frontera de Suspense que
   * Next exige en una página que se prerenderiza.
   */
  const enLaUrl = esCliente && !avisoCerrado
    ? new URLSearchParams(window.location.search).get('drive')
    : null
  const avisoDrive = enLaUrl === 'ok' || enLaUrl === 'error' ? enLaUrl : null

  /** Cerrarlo también lo quita de la barra: recargar no debe repetir el aviso. */
  function cerrarAvisoDrive() {
    setAvisoCerrado(true)
    const params = new URLSearchParams(window.location.search)
    params.delete('drive')
    const resto = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (resto ? `?${resto}` : ''))
  }

  function openCreate() {
    setEditingDoc(null)
    setSheetMode('create')
    setSheetOpen(true)
    // Se pregunta al abrir y no al cargar la pantalla: hace falta para subir, y
    // subir es lo que se está a punto de hacer. Además así se entera enseguida
    // de una conexión que se cayó desde la última vez.
    void reloadStorageConnection()
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
    ? documents.filter(d => docCategoryOf(d) === activeFilter)
    : documents
  const filtered = selectDocumentMatches(porCategoria, busqueda)

  const puedeBuscar = documents.length >= MINIMO_PARA_BUSCAR

  /**
   * Las categorías que se ofrecen como filtro, y si merece la pena ofrecerlas.
   * Con una sola clase de papel guardado, «Todos» y esa clase enseñan lo mismo:
   * la tira no filtra nada y solo ocupa sitio, igual que el buscador por debajo
   * de `MINIMO_PARA_BUSCAR`.
   */
  const categorias = selectDocCategoryFilters(documents, activeFilter)
  const puedeFiltrar = categorias.length > 1

  return {
    documents, kids, members, filtered,
    busqueda, setBusqueda, puedeBuscar,
    activeFilter, setActiveFilter, categorias, puedeFiltrar,
    sheetOpen, setSheetOpen, sheetMode, sheetKey, editingDoc,
    openCreate, openEdit, handleSave,
    deleteDocument, getDocumentUrl,
    storageConnection, connectStorageUrl, avisoDrive, cerrarAvisoDrive,
  }
}
