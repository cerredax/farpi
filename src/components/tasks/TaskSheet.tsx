'use client'

import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { DotOption } from '@/components/ui/DotOption'
import { Field } from '@/components/ui/Field'
import { SheetFooter } from '@/components/ui/SheetFooter'
import { TASK_PRIORITIES, TASK_RECURRENCES } from '@/lib/constants'
import { useSheetDelete, useSheetForm } from '@/hooks/useSheetForm'
import { validateTaskDraft } from '@/lib/validators'
import type { Child, FamilyMember, Task, TaskDraft } from '@/types'

type Mode = 'create' | 'edit'

interface TaskSheetProps {
  open: boolean
  mode: Mode
  initial?: Task | null
  kids: Child[]
  members: FamilyMember[]
  onClose: () => void
  onCreate: (draft: TaskDraft) => void
  onUpdate: (id: string, draft: TaskDraft) => void
  onDelete: (id: string) => void
}

function initDraft(mode: Mode, initial: Task | null | undefined): TaskDraft {
  if (mode === 'edit' && initial) {
    return {
      title: initial.title,
      notes: initial.notes ?? '',
      priority: initial.priority,
      due_date: initial.due_date ?? '',
      recurrence: initial.recurrence,
      recurrence_end: initial.recurrence_end ?? '',
      child_id: initial.child_id,
      member_id: initial.member_id,
    }
  }
  // Sin dueño por defecto: una tarea nueva es de la casa hasta que alguien la
  // coja. Poner de oficio a quien la escribe convierte apuntar en cargar.
  return {
    title: '', notes: '', priority: 'medium', due_date: '',
    recurrence: 'none', recurrence_end: '', child_id: null, member_id: null,
  }
}

export function TaskSheet({ open, mode, initial, kids, members, onClose, onCreate, onUpdate, onDelete }: TaskSheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<TaskDraft>({
    open,
    initialDraft: () => initDraft(mode, initial),
    validate: validateTaskDraft,
  })
  const { confirming, handleDelete } = useSheetDelete({ initial, onDelete, onClose })

  const handleSubmit = submitHandler(valid => {
    if (mode === 'create') onCreate(valid)
    else if (initial) onUpdate(initial.id, valid)
    onClose()
  })

  const hasRecurrence = draft.recurrence !== 'none'

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
      onClose={onClose}
      footer={
        <SheetFooter
          form="task-form"
          submitLabel={mode === 'create' ? 'Crear tarea' : 'Guardar cambios'}
          disabled={!draft.title.trim()}
          error={formError}
          onDelete={mode === 'edit'
            ? { confirming, onClick: handleDelete, idleLabel: 'Eliminar tarea', confirmLabel: 'Confirmar eliminación' }
            : undefined}
        />
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-4 space-y-5">

        <Field label="Tarea" htmlFor="task-title">
          <input
            id="task-title"
            ref={firstFieldRef}
            type="text"
            value={draft.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder="¿Qué hay que hacer?"
            required
            className="field-input"
          />
        </Field>

        <Field label="Notas" htmlFor="task-notes">
          <textarea
            id="task-notes"
            value={draft.notes}
            onChange={e => patch({ notes: e.target.value })}
            placeholder="Detalles opcionales…"
            rows={2}
            className="field-input resize-none"
          />
        </Field>

        {/* La pregunta de una tarea compartida es "¿quién la hace?". Iba antes
            que la prioridad porque se contesta más veces: casi todo es prioridad
            media, pero casi nada es de los dos a la vez. */}
        <AssigneePicker value={draft} onChange={patch} members={members} kids={kids} />

        <Field label="Prioridad" spacing="group">
          <div className="flex gap-3">
            {TASK_PRIORITIES.map(opt => (
              <DotOption
                key={opt.value}
                selected={draft.priority === opt.value}
                onClick={() => patch({ priority: opt.value })}
                color={opt.color}
                label={opt.label}
              />
            ))}
          </div>
        </Field>

        <Field label="Repetición" spacing="group">
          <div className="grid grid-cols-4 gap-1.5">
            {TASK_RECURRENCES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => patch({ recurrence: opt.value, recurrence_end: '' })}
                className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                  draft.recurrence === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-canvas text-muted border border-line'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label={hasRecurrence ? 'Empieza el' : 'Vencimiento'} htmlFor="task-due">
          <input
            id="task-due"
            type="date"
            value={draft.due_date}
            onChange={e => patch({ due_date: e.target.value })}
            className="field-input"
          />
        </Field>

        {hasRecurrence && (
          <Field label="Termina el" htmlFor="task-rec-end" hint="(opcional)">
            <input
              id="task-rec-end"
              type="date"
              value={draft.recurrence_end}
              min={draft.due_date || undefined}
              onChange={e => patch({ recurrence_end: e.target.value })}
              className="field-input"
            />
          </Field>
        )}

      </form>
    </BottomSheet>
  )
}
