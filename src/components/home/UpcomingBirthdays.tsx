'use client'

import { memo } from 'react'
import { PartyPopper } from 'lucide-react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import { agrupaCumplesPorDia, diaDeCumple, type CumpleEnCasa } from '@/lib/birthdays'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'

interface UpcomingBirthdaysProps {
  cumples: CumpleEnCasa[]
  /** Abre el cumpleaños para cambiarlo. Qué formulario sale lo decide Inicio. */
  onOpen: (cumple: CumpleEnCasa) => void
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
export const UpcomingBirthdays = memo(function UpcomingBirthdays({ cumples, onOpen }: UpcomingBirthdaysProps) {
  const t = useT()
  const locale = localeDeFechas(useIdioma())
  if (cumples.length === 0) return null

  // El pie lleva a donde se cambia lo que se está viendo. Si todos vienen del
  // calendario —la abuela, el amigo del cole—, mandar a Ajustes es un callejón:
  // allí no está ninguno, y desde Inicio no habría forma de corregir una fecha.
  const soloApuntados = cumples.every(c => c.apuntado)

  return (
    <HomeSection
      label={t.inicio.cumples.titulo}
      icon={PartyPopper}
      accentColor="#D96C6C"
      footer={soloApuntados
        ? <SectionLink href="/calendar">{t.inicio.verCalendario}</SectionLink>
        : <SectionLink href="/settings">{t.inicio.cumples.verLaFamilia}</SectionLink>}
    >
      {/* Un grupo por día (26-10-2026): si cumplen dos el mismo, el día se dice una
          vez y los nombres van debajo uno de otro. */}
      <ul className="divide-y divide-hairline">
        {agrupaCumplesPorDia(cumples).map(({ fecha, dias, cumples: delDia }) => (
          <li key={fecha} className="flex items-start gap-2 px-4">
            <span className="flex min-h-11 w-20 flex-shrink-0 items-center text-xs font-bold text-primary-strong">
              {diaDeCumple(fecha, dias, t.cumpleanos, locale)}
            </span>
            <ul className="min-w-0 flex-1">
              {delDia.map(cumple => (
                <li key={cumple.id}>
                  {/* Se toca para cambiarlo, y `min-h-11` son los 44 px del criterio
                      de la casa. El nombre va en texto corriente, no en la etiqueta
                      de persona que usan la agenda o las tareas: ahí el color
                      contesta "¿de quién es esto?" entre cosas de varios; aquí la
                      fila entera **es** la persona. */}
                  <button
                    type="button"
                    onClick={() => onOpen(cumple)}
                    aria-label={t.cumpleanos.editarElDe(cumple.nombre)}
                    className="flex min-h-11 w-full items-center gap-2 text-left"
                  >
                    <span translate="no" className="min-w-0 truncate text-sm font-semibold text-ink">{cumple.nombre}</span>
                    {/* Sin año de nacimiento no hay edad que decir, y "cumple años" a
                        secas es ruido: la fila ya dice el día y de quién. */}
                    {cumple.edad !== null && (
                      <span className="ml-auto flex-shrink-0 text-xs font-semibold text-muted">
                        {t.cumpleanos.cumpleEdad(cumple.edad)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </HomeSection>
  )
})
