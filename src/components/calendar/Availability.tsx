import { Fragment } from 'react'
import { format, isSameMonth, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Armchair, Palmtree } from 'lucide-react'
import { extractDate, getLocalDateString } from '@/lib/date-utils'
import { buildAssignees, fondoDePersona } from '@/lib/assignees'
import { agruparAusenciasPorPersona } from '@/lib/agenda'
import { isVacation } from '@/lib/events'
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
 *
 * Y va escrito **una vez por persona**, no una por ausencia (12-09-2026). El
 * bloque iba por orden de fecha, así que un mes con turnos daba siete filas con
 * "Carlos" en tres de ellas y "Abuela" en dos: el nombre es lo que más ancho
 * ocupa de la fila y era justo lo que se repetía. Agrupado son tres filas y la
 * pregunta del bloque —"¿con quién puedo contar?"— se lee de un tirón, que es
 * como se piensa en casa: por personas, no por fechas.
 *
 * Lo que **no** cambia: cada ausencia sigue siendo la suya y sigue abriéndose
 * para editarla. Agrupar mueve el rótulo, no fusiona eventos. Y el orden de las
 * personas es el de toda la app —familia, adultos, hijos— porque lo pone
 * `buildAssignees` y este bloque no inventa uno propio.
 *
 * Dentro de cada persona, la segunda ausencia del mismo tipo no repite el verbo:
 * "descansa el 15 sep · el 22 sep" y no "descansa el 15 sep · descansa el 22
 * sep". Es la misma economía que el nombre, una línea más abajo.
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
function estadoDe(event: Event, sinVerbo = false): string {
  const inicio = parseISO(extractDate(event.start_at))
  const fin = parseISO(extractDate(event.end_at ?? event.start_at))
  // Sin verbo cuando la ausencia de al lado ya lo dijo: "descansa el 15 sep ·
  // el 22 sep". La etiqueta accesible siempre lo pide entero, que ahí no hay
  // vecina que lo haya dicho.
  const verbo = sinVerbo ? '' : (isVacation(event) ? 'de vacaciones ' : 'descansa ')

  if (extractDate(event.start_at) === getLocalDateString(fin)) {
    if (isToday(inicio)) return `${verbo}hoy`
    if (isTomorrow(inicio)) return `${verbo}mañana`
    return `${verbo}el ${diaYMes(inicio)}`
  }

  const empezado = extractDate(event.start_at) <= getLocalDateString(new Date())
  if (empezado) return `${verbo}hasta el ${diaYMes(fin)}`

  const desde = isSameMonth(inicio, fin) ? format(inicio, 'd', { locale: es }) : diaYMes(inicio)
  return `${verbo}del ${desde} al ${diaYMes(fin)}`
}

export function Availability({ ausencias, kids, members, onEdit }: AvailabilityProps) {
  if (ausencias.length === 0) return null

  const grupos = agruparAusenciasPorPersona(ausencias, buildAssignees(members, kids))

  return (
    <SeccionPlegable titulo="Vacaciones y descansos" cuantos={ausencias.length}>
      <ul>
        {grupos.map(({ persona, ausencias: suyas }) => (
          <li key={persona.key} className="flex items-start gap-2 px-1 py-0.5">
            {/* El nombre se lleva el color al fondo, como en la celda del mes
                (26-08-2026). Antes iba en negro con un punto de color al lado, y
                eran dos cosas que mirar para decir una: quién. Al 50 %, la rebaja
                de siempre, que es la que deja leer la tinta encima.

                `mt-1.5` lo alinea con la primera pastilla de al lado: las dos
                tienen que arrancar a la misma altura aunque los estados hagan dos
                líneas. */}
            <span
              className="etiqueta-persona mt-1.5 flex-shrink-0 px-1 py-px text-[11px]"
              style={{ backgroundColor: fondoDePersona(persona.color) }}
            >
              {persona.name}
            </span>

            {/* Los estados, en línea y con salto: en un móvil de 390 px, una
                persona con cuatro turnos ocupa dos renglones en vez de cuatro
                filas. Cada uno es su botón, que es lo que conserva poder abrir
                esa ausencia concreta. */}
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1">
              {suyas.map((a, i) => {
                // Un sillón y no una taza: un descanso no es una pausa para el
                // café, es que ese día no puedes contar con esa persona. Y a 13 px
                // una taza y una palmera se confunden.
                const Icono = isVacation(a) ? Palmtree : Armchair
                // El verbo solo la primera vez que aparece ese tipo: seguidas,
                // "descansa el 15 sep · el 22 sep" dice lo mismo con la mitad.
                const repite = i > 0 && isVacation(suyas[i - 1]) === isVacation(a)
                const estado = estadoDe(a, repite)

                return (
                  <Fragment key={a.id}>
                    {i > 0 && <span className="text-faint" aria-hidden>·</span>}
                    <button
                      type="button"
                      onClick={() => onEdit(a)}
                      // La etiqueta accesible dice la frase entera, con el nombre
                      // y con el verbo: fuera de la fila, "el 22 sep" no dice de
                      // quién es ni qué le pasa ese día.
                      aria-label={`Editar ${a.title}: ${persona.name} ${estadoDe(a, false)}`}
                      className="flex min-h-8 items-center gap-1 rounded-xl px-1 text-left text-[11px] text-muted transition-colors hover:bg-surface hover:text-ink"
                    >
                      {/* El icono solo cuando el tipo cambia: repetido en cada
                          pastilla de la misma persona sería una hilera de
                          sillones diciendo lo que ya dice la palabra. */}
                      {!repite && <Icono size={13} strokeWidth={2.2} className="flex-shrink-0" aria-hidden />}
                      {estado}
                    </button>
                  </Fragment>
                )
              })}
            </span>
          </li>
        ))}
      </ul>
    </SeccionPlegable>
  )
}
