import {
  addDays,
  compareAsc,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Event, Child } from '@/types'

type AgendaMode = 'week' | 'agenda'

interface AgendaListProps {
  mode: AgendaMode
  selectedDay: Date
  currentMonth: Date
  events: Event[]
  kids: Child[]
  onSelectDay: (day: Date) => void
  onEdit: (event: Event) => void
  onAdd: (day?: Date) => void
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

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

function EventRow({ event, kids, onEdit }: { event: Event; kids: Child[]; onEdit: (event: Event) => void }) {
  const child = kids.find(c => c.id === event.child_id)
  const color = getEventColor(event, kids)

  return (
    <button
      onClick={() => onEdit(event)}
      className="w-full rounded-2xl border border-[#F0EDE8] bg-white flex overflow-hidden text-left hover:border-[#C4BFB9] active:scale-[0.99] transition-all"
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex items-start gap-3 px-3 py-3 flex-1 min-w-0">
        <div className="flex items-center gap-1 min-w-[58px] pt-0.5">
          {event.all_day ? (
            <span className="text-[10px] font-bold text-[#77716A] leading-none">Todo el día</span>
          ) : (
            <>
              <Clock size={12} className="text-[#77716A] flex-shrink-0" strokeWidth={2} />
              <span className="text-xs font-bold text-[#77716A]">{format(parseISO(event.start_at), 'HH:mm')}</span>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#252525] text-sm leading-snug">{event.title}</p>
          {event.description && <p className="text-xs text-[#77716A] mt-0.5 leading-snug">{event.description}</p>}
          {child && (
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: child.color }}>
              {child.name}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function AgendaList({ mode, selectedDay, currentMonth, events, kids, onSelectDay, onEdit, onAdd }: AgendaListProps) {
  const rangeStart = mode === 'week'
    ? startOfWeek(selectedDay, { weekStartsOn: 1 })
    : selectedDay

  const rangeEnd = mode === 'week'
    ? endOfWeek(selectedDay, { weekStartsOn: 1 })
    : addDays(selectedDay, 45)

  const dayGroups = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(day => ({
    day,
    events: sortEvents(events.filter(event => isSameDay(parseISO(event.start_at), day))),
  }))

  const visibleGroups = mode === 'week'
    ? dayGroups
    : dayGroups.filter(group => group.events.length > 0 || isSameDay(group.day, selectedDay))

  const headerTitle = mode === 'week' ? 'Agenda semanal' : 'Próximos eventos'

  const headerSubtitle = mode === 'week'
    ? `Del ${format(rangeStart, 'd MMM', { locale: es })} al ${format(rangeEnd, 'd MMM', { locale: es })}`
    : `Desde ${format(selectedDay, "d 'de' MMMM", { locale: es })}`

  return (
    <div className="flex-1 px-4 pt-4 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#77716A]">{headerTitle}</p>
          <p className="text-sm font-bold text-[#252525]">{headerSubtitle}</p>
        </div>
        <button
          onClick={() => onAdd(selectedDay)}
          aria-label="Añadir evento"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#8BA888] text-white hover:bg-[#7a9877] active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {visibleGroups.length === 0 ? (
        <button
          onClick={() => onAdd(selectedDay)}
          className="w-full bg-white rounded-2xl border border-[#F0EDE8] shadow-sm text-left hover:border-[#8BA888] transition-colors"
        >
          <EmptyState
            emoji="✨"
            title={mode === 'week' ? 'Semana libre' : 'Sin próximos eventos'}
            description="Toca para añadir un evento"
          />
        </button>
      ) : (
        <div className="space-y-3">
          {visibleGroups.map(group => {
            const isSelected = isSameDay(group.day, selectedDay)
            const dayLabel = capitalize(format(group.day, "EEEE d", { locale: es }))
            const monthLabel = format(group.day, 'MMM', { locale: es })

            return (
              <section
                key={group.day.toISOString()}
                className={`rounded-3xl border bg-white shadow-sm overflow-hidden transition-all ${
                  isSelected ? 'border-[#8BA888] ring-2 ring-[#8BA888]/10' : 'border-[#F0EDE8]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-3 bg-[#FAF7F2]/70">
                  <button
                    onClick={() => onSelectDay(group.day)}
                    className="flex items-center gap-3 text-left min-w-0"
                  >
                    <span className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${
                      isToday(group.day) ? 'bg-[#D8A48F] text-white' : 'bg-white text-[#252525]'
                    }`}>
                      <span className="text-sm font-black leading-none">{format(group.day, 'd')}</span>
                      <span className="text-[9px] font-bold uppercase leading-none mt-0.5">{monthLabel}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-[#252525] truncate">{dayLabel}</span>
                      <span className="block text-xs text-[#77716A]">
                        {group.events.length === 0
                          ? 'Sin eventos'
                          : `${group.events.length} ${group.events.length === 1 ? 'evento' : 'eventos'}`}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onAdd(group.day)}
                    aria-label={`Añadir evento el ${dayLabel}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-[#8BA888] border border-[#EDE9E3] hover:border-[#8BA888] active:scale-95 transition-all"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>

                {group.events.length > 0 && (
                  <div className="p-2 space-y-2">
                    {group.events.map(event => (
                      <EventRow key={event.id} event={event} kids={kids} onEdit={onEdit} />
                    ))}
                  </div>
                )}
                {group.events.length === 0 && isSameDay(group.day, selectedDay) && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => onAdd(group.day)}
                      className="w-full text-center text-xs text-[#8BA888] font-bold py-2.5 rounded-xl border border-dashed border-[#8BA888]/40 hover:border-[#8BA888] hover:bg-[#F1F5EF] transition-colors"
                    >
                      + Añadir evento este día
                    </button>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
