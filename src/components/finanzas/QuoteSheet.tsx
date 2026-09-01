'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { Suggestions } from '@/components/ui/Suggestions'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { QUOTE_STATUSES } from '@/lib/constants'
import { centsToInput } from '@/lib/finanzas'
import { validateQuoteDraft } from '@/lib/validators'
import type { Quote, QuoteDraft } from '@/types'

interface QuoteSheetProps {
  open: boolean
  initial?: Quote | null
  /** Los trabajos ya apuntados, para poder añadir otro precio al mismo. */
  titulos: string[]
  onClose: () => void
  onSave: (draft: QuoteDraft) => void
  onDelete: (id: string) => void
}

function initDraft(initial: Quote | null | undefined): QuoteDraft {
  if (initial) {
    return {
      title: initial.title,
      provider: initial.provider,
      amount: centsToInput(initial.amount_cents),
      status: initial.status,
      valid_until: initial.valid_until ?? '',
      notes: initial.notes ?? '',
    }
  }
  return { title: '', provider: '', amount: '', status: 'pedido', valid_until: '', notes: '' }
}

/**
 * Apuntar un presupuesto que te han pasado.
 *
 * Lo importante del formulario está en el primer campo y en el bloque de
 * sugerencias que lleva debajo: **para qué es**. Escribirlo igual que el
 * anterior es lo único que hace que los tres presupuestos de la caldera salgan
 * juntos y se puedan comparar, así que los títulos ya usados se ofrecen para
 * tocarlos en vez de teclearlos. Aun así, la agrupación no depende de escribirlo
 * clavado: `agruparPresupuestos` compara sin tildes, sin mayúsculas y sin
 * espacios de más.
 */
export function QuoteSheet({ open, initial, titulos, onClose, onSave, onDelete }: QuoteSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<QuoteDraft>({
    open,
    initialDraft: () => initDraft(initial),
    validate: validateQuoteDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    onSave(valid)
    onClose()
  })

  return (
    <BottomSheet
      open={open}
      title={initial ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="quote-form"
          submitLabel={initial ? 'Guardar' : 'Apuntar presupuesto'}
          disabled={!draft.title.trim() || !draft.provider.trim() || !draft.amount.trim()}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar presupuesto', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="quote-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Para qué es" htmlFor="quote-title">
          <input
            id="quote-title"
            ref={firstFieldRef}
            type="text"
            value={draft.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="Ej: Cambiar la caldera"
            required
            className="field-input"
          />
          <Suggestions
            values={titulos}
            onPick={titulo => patch({ title: titulo })}
            label="Para algo que ya tienes apuntado"
          />
        </Field>

        <Field label="Quién lo pasa" htmlFor="quote-provider">
          <input
            id="quote-provider"
            type="text"
            value={draft.provider}
            onChange={e => patch({ provider: e.target.value })}
            placeholder="Ej: Fontanería López"
            required
            className="field-input"
          />
        </Field>

        <Field label="Cuánto" htmlFor="quote-amount">
          <input
            id="quote-amount"
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={e => patch({ amount: e.target.value })}
            placeholder="Ej: 2400"
            required
            className="field-input"
          />
        </Field>

        <Field label="El precio vale hasta" htmlFor="quote-valid" hint="(opcional)">
          <input
            id="quote-valid"
            type="date"
            value={draft.valid_until}
            onChange={e => patch({ valid_until: e.target.value })}
            className="field-input"
          />
        </Field>

        <Field label="Cómo está" spacing="group">
          <div className="flex flex-wrap gap-2">
            {QUOTE_STATUSES.map(estado => (
              <SelectChip
                key={estado.value}
                selected={draft.status === estado.value}
                onClick={() => patch({ status: estado.value })}
              >
                {estado.label}
              </SelectChip>
            ))}
          </div>
        </Field>

        <Field label="Notas" htmlFor="quote-notes" hint="(opcional)">
          <textarea
            id="quote-notes"
            value={draft.notes}
            onChange={e => patch({ notes: e.target.value })}
            rows={3}
            placeholder="Qué incluye, cuánto tardan, qué dijeron…"
            className="field-input resize-none"
          />
        </Field>
      </form>
    </BottomSheet>
  )
}
