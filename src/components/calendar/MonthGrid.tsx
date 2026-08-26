import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, getDate } from 'date-fns'
import { DayCell } from './DayCell'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { eventCoversDay } from '@/lib/events'
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
            // letras, que si no la columna arranca a media altura.
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
             * Es el mismo relleno que se descartó para los fines de semana
             * porque se leía como "estas celdas están apagadas". Aquí eso es
             * exactamente lo que hay que decir.
             *
             * Siguen sin ser botones y sin enseñar nada de lo que pasa ese día:
             * están para cerrar la semana, no para consultarlos. Al 1 de
             * septiembre se llega con la flecha, que es un toque igual.
             */
            return (
              <span
                key={day.toISOString()}
                aria-hidden
                className={`${HUECO} flex flex-col items-center bg-canvas py-1 lg:min-h-[104px] ${
                  [0, 6].includes(day.getDay()) ? 'dia-libre' : ''
                }`}
              >
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
