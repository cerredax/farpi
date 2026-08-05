import { getNextOccurrence } from '../recurrence'
import { createClient } from '../supabase/client'
import { assertNoError, currentUserId } from './shared'
import type { Task, TaskDraft } from '@/types'
import type { TasksRepo } from '../repos/types'

export const tasksRepo: TasksRepo = {
  async getTasks(familyId: string): Promise<Task[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('tasks').select('*').eq('family_id', familyId).order('created_at')
    assertNoError(error)
    return data ?? []
  },

  async createTask(familyId: string, draft: TaskDraft): Promise<Task> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        family_id: familyId,
        child_id: draft.child_id,
        member_id: draft.member_id,
        title: draft.title.trim(),
        notes: draft.notes.trim() || null,
        priority: draft.priority,
        due_date: draft.due_date || null,
        recurrence: draft.recurrence,
        recurrence_end: draft.recurrence_end || null,
        created_by: userId,
      })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateTask(id: string, draft: TaskDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({
        child_id: draft.child_id,
        member_id: draft.member_id,
        title: draft.title.trim(),
        notes: draft.notes.trim() || null,
        priority: draft.priority,
        due_date: draft.due_date || null,
        recurrence: draft.recurrence,
        recurrence_end: draft.recurrence_end || null,
      })
      .eq('id', id)
    assertNoError(error)
  },

  async deleteTask(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    assertNoError(error)
  },

  /**
   * Marcar una tarea que se repite no la archiva: la empuja a su siguiente
   * fecha. Solo se da por acabada cuando la serie se pasa de `recurrence_end`.
   */
  async toggleTask(id: string): Promise<void> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data: task, error: getError } = await supabase.from('tasks').select('*').eq('id', id).single()
    assertNoError(getError)
    const now = new Date().toISOString()

    if (task.completed || task.recurrence === 'none') {
      const completed = !task.completed
      const { error } = await supabase
        .from('tasks')
        .update({
          completed,
          completed_at: completed ? now : null,
          completed_by: completed ? userId : null,
        })
        .eq('id', id)
      assertNoError(error)
      return
    }

    const next = getNextOccurrence(task.due_date, task.recurrence)
    const seriesDone = task.recurrence_end ? next > task.recurrence_end : false
    const { error } = await supabase
      .from('tasks')
      .update(seriesDone
        ? { completed: true, completed_at: now, completed_by: userId }
        : { due_date: next })
      .eq('id', id)
    assertNoError(error)
  },
}
