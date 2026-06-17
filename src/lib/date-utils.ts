/**
 * Devuelve la fecha local en formato yyyy-MM-dd.
 * Evita el desfase de toISOString() que convierte a UTC antes de formatear.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Comprueba si dos fechas (string yyyy-MM-dd o Date) son el mismo día local. */
export function isSameLocalDay(a: string | Date, b: string | Date): boolean {
  const toStr = (v: string | Date) =>
    v instanceof Date ? getLocalDateString(v) : v.slice(0, 10)
  return toStr(a) === toStr(b)
}

/**
 * Construye un string datetime local a partir de fecha e hora opcionales.
 * Devuelve `yyyy-MM-ddTHH:mm:00`.
 */
export function buildLocalDateTime(date: string, time?: string): string {
  return `${date}T${time ?? '00:00'}:00`
}

/**
 * Extrae la hora HH:mm de un string datetime (ISO o local).
 * Devuelve '' si el string no tiene componente de hora válida.
 */
export function extractTime(dateTime: string): string {
  return dateTime.split('T')[1]?.slice(0, 5) ?? ''
}

/** Extrae la parte de fecha yyyy-MM-dd de un string datetime. */
export function extractDate(dateTime: string): string {
  return dateTime.slice(0, 10)
}
