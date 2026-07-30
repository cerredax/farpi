import { parseISO, isBefore, isToday, startOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Repeat2, Trash2 } from 'lucide-react'
import type { Task, TaskPriority } from '@/types'
import { TASK_RECURRENCES } from '@/lib/constants'
import { CircleCheck } from '@/components/ui/CircleCheck'

interface TaskItemProps {
  task: Task
  onToggle: () => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  high:   'border-l-danger',
  medium: 'border-l-[#E9C46A]',
  low:    'border-l-primary',
}

function formatDue(dateStr: string): { label: string; overdue: boolean } {
  const d = parseISO(dateStr)
  const today = startOfDay(new Date())
  if (isToday(d)) return { label: 'Hoy', overdue: false }
  if (isBefore(d, today)) return { label: format(d, 'd MMM', { locale: es }), overdue: true }
  return { label: format(d, 'd MMM', { locale: es }), overdue: false }
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const due = task.due_date ? formatDue(task.due_date) : null

  return (
    <div
      className={`bg-white rounded-2xl border border-surface shadow-sm flex overflow-hidden border-l-4 ${PRIORITY_BORDER[task.priority]}`}
    >
      <CircleCheck
        checked={task.completed}
        onClick={onToggle}
        ariaLabel={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
      />

      {/* Content — tap to edit */}
      <button
        onClick={() => onEdit(task)}
        className="flex-1 min-w-0 py-3 text-left"
      >
        <p
          className={`text-sm font-semibold leading-snug transition-colors ${
            task.completed ? 'line-through text-faint' : 'text-ink'
          }`}
        >
          {task.title}
        </p>

        {(task.notes || due || task.recurrence !== 'none') && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.notes && (
              <p className="text-xs text-muted truncate max-w-[160px]">{task.notes}</p>
            )}
            {due && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  due.overdue
                    ? 'bg-danger-soft text-danger'
                    : due.label === 'Hoy'
                    ? 'bg-[#FDEEE8] text-accent'
                    : 'bg-surface text-muted'
                }`}
              >
                {due.label}
              </span>
            )}
            {task.recurrence !== 'none' && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary">
                <Repeat2 size={11} strokeWidth={2.5} />
                {TASK_RECURRENCES.find(r => r.value === task.recurrence)?.shortLabel}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(task.id)}
        aria-label="Eliminar tarea"
        className="flex-shrink-0 flex items-center justify-center w-10 text-faint hover:text-danger hover:bg-danger-soft transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
