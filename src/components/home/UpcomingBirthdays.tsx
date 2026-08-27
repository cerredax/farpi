import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { memo } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import { fondoDePersona } from '@/lib/assignees'
import { edadEnPalabras, type Cumple } from '@/lib/birthdays'
import { parseLocalDate } from '@/lib/date-utils'
import { capitalize } from '@/lib/text'
import type { Child } from '@/types'

interface UpcomingBirthdaysProps {
  cumples: Cumple<Child>[]
}

/** "Mañana", "Jue 4 sept". Lo mismo que hace "Esta semana" con los planes. */
function diaDeCumple(fecha: string, dias: number): string {
  if (dias === 1) return 'Mañana'
  return capitalize(format(parseLocalDate(fecha), 'EEE d MMM', { locale: es }))
}

/**
 * Los cumpleaños que vienen, sin contar el de hoy: ese es el titular de la
 * tarjeta de arriba y aquí sería decirlo dos veces.
 *
 * El bloque no se pinta si no hay ninguno a la vista. Es la regla de "Esta
 * semana": una tarjeta que dice "no hay cumpleaños" ocupa lo mismo que una con
 * contenido y no se contesta nada con ella. Y por eso mismo tampoco tiene estado
 * vacío para la familia que aún no ha puesto fechas de nacimiento: Inicio no es
 * el sitio donde se reclaman datos.
 *
 * El pie lleva a Ajustes y no al calendario, que es donde de verdad se cambia
 * una fecha de nacimiento: un cumpleaños no se apunta, se deduce de la persona.
 */
export const UpcomingBirthdays = memo(function UpcomingBirthdays({ cumples }: UpcomingBirthdaysProps) {
  if (cumples.length === 0) return null

  return (
    <HomeSection label="Cumpleaños" footer={<SectionLink href="/settings">Ver la familia</SectionLink>}>
      <ul className="divide-y divide-hairline">
        {cumples.map(({ persona, fecha, edad, dias }) => (
          <li key={persona.id} className="flex items-baseline gap-2 px-4 py-3">
            <span className="text-xs font-bold text-primary">{diaDeCumple(fecha, dias)}</span>
            {/* El nombre sobre su color, como en la agenda: de quién es algo se
                dice igual en toda la app. */}
            <span
              className="etiqueta-persona min-w-0 max-w-[7rem] px-1 py-px text-[11px]"
              style={{ backgroundColor: fondoDePersona(persona.color) }}
            >
              {persona.name}
            </span>
            <span className="ml-auto flex-shrink-0 text-xs font-semibold text-muted">
              cumple {edadEnPalabras(edad)}
            </span>
          </li>
        ))}
      </ul>
    </HomeSection>
  )
})
