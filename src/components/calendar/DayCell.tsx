import { eventColor, textColorOn } from '@/lib/assignees'
import { isRestDay, isVacation, vacationEdges } from '@/lib/events'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { DayActivity, marcasDelDia, resumenDelDia } from './DayActivity'

/**
 * Un día como sitio al que ir, no como resumen de lo que pasa en él.
 *
 * La comparten la tira de siete días y la rejilla del mes, que es lo que las
 * hace consistentes: el mismo número, el mismo punto y la misma raya de ausencia
 * en los dos sitios. La única diferencia es que la tira pone encima la inicial
 * del día de la semana, porque sus columnas ruedan y no hay una cabecera fija
 * que las nombre.
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
 *
 * Y una que se probó y se descartó: **el tinte cálido en toda la celda**
 * (24-08-2026). Dejaba igual una semana entera fuera y un día libre de una
 * persona, que son cosas distintas, y la raya se lee mejor. La raya vuelve con
 * dos cambios que sí se quedan: es decorativa, nunca un botón de 3 px, y no se
 * apila — es una por celda, por mucha gente que falte.
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
  events: Event[]
  /** Tareas que vencen este día, ya arrastradas a hoy si venían atrasadas. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelect: (day: Date) => void
}

/**
 * Las ausencias bajo el número, como una raya fina con el color de quien falta.
 *
 * La forma distingue la clase sin depender del color: **unas vacaciones son una
 * raya a todo el ancho**, redondeada donde el tramo empieza y acaba, así que
 * varios días seguidos se leen como una barra continua; **un descanso es un
 * guion corto y centrado**, porque es un día y no un tramo.
 *
 * Son `span` y no botones: como barra de 3 px nunca podrían llegar al mínimo de
 * toque de 24×24, y estirarlas con relleno invisible metía un objetivo táctil
 * grande donde el dedo espera seleccionar el día. Se editan desde `Availability`.
 *
 * **Una sola raya, siempre** (24-08-2026, antes hasta dos). La celda avisa de que
 * falta alguien; quién es y hasta cuándo lo dice `Availability`, que es la fuente.
 * Con dos rayas apiladas, un día con la madre de vacaciones y el padre de
 * descanso pedía dos filas de señal y tres colores para no decir nada más que
 * "hoy falta gente": la celda volvía a ser el resumen del día que la agenda vino
 * a quitarle. Cuántas personas son exactamente sigue en el nombre accesible.
 *
 * Con más de una ausencia el mismo día manda la primera, y si hay vacaciones
 * manda la de vacaciones. Se probó pintar la raya en gris cuando falta más de
 * uno —el color ya no es de nadie en concreto— y se descartó al verlo: un martes
 * de descanso en medio de una semana de vacaciones partía la banda amarilla con
 * un trozo gris, que se lee como que las vacaciones se acaban ahí. La banda
 * continua dice la verdad más importante; los nombres los da `Availability`.
 */
function AbsenceMarks({ vacaciones, descansos, day, kids, members }: {
  vacaciones: Event[]
  descansos: Event[]
  day: Date
  kids: Child[]
  members: FamilyMember[]
}) {
  // El hueco se reserva aunque no haya nada: si no, los días con ausencia
  // quedarían más altos que los demás y la fila se descuadra.
  if (vacaciones.length === 0 && descansos.length === 0) {
    return <span className="block h-[3px]" aria-hidden />
  }

  // Unas vacaciones ganan la forma: son un tramo, y un tramo se lee como barra
  // continua entre días vecinos. Un día con vacaciones y descanso a la vez tiene
  // una barra que sigue, que es la información que se pierde si gana el guion.
  const tramo = vacaciones.length > 0

  // La barra se redondea donde acaba el tramo de verdad: si **alguna** ausencia
  // sigue en el día de al lado, no se cierra ahí. Sin esto, dos vacaciones
  // solapadas dejaban una punta redonda en medio de la banda.
  const primero = vacaciones.every(event => vacationEdges(event, day).primero)
  const ultimo  = vacaciones.every(event => vacationEdges(event, day).ultimo)

  const color = eventColor(tramo ? vacaciones[0] : descansos[0], members, kids)

  return (
    <span className="flex w-full justify-center" aria-hidden>
      <span
        className={tramo
          ? `h-[3px] w-full ${primero ? 'rounded-l-full' : ''} ${ultimo ? 'rounded-r-full' : ''}`
          : 'h-[3px] w-3 rounded-full'}
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

export function DayCell({
  day,
  dayNumber,
  isToday,
  isSelected,
  weekdayLabel,
  monthLabel,
  events,
  tasks,
  kids,
  members,
  onSelect,
}: DayCellProps) {
  const vacaciones = events.filter(isVacation)
  const descansos = events.filter(isRestDay)
  const marcas = marcasDelDia(events, tasks, members, kids)

  /**
   * Un descanso pinta el número del día con el color de quien descansa
   * (24-08-2026). Nació de las abuelas: el día que una no está hay que verlo
   * desde la rejilla, y la raya sola no daba para eso — con vacaciones de otro
   * el mismo día ni siquiera se pintaba, porque manda la banda.
   *
   * Va como círculo relleno y no como letra de color porque la paleta tiene seis
   * tonos claros: "Champán dorado" escrito sobre blanco da 1,36:1 y no se lee.
   * Relleno, el texto lo elige `textColorOn`, que garantiza los catorce.
   *
   * Con más de un descanso manda el primero, la misma regla que la raya. Cuántos
   * son lo sigue diciendo el nombre accesible del día ("2 descansando"), así que
   * el color no es la única vía.
   */
  const colorDescanso = descansos.length > 0 ? eventColor(descansos[0], members, kids) : null

  // El número dice una sola cosa, y manda la de arriba: el día elegido y hoy son
  // dónde estás, y eso gana a quién falta. Cuando hoy tapa un descanso, la raya
  // de debajo y `Availability` siguen contándolo.
  const numberClass = (() => {
    if (isSelected) return 'bg-primary text-white'
    if (isToday)    return 'bg-accent text-white'
    if (colorDescanso) return ''
    return 'text-ink'
  })()

  const numberStyle = !isSelected && !isToday && colorDescanso
    ? { backgroundColor: colorDescanso, color: textColorOn(colorDescanso) }
    : undefined

  const fecha = day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const resumen = resumenDelDia({
    planes: events.length - vacaciones.length - descansos.length,
    tareas: tasks.length,
    vacaciones: vacaciones.length,
    descansos: descansos.length,
  })

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      aria-pressed={isSelected}
      // El día y lo que tiene, en palabras: es lo que sustituye al tooltip que
      // llevaba la celda, y funciona con el dedo y con lector de pantalla. Es
      // también donde se dice cuántas personas están fuera, que la raya no
      // distingue más allá de dos.
      aria-label={`${fecha}, ${resumen}`}
      // Sin relleno lateral: es lo que deja que la raya de dos días seguidos se
      // toque y se lea como un tramo. El número es un círculo de 32 px centrado
      // en una columna de ~52, así que no roza con el vecino.
      className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isSelected ? '' : 'hover:bg-canvas'
      }`}
    >
      {weekdayLabel && (
        <span className={`text-[9px] font-bold uppercase leading-none ${isToday ? 'text-accent' : 'text-muted'}`}>
          {weekdayLabel}
        </span>
      )}
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${numberClass}`}
        style={numberStyle}
      >
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
      <AbsenceMarks vacaciones={vacaciones} descansos={descansos} day={day} kids={kids} members={members} />
    </button>
  )
}
