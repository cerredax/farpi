import Link from 'next/link'
import { memo } from 'react'
import { Card, CardSection } from '@/components/ui/Card'
import type { Event, Child, FamilyMember } from '@/types'
import { format, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import { resolveAssignee } from '@/lib/assignees'
import { capitalize } from '@/lib/text'

interface UpcomingEventsProps {
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
}

/**
 * Día dentro de la próxima semana. Se abrevia ("Mié 6") porque compite por el
 * ancho con la hora en la misma línea, y el mes sobra: nada de lo que sale aquí
 * está a más de siete días.
 */
function eventDayLabel(date: Date): string {
  if (isTomorrow(date)) return 'Mañana'
  return capitalize(format(date, 'EEE d', { locale: es }))
}

export const UpcomingEvents = memo(function UpcomingEvents({ events, kids, members }: UpcomingEventsProps) {
  // Sin nada que enseñar no se pinta el bloque: una tarjeta vacía diciendo
  // "semana tranquila" ocupa lo mismo que una con contenido.
  if (events.length === 0) return null

  return (
    <CardSection label="Esta semana">
      <Card padded={false}>
        <ul className="divide-y divide-hairline">
          {events.map(event => {
            const fecha = new Date(event.start_at)
            const asignado = resolveAssignee(event, members, kids)
            return (
              <li key={event.id} className="px-4 py-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold text-primary">{eventDayLabel(fecha)}</span>
                  <span className="text-xs font-semibold text-muted">
                    {event.all_day ? 'Todo el día' : format(fecha, 'HH:mm')}
                  </span>
                </div>
                <p className="font-semibold text-ink text-sm leading-snug mt-0.5">{event.title}</p>
                {asignado && (
                  <span
                    className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: asignado.color }}
                  >
                    {asignado.name}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
        <div className="border-t border-hairline px-4 py-2.5">
          <Link href="/calendar" className="text-xs font-semibold text-primary hover:underline">
            Ver calendario
          </Link>
        </div>
      </Card>
    </CardSection>
  )
})
