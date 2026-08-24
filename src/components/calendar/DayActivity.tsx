import { eventColor, resolveAssignee } from '@/lib/assignees'
import { FAMILY_COLOR } from '@/lib/constants'
import { isVacation } from '@/lib/events'
import type { Child, Event, FamilyMember, Task } from '@/types'

/**
 * El indicador mínimo de qué hay un día. Lo comparten la tira de siete días y
 * las celdas del mes, que son las dos vistas que solo sirven para navegar: ahí
 * la pregunta es "¿pasa algo este día?" y el detalle vive en la agenda.
 *
 * Los puntos van siempre en `aria-hidden` y el recuento en palabras viaja en la
 * etiqueta del botón del día. El color dice de quién es, pero nunca es la única
 * forma de saber que el día tiene algo.
 */

/** Hasta cuántas marcas se pintan antes de pasar al número. */
const MAX_MARCAS = 3

/**
 * Los colores de lo que ocupa un día: primero los eventos y después las tareas
 * que vencen ese día.
 *
 * Las vacaciones se quedan fuera a propósito. Tienen su propia señal —la franja
 * continua bajo el día— porque ocupan muchos días seguidos, y contarlas como un
 * punto más pintaría la misma cosa dos veces en cada día del tramo.
 */
export function marcasDelDia(
  events: Event[],
  tasks: Task[],
  members: FamilyMember[],
  kids: Child[],
): string[] {
  return [
    ...events.filter(e => !isVacation(e)).map(e => eventColor(e, members, kids)),
    // Una tarea no tiene color propio en la base, así que se pinta con el de
    // quien la lleva y, si no es de nadie, con el de la familia. Es la misma
    // cadena que `eventColor` aplica a los eventos.
    ...tasks.map(t => resolveAssignee(t, members, kids)?.color ?? FAMILY_COLOR),
  ]
}

/**
 * Lo que hay un día, en palabras, para la etiqueta accesible del día.
 *
 * Separa planes de tareas en vez de sumarlos: "2 planes, 1 tarea" dice más que
 * "3 cosas", y son dos clases distintas —una pasa, la otra se hace—.
 */
export function resumenDelDia({ planes, tareas, vacaciones }: {
  planes: number
  tareas: number
  vacaciones: boolean
}): string {
  const partes: string[] = []
  if (planes > 0) partes.push(`${planes} plan${planes === 1 ? '' : 'es'}`)
  if (tareas > 0) partes.push(`${tareas} tarea${tareas === 1 ? '' : 's'}`)
  if (vacaciones) partes.push('de vacaciones')
  return partes.length > 0 ? partes.join(', ') : 'sin planes'
}

export function DayActivity({ marcas }: { marcas: string[] }) {
  // El hueco se reserva aunque no haya nada: si no, los días con algo quedan
  // más altos que los demás y la tira se descuadra fila a fila.
  if (marcas.length === 0) return <span className="block h-3" aria-hidden />

  if (marcas.length > MAX_MARCAS) {
    return (
      <span className="flex h-3 items-center justify-center text-[9px] font-black leading-none text-primary-strong" aria-hidden>
        {marcas.length}
      </span>
    )
  }

  return (
    <span className="flex h-3 items-center justify-center gap-[3px]" aria-hidden>
      {marcas.map((color, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full ring-1 ring-ink/15"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}
