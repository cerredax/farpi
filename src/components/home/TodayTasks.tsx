import { memo } from 'react'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { getLocalDateString } from '@/lib/date-utils'
import type { Task } from '@/types'

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

  return (
    <div className="rounded-3xl bg-white/80 border border-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-hairline">
        {tasks.map(task => {
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
              {vencida && (
                <span className="flex-shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                  Atrasada
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
})
