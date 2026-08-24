import { memo } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import type { Event, Child, FamilyMember } from '@/types'
import { format, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import { eventColor, resolveAssignee } from '@/lib/assignees'
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
    <HomeSection label="Esta semana" footer={<SectionLink href="/calendar">Ver calendario</SectionLink>}>
      <ul className="divide-y divide-hairline">
        {events.map(event => {
          const fecha = new Date(event.start_at)
          const asignado = resolveAssignee(event, members, kids)
          return (
            <li key={event.id} className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                {/* El mismo punto que la agenda del calendario: lo de toda la
                    familia también tiene color (el amarillo), y sin él estas
                    filas eran las únicas de la app donde no se veía. */}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 self-center"
                  style={{ backgroundColor: eventColor(event, members, kids) }}
                  aria-hidden
                />
                <span className="text-xs font-bold text-primary">{eventDayLabel(fecha)}</span>
                <span className="text-xs font-semibold text-muted">
                  {event.all_day ? 'Todo el día' : format(fecha, 'HH:mm')}
                </span>
                {/* De quién es, en su color y en la misma línea que la fecha.
                    Como píldora debajo se comía una línea entera por evento
                    para decir una palabra. Es el formato de la agenda. */}
                {asignado && (
                  <span className="min-w-0 truncate text-[11px] font-bold" style={{ color: asignado.color }}>
                    {asignado.name}
                  </span>
                )}
              </div>
              <p className="font-semibold text-ink text-sm leading-snug mt-0.5">{event.title}</p>
            </li>
          )
        })}
      </ul>
    </HomeSection>
  )
})
