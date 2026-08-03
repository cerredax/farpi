'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { validateListDraft } from '@/lib/validators'
import type { List, ListDraft } from '@/types'

const EMOJIS = ['🛒', '🍎', '💊', '🎒', '🏠', '📚', '🎮', '🐾', '✈️', '🎁', '📋', '🧺', '🔧', '💡', '🌿', '🎨']

interface ListSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: List | null
  onClose: () => void
  onCreate: (draft: ListDraft) => void
  onUpdate: (id: string, draft: ListDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: List | null | undefined): ListDraft {
  if (mode === 'edit' && initial) return { name: initial.name, emoji: initial.emoji ?? '📋' }
  return { name: '', emoji: '📋' }
}

export function ListSheet({ open, mode, initial, onClose, onCreate, onUpdate, onDelete }: ListSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ListDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateListDraft,
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
      title={mode === 'create' ? 'Nueva lista' : 'Editar lista'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="list-form"
          submitLabel={mode === 'create' ? 'Crear lista' : 'Guardar'}
          disabled={!draft.name.trim()}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar lista', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="list-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Nombre" htmlFor="list-name">
          <input
            id="list-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Ej: Compra del fin de semana"
            required
            className="field-input"
          />
        </Field>

        <Field label="Icono" spacing="group">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => patch({ emoji })}
                className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-colors ${draft.emoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-canvas hover:bg-surface'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>
      </form>
    </BottomSheet>
  )
}
