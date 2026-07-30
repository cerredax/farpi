'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TASK_PRIORITIES, TASK_RECURRENCES } from '@/lib/constants'
import { useConfirmAction } from '@/hooks/useConfirmAction'
import type { Task, TaskDraft } from '@/types'

type Mode = 'create' | 'edit'

interface TaskSheetProps {
  open: boolean
  mode: Mode
  initial?: Task | null
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
    }
  }
  return { title: '', notes: '', priority: 'medium', due_date: '', recurrence: 'none', recurrence_end: '' }
}

export function TaskSheet({ open, mode, initial, onClose, onCreate, onUpdate, onDelete }: TaskSheetProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => initDraft(mode, initial))
  const { confirming: confirmDelete, requestConfirm } = useConfirmAction()
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => titleRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    if (mode === 'create') onCreate(draft)
    else if (initial) onUpdate(initial.id, draft)
    onClose()
  }

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => { onDelete(initial.id); onClose() })
  }

  const hasRecurrence = draft.recurrence !== 'none'

  const footer = (
    <div className="px-5 pb-8 pt-3 space-y-2">
      <Button type="submit" form="task-form" fullWidth size="lg" disabled={!draft.title.trim()}>
        {mode === 'create' ? 'Crear tarea' : 'Guardar cambios'}
      </Button>
      {mode === 'edit' && (
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-danger text-white' : 'text-danger hover:bg-danger-soft'}`}
        >
          <span className="flex items-center justify-center gap-2">
            <Trash2 size={15} />
            {confirmDelete ? 'Confirmar eliminación' : 'Eliminar tarea'}
          </span>
        </button>
      )}
    </div>
  )

  return (
    <BottomSheet
      open={open}
      title={mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
      onClose={onClose}
      footer={footer}
    >
      <form id="task-form" onSubmit={handleSubmit} className="px-5 pt-1 pb-4 space-y-5">

        {/* Título */}
        <div className="space-y-1.5">
          <label htmlFor="task-title" className="text-xs font-bold text-muted uppercase tracking-widest">Tarea</label>
          <input
            id="task-title"
            ref={titleRef}
            type="text"
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="¿Qué hay que hacer?"
            required
            className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label htmlFor="task-notes" className="text-xs font-bold text-muted uppercase tracking-widest">Notas</label>
          <textarea
            id="task-notes"
            value={draft.notes}
            onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
            placeholder="Detalles opcionales…"
            rows={2}
            className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
          />
        </div>

        {/* Prioridad */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase tracking-widest">Prioridad</label>
          <div className="flex gap-3">
            {TASK_PRIORITIES.map(opt => {
              const selected = draft.priority === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, priority: opt.value }))}
                  className="flex flex-col items-center gap-1.5 flex-1 py-2 rounded-2xl transition-colors"
                  style={{ backgroundColor: selected ? opt.color + '22' : 'transparent' }}
                >
                  <span
                    className="w-7 h-7 rounded-full transition-all"
                    style={{
                      backgroundColor: opt.color,
                      boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${opt.color}` : 'none',
                      transform: selected ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                  <span className="text-[11px] font-bold transition-colors" style={{ color: selected ? opt.color : '#77716A' }}>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Repetición */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase tracking-widest">Repetición</label>
          <div className="grid grid-cols-4 gap-1.5">
            {TASK_RECURRENCES.map(opt => {
              const selected = draft.recurrence === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraft(d => ({ ...d, recurrence: opt.value, recurrence_end: '' }))}
                  className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                    selected
                      ? 'bg-primary text-white'
                      : 'bg-canvas text-muted border border-line'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fecha de inicio / vencimiento */}
        <div className="space-y-1.5">
          <label htmlFor="task-due" className="text-xs font-bold text-muted uppercase tracking-widest">
            {hasRecurrence ? 'Empieza el' : 'Vencimiento'}
          </label>
          <input
            id="task-due"
            type="date"
            value={draft.due_date}
            onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))}
            className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary transition"
          />
        </div>

        {/* Fecha fin (solo si hay recurrencia) */}
        {hasRecurrence && (
          <div className="space-y-1.5">
            <label htmlFor="task-rec-end" className="text-xs font-bold text-muted uppercase tracking-widest">
              Termina el <span className="font-normal normal-case">(opcional)</span>
            </label>
            <input
              id="task-rec-end"
              type="date"
              value={draft.recurrence_end}
              min={draft.due_date || undefined}
              onChange={e => setDraft(d => ({ ...d, recurrence_end: e.target.value }))}
              className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>
        )}

      </form>
    </BottomSheet>
  )
}
