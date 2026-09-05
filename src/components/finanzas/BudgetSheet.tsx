'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { centsToInput } from '@/lib/finanzas'
import { validateBudgetDraft } from '@/lib/validators'
import type { Budget, BudgetDraft } from '@/types'

// Veinticuatro iconos, tres filas de ocho, en la línea de `ListSheet` y
// `NoteSheet`. Son las cosas en las que gasta una casa; el 💶 va al final por ser
// el que viene puesto y valer para cualquiera.
//
// **Eran dieciséis hasta el 04-09-2026** y se pidió más variedad, «incluido uno de
// limpieza». La fila que entra son gastos de casa que no tenían dónde caer y que
// además son de los que **varían**, que es la regla de esta pestaña: la limpieza,
// la peluquería, los libros del cole, el café, los arreglos, las plantas, los
// juguetes y la farmacia. Ocho y no los que fueran, para que la rejilla siga
// cuadrando a ocho por fila.
//
// La bombilla se fue el 02-09-2026 y entraron las cañas. No es capricho: la luz
// es un **fijo**, se paga clavada y no se le pone partida —colgarla de una la
// llenaría sola, que es la regla que separa las dos pestañas—, así que ofrecerla
// aquí invitaba justo a lo que no hay que hacer. Salir es de lo primero en lo que
// una casa se pasa, y no tenía icono. La 💡 sigue, donde sí toca, en los fijos.
const EMOJIS = [
  '🛒', '🏠', '🚗', '🎒', '🏥', '👶', '🍽️', '👕',
  '🐾', '✈️', '🎁', '📱', '🍺', '🎬', '🏋️', '🧽',
  '💊', '💇', '🧸', '📚', '☕', '🪴', '🔧', '💶',
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
 * Abrir una partida de gasto al mes: la compra, el ocio, el coche.
 *
 * Es para **lo que varía**. Lo que se paga clavado todos los meses —el alquiler,
 * la luz— va en Fijos, y colgarlo de una partida la llenaría sola sin que nadie
 * haya apuntado nada.
 *
 * Tres campos y ninguno más: nombre, cuánto y un icono. No se elige mes —la
 * partida vale desde ya y hasta que se cambie— ni persona —una partida es de la
 * casa, y en Farpi el color y el nombre de alguien significan "esto lo lleva tal",
 * que no es lo mismo—.
 *
 * El aviso de borrado dice qué pasa con los apuntes, porque no es evidente y es
 * la duda que frena: se quedan, sin partida. Nadie pierde el mes de agosto por
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
      title={initial ? 'Editar partida' : 'Nueva partida'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="budget-form"
          submitLabel={initial ? 'Guardar' : 'Crear partida'}
          disabled={!draft.name.trim() || !draft.monthly_limit.trim()}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar partida', confirmLabel: 'Confirmar eliminación' }
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
            Si la eliminas, los gastos que tenía se quedan apuntados y pasan a
            «Sin partida».
          </p>
        )}
      </form>
    </BottomSheet>
  )
}
