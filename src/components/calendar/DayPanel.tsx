'use client'

import { format, isToday } from 'date-fns'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'
import { Cake } from 'lucide-react'
import { eventColor, fondoDePersona, fondoDePersonaApagado, resolveAssignee } from '@/lib/assignees'
import { eventCoversDay, eventoYaPasado, holidayName, isAbsence, isBirthday, isHoliday, isPlan, isVacation } from '@/lib/events'
import { getLocalDateString } from '@/lib/date-utils'
import { capitalize } from '@/lib/text'
import { EventRow } from './AgendaList'
import { DayTasks } from './DayTasks'
import type { Child, Event, FamilyMember, Task } from '@/types'

/**
 * Qué pasa el día que acabas de tocar en la rejilla del mes.
 *
 * De dónde sale (28-08-2026): elegir un día en el móvil no hacía nada. La idea
 * era que la agenda de abajo se deslizara hasta él, pero la lista **arranca
 * siempre en hoy** y solo pinta días con algo, así que un día pasado no tenía
 * fila a la que ir y uno futuro vacío tampoco. Se comprobó tocando el 18 de
 * agosto mirando el 28: el número se ponía verde y ahí se acababa todo. Encima,
 * cuando sí había fila, el salto ocurría por debajo del pliegue, donde no se ve.
 *
 * Así que el detalle viene **al día**, pegado a la rejilla, en vez de mandar la
 * pantalla a buscarlo. Es lo que la celda del mes ya prometía por escrito
 * ("tocar el día enseña su detalle debajo") y no cumplía.
 *
 * **También en escritorio** (28-08-2026). Nació con `lg:hidden` dando por hecho
 * que allí no hacía falta —la celda escribe títulos y la agenda está en la
 * columna de al lado—, y es falso por la misma razón que en móvil: la agenda
 * arranca en hoy y solo pinta días con algo, así que elegir el 18 mirando el 28
 * pintaba el número de verde y no pasaba nada más. Ni la celda ayuda cuando el
 * día está vacío, que es justo cuando hace falta que la app conteste algo.
 *
 * Lo que sí es solo de escritorio es el salto de la agenda hasta el día (ver
 * `focusDay` en `CalendarView`): allí la lista está al lado y a la vista.
 *
 * Tampoco sale **con hoy elegido**, que es como abre la pantalla: la agenda de
 * debajo empieza justo ahí y sería decir lo mismo dos veces seguidas.
 *
 * Lo que enseña, y en este orden, que es el que ya tienen la celda del mes y la
 * franja de "todo el día" del eje: primero **cómo es el día** —festivo, quién
 * falta, de quién es el cumpleaños—, y después **qué hay que hacer** —los planes
 * con su hora y las tareas que vencen—. Un festivo cambia el día entero; una
 * cita de las seis, solo las seis.
 */
interface DayPanelProps {
  day: Date
  /** Todo el calendario menos los cumpleaños; el panel se queda con su día. */
  events: Event[]
  /** Los cumpleaños, aparte, igual que en el eje de horas. */
  cumples: Event[]
  tasks: Task[]
  kids: Child[]
  members: FamilyMember[]
  onEdit: (event: Event) => void
  onToggleTask: (id: string) => void
}

export function DayPanel({ day, events, cumples, tasks, kids, members, onEdit, onToggleTask }: DayPanelProps) {
  const tt = useT()
  const c = tt.calendario
  const locale = localeDeFechas(useIdioma())
  const diaStr = getLocalDateString(day)
  const hoyStr = getLocalDateString(new Date())

  const delDia = events.filter(e => eventCoversDay(e, diaStr))
  const festivos = delDia.filter(isHoliday)
  const ausencias = delDia.filter(isAbsence)
  const cumplesDelDia = cumples.filter(e => isBirthday(e) && eventCoversDay(e, diaStr))
  // Los planes, ordenados por hora. Los de todo el día primero, como en la lista.
  const planes = delDia.filter(isPlan).sort((a, b) => {
    if (a.all_day !== b.all_day) return a.all_day ? -1 : 1
    return a.start_at.localeCompare(b.start_at)
  })
  // Lo atrasado se arrastra a hoy, igual que en la lista y en el eje de horas.
  const tareasDelDia = tasks.filter(t => t.due_date && (t.due_date < hoyStr ? diaStr === hoyStr : t.due_date === diaStr))

  const vacio = festivos.length === 0 && ausencias.length === 0 && cumplesDelDia.length === 0
    && planes.length === 0 && tareasDelDia.length === 0

  const etiqueta = 'etiqueta-persona px-1.5 py-0.5 text-[11px]'

  return (
    <section aria-label={c.panelDelDia.queHay(format(day, c.formatos.diaYMes, { locale }))} className="border-t border-hairline px-3 py-3">
      <h3 className={`mb-2 px-1 text-xs font-bold uppercase tracking-widest ${isToday(day) ? 'text-hoy-strong' : 'text-muted'}`}>
        {capitalize(format(day, c.formatos.dia, { locale }))}
      </h3>

      {(festivos.length > 0 || ausencias.length > 0 || cumplesDelDia.length > 0) && (
        <div className="mb-1.5 flex flex-wrap gap-1 px-1">
          {/* El festivo sin color de nadie: no dice quién falta, dice que ese día
              no hay trabajo ni colegio. Igual que en el eje de horas. */}
          {festivos.map(event => (
            <span key={event.id} className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted">
              {holidayName(event) ?? c.festivo}
            </span>
          ))}
          {ausencias.map(event => {
            const quien = resolveAssignee(event, members, kids)?.name ?? tt.comun.familia
            return (
              <span
                key={event.id}
                className={etiqueta}
                style={{ backgroundColor: fondoDePersona(eventColor(event, members, kids)) }}
              >
                {isVacation(event) ? c.ausencia.vacaciones(quien) : c.ausencia.descanso(quien)}
              </span>
            )
          })}
          {cumplesDelDia.map(event => (
            <span
              key={event.id}
              className={`${etiqueta} inline-flex items-center gap-1`}
              data-pasado={eventoYaPasado(event, new Date()) ? 'true' : undefined}
              style={{ backgroundColor: (eventoYaPasado(event, new Date()) ? fondoDePersonaApagado : fondoDePersona)(eventColor(event, members, kids)) }}
            >
              <Cake size={11} strokeWidth={2.2} className="flex-shrink-0" aria-hidden />
              {event.title}
            </span>
          ))}
        </div>
      )}

      {planes.map(event => (
        <EventRow key={event.id} event={event} kids={kids} members={members} onEdit={onEdit} />
      ))}

      <DayTasks tasks={tareasDelDia} kids={kids} members={members} hoy={hoyStr} onToggle={onToggleTask} />

      {/* Un día vacío también es una respuesta, y hasta ahora no la daba: elegir
          un día sin nada se leía igual que un fallo.

          **Aquí no hay botón de apuntar** (26-10-2026). Hubo uno, con el día en su
          etiqueta, y repetía el `+` de la cabecera, que ya apunta en el día
          elegido. Para apuntar a una hora concreta quedan los huecos del eje. */}
      {vacio && <p className="px-1 py-1 text-sm text-muted">{c.panelDelDia.nadaApuntado}</p>}
    </section>
  )
}
