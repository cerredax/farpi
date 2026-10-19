import { parseISO, isBefore, isToday, startOfDay, format } from 'date-fns'
import type { Locale } from 'date-fns'
import { Repeat2 } from 'lucide-react'
import type { Child, FamilyMember, Task, TaskPriority } from '@/types'
import { MS_CONFIRMAR_BORRADO } from '@/lib/constants'
import { fondoDePersona, resolveAssignee } from '@/lib/assignees'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { DeleteButton } from '@/components/ui/DeleteButton'

interface TaskItemProps {
  task: Task
  kids: Child[]
  members: FamilyMember[]
  onToggle: () => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  high:   'border-l-danger',
  medium: 'border-l-sand',
  low:    'border-l-primary',
}

function formatDue(
  dateStr: string,
  textos: { hoy: string; formatoVencimiento: string },
  locale: Locale,
): { label: string; overdue: boolean; today: boolean } {
  const d = parseISO(dateStr)
  const today = startOfDay(new Date())
  if (isToday(d)) return { label: textos.hoy, overdue: false, today: true }
  return { label: format(d, textos.formatoVencimiento, { locale }), overdue: isBefore(d, today), today: false }
}

/**
 * Una tarea en la lista.
 *
 * **Borrar pide confirmación**, igual que en las filas de las listas y en los
 * sheets: la papelera vive en el borde derecho de la tarjeta, que es donde
 * aterriza el pulgar al pasar la pantalla, y borrar era un toque sin vuelta
 * atrás —el `undo` del store solo cubre marcar—. Se desarma sola pasados
 * `MS_CONFIRMAR_BORRADO`.
 */
export function TaskItem({ task, kids, members, onToggle, onEdit, onDelete }: TaskItemProps) {
  const t = useT()
  const idioma = useIdioma()
  const due = task.due_date ? formatDue(task.due_date, t.tareas.tarjeta, localeDeFechas(idioma)) : null
  const asignado = resolveAssignee(task, members, kids)
  // Quién la marcó. Solo una tarea que se completa del todo lo guarda: una que se
  // repite no se completa, le empuja la fecha, y ahí no queda a nombre de nadie.
  const hechaPor = task.completed && task.completed_by
    ? members.find(m => m.user_id === task.completed_by)?.display_name ?? null
    : null
  const { confirming, requestConfirm } = useConfirmAction(MS_CONFIRMAR_BORRADO)

  return (
    <div
      className={`bg-white rounded-2xl border border-surface shadow-sm flex overflow-hidden border-l-4 ${PRIORITY_BORDER[task.priority]}`}
    >
      <CircleCheck
        checked={task.completed}
        onClick={onToggle}
        ariaLabel={task.completed ? t.tareas.tarjeta.marcarPendiente : t.tareas.tarjeta.marcarCompletada}
      />

      {/* Content — tap to edit */}
      <button
        onClick={() => onEdit(task)}
        className="flex-1 min-w-0 py-3 text-left"
      >
        <p
          className={`text-sm font-semibold leading-snug transition-colors ${
            task.completed ? 'line-through text-muted' : 'text-ink'
          }`}
        >
          {task.title}
        </p>

        {(task.notes || due || asignado || hechaPor || task.recurrence !== 'none') && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* De quién es, en su color y con nombre. Sin nombre no se sabría de
                quién es el color hasta habérselo aprendido, y "es de todos" no
                se dice con una etiqueta: se dice no poniendo ninguna.

                El color va de **fondo** y el nombre en tinta (`etiqueta-persona`,
                la misma del calendario), no el nombre pintado del color de la
                persona. Los seis colores de hijo de `PERSON_COLORS` están en
                L* 71-88 —pensados para llevar tinta encima— así que como color
                de texto sobre blanco daban hasta 1,5:1: "Cris" en rosa chicle
                era literalmente ilegible. */}
            {asignado && (
              <span
                className="etiqueta-persona max-w-[7rem] px-1.5 py-0.5 text-[10px]"
                style={{ backgroundColor: fondoDePersona(asignado.color) }}
              >
                {asignado.name}
              </span>
            )}
            {task.notes && (
              <p className="text-xs text-muted truncate max-w-[160px]">{task.notes}</p>
            )}
            {hechaPor && (
              <span className="text-[10px] font-bold text-muted">{t.tareas.tarjeta.hechaPor(hechaPor)}</span>
            )}
            {due && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  due.overdue
                    ? 'bg-danger-soft text-danger-strong'
                    : due.today
                    ? 'bg-danger-soft text-accent-strong'
                    : 'bg-surface text-muted'
                }`}
              >
                {due.label}
              </span>
            )}
            {task.recurrence !== 'none' && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary-strong">
                <Repeat2 size={11} strokeWidth={2.5} />
                {t.comun.recurrencias[task.recurrence]}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Borrar, en su propia columna. Al confirmar, la píldora crece y el
          título se encoge con su `min-w-0`. */}
      <div className="flex flex-shrink-0 items-center pr-1">
        <DeleteButton
          variant="inline"
          confirming={confirming}
          onClick={() => requestConfirm(() => onDelete(task.id))}
          idleLabel={t.tareas.tarjeta.eliminar}
          confirmLabel={t.tareas.tarjeta.borrar}
          ariaLabel={t.tareas.tarjeta.eliminarLaTarea(task.title)}
          confirmAriaLabel={t.tareas.tarjeta.confirmarEliminar(task.title)}
        />
      </div>
    </div>
  )
}
