'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { useStore } from '@/lib/store-context'
import { centsToInput } from '@/lib/finanzas'
import { validateExpenseDraft } from '@/lib/validators'
import type { Budget, Expense, ExpenseDraft } from '@/types'

interface ExpenseSheetProps {
  open: boolean
  initial?: Expense | null
  /** Con qué fecha nace un apunte nuevo: hoy, o el día 1 si se mira otro mes. */
  fechaPorDefecto: string
  budgets: Budget[]
  onClose: () => void
  onSave: (draft: ExpenseDraft) => void
  onDelete: (id: string) => void
}

function initDraft(initial: Expense | null | undefined, fechaPorDefecto: string): ExpenseDraft {
  if (initial) {
    return {
      kind: initial.kind,
      amount: centsToInput(initial.amount_cents),
      date: initial.date,
      description: initial.description ?? '',
      budget_id: initial.budget_id,
      child_id: initial.child_id,
      member_id: initial.member_id,
    }
  }
  // Nace como gasto: es lo que se apunta noventa y nueve veces de cada cien. Lo
  // que entra de verdad todos los meses son los fijos, no esto.
  return { kind: 'gasto', amount: '', date: fechaPorDefecto, description: '', budget_id: null, child_id: null, member_id: null }
}

/**
 * Apuntar: un gasto, o un ingreso que no es de todos los meses —una devolución,
 * un trabajo suelto, el regalo de la abuela—. Es el formulario que más se usa de
 * esta pantalla y por eso es el más corto que puede ser.
 *
 * **La partida solo se pregunta en los gastos.** En un ingreso el campo no está,
 * porque no hay nada que elegir: una partida mide lo que se gasta y una devolución
 * de 40 € no puede liberar 40 € de la compra. Se esconde en vez de deshabilitarse
 * —un campo apagado obliga a preguntarse por qué— y al cambiar a ingreso la
 * partida ya elegida se suelta, que es lo que van a guardar el mock y Supabase.
 *
 * El importe es el primer campo y el que recibe el foco. Va como `inputMode`
 * decimal y no como `type="number"`: el numérico del navegador trae flechas de
 * subir y bajar que aquí no significan nada, se lleva mal con la coma en varios
 * teclados móviles y deja escribir notación científica. El texto lo entiende
 * `parseAmountToCents`, que acepta coma y punto porque el teclado de cada móvil
 * ofrece uno u otro.
 *
 * "Quién lo pagó" reutiliza el selector de personas de eventos y tareas, con lo
 * que significa aquí: sin elegir a nadie, el gasto es de la casa. Eso es lo
 * normal —la cuenta común— y por eso es lo que viene puesto.
 */
export function ExpenseSheet({ open, initial, fechaPorDefecto, budgets, onClose, onSave, onDelete }: ExpenseSheetProps) {
  const { members, kids } = useStore()
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<ExpenseDraft>({
    open,
    initialDraft: () => initDraft(initial, fechaPorDefecto),
    validate: validateExpenseDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const esIngreso = draft.kind === 'ingreso'

  const handleSubmit = submitHandler(valid => {
    onSave(valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={initial ? 'Editar apunte' : 'Nuevo apunte'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="expense-form"
          submitLabel={initial ? 'Guardar' : esIngreso ? 'Apuntar ingreso' : 'Apuntar gasto'}
          disabled={!draft.amount.trim()}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar apunte', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Qué es" spacing="group">
          <div className="flex gap-2">
            <SelectChip
              selected={!esIngreso}
              onClick={() => patch({ kind: 'gasto' })}
            >
              Un gasto
            </SelectChip>
            {/* Al pasar a ingreso se suelta la partida: si se quedara puesta, el
                `check` de la base rechazaría la fila y el mock guardaría algo
                distinto de lo que enseñó el formulario. */}
            <SelectChip
              selected={esIngreso}
              onClick={() => patch({ kind: 'ingreso', budget_id: null })}
            >
              Un ingreso
            </SelectChip>
          </div>
        </Field>

        <Field label="Cuánto" htmlFor="expense-amount">
          <input
            id="expense-amount"
            ref={firstFieldRef}
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={e => patch({ amount: e.target.value })}
            placeholder="Ej: 24,90"
            required
            className="field-input"
          />
        </Field>

        <Field label="Cuándo" htmlFor="expense-date">
          <input
            id="expense-date"
            type="date"
            value={draft.date}
            onChange={e => patch({ date: e.target.value })}
            required
            className="field-input"
          />
        </Field>

        <Field label="Qué fue" htmlFor="expense-description" hint="(opcional)">
          <input
            id="expense-description"
            type="text"
            value={draft.description}
            onChange={e => patch({ description: e.target.value })}
            placeholder={esIngreso ? 'Ej: Devolución de la compra' : 'Ej: Compra semanal'}
            className="field-input"
          />
        </Field>

        {/* Sin partida es una opción de verdad y va la primera: la mitad de los
            gastos de una casa no caen en ninguna categoría, y obligar a elegir
            una haría que se apuntaran mal o no se apuntaran. */}
        {!esIngreso && (
          <Field label="De qué partida sale" spacing="group">
            <div className="flex flex-wrap gap-2">
              <SelectChip selected={draft.budget_id === null} onClick={() => patch({ budget_id: null })}>
                Sin partida
              </SelectChip>
              {budgets.map(budget => (
                <SelectChip
                  key={budget.id}
                  selected={draft.budget_id === budget.id}
                  onClick={() => patch({ budget_id: budget.id })}
                >
                  {budget.emoji && <span aria-hidden>{budget.emoji}</span>}
                  {budget.name}
                </SelectChip>
              ))}
            </div>
          </Field>
        )}

        <div className="space-y-2">
          <AssigneePicker
            value={draft}
            onChange={asignado => patch(asignado)}
            members={members}
            kids={kids}
          />
          <p className="text-[10px] leading-relaxed text-faint">
            {esIngreso
              ? 'Quién lo ha traído. Con «Familia» queda como algo que entra a la cuenta común. Los ingresos no cuentan en el reparto de abajo, que es solo de gastos.'
              : 'Quién puso el dinero. Con «Familia» queda como gasto de la cuenta común. Farpi no lleva cuentas de quién debe qué a quién: solo enseña el reparto.'}
          </p>
        </div>
      </form>
    </BottomSheet>
  )
}
