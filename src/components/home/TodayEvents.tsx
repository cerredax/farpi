import { SectionLink } from '@/components/ui/SectionLink'
import { Heart } from 'lucide-react'
import { memo } from 'react'
import type { Event, Child, FamilyMember } from '@/types'
import { eventColor, fondoDePersona, resolveAssignee } from '@/lib/assignees'
import { planYaPasado, siguientePlan } from '@/lib/events'
import { format } from 'date-fns'

interface TodayEventsProps {
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  /**
   * Qué decir cuando no hay planes. `null` cuando el día no está vacío de
   * verdad —hay tareas que hacer— y decir que pinta tranquilo sería mentir.
   */
  calmMessage: string | null
  /** Abrir lo apuntado. Tocar un plan lo abre, igual que en el calendario. */
  onOpen: (event: Event) => void
  /**
   * La hora a la que se está mirando la pantalla, o `null` hasta que hidrata.
   * Viene de arriba, que es donde ya se calcula para el saludo: dos relojes en
   * la misma tarjeta pueden dar dos respuestas distintas al cambiar de minuto.
   */
  ahora: Date | null
}

function formatTime(dateStr: string) {
  return format(new Date(dateStr), 'HH:mm')
}

/**
 * Los planes de hoy, dentro del saludo. Van juntos porque responden a lo mismo
 * —"¿qué tenemos hoy?"— y separarlos obligaba a leer dos bloques seguidos que
 * decían casi lo mismo: el saludo ya adelantaba el próximo evento.
 */
export const TodayEvents = memo(function TodayEvents({ events, kids, members, calmMessage, onOpen, ahora }: TodayEventsProps) {
  if (events.length === 0) {
    if (!calmMessage) return null
    return (
      <div className="flex items-center gap-2.5 rounded-3xl bg-white/80 border border-white px-4 py-2.5 shadow-sm">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-[#F1E6D8] text-[#9A6B55]">
          <Heart size={16} fill="currentColor" strokeWidth={2.4} />
        </span>
        <p className="min-w-0 text-sm font-bold text-ink leading-snug">{calmMessage}</p>
      </div>
    )
  }

  // A media tarde, "¿qué tenemos hoy?" es sobre todo "¿qué queda?". Hasta el
  // 05-09-2026 el desayuno de las 8:00 y la cena de las 21:00 se leían igual a
  // cualquier hora, así que la tarjeta obligaba a mirar el reloj y comparar. Lo
  // que ya pasó se atenúa y lo siguiente se marca con su hora en verde: es un
  // cambio de color, no una fila ni una etiqueta más.
  //
  // Sin `ahora` —el HTML de antes de hidratar— no se atenúa nada: /home se
  // prerenderiza y marcar ahí lo pasado sería marcarlo con la hora del build.
  const proximo = ahora ? siguientePlan(events, ahora) : null

  return (
    <div className="rounded-3xl bg-white/80 border border-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-hairline">
        {events.map(event => {
          const asignado = resolveAssignee(event, members, kids)
          const pasado = !!ahora && planYaPasado(event, ahora)
          const esProximo = event.id === proximo?.id
          return (
            <li key={event.id}>
              {/* La fila entera es el botón que abre el plan (04-09-2026): en
                  Inicio se veía lo de hoy y para cambiar la hora de una cita
                  había que ir al calendario y buscarla. Es el mismo gesto que
                  la fila de la agenda, y por eso abre el mismo formulario. */}
              <button
                type="button"
                onClick={() => onOpen(event)}
                title={event.title}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface ${pasado ? 'opacity-55' : ''}`}
              >
                <div className="flex items-center gap-1.5 min-w-[52px] pt-0.5">
                  {/* Donde estaba el reloj, que no decía nada que no dijera ya la
                      hora: el punto de color de quien tiene el plan, amarillo si
                      es de toda la familia. Igual que en "Próximos días" y en la
                      agenda del calendario. */}
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: eventColor(event, members, kids) }}
                    aria-hidden
                  />
                  <span className={`text-xs font-bold ${esProximo ? 'text-primary-strong' : 'text-muted'}`}>
                    {event.all_day ? 'Todo el día' : formatTime(event.start_at)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm leading-snug">{event.title}</p>
                  {/* La etiqueta de toda la app: el color de la persona de
                      fondo y el nombre en tinta. Era la última que quedaba en
                      color macizo con el texto calculado encima (10-09-2026),
                      justo en la tarjeta que más se mira. */}
                  {asignado && (
                    <span
                      className="etiqueta-persona mt-1 inline-block max-w-[7rem] px-1.5 py-0.5 text-[10px]"
                      style={{ backgroundColor: fondoDePersona(asignado.color) }}
                    >
                      {asignado.name}
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-hairline px-4 py-2.5">
        <SectionLink href="/calendar">Ver calendario</SectionLink>
      </div>
    </div>
  )
})
