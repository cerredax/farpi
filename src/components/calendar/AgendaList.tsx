'use client'

import { useEffect, useRef, useState } from 'react'

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
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import type { Event, Child, FamilyMember, Task } from '@/types'
import { agruparPorPersona, tramoDeAgenda } from '@/lib/agenda'
import { buildAssignees, eventColor, fondoDePersona, resolveAssignee } from '@/lib/assignees'
import { getLocalDateString } from '@/lib/date-utils'
import { eventCoversDay, isHoliday, isPlan } from '@/lib/events'
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
 *
 * `mostrarPersona` la apaga cuando la lista va agrupada por persona: ahí el
 * nombre ya está en el rótulo de arriba y repetirlo en cada fila es decir tres
 * veces "Marta" para tres citas de Marta. El título recupera ese ancho.
 */
function EventRow({ event, kids, members, onEdit, mostrarPersona = true }: { event: Event; kids: Child[]; members: FamilyMember[]; onEdit: (event: Event) => void; mostrarPersona?: boolean }) {
  const asignado = resolveAssignee(event, members, kids)
  // Un festivo no es de nadie: ni lleva el amarillo de "Familia" —que lo
  // confundiría con algo de toda la casa— ni dice un nombre. Dice lo que es.
  const festivo = isHoliday(event)
  const color = festivo ? 'var(--color-line)' : eventColor(event, members, kids)
  const hora = event.all_day ? 'Todo el día' : format(parseISO(event.start_at), 'HH:mm')
  const quien = festivo ? 'Festivo' : asignado?.name ?? 'Familia'

  return (
    <button
      onClick={() => onEdit(event)}
      title={`${event.title} · ${quien}`}
      className="flex w-full items-baseline gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-canvas"
    >
      <span className="text-[11px] font-bold text-muted flex-shrink-0 tabular-nums">{hora}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{event.title}</span>
      {/**
        * **El color va al fondo del nombre, y el punto se va** (26-08-2026).
        * Eran dos cosas que mirar para decir una: de quién es. Es el mismo
        * cambio que hizo la celda del mes, y ahora las dos filas —la de la
        * rejilla y la de la lista— hablan igual.
        *
        * Con el punto, lo de toda la familia era la única fila con color, porque
        * el amarillo no vale como texto —no llega al contraste— y el nombre se
        * escribía en gris. Al 50 % de fondo sí vale, así que "Familia" recupera
        * su color sin perder legibilidad.
        */}
      {mostrarPersona && (
        <span
          className="etiqueta-persona max-w-[4.5rem] flex-shrink-0 px-1 py-px text-[11px]"
          style={{ backgroundColor: fondoDePersona(color) }}
        >
          {quien}
        </span>
      )}
    </button>
  )
}

const TARJETA = 'overflow-hidden rounded-3xl border border-surface bg-white shadow-sm'
const ROTULO = 'px-1 text-xs font-bold uppercase tracking-widest text-muted'


/**
 * Un día de la lista: la fecha a la izquierda y lo que hay a la derecha.
 *
 * Es la fila de siempre, sacada a su propio componente porque ahora la usan los
 * **dos ejes** de la agenda: agrupada por días la pintan los tramos, y agrupada
 * por persona la pinta cada persona con lo suyo. La fila no cambia entre uno y
 * otro; lo único que cambia es el rótulo que tiene encima.
 */
