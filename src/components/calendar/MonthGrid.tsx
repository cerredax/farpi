import { eachDayOfInterval, endOfMonth, endOfWeek, getDate, getDay, isSameDay, isSameMonth, isToday, isWeekend, startOfMonth, startOfWeek } from 'date-fns'
import { DayCell, estiloDeCarril } from './DayCell'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { carrilDeAusencias, eventCoversDay, familyAbsenceEdges, familyAbsenceKind, franjasDeAusencia, isVacation, topeDeFranjas, vacationEdges } from '@/lib/events'
import { eventColor } from '@/lib/assignees'
import { FAMILY_COLOR } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'

/**
 * El mes como mapa: sirve para saber dónde hay algo y para ir allí, no para
 * leer lo que hay. Lo que hay se lee en la agenda, debajo en móvil y en la
 * columna de la derecha en escritorio.
 *
 * **Un mes y solo un mes** (24-08-2026). La rejilla se sigue dibujando por
 * semanas completas —si no, las columnas dejarían de ser días de la semana— pero
 * los huecos de las puntas van en blanco en vez de prestar días de julio y de
 * septiembre. Antes pintaba once días de otros meses en gris: con la misma forma
 * que los de agosto, se leían como días sueltos que no decían de qué mes eran, y
 * era el mayor foco de ruido de la pantalla. Lo que se pierde es poder tocar el
 * 1 de septiembre desde agosto; se llega con la flecha, que es un toque igual.
 *
 * Toda fila tiene al menos un día del mes —`startOfWeek(startOfMonth)` a
 * `endOfWeek(endOfMonth)` no puede dar una semana entera fuera—, así que ninguna
 * queda a cero de alto por mucho que sus huecos estén vacíos.
 *
 * Es siempre el mes entero. La variante de "siete días" que tenía antes se
 * mudó a `WeekStrip`, que es quien la necesita, y con ella se fueron las dos
 * densidades: la ancha con títulos dentro de las celdas no la usaba nadie.
 */

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Las líneas de la rejilla. Las comparten las celdas y los huecos. */
const HUECO = 'border-b border-r border-line'

interface MonthGridProps {
  currentMonth: Date
  selectedDay: Date
  events: Event[]
  /** Pendientes de toda la familia; cada día se queda con las que le tocan. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelectDay: (day: Date) => void
  /** Apuntar algo un día, con doble clic en su celda. */
  onCreateDay?: (day: Date) => void
  /** Abrir un evento desde la celda. Escritorio: es donde se escriben los títulos. */
  onOpenEvent?: (event: Event) => void
}

function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),     { weekStartsOn: 1 }),
  })
}

