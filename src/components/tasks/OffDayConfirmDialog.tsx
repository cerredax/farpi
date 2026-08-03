'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TASK_RECURRENCES } from '@/lib/constants'
import type { Task } from '@/types'

interface OffDayConfirmDialogProps {
  open: boolean
  task: Task | null
  onConfirm: () => void
  onCancel: () => void
}

/** Pide confirmación al marcar una tarea cuyo vencimiento no es hoy. */
export function OffDayConfirmDialog({ open, task, onConfirm, onCancel }: OffDayConfirmDialogProps) {
  const dueLabel = task?.due_date ? format(parseISO(task.due_date), "d 'de' MMMM", { locale: es }) : ''
  const isRecurring = task ? task.recurrence !== 'none' : false
  const recLabel = isRecurring && task ? TASK_RECURRENCES.find(r => r.value === task.recurrence)?.label ?? '' : ''

  return (
    <BottomSheet
      open={open}
      title="Confirmar tarea"
      onClose={onCancel}
      footer={
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Sí, marcar como hecha
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-muted hover:bg-surface transition-colors"
          >
            Cancelar
          </button>
        </div>
      }
    >
      <div className="px-5 pb-4">
        {isRecurring ? (
          <p className="text-sm text-muted mb-1">
            Esta tarea es <strong>{recLabel.toLowerCase()}</strong> y toca el <strong>{dueLabel}</strong>.
          </p>
        ) : (
          <p className="text-sm text-muted mb-1">
            Esta tarea es para el <strong>{dueLabel}</strong>, no para hoy.
          </p>
        )}
        <p className="text-sm text-muted">¿Marcarla como hecha hoy igualmente?</p>
      </div>
    </BottomSheet>
  )
}
