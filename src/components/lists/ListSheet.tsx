'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDeleteBody, ConfirmDeleteFooter } from '@/components/ui/ConfirmDelete'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDeleteDialog, useSheetForm } from '@/hooks/useSheetForm'
import { validateListDraft } from '@/lib/validators'
import { useT } from '@/lib/i18n/contexto'
import type { List, ListDraft } from '@/types'

// Cada icono nombra una lista de la casa de un vistazo. Son 24 a propósito:
// tres filas de ocho justas, y cada línea de aquí abajo es una fila.
// La primera parte la compra como el súper (🥕 fruta y verdura, 🧊 la nevera
// que Unicode no tiene, ☕ el desayuno), la segunda es la casa y quien vive en
// ella, y la tercera el ocio. El 📋 va al final por ser el que viene puesto.
// Fuera lo que no decía nada (🍎, 🍼) o repetía a otro: la bombilla era la
// misma lista de arreglos que el 🔧 y la hoja de papeleo, el propio 📋.
const EMOJIS = [
  '🛒', '🥕', '🥛', '🍖', '🧊', '☕', '🥤', '💊',
  '🧼', '🧽', '🧺', '🔧', '🚗', '👶', '🐾', '🎒',
  '📚', '⚽', '🎮', '🎬', '✈️', '🎁', '🎀', '📋',
]

interface ListSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: List | null
  /** Cuántos ítems tiene la lista que se edita: es lo que se lleva por delante borrarla. */
  itemsCount?: number
  onClose: () => void
  onCreate: (draft: ListDraft) => void
  onUpdate: (id: string, draft: ListDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: 'create' | 'edit', initial: List | null | undefined): ListDraft {
  if (mode === 'edit' && initial) return { name: initial.name, emoji: initial.emoji ?? '📋' }
  return { name: '', emoji: '📋' }
}

export function ListSheet({ open, mode, initial, itemsCount = 0, onClose, onCreate, onUpdate, onDelete }: ListSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ListDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateListDraft,
  })
  // Borrar una lista se lleva sus ítems (`list_items` cuelga de ella con
  // `on delete cascade`) y desde el sheet no se ve ni uno, así que pregunta en
  // vez de armarse al primer toque.
  const { preguntando, preguntar, cancelar, confirmar } = useSheetDeleteDialog({ open, initial, onDelete, onClose })
  const t = useT().listas.listSheet

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') onCreate(valid)
    else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={preguntando ? t.eliminarLista : mode === 'create' ? t.nuevaLista : t.editarLista}
      // Con la pregunta puesta, cerrar es volver al formulario: la X, Escape y el
      // overlay hacen lo mismo que «Cancelar», y lo escrito sigue donde estaba.
      onClose={preguntando ? cancelar : onClose}
      footer={preguntando ? (
        <ConfirmDeleteFooter confirmLabel={t.siEliminar} onConfirm={confirmar} onCancel={cancelar} />
      ) : (
        <SheetFooter
          form="list-form"
          submitLabel={mode === 'create' ? t.crearLista : t.guardar}
          error={formError}
          onDelete={mode === 'edit' ? { onClick: preguntar, idleLabel: t.eliminarLista } : undefined}
        />
      )}
    >
      {preguntando ? (
        <ConfirmDeleteBody>
          <p>
            {t.seBorraLaLista}<strong className="text-ink">{t.nombreEntreComillas(initial?.name ?? '')}</strong>{t.noSePuedeDeshacer}
          </p>
          {itemsCount > 0 && <p>{t.conElla(itemsCount)}</p>}
        </ConfirmDeleteBody>
      ) : (
        <form id="list-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
          <Field label={t.nombre} htmlFor="list-name">
            <input
              id="list-name"
              ref={firstFieldRef}
              type="text"
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder={t.ejemplo}
              required
              className="field-input"
            />
          </Field>

          <Field label={t.icono} spacing="group">
            <EmojiPicker opciones={EMOJIS} value={draft.emoji} onChange={emoji => patch({ emoji })} />
          </Field>
        </form>
      )}
    </BottomSheet>
  )
}
