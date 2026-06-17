'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { Child, ChildDraft } from '@/types'

type Mode = 'create' | 'edit'

interface ChildSheetProps {
  open: boolean
  mode: Mode
  initial?: Child | null
  onClose: () => void
  onCreate: (draft: ChildDraft) => void
  onUpdate: (id: string, draft: ChildDraft) => void
  onDelete: (id: string) => void
}

const PALETTE = ['#D8A48F', '#8BA888', '#E9C46A', '#7EB8D4', '#B39DDB', '#F4A261', '#A8D5A2', '#F08080']

function initDraft(mode: Mode, initial: Child | null | undefined): ChildDraft {
  if (mode === 'edit' && initial) {
    return { name: initial.name, birth_date: initial.birth_date ?? '', color: initial.color }
  }
  return { name: '', birth_date: '', color: PALETTE[0] }
}

export function ChildSheet({ open, mode, initial, onClose, onCreate, onUpdate, onDelete }: ChildSheetProps) {
  const [draft, setDraft] = useState<ChildDraft>(() => initDraft(mode, initial))
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && mode === 'create') setTimeout(() => inputRef.current?.focus(), 300)
  }, [open, mode])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const deleteAction = mode === 'edit' ? (
    <button
      type="button"
      onClick={handleDelete}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'
      }`}
    >
      <Trash2 size={13} />
      {confirmDelete ? 'Confirmar' : 'Eliminar'}
    </button>
  ) : undefined

  const footer = (
    <div className="px-5 pb-8 pt-3">
      <Button
        type="submit"
        form="child-form"
        fullWidth
        size="lg"
        disabled={!draft.name.trim()}
      >
        {mode === 'create' ? 'Añadir hijo' : 'Guardar cambios'}
      </Button>
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir hijo' : 'Editar hijo'}
      onClose={onClose}
      headerActions={deleteAction}
      footer={footer}
    >
      <form id="child-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
          <input
            ref={inputRef}
            type="text"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Nombre del niño o niña"
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Fecha de nacimiento</label>
          <input
            type="date"
            value={draft.birth_date}
            onChange={e => setDraft(d => ({ ...d, birth_date: e.target.value }))}
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Color</label>
          <div className="grid grid-cols-8 gap-2">
            {PALETTE.map(color => {
              const selected = draft.color === color
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, color }))}
                  className="aspect-square rounded-full transition-transform"
                  style={{
                    backgroundColor: color,
                    boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
                    transform: selected ? 'scale(1.2)' : 'scale(1)',
                  }}
                  aria-label={color}
                />
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#FAF7F2] rounded-2xl px-4 py-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0"
            style={{ backgroundColor: draft.color }}
          >
            {draft.name ? draft.name.charAt(0).toUpperCase() : '?'}
          </span>
          <div>
            <p className="font-bold text-[#252525] text-sm">{draft.name || 'Nombre del hijo'}</p>
            <p className="text-xs text-[#77716A]">{draft.birth_date || 'Fecha de nacimiento'}</p>
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
