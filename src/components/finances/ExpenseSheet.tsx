'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { Suggestions } from '@/components/ui/Suggestions'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { useStore } from '@/lib/store-context'
import { resolveAssignee } from '@/lib/assignees'
import { descripcionesFrecuentes, partidasPorUso } from '@/lib/budgets'
import { getLocalDateString, parseLocalDate } from '@/lib/date-utils'
import { centsToInput } from '@/lib/finanzas'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'
import { validateExpenseDraft } from '@/lib/validators'
import type { Budget, Expense, ExpenseDraft } from '@/types'

/** Lo que se sabe de un apunte antes de que nadie teclee: de dónde sale y cuánto. */
export interface ApunteEmpezado {
  amount: string
  description: string
}

interface ExpenseSheetProps {
  open: boolean
  initial?: Expense | null
  /**
   * Un apunte nuevo que ya viene con algo escrito: el que sale de aceptar un
   * presupuesto. No se mezcla con `initial`, que es un apunte que existe.
   */
  empezado?: ApunteEmpezado | null
  /** Con qué fecha nace un apunte nuevo: hoy, o el día 1 si se mira otro mes. */
  fechaPorDefecto: string
  budgets: Budget[]
  onClose: () => void
  onSave: (draft: ExpenseDraft) => Promise<boolean>
  onDelete: (id: string) => void
}

