import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, getDate, parseISO } from 'date-fns'
import { DayCell } from './DayCell'
import type { Event, Child } from '@/types'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface MonthGridProps {
  currentMonth: Date
  selectedDay: Date
  events: Event[]
  kids: Child[]
  density?: 'compact' | 'detailed'
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

export function MonthGrid({
  currentMonth,
  selectedDay,
  events,
  kids,
  density = 'compact',
  onSelectDay,
  onEditEvent,
  onAddEvent,
}: MonthGridProps) {
  const days = getMonthDays(currentMonth)
  const isDetailed = density === 'detailed'

  return (
    <div className={isDetailed ? 'px-1.5 sm:px-2 pb-2' : 'px-2'}>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(label => (
          <div key={label} className={`flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[#77716A] ${isDetailed ? 'h-6' : 'h-7'}`}>
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
            isCurrentMonth={isSameMonth(day, currentMonth)}
            events={events.filter(e => isSameDay(parseISO(e.start_at), day))}
            kids={kids}
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
