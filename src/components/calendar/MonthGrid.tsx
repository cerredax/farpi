import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, getDate } from 'date-fns'
import { DayCell } from './DayCell'
import type { Event, Child, FamilyMember } from '@/types'
import { eventCoversDay } from '@/lib/events'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface MonthGridProps {
  currentMonth: Date
  selectedDay: Date
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  density?: 'compact' | 'detailed'
  /**
   * Con una fecha, pinta solo su semana en vez del mes entero. Es el modo
   * plegado del móvil: el mes completo se come media pantalla para enseñar
   * sobre todo días que no se van a tocar.
   */
  weekOf?: Date | null
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

function getWeekDays(day: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(day, { weekStartsOn: 1 }),
    end:   endOfWeek(day,   { weekStartsOn: 1 }),
  })
}

export function MonthGrid({
  currentMonth,
  selectedDay,
  events,
  kids,
  members,
  density = 'compact',
  weekOf = null,
  onSelectDay,
  onEditEvent,
  onAddEvent,
}: MonthGridProps) {
  const days = weekOf ? getWeekDays(weekOf) : getMonthDays(currentMonth)
  const isDetailed = density === 'detailed'

  return (
    <div className={isDetailed ? 'px-1.5 sm:px-2 pb-2' : 'px-2'}>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(label => (
          <div key={label} className={`flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted ${isDetailed ? 'h-6' : 'h-7'}`}>
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
            isCurrentMonth={weekOf ? true : isSameMonth(day, currentMonth)}
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
