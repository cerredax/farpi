'use client'

import { useState, useRef } from 'react'
import { Upload, ExternalLink, Loader2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import type { Child, Document, DocumentDraft, DocMimeType, FamilyMember, StorageConnection } from '@/types'
import { CategoryIcon } from './CategoryIcon'
import { ConnectStorage } from './ConnectStorage'
import { FileTypeIcon } from './FileTypeIcon'
import { DOC_CATEGORIES } from '@/lib/constants'
import { assigneeKeyOf, buildAssignees } from '@/lib/assignees'
import { formatFileSize } from '@/lib/text'
import { validateDocumentFile } from '@/lib/validators'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'

const EMPTY_DRAFT: DocumentDraft = {
  name: '',
  description: '',
  category: 'otros',
  child_id: null,
  member_id: null,
  mime_type: 'application/pdf',
  size_bytes: 0,
  expires_on: '',
}

function initDraft(mode: 'create' | 'edit', initial: Document | null | undefined): DocumentDraft {
  if (mode === 'edit' && initial) {
    return {
      name:        initial.name,
      description: initial.description ?? '',
      category:    initial.category ?? 'otros',
      child_id:    initial.child_id,
      member_id:   initial.member_id,
      mime_type:   initial.mime_type,
      size_bytes:  initial.size_bytes,
      expires_on:  initial.expires_on ?? '',
    }
  }
  return { ...EMPTY_DRAFT }
}

interface DocSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Document | null
  kids: Child[]
  members: FamilyMember[]
  onClose: () => void
  onSave: (draft: DocumentDraft) => void
  onDelete?: (id: string) => void
  onOpenFile?: (doc: Document) => Promise<string>
  /** `null` mientras no se sabe: se da por conectada y no se estorba. */
  conexion?: StorageConnection | null
  connectUrl?: string | null
}

export function DocSheet({ open, mode, initial, kids, members, onClose, onSave, onDelete, onOpenFile, conexion = null, connectUrl = null }: DocSheetProps) {
  const { draft, setDraft, patch, firstFieldRef, submitHandler } = useSheetForm<DocumentDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: d => (d.name.trim() ? null : 'El nombre es obligatorio.'),
  })
  const { confirming: confirmDelete, handleDelete } = useSheetDelete({
    initial,
    onDelete: onDelete ?? (() => {}),
    onClose,
  })
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create' && !selectedFile) {
      setFileError('Selecciona un archivo.')
      return
    }
    onSave({ ...valid, file: selectedFile ?? undefined })
    if (mode === 'create') {
      // La vista reutiliza la misma `key` al crear, así que el sheet no se
      // remonta entre altas y hay que limpiarlo a mano.
      setDraft({ ...EMPTY_DRAFT })
      setFileName('')
      setSelectedFile(null)
    }
    onClose()
  })

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

  /**
   * Hay que conectar antes de poder subir.
   *
   * Mientras la respuesta no ha llegado (`null`) se da por buena la conexión y se
   * enseña el selector de archivo de siempre: quien ya está conectado —que va a
   * ser el caso normal— no ve ni un parpadeo, y en el caso raro de que no lo
   * esté, la subida falla con el mensaje del servidor. Al revés, todo el mundo
   * vería un aviso de conectar durante medio segundo cada vez que abre el sheet.
   */
  const faltaConectar = !!conexion && !conexion.conectada && !conexion.demo && !!connectUrl

  const fileName_display = mode === 'edit' && initial
    ? initial.storage_path.split('/').pop() ?? initial.name
    : fileName

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir documento' : 'Editar documento'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="doc-form"
          submitLabel={mode === 'create' ? 'Guardar documento' : 'Guardar cambios'}
          disabled={!draft.name.trim() || !!fileError || faltaConectar || (mode === 'create' && !selectedFile)}
          onDelete={mode === 'edit' && onDelete
            ? { confirming: confirmDelete, onClick: handleDelete, idleLabel: 'Eliminar documento', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="doc-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Archivo" spacing="group">
          {mode === 'create' && faltaConectar && conexion ? (
            <ConnectStorage conexion={conexion} connectUrl={connectUrl} />
          ) : mode === 'create' ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-3 bg-canvas border-2 border-dashed border-line-strong rounded-xl px-4 py-3 hover:border-primary hover:bg-primary-tint transition-colors text-left"
              >
                <Upload size={18} className="text-primary flex-shrink-0" />
                <span className="text-sm text-muted truncate flex-1">
                  {fileName || 'Seleccionar archivo…'}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleFile} />
              {fileError
                ? <p className="text-[10px] text-danger font-semibold">{fileError}</p>
                : <p className="text-[10px] text-faint">PDF, JPG o PNG. Tamaño máximo: 20 MB.</p>
              }
            </>
          ) : (
            /* En edición: mostrar info del archivo actual + abrir */
            <>
              <div className="flex items-center gap-3 bg-canvas border border-line rounded-xl px-4 py-3">
                <FileTypeIcon mime={draft.mime_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{fileName_display}</p>
                  <p className="text-xs text-muted">{formatFileSize(draft.size_bytes)}</p>
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
        </Field>

        <Field label="Nombre" htmlFor="doc-name">
          <input
            id="doc-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Ej: Cartilla de vacunas"
            required
            className="field-input"
          />
        </Field>

        <Field label="Categoría" spacing="group">
          <div className="flex flex-wrap gap-2">
            {DOC_CATEGORIES.map(cat => (
              <SelectChip
                key={cat.key}
                selected={draft.category === cat.key}
                onClick={() => patch({ category: cat.key })}
              >
                <CategoryIcon category={cat.key} size={13} /> {cat.label}
              </SelectChip>
            ))}
          </div>
        </Field>

        <Field label="De quién" hint="(opcional)" spacing="group">
          <div className="flex flex-wrap gap-2">
            {buildAssignees(members, kids).map(a => (
              <SelectChip
                key={a.key}
                selected={assigneeKeyOf(draft) === a.key}
                onClick={() => patch({ child_id: a.child_id, member_id: a.member_id })}
                selectedColor={a.key === 'familia' ? undefined : a.color}
              >
                {a.name}
              </SelectChip>
            ))}
          </div>
        </Field>

        <Field label="Descripción" htmlFor="doc-description" hint="(opcional)">
          <input
            id="doc-description"
            type="text"
            value={draft.description}
            onChange={e => patch({ description: e.target.value })}
            placeholder="Ej: Revisión 2026"
            className="field-input"
          />
        </Field>

        {/* Opcional a propósito: la mayoría de documentos no caducan y obligar a
            poner fecha convertiría subir un papel en un interrogatorio. Los que
            sí caducan —DNI, seguro, ITV— son justo los que se pasan sin avisar,
            y de esta fecha tira el aviso diario. */}
        <Field label="Caduca el" htmlFor="doc-expires" hint="(opcional)">
          <input
            id="doc-expires"
            type="date"
            value={draft.expires_on}
            onChange={e => patch({ expires_on: e.target.value })}
            className="field-input"
          />
        </Field>
      </form>
    </BottomSheet>
  )
}
