'use client'

import {
  addDays,
  addWeeks,
  compareAsc,
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  isTomorrow,
  parseISO,
  startOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import type { Event, Child, FamilyMember, Task } from '@/types'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { getLocalDateString } from '@/lib/date-utils'
import { eventCoversDay, isVacation } from '@/lib/events'
import { capitalize } from '@/lib/text'
import { DayTasks } from './DayTasks'

/**
 * La agenda: lo que pasa el día elegido y, debajo, lo que viene.
 *
 * Son dos bloques y no uno, que es el cambio de fondo respecto a la lista de
 * antes. Esa metía el día elegido como una fila más entre las demás, así que la
 * pregunta de la pantalla —"¿qué tengo hoy?"— se contestaba con el mismo tamaño
 * de letra que "¿y el jueves que viene?". Ahora el día elegido es el titular,
 * con su hora y de quién es cada cosa, y los próximos días van en una lista
 * compacta detrás.
 *
 * También es lo que se enseña al buscar: una búsqueda atraviesa todo el
 * calendario, pasado incluido, y no cabe en un solo día.
 */

/** Cuántos días por delante mira la lista de próximos días. */
const DIAS_POR_DELANTE = 45

interface AgendaListProps {
  selectedDay: Date
  events: Event[]
  kids: Child[]
  members: FamilyMember[]
  /** Tareas pendientes con fecha, para pintarlas en su día junto a los eventos. */
  tasks?: Task[]
  onToggleTask?: (id: string) => void
  /** Buscador de eventos. Sin él, la agenda se comporta como siempre. */
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

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.all_day && !b.all_day) return -1
    if (!a.all_day && b.all_day) return 1
    return compareAsc(parseISO(a.start_at), parseISO(b.start_at))
  })
}

/**
 * Cómo se llama un día en la cabecera del detalle. "Hoy" y "Mañana" ganan a la
 * fecha porque es lo que se pregunta en casa; del jueves en adelante hace falta
 * la fecha para situarse.
 */
function etiquetaDia(day: Date): string {
  const fecha = capitalize(format(day, "EEEE d 'de' MMMM", { locale: es }))
  if (isToday(day)) return `Hoy, ${fecha.toLowerCase()}`
  if (isTomorrow(day)) return `Mañana, ${fecha.toLowerCase()}`
  return fecha
}

/**
 * En qué tramo cae un día de lo que viene. Cerca se piensa en semanas y lejos en
 * meses, que es como se habla en casa: "esta semana", "la que viene", "en
 * septiembre". Sin tramos, la lista era plana de aquí a 45 días y el jueves que
 * viene se leía igual que un cumpleaños de octubre.
 *
 * Van respecto al día elegido y no respecto a hoy, porque el panel entero
 * arranca ahí: mirando el 17 de septiembre, "esta semana" es la suya.
 */
function tramoDelDia(day: Date, desde: Date): string {
  if (day <= endOfWeek(desde, { weekStartsOn: 1 })) return 'Esta semana'
  if (day <= endOfWeek(addWeeks(desde, 1), { weekStartsOn: 1 })) return 'La semana que viene'
  // El año solo cuando no es el del día elegido. En 45 días eso solo pasa al
  // cruzar de diciembre a enero, y ahí "Enero" a secas se leería como el enero
  // que ya pasó.
  const mismoAno = day.getFullYear() === desde.getFullYear()
  return capitalize(format(day, mismoAno ? 'MMMM' : 'MMMM yyyy', { locale: es }))
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
      className="flex w-full items-baseline gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-canvas"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 self-center"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-[11px] font-bold text-muted flex-shrink-0 tabular-nums">{hora}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{event.title}</span>
      {asignado && (
        <span className="max-w-[4.5rem] flex-shrink-0 truncate text-[11px] font-bold" style={{ color: asignado.color }}>
          {asignado.name}
        </span>
      )}
    </button>
  )
}

const TARJETA = 'overflow-hidden rounded-3xl border border-surface bg-white shadow-sm'
const ROTULO = 'px-1 text-xs font-bold uppercase tracking-widest text-muted'

