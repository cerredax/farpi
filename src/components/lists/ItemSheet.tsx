'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { ListItem, ListItemDraft } from '@/types'

interface ItemSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ListItem | null
  onClose: () => void
  onCreate: (draft: ListItemDraft) => void
  onUpdate: (id: string, draft: ListItemDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: ListItem | null | undefined): ListItemDraft {
  if (mode === 'edit' && initial) return { text: initial.text }
  return { text: '' }
}

export function ItemSheet({ open, mode, initial, onClose, onCreate, onUpdate, onDelete }: ItemSheetProps) {
  const [draft, setDraft] = useState<ListItemDraft>(() => initDraft(mode, initial))
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.text.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const footer = (
    <div className="px-5 pb-8 pt-3 space-y-2">
      <Button type="submit" form="item-form" fullWidth size="lg" disabled={!draft.text.trim()}>
        {mode === 'create' ? 'Añadir' : 'Guardar'}
      </Button>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={15} />
            {confirmDelete ? 'Confirmar' : 'Eliminar ítem'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir ítem' : 'Editar ítem'}
      onClose={onClose}
      footer={footer}
    >
      <form id="item-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Ítem</label>
          <input
            ref={inputRef}
            type="text"
            value={draft.text}
            onChange={e => setDraft({ text: e.target.value })}
            placeholder="Ej: Leche entera"
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>
      </form>
    </BottomSheet>
  )
}
