import { Cake } from 'lucide-react'
import { memo } from 'react'
import { textColorOn } from '@/lib/assignees'
import { edadEnPalabras, type Cumple } from '@/lib/birthdays'
import type { Child } from '@/types'

interface TodayBirthdaysProps {
  cumples: Cumple<Child>[]
}

/**
 * El cumpleaños de hoy, arriba del todo de la tarjeta de hoy.
 *
 * Va por delante de los planes y no en un bloque aparte más abajo porque es lo
 * único de la pantalla que **caduca el mismo día**: una cita se recupera por la
 * tarde, un cumpleaños que se ve a las once de la noche ya no se felicita. Por
 * eso también lleva la tarta y el color de la persona en vez de una fila gris
 * más: en una pantalla de listas, lo que se celebra tiene que verse distinto.
 */
export const TodayBirthdays = memo(function TodayBirthdays({ cumples }: TodayBirthdaysProps) {
  if (cumples.length === 0) return null

  return (
    <div className="space-y-2">
      {cumples.map(({ persona, edad }) => (
        <div
          key={persona.id}
          className="flex items-center gap-2.5 rounded-3xl border border-white bg-white/80 px-4 py-2.5 shadow-sm"
        >
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: persona.color, color: textColorOn(persona.color) }}
          >
            <Cake size={16} strokeWidth={2.4} aria-hidden />
          </span>
          <p className="min-w-0 text-sm font-bold leading-snug text-ink">
            Hoy {persona.name} cumple {edadEnPalabras(edad)}
          </p>
        </div>
      ))}
    </div>
  )
})
