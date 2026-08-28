import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { memo } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import { fondoDePersona } from '@/lib/assignees'
import { edadEnPalabras, type CumpleEnCasa } from '@/lib/birthdays'
import { parseLocalDate } from '@/lib/date-utils'
import { capitalize } from '@/lib/text'

interface UpcomingBirthdaysProps {
  cumples: CumpleEnCasa[]
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
 * El pie lleva a donde se arregla lo que se ve: a Ajustes, que es donde vive la
 * fecha de nacimiento de la casa, o al calendario cuando todo lo del bloque son
 * cumpleaños apuntados. Un pie fijo dejaba sin salida el caso de la familia que
 * solo apunta cumpleaños de fuera.
 */
export const UpcomingBirthdays = memo(function UpcomingBirthdays({ cumples }: UpcomingBirthdaysProps) {
  if (cumples.length === 0) return null

  // El pie lleva a donde se cambia lo que se está viendo. Si todos vienen del
  // calendario —la abuela, el amigo del cole—, mandar a Ajustes es un callejón:
  // allí no está ninguno, y desde Inicio no habría forma de corregir una fecha.
  const soloApuntados = cumples.every(c => c.apuntado)

  return (
    <HomeSection
      label="Cumpleaños"
      footer={soloApuntados
        ? <SectionLink href="/calendar">Ver calendario</SectionLink>
        : <SectionLink href="/settings">Ver la familia</SectionLink>}
    >
      <ul className="divide-y divide-hairline">
        {cumples.map(({ id, nombre, fecha, edad, dias, color }) => (
          <li key={id} className="flex items-baseline gap-2 px-4 py-3">
            <span className="text-xs font-bold text-primary">{diaDeCumple(fecha, dias)}</span>
            {/* El nombre sobre su color, como en la agenda: de quién es algo se
                dice igual en toda la app. Quien no es de la casa no tiene color,
                y va sobre el gris de la app: el color significa "de quién es
                esto" y aquí no es de nadie. */}
            <span
              className={`etiqueta-persona min-w-0 max-w-[7rem] px-1 py-px text-[11px] ${color ? '' : 'bg-line'}`}
              style={color ? { backgroundColor: fondoDePersona(color) } : undefined}
            >
              {nombre}
            </span>
            {/* Sin año de nacimiento no hay edad que decir, y "cumple años" a
                secas es ruido: la fila ya dice el día y de quién. */}
            {edad !== null && (
              <span className="ml-auto flex-shrink-0 text-xs font-semibold text-muted">
                cumple {edadEnPalabras(edad)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </HomeSection>
  )
})
