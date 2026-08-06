import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay, isSameMonth, isToday, getDate, getDay } from 'date-fns'
import { DayCell } from './DayCell'
import type { Event, Child, FamilyMember } from '@/types'
import { eventCoversDay } from '@/lib/events'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** `getDay()` cuenta desde el domingo; aquí la semana empieza en lunes. */
function dayLabel(day: Date): string {
  return DAY_LABELS[(getDay(day) + 6) % 7]
}

interface MonthGridProps {
  currentMonth: Date
  selectedDay: Date
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  density?: 'compact' | 'detailed'
  /**
   * Con una fecha, pinta los siete días que empiezan en ella en vez del mes
   * entero. Es el modo plegado del móvil: el mes completo se come media
   * pantalla para enseñar sobre todo días que no se van a tocar.
   *
   * Son siete días **rodantes**, no la semana natural de lunes a domingo: el
   * tramo tiene que ser exactamente el que lista la agenda, y esa empieza hoy.
   * Antes esto recibía un día y pintaba su semana natural, así que la tira
   * decía "3 al 9" mientras la lista decía "del 6 al 13".
   */
  weekStart?: Date | null
  onSelectDay: (day: Date) => void
  onEditEvent?: (event: Event) => void
  onAddEvent?: (day: Date) => void
}

function getMonthDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),     { weekStartsOn: 1 }),
  })
}

function getWeekDays(start: Date): Date[] {
  return eachDayOfInterval({ start, end: addDays(start, 6) })
}

export function MonthGrid({
  currentMonth,
  selectedDay,
  events,
  kids,
  members,
  density = 'compact',
  weekStart = null,
  onSelectDay,
  onEditEvent,
  onAddEvent,
}: MonthGridProps) {
  const days = weekStart ? getWeekDays(weekStart) : getMonthDays(currentMonth)
  const isDetailed = density === 'detailed'

  // En el mes las columnas son siempre lunes→domingo, así que la cabecera es
  // fija. En la semana rodante cada columna es el día que le toque, y la
  // inicial tiene que seguirlo: si el tramo abre en jueves, la primera es J.
  const labels = weekStart ? days.map(dayLabel) : DAY_LABELS

  return (
    <div className={isDetailed ? 'px-1.5 sm:px-2 pb-2' : 'px-2'}>
      <div className="grid grid-cols-7 mb-1">
        {labels.map((label, i) => (
          <div key={i} className={`flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted ${isDetailed ? 'h-6' : 'h-7'}`}>
            {label}
          </div>
        ))}
      </div>
      <div className={`grid grid-cols-7 ${isDetailed ? 'gap-0.5 sm:gap-1' : ''}`}>
        {days.map(day => (
          <DayCell
            key={day.toISOString()}
            day={day}
            dayNumber={getDate(day)}
            isToday={isToday(day)}
            isSelected={isSameDay(day, selectedDay)}
            // Plegado no hay "otro mes" del que distinguirse: se ve una semana
            // suelta, y atenuar sus días la partiría en dos sin motivo.
            isCurrentMonth={weekStart ? true : isSameMonth(day, currentMonth)}
            events={events.filter(e => eventCoversDay(e, day))}
            kids={kids}
            members={members}
            density={density}
            onSelect={onSelectDay}
            onEditEvent={onEditEvent}
            onAddEvent={onAddEvent}
          />
        ))}
      </div>
    </div>
  )
}
