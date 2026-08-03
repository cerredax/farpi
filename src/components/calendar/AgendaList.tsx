'use client'

import { useEffect } from 'react'
import {
  addDays,
  compareAsc,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Event, Child, FamilyMember } from '@/types'
import { resolveAssignee } from '@/lib/assignees'
import { eventCoversDay } from '@/lib/events'
import { capitalize } from '@/lib/text'
import { FAMILY_COLOR } from '@/lib/constants'

type AgendaMode = 'week' | 'agenda'

interface AgendaListProps {
  mode: AgendaMode
  selectedDay: Date
  currentMonth: Date
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  onSelectDay: (day: Date) => void
  onEdit: (event: Event) => void
  onAdd: (day?: Date) => void
}

function getEventColor(event: Event, kids: Child[], members: FamilyMember[]): string {
  if (event.color) return event.color
  if (event.child_id || event.member_id) {
    const asignado = resolveAssignee(event, members, kids)
    if (asignado) return asignado.color
  }
  return FAMILY_COLOR
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1
    if (!a.all_day && b.all_day) return 1
    return compareAsc(parseISO(a.start_at), parseISO(b.start_at))
  })
}

function EventRow({ event, kids, members, onEdit }: { event: Event; kids: Child[]; members: FamilyMember[]; onEdit: (event: Event) => void }) {
  const asignado = resolveAssignee(event, members, kids)
  const color = getEventColor(event, kids, members)

  return (
    <button
      onClick={() => onEdit(event)}
      className="w-full rounded-2xl border border-surface bg-white flex overflow-hidden text-left hover:border-faint active:scale-[0.99] transition-all"
    >
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex items-start gap-3 px-3 py-3 flex-1 min-w-0">
        <div className="flex items-center gap-1 min-w-[58px] pt-0.5">
          {event.all_day ? (
            <span className="text-[10px] font-bold text-muted leading-none">Todo el día</span>
          ) : (
            <>
              <Clock size={12} className="text-muted flex-shrink-0" strokeWidth={2} />
              <span className="text-xs font-bold text-muted">{format(parseISO(event.start_at), 'HH:mm')}</span>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink text-sm leading-snug">{event.title}</p>
          {event.description && <p className="text-xs text-muted mt-0.5 leading-snug">{event.description}</p>}
          {asignado && (
            <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: asignado.color }}>
              {asignado.name}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function AgendaList({ mode, selectedDay, events, kids, members, onSelectDay, onEdit, onAdd }: AgendaListProps) {
  const todayStart = startOfDay(new Date())
  const rangeStart = mode === 'week' ? todayStart : startOfDay(selectedDay)
  const rangeEnd = mode === 'week' ? addDays(todayStart, 7) : addDays(startOfDay(selectedDay), 45)

  useEffect(() => {
    if (mode !== 'week') return
    const el = document.getElementById(`day-${format(selectedDay, 'yyyyMMdd')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedDay, mode])

  const dayGroups = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(day => ({
    day,
    events: sortEvents(events.filter(event => eventCoversDay(event, day))),
  }))

  const visibleGroups = mode === 'week'
    ? dayGroups
    : dayGroups.filter(group => group.events.length > 0 || isSameDay(group.day, selectedDay))

  const headerTitle = mode === 'week' ? 'Agenda semanal' : 'Próximos eventos'

  const headerSubtitle = mode === 'week'
    ? `Del ${format(rangeStart, "d 'de' MMMM", { locale: es })} al ${format(rangeEnd, "d 'de' MMMM", { locale: es })}`
    : `Desde ${format(selectedDay, "d 'de' MMMM", { locale: es })}`

  return (
    <div className="flex-1 px-4 pt-4 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">{headerTitle}</p>
          <p className="text-sm font-bold text-ink">{headerSubtitle}</p>
        </div>
        <button
          onClick={() => onAdd(selectedDay)}
          aria-label="Añadir evento"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {visibleGroups.length === 0 ? (
        <button
          onClick={() => onAdd(selectedDay)}
          className="w-full bg-white rounded-2xl border border-surface shadow-sm text-left hover:border-primary transition-colors"
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
                id={`day-${format(group.day, 'yyyyMMdd')}`}
                className={`rounded-3xl border bg-white shadow-sm overflow-hidden transition-all ${
                  isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-3 bg-canvas/70">
                  <button
                    onClick={() => onSelectDay(group.day)}
                    className="flex items-center gap-3 text-left min-w-0"
                  >
                    <span className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${
                      isToday(group.day) ? 'bg-accent text-white' : 'bg-white text-ink'
                    }`}>
                      <span className="text-sm font-black leading-none">{format(group.day, 'd')}</span>
                      <span className="text-[9px] font-bold uppercase leading-none mt-0.5">{monthLabel}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-ink truncate">{dayLabel}</span>
                      <span className="block text-xs text-muted">
                        {group.events.length === 0
                          ? 'Sin eventos'
                          : `${group.events.length} ${group.events.length === 1 ? 'evento' : 'eventos'}`}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onAdd(group.day)}
                    aria-label={`Añadir evento el ${dayLabel}`}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-primary border border-line hover:border-primary active:scale-95 transition-all"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                </div>

                {group.events.length > 0 && (
                  <div className="p-2 space-y-2">
                    {group.events.map(event => (
                      <EventRow key={event.id} event={event} kids={kids} members={members} onEdit={onEdit} />
                    ))}
                  </div>
                )}
                {group.events.length === 0 && isSameDay(group.day, selectedDay) && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => onAdd(group.day)}
                      className="w-full text-center text-xs text-primary font-bold py-2.5 rounded-xl border border-dashed border-primary/40 hover:border-primary hover:bg-primary-tint transition-colors"
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
