import { getLocalDateString } from './date-utils'
import type { Task, TaskRecurrence } from '@/types'

/** Next due date string given current due_date and recurrence type. */
export function getNextOccurrence(current: string | null, recurrence: TaskRecurrence): string {
  const base = current ? new Date(current + 'T12:00:00') : new Date()
  if (recurrence === 'daily')   base.setDate(base.getDate() + 1)
  if (recurrence === 'weekly')  base.setDate(base.getDate() + 7)
  if (recurrence === 'monthly') base.setMonth(base.getMonth() + 1)
  return getLocalDateString(base)
}

/** True if a recurring task is due today (or past due) and not yet advanced. */
export function isTaskDueToday(task: Task): boolean {
  if (!task.due_date || task.completed) return false
  return task.due_date <= getLocalDateString()
}

/** All yyyy-MM-dd strings for a yearly series from startYear to endYear on the same MM-DD. */
export function buildYearlyDates(mmdd: string, startYear: number, endYear: number): string[] {
  const dates: string[] = []
  for (let y = startYear; y <= endYear; y++) dates.push(`${y}-${mmdd}`)
  return dates
}

/** All yyyy-MM-dd strings in a weekly series between startDate and endDate on given weekdays (0=Sun). */
export function buildWeeklyDates(startDate: string, endDate: string, weekdays: number[]): string[] {
  const dates: string[] = []
  const cur = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')
  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) {
      dates.push(getLocalDateString(cur))
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}
