'use client'

import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { isBefore, startOfDay, parseISO } from 'date-fns'
import { useStore } from '@/lib/store-context'
import { TaskItem } from './TaskItem'
import { TaskSheet } from './TaskSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { TASK_PRIORITIES } from '@/lib/constants'
import type { Task, TaskDraft, TaskPriority } from '@/types'

const PRIORITY_WEIGHT = Object.fromEntries(
  TASK_PRIORITIES.map((p, i) => [p.value, i])
) as Record<TaskPriority, number>

function sortPending(tasks: Task[]): Task[] {
  const today = startOfDay(new Date())
  return [...tasks].sort((a, b) => {
    const aOver = a.due_date ? isBefore(parseISO(a.due_date), today) : false
    const bOver = b.due_date ? isBefore(parseISO(b.due_date), today) : false
    if (aOver !== bOver) return aOver ? -1 : 1
    if (!a.due_date && !b.due_date) return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    const dc = a.due_date.localeCompare(b.due_date)
    return dc !== 0 ? dc : PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
  })
}

export function TasksView() {
  const { tasks, createTask, updateTask, deleteTask, toggleTask } = useStore()

  const [sheetOpen, setSheetOpen]       = useState(false)
  const [editingTask, setEditingTask]   = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const pending   = sortPending(tasks.filter(t => !t.completed))
  const completed = tasks.filter(t => t.completed).sort(
    (a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')
  )

  function openCreate() { setEditingTask(null); setSheetOpen(true) }
  function openEdit(task: Task) { setEditingTask(task); setSheetOpen(true) }

  const sheetKey = editingTask ? `edit-${editingTask.id}` : 'create'

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-4 pb-28">
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#77716A]">Pendientes</h2>
            {pending.length > 0 && (
              <span className="text-xs font-bold text-[#77716A] bg-[#EDE9E3] rounded-full px-2 py-0.5">{pending.length}</span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm">
              <EmptyState emoji="✅" title="Todo al día" description="No hay tareas pendientes" />
            </div>
          ) : (
            pending.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onEdit={openEdit} onDelete={deleteTask} />)
          )}
        </section>

        {completed.length > 0 && (
          <section className="mt-6 space-y-2">
            <button onClick={() => setShowCompleted(v => !v)} className="flex items-center gap-2 px-1 mb-3 w-full text-left">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#77716A]">Completadas</h2>
              <span className="text-xs font-bold text-[#77716A] bg-[#EDE9E3] rounded-full px-2 py-0.5">{completed.length}</span>
              <span className="ml-auto text-[#77716A]">{showCompleted ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
            </button>
            {showCompleted && completed.map(task => <TaskItem key={task.id} task={task} onToggle={toggleTask} onEdit={openEdit} onDelete={deleteTask} />)}
          </section>
        )}
      </div>

      <button onClick={openCreate} aria-label="Nueva tarea" className="fixed bottom-24 right-5 z-30 w-14 h-14 bg-[#8BA888] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#7a9877] active:scale-95 transition-all">
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
