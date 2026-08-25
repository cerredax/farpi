import { extractDate } from './date-utils'
import type { Event, EventKind } from '@/types'

/**
 * Qué días ocupa un evento.
 *
 * Hasta las vacaciones, el calendario asumía que un evento vivía en un solo día
 * y filtraba comparando `start_at` con el día. Unas vacaciones ocupan un rango,
 * así que la pregunta correcta pasa a ser "¿este evento cubre este día?".
 *
 * Se trabaja con las fechas en formato yyyy-MM-dd, no con objetos Date, porque
 * comparar cadenas evita por completo los líos de zona horaria.
 */
export function eventCoversDay(event: Event, day: Date | string): boolean {
  const dia = typeof day === 'string' ? day.slice(0, 10) : localDay(day)
  const inicio = extractDate(event.start_at)
  const fin = event.end_at ? extractDate(event.end_at) : inicio
  return dia >= inicio && dia <= fin
}

function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * El nombre con el que se guarda un evento al que no se le puso título.
 *
 * Unas vacaciones o un descanso ya dicen lo que son por el tipo, así que el
 * formulario no pide título. Pero `title` no es nullable en la base y hay
 * sitios que lo enseñan —la franja del calendario, la etiqueta accesible del
 * botón, el recordatorio diario—, así que se rellena aquí. Es a propósito que
 * no se deje vacío para que luego cada pantalla se invente su propio texto de
 * reserva: eso fue lo que dejó a Inicio sin la marca de los eventos de familia.
 *
 * Un plan sí necesita nombre, y el validador lo sigue exigiendo: "una cita" sin
 * más no dice qué hay que hacer el jueves a las cinco.
 */
export function eventTitleOr(kind: EventKind, title: string): string {
  const limpio = title.trim()
  if (limpio) return limpio
  if (kind === 'vacaciones') return 'Vacaciones'
  if (kind === 'descanso') return 'Descanso'
  if (kind === 'festivo') return 'Festivo'
  return ''
}

/**
 * Los tipos que ocupan **días completos y llevan día final**: vacaciones,
 * descansos y festivos. Un plan es lo contrario: es de una tarde y tiene hora.
 *
 * Vive aquí porque esa condición se preguntaba en seis sitios con un `||` de
 * dos ramas escrito a mano, y al entrar el tercer tipo habría que haber tocado
 * los seis. La base de datos lo dice con la misma regla, una restricción por
 * tipo (`events_*_con_rango`).
 */
export function isRangeKind(kind: EventKind): boolean {
  return kind === 'vacaciones' || kind === 'descanso' || kind === 'festivo'
}

export function isVacation(event: Event): boolean {
  return event.kind === 'vacaciones'
}

export function isRestDay(event: Event): boolean {
  return event.kind === 'descanso'
}

/**
 * Un festivo: un día sin trabajo ni colegio.
 *
 * **No es una ausencia** y por eso se queda fuera de `isAbsence`. Una ausencia
 * dice quién no está disponible; un festivo es una propiedad del día y afecta
 * igual a toda la casa. De ahí también que se pinte en gris y no en la paleta
 * de personas, donde el color significa siempre de quién es algo.
 */
export function isHoliday(event: Event): boolean {
  return event.kind === 'festivo'
}

/**
 * Vacaciones y descansos juntos: los dos contestan lo mismo —quién no está
 * disponible— y por eso el calendario los trata igual. No son planes del día, así
 * que no salen en la lista de la agenda; van en su bloque, donde se dice de quién
 * son y hasta cuándo.
 */
export function isAbsence(event: Event): boolean {
  return isVacation(event) || isRestDay(event)
}

/**
 * Devuelve si una persona concreta está de descanso en un día concreto.
 * Sirve para saber si "puedes contar con ella" cuando el calendario marca un
 * descanso, y acepta un miembro adulto o un hijo porque la app usa ambos.
 */
export function isPersonOffOnDay(
  events: Event[],
  assignee: { child_id: string | null; member_id: string | null } | null,
  day: Date | string,
): boolean {
  if (!assignee) return false
  const dia = typeof day === 'string' ? day.slice(0, 10) : localDay(day)

  return events.some(event => {
    if (!isRestDay(event)) return false
    if (assignee.member_id && event.member_id !== assignee.member_id) return false
    if (assignee.child_id && event.child_id !== assignee.child_id) return false
    return eventCoversDay(event, dia)
  })
}

export function isPersonAvailableOnDay(
  events: Event[],
  assignee: { child_id: string | null; member_id: string | null } | null,
  day: Date | string,
): boolean {
  return !isPersonOffOnDay(events, assignee, day)
}

/**
 * Días completos entre dos fechas, contando la primera y la última. Se usa
 * tanto sobre un evento guardado como sobre el formulario mientras se rellena,
 * así que recibe fechas sueltas en vez de un Event.
 */
export function daysBetween(desde: string, hasta: string): number {
  if (!desde || !hasta || hasta < desde) return 0
  const inicio = new Date(desde + 'T12:00:00')
  const fin = new Date(hasta + 'T12:00:00')
  return Math.round((fin.getTime() - inicio.getTime()) / 86_400_000) + 1
}

/** Cuántos días duran unas vacaciones ya guardadas. */
export function vacationLength(event: Event): number {
  return daysBetween(extractDate(event.start_at), extractDate(event.end_at ?? event.start_at))
}

/** Posición de un día dentro del rango, para dibujar los extremos del tramo. */
export function vacationEdges(event: Event, day: Date | string): { primero: boolean; ultimo: boolean } {
  const dia = typeof day === 'string' ? day.slice(0, 10) : localDay(day)
  return {
    primero: dia === extractDate(event.start_at),
    ultimo: dia === extractDate(event.end_at ?? event.start_at),
  }
}
