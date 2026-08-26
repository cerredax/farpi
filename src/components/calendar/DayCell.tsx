import { isWeekend } from 'date-fns'
import { eventColor, fondoDePersona } from '@/lib/assignees'
import { holidayName, isHoliday, isRestDay, isVacation, vacationEdges } from '@/lib/events'
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
 * El nombre de un festivo, cuando tiene uno propio.
 *
 * **Las ausencias ya no se pintan aquí** (26-08-2026). Fueron una raya de 3 px,
 * luego una etiqueta con el nombre, y con la etiqueta apareció el problema de
 * fondo: desde que los eventos también son etiquetas de color, unas vacaciones y
 * una cita se leían igual —rectángulo de color con texto— y solo las distinguía
 * el ancho. Encima la banda se partía en el borde de cada celda, así que de
 * lunes a viernes eran cinco trozos y no una barra.
 *
 * Ahora una ausencia **tiñe la celda entera con la trama diagonal**, en el color
 * de esa persona. Es el mismo idioma que ya dice "aquí no se trabaja" en sábados,
 * domingos y festivos, que es exactamente lo que son unas vacaciones para quien
 * las tiene; la diferencia es de quién, y eso lo lleva el color. Quién es y hasta
 * cuándo lo dice `Availability`, que es la fuente y lo dice una sola vez.
 *
 * Del festivo queda el nombre, y solo si le pusieron uno: la trama ya dice que lo
 * es. En móvil no cabe y no se pinta.
 */
function DayChips({ festivos }: { festivos: Event[] }) {
  if (festivos.length === 0) return null

  return (
    <span className="flex w-full flex-col gap-px" aria-hidden>
      {festivos.slice(0, MAX_AUSENCIAS).map(event => holidayName(event) && (
        <span
          key={event.id}
          className="hidden w-full truncate px-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-muted lg:block"
        >
          {holidayName(event)}
        </span>
      ))}
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
  const festivos = events.filter(isHoliday)
  /**
   * La trama es de la casa entera: sábado, domingo y festivo. **Las ausencias no
   * la usan**, aunque unas vacaciones sean el día libre de alguien: se probó y se
   * descartó el mismo día porque un fondo no puede decir "día libre" y "de
   * quién" a la vez sin que el peso baile. Lo de quién lo lleva la franja.
   *
   * Con más de una ausencia manda la primera y las vacaciones ganan al descanso.
   * Cuántas personas son lo dice el nombre accesible del día, y quiénes,
   * `Availability`.
   */
  const esDiaLibre = isWeekend(day) || festivos.length > 0
  const ausencias = [...vacaciones, ...descansos].slice(0, MAX_AUSENCIAS)
  const planes = events.filter(e => !isVacation(e) && !isRestDay(e) && !isHoliday(e))
  const marcas = marcasDelDia(events, tasks, members, kids)

  /**
   * El número dice **dónde estás** y nada más: el día elegido y hoy.
   *
   * Entre el 24 y el 26-08-2026 también dijo quién descansa, con el círculo en su
   * color al 50 %. Se quita al llegar las etiquetas con nombre: eran dos señales
   * para lo mismo, y de las dos el número decía menos —"aquí pasa algo", y para
   * saber quién había que saberse la paleta— y además no era fiable, porque hoy
   * y el día elegido le ganaban y un descanso hoy no se veía.
   *
   * Su razón de ser tampoco sigue en pie: nació porque con vacaciones de otro el
   * mismo día la raya no se pintaba y el descanso se quedaba sin señal. Ahora
   * caben dos etiquetas por celda.
   */
  const numberClass = (() => {
    if (isSelected) return 'bg-primary text-white'
    if (isToday)    return 'bg-accent text-white'
    return 'text-ink'
  })()

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
    <div
      className={`flex w-full flex-col lg:min-h-[104px] lg:border-b lg:border-r lg:border-hairline ${
        /**
         * **Los días en los que no se trabaja llevan trama diagonal**: sábado,
         * domingo y festivo, los tres igual (26-08-2026). Es un solo concepto y
         * por eso una sola clase, `dia-libre` en `globals.css`: lo que tienen en
         * común un sábado y el 12 de octubre es que no hay trabajo ni colegio.
         *
         * Antes de esto se probaron dos cosas ese mismo día. **Rellenar la celda
         * en crema**, y se descartó porque una masa de color se lee como "esto
         * está apagado", y en una casa el fin de semana es cuando más pasa. Y
         * **una línea vertical** donde acaba la semana laboral, que a tamaño real
         * no se distinguía de las otras líneas de la rejilla: era una raya más.
         *
         * La trama va muy separada —1 px cada 7— porque la celda escribe títulos
         * a 10 px encima y una trama apretada se los come.
         */
        esDiaLibre ? 'dia-libre' : ''
      }`}
    >
      {/**
        * Las franjas de ausencia, pegadas al borde de arriba y **antes que nada**.
        * Ahí está la mitad del truco: lo que dura va fuera del flujo donde van las
        * cosas del día, así que no se puede confundir con la etiqueta de un
        * evento. La otra mitad la hace el carril gris de `franja-ausencia`.
        *
        * Se redondea donde el tramo empieza y acaba de verdad, para que los días
        * de en medio encadenen. Un descanso es un día suelto y se cierra por los
        * dos lados sin preguntar.
        *
        * Decorativas, como lo era la raya: a 7 px de alto nunca llegarían al
        * mínimo de toque de 24×24, y las ausencias se editan desde `Availability`.
        */}
      {ausencias.map(event => {
        const { primero, ultimo } = isVacation(event) ? vacationEdges(event, day) : { primero: true, ultimo: true }
        const redondeo = `${primero ? 'rounded-l-full' : ''} ${ultimo ? 'rounded-r-full' : ''}`
        return (
          <span key={event.id} className={`franja-ausencia ${redondeo}`} aria-hidden>
            <span
              className={`block h-full w-full ${redondeo}`}
              style={{ backgroundColor: eventColor(event, members, kids) }}
            />
          </span>
        )
      })}

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
      <DayChips festivos={festivos} />
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
            /**
             * **El color va al fondo del título, no en un punto aparte**
             * (26-08-2026). El punto de 6 px era una segunda cosa que mirar para
             * decir lo mismo que ya puede decir el propio título, y además
             * obligaba a leer dos elementos por evento en una celda que mide 120
             * px. Con el nombre sobre su color, de un vistazo se ve de quién es
             * cada cosa sin contar puntos.
             *
             * Al 50 %, como las etiquetas de las ausencias y por la misma razón
             * de contraste: mezclado con el fondo ningún color de la paleta
             * admite texto blanco y todos admiten tinta.
             *
             * El botón ocupa el ancho entero: una fila estrecha en la que hay que
             * acertar con el ratón es peor que una fila ancha.
             */
            className="etiqueta-persona min-h-5 w-full min-w-0 px-1 text-left text-[10px] leading-tight transition-shadow hover:shadow-sm"
            style={{ backgroundColor: fondoDePersona(eventColor(event, members, kids)) }}
          >
            {event.title}
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
