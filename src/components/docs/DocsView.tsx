'use client'

import { useState } from 'react'
import { Plus, FileText, ImageIcon, File } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useStore } from '@/lib/store-context'
import { DocSheet } from './DocSheet'
import { DOC_CATEGORIES } from '@/lib/constants'
import type { Document, DocumentDraft } from '@/types'

const CATEGORY_META = Object.fromEntries(
  DOC_CATEGORIES.map(c => [c.key, { label: c.label, emoji: c.emoji }])
)

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon size={20} className="text-[#D8A48F]" />
  if (mime === 'application/pdf') return <FileText size={20} className="text-[#8BA888]" />
  return <File size={20} className="text-[#77716A]" />
}

function DocCard({
  doc,
  childName,
  childColor,
  onEdit,
}: {
  doc: Document
  childName?: string
  childColor?: string
  onEdit: () => void
}) {
  const cat = doc.category ? CATEGORY_META[doc.category] : CATEGORY_META['otros']

  return (
    <button
      onClick={onEdit}
      className="w-full bg-white rounded-2xl border border-[#F0EDE8] shadow-sm px-4 py-3.5 flex items-start gap-3 text-left hover:bg-[#FDFBF8] active:bg-[#FAF7F2] transition-colors"
    >
      {/* Icono de tipo */}
      <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] flex items-center justify-center flex-shrink-0 mt-0.5">
        <DocTypeIcon mime={doc.mime_type} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#252525] text-sm leading-tight truncate">{doc.name}</p>
        {doc.description && (
          <p className="text-xs text-[#77716A] mt-0.5 truncate">{doc.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {cat && (
            <span className="text-[10px] font-bold bg-[#F0EDE8] text-[#77716A] px-2 py-0.5 rounded-full">
              {cat.emoji} {cat.label}
            </span>
          )}
          {childName && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: childColor ?? '#8BA888' }}
            >
              {childName}
            </span>
          )}
          <span className="text-[10px] text-[#C4BFB9]">
            {formatSize(doc.size_bytes)} · {format(parseISO(doc.created_at), 'd MMM yyyy', { locale: es })}
          </span>
        </div>
      </div>

      {/* Indicador de que es editable */}
      <span className="text-[#C4BFB9] text-xs mt-1 flex-shrink-0">›</span>
    </button>
  )
}

const ALL_FILTERS = [
  { key: null as string | null, label: 'Todos' },
  ...DOC_CATEGORIES.map(c => ({ key: c.key as string | null, label: `${c.emoji} ${c.label}` })),
]

export function DocsView() {
  const { documents, kids, createDocument, updateDocument, deleteDocument } = useStore()

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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#252525] leading-tight">Documentos</h1>
          <p className="text-xs text-[#77716A] mt-0.5">
            {documents.length} documento{documents.length !== 1 ? 's' : ''} guardados
          </p>
        </div>
        <button
          onClick={openCreate}
          aria-label="Añadir documento"
          className="w-10 h-10 bg-[#8BA888] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#7a9877] transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {ALL_FILTERS.map(f => (
          <button
            key={String(f.key)}
            onClick={() => setActiveFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activeFilter === f.key ? 'bg-[#8BA888] text-white' : 'bg-white border border-[#EDE9E3] text-[#77716A] hover:bg-[#F0EDE8]'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="font-bold text-[#252525]">Sin documentos</p>
          <p className="text-sm text-[#77716A] mt-1">
            {activeFilter ? 'No hay documentos en esta categoría' : 'Guarda el primer documento de la familia'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const child = kids.find(k => k.id === doc.child_id)
            return (
              <DocCard
                key={doc.id}
                doc={doc}
                childName={child?.name}
                childColor={child?.color}
                onEdit={() => openEdit(doc)}
              />
            )
          })}
        </div>
      )}

      <DocSheet
        key={sheetKey}
        open={sheetOpen}
        mode={sheetMode}
        initial={editingDoc}
        kids={kids}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onDelete={deleteDocument}
      />
    </div>
  )
}
