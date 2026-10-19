'use client'

import { format, parseISO } from 'date-fns'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'
import type { Task } from '@/types'

interface OffDayConfirmDialogProps {
  open: boolean
  task: Task | null
  onConfirm: () => void
  onCancel: () => void
}

/** Pide confirmación al marcar una tarea cuyo vencimiento no es hoy. */
export function OffDayConfirmDialog({ open, task, onConfirm, onCancel }: OffDayConfirmDialogProps) {
  const tt = useT()
  const t = tt.tareas.fueraDeDia
  const idioma = useIdioma()
  const dueLabel = task?.due_date ? format(parseISO(task.due_date), t.formatoFecha, { locale: localeDeFechas(idioma) }) : ''
  const isRecurring = task ? task.recurrence !== 'none' : false
  const recLabel = isRecurring && task ? tt.comun.recurrencias[task.recurrence] : ''

  return (
    <BottomSheet
      open={open}
      title={t.titulo}
      onClose={onCancel}
      footer={
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-primary-strong text-white text-sm font-semibold hover:bg-primary-deep transition-colors"
          >
            {t.siMarcar}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-muted hover:bg-surface transition-colors"
          >
            {t.cancelar}
          </button>
        </div>
      }
    >
      <div className="px-5 pb-4">
        {isRecurring ? (
          <p className="text-sm text-muted mb-1">
            {t.repiteAntes}<strong>{recLabel.toLowerCase()}</strong>{t.repiteEnMedio}<strong>{dueLabel}</strong>{t.repiteDespues}
          </p>
        ) : (
          <p className="text-sm text-muted mb-1">
            {t.esParaAntes}<strong>{dueLabel}</strong>{t.esParaDespues}
          </p>
        )}
        <p className="text-sm text-muted">{t.pregunta}</p>
      </div>
    </BottomSheet>
  )
}
