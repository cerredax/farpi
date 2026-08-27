'use client'

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

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

/**
 * Qué enseña el calendario.
 *
 * En escritorio son tres, el trio de Google. En móvil son cuatro: se le añade
 * **Agenda**, la lista continua, que ahí es la vista de partida y la que contesta
 * "¿qué hay?" sin pedir nada.
 */
export type VistaCalendario = 'agenda' | 'dia' | 'semana' | 'mes'

const NOMBRES: Record<VistaCalendario, string> = {
  agenda: 'Agenda', dia: 'Día', semana: 'Semana', mes: 'Mes',
}

interface CalendarHeaderProps {
  /**
   * Qué estás mirando, escrito: el mes, la semana o el día.
   *
   * Lo calcula `CalendarView`, que es quien sabe la vista. Antes se sacaba aquí
   * del mes y siempre ponía "Agosto 2026", también mirando una semana: las
   * flechas parecían de mes y no había forma de saber en qué semana estabas.
   */
  titulo: string
  vista: VistaCalendario
  onVista: (vista: VistaCalendario) => void
  /** Qué vistas se ofrecen. Móvil y escritorio no ofrecen las mismas. */
  vistas: VistaCalendario[]
  /** Qué recorren las flechas, para su etiqueta accesible: "Semana anterior". */
  unidad: string
  onPrev: () => void
  onNext: () => void
  onAdd: () => void
}

export function CalendarHeader({ titulo, vista, onVista, vistas, unidad, onPrev, onNext, onAdd }: CalendarHeaderProps) {

  const FLECHA = 'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line active:bg-grip'

  const anterior = (
    <button type="button" onClick={onPrev} aria-label={`${unidad} anterior`} className={FLECHA}>
      <ChevronLeft size={20} strokeWidth={2} />
    </button>
  )
  const siguiente = (
    <button type="button" onClick={onNext} aria-label={`${unidad} siguiente`} className={FLECHA}>
      <ChevronRight size={20} strokeWidth={2} />
    </button>
  )

  return (
    <div className="px-4 pt-3 lg:px-0 lg:pt-0">
      {/* Una sola fila para las dos versiones: el título con sus flechas y, a la
          derecha, el selector y el `+`. El plegable del mes se fue al entrar la
          vista Mes en móvil (26-08-2026): eran dos maneras de pedir lo mismo. */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-0.5">
          {anterior}
          <h2 className="min-w-0 truncate px-1 text-base font-extrabold tracking-tight text-ink">{titulo}</h2>
          {siguiente}
        </div>

        {/* En escritorio el selector va en esta misma fila, a la derecha, que es
            donde estaba y donde cabe: tres pestañas y sitio de sobra. */}
        <div className="ml-auto hidden gap-1 rounded-2xl bg-surface p-1 lg:flex">
          {vistas.map(valor => (
            <button
              key={valor}
              type="button"
              onClick={() => onVista(valor)}
              aria-pressed={vista === valor}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                vista === valor ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {NOMBRES[valor]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-label="Apuntar algo"
          className="ml-auto flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all hover:bg-primary-hover active:scale-95 lg:ml-2"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* El selector, debajo en móvil y en la misma fila en escritorio. Debajo
          porque en móvil son cuatro pestañas y no caben al lado del título; y a
          todo el ancho, que es donde el pulgar acierta. */}
      <div className="mt-2 flex gap-1 rounded-2xl bg-surface p-1 lg:mt-0 lg:hidden">
        {vistas.map(valor => (
          <button
            key={valor}
            type="button"
            onClick={() => onVista(valor)}
            aria-pressed={vista === valor}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
              vista === valor ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {NOMBRES[valor]}
          </button>
        ))}
      </div>
    </div>
  )
}
