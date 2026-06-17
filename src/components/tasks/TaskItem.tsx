import { parseISO, isBefore, isToday, startOfDay, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Repeat2, Trash2 } from 'lucide-react'
import type { Task, TaskPriority } from '@/types'
import { TASK_RECURRENCES } from '@/lib/constants'

interface TaskItemProps {
  task: Task
  onToggle: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  high:   'border-l-[#D96C6C]',
  medium: 'border-l-[#E9C46A]',
  low:    'border-l-[#8BA888]',
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
      className={`bg-white rounded-2xl border border-[#F0EDE8] shadow-sm flex overflow-hidden border-l-4 ${PRIORITY_BORDER[task.priority]}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
        className="flex-shrink-0 flex items-center justify-center w-12 group"
      >
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            task.completed
              ? 'bg-[#8BA888] border-[#8BA888]'
              : 'border-[#C4BFB9] group-hover:border-[#8BA888]'
          }`}
        >
          {task.completed && <Check size={11} strokeWidth={3} className="text-white" />}
        </span>
      </button>

      {/* Content — tap to edit */}
      <button
        onClick={() => onEdit(task)}
        className="flex-1 min-w-0 py-3 text-left"
      >
        <p
          className={`text-sm font-semibold leading-snug transition-colors ${
            task.completed ? 'line-through text-[#C4BFB9]' : 'text-[#252525]'
          }`}
        >
          {task.title}
        </p>

        {(task.notes || due || task.recurrence !== 'none') && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.notes && (
              <p className="text-xs text-[#77716A] truncate max-w-[160px]">{task.notes}</p>
            )}
            {due && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  due.overdue
                    ? 'bg-[#FDE8E8] text-[#D96C6C]'
                    : due.label === 'Hoy'
                    ? 'bg-[#FDEEE8] text-[#D8A48F]'
                    : 'bg-[#F0EDE8] text-[#77716A]'
                }`}
              >
                {due.label}
              </span>
            )}
            {task.recurrence !== 'none' && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#8BA888]">
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
        className="flex-shrink-0 flex items-center justify-center w-10 text-[#C4BFB9] hover:text-[#D96C6C] hover:bg-[#FDE8E8] transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
