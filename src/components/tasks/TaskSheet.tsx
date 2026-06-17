'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[92dvh] flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#E0DDD8]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h3 className="font-extrabold text-[#252525] text-base">
            {mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-5 pt-1 pb-4 space-y-5">

            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Tarea</label>
              <input
                ref={titleRef}
                type="text"
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                placeholder="¿Qué hay que hacer?"
                required
                className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Notas</label>
              <textarea
                value={draft.notes}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder="Detalles opcionales…"
                rows={2}
                className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition resize-none"
              />
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Prioridad</label>
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
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Repetición</label>
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
                          ? 'bg-[#8BA888] text-white'
                          : 'bg-[#FAF7F2] text-[#77716A] border border-[#EDE9E3]'
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
              <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">
                {hasRecurrence ? 'Empieza el' : 'Vencimiento'}
              </label>
              <input
                type="date"
                value={draft.due_date}
                onChange={e => setDraft(d => ({ ...d, due_date: e.target.value }))}
                className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
              />
            </div>

            {/* Fecha fin (solo si hay recurrencia) */}
            {hasRecurrence && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">
                  Termina el <span className="font-normal normal-case">(opcional)</span>
                </label>
                <input
                  type="date"
                  value={draft.recurrence_end}
                  min={draft.due_date || undefined}
                  onChange={e => setDraft(d => ({ ...d, recurrence_end: e.target.value }))}
                  className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
                />
              </div>
            )}

          </div>

          {/* Footer fijo */}
          <div className="flex-shrink-0 px-5 pb-8 pt-3 border-t border-[#F5F2EE] space-y-2">
            <Button type="submit" fullWidth size="lg" disabled={!draft.title.trim()}>
              {mode === 'create' ? 'Crear tarea' : 'Guardar cambios'}
            </Button>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${confirmDelete ? 'bg-[#D96C6C] text-white' : 'text-[#D96C6C] hover:bg-[#FDE8E8]'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Trash2 size={15} />
                  {confirmDelete ? 'Confirmar eliminación' : 'Eliminar tarea'}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
