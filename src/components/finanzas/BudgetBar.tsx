'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { resolveAssignee } from '@/lib/assignees'
import { formatCentsCorto } from '@/lib/finanzas'
import type { ResumenPartida } from '@/lib/budgets'
import type { Child, Expense, FamilyMember } from '@/types'

interface BudgetBarProps {
  resumen: ResumenPartida
  members: FamilyMember[]
  kids: Child[]
  /**
   * Editar la partida. **Va sin él en un mes que ya pasó**, y entonces el
   * desplegable no ofrece el enlace: lo que se está viendo es cómo fue ese mes y
   * no hay nada que tocar ahí. Lo que se edita —la plantilla— está en «Lo fijo»,
   * y tocarlo no puede cambiar lo que dijo enero.
   */
  onEdit?: () => void
  /** Abrir uno de los apuntes de dentro. El día a día sí se toca en cualquier mes. */
  onEditApunte: (apunte: Expense) => void
}

/** Una línea de dentro: cuándo, qué fue, quién lo puso y cuánto. */
function LineaDeLaPartida({ apunte, members, kids, onEdit }: {
  apunte: Expense
  members: FamilyMember[]
  kids: Child[]
  onEdit: () => void
}) {
  const quienPago = resolveAssignee(apunte, members, kids)

  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-baseline gap-2 rounded-lg px-1 py-1.5 text-left text-[13px] transition-colors hover:bg-canvas active:bg-canvas"
    >
      <span className="w-12 flex-shrink-0 tabular-nums text-faint">
        {format(parseISO(apunte.date), 'd MMM', { locale: es })}
      </span>
      <span className="min-w-0 flex-1 truncate text-muted">
        {apunte.description ?? 'Gasto'}
      </span>
      {quienPago && (
        <span
          className="h-2 w-2 flex-shrink-0 self-center rounded-full"
          style={{ backgroundColor: quienPago.color }}
          aria-label={quienPago.name}
        />
      )}
      <span className="flex-shrink-0 font-semibold tabular-nums text-ink">
        {formatCentsCorto(apunte.amount_cents)}
      </span>
    </button>
  )
}

/**
 * Cómo fue una partida en un mes: el nombre, cuánto llevas de cuánto, una barra
 * y —al tocarla— en qué se ha ido.
 *
 * **Se despliega desde el 03-09-2026.** «Llevas 412 de 350» deja siempre la misma
 * pregunta detrás —«¿en qué?»— y contestarla obligaba a bajar a «El día a día» y
 * leer treinta filas mezcladas buscando cuáles eran de la compra. Ahora las
 * líneas de la partida están dentro de la partida, que es donde se preguntan.
 *
 * Tocar la fila **abre**, ya no edita: editar la partida pasa a un enlace dentro
 * del desplegable. Una fila que se despliega y además hace otra cosa al tocarla
 * no se puede aprender, y lo que se quiere hacer aquí casi siempre es mirar, no
 * cambiar el límite.
 *
 * **El límite es el de ese mes**, no el de hoy: viene resuelto en `ResumenPartida`
 * y sale de la plantilla si el mes está en curso o de la copia congelada si ya
 * terminó. Desde el 02-09-2026 mirar junio enseña los 350 € que la compra tenía
 * en junio y no los 400 de ahora.
 *
 * **Lo de "te has pasado" se dice con palabras**, no solo con el rojo de la
 * barra. Es la misma regla que ordena el color en el resto de Farpi: el color
 * acompaña, nunca es lo único que lleva el mensaje —quien no distingue el rojo
 * del verde vería dos barras llenas iguales—. Así que el pie de la fila escribe
 * "quedan 120 €" o "te has pasado por 40 €", y la barra solo lo subraya.
 *
 * La barra se recorta al 100 %: pasarse un 300 % no dibuja una barra tres veces
 * más ancha que la tarjeta. Cuánto te has pasado lo dice el texto, que además es
 * el dato exacto.
 */
export function BudgetBar({ resumen, members, kids, onEdit, onEditApunte }: BudgetBarProps) {
  const { partida, apuntes, gastado, restante, porcentaje, pasado } = resumen
  const [abierta, setAbierta] = useState(false)
  const panelId = useId()

  const clases = 'flex w-full flex-col gap-1.5 overflow-hidden rounded-2xl border border-surface bg-white px-4 py-3 text-left shadow-sm'

  const resumenDeLaFila = (
    <>
      <div className="flex w-full items-baseline gap-2">
        {partida.emoji && <span className="flex-shrink-0 text-base leading-none" aria-hidden>{partida.emoji}</span>}
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{partida.name}</span>
        <span className="flex-shrink-0 text-xs font-bold text-ink">{formatCentsCorto(gastado)}</span>
        <span className="flex-shrink-0 text-xs text-muted">de {formatCentsCorto(partida.limiteCents)}</span>
      </div>

      {/* `aria-hidden` porque la barra no dice nada que no esté escrito encima y
          debajo con todas las letras. Un `progressbar` aquí obligaría a un lector
          de pantalla a leer un porcentaje redondeado en vez del importe exacto. */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas" aria-hidden>
        <div
          className={`h-full rounded-full transition-[width] ${pasado ? 'bg-danger' : 'bg-primary'}`}
          style={{ width: `${Math.max(porcentaje, gastado > 0 ? 4 : 0)}%` }}
        />
      </div>
    </>
  )

  // `danger-strong` y no `danger` a secas: a 11 px esto es texto pequeño y le
  // toca el 4,5:1 de WCAG, que el rojo claro no alcanza sobre blanco.
  const pie = (
    <span className={`text-[13px] ${pasado ? 'font-semibold text-danger-strong' : 'text-muted'}`}>
      {pasado
        ? `Te has pasado por ${formatCentsCorto(-restante)}`
        : `Quedan ${formatCentsCorto(restante)}`}
    </span>
  )

  // Una partida de un mes cerrado cuya partida viva se borró: ni tiene líneas
  // —sus gastos perdieron el `budget_id`— ni se puede editar. No hay nada que
  // abrir, así que no se hace pasar por un botón.
  if (apuntes.length === 0 && !onEdit) {
    return <div className={clases}>{resumenDeLaFila}{pie}</div>
  }

  return (
    <div className={clases}>
      <button
        type="button"
        onClick={() => setAbierta(v => !v)}
        aria-expanded={abierta}
        aria-controls={panelId}
        className="-mx-4 -mt-3 flex flex-col gap-1.5 px-4 pb-1 pt-3 text-left transition-colors hover:bg-canvas active:bg-canvas"
      >
        {resumenDeLaFila}
        <span className="flex items-center justify-between gap-2">
          {pie}
          <ChevronDown
            size={14}
            strokeWidth={2.6}
            aria-hidden
            className={`flex-shrink-0 text-faint transition-transform ${abierta ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {abierta && (
        <div id={panelId} className="border-t border-hairline pt-1.5">
          {apuntes.length === 0 ? (
            <p className="px-1 py-1.5 text-[13px] text-faint">Nada apuntado en esta partida.</p>
          ) : (
            <ul className="-mx-1">
              {apuntes.map(apunte => (
                <li key={apunte.id}>
                  <LineaDeLaPartida
                    apunte={apunte}
                    members={members}
                    kids={kids}
                    onEdit={() => onEditApunte(apunte)}
                  />
                </li>
              ))}
            </ul>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="mt-1 min-h-6 px-1 py-1 text-[13px] font-semibold text-primary-strong"
            >
              Editar partida
            </button>
          )}
        </div>
      )}
    </div>
  )
}
