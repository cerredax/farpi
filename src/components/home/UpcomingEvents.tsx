import { memo } from 'react'
import { CalendarDays, CalendarRange } from 'lucide-react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import type { Event, Child, FamilyMember } from '@/types'
import { format, isTomorrow } from 'date-fns'
import { es } from 'date-fns/locale'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { partirPlanesProximos } from '@/lib/events'
import { capitalize } from '@/lib/text'

interface UpcomingEventsProps {
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  /** Abrir lo apuntado. Tocar un plan lo abre, igual que en el calendario. */
  onOpen: (event: Event) => void
}

/**
 * Día dentro de los próximos siete. Se abrevia ("Mié 6") porque compite por el
 * ancho con la hora en la misma línea, y el mes sobra: nada de lo que sale aquí
 * está a más de siete días.
 */
function eventDayLabel(date: Date): string {
  if (isTomorrow(date)) return 'Mañana'
  return capitalize(format(date, 'EEE d', { locale: es }))
}

/** Las filas de un bloque. Las dos cajas enseñan un plan igual. */
function ListaDePlanes({ events, kids, members, onOpen }: UpcomingEventsProps) {
  return (
    <ul className="divide-y divide-hairline">
      {events.map(event => {
        const fecha = new Date(event.start_at)
        const asignado = resolveAssignee(event, members, kids)
        return (
          <li key={event.id}>
            {/* La fila entera abre el plan, como en lo de hoy y en la agenda
                del calendario (04-09-2026). */}
            <button
              type="button"
              onClick={() => onOpen(event)}
              title={event.title}
              className="block w-full px-4 py-3 text-left transition-colors hover:bg-surface"
            >
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
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Lo que viene, en **dos cajas**: "Próximos días" —mañana y pasado mañana— y
 * "Resto de semana".
 *
 * Era una sola lista de siete días, y ahí "Mañana a las nueve" y "Sáb 12" se
 * leían con el mismo peso pese a no pedir lo mismo: lo de mañana hay que
 * prepararlo esta noche y lo del sábado solo hay que saberlo. El corte está en
 * `partirPlanesProximos`, con el porqué de los dos días.
 *
 * Lo inmediato se queda con el amarillo de la sección y lo de más allá va en
 * gris: es la misma cosa a distinta distancia, y el color dice cuál de las dos
 * pide algo hoy. El gris es el que ya usa la app para lo que no es de nadie en
 * concreto, no un color nuevo. Cada caja desaparece si no tiene nada, así que
 * una semana con todo en los dos primeros días se sigue viendo como un solo
 * bloque.
 */
export const UpcomingEvents = memo(function UpcomingEvents({ events, kids, members, onOpen }: UpcomingEventsProps) {
  // Sin nada que enseñar no se pinta el bloque: una tarjeta vacía diciendo
  // "semana tranquila" ocupa lo mismo que una con contenido.
  if (events.length === 0) return null

  const { proximos, resto } = partirPlanesProximos(events)

  return (
    <>
      {proximos.length > 0 && (
        <HomeSection
          label="Próximos días"
          icon={CalendarDays}
          accentColor="#E9C46A"
          footer={<SectionLink href="/calendar">Ver calendario</SectionLink>}
        >
          <ListaDePlanes events={proximos} kids={kids} members={members} onOpen={onOpen} />
        </HomeSection>
      )}

      {resto.length > 0 && (
        <HomeSection
          label="Resto de semana"
          icon={CalendarRange}
          accentColor="#A39B93"
          footer={<SectionLink href="/calendar">Ver calendario</SectionLink>}
        >
          <ListaDePlanes events={resto} kids={kids} members={members} onOpen={onOpen} />
        </HomeSection>
      )}
    </>
  )
})
