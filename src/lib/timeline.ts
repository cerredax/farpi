import { extractDate, extractMinutes } from './date-utils'
import { eventCoversDay, isVacation } from './events'
import { DURACION_SIN_HORA_FIN, HORAS_MINIMAS_AGENDA } from './constants'
import type { Event } from '@/types'

/**
 * Colocación de los eventos de un día sobre un eje de horas: dónde empieza cada
 * uno, cuánto ocupa y cómo se reparten los que caen a la vez.
 *
 * Vive aparte de `events.ts` porque responde a otra pregunta. Allí se decide
 * **qué días** ocupa un evento; aquí, **dónde** cae dentro de un día. Es todo
 * aritmética sin React, así que se prueba en `e2e/unit/timeline.spec.ts`.
 */

export const MINUTOS_DIA = 24 * 60

export interface BloqueDia {
  event: Event
  /** Minuto del día en que empieza el bloque, ya recortado a este día. */
  inicio: number
  /** Minuto del día en que acaba. Siempre mayor que `inicio`. */
  fin: number
  /** Columna que ocupa dentro de su grupo de solapados, empezando en 0. */
  columna: number
  /** Cuántas columnas tiene su grupo. Con 1, el bloque va a todo el ancho. */
  columnas: number
}

/**
 * Separa los eventos de un día en los que tienen hora y los que no.
 *
 * Las vacaciones se quedan fuera de las dos listas: no son un plan del día, y
 * su sitio es la franja de la rejilla. Es la misma regla que ya aplica la lista
 * de la agenda, y está explicada en "Decisiones de producto".
 */
export function partirEventosDelDia(events: Event[], dia: string): { todoElDia: Event[]; conHora: Event[] } {
  const delDia = events.filter(e => !isVacation(e) && eventCoversDay(e, dia))
  return {
    todoElDia: delDia.filter(e => e.all_day),
    conHora: delDia.filter(e => !e.all_day),
  }
}

/**
 * Tramo que ocupa un evento dentro de un día concreto, en minutos.
 *
 * Un evento puede empezar el día antes o acabar el siguiente —no solo las
 * vacaciones: una guardia de noche también—, así que lo que sale del día se
 * recorta a sus bordes en vez de desbordar el eje.
 */
export function tramoDelEvento(event: Event, dia: string): { inicio: number; fin: number } {
  const empiezaAntes = extractDate(event.start_at) < dia
  const inicio = empiezaAntes ? 0 : (extractMinutes(event.start_at) ?? 0)

  let fin: number
  if (!event.end_at) {
    fin = inicio + DURACION_SIN_HORA_FIN
  } else if (extractDate(event.end_at) > dia) {
    fin = MINUTOS_DIA
  } else {
    fin = extractMinutes(event.end_at) ?? inicio + DURACION_SIN_HORA_FIN
  }

  // Una hora de fin igual o anterior a la de inicio no debería llegar aquí —el
  // validador la rechaza— pero un dato viejo o traído de fuera sí puede, y un
  // bloque de alto cero o negativo no se ve o se dibuja al revés.
  if (fin <= inicio) fin = inicio + DURACION_SIN_HORA_FIN

  return { inicio: Math.max(inicio, 0), fin: Math.min(fin, MINUTOS_DIA) }
}

/**
 * Reparte en columnas los eventos que se pisan, como hace cualquier calendario:
 * dos citas a la misma hora se ponen media caja cada una en vez de una encima
 * de la otra.
 *
 * Se agrupan en racimos —tramos seguidos donde cada evento toca al anterior— y
 * el ancho se decide por racimo, no por todo el día: dos citas solapadas por la
 * mañana no tienen por qué estrechar la de la tarde.
 */
export function repartirSolapados(events: Event[], dia: string): BloqueDia[] {
  const tramos = events
    .map(event => ({ event, ...tramoDelEvento(event, dia) }))
    .sort((a, b) => a.inicio - b.inicio || a.fin - b.fin)

  const bloques: BloqueDia[] = []
  let racimo: BloqueDia[] = []
  let finDelRacimo = -1

  function cerrarRacimo() {
    const columnas = racimo.reduce((max, b) => Math.max(max, b.columna + 1), 0)
    racimo.forEach(b => { b.columnas = columnas })
    racimo = []
  }

  for (const tramo of tramos) {
    // Empieza cuando ya ha acabado todo lo anterior: racimo nuevo.
    if (tramo.inicio >= finDelRacimo && racimo.length > 0) cerrarRacimo()

    // Primera columna que haya quedado libre a esa hora; si no hay, una nueva.
    const ocupadas = new Set(racimo.filter(b => b.fin > tramo.inicio).map(b => b.columna))
    let columna = 0
    while (ocupadas.has(columna)) columna++

    const bloque: BloqueDia = { ...tramo, columna, columnas: 1 }
    racimo.push(bloque)
    bloques.push(bloque)
    finDelRacimo = Math.max(finDelRacimo, tramo.fin)
  }
  cerrarRacimo()

  return bloques
}

/**
 * Qué horas pinta el eje, en horas enteras. Se ciñe a lo que hay ese día con
 * una hora de margen arriba y abajo: un día de dos citas no tiene por qué
 * enseñar la madrugada entera.
 *
 * `ahora` entra en la cuenta cuando se mira el día de hoy, para que la línea de
 * la hora actual no quede fuera del tramo dibujado.
 */
export function rangoHorario(bloques: { inicio: number; fin: number }[], ahora?: number): { desde: number; hasta: number } {
  const minutos = bloques.flatMap(b => [b.inicio, b.fin])
  if (ahora !== undefined) minutos.push(ahora)

  // Sin nada que enseñar, una jornada de andar por casa. No se llega a pintar
  // —sin eventos la vista enseña su estado vacío— pero deja la función total.
  if (minutos.length === 0) return { desde: 8, hasta: 8 + HORAS_MINIMAS_AGENDA }

  let desde = Math.max(Math.floor(Math.min(...minutos) / 60) - 1, 0)
  let hasta = Math.min(Math.ceil(Math.max(...minutos) / 60) + 1, 24)

  // El suelo de horas se gana primero hacia abajo, que es donde suele haber
  // sitio: estirar hacia la noche enseña horas en las que no pasa nada.
  while (hasta - desde < HORAS_MINIMAS_AGENDA && (desde > 0 || hasta < 24)) {
    if (desde > 0) desde--
    else hasta++
  }

  return { desde, hasta }
}
