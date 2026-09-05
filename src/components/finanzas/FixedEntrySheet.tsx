'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { useStore } from '@/lib/store-context'
import { centsToInput } from '@/lib/finanzas'
import { validateFixedEntryDraft } from '@/lib/validators'
import type { FixedEntry, FixedEntryDraft, MovementKind } from '@/types'

// Un juego por tipo, en la línea de `BudgetSheet`. Los de ingreso son de dónde
// viene el dinero; los de gasto, los recibos de una casa. El último de cada juego
// es el que viene puesto y vale para cualquier cosa.
//
// **Los de gasto pasan de dieciséis a veinticuatro el 04-09-2026**, pedido, «con
// uno de limpieza»: entran la limpieza (🧽), internet (🌐) —que se colaba en el
// 📱 del móvil sin serlo—, el colegio o la guardería (🏫), el comedor (🍽️), las
// cuotas y suscripciones (💳), la comunidad (🧱), el combustible (⛽) y la música
// (🎵). Todos son recibos que una casa paga clavados y no tenían dónde caer. Ocho
// y no los que fueran, para que la rejilla siga cuadrando a ocho por fila.
//
// Los de ingreso se quedan en dieciséis: de dónde entra el dinero en una casa hay
// menos variedad que de dónde sale, y no había ninguno pedido. Los dos juegos no
// tienen por qué medir lo mismo — se enseñan de uno en uno, según el tipo.
const EMOJIS: Record<MovementKind, string[]> = {
  ingreso: [
    '💼', '🏢', '🧾', '🎓', '🏥', '👶', '🏦', '📈',
    '🏠', '🚚', '🎨', '💻', '🤝', '🎁', '🧑‍🌾', '💶',
  ],
  gasto: [
    '🏠', '💡', '💧', '🔥', '📱', '📺', '🚗', '🚌',
    '🎒', '🏥', '🐾', '🏋️', '🛡️', '🏦', '🎬', '🧽',
    '🌐', '🏫', '🍽️', '💳', '🧱', '⛽', '🎵', '💶',
  ],
}

interface FixedEntrySheetProps {
  open: boolean
  initial?: FixedEntry | null
  /** Con qué tipo nace uno nuevo: el del bloque desde el que se ha pulsado. */
  kindPorDefecto: MovementKind
  onClose: () => void
  onSave: (draft: FixedEntryDraft) => void
  onDelete: (id: string) => void
}

function initDraft(initial: FixedEntry | null | undefined, kindPorDefecto: MovementKind): FixedEntryDraft {
  if (initial) {
    return {
      kind: initial.kind,
      name: initial.name,
      emoji: initial.emoji ?? '💶',
      amount: centsToInput(initial.amount_cents),
      child_id: initial.child_id,
      member_id: initial.member_id,
    }
  }
  return { kind: kindPorDefecto, name: '', emoji: '💶', amount: '', child_id: null, member_id: null }
}

/**
 * Un ingreso o un gasto de todos los meses: la nómina, el alquiler, la luz.
 *
 * **No hay fecha ni mes**, y ese hueco es la decisión entera: un fijo no ocurre
 * un día, vale hasta que se cambie. Pedir "¿desde cuándo?" obligaría a llevar
 * vigencias por concepto y mes, que es la tabla que se descartó a cambio de que
 * nadie tenga que abrir septiembre.
 *
 * El tipo se elige arriba del todo porque cambia lo que significa todo lo demás,
 * incluidos los iconos que se ofrecen y el texto del botón. Se puede cambiar
 * después de creado: apuntar una nómina en el bloque de gastos es un error de un
 * toque y arreglarlo no debería obligar a borrar y volver a escribir.
 *
 * Tampoco hay partida a la que colgarlo: un fijo es exacto y una partida es para
 * lo que varía. Colgar el alquiler de una partida la llenaría sola, sin haber
 * apuntado nada.
 */
export function FixedEntrySheet({ open, initial, kindPorDefecto, onClose, onSave, onDelete }: FixedEntrySheetProps) {
  const { members, kids } = useStore()
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<FixedEntryDraft>({
    open,
    initialDraft: () => initDraft(initial, kindPorDefecto),
    validate: validateFixedEntryDraft,
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
      title={initial ? 'Editar fijo' : 'Nuevo fijo'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="fixed-entry-form"
          submitLabel={initial ? 'Guardar' : esIngreso ? 'Añadir ingreso fijo' : 'Añadir gasto fijo'}
          disabled={!draft.name.trim() || !draft.amount.trim()}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar fijo', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="fixed-entry-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        <Field label="Qué es" spacing="group">
          <div className="flex gap-2">
            {/* Al cambiar de tipo se reinicia el icono: los dos juegos no se
                solapan del todo y quedarse con un 🏠 elegido para el alquiler
                dentro de una nómina se lee como un error. */}
            <SelectChip selected={esIngreso} onClick={() => patch({ kind: 'ingreso', emoji: '💶' })}>
              Entra
            </SelectChip>
            <SelectChip selected={!esIngreso} onClick={() => patch({ kind: 'gasto', emoji: '💶' })}>
              Sale
            </SelectChip>
          </div>
        </Field>

        <Field label="Nombre" htmlFor="fixed-entry-name">
          <input
            id="fixed-entry-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder={esIngreso ? 'Ej: Nómina de Carlos' : 'Ej: Alquiler'}
            required
            className="field-input"
          />
        </Field>

        <Field label="Cuánto al mes" htmlFor="fixed-entry-amount">
          <input
            id="fixed-entry-amount"
            type="text"
            inputMode="decimal"
            value={draft.amount}
            onChange={e => patch({ amount: e.target.value })}
            placeholder={esIngreso ? 'Ej: 1650' : 'Ej: 780'}
            required
            className="field-input"
          />
          <p className="text-[10px] leading-relaxed text-faint">
            Cuenta todos los meses hasta que lo cambies, sin tener que apuntarlo.
            Si lo cambias, los meses ya pasados también dirán el importe nuevo.
          </p>
        </Field>

        <Field label="Icono" spacing="group">
          <div className="grid grid-cols-8 gap-2">
            {EMOJIS[draft.kind].map(emoji => (
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

        <div className="space-y-2">
          <AssigneePicker
            value={draft}
            onChange={asignado => patch(asignado)}
            members={members}
            kids={kids}
          />
          <p className="text-[10px] leading-relaxed text-faint">
            {esIngreso
              ? 'De quién es el ingreso. Con «Familia» queda como algo que entra a la cuenta común.'
              : 'Quién lo paga. Con «Familia» queda como un recibo de la cuenta común, que es lo normal.'}
          </p>
        </div>
      </form>
    </BottomSheet>
  )
}
