'use client'

import { ArrowRight } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetForm } from '@/hooks/useSheetForm'
import { centsToInput, formatCentsCorto } from '@/lib/finanzas'
import { validateFixedOverrideDraft } from '@/lib/validators'
import type { FijoDelMes } from '@/lib/budgets'
import type { FixedOverrideDraft } from '@/types'

interface AjusteDelMesSheetProps {
  open: boolean
  /** El fijo tal y como vale en el mes que se mira. `null` con el sheet cerrado. */
  fijo: FijoDelMes | null
  /** «Septiembre 2026», ya capitalizado. Va en el título y en el campo. */
  nombreDelMes: string
  onClose: () => void
  onSave: (draft: FixedOverrideDraft) => void
  /** Quitar el ajuste. Solo se ofrece si ese mes tiene uno. */
  onQuitar: () => void
  /** Irse a la referencia, en «Lo fijo». Cierra este sheet y abre el del fijo. */
  onEditarFijo: () => void
}

/**
 * Lo que un fijo costó **en este mes**, sin tocar la referencia.
 *
 * **La decisión entera** (05-09-2026). La limpieza son 120 € al mes y hay meses de
 * 150 y meses de 90. Hasta hoy había dos salidas y ninguna servía: cambiar el fijo
 * subía la referencia y con ella todos los meses abiertos —la casa perdía el «esto
 * suele costar 120», que es el dato por el que se pone un fijo—, y apuntar la
 * diferencia en el día a día mezclaba un recibo con la compra y dejaba «Gastos
 * fijos» diciendo lo que no fue.
 *
 * Así que son dos cifras y dos sitios: **la referencia se toca en «Lo fijo»** y el
 * mes se toca aquí. Y por eso este sheet es corto —un campo— en vez de ser el del
 * fijo con un selector de «solo este mes / siempre» arriba: ese selector convierte
 * un formulario en dos, y el que se equivoca de opción no se entera hasta un mes
 * después. Aquí no hay nada que elegir, y a la referencia se va por un enlace que
 * dice a dónde lleva.
 *
 * **Es de un mes y no una vigencia.** Ajustar septiembre no toca octubre: octubre
 * vuelve solo a los 120. Se descartó el «de aquí en adelante» porque el caso de la
 * casa es el que da nombre a esto —un mes sale más y el siguiente menos— y porque
 * una vigencia obliga a decidir qué pasa hacia atrás, que aquí no hay que contestar.
 *
 * **Solo se abre en un mes vivo.** En uno cerrado la línea es la copia que se
 * guardó y no sabe de qué fijo salió (`fixedId` a `null`), que es la misma regla
 * que impide editar una partida de un mes pasado.
 */
export function AjusteDelMesSheet({
  open, fijo, nombreDelMes, onClose, onSave, onQuitar, onEditarFijo,
}: AjusteDelMesSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<FixedOverrideDraft>({
    open,
    initialDraft: () => ({ amount: fijo ? centsToInput(fijo.amountCents) : '' }),
    validate: validateFixedOverrideDraft,
  })

  const esIngreso = fijo?.kind === 'ingreso'
  // Solo hay referencia que enseñar cuando este mes lleva ajuste: sin él, la
  // cifra del campo **es** la referencia y repetirla debajo sería ruido.
  const referencia = fijo?.referenciaCents ?? null
  const mesEnMinuscula = nombreDelMes.split(' ')[0].toLowerCase()

  const handleSubmit = submitHandler(valid => {
    onSave(valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={fijo ? `${fijo.name} en ${mesEnMinuscula}` : 'Ajustar el mes'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="ajuste-mes-form"
          submitLabel="Guardar"
          error={formError}
        />
      }
    >
      <form id="ajuste-mes-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label={`Cuánto ha sido en ${mesEnMinuscula}`} htmlFor="ajuste-mes-amount">
          <input
            id="ajuste-mes-amount"
            ref={firstFieldRef}
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={e => patch({ amount: e.target.value })}
            required
            className="field-input"
          />
          <p className="text-[10px] leading-relaxed text-muted">
            {referencia !== null
              ? `Solo para ${mesEnMinuscula}. La referencia sigue siendo ${formatCentsCorto(referencia)} al mes y los demás meses no se tocan.`
              : `Solo para ${mesEnMinuscula}: los demás meses siguen con ${esIngreso ? 'lo que entra' : 'lo que sale'} de siempre.`}
          </p>
        </Field>

        {/* Las dos salidas, fuera del `space-y` de los campos: no son campos.
            Volver a la referencia solo cabe si hay algo de lo que volver. */}
        <div className="space-y-2">
          {referencia !== null && (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => { onQuitar(); onClose() }}
            >
              Volver a los {formatCentsCorto(referencia)}
            </Button>
          )}

          {/* Y el camino a la referencia. Va aquí y no en el pie porque no es una
              acción de este formulario: lleva a otro sitio, y por eso lo dice con
              una flecha y no con un botón lleno. */}
          <button
            type="button"
            onClick={onEditarFijo}
            className="flex min-h-11 w-full items-center justify-center gap-1 text-[13px] font-semibold text-primary-strong"
          >
            Cambiar cuánto es cada mes
            <ArrowRight size={14} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
