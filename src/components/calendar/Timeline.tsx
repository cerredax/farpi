'use client'

import { useEffect, useState } from 'react'
import { format, isToday, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { Cake } from 'lucide-react'
import { eventColor, fondoDePersona, resolveAssignee } from '@/lib/assignees'
import { eventCoversDay, holidayName, isAbsence, isBirthday, isHoliday, isVacation } from '@/lib/events'
import { getLocalDateString } from '@/lib/date-utils'
import { partirEventosDelDia, rangoHorario, repartirSolapados, type BloqueDia } from '@/lib/timeline'
import { capitalize } from '@/lib/text'
import type { Child, Event, FamilyMember, Task } from '@/types'

/**
 * Uno o varios días sobre un eje de horas: la vista Día y la vista Semana de
 * escritorio, que son la misma cosa con una columna o con siete.
 *
 * **Solo escritorio.** La razón por la que la semana en columnas se descartó en
 * su día sigue en pie y está escrita en "Decisiones de producto": a 390 px cada
 * columna son ~45 px y los bloques se quedan sin texto. A 1440 px una columna
 * pasa de 170 px, así que la razón no aplica ahí. El móvil sigue con la lista.
 *
 * La aritmética —dónde cae cada bloque, cómo se reparten los que se pisan y qué
 * horas se pintan— es de `src/lib/timeline.ts`, que se retiró con el eje de
 * horas del móvil el 24-08-2026 y vuelve intacta, con sus 19 unitarios.
 */

/**
 * Alto mínimo de una hora del eje. El de verdad se calcula en CSS para que el
 * día **entre entero sin cortarse**, y este es el suelo: por debajo de 28 px una
 * cita de media hora no se puede pulsar, así que en una pantalla muy baja el eje
 * prefiere desliz  arse antes que encogerse más.
 */
const ALTO_HORA_MINIMO = 28

/** Alto mínimo de un bloque, para que una cita de quince minutos se pueda pulsar. */
const ALTO_MINIMO_BLOQUE = 28

/**
 * El día que se enseña siempre, aunque no haya nada a esas horas.
 *
 * `rangoHorario` recorta el eje a lo que hay, que en la vista de móvil tenía
 * sentido —un día de dos citas no tenía por qué enseñar la madrugada— pero en
 * escritorio dejaba una semana con dos huecos de tres horas y el resto cortado.
 * Un calendario de semana sirve para ver los huecos tanto como lo lleno, así que
 * el eje cubre de siete a diez de la noche como mínimo, y se estira si hay algo
 * antes o después.
 */
const DIA_VISIBLE = { inicio: 7 * 60, fin: 22 * 60 }

/** Ancho del canal de las horas, a la izquierda del eje. */
const CANAL_HORAS = 56

/** Ancho mínimo de la columna de un día, para que un título se lea. */
const ANCHO_MINIMO_COLUMNA = 110

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

  // En unidades de `--alto-hora`, que la fija el contenedor según lo que quepa.
  const top = `calc(var(--alto-hora) * ${((inicio - desde * 60) / 60).toFixed(4)})`
  const alto = `max(calc(var(--alto-hora) * ${((fin - inicio) / 60).toFixed(4)}), ${ALTO_MINIMO_BLOQUE}px)`
  const hora = format(new Date(event.start_at), 'HH:mm')
  // Lo que no es de nadie dice "Familia", como en la lista y en la celda del mes:
  // el punto de color solo habla si te sabes la paleta.
  const quien = asignado?.name ?? 'Familia'
  const ancho = 100 / columnas

  return (
    <button
      type="button"
      onClick={() => onEdit(event)}
      aria-label={`${hora} ${event.title}, ${quien}`}
      className="absolute z-10 overflow-hidden rounded-lg px-1.5 py-0.5 text-left transition-shadow hover:shadow-md"
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
      {/* La hora y de quién es, **siempre**. Estuvo condicionada al alto del
          bloque y luego a su duración, y las dos veces dejaba fuera justo el caso
          más común: un evento **sin hora de fin**, que se dibuja con 45 minutos
          por defecto (`DURACION_SIN_HORA_FIN`) y por tanto nunca llegaba al
          mínimo. Si el bloque es muy corto, el recorte lo hace `overflow-hidden`,
          que es mejor que decidir por él que no lo necesita. */}
      <span className="block truncate text-[10px] font-semibold leading-tight text-muted">
        {hora} · {quien}
      </span>
    </button>
  )
}

