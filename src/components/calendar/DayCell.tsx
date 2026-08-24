import { isRestDay, isVacation } from '@/lib/events'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { DayActivity, marcasDelDia, resumenDelDia } from './DayActivity'

/**
 * Un día como sitio al que ir, no como resumen de lo que pasa en él.
 *
 * La comparten la tira de siete días y la rejilla del mes, que es lo que las
 * hace consistentes: el mismo número, el mismo punto y el mismo tinte de
 * ausencia en los dos sitios. La única diferencia es que la tira pone encima la
 * inicial del día de la semana, porque sus columnas ruedan y no hay una cabecera
 * fija que las nombre.
 *
 * Todos los días que llegan aquí son del tramo que se está viendo: desde que la
 * rejilla no presta días de los meses vecinos, no hay ninguno que haya que
 * atenuar por ser "de fuera".
 *
 * Lo que la celda ya no hace, y antes sí:
 *
 * - **No escribe títulos de eventos.** A 390 px una celda son ~50 px: "09:00
 *   Dentista" salía como "09:0…" y había que tocar para saber qué era.
 * - **No lleva tooltip.** Era la única vía de leer el día y no existe con el
 *   dedo. Ahora tocar el día enseña su detalle debajo, que es la misma
 *   información y sin ratón.
 * - **No es varios botones.** Antes cada celda tenía el día, un `+`, una barra
 *   por vacaciones y un punto por descanso, todos pulsables y varios por debajo
 *   del mínimo de toque de 24×24. Ahora la celda es un solo botón: selecciona el
 *   día.
 * - **No pinta una franja por persona ausente** (24-08-2026). Con dos vacaciones
 *   a la vez eran dos barras de 3 px bajo el número, compitiendo con los puntos
 *   de los eventos, con el círculo del día elegido y con el de hoy. Ahora es
 *   **un** tinte cálido sobre la celda, el mismo para uno o para cinco: dice que
 *   ese día hay alguien fuera y nada más. Quién y hasta cuándo lo dice el bloque
 *   de "Vacaciones y descansos", que es donde caben los nombres.
 */

interface DayCellProps {
  day: Date
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  /** Con texto, se pinta encima del número. Es el modo de la tira de siete días. */
  weekdayLabel?: string
  /**
   * El mes, debajo del número, para cuando el tramo cae en dos meses y "31, 1"
   * no dice dónde acaba uno. Tres estados a propósito: sin la prop no hay hueco
   * (la rejilla del mes, que ya no presta días de fuera); con cadena vacía el
   * hueco se reserva sin escribir nada, que es como las siete columnas de la
   * tira siguen alineadas cuando solo una lo lleva.
   */
  monthLabel?: string
  /**
   * Presente cuando ese día hay alguien de vacaciones o de descanso. `abre` y
   * `cierra` dicen si el día es un extremo del tramo, para redondear solo ahí y
   * que varios días seguidos se lean como un bloque y no como celdas con
   * muescas. Lo calcula la rejilla, que es quien conoce los días vecinos.
   */
  ausencia?: { abre: boolean; cierra: boolean }
  events: Event[]
  /** Tareas que vencen este día, ya arrastradas a hoy si venían atrasadas. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelect: (day: Date) => void
}

export function DayCell({
  day,
  dayNumber,
  isToday,
  isSelected,
  weekdayLabel,
  monthLabel,
  ausencia,
  events,
  tasks,
  kids,
  members,
  onSelect,
}: DayCellProps) {
  const marcas = marcasDelDia(events, tasks, members, kids)

  const numberClass = (() => {
    if (isSelected) return 'bg-primary text-white'
    if (isToday)    return 'bg-accent text-white'
    return 'text-ink'
  })()

  // El tinte no se redondea por su cuenta: solo en los extremos del tramo, y a
  // escuadra por dentro. Es lo que hace que dos días seguidos se toquen sin
  // muesca y el tramo se lea como un bloque.
  const tinte = ausencia
    ? `bg-warm ${ausencia.abre ? 'rounded-l-xl' : ''} ${ausencia.cierra ? 'rounded-r-xl' : ''}`
    : 'rounded-xl'

  const fecha = day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const resumen = resumenDelDia({
    planes: events.filter(e => !isVacation(e) && !isRestDay(e)).length,
    tareas: tasks.length,
    vacaciones: events.filter(isVacation).length,
    descansos: events.filter(isRestDay).length,
  })

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={isSelected}
      // El día y lo que tiene, en palabras: es lo que sustituye al tooltip que
      // llevaba la celda, y funciona con el dedo y con lector de pantalla. Es
      // también donde se dice cuántas personas están fuera, que el tinte no
      // distingue de una a cinco.
      aria-label={`${fecha}, ${resumen}`}
      // Sin relleno lateral: es lo que deja que el tinte de dos días seguidos se
      // toque y se lea como un tramo. El número es un círculo de 32 px centrado
      // en una columna de ~52, así que no roza con el vecino.
      className={`flex w-full flex-col items-center gap-0.5 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${tinte} ${
        isSelected ? '' : 'hover:bg-canvas'
      }`}
    >
      {weekdayLabel && (
        <span className={`text-[9px] font-bold uppercase leading-none ${isToday ? 'text-accent' : 'text-muted'}`}>
          {weekdayLabel}
        </span>
      )}
      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${numberClass}`}>
        {dayNumber}
      </span>
      {/* El mes va en `aria-hidden` porque la etiqueta del botón ya trae la fecha
          entera, mes incluido: esto es ayuda para el ojo, no información nueva. */}
      {monthLabel !== undefined && (
        <span className="h-3 text-[9px] font-bold uppercase leading-none text-muted" aria-hidden>
          {monthLabel}
        </span>
      )}
      <DayActivity marcas={marcas} />
    </button>
  )
}
