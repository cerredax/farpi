'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { isToday, parseISO } from 'date-fns'
import { useStore } from '@/lib/store-context'
import { selectTaskGroups } from '@/lib/selectors'
import { OffDayConfirmDialog } from './OffDayConfirmDialog'
import { TaskItem } from './TaskItem'
import { TaskSheet } from './TaskSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Task, TaskDraft } from '@/types'

export function TasksView() {
  const { tasks, createTask, updateTask, deleteTask, toggleTask } = useStore()

  const [sheetOpen, setSheetOpen]             = useState(false)
  const [editingTask, setEditingTask]         = useState<Task | null>(null)
  const [showCompleted, setShowCompleted]     = useState(false)
  const [confirmTask, setConfirmTask]         = useState<Task | null>(null)

  const { pending, completed } = selectTaskGroups(tasks)

  function openCreate() { setEditingTask(null); setSheetOpen(true) }
  function openEdit(task: Task) { setEditingTask(task); setSheetOpen(true) }

  function handleToggle(task: Task) {
    const needsConfirm = !task.completed && task.due_date && !isToday(parseISO(task.due_date))
    if (needsConfirm) { setConfirmTask(task); return }
    toggleTask(task.id)
  }

  const sheetKey = editingTask ? `edit-${editingTask.id}` : 'create'

  return (
    <>
      <OffDayConfirmDialog
        open={!!confirmTask}
        task={confirmTask}
        onConfirm={() => { if (confirmTask) toggleTask(confirmTask.id); setConfirmTask(null) }}
        onCancel={() => setConfirmTask(null)}
      />
      <div className="max-w-lg mx-auto px-4 py-4 pb-28">
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Pendientes</h2>
            {pending.length > 0 && (
              <span className="text-xs font-bold text-muted bg-line rounded-full px-2 py-0.5">{pending.length}</span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-surface shadow-sm">
              <EmptyState emoji="✅" title="Todo al día" description="No hay tareas pendientes" />
            </div>
          ) : (
            pending.map(task => <TaskItem key={task.id} task={task} onToggle={() => handleToggle(task)} onEdit={openEdit} onDelete={deleteTask} />)
          )}
        </section>

        {completed.length > 0 && (
          <section className="mt-6 space-y-2">
            <button onClick={() => setShowCompleted(v => !v)} className="flex items-center gap-2 px-1 mb-3 w-full text-left">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Completadas</h2>
              <span className="text-xs font-bold text-muted bg-line rounded-full px-2 py-0.5">{completed.length}</span>
              <span className="ml-auto text-muted">{showCompleted ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
            </button>
            {showCompleted && completed.map(task => <TaskItem key={task.id} task={task} onToggle={() => handleToggle(task)} onEdit={openEdit} onDelete={deleteTask} />)}
          </section>
        )}
      </div>

      <button onClick={openCreate} aria-label="Nueva tarea" className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-hover active:scale-95 transition-all">
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <TaskSheet
        key={sheetKey}
        open={sheetOpen}
        mode={editingTask ? 'edit' : 'create'}
        initial={editingTask}
        onClose={() => setSheetOpen(false)}
        onCreate={(draft: TaskDraft) => createTask(draft)}
        onUpdate={updateTask}
        onDelete={deleteTask}
      />
    </>
  )
}
