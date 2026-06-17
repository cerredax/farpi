import type { Task, TaskDraft, TaskRecurrence } from '@/types'
import { getLocalDateString } from '../date-utils'
import { db } from './db'

function nextDueDate(current: string | null, recurrence: TaskRecurrence): string {
  const base = current ? new Date(current + 'T12:00:00') : new Date()
  if (recurrence === 'daily')   base.setDate(base.getDate() + 1)
  if (recurrence === 'weekly')  base.setDate(base.getDate() + 7)
  if (recurrence === 'monthly') base.setMonth(base.getMonth() + 1)
  return getLocalDateString(base)
}

export function getTasks(familyId: string): Task[] {
  return db.tasks.filter(t => t.family_id === familyId)
}

export function createTask(familyId: string, draft: TaskDraft): Task {
  const now = new Date().toISOString()
  const t: Task = {
    id: crypto.randomUUID(),
    family_id: familyId,
    title: draft.title.trim(),
    notes: draft.notes.trim() || null,
    priority: draft.priority,
    due_date: draft.due_date || null,
    recurrence: draft.recurrence,
    recurrence_end: draft.recurrence_end || null,
    completed: false,
    completed_at: null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.tasks = [...db.tasks, t]
  return t
}

export function updateTask(id: string, draft: TaskDraft): void {
  db.tasks = db.tasks.map(t => t.id !== id ? t : {
    ...t,
    title: draft.title.trim(),
    notes: draft.notes.trim() || null,
    priority: draft.priority,
    due_date: draft.due_date || null,
    recurrence: draft.recurrence,
    recurrence_end: draft.recurrence_end || null,
    updated_at: new Date().toISOString(),
  })
}

export function deleteTask(id: string): void {
  db.tasks = db.tasks.filter(t => t.id !== id)
}

export function toggleTask(id: string): void {
  const now = new Date().toISOString()
  db.tasks = db.tasks.map(t => {
    if (t.id !== id) return t
    // Desmarcar o tarea no recurrente → invertir completed
    if (t.completed || t.recurrence === 'none') {
      return { ...t, completed: !t.completed, completed_at: !t.completed ? now : null, updated_at: now }
    }
    // Tarea recurrente → avanzar fecha en lugar de marcar como completa
    const next = nextDueDate(t.due_date, t.recurrence)
    const seriesDone = t.recurrence_end ? next > t.recurrence_end : false
    if (seriesDone) {
      return { ...t, completed: true, completed_at: now, updated_at: now }
    }
    return { ...t, due_date: next, updated_at: now }
  })
}
