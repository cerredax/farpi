'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Un bloque de los que viven bajo el mes, plegado por defecto.
 *
 * "Vacaciones y descansos" y "Cumpleaños" cuentan **cómo es el mes**, no lo que
 * hay que hacer hoy, y en una casa con cuatro abuelos y unas vacaciones de
 * agosto sumaban una pantalla entera de móvil debajo de la rejilla: para llegar
 * a la agenda había que pasar por encima de una lista que casi nunca se estaba
 * leyendo. Ahora cada uno se anuncia en una línea, con cuántos hay, y se abre
 * quien quiera verlos (28-08-2026).
 *
 * Siguen siendo **dos y no uno**: una ausencia cambia los planes de la casa y un
 * cumpleaños se felicita, así que juntarlos bajo un mismo título obligaba a
 * abrir los cumpleaños para saber si alguien está fuera. Plegados ocupan una
 * línea cada uno, que es justo lo que se quería ahorrar.
 *
 * El número va en el título porque plegado es lo único que se ve: sin él, la
 * línea no distingue "no hay nada" de "hay cinco". Cuando no hay nada, el bloque
 * no se pinta (eso lo decide cada uno, que sabe qué contar).
 *
 * Cada uno recuerda si está abierto mientras dure la pantalla, y vuelve a
 * cerrarse al salir: es el estado en el que casi siempre se quiere el mes.
 */
interface SeccionPlegableProps {
  titulo: string
  /** Cuántos hay dentro. Se dice en el título, que plegado es todo lo que hay. */
  cuantos: number
  children: ReactNode
}

export function SeccionPlegable({ titulo, cuantos, children }: SeccionPlegableProps) {
  const [abierto, setAbierto] = useState(false)

  return (
    // El filete de arriba solo separa un bloque del otro: el primero de la
    // tarjeta ya tiene el borde de la tarjeta encima, y dos rayas pegadas se
    // veían como un doble marco. `first:` funciona aunque el otro bloque no se
    // pinte —devuelve `null`, así que no deja nodo— y entonces el que quede es
    // el primero.
    <div className="border-t border-hairline first:border-t-0 px-3 py-1">
      {/* El patrón de siempre para esto: el título **es** el botón, no lleva uno
          al lado. Así quien navega por encabezados sigue encontrando el bloque y
          quien va con el dedo tiene toda la fila para abrirlo. */}
      <h2>
        <button
          type="button"
          onClick={() => setAbierto(a => !a)}
          aria-expanded={abierto}
          className="flex min-h-8 w-full items-center gap-2 rounded-xl px-1 text-left text-xs font-bold uppercase tracking-widest text-muted transition-colors hover:bg-surface"
        >
          <span className="min-w-0 truncate">{titulo}</span>
          <span className="flex-shrink-0 rounded-full bg-surface px-1.5 py-px text-[10px] tabular-nums">
            {cuantos}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={2.4}
            className={`ml-auto flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      </h2>

      {abierto && <div className="pb-1">{children}</div>}
    </div>
  )
}
