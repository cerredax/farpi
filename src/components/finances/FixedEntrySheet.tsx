'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { useStore } from '@/lib/store-context'
import { resolveAssignee } from '@/lib/assignees'
import { centsToInput } from '@/lib/finanzas'
import { useT } from '@/lib/i18n/contexto'
import { validateFixedEntryDraft } from '@/lib/validators'
import type { FixedEntry, FixedEntryDraft, MovementKind } from '@/types'

// Un juego por tipo, en la línea de `BudgetSheet`. Los de ingreso son de dónde
// viene el dinero; los de gasto, los recibos de una casa. El último de cada juego
// es el que viene puesto y vale para cualquier cosa.
//
// **Los de gasto se rehacen el 14-09-2026**, pedido, y la idea es la contraria a
// la del 04-09: allí se pasó de dieciséis a veinticuatro añadiendo lo que faltaba,
// y aquí se juntan los que nombran **una sola factura**. Una casa no paga la luz,
// el agua y el gas por separado: paga suministros. Ni el móvil por un lado e
// internet por otro: paga la factura del teléfono.
//
//   💡 💧 🔥  →  🔌   un recibo de suministros, no tres
//   📱 🌐     →  📶   fibra y móvil vienen juntos
//   🧽        →  🧹   la esponja a 20 px parece una piedra; la escoba se lee
//   💳        →  🔁   una tarjeta es cómo se paga, no qué se paga: lo que define
//                     una suscripción es que se repite
//
// Y entran dos que no tenían dónde caer: los impuestos (🏛️) —el IBI, la tasa de
// residuos, el del coche: se pagan una o dos veces al año y son tan fijos como el
// alquiler— y las extraescolares (⚽), que acababan en el 🎒 del material del cole
// siendo una cuota mensual por hijo.
//
// Con el 🦷 (la ortodoncia se paga clavada dos años y caía en el 🏥 del seguro
// médico) **son 24** y la rejilla de gastos cierra sus tres filas de ocho.
//
// Van agrupados por lo que son —la casa, moverse y los hijos, y el resto— y no en
// el orden en que se fueron añadiendo, que es lo que había: quitando seis y
// metiendo cinco, las filas quedaban rotas de todas formas.
//
// Quitar 💡, 💧, 🔥, 📱, 🌐 y 💳 **no toca nada de lo guardado**: un fijo que ya
// los lleve los sigue enseñando en su fila. Lo que pasa es que al abrirlo para
// editarlo el selector no marca ninguno, porque el suyo ya no está entre los que
// se ofrecen.
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
    // La casa y sus recibos. El 🏛️ de los impuestos va aquí y no abajo con el
    // 🏦 del banco: en la tipografía de Android los dos son un edificio con
    // columnas y a 20 px, uno al lado del otro, no se distinguen. Separarlos no
    // arregla que se parezcan, pero quita la comparación de delante — y además
    // el IBI y la tasa de basuras son de la casa, así que aquí están en su sitio.
    '🏠', '🔌', '📶', '📺', '🧱', '🏛️', '🧹', '🔁',
    // Moverse y los hijos.
    '🚗', '⛽', '🚌', '🎒', '🏫', '🍽️', '⚽', '🎵',
    // Salud, dinero y lo que queda.
    '🏥', '🦷', '🛡️', '🐾', '🏋️', '🏦', '🎬', '💶',
  ],
}

interface FixedEntrySheetProps {
  open: boolean
  initial?: FixedEntry | null
  /** Con qué tipo nace uno nuevo: el del bloque desde el que se ha pulsado. */
  kindPorDefecto: MovementKind
  onClose: () => void
  onSave: (draft: FixedEntryDraft) => Promise<boolean>
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
 * El bloque de origen decide el tipo y el título lo recuerda. Tipo, icono y
 * persona se pueden cambiar en «Más opciones»; lo habitual solo pide nombre e
 * importe. Al continuar con otro fijo se conserva el tipo y la persona, pero
 * se limpian nombre, importe e icono para no copiar el recibo anterior.
 *
 * Tampoco hay partida a la que colgarlo: un fijo es exacto y una partida es para
 * lo que varía. Colgar el alquiler de una partida la llenaría sola, sin haber
 * apuntado nada.
 */
export function FixedEntrySheet({ open, initial, kindPorDefecto, onClose, onSave, onDelete }: FixedEntrySheetProps) {
  const t = useT()
  const textos = t.finanzas.fijo
  const { members, kids } = useStore()
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null)
  const enfocarSiguiente = useRef(false)
  const { draft, setDraft, patch, formError, firstFieldRef, submitHandler, guardando } = useSheetForm<FixedEntryDraft>({
    open,
    initialDraft: () => initDraft(initial, kindPorDefecto),
    validate: validateFixedEntryDraft,
  })

