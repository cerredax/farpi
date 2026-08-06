'use client'

import { useEffect, useState } from 'react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { getLocalDateString } from '@/lib/date-utils'
import { partirEventosDelDia, rangoHorario, repartirSolapados, type BloqueDia } from '@/lib/timeline'
import { capitalize } from '@/lib/text'
import type { Child, Event, FamilyMember, Task } from '@/types'
import { DayTasks } from './DayTasks'

/**
 * El día elegido sobre un eje de horas, al estilo de la vista "Día" de un
 * calendario al uso: cada cita en su hora y con el alto de lo que dura.
 *
 * Es la vista de la semana plegada. La de siete columnas no cabe: a 390 px cada
 * columna son ~45 px y los bloques se quedan sin texto, que es también por lo
 * que Google no la pone por defecto en el móvil.
 *
 * Lo que no tiene hora —eventos de todo el día y tareas, que vencen pero no
 * ocurren a una hora— va arriba, en una franja fija. Las vacaciones no salen
 * aquí: su sitio es la franja de la rejilla (ver "Decisiones de producto").
 */

/** Alto de una hora del eje, en píxeles. */
const ALTO_HORA = 56

/**
 * Alto mínimo de un bloque. Una cita de quince minutos son 14 px, por debajo
 * del mínimo de toque de 24×24 que comprueba `e2e/movil.spec.ts`.
 */
const ALTO_MINIMO_BLOQUE = 28

