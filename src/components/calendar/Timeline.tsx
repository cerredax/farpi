'use client'

import { useEffect, useState } from 'react'
import { format, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { eventColor, resolveAssignee } from '@/lib/assignees'
import { eventCoversDay, isAbsence, isVacation } from '@/lib/events'
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

/** Alto de una hora del eje, en píxeles. */
const ALTO_HORA = 56

/** Alto mínimo de un bloque, para que una cita de quince minutos se pueda pulsar. */
const ALTO_MINIMO_BLOQUE = 28

/** Ancho del canal de las horas, a la izquierda del eje. */
const CANAL_HORAS = 56

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
  const ancho = 100 / columnas

  return (
    <button
      type="button"
      onClick={() => onEdit(event)}
      aria-label={`${hora} ${event.title}${asignado ? `, ${asignado.name}` : ''}`}
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
 * La raya de la hora actual. Va por debajo de los bloques a propósito: encima
 * cruzaba los títulos y los dejaba tachados, y los bloques son translúcidos, así
 * que se transparenta igual. Es una marca, no algo que haya que leer.
 */
function AhoraLine({ minutos, desde }: { minutos: number; desde: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-0 flex items-center"
      style={{ top: ((minutos - desde * 60) / 60) * ALTO_HORA }}
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
  kids: Child[]
  members: FamilyMember[]
  /** Pendientes con fecha: van arriba, con lo de todo el día. */
  tasks: Task[]
  onEdit: (event: Event) => void
  onAdd: (day: Date) => void
}

export function Timeline({ days, events, kids, members, tasks, onEdit, onAdd }: TimelineProps) {
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
      ausencias: events.filter(e => isAbsence(e) && eventCoversDay(e, diaStr)),
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
    porDia.flatMap(d => d.bloques),
    days.some(d => isToday(d)) ? (ahora ?? undefined) : undefined,
  )
  const horas = Array.from({ length: hasta - desde }, (_, i) => desde + i)
  const alto = (hasta - desde) * ALTO_HORA

  const hayAlgoArriba = porDia.some(d => d.ausencias.length > 0 || d.todoElDia.length > 0 || d.tasks.length > 0)
  const columnas = `${CANAL_HORAS}px repeat(${days.length}, minmax(0, 1fr))`

  return (
    <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
      {/* Cabecera de columnas: qué día es cada una. Con una sola columna cabe el
          nombre entero; con siete, la abreviatura. */}
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
          {porDia.map(({ day, ausencias, todoElDia, tasks: delDia }) => (
            <div key={day.toISOString()} className="flex flex-col gap-0.5 px-1 py-1">
              {ausencias.map(event => {
                const quien = resolveAssignee(event, members, kids)?.name ?? 'Familia'
                return (
                  <span
                    key={event.id}
                    className="truncate rounded px-1 py-0.5 text-[10px] font-bold text-ink"
                    style={{ backgroundColor: `${eventColor(event, members, kids)}80` }}
                  >
                    {quien}{isVacation(event) ? ' · vacaciones' : ' · descansa'}
                  </span>
                )
              })}
              {todoElDia.filter(e => !isAbsence(e)).map(event => (
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
      <div className="max-h-[62vh] overflow-y-auto">
        {/* El relleno de arriba y abajo no es estética: la etiqueta de cada hora
            va centrada sobre su raya, así que la primera asoma media línea por
            encima del eje y la última por debajo. Sin él se cortaban las dos. */}
        <div className="grid py-3" style={{ gridTemplateColumns: columnas }}>
          <div className="relative" style={{ height: alto }}>
            {horas.map((hora, i) => (
              <span
                key={hora}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-bold text-faint"
                style={{ top: i * ALTO_HORA }}
              >
                {String(hora).padStart(2, '0')}:00
              </span>
            ))}
          </div>

          {porDia.map(({ day, bloques }) => (
            <div
              key={day.toISOString()}
              // La misma línea que en la rejilla: el sábado abre con una raya más
              // marcada y ahí acaba la semana laboral.
              className={`relative border-l ${day.getDay() === 6 ? 'border-line' : 'border-hairline'}`}
              style={{ height: alto }}
            >
              {horas.map((hora, i) => (
                <span
                  key={hora}
                  className="absolute inset-x-0 border-t border-hairline/70"
                  style={{ top: i * ALTO_HORA }}
                  aria-hidden
                />
              ))}

              {/* El hueco vacío también sirve: pulsar una franja libre abre el
                  formulario en ese día, que es lo que se espera de un calendario.
                  Va debajo de los bloques (`z-10` en ellos) para no taparlos. */}
              <button
                type="button"
                onClick={() => onAdd(day)}
                aria-label={`Añadir evento el ${format(day, "d 'de' MMMM", { locale: es })}`}
                className="absolute inset-0 h-full w-full"
              />

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
  )
}
