'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Upload, FileText, ImageIcon, File, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Child, Document, DocumentDraft, DocMimeType } from '@/types'
import { DOC_CATEGORIES } from '@/lib/constants'
import { validateDocumentFile } from '@/lib/validators'
import { useConfirmAction } from '@/hooks/useConfirmAction'

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon size={18} className="text-accent" />
  if (mime === 'application/pdf') return <FileText size={18} className="text-primary" />
  return <File size={18} className="text-muted" />
}

const EMPTY_DRAFT: DocumentDraft = {
  name: '',
  description: '',
  category: 'otros',
  child_id: null,
  mime_type: 'application/pdf',
  size_bytes: 0,
}

function initDraft(mode: 'create' | 'edit', initial: Document | null | undefined): DocumentDraft {
  if (mode === 'edit' && initial) {
    return {
      name:        initial.name,
      description: initial.description ?? '',
      category:    initial.category ?? 'otros',
      child_id:    initial.child_id,
      mime_type:   initial.mime_type,
      size_bytes:  initial.size_bytes,
    }
  }
  return { ...EMPTY_DRAFT }
}

interface DocSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Document | null
  kids: Child[]
  onClose: () => void
  onSave: (draft: DocumentDraft) => void
  onDelete?: (id: string) => void
  onOpenFile?: (doc: Document) => Promise<string>
}

export function DocSheet({ open, mode, initial, kids, onClose, onSave, onDelete, onOpenFile }: DocSheetProps) {
  const [draft,    setDraft]    = useState<DocumentDraft>(() => initDraft(mode, initial))
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState('')
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateDocumentFile(file)
    if (!validation.ok) { setFileError(validation.message); return }
    setFileError('')
    setSelectedFile(file)
    setFileName(file.name)
    setDraft(d => ({
      ...d,
      name: d.name || file.name.replace(/\.[^/.]+$/, ''),
      mime_type: file.type as DocMimeType,
      size_bytes: file.size,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    if (mode === 'create' && !selectedFile) {
      setFileError('Selecciona un archivo.')
      return
    }
    onSave({ ...draft, file: selectedFile ?? undefined })
    if (mode === 'create') {
      setDraft({ ...EMPTY_DRAFT })
      setFileName('')
      setSelectedFile(null)
    }
    onClose()
  }

  function handleDelete() {
    if (!initial || !onDelete) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  async function handleOpen() {
    if (!initial || !onOpenFile || opening) return
    // Abrir la pestaña de forma síncrona evita que el bloqueador de popups
    // la cancele tras el await de la URL firmada.
    const win = window.open('', '_blank')
    setOpening(true)
    setOpenError('')
    try {
      const url = await onOpenFile(initial)
      if (win) win.location.href = url
      else window.location.href = url
    } catch (err) {
      win?.close()
      setOpenError(err instanceof Error ? err.message : 'No se pudo abrir el documento')
    } finally {
      setOpening(false)
    }
  }

  const fileName_display = mode === 'edit' && initial
    ? initial.storage_path.split('/').pop() ?? initial.name
    : fileName

  const footer = (
    <div className="px-5 pb-8 pt-3 space-y-2">
      <Button type="submit" form="doc-form" fullWidth size="lg" disabled={!draft.name.trim() || !!fileError || (mode === 'create' && !selectedFile)}>
        {mode === 'create' ? 'Guardar documento' : 'Guardar cambios'}
      </Button>
      {mode === 'edit' && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-danger text-white' : 'text-danger hover:bg-danger-soft'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={15} />
            {confirmDelete ? 'Confirmar eliminación' : 'Eliminar documento'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir documento' : 'Editar documento'}
      onClose={onClose}
      footer={footer}
    >
      <form id="doc-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        {/* Archivo */}
        <div className="space-y-2">
          <label className="field-label">Archivo</label>
          {mode === 'create' ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 bg-canvas border-2 border-dashed border-[#D8D4CE] rounded-xl px-4 py-3 hover:border-primary hover:bg-primary-tint transition-colors text-left"
              >
                <Upload size={18} className="text-primary flex-shrink-0" />
                <span className="text-sm text-muted truncate flex-1">
                  {fileName || 'Seleccionar archivo…'}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleFile} />
              {fileError
                ? <p className="text-[10px] text-danger font-semibold">{fileError}</p>
                : <p className="text-[10px] text-faint">PDF, JPG o PNG. Tamano maximo: 20 MB.</p>
              }
            </>
          ) : (
            /* En edición: mostrar info del archivo actual + abrir */
            <>
              <div className="flex items-center gap-3 bg-canvas border border-line rounded-xl px-4 py-3">
                <FileTypeIcon mime={draft.mime_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{fileName_display}</p>
                  <p className="text-xs text-muted">{formatSize(draft.size_bytes)}</p>
                </div>
              </div>
              {onOpenFile && (
                <button
                  type="button"
                  onClick={handleOpen}
                  disabled={opening}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-tint disabled:opacity-60"
                >
                  {opening
                    ? <><Loader2 size={15} className="animate-spin" /> Abriendo…</>
                    : <><ExternalLink size={15} strokeWidth={2.3} /> Abrir documento</>
                  }
                </button>
              )}
              {openError && <p className="text-[10px] text-danger font-semibold">{openError}</p>}
            </>
          )}
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="doc-name" className="field-label">Nombre</label>
          <input
            id="doc-name"
            ref={inputRef}
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Ej: Cartilla vacunas Ana"
            required
            className="field-input"
          />
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="field-label">Categoría</label>
          <div className="flex flex-wrap gap-2">
            {DOC_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setDraft(d => ({ ...d, category: cat.key }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${draft.category === cat.key ? 'bg-primary text-white' : 'bg-canvas text-muted border border-line hover:bg-surface'}`}
              >
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hijo (opcional) */}
        {kids.length > 0 && (
          <div className="space-y-2">
            <label className="field-label">
              De quién <span className="normal-case font-normal">(opcional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft(d => ({ ...d, child_id: null }))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${!draft.child_id ? 'bg-primary text-white' : 'bg-canvas text-muted border border-line hover:bg-surface'}`}
              >
                Familia
              </button>
              {kids.map(kid => (
                <button
                  key={kid.id}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, child_id: kid.id }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${draft.child_id === kid.id ? 'text-white' : 'bg-canvas text-muted border border-line hover:bg-surface'}`}
                  style={draft.child_id === kid.id ? { backgroundColor: kid.color } : {}}
                >
                  {kid.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div className="space-y-1.5">
          <label htmlFor="doc-description" className="field-label">
            Descripción <span className="normal-case font-normal">(opcional)</span>
          </label>
          <input
            id="doc-description"
            type="text"
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="Ej: Revisión 2026"
            className="field-input"
          />
        </div>
      </form>
    </BottomSheet>
  )
}
