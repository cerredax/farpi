import { memo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { SectionLink } from '@/components/ui/SectionLink'
import { getLocalDateString, parseLocalDate } from '@/lib/date-utils'
import type { Task } from '@/types'

/**
 * Cuántas tareas de hoy caben en la tarjeta del día.
 *
 * La tarjeta no es la lista de tareas: comparte sitio con el saludo, los
 * cumpleaños, los planes y el menú, y es lo primero que se ve al abrir la app.
 * Sin tope, seis tareas atrasadas —que no es un caso raro, es lo que pasa en
 * cuanto una semana se tuerce— empujaban la compra y los planes fuera de la
 * primera pantalla, y lo urgente tapaba a lo de hoy. Es el mismo tope que ya
 * tenían "Lo demás por hacer" y "Próximos días", que es de donde viene la
 * medida.
 *
 * Cuatro y no cinco porque aquí el bloque es un invitado, no la sección.
 */
const MAX_VISIBLES = 4

interface TodayTasksProps {
  tasks: Task[]
  onToggle: (id: string) => void
}

/**
 * Las tareas que reclaman hoy, dentro de la tarjeta del día. Van con los planes
 * porque responden a la misma pregunta —"¿qué tengo hoy?"—: separarlas obligaba
 * a mirar dos bloques para saberlo, y la lista de abajo mezclaba lo de hoy con
 * lo de dentro de tres semanas.
 */
export const TodayTasks = memo(function TodayTasks({ tasks, onToggle }: TodayTasksProps) {
  if (tasks.length === 0) return null

  const hoy = getLocalDateString()
  // `selectTodayTasks` respeta el orden de `selectTasks`: primero lo atrasado,
  // después por fecha y por prioridad. Así que cortar por arriba deja fuera lo
  // menos urgente, no lo primero que llegó.
  const visibles = tasks.slice(0, MAX_VISIBLES)
  const restantes = tasks.length - visibles.length

  return (
    <div className="rounded-3xl bg-white/80 border border-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-hairline">
        {visibles.map(task => {
          const vencida = !!task.due_date && task.due_date < hoy
          return (
            <li key={task.id} className="flex items-center gap-3 px-4 py-3">
              <CircleCheck
                checked={false}
                onClick={() => onToggle(task.id)}
                ariaLabel={`Marcar "${task.title}" como completada`}
                size="sm"
                className="w-10"
              />
              <p className="flex-1 min-w-0 text-sm font-semibold text-ink leading-snug">{task.title}</p>
              {vencida && task.due_date && (
                <span className="flex-shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                  Atrasada · {format(parseLocalDate(task.due_date), 'd MMM', { locale: es })}
                </span>
              )}
            </li>
          )
        })}
        {restantes > 0 && (
          <li className="px-4 py-2">
            <SectionLink href="/tasks">
              {restantes === 1 ? 'Y una más' : `Y ${restantes} más`}
            </SectionLink>
          </li>
        )}
      </ul>
    </div>
  )
})
