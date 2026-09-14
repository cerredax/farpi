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
 * Dentro de cada persona, **cada ausencia se dice entera y en su propia
 * pastilla** (14-09-2026). Del 12 al 14-09 hubo una economía más: la segunda
 * ausencia del mismo tipo se quedaba sin verbo y sin icono, separada de la
 * anterior por un punto volado, así que dos turnos de Carlos salían como
 * "descansa el 15 sep · el 22 sep". Ahorraba una palabra y costaba la frase: "el
 * 22 sep" sin verbo delante no dice si ese día está fuera o está en casa, y
 * parecía el final de un rango que empezaba el 15. El punto, además, podía caer
 * al principio de un renglón cuando la fila se partía, que es donde se veía que
 * aquello no eran frases sino trozos.
 *
 * La economía que sí se queda es la del nombre: se dice una vez por persona, que
 * es la que ahorra el ancho de verdad. Lo demás es una pastilla por ausencia, con
 * su icono y su verbo, que envuelven solas y se leen sueltas.
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
 * De un solo día se dice cuándo: "hoy", "mañana" o la fecha. De varios, **si está
 * ocurriendo ahora** se dice hasta cuándo —lo que hace falta saber es cuándo
 * vuelve— y en los demás casos, el rango entero. El mes solo se repite cuando el
 * tramo cruza de mes, que si no "del 3 al 9 sept" ya lo dice una vez.
 *
 * Lo de "está ocurriendo ahora" hay que decirlo, y es el arreglo del 14-09-2026:
 * antes bastaba con que hubiera **empezado**, y el mes que se mira casi nunca es
 * solo el futuro. Unas vacaciones del 8 al 12 vistas el día 17 salían como "de
 * vacaciones hasta el 12 jun", que es una frase sobre alguien que sigue fuera,
 * cinco días después de haber vuelto. Y en un mes ya pasado lo eran todas. Ahora
 * una ausencia terminada dice su rango, como la que aún no ha llegado: la
 * diferencia entre las dos la pone la fecha, que está escrita.
 */
function estadoDe(event: Event): string {
  const inicio = parseISO(extractDate(event.start_at))
  const fin = parseISO(extractDate(event.end_at ?? event.start_at))
  const verbo = isVacation(event) ? 'de vacaciones ' : 'descansa '

  if (extractDate(event.start_at) === getLocalDateString(fin)) {
    if (isToday(inicio)) return `${verbo}hoy`
    if (isTomorrow(inicio)) return `${verbo}mañana`
    return `${verbo}el ${diaYMes(inicio)}`
  }

  const hoy = getLocalDateString(new Date())
  const enCurso = extractDate(event.start_at) <= hoy && getLocalDateString(fin) >= hoy
  if (enCurso) return `${verbo}hasta el ${diaYMes(fin)}`

  const desde = isSameMonth(inicio, fin) ? format(inicio, 'd', { locale: es }) : diaYMes(inicio)
  return `${verbo}del ${desde} al ${diaYMes(fin)}`
}

export function Availability({ ausencias, kids, members, onEdit }: AvailabilityProps) {
  if (ausencias.length === 0) return null

  const grupos = agruparAusenciasPorPersona(ausencias, buildAssignees(members, kids))

  return (
    <SeccionPlegable titulo="Vacaciones y descansos">
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
                esa ausencia concreta.

                `gap-1` y no `gap-x-1`: al partirse la fila hacen falta los dos
                huecos, y sin el vertical las pastillas de la segunda línea se
                pegaban a las de la primera. */}
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {suyas.map(a => {
                // Un sillón y no una taza: un descanso no es una pausa para el
                // café, es que ese día no puedes contar con esa persona. Y a 13 px
                // una taza y una palmera se confunden.
                const Icono = isVacation(a) ? Palmtree : Armchair
                const estado = estadoDe(a)

                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onEdit(a)}
                    // La etiqueta accesible dice la frase entera, con el nombre:
                    // fuera de la fila, "descansa el 22 sep" no dice de quién es.
                    aria-label={`Editar ${a.title}: ${persona.name} ${estado}`}
                    // El fondo es lo que separa una pastilla de la siguiente
                    // ahora que no hay punto volado entre ellas: dos frases
                    // seguidas sobre el blanco se leían como una sola.
                    className="flex min-h-8 items-center gap-1 rounded-xl bg-surface px-1.5 text-left text-[11px] text-muted transition-colors hover:bg-line hover:text-ink"
                  >
                    <Icono size={13} strokeWidth={2.2} className="flex-shrink-0" aria-hidden />
                    {estado}
                  </button>
                )
              })}
            </span>
          </li>
        ))}
      </ul>
    </SeccionPlegable>
  )
}
