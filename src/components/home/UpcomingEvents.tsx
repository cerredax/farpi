import Link from 'next/link'
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
  if (isToday(d))    return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  if (isThisWeek(d)) return format(d, 'EEEE', { locale: es })
  return format(d, "d 'de' MMMM", { locale: es })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function UpcomingEvents({ events, kids }: UpcomingEventsProps) {
  return (
    <CardSection label="Próximos días">
      <Card padded={false}>
        {events.length === 0 ? (
          <EmptyState emoji="🌿" title="Sin eventos próximos" description="La semana está tranquila" />
        ) : (
          <ul className="divide-y divide-[#F5F2EE]">
            {events.map((event) => {
              const child = kids.find(c => c.id === event.child_id)
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
            Ver calendario →
          </Link>
        </div>
      </Card>
    </CardSection>
  )
}
