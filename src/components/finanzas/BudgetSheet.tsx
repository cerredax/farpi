'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ConfirmDeleteBody, ConfirmDeleteFooter } from '@/components/ui/ConfirmDelete'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDeleteDialog, useSheetForm } from '@/hooks/useSheetForm'
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
 *
 * **Ese aviso se mudó al diálogo de confirmación** (08-09-2026) y con él se fue la
 * letra pequeña del formulario, igual que pasó en el cierre del mes: contaba a 10
 * px, todo el rato, lo que solo importa en el momento de pulsar. Y borrar una
 * partida es de lo que no se ve —toca los gastos y las líneas de los meses ya
 * cerrados—, así que pregunta en vez de armarse al primer toque.
 */
export function BudgetSheet({ open, initial, onClose, onSave, onDelete }: BudgetSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<BudgetDraft>({
    open,
    initialDraft: () => initDraft(initial),
    validate: validateBudgetDraft,
  })
  const { preguntando, preguntar, cancelar, confirmar } = useSheetDeleteDialog({ open, initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    onSave(valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={preguntando ? 'Eliminar partida' : initial ? 'Editar partida' : 'Nueva partida'}
      onClose={preguntando ? cancelar : onClose}
      footer={preguntando ? (
        <ConfirmDeleteFooter confirmLabel="Sí, eliminar la partida" onConfirm={confirmar} onCancel={cancelar} />
      ) : (
        <SheetFooter
          form="budget-form"
          submitLabel={initial ? 'Guardar' : 'Crear partida'}
          disabled={!draft.name.trim() || !draft.monthly_limit.trim()}
          error={formError}
          onDelete={initial ? { onClick: preguntar, idleLabel: 'Eliminar partida' } : undefined}
        />
      )}
    >
      {preguntando ? (
        <ConfirmDeleteBody>
          <p>
            Se quita la partida <strong className="text-ink">«{initial?.name}»</strong> y su tope al
            mes.
          </p>
          <p>
            Los gastos que tenía <strong className="text-ink">se quedan apuntados</strong> y pasan a
            «Sin partida»; los meses ya cerrados siguen enseñándola tal como estaba.
          </p>
        </ConfirmDeleteBody>
      ) : (
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
            <EmojiPicker opciones={EMOJIS} value={draft.emoji} onChange={emoji => patch({ emoji })} />
          </Field>
        </form>
      )}
    </BottomSheet>
  )
}
