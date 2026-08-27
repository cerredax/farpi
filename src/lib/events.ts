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
export const RANGE_KINDS: EventKind[] = ['vacaciones', 'descanso', 'festivo']

export function isRangeKind(kind: EventKind): boolean {
  return RANGE_KINDS.includes(kind)
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
 * Un cumpleaños de alguien que **no es de la casa**: la abuela, un primo, el
 * amigo del cole.
 *
 * Los cumpleaños de la familia no pasan por aquí: se deducen de la fecha de
 * nacimiento que ya está en Ajustes y no se guardan en ningún sitio
 * (`birthdays.ts` explica por qué). Pero para alguien de fuera no hay ninguna
 * ficha de la que deducirlos, y darle una —con su color, asignable, en los
 * selectores de "de quién es esto"— sería meter en la familia a quien solo
 * queremos felicitar. De ahí que sea un tipo de evento: se apunta en el
 * calendario, que es donde ya vive todo lo que tiene fecha.
 *
 * Es un día completo, de un solo día, y siempre se guarda como serie anual: no
 * hay cumpleaños que ocurra una vez. Eso lo hace el sheet, no esta función.
 */
export function isBirthday(event: Event): boolean {
  return event.kind === 'cumple'
}

/**
 * El nombre propio de un festivo, o cadena vacía si no le pusieron uno.
 *
 * Un festivo sin título se guarda como "Festivo" —igual que unas vacaciones sin
 * título se guardan como "Vacaciones"— para que la búsqueda y el sheet tengan algo
 * que enseñar. Pero escribir "FESTIVO" dentro de una celda que **ya va con la
 * trama de día libre** es decir dos veces lo mismo y gastar la única línea de
 * texto que tiene la celda. Aquí solo interesa el nombre cuando dice algo que la
 * trama no dice: "Hispanidad", "Fiesta del pueblo".
 */
export function holidayName(event: Event): string {
  const limpio = event.title.trim()
  return limpio === eventTitleOr('festivo', '') ? '' : limpio
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
 * Un plan: algo que alguien hace a una hora o en un día concreto.
 *
 * Lo contrario son los tres tipos que ocupan un rango y contestan otra pregunta:
 * las vacaciones y los descansos dicen quién no está, y un festivo dice que el
 * día no es de nadie. Ninguno es un plan, y por eso ninguno sale en Inicio, ni
 * en la lista de la agenda, ni en el aviso de las siete de la mañana.
 *
 * Existe porque esta regla estaba escrita de cuatro maneras por la app y dos de
 * ellas solo apartaban las vacaciones. Cuando entró el descanso, y después el
 * festivo, nadie volvió a mirarlas: los dos se colaban en los planes de hoy y en
 * el correo de las siete. Una regla, un sitio.
 */
export function isPlan(event: Event): boolean {
  return !isRangeKind(event.kind)
}

/**
 * Lo que cuenta como plan **en el resumen del día**: Inicio y el aviso de las
 * siete. Es `isPlan` menos los cumpleaños.
 *
 * Un cumpleaños sí es un plan para el calendario —se apunta, se toca, se edita,
 * y por eso `isPlan` lo deja pasar—, pero en Inicio tiene bloque propio con la
 * tarta y la edad. Sin esta distinción salía dos veces en la misma pantalla:
 * una arriba como celebración y otra debajo como una cita más de las siete de
 * la mañana.
 *
 * Está aquí y no repetido en cada selector por lo mismo que `isPlan`: cuando
 * entre el sexto tipo de evento, esta es la única línea que hay que mirar.
 */
export function isDigestPlan(event: Event): boolean {
  return isPlan(event) && !isBirthday(event)
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
