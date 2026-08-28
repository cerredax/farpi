/**
 * Devuelve la fecha local en formato yyyy-MM-dd.
 * Evita el desfase de toISOString() que convierte a UTC antes de formatear.
 */
/** Saludo según la hora. Lo pinta la tarjeta del día en Inicio. */
export function getGreeting(date: Date): string {
  const hour = date.getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Convierte un string yyyy-MM-dd en un Date local situado al mediodía.
 * El mediodía evita que un cambio de zona horaria o de horario de verano
 * desplace la fecha al día anterior o siguiente.
 */
export function parseLocalDate(date: string): Date {
  return new Date(`${date}T12:00:00`)
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
 * Hora HH:mm de un datetime, en la zona del que mira.
 *
 * No vale con cortar el string. Los dos backends guardan formatos distintos: el
 * mock escribe la hora de pared tal cual (`2026-08-04T18:00:00`) y Supabase, que
 * usa `timestamptz`, devuelve el instante en UTC (`2026-08-04T16:00:00+00:00`).
 * Cortando, un evento de las 18:00 se leía como las 16:00 en España en verano, y
 * el error se acumulaba: al guardar de nuevo se escribían esas 16:00 como hora
 * local y el evento retrocedía otras dos horas. `Date` entiende los dos formatos
 * —el naive lo interpreta como local, que es lo que quiere decir— y aquí solo
 * queda formatearlo.
 */
export function extractTime(dateTime: string): string {
  // Un `yyyy-MM-dd` suelto no lleva hora. `Date` lo aceptaría como medianoche
  // UTC y devolveríamos una hora inventada (las 02:00 en España en verano).
  if (!dateTime.includes('T')) return ''
  const d = new Date(dateTime)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Minutos desde medianoche de un datetime, en la zona del que mira. Es
 * `extractTime` sin pasar por la cadena: la agenda por horas coloca cada evento
 * por su minuto, y volver a parsear un "HH:mm" recién formateado sobraba.
 * Devuelve `null` cuando no hay hora que leer, para no confundirla con las 00:00.
 */
export function extractMinutes(dateTime: string): number | null {
  if (!dateTime.includes('T')) return null
  const d = new Date(dateTime)
  if (Number.isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
}

/** Parte de fecha yyyy-MM-dd de un datetime, en la zona del que mira. Ver `extractTime`. */
export function extractDate(dateTime: string): string {
  if (!dateTime.includes('T')) return dateTime.slice(0, 10)
  const d = new Date(dateTime)
  if (Number.isNaN(d.getTime())) return dateTime.slice(0, 10)
  return getLocalDateString(d)
}
