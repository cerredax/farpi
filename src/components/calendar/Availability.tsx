import { format, isSameMonth, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Armchair, Palmtree } from 'lucide-react'
import { extractDate, getLocalDateString } from '@/lib/date-utils'
import { fondoDePersona, resolveAssignee } from '@/lib/assignees'
import { isVacation } from '@/lib/events'
import { FAMILY_COLOR } from '@/lib/constants'
import { SeccionPlegable } from './SeccionPlegable'
import type { Event, Child, FamilyMember } from '@/types'

/**
 * Quién está de vacaciones o de descanso en el tramo que se ve.
 *
 * Es **la** fuente de esta información, y la rejilla solo orienta: la raya bajo el
 * día dice que alguien no está y aquí se dice quién, de qué clase y hasta cuándo.
 * Antes esto era `VacationLegend`, hablaba solo de vacaciones y traducía una
 * franja de color a un nombre; los descansos no tenían dónde explicarse y
 * acababan como una fila más de la agenda, repetida en cada día de su rango.
 *
 * Una ausencia aparece **una vez**, con su rango, por larga que sea. Es la
 * diferencia con un plan: un plan ocurre un día, una ausencia dura.
 *
 * El nombre va siempre escrito. El punto de color acompaña —es el idioma de la
 * app— pero no es la única forma de saber de quién es, que era el problema de la
 * franja: había que saberse la paleta de memoria.
 */

interface AvailabilityProps {
  /** Vacaciones y descansos que pisan el tramo visible, en orden de fecha. */
  ausencias: Event[]
  kids: Child[]
  members: FamilyMember[]
  onEdit: (event: Event) => void
}

/** "15 ago". El mes abreviado porque la fila es estrecha y se lee igual. */
function diaYMes(fecha: Date): string {
  return format(fecha, 'd MMM', { locale: es })
}

/**
 * En qué estado deja a alguien una ausencia, dicho como se diría en casa.
 *
 * De un solo día se dice cuándo: "hoy", "mañana" o la fecha. De varios, si ya ha
 * empezado se dice hasta cuándo —lo que hace falta saber es cuándo vuelve— y si
 * no, el rango entero. El mes solo se repite cuando el tramo cruza de mes, que
 * si no "del 3 al 9 sept" ya lo dice una vez.
 */
function estadoDe(event: Event): string {
  const inicio = parseISO(extractDate(event.start_at))
  const fin = parseISO(extractDate(event.end_at ?? event.start_at))
  const verbo = isVacation(event) ? 'de vacaciones' : 'descansa'

  if (extractDate(event.start_at) === getLocalDateString(fin)) {
    if (isToday(inicio)) return `${verbo} hoy`
    if (isTomorrow(inicio)) return `${verbo} mañana`
    return `${verbo} el ${diaYMes(inicio)}`
  }

  const empezado = extractDate(event.start_at) <= getLocalDateString(new Date())
  if (empezado) return `${verbo} hasta el ${diaYMes(fin)}`

  const desde = isSameMonth(inicio, fin) ? format(inicio, 'd', { locale: es }) : diaYMes(inicio)
  return `${verbo} del ${desde} al ${diaYMes(fin)}`
}

export function Availability({ ausencias, kids, members, onEdit }: AvailabilityProps) {
  if (ausencias.length === 0) return null

  return (
    <SeccionPlegable titulo="Vacaciones y descansos" cuantos={ausencias.length}>
      <ul>
        {ausencias.map(a => {
          const asignado = resolveAssignee(a, members, kids)
          const color = a.color ?? asignado?.color ?? FAMILY_COLOR
          const quien = asignado?.name ?? 'Familia'
          const estado = estadoDe(a)
          // Un sillón y no una taza: un descanso no es una pausa para el café,
          // es que ese día no puedes contar con esa persona. Y a 13 px una taza
          // y una palmera se confunden.
          const Icono = isVacation(a) ? Palmtree : Armchair

          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onEdit(a)}
                aria-label={`Editar ${a.title}: ${quien} ${estado}`}
                className="flex min-h-8 w-full items-center gap-2 rounded-xl px-1 text-left transition-colors hover:bg-surface"
              >
                <Icono size={13} strokeWidth={2.2} className="flex-shrink-0 text-muted" aria-hidden />
                {/* El nombre se lleva el color al fondo, como en la celda del mes
                    (26-08-2026). Antes iba en negro con un punto de color al lado,
                    y eran dos cosas que mirar para decir una: quién. Al 50 %, la
                    rebaja de siempre, que es la que deja leer la tinta encima. */}
                <span className="min-w-0 truncate text-[11px]">
                  <span
                    className="etiqueta-persona px-1 py-px"
                    style={{ backgroundColor: fondoDePersona(color) }}
                  >
                    {quien}
                  </span>
                  <span className="text-muted"> · {estado}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </SeccionPlegable>
  )
}