export function MonthGrid({ currentMonth, selectedDay, events, tasks, kids, members, onSelectDay, onCreateDay, onOpenEvent }: MonthGridProps) {
  const days = getMonthDays(currentMonth)
  const hoyStr = getLocalDateString(new Date())

  /**
   * La columna en la que cae hoy, para marcarla en la cabecera. `null` cuando el
   * mes que se está mirando no es el de hoy: ahí no hay ninguna columna que sea
   * "la de hoy" y pintarla sería señalar un día que no está en pantalla.
   *
   * `getDay` da 0 para el domingo y la rejilla empieza en lunes, de ahí el
   * desplazamiento: es la misma cuenta que ordena `DAY_LABELS`.
   */
  const columnaDeHoy = days.some(d => isToday(d) && isSameMonth(d, currentMonth))
    ? (getDay(new Date()) + 6) % 7
    : null

  /**
   * Lo que hay cada día, resuelto **antes** de pintar nada.
   *
   * Se calculaba dentro del `map` y ahora no puede: el carril de las franjas se
   * reserva por el mes entero, así que para saber cuánto reserva el lunes hay que
   * haber mirado ya todos los demás días. Se hace una sola vez y lo aprovechan las dos
   * ramas —la celda del mes y el hueco de fuera de mes—, que hasta ahora
   * repetían las mismas cuatro llamadas cada una.
   */
  const info = days.map(day => {
    const delDia = events.filter(e => eventCoversDay(e, day))
    // Si ese día no hay nadie, y dónde empieza y acaba el tramo. Se calcula
    // **aquí y no en la celda** porque saber si la franja se redondea exige
    // mirar el día anterior y el siguiente, y la celda solo conoce el suyo:
    // `events` entero vive en este componente.
    const familia = familyAbsenceKind(events, members, day)
    const sueltas = franjasDeAusencia(delDia, familia).slice(0, topeDeFranjas(familia))
    return {
      day,
      delDia,
      familia,
      bordes: familia ? familyAbsenceEdges(events, members, day) : null,
      sueltas,
      franjas: (familia ? 1 : 0) + sueltas.length,
    }
  })
  const carriles = carrilDeAusencias(info.map(d => d.franjas))

  return (
    /**
     * **La rejilla se dibuja como una rejilla**, en los dos tamaños. En
     * escritorio desde el 26-08-2026, cuando no tenía ni una línea y una pantalla
     * grande con pocos eventos se leía como un vacío en vez de como un
     * calendario. En móvil se dejaron fuera entonces, apostando a que la
     * proximidad bastaba para leer las columnas; no bastaba: con las celdas casi
     * pegadas, un número y sus puntos se confundían con los del día de al lado y
     * costaba seguir una semana en horizontal (31-08-2026).
     *
     * Van en `--color-line`, el borde normal de la app, y no en el `hairline` con
     * el que nacieron: a 52 px de celda el hairline sobre blanco casi no existe,
     * y una línea que no se ve no separa nada. El mismo tono en las dos tallas,
     * que es lo que hace que la pantalla sea la misma pantalla.
     *
     * Sin relleno alrededor: las líneas tienen que morir en el borde de la
     * `Card`, o la última columna y la última fila quedan flotando a dos píxeles
     * del marco y se ve el remiendo.
     */
    <div>
      <div className="grid grid-cols-7 border-b border-line">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            // Sábado y domingo también en la cabecera: la trama empieza en las
            // letras, que si no la columna arranca a media altura. Aquí se mira el
            // índice de columna y no una fecha —no hay ninguna—: son las dos
            // últimas de `DAY_LABELS`.
            className={`flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-widest ${
              i >= 5 ? 'dia-libre' : ''
            } ${columnaDeHoy === i ? 'text-accent-strong' : 'text-muted'}`}
          >
            {/**
              * **La letra de hoy va sobre una pastilla salmón** (14-09-2026).
              * Hoy se marcaba solo en su número, un aro de 32 px perdido entre
              * treinta y tantos, y en una pantalla de 1440 px había que buscarlo.
              * Desde la cabecera la columna se encuentra de un vistazo y el aro
              * remata la búsqueda en la fila que toque.
              *
              * El color es el mismo de siempre —`accent-strong` sobre
              * `accent-tint`, 6,0:1— y no es lo único que la distingue: es la
              * única letra de la fila con fondo. Va dentro de un `span` y no en
              * el `div` de la columna para que la pastilla mida lo que la letra
              * y no el ancho entero, que sobre la trama del sábado se leería
              * como que ese día está apagado.
              */}
            <span className={columnaDeHoy === i ? 'rounded-full bg-accent-tint px-2 py-0.5' : ''}>
              {label}
            </span>
          </div>
        ))}
      </div>
      {/* Sin hueco entre columnas: la raya de los días de ausencia tiene que
          tocarse para leerse como un tramo. */}
      <div className="grid grid-cols-7">
        {info.map(({ day, delDia, familia, bordes, sueltas }, i) => {
          if (!isSameMonth(day, currentMonth)) {
            /**
             * **Los días de las puntas se pintan, sobre el mismo fondo que el
             * resto** (26-08-2026). Cuando un mes empieza en martes, el lunes de
             * esa fila es el 31 del mes anterior, y dejarlo en blanco corta la
             * semana por la mitad: la fila deja de leerse como una semana.
             *
             * Estuvieron en blanco desde el 24-08-2026, y rellenos de
             * `--color-surface` desde el 26-08-2026 para que no se confundieran
             * con los días del mes. El relleno se quitó el 31-08-2026: con las
             * líneas de la rejilla ya dibujadas, el bloque gris se veía como un
             * parche pegado a la esquina del calendario. El número en gris
             * (`text-faint`) basta para decir que ese día no es de este mes.
             *
             * Siguen sin ser botones y sin enseñar nada de lo que pasa ese día:
             * están para cerrar la semana, no para consultarlos. Al 1 de
             * septiembre se llega con la flecha, que es un toque igual.
             *
             * La franja de ausencia es la excepción: unas vacaciones o un
             * descanso duran lo que duran, y cortarlos en la frontera del mes
             * rompería el tramo justo donde sigue. Se pinta igual que en
             * `DayCell`, solo que aquí no hay botón debajo que abrirla.
             */
            // El hueco sale del mismo `info` que la celda, así que colapsa igual
            // y reparte igual: si el 31 de agosto no hay nadie y el 1 de
            // septiembre tampoco, el tramo amarillo cruza la frontera del mes
            // entero en vez de partirse en dos idiomas a mitad de fila.
            return (
              <span
                key={day.toISOString()}
                aria-hidden
                // Sin relleno arriba, y el número con el suyo debajo: es la forma
                // exacta de `DayCell` —contenedor, franjas pegadas al borde y
                // luego el día— y es lo que hace que la raya de un tramo entre en
                // el mes vecino **a la misma altura**. Con `py-1` en el
                // contenedor, las franjas del hueco caían cuatro píxeles más
                // abajo que las de al lado y el tramo se veía escalonado.
                className={`${HUECO} flex w-full flex-col min-h-[52px] lg:min-h-[max(104px,calc((100vh-26rem)/6))] ${
                  isWeekend(day) ? 'dia-libre' : ''
                }`}
              >
                {/* Con el mismo carril reservado que las celdas: es lo que hace
                    que un tramo entre en el mes vecino a la misma altura. */}
                <span className="block w-full flex-shrink-0" style={estiloDeCarril(carriles[i])}>
                  {familia && bordes && (() => {
                    const redondeo = `${bordes.primero ? 'rounded-l-full' : ''} ${bordes.ultimo ? 'rounded-r-full' : ''}`
                    return (
                      <span className={`franja-ausencia ${redondeo}`}>
                        <span className={`block h-full w-full ${redondeo}`} style={{ backgroundColor: FAMILY_COLOR }} />
                      </span>
                    )
                  })()}
                  {sueltas.map(event => {
                    const { primero, ultimo } = isVacation(event) ? vacationEdges(event, day) : { primero: true, ultimo: true }
                    const redondeo = `${primero ? 'rounded-l-full' : ''} ${ultimo ? 'rounded-r-full' : ''}`
                    return (
                      <span key={event.id} className={`franja-ausencia ${redondeo}`}>
                        <span
                          className={`block h-full w-full ${redondeo}`}
                          style={{ backgroundColor: eventColor(event, members, kids) }}
                        />
                      </span>
                    )
                  })}
                </span>
                <span className="flex w-full flex-col items-center py-1">
                  <span className="flex h-8 w-8 items-center justify-center text-sm font-bold text-faint">
                    {getDate(day)}
                  </span>
                </span>
              </span>
            )
          }

          const diaStr = getLocalDateString(day)
          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              dayNumber={getDate(day)}
              isToday={isToday(day)}
              isSelected={isSameDay(day, selectedDay)}
              events={delDia}
              tasks={tasks.filter(t => t.due_date && (t.due_date < hoyStr ? diaStr === hoyStr : t.due_date === diaStr))}
              kids={kids}
              members={members}
              onSelect={onSelectDay}
              ausenciaFamiliar={familia && bordes ? { kind: familia, ...bordes } : null}
              carril={carriles[i]}
              onCreate={onCreateDay}
              onOpenEvent={onOpenEvent}
            />
          )
        })}
      </div>
    </div>
  )
}
