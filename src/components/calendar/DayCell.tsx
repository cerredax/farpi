import { eventColor, resolveAssignee } from '@/lib/assignees'
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

/** El fin de semana, en la cuenta de `Date.getDay()`. */
const SABADO = 6
const DOMINGO = 0

/** El primer día de la semana en la rejilla, en la cuenta de `Date.getDay()`. */
const LUNES = 1

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
function DayChips({ festivos, vacaciones, descansos, day, kids, members }: {
  festivos: Event[]
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
  if (festivos.length === 0 && ausencias.length === 0) {
    return <span className="block h-[4px] lg:hidden" aria-hidden />
  }

  return (
    <span className="flex w-full flex-col gap-px" aria-hidden>
      {/* El festivo **no lleva chip**: de que el día es festivo ya avisa la trama
          de toda la celda, y una etiqueta encima sería decirlo dos veces. Lo que
          queda es su nombre, en gris y sin fondo, que responde a la otra
          pregunta: cuál es. En móvil no cabe y no se pinta —la trama, sí—. */}
      {festivos.slice(0, MAX_AUSENCIAS).map(event => holidayName(event) && (
        <span
          key={event.id}
          className="hidden w-full truncate px-1 text-[10px] font-bold uppercase leading-tight tracking-wide text-muted lg:block"
        >
          {holidayName(event)}
        </span>
      ))}
      {ausencias.slice(0, MAX_AUSENCIAS).map(event => {
        const color = eventColor(event, members, kids)
        const quien = resolveAssignee(event, members, kids)?.name ?? 'Familia'
        // Un descanso es un día suelto: empieza y acaba en él, así que se cierra
        // por los dos lados sin preguntar.
        const { primero, ultimo } = isVacation(event) ? vacationEdges(event, day) : { primero: true, ultimo: true }

        /**
         * **El nombre se escribe una vez por banda, no en cada día** (26-08-2026).
         * Unas vacaciones de lunes a viernes ponían "Sofía" cinco veces seguidas,
         * que es ruido: la banda ya es continua y el color ya es el suyo, así
         * que a partir del segundo día el nombre no añade nada.
         *
         * Se escribe donde la banda **empieza a la vista**: el primer día del
         * tramo, y el lunes cuando el tramo viene de la semana anterior —si no,
         * una banda que cruza el domingo se quedaría sin nombre en toda su
         * segunda fila—.
         */
        const abreBanda = primero || day.getDay() === LUNES

        return (
          <span
            key={event.id}
            // `lg:min-h` y no `lg:h-auto` a secas: los días de en medio de la banda
            // van sin texto, y sin alto mínimo la etiqueta se quedaba en cero y la
            // banda desaparecía a partir del segundo día.
            className={`block h-[4px] w-full truncate lg:h-auto lg:min-h-[15px] lg:px-1 lg:text-[10px] lg:font-bold lg:leading-tight lg:text-ink ${
              primero ? 'rounded-l-full lg:rounded-l' : ''
            } ${ultimo ? 'rounded-r-full lg:rounded-r' : ''}`}
            style={{ backgroundColor: `${color}80` }}
          >
            <span className="hidden lg:inline">{abreBanda ? quien : ''}</span>
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
  const festivos = events.filter(isHoliday)
  // Sábado, domingo o festivo: los tres se pintan igual.
  const esDiaLibre = day.getDay() === SABADO || day.getDay() === DOMINGO || festivos.length > 0
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
      <DayChips festivos={festivos} vacaciones={vacaciones} descansos={descansos} day={day} kids={kids} members={members} />
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
            className="min-h-5 w-full min-w-0 truncate rounded px-1 text-left text-[10px] font-bold leading-tight text-ink transition-shadow hover:shadow-sm"
            style={{ backgroundColor: `${eventColor(event, members, kids)}80` }}
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
