import { memo } from 'react'
import { CalendarClock, CalendarDays, CalendarRange } from 'lucide-react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import type { Event, Child, FamilyMember } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { eventColor, fondoDePersona, resolveAssignee } from '@/lib/assignees'
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
  return capitalize(format(date, 'EEE d', { locale: es }))
}

/**
 * Las filas de un bloque. Las tres cajas enseñan un plan igual.
 *
 * `conDia` lo apaga la caja de mañana, y solo ella: escribir "Mañana" en cada
 * fila de una caja que ya se titula "Mañana" es decir lo mismo dos veces y
 * quitarle sitio a la hora, que ahí es lo único que cambia de una fila a otra.
 */
function ListaDePlanes({ events, kids, members, onOpen, conDia = true }: UpcomingEventsProps & { conDia?: boolean }) {
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
                {conDia && (
                  <span className="text-xs font-bold text-primary-strong">{eventDayLabel(fecha)}</span>
                )}
                <span className="text-xs font-semibold text-muted">
                  {event.all_day ? 'Todo el día' : format(fecha, 'HH:mm')}
                </span>
                {/* De quién es, en su color y en la misma línea que la fecha.
                    Como píldora debajo se comía una línea entera por evento
                    para decir una palabra. Es el formato de la agenda —y ahora
                    también su etiqueta: el color va de fondo y el nombre en
                    tinta, porque los colores de hijo son claros a propósito y
                    como color de texto sobre blanco no se leían. */}
                {asignado && (
                  <span
                    className="etiqueta-persona min-w-0 max-w-[6rem] px-1.5 py-0.5 text-[11px]"
                    style={{ backgroundColor: fondoDePersona(asignado.color) }}
                  >
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
 * Lo que viene, en **tres cajas**: "Mañana", "Próximos días" —lo que queda de
 * esta semana— y "Próxima semana".
 *
 * Era una sola lista de siete días, y ahí "Mañana a las nueve" y "Sáb 12" se
 * leían con el mismo peso pese a no pedir lo mismo: lo de mañana hay que
 * prepararlo esta noche y lo del sábado solo hay que saberlo. Fueron dos cajas
 * hasta el 09-09-2026, con mañana y pasado juntos; ahora mañana va sola, que es
 * la pregunta que se hace de verdad al acostarse. El corte está en
 * `partirPlanesProximos`, con el porqué de cada uno.
 *
 * El color va de cerca a lejos: el amarillo de la sección para mañana, el salmón
 * para lo que queda de semana y el gris para lo de la semana que viene, que es
 * el que la app ya usa para lo que no pide nada ahora mismo. No son colores
 * nuevos y no significan de quién es el plan —eso lo dice el punto de cada
 * fila—, solo a qué distancia está. Cada caja desaparece si no tiene nada, así
 * que una semana con todo mañana se sigue viendo como un solo bloque.
 */
export const UpcomingEvents = memo(function UpcomingEvents({ events, kids, members, onOpen }: UpcomingEventsProps) {
  // Sin nada que enseñar no se pinta el bloque: una tarjeta vacía diciendo
  // "semana tranquila" ocupa lo mismo que una con contenido.
  if (events.length === 0) return null

  const { manana, proximos, proximaSemana } = partirPlanesProximos(events)

  return (
    <>
      {manana.length > 0 && (
        <HomeSection
          label="Mañana"
          icon={CalendarClock}
          accentColor="#E9C46A"
          footer={<SectionLink href="/calendar">Ver calendario</SectionLink>}
        >
          <ListaDePlanes events={manana} kids={kids} members={members} onOpen={onOpen} conDia={false} />
        </HomeSection>
      )}

      {proximos.length > 0 && (
        <HomeSection
          label="Próximos días"
          icon={CalendarDays}
          accentColor="#D8A48F"
          footer={<SectionLink href="/calendar">Ver calendario</SectionLink>}
        >
          <ListaDePlanes events={proximos} kids={kids} members={members} onOpen={onOpen} />
        </HomeSection>
      )}

      {proximaSemana.length > 0 && (
        <HomeSection
          label="Próxima semana"
          icon={CalendarRange}
          accentColor="#A39B93"
          footer={<SectionLink href="/calendar">Ver calendario</SectionLink>}
        >
          <ListaDePlanes events={proximaSemana} kids={kids} members={members} onOpen={onOpen} />
        </HomeSection>
      )}
    </>
  )
})
