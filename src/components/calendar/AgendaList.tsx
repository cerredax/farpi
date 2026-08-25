'use client'

import { useEffect, useRef } from 'react'

import {
  addDays,
  compareAsc,
  eachDayOfInterval,
  format,
  isToday,
  parseISO,
  startOfDay,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import type { Event, Child, FamilyMember, Task } from '@/types'
import { tramoDeAgenda } from '@/lib/agenda'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { getLocalDateString } from '@/lib/date-utils'
import { eventCoversDay, isAbsence } from '@/lib/events'
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
  /**
   * Día en el que arranca la lista. En la agenda es **hoy** y no se mueve: es
   * una lista continua que se desliza. Con el mes delante es el **día elegido**,
   * porque ahí tocar un día tiene que enseñar ese día.
   */
  desde: Date
  /**
   * Día al que deslizarse cuando cambia. Es lo que hace útil la rejilla del mes:
   * tocar un día no reencuadra la lista —eso escondía todo lo anterior— sino que
   * la desliza hasta él.
   */
  focusDay?: Date
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
  onEdit: (event: Event) => void
  onAdd: (day?: Date) => void
}

/** El ancla de cada día en el DOM, para poder deslizarse hasta él desde el mes. */
function idDeDia(day: Date): string {
  return `dia-${getLocalDateString(day)}`
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
 *
 * Lo que no es de nadie dice **"Familia"** (24-08-2026). Antes se quedaba sin
 * texto y solo lo decía el punto amarillo, que es justo lo que no queríamos:
 * saberse la paleta para entender a quién afecta. Va en gris y no en el amarillo
 * de la familia porque ese color no tiene contraste suficiente como texto — para
 * eso existe `sand-strong`—, y aquí basta con que la palabra esté.
 */
function EventRow({ event, kids, members, onEdit }: { event: Event; kids: Child[]; members: FamilyMember[]; onEdit: (event: Event) => void }) {
  const asignado = resolveAssignee(event, members, kids)
  const color = eventColor(event, members, kids)
  const hora = event.all_day ? 'Todo el día' : format(parseISO(event.start_at), 'HH:mm')
  const quien = asignado?.name ?? 'Familia'

  return (
    <button
      onClick={() => onEdit(event)}
      title={`${event.title} · ${quien}`}
      className="flex w-full items-baseline gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-canvas"
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 self-center"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-[11px] font-bold text-muted flex-shrink-0 tabular-nums">{hora}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{event.title}</span>
      <span
        className={`max-w-[4.5rem] flex-shrink-0 truncate text-[11px] font-bold ${asignado ? '' : 'text-muted'}`}
        style={asignado ? { color: asignado.color } : undefined}
      >
        {quien}
      </span>
    </button>
  )
}

const TARJETA = 'overflow-hidden rounded-3xl border border-surface bg-white shadow-sm'
const ROTULO = 'px-1 text-xs font-bold uppercase tracking-widest text-muted'

export function AgendaList({ desde, focusDay, events, kids, members, tasks = [], onToggleTask, buscador, onEdit, onAdd }: AgendaListProps) {
  const rangeStart = startOfDay(desde)
  const rangeEnd = addDays(rangeStart, DIAS_POR_DELANTE)

  // Las ausencias —vacaciones y descansos— se quedan fuera de la lista: ocupan
  // días seguidos y se repetirían en todos ellos. Un descanso de tres días salía
  // tres veces, con el mismo texto. Su sitio es la raya bajo el día, que avisa de
  // que falta alguien, y el bloque de "Vacaciones y descansos", que dice de quién
  // es y hasta cuándo, una vez.
  const conFecha = events.filter(event => !isAbsence(event))

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

  // **Una sola lista** (25-08-2026). El día en el que arranca entra como un día
  // más y es su rótulo —"Hoy", o su fecha— quien lo nombra. Antes tenía tarjeta
  // propia encima de "lo que viene", y eran dos capas de contenido diciendo lo
  // mismo de dos formas. Un día sin nada no se pinta, tampoco el primero: en una
  // lista continua un hueco vacío es ruido, y para añadir están el botón de la
  // cabecera y el `+` de cada fila.
  const conAlgo = dayGroups.filter(group => group.events.length > 0 || group.tasks.length > 0)

  // Los días ya vienen en orden, y los tramos también van de cerca a lejos, así
  // que agrupar es acumular seguido: en cuanto cambia el rótulo, empieza tramo
  // nuevo. No hace falta un mapa ni reordenar nada.
  const tramos: { titulo: string; dias: typeof conAlgo }[] = []
  for (const grupo of conAlgo) {
    const titulo = tramoDeAgenda(grupo.day, rangeStart)
    const ultimo = tramos[tramos.length - 1]
    if (ultimo && ultimo.titulo === titulo) ultimo.dias.push(grupo)
    else tramos.push({ titulo, dias: [grupo] })
  }

  const todoVacio = conAlgo.length === 0

  /**
   * Deslizar hasta el día elegido cuando cambia.
   *
   * Se salta el primer render a propósito: al entrar, el día elegido es hoy y
   * hoy ya está arriba del todo, así que animar el salto sería mover la pantalla
   * nada más abrirla. Y si el día no tiene nada no se pinta ninguna fila: no hay
   * a dónde ir, y la rejilla ya lo deja marcado.
   */
  const primerRender = useRef(true)
  useEffect(() => {
    if (primerRender.current) { primerRender.current = false; return }
    if (!focusDay) return
    document
      .getElementById(idDeDia(focusDay))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focusDay])

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
        /* Un solo vacío: cuarenta y cinco días por delante sin nada. */
        <button
          onClick={() => onAdd(rangeStart)}
          className={`w-full text-left transition-colors hover:border-primary ${TARJETA}`}
        >
          <EmptyState
            emoji="✨"
            title="Sin planes"
            description="Toca para añadir un evento"
          />
        </button>
      ) : (
        /* **Una lista continua y nada más**: la vista Programación de Google
           Calendar (25-08-2026). Cada tramo es una sección con su rótulo y,
           dentro, una fila por día con algo. Lo que se fue con este cambio: la
           tira de siete días de arriba —el segundo navegador de la pantalla— y
           la tarjeta del día elegido, que repetía como bloque lo que la lista ya
           dice como fila. De siete bandas apiladas a dos: cabecera y lista. */
        <section aria-label="Agenda" className="space-y-4">
          {tramos.map(tramo => (
            /* El nombre accesible repite el rótulo visible a propósito: nombra el
               bloque mejor que un genérico y es el asidero de los tests, que
               antes buscaban un "Próximos días" sin título a la vista. */
            <section key={tramo.titulo} aria-label={tramo.titulo} className="space-y-2">
              <h2 className={ROTULO}>{tramo.titulo}</h2>
              {/* Una fila por día dentro de una sola tarjeta: fecha a la
                  izquierda y lo que hay a la derecha. Una tarjeta por día decía
                  la fecha dos veces y gastaba una línea en contar los eventos
                  que ya se ven debajo. */}
              <div className={TARJETA}>
                <ul className="divide-y divide-hairline">
                  {tramo.dias.map(group => {
                    const dayLabel = capitalize(format(group.day, "EEEE d 'de' MMMM", { locale: es }))
                    // Hoy se marca en el chip de la fecha y no en el rótulo, que
                    // ya dice "Hoy": es donde lo marca Google y donde lo busca el
                    // ojo cuando la lista lleva rato deslizándose.
                    const hoy = isToday(group.day)

                    return (
                      <li
                        key={group.day.toISOString()}
                        id={idDeDia(group.day)}
                        className="flex items-start gap-2 px-2 py-2"
                      >
                        {/* La fecha ya no es un botón. En una lista continua no
                            lleva a ninguna parte, y anunciarse como "Ver 6 de
                            septiembre" prometía un salto que ya no ocurre. Para
                            añadir está el `+` de la derecha. */}
                        <span
                          aria-hidden
                          className={`flex w-11 flex-shrink-0 flex-col items-center py-1 ${hoy ? 'text-accent' : 'text-ink'}`}
                        >
                          <span className="text-sm font-black leading-none">{format(group.day, 'd')}</span>
                          <span className={`mt-0.5 text-[9px] font-bold uppercase leading-none ${hoy ? 'text-accent' : 'text-muted'}`}>
                            {format(group.day, 'EEE', { locale: es })}
                          </span>
                        </span>

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
            </section>
          ))}
        </section>
      )}
    </div>
  )
}