export function AgendaList({ selectedDay, events, kids, members, tasks = [], onToggleTask, buscador, onSelectDay, onEdit, onAdd }: AgendaListProps) {
  const rangeStart = startOfDay(selectedDay)
  const rangeEnd = addDays(rangeStart, DIAS_POR_DELANTE)

  // Las vacaciones se quedan fuera de la lista: ocupan muchos días seguidos y
  // se repetirían en todos ellos. Su sitio es la franja bajo el día, que enseña
  // el tramo de un vistazo, y su leyenda, desde donde se editan.
  const conFecha = events.filter(event => !isVacation(event))

  const hoyStr = getLocalDateString(new Date())

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

  const delDia = dayGroups[0]
  const proximos = dayGroups
    .slice(1)
    .filter(group => group.events.length > 0 || group.tasks.length > 0)

  // Los días ya vienen en orden, y los tramos también van de cerca a lejos, así
  // que agrupar es acumular seguido: en cuanto cambia el rótulo, empieza tramo
  // nuevo. No hace falta un mapa ni reordenar nada.
  const tramos: { titulo: string; dias: typeof proximos }[] = []
  for (const grupo of proximos) {
    const titulo = tramoDelDia(grupo.day, rangeStart)
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && ultimo.titulo === titulo) ultimo.dias.push(grupo)
    else tramos.push({ titulo, dias: [grupo] })
  }

  const diaVacio = delDia.events.length === 0 && delDia.tasks.length === 0
  const todoVacio = diaVacio && proximos.length === 0

  const buscando = !!buscador && buscador.valor.trim().length > 0
  const coincidencias = buscador?.coincidencias ?? []

  return (
    <div className="flex-1 space-y-4 px-4 pt-4 lg:px-0 lg:pt-0">
      {buscador && (
        <SearchField
          value={buscador.valor}
          onChange={buscador.onChange}
          placeholder="Buscar en todo el calendario…"
          ariaLabel="Buscar eventos"
        />
      )}

      {/* Buscando se enseña el calendario entero, pasado incluido: "¿cuándo fue
          la revisión?" es una pregunta sobre lo que ya ocurrió, y el tramo que
          se pinta empieza hoy. Cada resultado lleva su fecha completa porque ya
          no hay columna de día que lo sitúe. */}
      {buscando ? (
        <section className="space-y-2">
          <h2 className={ROTULO}>
            {coincidencias.length} resultado{coincidencias.length !== 1 ? 's' : ''} en todo el calendario
          </h2>
          {coincidencias.length === 0 ? (
            <div className={TARJETA}>
              <EmptyState
                emoji="🔍"
                title="Sin coincidencias"
                description={`Ningún evento con «${buscador!.valor.trim()}»`}
              />
            </div>
          ) : (
            <div className={TARJETA}>
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
          )}
        </section>
      ) : todoVacio ? (
        /* Un solo vacío y no dos. Con el día y los próximos días vacíos, dos
           tarjetas seguidas diciendo lo mismo se comían la pantalla para contar
           que no hay nada: la misma lección que dejó Inicio. */
        <button
          onClick={() => onAdd(selectedDay)}
          className={`w-full text-left transition-colors hover:border-primary ${TARJETA}`}
        >
          <EmptyState
            emoji="✨"
            title="Sin planes"
            description="Toca para añadir un evento"
          />
        </button>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="px-1 text-sm font-bold text-ink">{etiquetaDia(selectedDay)}</h2>
            <div className={TARJETA}>
              {diaVacio ? (
                <button onClick={() => onAdd(selectedDay)} className="w-full text-left transition-colors hover:bg-canvas">
                  <EmptyState compact emoji="✨" title="Sin planes. Toca para añadir uno." />
                </button>
              ) : (
                <div className="px-2 py-2">
                  {delDia.events.map(event => (
                    <EventRow key={event.id} event={event} kids={kids} members={members} onEdit={onEdit} />
                  ))}
                  {onToggleTask && (
                    <DayTasks
                      tasks={delDia.tasks}
                      kids={kids}
                      members={members}
                      hoy={hoyStr}
                      onToggle={onToggleTask}
                    />
                  )}
                </div>
              )}
            </div>
          </section>

          {/* El `aria-label` nombra el bloque entero, que ya no tiene un título
              visible propio: los rótulos son los de cada tramo. Sirve al lector
              de pantalla y es el asidero estable de los tests, que si no
              tendrían que buscar "Esta semana" y romperse los domingos. */}
          {tramos.length > 0 && (
            <section aria-label="Próximos días" className="space-y-4">
              {tramos.map(tramo => (
                <div key={tramo.titulo} className="space-y-2">
                  <h2 className={ROTULO}>{tramo.titulo}</h2>
                  {/* Una fila por día dentro de una sola tarjeta: fecha a la
                      izquierda y lo que hay a la derecha. Una tarjeta por día
                      decía la fecha dos veces y gastaba una línea en contar los
                      eventos que ya se veían debajo. */}
                  <div className={TARJETA}>
                    <ul className="divide-y divide-hairline">
                      {tramo.dias.map(group => {
                        const dayLabel = capitalize(format(group.day, "EEEE d 'de' MMMM", { locale: es }))

                        return (
                          <li
                            key={group.day.toISOString()}
                            className="flex items-start gap-2 px-2 py-2"
                          >
                            <button
                              onClick={() => onSelectDay(group.day)}
                              aria-label={`Ver ${dayLabel}`}
                              className="flex w-11 flex-shrink-0 flex-col items-center rounded-xl py-1 text-ink transition-colors hover:bg-canvas"
                            >
                              <span className="text-sm font-black leading-none">{format(group.day, 'd')}</span>
                              <span className="mt-0.5 text-[9px] font-bold uppercase leading-none text-muted">
                                {format(group.day, 'EEE', { locale: es })}
                              </span>
                            </button>

                            <div className="min-w-0 flex-1 self-center">
                              {group.events.map(event => (
                                <EventRow key={event.id} event={event} kids={kids} members={members} onEdit={onEdit} />
                              ))}
                              {onToggleTask && (
                                <DayTasks
                                  tasks={group.tasks}
                                  kids={kids}
                                  members={members}
                                  hoy={hoyStr}
                                  onToggle={onToggleTask}
                                />
                              )}
                            </div>

                            <button
                              onClick={() => onAdd(group.day)}
                              aria-label={`Añadir evento el ${dayLabel}`}
                              // Arriba y no centrado: en un día con seis tareas,
                              // centrado quedaba flotando a media fila, lejos de su
                              // fecha.
                              className="flex h-7 w-7 flex-shrink-0 self-start items-center justify-center rounded-full text-faint transition-colors hover:bg-primary-tint hover:text-primary"
                            >
                              <Plus size={14} strokeWidth={2.5} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