function EventBlock({ bloque, desde, kids, members, onEdit }: {
  bloque: BloqueDia
  desde: number
  kids: Child[]
  members: FamilyMember[]
  onEdit: (event: Event) => void
}) {
  const { event, inicio, fin, columna, columnas } = bloque
  const color = eventColor(event, members, kids)
  const asignado = resolveAssignee(event, members, kids)

  const top = ((inicio - desde * 60) / 60) * ALTO_HORA
  const alto = Math.max(((fin - inicio) / 60) * ALTO_HORA, ALTO_MINIMO_BLOQUE)
  const hora = format(new Date(event.start_at), 'HH:mm')

  // Un pelo de separación entre columnas para que dos bloques a la vez no se
  // lean como uno solo partido.
  const ancho = 100 / columnas

  return (
    <button
      onClick={() => onEdit(event)}
      title={asignado ? `${event.title} · ${asignado.name}` : event.title}
      aria-label={`${hora} ${event.title}${asignado ? `, ${asignado.name}` : ''}`}
      className="absolute overflow-hidden rounded-lg px-1.5 py-0.5 text-left transition-shadow hover:shadow-md"
      style={{
        top,
        height: alto,
        left: `calc(${columna * ancho}% + 2px)`,
        width: `calc(${ancho}% - 4px)`,
        backgroundColor: `${color}26`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <span className="block truncate text-[12px] font-bold leading-tight text-ink">{event.title}</span>
      {/* En un bloque corto no cabe la segunda línea y sobra: la posición ya
          dice la hora. */}
      {alto >= 40 && (
        <span className="block truncate text-[10px] font-semibold leading-tight text-muted">
          {hora}{asignado ? ` · ${asignado.name}` : ''}
        </span>
      )}
    </button>
  )
}

/**
 * La raya de la hora actual, solo cuando se mira el día de hoy. Va por debajo
 * de los bloques a propósito: encima cruzaba los títulos y los dejaba tachados,
 * y los bloques son translúcidos, así que se transparentaba igual. Es una
 * marca, no algo que haya que leer.
 */
function AhoraLine({ minutos, desde }: { minutos: number; desde: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex items-center"
      style={{ top: ((minutos - desde * 60) / 60) * ALTO_HORA }}
      aria-hidden
    >
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-danger" />
      <span className="h-[2px] flex-1 bg-danger" />
    </div>
  )
}

export function DayTimeline({ day, events, kids, members, tasks, onToggleTask, buscador, onEdit, onAdd }: {
  day: Date
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  tasks: Task[]
  onToggleTask: (id: string) => void
  /**
   * El buscador vive también aquí, y no solo en la lista: al escribir algo la
   * pantalla cambia a los resultados, así que si el campo solo estuviera allí
   * no habría manera de llegar a él desde la semana.
   */
  buscador?: {
    valor: string
    onChange: (valor: string) => void
  }
  onEdit: (event: Event) => void
  onAdd: (day: Date) => void
}) {
  const dia = getLocalDateString(day)
  const hoy = getLocalDateString(new Date())
  const esHoy = isToday(day)

  // Se recalcula cada minuto: si no, la raya se quedaba clavada donde estaba al
  // abrir la pantalla, que en un móvil que no se cierra son horas.
  const [ahora, setAhora] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    if (!esHoy) return
    const id = setInterval(() => {
      const d = new Date()
      setAhora(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [esHoy])

  const { todoElDia, conHora } = partirEventosDelDia(events, dia)
  const bloques = repartirSolapados(conHora, dia)
  const { desde, hasta } = rangoHorario(bloques, esHoy ? ahora : undefined)

  // Las tareas de este día. Lo vencido se arrastra a hoy, así que hoy carga
  // también con lo que se quedó atrás.
  const tareasDelDia = tasks.filter(t => t.due_date && (
    t.due_date < hoy ? dia === hoy : t.due_date === dia
  ))

  const franjaLlena = todoElDia.length > 0 || tareasDelDia.length > 0
  const vacio = !franjaLlena && conHora.length === 0

  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i)

  return (
    <div className="flex-1 px-4 pt-4 lg:px-0 lg:pt-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="min-w-0 truncate text-sm font-bold text-ink">
          {capitalize(format(day, "EEEE d 'de' MMMM", { locale: es }))}
        </p>
        <button
          onClick={() => onAdd(day)}
          aria-label="Añadir evento"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary-hover active:scale-95"
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

      {vacio ? (
        <button
          onClick={() => onAdd(day)}
          className="w-full rounded-2xl border border-surface bg-white text-left shadow-sm transition-colors hover:border-primary"
        >
          <EmptyState emoji="✨" title="Sin planes" description="Toca para añadir un evento" />
        </button>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-surface bg-white shadow-sm">
          {franjaLlena && (
            <div className="border-b border-hairline px-2 py-1.5">
              <p className="px-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted">Todo el día</p>
              {todoElDia.map(event => {
                const asignado = resolveAssignee(event, members, kids)
                return (
                  <button
                    key={event.id}
                    onClick={() => onEdit(event)}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-canvas"
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: eventColor(event, members, kids) }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{event.title}</span>
                    {asignado && (
                      <span className="max-w-[4.5rem] flex-shrink-0 truncate text-[11px] font-bold" style={{ color: asignado.color }}>
                        {asignado.name}
                      </span>
                    )}
                  </button>
                )
              })}
              <DayTasks tasks={tareasDelDia} kids={kids} members={members} hoy={hoy} onToggle={onToggleTask} />
            </div>
          )}

          {conHora.length === 0 ? (
            <p className="px-4 py-3 text-xs text-faint">Nada a una hora concreta.</p>
          ) : (
            // Sin scroll propio: el eje ya viene recortado a las horas que
            // tienen algo, así que cabe entero, y un contenedor con scroll
            // dentro de una página que también lo tiene es un incordio con el
            // dedo.
            <div className="px-1 py-2">
              <div className="relative" style={{ height: (hasta - desde) * ALTO_HORA }}>
                {horas.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 flex items-start"
                    style={{ top: i * ALTO_HORA, height: ALTO_HORA }}
                  >
                    <span className="w-11 flex-shrink-0 pt-[2px] text-right text-[10px] font-bold tabular-nums text-faint">
                      {String(h).padStart(2, '0')}:00
                    </span>
                    <span className="ml-2 mt-[7px] h-px flex-1 bg-hairline" />
                  </div>
                ))}

                {/* Los bloques van sobre la misma caja que las rayas, desplazados
                    por el ancho del canalón de horas. */}
                <div className="absolute inset-y-0 right-2" style={{ left: 52 }}>
                  {esHoy && ahora >= desde * 60 && ahora <= hasta * 60 && (
                    <AhoraLine minutos={ahora} desde={desde} />
                  )}
                  {bloques.map(bloque => (
                    <EventBlock
                      key={bloque.event.id}
                      bloque={bloque}
                      desde={desde}
                      kids={kids}
                      members={members}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
