import { eachDayOfInterval, endOfMonth, endOfWeek, getDate, isSameDay, isSameMonth, isToday, isWeekend, startOfMonth, startOfWeek } from 'date-fns'
import { DayCell } from './DayCell'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { eventCoversDay, isRestDay, isVacation, vacationEdges } from '@/lib/events'
import { eventColor } from '@/lib/assignees'
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

/** Las líneas de la rejilla, solo en escritorio. Las comparten las celdas y los huecos. */
const HUECO = 'lg:border-b lg:border-r lg:border-hairline'

/** Cuántas ausencias se pintan en un hueco de fuera de mes. Mismo tope que `DayCell`. */
const MAX_AUSENCIAS = 2

interface MonthGridProps {
  currentMonth: Date
  selectedDay: Date
  events: Event[]
  /** Pendientes de toda la familia; cada día se queda con las que le tocan. */
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onSelectDay: (day: Date) => void
  /** Abrir un evento desde la celda. Escritorio: es donde se escriben los títulos. */
  onOpenEvent?: (event: Event) => void
}

function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),     { weekStartsOn: 1 }),
  })
}

export function MonthGrid({ currentMonth, selectedDay, events, tasks, kids, members, onSelectDay, onOpenEvent }: MonthGridProps) {
  const days = getMonthDays(currentMonth)
  const hoyStr = getLocalDateString(new Date())

  return (
    /**
     * **La rejilla se dibuja como una rejilla** en escritorio (26-08-2026). No
     * tenía ni una línea: eran números flotando en un fondo blanco, y una
     * pantalla grande con pocos eventos se leía como un vacío en vez de como un
     * calendario. En móvil no se pintan: a 50 px de celda las líneas son más
     * ruido que estructura, y ahí la rejilla se lee bien por proximidad.
     */
    <div className="px-2 pb-1 lg:px-0 lg:pb-0">
      <div className="mb-1 grid grid-cols-7 lg:mb-0 lg:border-b lg:border-hairline">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            // Sábado y domingo también en la cabecera: la trama empieza en las
            // letras, que si no la columna arranca a media altura. Aquí se mira el
            // índice de columna y no una fecha —no hay ninguna—: son las dos
            // últimas de `DAY_LABELS`.
            className={`flex h-7 items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted ${
              i >= 5 ? 'dia-libre' : ''
            }`}
          >
            {label}
          </div>
        ))}
      </div>
      {/* Sin hueco entre columnas: la raya de los días de ausencia tiene que
          tocarse para leerse como un tramo. */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          if (!isSameMonth(day, currentMonth)) {
            /**
             * **Los días de las puntas se pintan, pero rellenos** (26-08-2026).
             * Cuando un mes empieza en martes, el lunes de esa fila es el 31 del
             * mes anterior, y dejarlo en blanco corta la semana por la mitad: la
             * fila deja de leerse como una semana.
             *
             * Estuvieron en blanco desde el 24-08-2026, y con motivo: antes se
             * pintaban **igual que los días del mes**, solo con el número en
             * gris, y así se leían como días sueltos que no decían de qué mes
             * eran. El relleno arregla justo eso: con el fondo teñido ya no
             * tienen la misma forma que los suyos.
             *
             * El gris es `--color-surface`, el mismo tono que ya usan los
             * estados de superficie/hover de la app: no es el crema del fondo de
             * página, que se probó primero y no se distinguía de él.
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
            const ausenciasHueco = events
              .filter(e => eventCoversDay(e, day) && (isVacation(e) || isRestDay(e)))
              .slice(0, MAX_AUSENCIAS)
            return (
              <span
                key={day.toISOString()}
                aria-hidden
                className={`${HUECO} flex flex-col items-center bg-surface py-1 lg:min-h-[104px] ${
                  isWeekend(day) ? 'dia-libre' : ''
                }`}
              >
                {ausenciasHueco.map(event => {
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
                <span className="flex h-8 w-8 items-center justify-center text-sm font-bold text-faint">
                  {getDate(day)}
                </span>
              </span>
            )
          }

          const diaStr = getLocalDateString(day)
          const delDia = events.filter(e => eventCoversDay(e, day))
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
              onOpenEvent={onOpenEvent}
            />
          )
        })}
      </div>
    </div>
  )
}