function initDraft(
  initial: Expense | null | undefined,
  empezado: ApunteEmpezado | null | undefined,
  fechaPorDefecto: string,
): ExpenseDraft {
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
  return {
    kind: 'gasto',
    amount: empezado?.amount ?? '',
    date: fechaPorDefecto,
    description: empezado?.description ?? '',
    budget_id: null,
    child_id: null,
    member_id: null,
  }
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
 *
 * **Lo que ya se ha apuntado otras veces se ofrece** (14-09-2026). Este
 * formulario se abre cincuenta veces al mes y la mitad de esas veces es
 * literalmente lo mismo que la semana pasada —«Compra semanal», «Gasolina»— y se
 * tecleaba entero cada vez. Las sugerencias son las mismas pastillas de las
 * listas y de las comidas, y **traen su partida**: quien apunta «Gasolina» la
 * carga siempre al coche.
 *
 * Y por lo mismo **las partidas se ofrecen por uso** y no por el `sort_order` de
 * «Fijos»: la de la compra se elige cuatro de cada cinco veces, así que es la
 * que tiene que estar la primera. Lo que no cambia es el valor por defecto, que
 * sigue siendo «Sin partida»: la mitad de los gastos de una casa no caen en
 * ninguna, y adivinarla sería apuntar mal en nombre de la comodidad.
 */
export function ExpenseSheet({ open, initial, empezado, fechaPorDefecto, budgets, onClose, onSave, onDelete }: ExpenseSheetProps) {
  const t = useT()
  const textos = t.finanzas.apunte
  const idioma = useIdioma()
  const { members, kids, expenses } = useStore()
  const { draft, patch, formError, firstFieldRef, submitHandler, guardando } = useSheetForm<ExpenseDraft>({
    open,
    initialDraft: () => initDraft(initial, empezado, fechaPorDefecto),
    validate: validateExpenseDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const esIngreso = draft.kind === 'ingreso'

  // Partida, fecha y persona se pueden revisar sin desplegarlas. Al editar o
  // apuntar en otro mes se abren de entrada; cada apertura reinicia el acordeón.
  const hoy = getLocalDateString()
  const quien = resolveAssignee(draft, members, kids)?.name ?? t.comun.familia
  const partida = budgets.find(budget => budget.id === draft.budget_id)?.name ?? textos.sinPartida
  const fecha = draft.date === hoy ? textos.hoy : draft.date
    ? format(parseLocalDate(draft.date), textos.formatoFecha, { locale: localeDeFechas(idioma) })
    : textos.sinFecha

  // Las de su tipo: lo que se repite al apuntar gastos no tiene nada que ver con
  // lo que se repite al apuntar ingresos.
  const sugerencias = useMemo(
    () => descripcionesFrecuentes(expenses, draft.kind),
    [expenses, draft.kind],
  )
  const partidas = useMemo(() => partidasPorUso(budgets, expenses), [budgets, expenses])

  const handleSubmit = submitHandler(valid => onSave(valid), onClose)

  return (
    <BottomSheet
      open={open}
      title={initial ? textos.editar : textos.nuevo}
      onClose={onClose}
      footer={
        <SheetFooter
          form="expense-form"
          disabled={guardando}
          submitLabel={initial ? textos.guardar : esIngreso ? textos.apuntarIngreso : textos.apuntarGasto}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: textos.eliminar, confirmLabel: textos.confirmarEliminacion }
            : undefined}
        />
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2">
        <fieldset disabled={guardando} className="min-w-0 space-y-5">
          <Field label={textos.cuanto} htmlFor="expense-amount">
            <input
              id="expense-amount"
              ref={firstFieldRef}
              type="text"
              inputMode="decimal"
              value={draft.amount}
              onChange={e => patch({ amount: e.target.value })}
              placeholder={textos.ejemploImporte}
              required
              className="field-input"
            />
          </Field>

          {/* Lo de siempre, con su partida detrás. En un ingreso la partida no
              viaja: ahí ni existe el campo, y mandarla rompería el `check` de la
              base. */}
          {sugerencias.length > 0 && (
            <Suggestions
              label={textos.loDeSiempre}
              values={sugerencias.map(x => x.texto)}
              onPick={texto => {
                const elegida = sugerencias.find(x => x.texto === texto)
                patch(esIngreso
                  ? { description: texto }
                  : { description: texto, budget_id: elegida?.budgetId ?? null })
                firstFieldRef.current?.focus()
              }}
            />
          )}

          <Field label={textos.queFue} htmlFor="expense-description" hint={textos.opcional}>
            <input
              id="expense-description"
              type="text"
              value={draft.description}
              onChange={e => patch({ description: e.target.value })}
              placeholder={esIngreso ? textos.ejemploIngreso : textos.ejemploGasto}
              className="field-input"
            />
          </Field>

          <details id="expense-details" key={String(open)} open={!!initial || fechaPorDefecto !== hoy} className="group">
            <summary className="flex min-h-11 list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 break-words text-sm">
                {!esIngreso && <span className="block font-semibold text-ink">{partida}</span>}
                <span className="text-muted">{fecha}{' · '}{quien}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-strong">
                {textos.cambiar}
                <ChevronDown size={14} strokeWidth={2.4} className="transition-transform group-open:rotate-180" aria-hidden />
              </span>
            </summary>
            <div className="space-y-5 pt-3">
              {/* Solo elegir una sugerencia o una partida la asigna. Abrir los
                  detalles nunca cambia el valor inicial «Sin partida». */}
              {!esIngreso && (
                <Field label={textos.deQuePartida} spacing="group">
                  <div className="flex flex-wrap gap-2">
                    <SelectChip selected={draft.budget_id === null} onClick={() => patch({ budget_id: null })}>
                      {textos.sinPartida}
                    </SelectChip>
                    {partidas.map(budget => (
                      <SelectChip key={budget.id} selected={draft.budget_id === budget.id} onClick={() => patch({ budget_id: budget.id })}>
                        {budget.emoji && <span aria-hidden>{budget.emoji}</span>}
                        {budget.name}
                      </SelectChip>
                    ))}
                  </div>
                </Field>
              )}
              <Field label={textos.cuando} htmlFor="expense-date">
                <input
                  id="expense-date"
                  type="date"
                  value={draft.date}
                  onChange={e => patch({ date: e.target.value })}
                  onInvalid={e => e.currentTarget.closest('details')?.setAttribute('open', '')}
                  required
                  className="field-input"
                />
              </Field>
              <div className="space-y-2">
                <AssigneePicker value={draft} onChange={asignado => patch(asignado)} members={members} kids={kids} />
                <p className="text-xs leading-relaxed text-muted">
                  {esIngreso ? textos.quienIngreso : textos.quienGasto}
                </p>
              </div>
            </div>
          </details>
          <Button type="button" variant="ghost" size="sm" fullWidth onClick={() => patch({ kind: esIngreso ? 'gasto' : 'ingreso', budget_id: null })}>
            {esIngreso ? textos.volverAGastos : textos.cambiarAIngreso}
          </Button>
        </fieldset>
      </form>
    </BottomSheet>
  )
}
