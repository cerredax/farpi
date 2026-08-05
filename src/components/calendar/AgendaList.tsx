'use client'

import { useEffect } from 'react'
import {
  addDays,
  compareAsc,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import type { Event, Child, FamilyMember, Task } from '@/types'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { getLocalDateString } from '@/lib/date-utils'
import { eventCoversDay, isVacation } from '@/lib/events'
import { capitalize } from '@/lib/text'

type AgendaMode = 'week' | 'agenda'

interface AgendaListProps {
  mode: AgendaMode
  selectedDay: Date
  currentMonth: Date
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  /**
   * Tareas pendientes con fecha. Llegan vacías en modo agenda: allí el tramo es
   * de 45 días y las tareas taparían los eventos, que es lo que se ha ido a ver.
   */
  tasks?: Task[]
  onToggleTask?: (id: string) => void
  /** Buscador de eventos. Sin él, la lista se comporta como siempre. */
  buscador?: {
    valor: string
    onChange: (valor: string) => void
    /** Coincidencias en TODO el calendario, no solo en el tramo pintado. */
    coincidencias: Event[]
  }
  onSelectDay: (day: Date) => void
  onEdit: (event: Event) => void
  onAdd: (day?: Date) => void
}

/**
 * Una tarea en la agenda. Lleva el círculo de marcar y no el punto de color de
 * los eventos: una tarea se hace, un evento pasa. Se marca desde aquí porque el
 * día ya se está mirando, y bajar a Tareas para tachar lo de hoy es el viaje
 * que nadie hace.
 */
function TaskRow({ task, kids, members, atrasada, onToggle }: {
  task: Task
  kids: Child[]
  members: FamilyMember[]
  atrasada: boolean
  onToggle: (id: string) => void
}) {
  const asignado = resolveAssignee(task, members, kids)

  return (
    <div className="flex items-center gap-1.5 px-1.5">
      <CircleCheck
        checked={false}
        onClick={() => onToggle(task.id)}
        ariaLabel={`Marcar "${task.title}" como completada`}
        size="sm"
        className="w-auto"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{task.title}</span>
      {asignado && (
        <span className="flex-shrink-0 text-[11px] font-bold" style={{ color: asignado.color }}>
          {asignado.name}
        </span>
      )}
      {atrasada && (
        <span className="flex-shrink-0 rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger">
          Atrasada
        </span>
      )}
    </div>
  )
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1
    if (!a.all_day && b.all_day) return 1
    return compareAsc(parseISO(a.start_at), parseISO(b.start_at))
  })
}

/**
 * Un evento en una línea: color, hora, título y de quién es. El color va como
 * punto y no como barra lateral porque ya no hay tarjeta que bordear. El
 * nombre se queda —aunque el color ya lo diga— porque el color solo habla si
 * te lo sabes, y quién tiene la cita es media pregunta de la agenda.
 */
function EventRow({ event, kids, members, onEdit }: { event: Event; kids: Child[]; members: FamilyMember[]; onEdit: (event: Event) => void }) {
  const asignado = resolveAssignee(event, members, kids)
  const color = eventColor(event, members, kids)
  const hora = event.all_day ? 'Todo el día' : format(parseISO(event.start_at), 'HH:mm')

  return (
    <button
      onClick={() => onEdit(event)}
      title={asignado ? `${event.title} · ${asignado.name}` : event.title}
      className="flex w-full items-baseline gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-canvas"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 self-center"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-[11px] font-bold text-muted flex-shrink-0 tabular-nums">{hora}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{event.title}</span>
      {asignado && (
        <span className="flex-shrink-0 text-[11px] font-bold" style={{ color: asignado.color }}>
          {asignado.name}
        </span>
      )}
    </button>
  )
}

