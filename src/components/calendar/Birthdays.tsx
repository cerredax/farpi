import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Cake } from 'lucide-react'
import { extractDate } from '@/lib/date-utils'
import { eventColor, fondoDePersona } from '@/lib/assignees'
import { edadEnPalabras } from '@/lib/birthdays'
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
    <div className="border-t border-hairline px-3 py-2">
      <h2 className="px-1 pb-1 text-xs font-bold uppercase tracking-widest text-muted">
        Cumpleaños
      </h2>
      <ul>
        {cumples.map(cumple => {
          const fecha = parseISO(extractDate(cumple.start_at))
          // La edad solo si la sabemos: de quien no es de la casa casi nunca hay
          // año de nacimiento, y "Abuela Carmen · el 12 sept" ya sirve para
          // acordarse, que es para lo que está el bloque.
          const edad = cumple.birth_year
            ? `, ${edadEnPalabras(fecha.getFullYear() - cumple.birth_year)}`
            : ''

          return (
            <li key={cumple.id}>
              <button
                type="button"
                onClick={() => onEdit(cumple)}
                aria-label={`Editar el cumpleaños de ${cumple.title}: ${cuando(fecha)}${edad}`}
                className="flex min-h-8 w-full items-center gap-2 rounded-xl px-1 text-left transition-colors hover:bg-surface"
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
    </div>
  )
}
