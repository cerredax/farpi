import { useState } from 'react'
import { format, isPast, isToday, isTomorrow, parseISO, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { Cake, ChevronDown } from 'lucide-react'
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
 * Y **los que ya pasaron se pliegan aparte** (12-09-2026). Estuvieron atenuados
 * al 55 % desde el 05-09-2026, y en un mes por la mitad eso deja la lista llena
 * de filas que no se leen ni se van: el día 12 de un septiembre normal, dos de
 * cada tres cumpleaños del mes ya han pasado y se llevan dos tercios del bloque.
 *
 * Esconderlos del todo no vale, y esa es la parte que sigue siendo verdad del
 * 05-09-2026: el recuento del título bajaría solo según avanza el mes —"3" el
 * día 1 y "1" el día 20, como si alguien los hubiera borrado—, el bloque dejaría
 * de decir la verdad sobre el mes que se está mirando, y en un mes pasado se
 * quedaría vacío, que con `cumples.length === 0` es desaparecer entero. Y
 * "¿cuándo fue el cumple de la abuela?" es una pregunta legítima.
 *
 * Así que se pliegan, no se van: el título sigue contándolos **todos**, arriba
 * quedan los que quedan por venir y una línea al final dice cuántos pasaron y
 * los despliega. En un mes que no es el de hoy no hay nada que separar —o son
 * todos pasados o todos futuros— y la lista sale entera, como siempre.
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

/** Si un cumpleaños ya pasó. Hoy no cuenta: hoy es para felicitar. */
function yaPaso(cumple: Event): boolean {
  const fecha = parseISO(extractDate(cumple.start_at))
  return isPast(startOfDay(fecha)) && !isToday(fecha)
}

/**
 * Una fila: la tarta, de quién es el cumpleaños y cuándo.
 *
 * El `apagado` es lo que queda de la atenuación del 05-09-2026. Ya no le toca a
 * los del mes en curso —esos se pliegan— pero sí a los de un mes que ya terminó:
 * ahí no hay nada que separar, salen todos, y el gris dice de un vistazo que ese
 * mes es pasado sin quitar ninguna fila.
 */
function FilaCumple({ cumple, kids, members, onEdit, apagado }: {
  cumple: Event
  kids: Child[]
  members: FamilyMember[]
  onEdit: (event: Event) => void
  apagado: boolean
}) {
  const fecha = parseISO(extractDate(cumple.start_at))
  // La edad solo si la sabemos: de quien no es de la casa casi nunca hay año de
  // nacimiento, y "Abuela Carmen · el 12 sept" ya sirve para acordarse, que es
  // para lo que está el bloque.
  const edad = cumple.birth_year
    ? `, ${edadEnPalabras(fecha.getFullYear() - cumple.birth_year)}`
    : ''

  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(cumple)}
        aria-label={`Editar el cumpleaños de ${cumple.title}: ${cuando(fecha)}${edad}`}
        className={`flex min-h-8 w-full items-center gap-2 rounded-xl px-1 text-left transition-colors hover:bg-surface ${
          // El fondo de color de la etiqueta se queda: es lo que dice que el lila
          // es un cumpleaños y no una persona. Lo que baja es el conjunto, que es
          // lo que se lee como "esto ya pasó".
          apagado ? 'opacity-55' : ''
        }`}
      >
        <Cake size={13} strokeWidth={2.2} className="flex-shrink-0 text-muted" aria-hidden />
        {/* El nombre sobre el lila de los cumpleaños, y no sobre el amarillo de la
            familia: la abuela no es de la casa —no está dada de alta a propósito—
            y decir "Familia" ahí la metía en ella por la puerta de atrás. Es la
            etiqueta que faltaba: ni una persona ni la familia, un cumpleaños. */}
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
}

export function Birthdays({ cumples, kids, members, onEdit }: BirthdaysProps) {
  const [verPasados, setVerPasados] = useState(false)

  if (cumples.length === 0) return null

  /**
   * El corte solo tiene sentido en el mes de hoy.
   *
   * En un mes que ya terminó, "los que quedan" es la lista vacía y "los que
   * pasaron" es la lista entera: el bloque se anunciaría con cero y escondería
   * todo detrás de una línea. En uno futuro no ha pasado ninguno. En los dos
   * casos la lista sale entera y es el `apagado` el que dice si el mes es
   * pasado, que es lo que hacía desde el 05-09-2026.
   */
  const pasados = cumples.filter(yaPaso)
  const proximos = cumples.filter(c => !yaPaso(c))
  const hayCorte = pasados.length > 0 && proximos.length > 0

  return (
    // El título los cuenta **todos**, pasados incluidos: es el recuento del mes y
    // no puede bajar solo según avanzan los días. Ese fue el motivo por el que
    // esconderlos se revirtió el 05-09-2026.
    <SeccionPlegable titulo="Cumpleaños" cuantos={cumples.length}>
      <ul>
        {(hayCorte ? proximos : cumples).map(cumple => (
          <FilaCumple
            key={cumple.id}
            cumple={cumple}
            kids={kids}
            members={members}
            onEdit={onEdit}
            apagado={!hayCorte && yaPaso(cumple)}
          />
        ))}
      </ul>

      {hayCorte && (
        <>
          {/* Al final y no arriba: lo que viene es lo que se busca, y lo que pasó
              se consulta. El orden por fecha se respeta dentro de cada lista. */}
          <button
            type="button"
            onClick={() => setVerPasados(v => !v)}
            aria-expanded={verPasados}
            className="flex min-h-8 w-full items-center gap-1 rounded-xl px-1 text-left text-[11px] font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <ChevronDown
              size={13}
              strokeWidth={2.4}
              className={`flex-shrink-0 transition-transform ${verPasados ? 'rotate-180' : ''}`}
              aria-hidden
            />
            {pasados.length === 1 ? '1 que ya pasó' : `${pasados.length} que ya pasaron`}
          </button>

          {verPasados && (
            <ul>
              {pasados.map(cumple => (
                <FilaCumple
                  key={cumple.id}
                  cumple={cumple}
                  kids={kids}
                  members={members}
                  onEdit={onEdit}
                  apagado
                />
              ))}
            </ul>
          )}
        </>
      )}
    </SeccionPlegable>
  )
}
