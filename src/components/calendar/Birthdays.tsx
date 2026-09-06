import { format, isPast, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Cake } from 'lucide-react'
import { extractDate } from '@/lib/date-utils'
import { eventColor, fondoDePersona } from '@/lib/assignees'
import { edadEnPalabras } from '@/lib/birthdays'
import { SeccionPlegable } from './SeccionPlegable'
import type { Event, Child, FamilyMember } from '@/types'

/**
 * Los cumpleaños del mes que se está mirando, en su propio bloque.
 *
 * **Un cumpleaños no es un plan** (28-08-2026), y por eso ya no sale ni en la
 * rejilla ni en la agenda. Se apunta una vez y se repite veinte años, así que
 * una casa con cuatro abuelos y tres amigos del cole metía siete filas fijas al
 * mes que no son nada que hacer, entre la revisión del coche y la cena de los
 * abuelos. Antes de esto se probó un interruptor —"Ver cumpleaños", apagado por
 * defecto— y era peor: obligaba a elegir entre ver el mes o ver los cumpleaños,
 * y encendido devolvía el problema entero.
 *
 * Es el mismo razonamiento que sacó los festivos de la agenda y las ausencias de
 * las filas de cada día: lo que **es** el día se dice una vez y aparte, y la
 * lista se queda para lo que hay que hacer. Por eso este bloque vive pegado a
 * "Vacaciones y descansos", con la misma forma: son los dos vecinos del mes.
 *
 * Desde el 28-08-2026 el bloque nace **plegado** (`SeccionPlegable`), y eso no
 * es volver al interruptor de antes: aquel escondía los cumpleaños del mes
 * entero y había que elegir; esto solo pliega una lista que sigue ahí, contada
 * en su título y a un toque.
 *
 * Solo los **apuntados**. El cumpleaños de quien es de la casa se deduce de su
 * fecha de nacimiento y se dice en Inicio, que es donde hace falta; no está
 * apuntado en ninguna parte y aquí no se inventa. Está en `birthdays.ts`.
 */

interface BirthdaysProps {
  /** Cumpleaños que caen en el mes visible, en orden de fecha. */
  cumples: Event[]
  kids: Child[]
  members: FamilyMember[]
  onEdit: (event: Event) => void
}

/**
 * Cuándo es, dicho como se diría en casa: "hoy", "mañana" o la fecha. Es la
 * misma escala que usa `Availability` para una ausencia de un día, porque un
 * cumpleaños es exactamente eso: un día.
 */
function cuando(fecha: Date): string {
  if (isToday(fecha)) return 'hoy'
  if (isTomorrow(fecha)) return 'mañana'
  return `el ${format(fecha, 'd MMM', { locale: es })}`
}

export function Birthdays({ cumples, kids, members, onEdit }: BirthdaysProps) {
  if (cumples.length === 0) return null

  return (
    <SeccionPlegable titulo="Cumpleaños" cuantos={cumples.length}>
      <ul>
        {cumples.map(cumple => {
          const fecha = parseISO(extractDate(cumple.start_at))
          // La edad solo si la sabemos: de quien no es de la casa casi nunca hay
          // año de nacimiento, y "Abuela Carmen · el 12 sept" ya sirve para
          // acordarse, que es para lo que está el bloque.
          const edad = cumple.birth_year
            ? `, ${edadEnPalabras(fecha.getFullYear() - cumple.birth_year)}`
            : ''

          /**
           * Un cumpleaños que ya fue **se atenúa, no se esconde** (05-09-2026).
           *
           * Esconderlo rompía tres cosas. El recuento del título es
           * `cumples.length`, así que "Cumpleaños 5" el día 1 pasaba a "Cumpleaños
           * 2" el día 20 sin que nadie tocara nada, como si se hubieran borrado.
           * El bloque habla del **mes que se está mirando** —mismo tramo que
           * "Vacaciones y descansos"— y filtrando por pasado dejaba de decir la
           * verdad sobre ese mes. Y el calendario también se navega hacia atrás:
           * en agosto el bloque se habría quedado vacío, y con `cumples.length
           * === 0` desaparece entero, cuando "¿cuándo fue el cumple de la abuela?"
           * es una pregunta legítima.
           *
           * Atenuar no cuesta nada porque el bloque nace plegado: el ruido de un
           * cumpleaños pasado ya es cero hasta que lo abres. Y **no se reordena**:
           * el orden por fecha es lo que hace legible la lista.
           */
          const yaFue = isPast(startOfDay(fecha)) && !isToday(fecha)

          return (
            <li key={cumple.id}>
              <button
                type="button"
                onClick={() => onEdit(cumple)}
                aria-label={`Editar el cumpleaños de ${cumple.title}: ${cuando(fecha)}${edad}`}
                className={`flex min-h-8 w-full items-center gap-2 rounded-xl px-1 text-left transition-colors hover:bg-surface ${
                  // El fondo de color de la etiqueta se queda: es lo que dice que
                  // el lila es un cumpleaños y no una persona. Lo que baja es el
                  // conjunto, que es lo que se lee como "esto ya pasó".
                  yaFue ? 'opacity-55' : ''
                }`}
              >
                <Cake size={13} strokeWidth={2.2} className="flex-shrink-0 text-muted" aria-hidden />
                {/* El nombre sobre el lila de los cumpleaños, y no sobre el
                    amarillo de la familia: la abuela no es de la casa —no está
                    dada de alta a propósito— y decir "Familia" ahí la metía en
                    ella por la puerta de atrás. Es la etiqueta que faltaba: ni
                    una persona ni la familia, un cumpleaños. */}
                <span className="min-w-0 truncate text-[11px]">
                  <span
                    className="etiqueta-persona px-1 py-px"
                    style={{ backgroundColor: fondoDePersona(eventColor(cumple, members, kids)) }}
                  >
                    {cumple.title}
                  </span>
                  <span className="text-muted"> · {cuando(fecha)}{edad}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </SeccionPlegable>
  )
}