function FilaDia({ day, events, tasks, kids, members, hoyStr, onEdit, onToggleTask, mostrarPersona = true, ancla = true }: {
  day: Date
  events: Event[]
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  hoyStr: string
  onEdit: (event: Event) => void
  onToggleTask?: (id: string) => void
  mostrarPersona?: boolean
  /**
   * Si esta fila es el destino al que se desliza el mes. Agrupando por persona
   * un mismo día sale en varias filas, y dos elementos con el mismo `id` dejan
   * el salto a merced de cuál encuentre el navegador primero: el ancla se la
   * queda la primera aparición del día y las demás van sin ella.
   */
  ancla?: boolean
}) {
  const dayLabel = capitalize(format(day, "EEEE d 'de' MMMM", { locale: es }))
  // Hoy se marca en el chip de la fecha y no en el rótulo, que
  // ya dice "Hoy": es donde lo marca Google y donde lo busca el
  // ojo cuando la lista lleva rato deslizándose.
  const hoy = isToday(day)

  return (
    <li id={ancla ? idDeDia(day) : undefined} className="flex items-start gap-2 px-2 py-2">
      {/* La fecha ya no es un botón. En una lista continua no
          lleva a ninguna parte, y anunciarse como "Ver 6 de
          septiembre" prometía un salto que ya no ocurre. Para
          añadir está el `+` de la derecha. */}
      <span className={`flex w-11 flex-shrink-0 flex-col items-center py-1 ${hoy ? 'text-accent' : 'text-ink'}`}>
        {/* La fecha entera, solo para quien escucha. El chip
            dice "13 JUE", que con la vista basta y a oídas no:
            se leyó "trece jueves" cuando la fecha dejó de ser un
            botón con su etiqueta. */}
        <span className="sr-only">{dayLabel}</span>
        <span className="text-sm font-black leading-none" aria-hidden>{format(day, 'd')}</span>
        <span
          aria-hidden
          className={`mt-0.5 text-[9px] font-bold uppercase leading-none ${hoy ? 'text-accent' : 'text-muted'}`}
        >
          {format(day, 'EEE', { locale: es })}
        </span>
      </span>

      <div className="min-w-0 flex-1 self-center">
        {events.map(event => (
          <EventRow key={event.id} event={event} kids={kids} members={members} onEdit={onEdit} mostrarPersona={mostrarPersona} />
        ))}
        {onToggleTask && (
          <DayTasks
            tasks={tasks}
            kids={kids}
            members={members}
            hoy={hoyStr}
            onToggle={onToggleTask}
            mostrarPersona={mostrarPersona}
          />
        )}
      </div>
    </li>
  )
}

