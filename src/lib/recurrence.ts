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

/** El día de la semana de una fecha yyyy-MM-dd (0=domingo), en hora local. */
export function weekdayOf(dateStr: string): number {
  return parseLocalDate(dateStr).getDay()
}

/**
 * Hasta dónde se puede estirar una serie semanal: 52 semanas. Cada ocurrencia
 * es una fila, así que el tope no es estético — es lo que evita que un descuido
 * escriba miles de eventos de golpe.
 */
export function maxWeeklyEndDate(startDate: string): string {
  const d = parseLocalDate(startDate)
  d.setDate(d.getDate() + 364)
  return getLocalDateString(d)
}

// De lunes a domingo, que es como se lee una semana aquí.
const WEEKDAY_NAMES: Record<number, string> = {
  0: 'domingos', 1: 'lunes', 2: 'martes', 3: 'miércoles',
  4: 'jueves', 5: 'viernes', 6: 'sábados',
}
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** "lunes, miércoles y viernes" — para contar una serie en una frase. */
export function joinWeekdayNames(days: number[]): string {
  const names = WEEKDAY_ORDER.filter(d => days.includes(d)).map(d => WEEKDAY_NAMES[d])
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1]
}
