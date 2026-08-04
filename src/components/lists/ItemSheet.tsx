'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { Suggestions } from '@/components/ui/Suggestions'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { selectSuggestions } from '@/lib/selectors'
import { validateListItemDraft } from '@/lib/validators'
import type { List, ListItem, ListItemDraft } from '@/types'

interface ItemSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ListItem | null
  /** Ítems ya apuntados por la familia; de aquí salen las sugerencias. */
  historial?: string[]
  /** Listas de la familia, para poder mover el ítem de una a otra al editar. */
  lists?: List[]
  onClose: () => void
  onCreate: (draft: ListItemDraft) => void
  onUpdate: (id: string, draft: ListItemDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: ListItem | null | undefined): ListItemDraft {
  if (mode === 'edit' && initial) return { text: initial.text, list_id: initial.list_id }
  return { text: '' }
}

export function ItemSheet({ open, mode, initial, historial = [], lists = [], onClose, onCreate, onUpdate, onDelete }: ItemSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ListItemDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateListItemDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const sugerencias = selectSuggestions(historial, draft.text)

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
          <Suggestions
            values={sugerencias}
            onPick={text => patch({ text })}
            label={draft.text.trim() ? 'Coincidencias' : 'Los que más apuntáis'}
          />
        </Field>

        {/* Solo al editar: un ítem se apunta donde estás, pero luego se
            descubre que iba en otra cesta. Con una sola lista no hay a dónde
            moverlo, así que el campo ni aparece. */}
        {mode === 'edit' && lists.length > 1 && (
          <Field label="Lista" htmlFor="item-list">
            <select
              id="item-list"
              value={draft.list_id ?? ''}
              onChange={e => patch({ list_id: e.target.value })}
              className="field-input"
            >
              {lists.map(list => (
                <option key={list.id} value={list.id}>
                  {list.emoji ?? '📋'} {list.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </form>
    </BottomSheet>
  )
}
