import { eventColor, resolveAssignee } from '@/lib/assignees'
import { FAMILY_COLOR } from '@/lib/constants'
import { isPlan } from '@/lib/events'
import type { Child, Event, EventKind, FamilyMember, Task } from '@/types'

/**
 * El indicador mínimo de qué hay un día. Lo comparten la tira de siete días y
 * las celdas del mes, que son las dos vistas que solo sirven para navegar: ahí
 * la pregunta es "¿pasa algo este día?" y el detalle vive en la agenda.
 *
 * Los puntos van siempre en `aria-hidden` y el recuento en palabras viaja en la
 * etiqueta del botón del día. El color dice de quién es, pero nunca es la única
 * forma de saber que el día tiene algo.
 */

/**
 * Cuántas marcas se pintan, como mucho.
 *
 * **Tres, sin "+n" detrás, desde el 28-09-2026**, cuando las marcas pasaron a ser
 * una por persona y no una por cosa: en una casa de cuatro, tres puntos ya dicen
 * casi siempre quién tiene algo, y el "+2" a 9 px —el texto más pequeño de la
 * pantalla— hacía que cada fila de puntos midiera distinto. Cuántas cosas hay lo
 * dice la etiqueta del botón del día, y el panel de debajo al tocarlo.
 *
 * Lo que sigue es la historia de antes, cuando las ausencias en móvil tenían su
 * propia fila y no una línea encima:
 *
 * **Dos** (24-08-2026, antes tres). Debajo del número caben dos filas de señales
 * —esta y la de ausencias— y con tres puntos de 6 px más sus huecos la fila
 * medía 24 px de los ~52 de la columna: la celda volvía a ser un resumen del
 * día, que es lo que la agenda vino a quitarle. Con dos, "¿pasa algo aquí?" se
 * contesta igual y "¿cuántas cosas?" lo dice el "+n" de detrás, que es más
 * exacto que contar puntos.
 */
const MAX_MARCAS = 3

/** Una marca del día: de quién es y si es un plan o una tarea. */
export interface Marca {
  color: string
  tarea: boolean
}

/**
 * Quién tiene algo un día: primero los planes y después las tareas que vencen
 * ese día, **una marca por persona y clase** (28-09-2026).
 *
 * Era una por cosa, y dos planes de María eran dos puntos iguales que no decían
 * nada que uno no dijera. Ahora el punto contesta "¿quién tiene algo?" y la
 * forma, "¿algo que pasa o algo que hacer?": los planes son un círculo y las
 * tareas un cuadrado, porque en una celda de 52 px el color solo no basta para
 * separar dos clases.
 *
 * Las **ausencias** —vacaciones y descansos— se quedan fuera a propósito. No son
 * planes: son quién no está, y eso lo dice el tinte del día y, con nombres, el
 * bloque de "Vacaciones y descansos". Contarlas también como punto pintaría la
 * misma cosa dos veces, y en un tramo de una semana, siete veces.
 */
export function marcasDelDia(
  events: Event[],
  tasks: Task[],
  members: FamilyMember[],
  kids: Child[],
): Marca[] {
  const todas: Marca[] = [
    // Los festivos tampoco cuentan como punto. No son un plan del día y no son de
    // nadie, así que un punto de color mentiría dos veces; de que el día es
    // festivo ya avisa la trama de la celda. Es la misma regla que las ausencias.
    ...events.filter(isPlan).map(e => ({ color: eventColor(e, members, kids), tarea: false })),
    // Una tarea no tiene color propio en la base, así que se pinta con el de
    // quien la lleva y, si no es de nadie, con el de la familia. Es la misma
    // cadena que `eventColor` aplica a los eventos.
    ...tasks.map(t => ({ color: resolveAssignee(t, members, kids)?.color ?? FAMILY_COLOR, tarea: true })),
  ]
  const vistas = new Set<string>()
  return todas.filter(m => {
    const clave = `${m.tarea ? 't' : 'p'}${m.color}`
    if (vistas.has(clave)) return false
    vistas.add(clave)
    return true
  })
}

/**
 * Lo que hay un día, en palabras, para la etiqueta accesible del día.
 *
 * Separa planes de tareas en vez de sumarlos: "2 planes, 1 tarea" dice más que
 * "3 cosas", y son dos clases distintas —una pasa, la otra se hace—.
 */
export function resumenDelDia({ planes, tareas, vacaciones, descansos, familia }: {
  planes: number
  tareas: number
  /**
   * Cuántas personas están de vacaciones ese día **que la franja de la casa no
   * cuente ya**. Con la casa entera fuera, sus adultos con cuenta se dicen una
   * vez en `familia` y no vuelven aquí; quien no tiene cuenta —la abuela, un
   * hijo— nunca entró en esa cuenta y sí.
   */
  vacaciones: number
  /** Lo mismo, para quien descansa. */
  descansos: number
  /**
   * El tipo de ausencia cuando **no queda nadie**: todos los adultos con cuenta
   * fuera y por lo mismo. Lo decide `familyAbsenceKind`.
   */
  familia?: EventKind | null
}): string {
  const partes: string[] = []
  if (planes > 0) partes.push(`${planes} plan${planes === 1 ? '' : 'es'}`)
  if (tareas > 0) partes.push(`${tareas} tarea${tareas === 1 ? '' : 's'}`)
  if (familia) {
    // Sin nadie en casa se dice una vez y en palabras, no contando cabezas:
    // "3 de vacaciones" obliga a saberse cuántos adultos hay para entender que
    // están todos, que es justo lo que hay que decir. Es lo mismo que hace la
    // franja amarilla, dicho para quien no la ve.
    partes.push(familia === 'vacaciones' ? 'la familia de vacaciones' : 'la familia descansando')
  }
  // Y **después** quien está fuera aparte de ellos, que hasta el 12-09-2026 iba
  // en un `else` y se perdía entero: con la casa de descanso, el de la abuela no
  // se decía ni aquí ni en la celda. "1 más" porque viene detrás de la casa; sin
  // ella es el recuento de siempre.
  //
  // Las ausencias se dicen con número: el tinte avisa de que hay alguien fuera,
  // pero no de cuántos, y el color de la celda ya no es de nadie en concreto.
  const mas = familia ? ' más' : ''
  if (vacaciones > 0) partes.push(`${vacaciones}${mas} de vacaciones`)
  if (descansos > 0) partes.push(`${descansos}${mas} descansando`)
  return partes.length > 0 ? partes.join(', ') : 'sin planes'
}

export function DayActivity({ marcas }: { marcas: Marca[] }) {
  // El hueco se reserva aunque no haya nada: si no, los días con algo quedan
  // más altos que los demás y la tira se descuadra fila a fila.
  if (marcas.length === 0) return <span className="block h-3" aria-hidden />

  /**
   * Tres marcas de 7 px y ninguna cuenta detrás: son 27 px de los ~52 de la
   * celda a 390 px. El anillo se queda, y no por adorno: los colores de persona
   * están en L* 71-88 y sin él un punto champán sobre blanco no se ve.
   */
  return (
    <span className="flex h-3 items-center justify-center gap-[3px]" aria-hidden>
      {marcas.slice(0, MAX_MARCAS).map((marca, i) => (
        <span
          key={i}
          className={`h-[7px] w-[7px] flex-shrink-0 ring-1 ring-ink/15 ${marca.tarea ? 'rounded-[1px]' : 'rounded-full'}`}
          style={{ backgroundColor: marca.color }}
        />
      ))}
    </span>
  )
}
