import { getLocalDateString, parseLocalDate } from './date-utils'
import type { TaskRecurrence } from '@/types'

// Fuente única de la lógica de recurrencia. La comparten los repos de Supabase,
// el store mock y la UI (previsualización de series), para que la regla no
// diverja entre capas.

/** Siguiente fecha de vencimiento a partir de la actual y el tipo de recurrencia. */
export function getNextOccurrence(current: string | null, recurrence: TaskRecurrence): string {
  const base = current ? parseLocalDate(current) : new Date()
  if (recurrence === 'daily')   base.setDate(base.getDate() + 1)
  if (recurrence === 'weekly')  base.setDate(base.getDate() + 7)
  if (recurrence === 'monthly') base.setMonth(base.getMonth() + 1)
  return getLocalDateString(base)
}

/** Todas las fechas yyyy-MM-dd de una serie anual, del año inicial al final, sobre el mismo MM-DD. */
export function buildYearlyDates(mmdd: string, startYear: number, endYear: number): string[] {
  const dates: string[] = []
  for (let year = startYear; year <= endYear; year++) dates.push(`${year}-${mmdd}`)
  return dates
}

/** Todas las fechas yyyy-MM-dd de una serie semanal entre dos fechas, en los días indicados (0=domingo). */
export function buildWeeklyDates(startDate: string, endDate: string, weekdays: number[]): string[] {
  const dates: string[] = []
  if (!startDate || !endDate || weekdays.length === 0) return dates
  const cur = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) {
      dates.push(getLocalDateString(cur))
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}
