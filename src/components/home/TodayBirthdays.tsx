'use client'

import { Cake } from 'lucide-react'
import { memo } from 'react'
import { textColorOn } from '@/lib/assignees'
import { useT } from '@/lib/i18n/contexto'
import type { CumpleEnCasa } from '@/lib/birthdays'

interface TodayBirthdaysProps {
  cumples: CumpleEnCasa[]
  /** Abre el cumpleaños para cambiarlo. Qué formulario sale lo decide Inicio. */
  onOpen: (cumple: CumpleEnCasa) => void
}

/**
 * El cumpleaños de hoy, arriba del todo de la tarjeta de hoy.
 *
 * Va por delante de los planes y no en un bloque aparte más abajo porque es lo
 * único de la pantalla que **caduca el mismo día**: una cita se recupera por la
 * tarde, un cumpleaños que se ve a las once de la noche ya no se felicita. Por
 * eso también lleva la tarta y el color de la persona en vez de una fila gris
 * más: en una pantalla de listas, lo que se celebra tiene que verse distinto.
 *
 * De quien no es de la casa no hay color ni, casi siempre, edad: la tarta va en
 * el color de la app y la frase se queda en el nombre. Decir "hoy es el cumple
 * de la abuela Carmen" ya es todo lo que hay que saber hoy.
 *
 * **Si hoy cumplen varios, es una sola tarjeta** (26-10-2026) con una fila por
 * persona. Antes eran tantas tarjetas como cumpleaños, cada una con su tarta y su
 * frase entera, y con tres el bloque se comía media pantalla antes del primer
 * plan. Con uno solo se queda como estaba: la frase completa, que felicita.
 *
 * **Se tocan**, y la tarjeta o la fila entera es el botón: cambiar la fecha o el
 * año es lo que se hace cuando algo está mal escrito.
 */
export const TodayBirthdays = memo(function TodayBirthdays({ cumples, onOpen }: TodayBirthdaysProps) {
  const t = useT()
  if (cumples.length === 0) return null

  const tarjeta = 'rounded-3xl border border-white bg-white/80 shadow-sm'

  if (cumples.length === 1) {
    const [cumple] = cumples
    const { nombre, edad, color } = cumple
    return (
      <button
        type="button"
        onClick={() => onOpen(cumple)}
        aria-label={t.cumpleanos.editarElDe(nombre)}
        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left ${tarjeta}`}
      >
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl ${color ? '' : 'bg-primary-strong text-white'}`}
          style={color ? { backgroundColor: color, color: textColorOn(color) } : undefined}
        >
          <Cake size={16} strokeWidth={2.4} aria-hidden />
        </span>
        <p className="min-w-0 text-sm font-bold leading-snug text-ink">
          {edad === null
            ? t.inicio.cumpleHoy.deNombre(nombre)
            : t.inicio.cumpleHoy.conEdad(nombre, edad)}
        </p>
      </button>
    )
  }

  return (
    <div className={`px-4 py-2.5 ${tarjeta}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-strong text-white">
          <Cake size={16} strokeWidth={2.4} aria-hidden />
        </span>
        <p className="min-w-0 text-sm font-bold leading-snug text-ink">{t.inicio.cumpleHoy.varios}</p>
      </div>
      <ul className="mt-1">
        {cumples.map(cumple => (
          <li key={cumple.id}>
            <button
              type="button"
              onClick={() => onOpen(cumple)}
              aria-label={t.cumpleanos.editarElDe(cumple.nombre)}
              className="flex min-h-11 w-full items-center gap-2.5 text-left"
            >
              {/* El color de la persona, de fondo y pequeño; el nombre, en tinta. */}
              <span
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${cumple.color ? '' : 'bg-primary-strong'}`}
                style={cumple.color ? { backgroundColor: cumple.color } : undefined}
                aria-hidden
              />
              <span translate="no" className="min-w-0 truncate text-sm font-semibold text-ink">{cumple.nombre}</span>
              {/* Sin año de nacimiento no hay edad, y la fila se queda en el nombre. */}
              {cumple.edad !== null && (
                <span className="ml-auto flex-shrink-0 text-xs font-semibold text-muted">
                  {t.cumpleanos.cumpleEdad(cumple.edad)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
})
