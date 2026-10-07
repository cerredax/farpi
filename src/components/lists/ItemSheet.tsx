'use client'

import { FolderInput } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { Suggestions } from '@/components/ui/Suggestions'
import { BotonMicrofono, ErrorDeDictado } from '@/components/ui/BotonMicrofono'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { selectSuggestions } from '@/lib/selectors'
import { validateListItemDraft } from '@/lib/validators'
import { useT } from '@/lib/i18n/contexto'
import type { List, ListItem, ListItemDraft } from '@/types'
import { PropuestaDeItems, useDictarItems } from './useDictarItems'

interface ItemSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: ListItem | null
  /** Ítems ya apuntados por la familia; de aquí salen las sugerencias. */
  historial?: string[]
  /**
   * El título del sheet, cuando hay que decir **en qué lista** cae lo que se
   * apunta. Dentro de una lista sobra —ya se está mirando—, pero desde Inicio
   * el sheet aparece encima de la pantalla de hoy y "Añadir ítem" no dice a
   * dónde va.
   */
  titulo?: string
  /**
   * Las listas de la casa, para que lo dictado pueda decir a cuál va («…a la
   * ferretería»). Sin ellas se dicta igual y todo cae en la lista de siempre.
   */
  listas?: List[]
  /**
   * Mandar el ítem a otra lista. **Sin él no hay botón**: con una sola lista no
   * hay a dónde mover, y desde Inicio esto se abre solo para apuntar.
   *
   * Vive aquí desde el 09-09-2026. Estaba en la propia fila, junto a la papelera
   * y a los dos botones de las unidades: cuatro objetivos de 28 px a 2 px unos
   * de otros en el borde por donde pasa el pulgar. Aquí cabe con su nombre
   * escrito, que además dice lo que hace.
   */
  onMove?: () => void
  onClose: () => void
  /** `listaId` solo llega si al dictar se dijo una lista; si no, la de siempre. */
  onCreate: (draft: ListItemDraft, listaId?: string) => void
  onUpdate: (id: string, draft: ListItemDraft) => void
  onDelete: (id: string) => void
}

// Sin `list_id`: aquí solo se renombra. Mover es cosa del MoveItemSheet, y
// mandar la lista en cada edición obligaría a este formulario a saber en cuál
// está el ítem para no moverlo a ninguna parte.
function initDraft(mode: 'create' | 'edit', initial: ListItem | null | undefined): ListItemDraft {
  return { text: mode === 'edit' && initial ? initial.text : '' }
}

export function ItemSheet({ open, mode, initial, historial = [], titulo, listas = [], onMove, onClose, onCreate, onUpdate, onDelete }: ItemSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ListItemDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateListItemDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })
  const t = useT().listas.itemSheet

  const sugerencias = selectSuggestions(historial, draft.text)

  // Lo dictado no pasa por el campo de texto: se enseña aparte, partido en ítems y
  // con su lista, y se guarda al confirmar. Un ítem escrito a mano sigue siendo uno.
  const { dictado, propuesta, confirmar, descartar } = useDictarItems(listas, (items, listaId) => {
    items.forEach(text => onCreate({ text }, listaId ?? undefined))
    onClose()
  })

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') onCreate(valid)
    else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={titulo ?? (mode === 'create' ? t.anadirItem : t.editarItem)}
      onClose={onClose}
      footer={
        <SheetFooter
          form="item-form"
          submitLabel={mode === 'create' ? t.anadir : t.guardar}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: t.eliminarItem, confirmLabel: t.confirmar }
            : undefined}
        />
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-4">
        <Field label={t.item} htmlFor="item-text">
          <input
            id="item-text"
            ref={firstFieldRef}
            type="text"
            value={draft.text}
            onChange={e => patch({ text: e.target.value })}
            placeholder={t.ejemplo}
            required
            className="field-input"
          />
          <Suggestions
            values={sugerencias}
            onPick={text => patch({ text })}
            label={draft.text.trim() ? t.coincidencias : t.losQueMasApuntais}
          />
        </Field>

        {/* Dictar solo al apuntar algo nuevo; sin soporte, el botón no se pinta. */}
        {mode === 'create' && dictado.soportado && (
          <div className="space-y-2">
            <BotonMicrofono dictado={dictado} />
            <ErrorDeDictado dictado={dictado} />
            <PropuestaDeItems propuesta={propuesta} listas={listas} onConfirmar={confirmar} onDescartar={descartar} />
          </div>
        )}

        {/* Fuera del `SheetFooter`, que es solo para guardar y borrar: mover no
            es ninguna de las dos: es llevarse el ítem a otro sitio tal cual. */}
        {mode === 'edit' && onMove && (
          <button
            type="button"
            onClick={onMove}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-sm font-semibold text-ink transition-colors hover:bg-surface"
          >
            <FolderInput size={15} strokeWidth={2.2} aria-hidden />
            {t.moverAOtraLista}
          </button>
        )}
      </form>
    </BottomSheet>
  )
}
