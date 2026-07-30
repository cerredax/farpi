'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DeleteButton } from '@/components/ui/DeleteButton'
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
        <DeleteButton confirming={confirmDelete} onClick={handleDelete} idleLabel="Eliminar ítem" confirmLabel="Confirmar" />
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
          <label htmlFor="item-text" className="field-label">Ítem</label>
          <input
            id="item-text"
            ref={inputRef}
            type="text"
            value={draft.text}
            onChange={e => setDraft({ text: e.target.value })}
            placeholder="Ej: Leche entera"
            required
            className="field-input"
          />
        </div>
      </form>
    </BottomSheet>
  )
}
