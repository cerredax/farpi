import { eventColor, resolveAssignee } from '@/lib/assignees'
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

/** Cuántos títulos se escriben en la celda antes de pasar a contarlos. Escritorio. */
const MAX_TITULOS = 2

/** Cuántas ausencias se nombran en la celda antes de pasar a contarlas. */
const MAX_AUSENCIAS = 2

interface DayCellProps {
  day: Date
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  events: Event[]
  /** Tareas que vencen este día, ya arrastradas a hoy si venían atrasadas. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelect: (day: Date) => void
  /**
   * Abrir un evento desde la celda. Solo lo usa escritorio, que es donde la
   * celda escribe títulos: en móvil no hay nada escrito que pulsar.
   */
  onOpenEvent?: (event: Event) => void
}

/**
 * Las ausencias del día, como **etiquetas con el nombre de quien falta**
 * (26-08-2026): el idioma con el que Google marca lo que dura varios días.
 *
 * Antes era una raya de 3 px bajo el número, y con la rejilla ya dibujada se vio
 * lo que fallaba: una rayita de color flotando bajo la fecha se lee como un
 * subrayado, no dice "vacaciones" y no dice de quién. El argumento de que varios
 * días seguidos formaban "una barra continua" tampoco se sostenía: la banda se
 * parte igual al cambiar de semana, y ahora también en cada línea de la rejilla.
 *
 * La etiqueta escribe el nombre —"Mamá", o "Familia" si no es de nadie— sobre el
 * color de esa persona al 50 %, la misma rebaja que el número de un descanso y
 * por la misma razón: mezclado con el fondo, ningún color de la paleta admite
 * texto blanco y todos admiten tinta.
 *
 * En móvil el nombre no cabe —una celda son 50 px— así que allí la etiqueta se
 * queda en la barra de color y el nombre sale solo en `lg`. Es lo mismo que hace
 * la celda con los títulos de los eventos.
 *
 * Se redondea donde el tramo empieza y acaba de verdad (`vacationEdges`), para
 * que los días de en medio encadenen.
 *
 * Siguen siendo `span` y no botones, como la raya: en móvil una barra de 4 px no
 * llega ni de lejos al mínimo de toque de 24×24, y estirarla con relleno
 * invisible metería un objetivo táctil grande donde el dedo espera seleccionar el
 * día. Las ausencias se editan desde `Availability`, que es su sitio.
 *
 * Hasta **dos** por celda, y el resto contado. Eran una sola desde el 24-08-2026,
 * cuando la señal no llevaba nombre y apilar dos rayas solo decía "falta gente";
 * con el nombre escrito, la segunda sí añade.
 */
function AbsenceChips({ vacaciones, descansos, day, kids, members }: {
  vacaciones: Event[]
  descansos: Event[]
  day: Date
  kids: Child[]
  members: FamilyMember[]
}) {
  const ausencias = [...vacaciones, ...descansos]

  // El hueco se reserva aunque no haya nada: si no, los días con ausencia
  // quedarían más altos que los demás y la fila se descuadra. En escritorio no
  // hace falta, que la celda ya tiene alto mínimo.
  if (ausencias.length === 0) return <span className="block h-[4px] lg:hidden" aria-hidden />

  return (
    <span className="flex w-full flex-col gap-px" aria-hidden>
      {ausencias.slice(0, MAX_AUSENCIAS).map(event => {
        const color = eventColor(event, members, kids)
        const quien = resolveAssignee(event, members, kids)?.name ?? 'Familia'
        // Un descanso es un día suelto: empieza y acaba en él, así que se cierra
        // por los dos lados sin preguntar.
        const { primero, ultimo } = isVacation(event) ? vacationEdges(event, day) : { primero: true, ultimo: true }

        return (
          <span
            key={event.id}
            className={`block h-[4px] w-full truncate lg:h-auto lg:px-1 lg:text-[10px] lg:font-bold lg:leading-tight lg:text-ink ${
              primero ? 'rounded-l-full lg:rounded-l' : ''
            } ${ultimo ? 'rounded-r-full lg:rounded-r' : ''}`}
            style={{ backgroundColor: `${color}80` }}
          >
            <span className="hidden lg:inline">{quien}</span>
          </span>
        )
      })}
      {ausencias.length > MAX_AUSENCIAS && (
        <span className="hidden pl-1 text-[10px] font-bold leading-tight text-muted lg:block">
          +{ausencias.length - MAX_AUSENCIAS} más
        </span>
      )}
    </span>
  )
}

