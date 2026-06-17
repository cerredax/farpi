import Link from 'next/link'
import { memo, useMemo } from 'react'
import { Card, CardSection } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Event, Child } from '@/types'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { es } from 'date-fns/locale'

interface UpcomingEventsProps {
  events: Event[]
  kids: Child[]
}

function eventDayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Manana'
  if (isThisWeek(d)) return format(d, 'EEEE', { locale: es })
  return format(d, "d 'de' MMMM", { locale: es })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const UpcomingEvents = memo(function UpcomingEvents({ events, kids }: UpcomingEventsProps) {
  const kidsById = useMemo(() => new Map(kids.map(child => [child.id, child])), [kids])

  return (
    <CardSection label="Esta semana">
      <Card padded={false}>
        {events.length === 0 ? (
          <EmptyState emoji="☘" title="Semana tranquila" description="No hay planes proximos" />
        ) : (
          <ul className="divide-y divide-[#F5F2EE]">
            {events.map((event) => {
              const child = event.child_id ? kidsById.get(event.child_id) : undefined
              return (
                <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-[#8BA888] min-w-[64px] pt-0.5 capitalize">
                    {capitalize(eventDayLabel(event.start_at))}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#252525] text-sm leading-snug">{event.title}</p>
                    {child && (
                      <span
                        className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: child.color }}
                      >
                        {child.name}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="border-t border-[#F5F2EE] px-4 py-2.5">
          <Link href="/calendar" className="text-xs font-semibold text-[#8BA888] hover:underline">
            Ver calendario
          </Link>
        </div>
      </Card>
    </CardSection>
  )
})
