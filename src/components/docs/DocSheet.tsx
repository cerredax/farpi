'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Upload, FileText, ImageIcon, File } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
  if (mime.startsWith('image/')) return <ImageIcon size={18} className="text-[#D8A48F]" />
  if (mime === 'application/pdf') return <FileText size={18} className="text-[#8BA888]" />
  return <File size={18} className="text-[#77716A]" />
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
}

export function DocSheet({ open, mode, initial, kids, onClose, onSave, onDelete }: DocSheetProps) {
  const [draft,    setDraft]    = useState<DocumentDraft>(() => initDraft(mode, initial))
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
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
    onSave(draft)
    if (mode === 'create') {
      setDraft({ ...EMPTY_DRAFT })
      setFileName('')
    }
    onClose()
  }

  function handleDelete() {
    if (!initial || !onDelete) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const fileName_display = mode === 'edit' && initial
    ? initial.storage_path.split('/').pop() ?? initial.name
    : fileName

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#E0DDD8]" />
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="font-extrabold text-[#252525] text-base">
            {mode === 'create' ? 'Añadir documento' : 'Editar documento'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-5 overflow-y-auto">
          {/* Archivo */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Archivo</label>
            {mode === 'create' ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 bg-[#FAF7F2] border-2 border-dashed border-[#D8D4CE] rounded-xl px-4 py-3 hover:border-[#8BA888] hover:bg-[#F5F9F5] transition-colors text-left"
                >
                  <Upload size={18} className="text-[#8BA888] flex-shrink-0" />
                  <span className="text-sm text-[#77716A] truncate flex-1">
                    {fileName || 'Seleccionar archivo…'}
                  </span>
                </button>
                <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleFile} />
                {fileError
                  ? <p className="text-[10px] text-[#D96C6C] font-semibold">{fileError}</p>
                  : <p className="text-[10px] text-[#C4BFB9]">Demo — solo se guarda el nombre y tipo, no el contenido.</p>
                }
              </>
            ) : (
              /* En edición: mostrar info del archivo actual (solo lectura) */
              <div className="flex items-center gap-3 bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-4 py-3">
                <FileTypeIcon mime={draft.mime_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#252525] font-medium truncate">{fileName_display}</p>
                  <p className="text-xs text-[#77716A]">{formatSize(draft.size_bytes)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
            <input
              ref={inputRef}
              type="text"
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="Ej: Cartilla vacunas Ana"
              required
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {DOC_CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, category: cat.key }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${draft.category === cat.key ? 'bg-[#8BA888] text-white' : 'bg-[#FAF7F2] text-[#77716A] border border-[#EDE9E3] hover:bg-[#F0EDE8]'}`}
                >
                  <span>{cat.emoji}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hijo (opcional) */}
          {kids.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">
                De quién <span className="normal-case font-normal">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, child_id: null }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${!draft.child_id ? 'bg-[#8BA888] text-white' : 'bg-[#FAF7F2] text-[#77716A] border border-[#EDE9E3] hover:bg-[#F0EDE8]'}`}
                >
                  Familia
                </button>
                {kids.map(kid => (
                  <button
                    key={kid.id}
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, child_id: kid.id }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${draft.child_id === kid.id ? 'text-white' : 'bg-[#FAF7F2] text-[#77716A] border border-[#EDE9E3] hover:bg-[#F0EDE8]'}`}
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
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">
              Descripción <span className="normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="Ej: Revisión 2026"
              className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
            />
          </div>

          <div className="space-y-2 pt-1">
            <Button type="submit" fullWidth size="lg" disabled={!draft.name.trim() || !!fileError}>
              {mode === 'create' ? 'Guardar documento' : 'Guardar cambios'}
            </Button>
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Trash2 size={15} />
                  {confirmDelete ? 'Confirmar eliminación' : 'Eliminar documento'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
