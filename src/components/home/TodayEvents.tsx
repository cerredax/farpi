import Link from 'next/link'
import { Clock, Heart } from 'lucide-react'
import { memo } from 'react'
import type { Event, Child, FamilyMember } from '@/types'
import { resolveAssignee } from '@/lib/assignees'
import { format } from 'date-fns'

interface TodayEventsProps {
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  /** Qué decir cuando el día está vacío. */
  calmMessage: string
}

function formatTime(dateStr: string) {
  return format(new Date(dateStr), 'HH:mm')
}

/**
 * Los planes de hoy, dentro del saludo. Van juntos porque responden a lo mismo
 * —"¿qué tenemos hoy?"— y separarlos obligaba a leer dos bloques seguidos que
 * decían casi lo mismo: el saludo ya adelantaba el próximo evento.
 */
export const TodayEvents = memo(function TodayEvents({ events, kids, members, calmMessage }: TodayEventsProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-3xl bg-white/80 border border-white px-4 py-2.5 shadow-sm">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F1E6D8] text-[#9A6B55]">
          <Heart size={16} fill="currentColor" strokeWidth={2.4} />
        </span>
        <p className="min-w-0 text-sm font-bold text-ink leading-snug">{calmMessage}</p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl bg-white/80 border border-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-hairline">
        {events.map(event => {
          const asignado = resolveAssignee(event, members, kids)
          return (
            <li key={event.id} className="flex items-start gap-3 px-4 py-3">
              <div className="flex items-center gap-1.5 min-w-[52px] pt-0.5">
                <Clock size={13} className="text-muted" strokeWidth={2} />
                <span className="text-xs font-bold text-muted">
                  {event.all_day ? 'Todo el día' : formatTime(event.start_at)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ink text-sm leading-snug">{event.title}</p>
                {asignado && (
                  <span
                    className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: asignado.color }}
                  >
                    {asignado.name}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-hairline px-4 py-2.5">
        <Link href="/calendar" className="text-xs font-semibold text-primary hover:underline">
          Ver calendario
        </Link>
      </div>
    </div>
  )
})