/**
 * La raya de la hora actual. Va por debajo de los bloques a propósito: encima
 * cruzaba los títulos y los dejaba tachados, y los bloques son translúcidos, así
 * que se transparenta igual. Es una marca, no algo que haya que leer.
 */
function AhoraLine({ minutos, desde }: { minutos: number; desde: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-0 flex items-center"
      style={{ top: `calc(var(--alto-hora) * ${((minutos - desde * 60) / 60).toFixed(4)})` }}
      aria-hidden
    >
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-danger" />
      <span className="h-[2px] flex-1 bg-danger" />
    </div>
  )
}

interface TimelineProps {
  /** Los días que se pintan, en orden. Uno en la vista Día, siete en Semana. */
  days: Date[]
  events: Event[]
  /**
   * Los cumpleaños, que llegan **aparte** porque `events` no los trae: el
   * calendario los aparta de la rejilla y de la agenda a propósito (el porqué
   * está en `Birthdays.tsx`). Aquí sí se pintan, en la franja de lo que no tiene
   * hora: en Día y Semana no hay bloque de cumpleaños debajo al que mirar, así
   * que sin esto un 12 de septiembre no decía por ninguna parte que la abuela
   * cumple años.
   */
  cumples: Event[]
  kids: Child[]
  members: FamilyMember[]
  /** Pendientes con fecha: van arriba, con lo de todo el día. */
  tasks: Task[]
  onEdit: (event: Event) => void
  /**
   * Apuntar algo. La hora es la de la franja que se ha pulsado: con el eje
   * delante, el hueco vacío ya dice a qué hora, y volver a escribirla en el
   * formulario es contarlo dos veces.
   */
  onAdd: (day: Date, hora?: number) => void
}

