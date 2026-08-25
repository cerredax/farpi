import { addDays, addWeeks, endOfWeek, format, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
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
