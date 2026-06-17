import Link from 'next/link'
import { Clock } from 'lucide-react'
import { memo, useMemo } from 'react'
import { Card, CardSection } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Event, Child } from '@/types'
import { format } from 'date-fns'

interface TodayEventsProps {
  events: Event[]
  kids: Child[]
}

function formatTime(dateStr: string) {
  return format(new Date(dateStr), 'HH:mm')
}

export const TodayEvents = memo(function TodayEvents({ events, kids }: TodayEventsProps) {
  const kidsById = useMemo(() => new Map(kids.map(child => [child.id, child])), [kids])

  return (
    <CardSection label="Planes de hoy">
      <Card padded={false}>
        {events.length === 0 ? (
          <EmptyState emoji="☘" title="Hoy pinta tranquilo" description="No hay planes apuntados" />
        ) : (
          <ul className="divide-y divide-[#F5F2EE]">
            {events.map((event) => {
              const child = event.child_id ? kidsById.get(event.child_id) : undefined
              return (
                <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex items-center gap-1.5 min-w-[52px] pt-0.5">
                    <Clock size={13} className="text-[#77716A]" strokeWidth={2} />
                    <span className="text-xs font-bold text-[#77716A]">
                      {event.all_day ? 'Todo el dia' : formatTime(event.start_at)}
                    </span>
                  </div>
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