export function AgendaList({ desde, focusDay, events, kids, members, tasks = [], onToggleTask, buscador, onEdit, onAdd }: AgendaListProps) {
  /**
   * **El eje de la lista** (27-08-2026): por días, como siempre, o por persona.
   *
   * Son las dos preguntas de una casa con varios —"¿qué hay el jueves?" y "¿qué
   * lleva cada uno?"— y hasta ahora la lista solo contestaba la primera: quién
   * tiene cada cosa se decía fila a fila, en la etiqueta de la derecha, así que
   * verlo junto era ir sumando de memoria.
   *
   * Es un eje y no una vista nueva: la misma lista, los mismos días, el mismo
   * tramo de cuarenta y cinco días. Lo único que se mueve es el rótulo, que pasa
   * de ser el tramo a ser la persona. Por eso tampoco se recuerda entre visitas,
   * igual que la vista del calendario: se entra por la pregunta de siempre.
   */
  const [eje, setEje] = useState<'dia' | 'persona'>('dia')
  const rangeStart = startOfDay(desde)
  const rangeEnd = addDays(rangeStart, DIAS_POR_DELANTE)

  /**
   * Fuera de la lista: las **ausencias** y los **festivos**.
   *
   * Las ausencias, porque ocupan días seguidos y se repetirían en todos ellos: un
   * descanso de tres días salía tres veces con el mismo texto. Su sitio es la
   * etiqueta del día y el bloque de "Vacaciones y descansos", que lo dice una vez.
   *
   * Los festivos, porque **no son un plan** (26-08-2026). La lista contesta "¿qué
   * hay que hacer?" y un festivo no es algo que hacer: es cómo es el día. Salía
   * como una fila más, con su hora en "Todo el día", entre la revisión del coche
   * y la cena de los abuelos. En la rejilla la trama ya lo dice, y sin gastar una
   * fila de la agenda.
   */
  const conFecha = events.filter(isPlan)

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

  /**
   * Las personas de la casa con lo suyo, en el orden de siempre: familia,
   * adultos, hijos. Quien no tiene nada en el tramo no sale.
   */
  const personas = buildAssignees(members, kids)
  const gruposPersona = agruparPorPersona(conAlgo, personas)

  /**
   * Qué fila se queda el ancla de cada día. Agrupando por persona un mismo día
   * sale bajo cada uno de los que tienen algo, y el salto desde el mes va por
   * `id`: se lo lleva la primera aparición, que es la que deja el día a la vista.
   */
  const anclaDe = new Map<string, string>()
  for (const grupo of gruposPersona) {
    for (const dia of grupo.dias) {
      const clave = getLocalDateString(dia.day)
      if (!anclaDe.has(clave)) anclaDe.set(clave, grupo.persona.key)
    }
  }

  /**
   * El interruptor solo aparece cuando hay a quién repartir. `personas` siempre
   * trae a la familia, así que con una sola persona más la lista agrupada sería
   * la misma con un rótulo de adorno encima.
   */
  const mereceEje = personas.length > 2

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

      {/* El interruptor del eje. Va aquí y no en la cabecera del calendario
          porque es de la lista y solo de la lista: la rejilla del mes y el eje
          de horas se agrupan por días y no tienen otra forma de agruparse.
          Buscando no se pinta —una búsqueda ya trae lo suyo ordenado por fecha—
          ni con la lista vacía, donde no hay nada que repartir.

          Dos pastillas y no un botón que dice lo contrario de lo que se ve:
          "Agrupar por persona" en pantalla mientras la lista va por días se lee
          como el estado, no como la acción. Aquí lo blanco es lo que hay. */}
      {mereceEje && !buscando && !todoVacio && (
        <div className="flex justify-end">
          <div className="flex gap-1 rounded-2xl bg-surface p-1">
            {([['dia', 'Por día'], ['persona', 'Por persona']] as const).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                onClick={() => setEje(valor)}
                aria-pressed={eje === valor}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  eje === valor ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        </div>
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
      ) : eje === 'persona' ? (
        /* **La misma lista con el rótulo cambiado de sitio.** Arriba la persona
           y debajo sus días, con las filas de siempre: el día a la izquierda y
           lo suyo a la derecha, ya sin repetir su nombre en cada línea. Lo que
           es de toda la casa va en su propio grupo, "Familia", y el primero: no
           es de nadie en particular pero afecta a todos, y colgarlo del último
           sería esconder la cena de los abuelos debajo del pequeño. */
        <section aria-label="Agenda por persona" className="space-y-4">
          {gruposPersona.map(grupo => (
            <section key={grupo.persona.key} aria-label={grupo.persona.name} className="space-y-2">
              {/* El nombre sobre su color, como en la fila del evento y en la
                  celda del mes. Un punto al lado del nombre volvería a ser lo
                  que se quitó en agosto: dos cosas que mirar para decir una. */}
              <h2 className="px-1">
                <span
                  className="etiqueta-persona inline-block max-w-full px-1.5 py-0.5 text-xs uppercase tracking-wide"
                  style={{ backgroundColor: fondoDePersona(grupo.persona.color) }}
                >
                  {grupo.persona.name}
                </span>
              </h2>
              <div className={TARJETA}>
                <ul className="divide-y divide-hairline">
                  {grupo.dias.map(dia => (
                    <FilaDia
                      key={dia.day.toISOString()}
                      day={dia.day}
                      events={dia.events}
                      tasks={dia.tasks}
                      kids={kids}
                      members={members}
                      hoyStr={hoyStr}
                      onEdit={onEdit}
                      onToggleTask={onToggleTask}
                      mostrarPersona={false}
                      ancla={anclaDe.get(getLocalDateString(dia.day)) === grupo.persona.key}
                    />
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </section>
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
                  {tramo.dias.map(group => (
                    <FilaDia
                      key={group.day.toISOString()}
                      day={group.day}
                      events={group.events}
                      tasks={group.tasks}
                      kids={kids}
                      members={members}
                      hoyStr={hoyStr}
                      onEdit={onEdit}
                      onToggleTask={onToggleTask}
                    />
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </section>
      )}
    </div>
  )
}
