'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { centsToInput } from '@/lib/finanzas'
import { validateBudgetDraft } from '@/lib/validators'
import type { Budget, BudgetDraft } from '@/types'

// Dieciséis iconos, dos filas de ocho, en la línea de `ListSheet` y `NoteSheet`.
// Son las cosas en las que gasta una casa; el 💶 va al final por ser el que
// viene puesto y valer para cualquiera.
const EMOJIS = [
  '🛒', '🏠', '🚗', '🎒', '🏥', '👶', '🍽️', '👕',
  '🐾', '✈️', '🎁', '📱', '💡', '🎬', '🏋️', '💶',
]

interface BudgetSheetProps {
  open: boolean
  initial?: Budget | null
  onClose: () => void
  onSave: (draft: BudgetDraft) => void
  onDelete: (id: string) => void
}

function initDraft(initial: Budget | null | undefined): BudgetDraft {
  if (initial) {
    return {
      name: initial.name,
      emoji: initial.emoji ?? '💶',
      monthly_limit: centsToInput(initial.monthly_limit_cents),
    }
  }
  return { name: '', emoji: '💶', monthly_limit: '' }
}

/**
 * Poner un tope de gasto al mes: la compra, el ocio, el coche.
 *
 * Es para **lo que varía**. Lo que se paga clavado todos los meses —el alquiler,
 * la luz— va en Fijos, y colgarlo de un tope lo llenaría solo sin que nadie haya
 * apuntado nada.
 *
 * Tres campos y ninguno más: nombre, cuánto y un icono. No se elige mes —el tope
 * vale desde ya y hasta que se cambie— ni persona —un tope es de la casa, y en
 * Farpi el color y el nombre de alguien significan "esto lo lleva tal", que no es
 * lo mismo—.
 *
 * El aviso de borrado dice qué pasa con los movimientos, porque no es evidente y
 * es la duda que frena: se quedan, sin tope. Nadie pierde el mes de agosto por
 * reorganizar las categorías en septiembre.
 */
export function BudgetSheet({ open, initial, onClose, onSave, onDelete }: BudgetSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<BudgetDraft>({
    open,
    initialDraft: () => initDraft(initial),
    validate: validateBudgetDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    onSave(valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={initial ? 'Editar tope' : 'Nuevo tope'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="budget-form"
          submitLabel={initial ? 'Guardar' : 'Crear tope'}
          disabled={!draft.name.trim() || !draft.monthly_limit.trim()}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar tope', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="budget-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Nombre" htmlFor="budget-name">
          <input
            id="budget-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Ej: Compra"
            required
            className="field-input"
          />
        </Field>

        <Field label="Al mes" htmlFor="budget-limit">
          <input
            id="budget-limit"
            type="text"
            inputMode="decimal"
            value={draft.monthly_limit}
            onChange={e => patch({ monthly_limit: e.target.value })}
            placeholder="Ej: 300"
            required
            className="field-input"
          />
          <p className="text-[10px] leading-relaxed text-faint">
            Vale todos los meses hasta que lo cambies. Cambiarlo no toca lo ya
            apuntado.
          </p>
        </Field>

        <Field label="Icono" spacing="group">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => patch({ emoji })}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-colors ${draft.emoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-canvas hover:bg-surface'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>

        {initial && (
          <p className="text-[10px] leading-relaxed text-faint">
            Si lo eliminas, los gastos que tenía se quedan apuntados y pasan a
            «Sin tope».
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