export function Timeline({ days, events, cumples, kids, members, tasks, onEdit, onAdd }: TimelineProps) {
  // La hora actual se lee en el cliente y se refresca cada minuto: pintada en el
  // servidor saldría con la hora del servidor y se quedaría clavada.
  const [ahora, setAhora] = useState<number | null>(null)
  useEffect(() => {
    const leer = () => {
      const d = new Date()
      setAhora(d.getHours() * 60 + d.getMinutes())
    }
    leer()
    const id = window.setInterval(leer, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const hoyStr = getLocalDateString(new Date())

  const porDia = days.map(day => {
    const diaStr = getLocalDateString(day)
    const { todoElDia, conHora } = partirEventosDelDia(events, diaStr)
    return {
      day,
      /**
       * Las ausencias, con el nombre de quien falta, arriba del todo.
       *
       * `partirEventosDelDia` deja fuera las vacaciones —su sitio era la raya de
       * la rejilla— y aquí no hay rejilla, así que quedaban invisibles: una
       * semana entera de vacaciones no salía por ninguna parte. Y un descanso
       * sí salía, pero como un evento de todo el día titulado "Descanso", sin
       * decir de quién. Se pintan como en la celda del mes: nombre sobre su
       * color al 50 %.
       */
      // El festivo va aparte de las ausencias: no dice quién falta, dice que ese
      // día no hay trabajo ni colegio. Y por eso se pinta en gris.
      festivos: events.filter(e => isHoliday(e) && eventCoversDay(e, diaStr)),
      ausencias: events.filter(e => isAbsence(e) && eventCoversDay(e, diaStr)),
      // Un cumpleaños es un día suelto, así que basta con el día de su fecha.
      cumples: cumples.filter(e => isBirthday(e) && eventCoversDay(e, diaStr)),
      todoElDia,
      bloques: repartirSolapados(conHora, diaStr),
      // Lo atrasado se arrastra a hoy, igual que en la lista.
      tasks: tasks.filter(t => t.due_date && (t.due_date < hoyStr ? diaStr === hoyStr : t.due_date === diaStr)),
    }
  })

  /**
   * Un solo eje para todas las columnas, calculado sobre lo que hay en **todas**.
   * Con siete ejes distintos no se podría comparar un martes con un jueves, que
   * es justo para lo que sirve mirar la semana.
   */
  const { desde, hasta } = rangoHorario(
    [...porDia.flatMap(d => d.bloques), DIA_VISIBLE],
    days.some(d => isToday(d)) ? (ahora ?? undefined) : undefined,
  )
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i)

  /**
   * El alto de una hora se calcula en CSS y no aquí, y por eso las posiciones van
   * en `calc()` sobre `--alto-hora`: así el eje se reparte el alto que queda en
   * la pantalla y el día entra entero, en vez de vivir en una caja con scroll
   * propio que lo dejaba cortado por abajo.
   *
   * `22rem` es lo que ocupan la cabecera de la app, la del calendario, la fila de
   * los días y el aire de la página. Si no llega, manda el suelo de 28 px y
   * entonces sí se desliza —mejor deslizarse que no poder pulsar una cita—.
   */
  const altoHora = `max(${ALTO_HORA_MINIMO}px, calc((100vh - 22rem) / ${horas.length}))`
  const enHoras = (n: number) => `calc(var(--alto-hora) * ${n.toFixed(4)})`
  const alto = enHoras(horas.length)

  const hayAlgoArriba = porDia.some(d => d.festivos.length > 0 || d.ausencias.length > 0 || d.cumples.length > 0 || d.todoElDia.length > 0 || d.tasks.length > 0)
  /**
   * Las columnas, con **ancho mínimo**. A 390 px, siete columnas salen a 43 px y
   * un bloque no tiene sitio ni para cuatro letras —"Ped…"—, que es por lo que
   * esta vista no existía en móvil. Con un mínimo de 110 px se leen los títulos y
   * la semana se recorre pasando el dedo, que es lo que hacen las apps que sí la
   * ofrecen ahí.
   *
   * En escritorio no cambia nada: la columna ya mide 150 px de sobra, así que el
   * mínimo no llega a aplicarse y no aparece ninguna barra.
   */
  const columnas = `${CANAL_HORAS}px repeat(${days.length}, minmax(${ANCHO_MINIMO_COLUMNA}px, 1fr))`

  return (
    <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
      {/* Las tres rejillas —días, todo el día y el eje— comparten un solo
          contenedor que se desliza a lo ancho: si cada una tuviera el suyo, la
          cabecera se quedaría quieta mientras las horas se mueven. */}
      <div className="overflow-x-auto">
      {/* Cabecera de columnas: qué día es cada una. **Solo con varias**: en la
          vista de un día, la cabecera del calendario ya pone "Jueves, 27 de
          agosto" y repetirlo aquí es decirlo dos veces seguidas. */}
      {days.length > 1 && (
      <div className="grid border-b border-hairline" style={{ gridTemplateColumns: columnas }}>
        <span aria-hidden />
        {days.map(day => {
          const hoy = isToday(day)
          return (
            <div key={day.toISOString()} className="flex flex-col items-center gap-0.5 py-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${hoy ? 'text-accent' : 'text-muted'}`}>
                {capitalize(format(day, days.length === 1 ? 'EEEE' : 'EEE', { locale: es }))}
              </span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  hoy ? 'bg-accent text-white' : 'text-ink'
                }`}
              >
                {format(day, 'd')}
              </span>
            </div>
          )
        })}
      </div>
      )}

      {/* Lo que no tiene hora: eventos de todo el día y tareas, que vencen pero
          no ocurren a una hora. La franja solo aparece si hay algo, para no
          gastar una banda fija en la mayoría de los días, que no tienen nada. */}
      {hayAlgoArriba && (
        <div className="grid border-b border-hairline bg-canvas/50" style={{ gridTemplateColumns: columnas }}>
          {/* Sin `uppercase` ni `tracking`: el canal mide 56 px y "TODO EL DÍA"
              en versalitas espaciadas partía en dos líneas y se comía el alto de
              la franja. */}
          <span className="flex items-center justify-end whitespace-nowrap pr-2 text-[9px] font-bold text-faint">
            Todo el día
          </span>
          {porDia.map(({ day, festivos, ausencias, cumples: cumplesDelDia, todoElDia, tasks: delDia }) => (
            <div key={day.toISOString()} className="flex flex-col gap-0.5 px-1 py-1">
              {/* Sin chip: la trama de la columna ya dice que es festivo. Aquí
                  queda su nombre, que es la otra mitad de la respuesta. */}
              {festivos.map(event => holidayName(event) && (
                <span
                  key={event.id}
                  className="truncate px-1 text-[10px] font-bold uppercase tracking-wide text-muted"
                >
                  {holidayName(event)}
                </span>
              ))}
              {ausencias.map(event => {
                const quien = resolveAssignee(event, members, kids)?.name ?? 'Familia'
                return (
                  <span
                    key={event.id}
                    className="etiqueta-persona px-1 py-0.5 text-[10px]"
                    style={{ backgroundColor: fondoDePersona(eventColor(event, members, kids)) }}
                  >
                    {quien}{isVacation(event) ? ' · vacaciones' : ' · descansa'}
                  </span>
                )
              })}
              {/* Los cumpleaños, después de las ausencias y antes de los planes:
                  como el festivo y la ausencia, dicen **cómo es el día** y no
                  algo que hacer a una hora, y ese es el orden que ya tienen bajo
                  la rejilla del mes. Sin botón, igual que los otros dos: se
                  editan desde su bloque en la vista Mes, que es la fuente. */}
              {cumplesDelDia.map(event => (
                <span
                  key={event.id}
                  className="etiqueta-persona flex items-center gap-1 px-1 py-0.5 text-[10px]"
                  style={{ backgroundColor: fondoDePersona(eventColor(event, members, kids)) }}
                >
                  <Cake size={10} strokeWidth={2.2} className="flex-shrink-0" aria-hidden />
                  <span className="truncate">{event.title}</span>
                </span>
              ))}
              {todoElDia.map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEdit(event)}
                  className="truncate rounded px-1 py-0.5 text-left text-[10px] font-bold text-ink transition-shadow hover:shadow-sm"
                  style={{ backgroundColor: `${eventColor(event, members, kids)}33` }}
                >
                  {event.title}
                </button>
              ))}
              {delDia.length > 0 && (
                <span className="px-1 text-[10px] font-bold text-muted">
                  {delDia.length} tarea{delDia.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* El eje se desliza dentro de la tarjeta: así la cabecera de días se queda
          arriba, que es lo que la hace útil al bajar hasta la tarde. */}
      {/* Sin caja con scroll propio: el eje se reparte el alto que queda y el día
          entra entero. */}
      <div>
        {/* El relleno de arriba y abajo no es estética: la etiqueta de cada hora
            va centrada sobre su raya, así que la primera asoma media línea por
            encima del eje y la última por debajo. Sin él se cortaban las dos. */}
        <div
          className="grid py-3"
          style={{ gridTemplateColumns: columnas, ['--alto-hora' as string]: altoHora }}
        >
          <div className="relative" style={{ height: alto }}>
            {horas.map((hora, i) => (
              <span
                key={hora}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-bold text-faint"
                style={{ top: enHoras(i) }}
              >
                {String(hora).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {porDia.map(({ day, bloques, festivos }) => (
            <div
              key={day.toISOString()}
              // La misma trama que en la rejilla: sábado, domingo y festivo.
              className={`relative border-l border-hairline ${
                isWeekend(day) || festivos.length > 0 ? 'dia-libre' : ''
              }`}
              style={{ height: alto }}
            >
              {horas.map((hora, i) => (
                <span
                  key={hora}
                  className="absolute inset-x-0 border-t border-hairline/70"
                  style={{ top: enHoras(i) }}
                  aria-hidden
                />
              ))}

              {/* El hueco vacío también sirve: pulsar una franja libre abre el
                  formulario en ese día **y a esa hora**, que es lo que se espera
                  de un calendario. Va debajo de los bloques (`z-10` en ellos)
                  para no taparlos.
                  Un botón por hora y no uno por columna: así se sabe qué franja
                  se ha pulsado sin medir la posición del dedo contra la caja, que
                  es la clase de cuenta que se rompe en cuanto el eje se desliza.
                  Cada franja mide `--alto-hora`, con suelo de 28 px, así que
                  ninguno baja del mínimo de 24 px que pide `e2e/movil.spec.ts`. */}
              {horas.map((hora, i) => (
                <button
                  key={`apuntar-${hora}`}
                  type="button"
                  onClick={() => onAdd(day, hora)}
                  aria-label={`Apuntar algo el ${format(day, "d 'de' MMMM", { locale: es })} a las ${String(hora).padStart(2, '0')}:00`}
                  className="absolute inset-x-0"
                  style={{ top: enHoras(i), height: enHoras(1) }}
                />
              ))}

              {isToday(day) && ahora !== null && ahora >= desde * 60 && ahora <= hasta * 60 && (
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
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
