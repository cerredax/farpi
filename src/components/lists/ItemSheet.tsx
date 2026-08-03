'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { validateListItemDraft } from '@/lib/validators'
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
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ListItemDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateListItemDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') onCreate(valid)
    else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir ítem' : 'Editar ítem'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="item-form"
          submitLabel={mode === 'create' ? 'Añadir' : 'Guardar'}
          disabled={!draft.text.trim()}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar ítem', confirmLabel: 'Confirmar' }
            : undefined}
        />
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        <Field label="Ítem" htmlFor="item-text">
          <input
            id="item-text"
            ref={firstFieldRef}
            type="text"
            value={draft.text}
            onChange={e => patch({ text: e.target.value })}
            placeholder="Ej: Leche entera"
            required
            className="field-input"
          />
        </Field>
      </form>
    </BottomSheet>
  )
}
