'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { capitalize } from '@/lib/text'

/**
 * La cabecera del calendario: dónde estás, cómo moverte y cómo añadir.
 *
 * Es una sola cabecera para las dos columnas de escritorio, no una por columna.
 * Antes vivía dentro de la tarjeta del mes, y el `+` estaba repetido en la
 * agenda: dos botones con el mismo nombre a dos alturas distintas.
 *
 * El selector Agenda/Mes es cosa del móvil (`lg:hidden`): en escritorio se ven
 * las dos cosas a la vez y no hay nada que elegir.
 */

export type ModoCalendario = 'agenda' | 'mes'

interface CalendarHeaderProps {
  currentMonth: Date
  modo: ModoCalendario
  onModo: (modo: ModoCalendario) => void
  /** Qué recorren las flechas. En agenda se salta de semana, no de mes. */
  unidad: 'mes' | 'semana'
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
}

export function CalendarHeader({ currentMonth, modo, onModo, unidad, onPrev, onNext, onAdd }: CalendarHeaderProps) {
  // Aun saltando de semana, el rótulo sigue siendo el mes: es lo que sitúa, y
  // "del 3 al 9" obliga a calcular en qué mes se está.
  const label = capitalize(format(currentMonth, 'MMMM yyyy', { locale: es }))

  return (
    <div className="px-4 pt-3 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onPrev}
            aria-label={unidad === 'mes' ? 'Mes anterior' : 'Semana anterior'}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line active:bg-grip"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
          <h2 className="min-w-0 truncate text-base font-extrabold tracking-tight text-ink">{label}</h2>
          <button
            type="button"
            onClick={onNext}
            aria-label={unidad === 'mes' ? 'Mes siguiente' : 'Semana siguiente'}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line active:bg-grip"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-label="Añadir evento"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all hover:bg-primary-hover active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-2 flex gap-2 rounded-2xl bg-surface p-1 lg:hidden">
        {([['agenda', 'Agenda'], ['mes', 'Mes']] as const).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => onModo(valor)}
            aria-pressed={modo === valor}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
              modo === valor ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  )
}
