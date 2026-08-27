import { addDays, addWeeks, endOfWeek, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { assigneeKeyOf } from './assignees'
import { capitalize } from './text'

/**
 * Cómo se agrupa lo que viene después del día que se está mirando.
 *
 * Cerca se piensa en días, un poco más lejos en semanas y lejos en meses, que
 * es como se habla en casa: "mañana", "esta semana", "la que viene", "en
 * septiembre". Sin tramos, la lista de la agenda era plana de aquí a 45 días y
 * el jueves que viene se leía igual que un cumpleaños de octubre.
 *
 * Los tramos van respecto al **día elegido** y no respecto a hoy, porque el
 * panel entero arranca ahí: mirando el 17 de septiembre, "esta semana" es la
 * suya.
 *
 * La excepción es **"Mañana"**, que sí mira el calendario de verdad y por eso
 * solo sale cuando la agenda arranca hoy. Es la pregunta que más se hace después
 * de "¿qué hay hoy?", y metida dentro de "Esta semana" se leía igual que el
 * sábado. Atado a hoy, además, nunca desordena los rótulos: "Mañana" siempre cae
 * justo detrás del día elegido y delante del resto de la semana.
 *
 * `hoy` es un parámetro y no un `new Date()` de dentro para que se pueda probar
 * sin depender del día en que se corran los tests.
 */
export function tramoDeAgenda(day: Date, desde: Date, hoy: Date = new Date()): string {
  // El primer día de la lista es su propio tramo. Desde que la agenda es una
  // lista continua (25-08-2026) el día elegido no tiene tarjeta aparte, así que
  // es su rótulo quien lo separa de lo que viene detrás: "Hoy" cuando lo es, y
  // su fecha cuando se está mirando otro día.
  if (isSameDay(day, desde)) {
    return isSameDay(desde, hoy)
      ? 'Hoy'
      : capitalize(format(desde, "EEEE d 'de' MMMM", { locale: es }))
  }
  if (isSameDay(desde, hoy) && isSameDay(day, addDays(hoy, 1))) return 'Mañana'
  if (day <= endOfWeek(desde, { weekStartsOn: 1 })) return 'Esta semana'
  if (day <= endOfWeek(addWeeks(desde, 1), { weekStartsOn: 1 })) return 'La semana que viene'
  // El año solo cuando no es el del día elegido. En 45 días eso solo pasa al
  // cruzar de diciembre a enero, y ahí "Enero" a secas se leería como el enero
  // que ya pasó.
  const mismoAno = day.getFullYear() === desde.getFullYear()
  return capitalize(format(day, mismoAno ? 'MMMM' : 'MMMM yyyy', { locale: es }))
}

/**
 * Un día de la agenda: lo que hay ese día, ya filtrado y ordenado.
 *
 * Es la unidad que pinta la lista en los dos ejes, y por eso está aquí y no
 * dentro del componente: agrupar por persona no rehace las filas, solo cambia
 * quién es el rótulo de arriba.
 */
export interface DiaDeAgenda<E, T> {
  day: Date
  events: E[]
  tasks: T[]
}

/** Lo de una persona en los próximos días, en el mismo formato que la lista. */
export interface GrupoDePersona<P, E, T> {
  persona: P
  dias: DiaDeAgenda<E, T>[]
}

/**
 * Reparte los días de la agenda entre las personas de la casa.
 *
 * El **segundo eje de la agenda** (27-08-2026). La lista contesta "¿qué hay el
 * jueves?" y le faltaba la otra mitad de la pregunta de una casa con varios:
 * "¿y qué lleva cada uno?". Para eso no hace falta otra pantalla ni partir nada
 * en columnas —eso se descartó, no cabe en un móvil—: basta con cambiar de sitio
 * el rótulo. Arriba la persona, y debajo sus días tal cual se pintan ahora.
 *
 * Reglas:
 *
 * - **El orden de las personas es el de siempre** (`buildAssignees`): familia,
 *   adultos, hijos. La agenda no inventa un orden propio.
 * - **Quien no tiene nada no sale.** Es la misma regla que ya cumple un día
 *   vacío en la lista: en una lista continua, un hueco es ruido. Y evita que una
 *   familia de cinco enseñe tres rótulos con nada debajo.
 * - Un evento de varios días **sigue saliendo en cada día que ocupa**, igual que
 *   en el eje de días. Es repetición, sí, pero la misma que la lista ya tiene:
 *   cambiar eso aquí y no allí sería que la misma fila se cuente de dos maneras
 *   según el rótulo que tenga encima.
 *
 * Es genérica en el tipo de persona, evento y tarea para poder probarla sin
 * construir un `Event` entero: lo único que mira es a quién pertenece cada cosa,
 * que es lo que dice `assigneeKeyOf`.
 */
export function agruparPorPersona<
  P extends { key: string },
  E extends { child_id: string | null; member_id: string | null },
  T extends { child_id: string | null; member_id: string | null },
>(dias: DiaDeAgenda<E, T>[], personas: P[]): GrupoDePersona<P, E, T>[] {
  return personas
    .map(persona => ({
      persona,
      dias: dias
        .map(dia => ({
          day: dia.day,
          events: dia.events.filter(e => assigneeKeyOf(e) === persona.key),
          tasks: dia.tasks.filter(t => assigneeKeyOf(t) === persona.key),
        }))
        .filter(dia => dia.events.length > 0 || dia.tasks.length > 0),
    }))
    .filter(grupo => grupo.dias.length > 0)
}
