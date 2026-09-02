'use client'

import { formatCentsCorto } from '@/lib/finanzas'
import type { ResumenPartida } from '@/lib/budgets'

interface BudgetBarProps {
  resumen: ResumenPartida
  /**
   * Editar la partida. **Va sin él en un mes cerrado**, y entonces la fila deja
   * de ser un botón: lo que se está viendo es la copia de un mes que terminó y no
   * hay nada que tocar ahí. Lo que se edita —la plantilla— está en «El mes tipo»,
   * y tocarlo no puede cambiar lo que dijo enero.
   */
  onEdit?: () => void
}

/**
 * Cómo fue una partida en un mes: el nombre, cuánto llevas de cuánto y una barra.
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
export function BudgetBar({ resumen, onEdit }: BudgetBarProps) {
  const { partida, gastado, restante, porcentaje, pasado } = resumen

  const contenido = (
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

      {/* `danger-strong` y no `danger` a secas: a 11 px esto es texto pequeño y
          le toca el 4,5:1 de WCAG, que el rojo claro no alcanza sobre blanco. */}
      <span className={`text-[11px] ${pasado ? 'font-semibold text-danger-strong' : 'text-muted'}`}>
        {pasado
          ? `Te has pasado por ${formatCentsCorto(-restante)}`
          : `Quedan ${formatCentsCorto(restante)}`}
      </span>
    </>
  )

  const clases = 'flex w-full flex-col gap-1.5 rounded-2xl border border-surface bg-white px-4 py-3 text-left shadow-sm'

  if (!onEdit) return <div className={clases}>{contenido}</div>

  return (
    <button onClick={onEdit} className={`${clases} transition-colors hover:bg-canvas active:bg-canvas`}>
      {contenido}
    </button>
  )
}
