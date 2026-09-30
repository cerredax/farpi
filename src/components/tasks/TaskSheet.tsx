'use client'

import { useState } from 'react'
import { AssigneePicker } from '@/components/ui/AssigneePicker'
import { BottomSheet } from '@/components/ui/BottomSheet'
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
  /** `false` si no se pudo guardar: el sheet se queda abierto con lo escrito. */
  onCreate: (draft: TaskDraft) => void | Promise<boolean | void>
  onUpdate: (id: string, draft: TaskDraft) => void | Promise<boolean | void>
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

  const [guardando, setGuardando] = useState(false)

  /**
   * Se cierra **cuando ya se ha guardado**, no antes. Se cerraba al pulsar, y con
   * la red caída lo escrito se perdía: el aviso salía en `SaveStatus` con el
   * sheet ya cerrado y la tarea había que volver a teclearla. Si falla, se queda
   * abierto con el texto. Mismo patrón que `DocSheet`.
   */
  const handleSubmit = submitHandler(async valid => {
    // Un Enter en un campo envía el formulario aunque el botón esté apagado:
    // sin esta guarda, una tarea lenta de guardar se crearía dos veces.
    if (guardando) return
    setGuardando(true)
    try {
      const guardada = mode === 'create'
        ? await onCreate(valid)
        : initial ? await onUpdate(initial.id, valid) : undefined
      if (guardada === false) return
      onClose()
    } finally {
      setGuardando(false)
    }
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
          submitLabel={guardando ? 'Guardando…' : mode === 'create' ? 'Crear tarea' : 'Guardar cambios'}
          disabled={guardando}
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

        {/* Cuándo es lo segundo que se contesta de una tarea, así que va lo
            segundo. Estaba al fondo, detrás de las dos rejillas de chips, con
            las notas —que casi nunca se escriben— ocupando este sitio.

            Solo el campo de fecha. Tuvo delante dos chips, «Hoy» y «Mañana», y se
            van el 14-09-2026: el selector de fecha del móvil ya abre por hoy, así
            que ahorraban un toque para añadir dos controles fijos y un estado
            —pulsado, sin pulsar, y qué pasa si la fecha del campo es justo esa—
            a la pregunta más sencilla del formulario. */}
        <Field label={hasRecurrence ? 'Empieza el' : 'Vencimiento'} htmlFor="task-due" spacing="group">
          <input
            id="task-due"
            type="date"
            value={draft.due_date}
            onChange={e => patch({ due_date: e.target.value })}
            className="field-input"
          />
        </Field>

        {/* La pregunta de una tarea compartida es "¿quién la hace?". Iba antes
            que la prioridad porque se contesta más veces: casi todo es prioridad
            media, pero casi nada es de los dos a la vez. */}
        <AssigneePicker value={draft} onChange={patch} members={members} kids={kids} />

        {/* Chips de texto, no círculos de color. La prioridad es un grado, no
            una identidad: el color en Farpi dice "de quién es" y ya lo gasta la
            fila de arriba. Con círculos eran dos filas idénticas seguidas y el
            punto de "Media" era el amarillo exacto de "toda la familia". Mismo
            control que Repetición, que está justo debajo. */}
        <Field label="Prioridad" spacing="group">
          <div className="grid grid-cols-3 gap-1.5">
            {TASK_PRIORITIES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => patch({ priority: opt.value })}
                className={`flex min-h-11 items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                  draft.priority === opt.value
                    ? 'bg-primary-strong text-white'
                    : 'bg-canvas text-muted border border-line'
                }`}
              >
                {opt.label}
              </button>
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
                className={`flex min-h-11 items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                  draft.recurrence === opt.value
                    ? 'bg-primary-strong text-white'
                    : 'bg-canvas text-muted border border-line'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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

        {/* Las notas cierran el sheet: son el campo que menos se rellena, y
            ocupaban el segundo sitio, que es de la fecha. */}
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

      </form>
    </BottomSheet>
  )
}
