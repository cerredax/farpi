'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { Suggestions } from '@/components/ui/Suggestions'
import { PLATOS_SUGERIDOS } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'
import { editableMealSlots } from '@/lib/meal-slots'
import { selectSuggestions } from '@/lib/selectors'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { validateMealDraft } from '@/lib/validators'
import type { MealPlan, MealDraft, MealSlot } from '@/types'

interface MealSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: MealPlan | null
  defaultDate?: string
  defaultSlot?: MealSlot
  /** Las franjas que la familia ve. Migración 019; nunca llega vacía. */
  slots: MealSlot[]
  occupiedSlots?: MealSlot[]
  /** Platos ya usados por la familia; de aquí salen las sugerencias. */
  historial?: string[]
  onClose: () => void
  onCreate: (draft: MealDraft) => void
  onUpdate: (id: string, draft: MealDraft) => void
  onDelete: (id: string) => void
}

/**
 * La franja preseleccionada al crear. Era siempre la comida, y sigue siéndolo
 * mientras se vea: es la que más se apunta. Si la familia la ha ocultado se coge
 * la primera visible, porque preseleccionar un chip que no está en pantalla deja
 * el formulario diciendo una cosa y guardando otra.
 */
function slotPorDefecto(visibles: MealSlot[], pedida?: MealSlot): MealSlot {
  if (pedida && visibles.includes(pedida)) return pedida
  if (visibles.includes('lunch')) return 'lunch'
  return visibles[0]
}

function initDraft(
  mode: 'create' | 'edit',
  initial: MealPlan | null | undefined,
  visibles: MealSlot[],
  defaultDate?: string,
  defaultSlot?: MealSlot,
): MealDraft {
  if (mode === 'edit' && initial) {
    return { date: initial.date, slot: initial.slot, name: initial.name, notes: initial.notes ?? '' }
  }
  return {
    date: defaultDate ?? getLocalDateString(),
    slot: slotPorDefecto(visibles, defaultSlot),
    name: '',
    notes: '',
  }
}

/** Las clases van literales: Tailwind no ve una clase construida en tiempo de ejecución. */
const COLUMNAS_FRANJA: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

export function MealSheet({
  open,
  mode,
  initial,
  defaultDate,
  defaultSlot,
  slots,
  occupiedSlots = [],
  historial = [],
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: MealSheetProps) {
  // Al editar se añade la franja de la propia comida aunque esté oculta: si no,
  // una merienda apuntada antes de ocultar la merienda no se podría ni abrir.
  const franjas = editableMealSlots(slots, mode === 'edit' ? initial?.slot : undefined)

  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<MealDraft>({
    open,
    initialDraft: () => initDraft(mode, initial, franjas.map(f => f.key), defaultDate, defaultSlot),
    validate: validateMealDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  // El campo "Plato" hace de buscador del recetario: lo que se teclea filtra los
  // platos ya cocinados. Con tope de 5 no se veía como tal —salían siempre los
  // mismos y había que reescribir el resto—, así que aquí se abre el catálogo
  // entero y el bloque pasa a ser scrollable.
  const sugerencias = selectSuggestions(historial, draft.name, PLATOS_SUGERIDOS)
  const buscando = draft.name.trim().length > 0

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') onCreate(valid)
    else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Añadir comida' : 'Editar comida'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="meal-form"
          submitLabel={mode === 'create' ? 'Guardar comida' : 'Guardar cambios'}
          disabled={!draft.name.trim() || !draft.date}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar comida', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="meal-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Fecha" htmlFor="meal-date">
          <input
            id="meal-date"
            type="date"
            value={draft.date}
            onChange={e => patch({ date: e.target.value })}
            required
            className="field-input"
          />
        </Field>

        <Field label="Franja" spacing="group">
          <div className={`grid gap-2 ${COLUMNAS_FRANJA[franjas.length] ?? 'grid-cols-4'}`}>
            {franjas.map(slot => {
              const occupied = mode === 'create' && occupiedSlots.includes(slot.key)
              const selected = draft.slot === slot.key
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => patch({ slot: slot.key })}
                  className={`py-2.5 rounded-xl text-center transition-colors flex flex-col items-center gap-1 relative ${selected ? 'bg-primary text-white' : 'bg-canvas text-muted hover:bg-surface'}`}
                >
                  <span className="text-base">{slot.emoji}</span>
                  <span className="text-[10px] font-bold">{slot.label}</span>
                  {occupied && (
                    <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${selected ? 'bg-white/70' : 'bg-accent'}`} />
                  )}
                </button>
              )
            })}
          </div>
          {mode === 'create' && occupiedSlots.includes(draft.slot) && (
            <p className="text-[11px] text-accent font-semibold flex items-center gap-1">
              <span>↻</span> Este horario ya tiene plato — se reemplazará
            </p>
          )}
        </Field>

        <Field label="Plato" htmlFor="meal-name">
          <input
            id="meal-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Busca un plato o escribe uno nuevo"
            required
            className="field-input"
          />
          <Suggestions
            values={sugerencias}
            onPick={name => patch({ name })}
            scroll
            label={buscando
              ? `Ya lo habéis hecho (${sugerencias.length})`
              : 'Los que más repetís'}
          />
          {buscando && sugerencias.length === 0 && historial.length > 0 && (
            <p className="text-[11px] text-faint">Plato nuevo: no lo habíais apuntado nunca.</p>
          )}
        </Field>

        <Field label="Notas" htmlFor="meal-notes" hint="(opcional)">
          <input
            id="meal-notes"
            type="text"
            value={draft.notes}
            onChange={e => patch({ notes: e.target.value })}
            placeholder="Ej: Sin cebolla"
            className="field-input"
          />
        </Field>
      </form>
    </BottomSheet>
  )
}