  useEffect(() => {
    // Espera al render que habilita el fieldset tras una escritura lenta.
    if (open && !guardando && enfocarSiguiente.current) {
      enfocarSiguiente.current = false
      firstFieldRef.current?.focus()
    }
  }, [open, guardando, draft, firstFieldRef])

  function cerrar() {
    enfocarSiguiente.current = false
    setMensajeGuardado(null)
    onClose()
  }
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose: cerrar })

  const esIngreso = draft.kind === 'ingreso'
  const quien = resolveAssignee(draft, members, kids)?.name ?? t.comun.familia

  function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    // La intención pertenece a este envío, incluso si llega otro mientras se
    // guarda. Enter y el botón principal guardan y cierran como hasta ahora.
    const continuar = !initial && (evento.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'otro'
    setMensajeGuardado(null)
    return submitHandler(valid => onSave(valid), () => {
      if (!continuar) {
        cerrar()
        return
      }
      enfocarSiguiente.current = true
      setMensajeGuardado(textos.guardadoOtro(draft.name.trim()))
      setDraft({ ...draft, name: '', amount: '', emoji: '💶' })
    })(evento)
  }

  return (
    <BottomSheet
      open={open}
      title={initial ? textos.editar : esIngreso ? textos.nuevoIngreso : textos.nuevoGasto}
      onClose={cerrar}
      footer={
        <SheetFooter
          form="fixed-entry-form"
          disabled={guardando}
          submitLabel={initial ? textos.guardar : esIngreso ? textos.añadirIngreso : textos.añadirGasto}
          secondarySubmit={!initial ? { label: textos.guardarOtro, value: 'otro' } : undefined}
          error={formError}
          onDelete={initial
            ? { confirming, onClick: handleDelete, idleLabel: textos.eliminar, confirmLabel: textos.confirmarEliminacion }
            : undefined}
        />
      }
    >
      <form id="fixed-entry-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-2 space-y-5">
        {mensajeGuardado && <p role="status" className="text-sm font-semibold text-primary-strong">{mensajeGuardado}</p>}

        <fieldset disabled={guardando} className="min-w-0 space-y-5">
          <Field label={textos.nombre} htmlFor="fixed-entry-name">
            <input
              id="fixed-entry-name"
              ref={firstFieldRef}
              type="text"
              value={draft.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder={esIngreso ? textos.ejemploIngreso : textos.ejemploGasto}
              required
              className="field-input"
            />
          </Field>

          <Field label={textos.cuanto} htmlFor="fixed-entry-amount">
            <input
              id="fixed-entry-amount"
              type="text"
              inputMode="decimal"
              value={draft.amount}
              onChange={e => patch({ amount: e.target.value })}
              placeholder={esIngreso ? textos.ejemploImporteIngreso : textos.ejemploImporteGasto}
              required
              className="field-input"
            />
            <p className="text-xs leading-relaxed text-muted">
              {textos.funcionamiento}
            </p>
          </Field>

          {/* El acordeón vuelve plegado al abrir el sheet, aunque se usara antes. */}
          <details key={String(open)} className="group">
            <summary className="flex min-h-11 list-none items-center gap-2 py-2 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-primary-strong">{textos.masOpciones}</span>
                <span className="block break-words text-xs text-muted">
                  <span aria-hidden>{draft.emoji}</span>{' · '}{esIngreso ? textos.ingreso : textos.gasto}{' · '}{quien}
                </span>
              </span>
              <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-5 pt-3">
              <Field label={textos.queEs} spacing="group">
                <div className="flex gap-2">
                  <SelectChip selected={esIngreso} onClick={() => patch({ kind: 'ingreso', emoji: '💶' })}>
                    {textos.entra}
                  </SelectChip>
                  <SelectChip selected={!esIngreso} onClick={() => patch({ kind: 'gasto', emoji: '💶' })}>
                    {textos.sale}
                  </SelectChip>
                </div>
              </Field>
              <Field label={textos.icono} spacing="group">
                <EmojiPicker opciones={EMOJIS[draft.kind]} value={draft.emoji} onChange={emoji => patch({ emoji })} />
              </Field>
              <div className="space-y-2">
                <AssigneePicker
                  value={draft}
                  onChange={asignado => patch(asignado)}
                  members={members}
                  kids={kids}
                />
                <p className="text-xs leading-relaxed text-muted">
                  {esIngreso ? textos.quienIngreso : textos.quienGasto}
                </p>
              </div>
            </div>
          </details>
        </fieldset>
      </form>
    </BottomSheet>
  )
}
