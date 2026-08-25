'use client'

import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
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
 * **El mes se pliega** (25-08-2026). En móvil el rótulo es un botón: lo tocas y
 * la rejilla del mes se despliega sobre la lista; lo vuelves a tocar y se
 * guarda. Es el gesto de Google Calendar, y sustituye al selector Agenda/Mes,
 * que obligaba a elegir entre ver el mes o ver lo que hay.
 *
 * Salió de abrir la app y no ver ningún calendario en la pantalla del
 * calendario: la vista Programación es una lista sin rejilla, y sobre el papel
 * estaba bien, pero al entrar faltaba algo que mirar.
 *
 * En escritorio no se pliega nada —la rejilla vive a la izquierda y siempre está
 * a la vista—, así que allí el rótulo es un título y no un botón. Son dos
 * marcados con la misma etiqueta, uno `lg:hidden` y otro `hidden lg:flex`,
 * porque Tailwind puede esconder un elemento pero no convertirlo en otro.
 */

interface CalendarHeaderProps {
  currentMonth: Date
  /** Si la rejilla del mes está desplegada. Solo manda en móvil. */
  mesAbierto: boolean
  onToggleMes: () => void
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
}

export function CalendarHeader({ currentMonth, mesAbierto, onToggleMes, onPrev, onNext, onAdd }: CalendarHeaderProps) {
  const label = capitalize(format(currentMonth, 'MMMM yyyy', { locale: es }))

  const FLECHA = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line active:bg-grip'

  const anterior = (
    <button type="button" onClick={onPrev} aria-label="Mes anterior" className={FLECHA}>
      <ChevronLeft size={20} strokeWidth={2} />
    </button>
  )
  const siguiente = (
    <button type="button" onClick={onNext} aria-label="Mes siguiente" className={FLECHA}>
      <ChevronRight size={20} strokeWidth={2} />
    </button>
  )

  return (
    <div className="px-4 pt-3 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between gap-2">
        {/* Móvil: el rótulo abre y cierra el mes. Las flechas solo cuando está
            abierto — con la rejilla guardada no habría nada que recorrer. */}
        <div className="flex min-w-0 items-center gap-0.5 lg:hidden">
          <button
            type="button"
            onClick={onToggleMes}
            aria-expanded={mesAbierto}
            aria-label={mesAbierto ? 'Ocultar el mes' : 'Ver el mes'}
            className="flex min-h-9 min-w-0 items-center gap-1 rounded-xl px-2 py-1 transition-colors hover:bg-line active:bg-grip"
          >
            <span className="min-w-0 truncate text-base font-extrabold tracking-tight text-ink">{label}</span>
            <ChevronDown
              size={18}
              strokeWidth={2.5}
              aria-hidden
              className={`flex-shrink-0 text-muted transition-transform ${mesAbierto ? 'rotate-180' : ''}`}
            />
          </button>
          {/* En móvil las dos juntas detrás del rótulo: el rótulo es un botón
              y meterle una flecha a cada lado deja tres objetivos táctiles
              pegados donde el pulgar no acierta. */}
          {mesAbierto && (<>{anterior}{siguiente}</>)}
        </div>

        {/* Escritorio: la rejilla está siempre a la vista, así que el rótulo es
            un título y las flechas no dependen de nada. */}
        <div className="hidden min-w-0 items-center gap-0.5 lg:flex">
          {anterior}
          <h2 className="min-w-0 truncate px-1 text-base font-extrabold tracking-tight text-ink">{label}</h2>
          {siguiente}
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-label="Añadir evento"
          className="ml-auto flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all hover:bg-primary-hover active:scale-95"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
