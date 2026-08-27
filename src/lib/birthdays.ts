import { DIAS_AVISO_CUMPLE } from './constants'
import { getLocalDateString, parseLocalDate } from './date-utils'

/**
 * Los cumpleaños **no son eventos**.
 *
 * Se pensó en crearlos como `Event` recurrentes al guardar la fecha de
 * nacimiento y se descartó: habría que darlos de alta, borrarlos al borrar a la
 * persona, arrastrarlos al cambiar la fecha y decidir qué pasa con los años ya
 * pasados. Un cumpleaños no es algo que se apunte, es algo que **se deduce** de
 * la fecha que ya está guardada en Ajustes. Por eso vive aquí, como dato
 * derivado, igual que "lo que falta en cada lista": nada que mantener, nada que
 * se desincronice.
 *
 * La consecuencia es que un cumpleaños no se puede editar ni asignar ni tiene
 * hora. Se cambia donde se cambia la persona.
 */

/**
 * Lo mínimo que hace falta para calcular un cumpleaños. Es estructural a
 * propósito: en la app entran `Child` completos y en el cron de las siete entran
 * las tres columnas que se leen de la base.
 */
export interface PersonaConCumple {
  name: string
  birth_date: string | null
}

export interface Cumple<P extends PersonaConCumple = PersonaConCumple> {
  persona: P
  /** El día en que toca celebrarlo, `yyyy-MM-dd`. */
  fecha: string
  /** Los años que cumple ese día. */
  edad: number
  /** Cuántos días faltan desde el día de referencia. `0` = hoy. */
  dias: number
}

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

/**
 * El día del año en que se celebra, ya resuelto.
 *
 * Un 29 de febrero cae en un año que no lo tiene, y `Date` lo desplaza solo al
 * 1 de marzo. Es la respuesta que queremos —el cumpleaños se celebra, no se
 * salta tres de cada cuatro años— y no hace falta escribirla aparte.
 */
function celebracion(ano: number, mes: number, dia: number): string {
  return getLocalDateString(new Date(ano, mes - 1, dia))
}

/**
 * El próximo cumpleaños de una persona: hoy si es hoy, y si ya pasó, el del año
 * que viene. Devuelve `null` cuando no hay fecha guardada, cuando no es una
 * fecha (`yyyy-MM-dd`) o cuando está en el futuro, que solo puede ser un error
 * al teclearla.
 */
export function proximoCumple<P extends PersonaConCumple>(
  persona: P,
  hoy = getLocalDateString(),
): Cumple<P> | null {
  const nacimiento = persona.birth_date
  if (!nacimiento || !FECHA_ISO.test(nacimiento) || nacimiento > hoy) return null

  const [anoNacimiento, mes, dia] = nacimiento.split('-').map(Number)
  const anoHoy = Number(hoy.slice(0, 4))

  let fecha = celebracion(anoHoy, mes, dia)
  if (fecha < hoy) fecha = celebracion(anoHoy + 1, mes, dia)

  return {
    persona,
    fecha,
    edad: Number(fecha.slice(0, 4)) - anoNacimiento,
    // Al mediodía, así que un cambio de hora no convierte 30 días en 29. Es la
    // misma cuenta que hace `selectExpiryState` con las caducidades.
    dias: Math.round((parseLocalDate(fecha).getTime() - parseLocalDate(hoy).getTime()) / 86_400_000),
  }
}

/**
 * Los cumpleaños que caen dentro de la ventana, del más cercano al más lejano.
 *
 * Con `dias = 0` son los de hoy. Quien no tiene fecha guardada no sale: media
 * casa sin fecha no puede dejar el bloque diciendo "faltan datos", que es
 * trabajo administrativo y no una respuesta a "¿qué hay que saber hoy?".
 */
export function proximosCumples<P extends PersonaConCumple>(
  personas: P[],
  hoy = getLocalDateString(),
  dias = DIAS_AVISO_CUMPLE,
): Cumple<P>[] {
  return personas
    .map(persona => proximoCumple(persona, hoy))
    .filter((cumple): cumple is Cumple<P> => cumple !== null && cumple.dias <= dias)
    .sort((a, b) => (a.dias !== b.dias ? a.dias - b.dias : a.persona.name.localeCompare(b.persona.name, 'es')))
}

/** "8 años", "1 año". */
export function edadEnPalabras(edad: number): string {
  return edad === 1 ? '1 año' : `${edad} años`
}

/**
 * El cumpleaños de hoy dicho en una frase, para el aviso de las siete. Vacía si
 * hoy no cumple nadie.
 *
 * Con una sola persona se dice la edad, que es lo que se felicita; con varias
 * no, porque la frase se hace ilegible y lo que hay que saber es que hoy toca
 * acordarse de ellas.
 */
export function fraseDeCumples(cumples: Cumple[]): string {
  if (cumples.length === 0) return ''
  if (cumples.length === 1) {
    const [cumple] = cumples
    return `Hoy ${cumple.persona.name} cumple ${edadEnPalabras(cumple.edad)}.`
  }
  const nombres = cumples.map(c => c.persona.name)
  return `Hoy cumplen años ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}.`
}
