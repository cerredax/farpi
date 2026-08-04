import { compareAsc, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Event, Child, FamilyMember } from '@/types'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { isVacation, vacationEdges } from '@/lib/events'

interface DayCellProps {
  day: Date
  dayNumber: number
  isToday: boolean
  isSelected: boolean
  isCurrentMonth: boolean
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  density?: 'compact' | 'detailed'
  onSelect: (day: Date) => void
  onEditEvent?: (event: Event) => void
  onAddEvent?: (day: Date) => void
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1
    if (!a.all_day && b.all_day) return 1
    return compareAsc(parseISO(a.start_at), parseISO(b.start_at))
  })
}

function getShortEventLabel(event: Event): string {
  const prefix = event.all_day ? '' : `${format(parseISO(event.start_at), 'HH:mm')} `
  return `${prefix}${event.title}`
}

/**
 * Franja de color bajo el número del día. Los extremos se redondean para que se
 * lea como un tramo continuo a lo largo de la semana, con un color por persona.
 */
function VacationBand({
  vacaciones, day, kids, members, onEditEvent,
}: { vacaciones: Event[]; day: Date; kids: Child[]; members: FamilyMember[]; onEditEvent?: (event: Event) => void }) {
  if (vacaciones.length === 0) return <div className="h-[3px]" />

  return (
    <div className="flex w-full flex-col gap-[2px] px-0.5">
      {vacaciones.slice(0, 2).map(v => {
        const { primero, ultimo } = vacationEdges(v, day)
        return (
          // La franja es el único sitio donde se tocan unas vacaciones: fuera de
          // la lista de eventos, si no fuera pulsable no habría forma de
          // editarlas. El botón se estira en vertical para que se pueda dar con
          // el dedo, aunque la barra de color siga siendo fina.
          <button
            key={v.id}
            type="button"
            onClick={() => onEditEvent?.(v)}
            title={v.title}
            aria-label={`Editar ${v.title}`}
            className="flex w-full items-center py-[3px] -my-[3px]"
          >
            <span
              className={`h-[3px] w-full ${primero ? 'rounded-l-full' : ''} ${ultimo ? 'rounded-r-full' : ''}`}
              style={{ backgroundColor: eventColor(v, members, kids) }}
            />
          </button>
        )
      })}
    </div>
  )
}

export function DayCell({
  day,
  dayNumber,
  isToday,
  isSelected,
  isCurrentMonth,
  events,
  kids,
  members,
  density = 'compact',
  onSelect,
  onEditEvent,
  onAddEvent,
}: DayCellProps) {
  // Las vacaciones se pintan como una franja bajo el día, no como un punto
  // más: lo que importa de ellas es el tramo, no que "haya algo" ese día.
  const vacaciones = events.filter(isVacation)
  const sortedEvents = sortEvents(events.filter(e => !isVacation(e)))
  const visibleEvents = sortedEvents.slice(0, density === 'detailed' ? 2 : 3)
  const hiddenCount = Math.max(sortedEvents.length - visibleEvents.length, 0)

  const numberClass = (() => {
    if (isSelected)      return 'bg-primary text-white'
    if (isToday)         return 'bg-accent text-white'
    if (!isCurrentMonth) return 'text-faint'
    return 'text-ink hover:bg-line'
  })()

  if (density === 'compact') {
    const MAX_DOTS = 3
    const dots = sortedEvents.slice(0, MAX_DOTS)
    const totalCount = sortedEvents.length
    return (
      <div className="relative group flex flex-col items-center">
        <button
          onClick={() => onSelect(day)}
          aria-label={day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          aria-pressed={isSelected}
          className="flex flex-col items-center gap-0.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl w-full"
        >
          <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors ${numberClass}`}>
            {dayNumber}
          </span>
          <div className="h-3 flex items-center justify-center gap-[3px]">
            {totalCount > MAX_DOTS ? (
              <span className="text-[9px] font-black text-primary leading-none">{totalCount}</span>
            ) : (
              dots.map((event, i) => (
                <span key={i} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: eventColor(event, members, kids) }} />
              ))
            )}
          </div>
        </button>

        <div className="w-full pb-1">
          <VacationBand vacaciones={vacaciones} day={day} kids={kids} members={members} onEditEvent={onEditEvent} />
        </div>

        {/* Tooltip — visible only on hover, desktop only */}
        {sortedEvents.length > 0 && (
          <div
            role="tooltip"
            className="
              pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
              opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100
              transition-all duration-150 origin-bottom
              hidden lg:block
            "
          >
            <div className="bg-white border border-line rounded-2xl shadow-xl p-3 w-52 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 capitalize">
                {format(day, "EEEE d MMM", { locale: es })}
              </p>
              <div className="space-y-1.5">
                {sortedEvents.map(event => {
                  const color = eventColor(event, members, kids)
                  const asignado = resolveAssignee(event, members, kids)
                  return (
                    <div key={event.id} className="flex items-start gap-2">
                      <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink leading-tight truncate">{event.title}</p>
                        <p className="text-[10px] text-muted leading-tight">
                          {event.all_day ? 'Todo el día' : format(parseISO(event.start_at), 'HH:mm')}
                          {asignado ? ` · ${asignado.name}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-1.5 overflow-hidden">
              <div className="w-3 h-3 bg-white border-r border-b border-line rotate-45 -mt-1.5 mx-auto shadow-sm" />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`min-h-[86px] sm:min-h-[96px] rounded-xl border bg-white p-1 transition-all ${
        isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-surface'
      } ${!isCurrentMonth ? 'opacity-45' : ''}`}
    >
      <div className="flex items-center justify-between gap-0.5 mb-1">
        <button
          onClick={() => onSelect(day)}
          aria-label={day.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          aria-pressed={isSelected}
          className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-black transition-colors ${numberClass}`}
        >
          {dayNumber}
        </button>
        <button
          onClick={() => onAddEvent?.(day)}
          aria-label={`Añadir evento el día ${dayNumber}`}
          className="w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-black text-primary hover:bg-primary-tint transition-colors"
        >
          +
        </button>
      </div>

      <div className="space-y-0.5">
        {/* En la cuadrícula ancha la franja fina se pierde, así que el tramo se
            enseña como una tira con el título solo el día que empieza. */}
        {vacaciones.map(v => {
          const { primero, ultimo } = vacationEdges(v, day)
          const color = eventColor(v, members, kids)
          return (
            <button
              key={v.id}
              onClick={() => onEditEvent?.(v)}
              title={v.title}
              aria-label={`Editar ${v.title}`}
              className={`w-full px-1 py-0.5 text-left text-[9px] font-bold leading-tight text-white truncate ${
                primero ? 'rounded-l-md' : ''} ${ultimo ? 'rounded-r-md' : ''}`}
              style={{ backgroundColor: color }}
            >
              {primero ? v.title : ' '}
            </button>
          )
        })}

        {visibleEvents.map(event => {
          const color = eventColor(event, members, kids)
          return (
            <button
              key={event.id}
              onClick={() => onEditEvent?.(event)}
              className="w-full rounded-md px-1 py-0.5 text-left text-[9px] font-bold leading-tight text-ink bg-canvas hover:bg-surface transition-colors"
              title={getShortEventLabel(event)}
            >
              <span className="flex items-start gap-1 min-w-0">
                <span className="mt-1 w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{getShortEventLabel(event)}</span>
              </span>
            </button>
          )
        })}
        {hiddenCount > 0 && (
          <button
            onClick={() => onSelect(day)}
            className="w-full text-left text-[9px] font-black text-primary px-1"
          >
            +{hiddenCount}
          </button>
        )}
      </div>
    </div>
  )
}
