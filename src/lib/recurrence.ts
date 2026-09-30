import { getLocalDateString, parseLocalDate } from './date-utils'
import { calendario } from './i18n/es/calendario'
import type { Diccionario } from './i18n'
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

/** La misma fecha en otro año: `2027-03-05` en 2029 es `2029-03-05`. Así se construye cada fila de una serie anual. */
export function sameDayInYear(date: string, year: number): string {
  return `${year}-${date.slice(5)}`
}

/**
 * Si las ocurrencias de una serie caen todas el mismo día del año (un cumpleaños,
 * un «cada año»). Una semanal nunca: sus filas van de siete en siete días.
 *
 * Con una sola fila no hay serie que decir —las demás se borraron una a una— y
 * editar esa es editar un evento suelto.
 */
export function isYearlySeries(startAts: string[]): boolean {
  if (startAts.length < 2) return false
  return new Set(startAts.map(s => getLocalDateString(new Date(s)).slice(5))).size === 1
}

/**
 * Todas las fechas yyyy-MM-dd de una serie semanal entre dos fechas, en los días
 * indicados (0=domingo).
 *
 * `everyWeeks` es cada cuántas semanas: con 2, se salta una semana de cada dos.
 * Las semanas se cuentan de lunes a domingo **desde la de la fecha de inicio**, no
 * desde el día en que cae: empezar un miércoles «lunes y miércoles cada 2
 * semanas» pone el miércoles de esa semana, no el lunes anterior, y la siguiente
 * semana con eventos es la de dentro de dos.
 */
export function buildWeeklyDates(startDate: string, endDate: string, weekdays: number[], everyWeeks = 1): string[] {
  const dates: string[] = []
  if (!startDate || !endDate || weekdays.length === 0) return dates
  const cadaCuanto = Math.max(1, Math.floor(everyWeeks))
  const cur = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  // Cuántos días hay del lunes de la semana de inicio al día de inicio.
  const desdeElLunes = (cur.getDay() + 6) % 7
  for (let dia = 0; cur <= end; dia++) {
    const semana = Math.floor((dia + desdeElLunes) / 7)
    if (semana % cadaCuanto === 0 && weekdays.includes(cur.getDay())) {
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
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

/**
 * "lunes, miércoles y viernes" — para contar una serie en una frase.
 *
 * `t` son los nombres del idioma de la pantalla (por `getDay()`) y la palabra que
 * une los dos últimos; sin él, castellano.
 */
export function joinWeekdayNames(
  days: number[],
  t: Diccionario['calendario']['semana'] = calendario.semana,
): string {
  const names = WEEKDAY_ORDER.filter(d => days.includes(d)).map(d => t.plurales[d])
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return names.slice(0, -1).join(', ') + ` ${t.y} ` + names[names.length - 1]
}
