import { compareAsc, format, parseISO } from 'date-fns'
import type { Event, Child } from '@/types'

interface DayCellProps {
  day: Date
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  isCurrentMonth: boolean
  events: Event[]
  kids: Child[]
  density?: 'compact' | 'detailed'
  onSelect: (day: Date) => void
  onEditEvent?: (event: Event) => void
  onAddEvent?: (day: Date) => void
}

function getEventColor(event: Event, kids: Child[]): string {
  if (event.color) return event.color
  if (event.child_id) {
    const child = kids.find(c => c.id === event.child_id)
    if (child) return child.color
  }
  return '#E9C46A'
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1
    if (!a.all_day && b.all_day) return 1
    return compareAsc(parseISO(a.start_at), parseISO(b.start_at))
  })
}

function getShortEventLabel(event: Event): string {
  const prefix = event.all_day ? '' : `${format(parseISO(event.start_at), 'HH:mm')} `
  return `${prefix}${event.title}`
}

export function DayCell({
  day,
  dayNumber,
  isToday,
  isSelected,
  isCurrentMonth,
  events,
  kids,
  density = 'compact',
  onSelect,
  onEditEvent,
  onAddEvent,
}: DayCellProps) {
  const sortedEvents = sortEvents(events)
  const visibleEvents = sortedEvents.slice(0, density === 'detailed' ? 2 : 3)
  const hiddenCount = Math.max(sortedEvents.length - visibleEvents.length, 0)

  const numberClass = (() => {
    if (isSelected)      return 'bg-[#8BA888] text-white'
    if (isToday)         return 'bg-[#D8A48F] text-white'
    if (!isCurrentMonth) return 'text-[#C4BFB9]'
    return 'text-[#252525] hover:bg-[#EDE9E3]'
  })()

  if (density === 'compact') {
    return (
      <button
        onClick={() => onSelect(day)}
        aria-label={day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        aria-pressed={isSelected}
        className="flex flex-col items-center gap-0.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BA888] rounded-xl"
      >
        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${numberClass}`}>
          {dayNumber}
        </span>
        <div className="h-2 flex items-center justify-center gap-[3px]">
          {visibleEvents.map((event, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getEventColor(event, kids) }} />
          ))}
        </div>
      </button>
    )
  }

  return (
    <div
      className={`min-h-[86px] sm:min-h-[96px] rounded-xl border bg-white p-1 transition-all ${
        isSelected ? 'border-[#8BA888] ring-2 ring-[#8BA888]/10' : 'border-[#F0EDE8]'
      } ${!isCurrentMonth ? 'opacity-45' : ''}`}
    >
      <div className="flex items-center justify-between gap-0.5 mb-1">
        <button
          onClick={() => onSelect(day)}
          aria-label={day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          aria-pressed={isSelected}
          className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black transition-colors ${numberClass}`}
        >
          {dayNumber}
        </button>
        <button
          onClick={() => onAddEvent?.(day)}
          aria-label={`Añadir evento el día ${dayNumber}`}
          className="w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-black text-[#8BA888] hover:bg-[#F1F5EF] transition-colors"
        >
          +
        </button>
      </div>

      <div className="space-y-0.5">
        {visibleEvents.map(event => {
          const color = getEventColor(event, kids)
          return (
            <button
              key={event.id}
              onClick={() => onEditEvent?.(event)}
              className="w-full rounded-md px-1 py-0.5 text-left text-[9px] font-bold leading-tight text-[#252525] bg-[#FAF7F2] hover:bg-[#F2EEE8] transition-colors"
              title={getShortEventLabel(event)}
            >
              <span className="flex items-start gap-1 min-w-0">
                <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{getShortEventLabel(event)}</span>
              </span>
            </button>
          )
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => onSelect(day)}
            className="w-full text-left text-[9px] font-black text-[#8BA888] px-1"
          >
            +{hiddenCount}
          </button>
        )}
      </div>
    </div>
  )
}