export function AgendaList({ mode, selectedDay, events, kids, members, tasks = [], onToggleTask, buscador, onSelectDay, onEdit, onAdd }: AgendaListProps) {
  const todayStart = startOfDay(new Date())
  const rangeStart = mode === 'week' ? todayStart : startOfDay(selectedDay)
  const rangeEnd = mode === 'week' ? addDays(todayStart, 7) : addDays(startOfDay(selectedDay), 45)

  useEffect(() => {
    if (mode !== 'week') return
    const el = document.getElementById(`day-${format(selectedDay, 'yyyyMMdd')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedDay, mode])

  // Las vacaciones se quedan fuera de la lista: ocupan muchos días seguidos y
  // se repetirían en todos ellos. Su sitio es la franja de la cuadrícula, que
  // enseña el tramo de un vistazo y desde donde también se editan.
  const conFecha = events.filter(event => !isVacation(event))

  const hoyStr = getLocalDateString(todayStart)

  const dayGroups = eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(day => {
    const diaStr = getLocalDateString(day)
    return {
      day,
      events: sortEvents(conFecha.filter(event => eventCoversDay(event, day))),
      // Una tarea vence un día concreto: la recurrente ya trae en `due_date` su
      // próxima fecha, así que aparece una sola vez y donde toca. Lo que venció
      // antes de hoy se arrastra a hoy: su día ya no se pinta —el tramo empieza
      // hoy— y desaparecer no es lo que le pasa a una tarea sin hacer.
      tasks: tasks.filter(task => task.due_date && (
        task.due_date < hoyStr ? diaStr === hoyStr : task.due_date === diaStr
      )),
    }
  })

  const visibleGroups = mode === 'week'
    ? dayGroups
    : dayGroups.filter(group => group.events.length > 0 || group.tasks.length > 0 || isSameDay(group.day, selectedDay))

  const buscando = !!buscador && buscador.valor.trim().length > 0
  const coincidencias = buscador?.coincidencias ?? []

  const headerTitle = buscando ? 'Búsqueda' : mode === 'week' ? 'Agenda semanal' : 'Próximos eventos'

  const headerSubtitle = buscando
    ? `${coincidencias.length} resultado${coincidencias.length !== 1 ? 's' : ''} en todo el calendario`
    : mode === 'week'
    ? `Del ${format(rangeStart, "d 'de' MMMM", { locale: es })} al ${format(rangeEnd, "d 'de' MMMM", { locale: es })}`
    : `Desde ${format(selectedDay, "d 'de' MMMM", { locale: es })}`

  return (
    <div className="flex-1 px-4 pt-4 lg:px-0 lg:pt-0">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">{headerTitle}</p>
          <p className="text-sm font-bold text-ink">{headerSubtitle}</p>
        </div>
        <button
          onClick={() => onAdd(selectedDay)}
          aria-label="Añadir evento"
          className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {buscador && (
        <div className="mb-3">
          <SearchField
            value={buscador.valor}
            onChange={buscador.onChange}
            placeholder="Buscar en todo el calendario…"
            ariaLabel="Buscar eventos"
          />
        </div>
      )}

      {/* Buscando se enseña el calendario entero, pasado incluido: "¿cuándo fue
          la revisión?" es una pregunta sobre lo que ya ocurrió, y el tramo que
          se pinta empieza hoy. Cada resultado lleva su fecha completa porque ya
          no hay columna de día que lo sitúe. */}
      {buscando ? (
        coincidencias.length === 0 ? (
          <div className="rounded-3xl border border-surface bg-white shadow-sm">
            <EmptyState
              emoji="🔍"
              title="Sin coincidencias"
              description={`Ningún evento con «${buscador!.valor.trim()}»`}
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-surface bg-white shadow-sm overflow-hidden">
            <ul className="divide-y divide-hairline">
              {coincidencias.map(event => (
                <li key={event.id} className="px-2 py-1.5">
                  <p className="px-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                    {capitalize(format(parseISO(event.start_at), "EEEE d 'de' MMMM yyyy", { locale: es }))}
                  </p>
                  <EventRow event={event} kids={kids} members={members} onEdit={onEdit} />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : visibleGroups.length === 0 ? (
        <button
          onClick={() => onAdd(selectedDay)}
          className="w-full bg-white rounded-2xl border border-surface shadow-sm text-left hover:border-primary transition-colors"
        >
          <EmptyState
            emoji="✨"
            title={mode === 'week' ? 'Semana libre' : 'Sin próximos eventos'}
            description="Toca para añadir un evento"
          />
        </button>
      ) : (
        /* Una fila por día dentro de una sola tarjeta: fecha a la izquierda y
           lo que hay a la derecha. Antes cada día era una tarjeta propia que
           decía la fecha dos veces —"4 AGO" en el recuadro y "Martes 4" al
           lado— y gastaba una línea en contar los eventos que ya se veían
           debajo. Esto ocupa la mitad y se lee de un barrido. */
        <div className="rounded-3xl border border-surface bg-white shadow-sm overflow-hidden">
          <ul className="divide-y divide-hairline">
            {visibleGroups.map(group => {
              const isSelected = isSameDay(group.day, selectedDay)
              const esHoy = isToday(group.day)
              const dayLabel = capitalize(format(group.day, "EEEE d 'de' MMMM", { locale: es }))

              return (
                <li
                  key={group.day.toISOString()}
                  id={`day-${format(group.day, 'yyyyMMdd')}`}
                  className={`flex items-start gap-2 px-2 py-2 transition-colors ${isSelected ? 'bg-primary-tint/40' : ''}`}
                >
                  <button
                    onClick={() => onSelectDay(group.day)}
                    aria-label={dayLabel}
                    aria-pressed={isSelected}
                    className={`flex w-11 flex-shrink-0 flex-col items-center rounded-xl py-1 transition-colors ${
                      esHoy ? 'bg-accent text-white' : 'text-ink hover:bg-canvas'
                    }`}
                  >
                    <span className="text-sm font-black leading-none">{format(group.day, 'd')}</span>
                    <span className={`text-[9px] font-bold uppercase leading-none mt-0.5 ${esHoy ? 'text-white/80' : 'text-muted'}`}>
                      {format(group.day, 'EEE', { locale: es })}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1 self-center">
                    {group.events.length === 0 && group.tasks.length === 0 ? (
                      <p className="px-1.5 text-xs text-faint">Sin planes</p>
                    ) : (
                      <>
                        {group.events.map(event => (
                          <EventRow key={event.id} event={event} kids={kids} members={members} onEdit={onEdit} />
                        ))}
                        {onToggleTask && group.tasks.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            kids={kids}
                            members={members}
                            atrasada={!!task.due_date && task.due_date < hoyStr}
                            onToggle={onToggleTask}
                          />
                        ))}
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => onAdd(group.day)}
                    aria-label={`Añadir evento el ${dayLabel}`}
                    className="w-7 h-7 flex-shrink-0 self-center flex items-center justify-center rounded-full text-faint transition-colors hover:bg-primary-tint hover:text-primary"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