export function DayCell({
  day,
  dayNumber,
  isToday,
  isSelected,
  events,
  tasks,
  kids,
  members,
  onSelect,
  onOpenEvent,
}: DayCellProps) {
  const vacaciones = events.filter(isVacation)
  const descansos = events.filter(isRestDay)
  // Los planes son lo que no es una ausencia: las ausencias ya las cuenta la
  // raya, y escribir "Vacaciones" en los siete días de un tramo era justo lo que
  // sacó los títulos de la celda en su día.
  const planes = events.filter(e => !isVacation(e) && !isRestDay(e))
  const marcas = marcasDelDia(events, tasks, members, kids)

  /**
   * Un descanso pinta el número del día con el color de quien descansa
   * (24-08-2026). Nació de las abuelas: el día que una no está hay que verlo
   * desde la rejilla, y la raya sola no daba para eso — con vacaciones de otro
   * el mismo día ni siquiera se pintaba, porque manda la banda.
   *
   * Va como círculo y no como letra de color porque la paleta tiene seis tonos
   * claros: "Champán dorado" escrito sobre blanco da 1,36:1 y no se lee.
   *
   * Y el círculo va **al 50 %**, no a color pleno (24-08-2026, el mismo día que
   * nació): a plena saturación gritaba más que "hoy", y una semana de descansos
   * seguidos era una fila de círculos oscuros. Rebajado se lee como un fondo y no
   * como una chapa.
   *
   * Esa rebaja decide también el color del número. Mezclado con el fondo, ningún
   * color de la paleta admite ya texto blanco —el peor cae a 1,17:1— y todos
   * admiten tinta: el peor caso es Vino sobre el crema del hover, a 5,26:1, por
   * encima del mínimo de 4,5:1. De ahí que el número sea `text-ink` y punto: a
   * color pleno haría falta elegirlo con `textColorOn`, y rebajado la respuesta
   * es siempre la misma.
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
    return 'text-ink'
  })()

  const numberStyle = !isSelected && !isToday && colorDescanso
    ? { backgroundColor: `${colorDescanso}80` }
    : undefined

  const fecha = day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const resumen = resumenDelDia({
    planes: events.length - vacaciones.length - descansos.length,
    tareas: tasks.length,
    vacaciones: vacaciones.length,
    descansos: descansos.length,
  })

  return (
    /**
     * La celda es un contenedor, no un botón.
     *
     * Lo fue hasta el 26-08-2026, y con los títulos de escritorio dentro dejó de
     * poder serlo: un botón no puede llevar botones dentro, así que los títulos
     * se pintaban pulsables y no lo eran —pulsarlos seleccionaba el día—. Ahora
     * el botón del día ocupa la parte de arriba y cada título es el suyo.
     *
     * En móvil no cambia nada: allí no hay títulos, así que el contenedor solo
     * tiene el botón y el área que se toca es la misma de siempre.
     */
    <div className="flex w-full flex-col lg:min-h-[104px] lg:border-b lg:border-r lg:border-hairline">
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
      // El alto mínimo es de escritorio: sin él la rejilla se queda en una
      // franja estrecha arriba de una pantalla de 900 px, que es lo que la hacía
      // parecer a medio hacer. En móvil manda el contenido, como siempre.
      className={`flex w-full flex-col items-center gap-0.5 rounded-xl py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        isSelected ? '' : 'hover:bg-canvas'
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${numberClass}`}
        style={numberStyle}
      >
        {dayNumber}
      </span>
      {/* Los puntos son el idioma del móvil, donde una celda mide 50 px y un
          título sale como "09:0…". En escritorio la celda pasa de 150 px y ahí
          sí cabe leerlo, así que los puntos dejan sitio a los títulos: la razón
          por la que la celda dejó de escribirlos era el ancho, y a este ancho no
          se aplica. */}
      <span className="lg:hidden">
        <DayActivity marcas={marcas} />
      </span>
      <AbsenceChips vacaciones={vacaciones} descansos={descansos} day={day} kids={kids} members={members} />
    </button>

      {/* Solo en escritorio. Dos títulos como mucho y el resto contado: una
          celda que crece con lo que tiene descuadra la rejilla entera, y a
          partir del tercero se lee mejor en la agenda de al lado. Las tareas van
          en una línea contada y no una a una: vencen ese día, no ocurren a una
          hora, y su sitio es Tareas. */}
      <div className="mt-0.5 hidden w-full flex-col gap-px px-0.5 lg:flex">
        {planes.slice(0, MAX_TITULOS).map(event => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpenEvent?.(event)}
            // El título entero es el objetivo, no solo la palabra: una fila
            // estrecha en la que hay que acertar con el ratón es peor que una
            // fila ancha, y el hueco a la derecha no vale para nada más.
            className="flex min-h-5 w-full min-w-0 items-center gap-1 rounded px-0.5 text-left transition-colors hover:bg-canvas"
          >
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: eventColor(event, members, kids) }}
              aria-hidden
            />
            <span className="min-w-0 truncate text-[10px] font-semibold leading-tight text-ink">
              {event.title}
            </span>
          </button>
        ))}
        {planes.length > MAX_TITULOS && (
          <span className="pl-2.5 text-[10px] font-bold leading-tight text-muted" aria-hidden>
            +{planes.length - MAX_TITULOS} más
          </span>
        )}
        {tasks.length > 0 && (
          <span className="pl-2.5 text-[10px] font-bold leading-tight text-muted" aria-hidden>
            {tasks.length} tarea{tasks.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </div>
  )
}
