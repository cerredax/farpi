/**
 * Devuelve la fecha local en formato yyyy-MM-dd.
 * Evita el desfase de toISOString() que convierte a UTC antes de formatear.
 */
export type DayPeriod = 'mañana' | 'tarde' | 'noche'

/**
 * Tramo del día por la hora suelta, sin fecha alrededor.
 *
 * Existe aparte porque la portada pública y el login pintan la misma ilustración
 * **desde el servidor**, y ahí no vale `date.getHours()`: en Vercel el servidor
 * va en UTC y en España son una o dos horas más. Quien resuelve la hora de
 * Madrid es `getDayPeriodEnMadrid`, aquí debajo, y pregunta por ella: así estos
 * límites no se repiten en otro archivo y no dejan de coincidir con el saludo.
 */
export function getDayPeriodFromHour(hour: number): DayPeriod {
  if (hour < 12) return 'mañana'
  if (hour < 20) return 'tarde'
  return 'noche'
}

/**
 * El tramo del día en España, para lo que se pinta **en el servidor**.
 *
 * En Vercel el servidor va en UTC, así que preguntar por la hora de la máquina
 * enseñaría a media España el cielo de una hora antes. Lo usan la portada
 * pública y la pantalla de login, que enseñan la misma casa: vive aquí y no en
 * una de las dos para que no se separen.
 *
 * La fecha se puede pasar para poder probarlo; por defecto es ahora.
 */
export function getDayPeriodEnMadrid(now: Date = new Date()): DayPeriod {
  const hora = Number(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now)
  )
  return getDayPeriodFromHour(hora)
}

/** Tramo del día por la hora. Decide el saludo y el cielo de la ilustración
 *  de la tarjeta de Inicio, así que las dos comparten los mismos límites. */
export function getDayPeriod(date: Date): DayPeriod {
  return getDayPeriodFromHour(date.getHours())
}

/** Saludo según la hora. Lo pinta la tarjeta del día en Inicio. */
export function getGreeting(date: Date): string {
  const period = getDayPeriod(date)
  if (period === 'mañana') return 'Buenos días'
  if (period === 'tarde') return 'Buenas tardes'
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
