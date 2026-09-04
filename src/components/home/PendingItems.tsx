'use client'

import { ChevronDown, ShoppingBasket } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { SectionLink } from '@/components/ui/SectionLink'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { EmptyState } from '@/components/ui/EmptyState'
import { selectPendingItemsByList } from '@/lib/selectors'
import type { PendingItem } from '@/types'

interface PendingItemsProps {
  items: PendingItem[]
  onToggle: (id: string) => void
}

/**
 * Lo que falta por comprar, por cesta: plegado, en qué listas queda algo;
 * desplegado, cada lista con lo suyo debajo de su nombre.
 *
 * Antes se listaban cinco ítems sueltos con el nombre de su lista repetido
 * debajo de cada uno: media pantalla de móvil para una compra que se hace en
 * otro sitio. En Inicio lo útil es cuánto queda y en qué lista; el detalle se
 * despliega si hace falta, y para trabajar de verdad está la pantalla de listas.
 *
 * Los nombres de las cestas se dicen **una vez y en un solo sitio**: arriba
 * mientras está plegado, y encima de su grupo cuando se abre (04-09-2026).
 */
export const PendingItems = memo(function PendingItems({ items, onToggle }: PendingItemsProps) {
  const [abierto, setAbierto] = useState(false)

  const cestas = useMemo(() => selectPendingItemsByList(items), [items])

  return (
    <HomeSection
      label="Listas de casa"
      icon={ShoppingBasket}
      accentColor="#D8A48F"
      isEmpty={items.length === 0}
      emptyState={<EmptyState compact emoji="🧺" title="La cesta está vacía, de momento" />}
      footer={
        <SectionLink href="/lists">Ver todas las listas</SectionLink>
      }
    >
      {/* **Abierto, el botón se queda solo con la flecha** (04-09-2026). Los
          nombres de las cestas son lo que hay que leer estando plegado, y
          desplegado los dice cada grupo encima de lo suyo: tenerlos también aquí
          era la lista de listas dos veces, una encima de la otra.

          La flecha no se va con ellos porque es lo único que vuelve a plegar
          esto, y se queda **donde estaba** —a la derecha— para que no salte al
          abrir. Con el nombre fuera, el botón necesita uno a oídas: plegado lo
          son las cestas, y abierto lo dice `aria-label`. */}
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        aria-label={abierto ? 'Plegar las listas' : undefined}
        className={`flex w-full items-center gap-3 px-4 text-left transition-colors hover:bg-surface ${abierto ? 'py-2' : 'py-3'}`}
      >
        {/* Una cesta por línea. Iban en un `flex-wrap` y dos o tres compartían
            renglón sin nada que las separase: "Casa Compra Bricolaje" se
            leía como una sola cosa con un nombre larguísimo. Con nombres cortos
            el problema era peor, porque cabían más en la misma línea. */}
        {!abierto && (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {cestas.map(cesta => (
              <span key={cesta.id} className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                <span className="flex-shrink-0" aria-hidden>{cesta.emoji ?? '📋'}</span>
                <span className="min-w-0 truncate">{cesta.name}</span>
              </span>
            ))}
          </div>
        )}
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={`ml-auto flex-shrink-0 text-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        /* **Una cesta cada una, con su nombre encima** (04-09-2026). Los ítems
           iban todos seguidos en una sola lista y cada uno repetía debajo el
           nombre de la suya, así que la compra y la farmacia se leían como una
           cosa sola y "Casa" salía cinco veces. Ahora el nombre se dice una vez
           por cesta, que es donde ya estaba plegado, y las filas se quedan solo
           con lo que falta. */
        <div className="divide-y divide-hairline border-t border-hairline">
          {cestas.map(cesta => (
            /* Un `div` con su encabezado y no una `section` con nombre: una
               `section` nombrada es un landmark, y tres cestas serían tres
               regiones anidadas dentro de la de "Listas de casa". El `h3` ya
               nombra el grupo y se navega igual. */
            <div key={cesta.id}>
              <h3 className="flex items-center gap-1.5 bg-surface px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                <span className="flex-shrink-0" aria-hidden>{cesta.emoji ?? '📋'}</span>
                <span className="min-w-0 truncate">{cesta.name}</span>
              </h3>
              <ul className="divide-y divide-hairline">
                {cesta.items.map(item => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <CircleCheck
                      checked={false}
                      onClick={() => onToggle(item.id)}
                      ariaLabel={`Ya tenéis "${item.text}", quitar de lo que falta`}
                      className="w-10"
                    />
                    {/* Las unidades pegadas al nombre y no como columna aparte: es
                        "dos leches", no dos cosas distintas. Y solo cuando pasan de
                        una, que "×1" es decir lo que ya dice la fila.

                        Lo que no se pone es el total por cesta: se probó en agosto y
                        se quitó el 04-08-2026 porque el número no decidía nada —que
                        falten dos cosas o siete no cambia lo que haces— y pegado al
                        nombre de la lista se leía como parte de él, "Casa 2". */}
                    <p className="min-w-0 flex-1 font-medium text-ink text-sm leading-snug">
                      {item.text}
                      {item.quantity > 1 && (
                        <span className="ml-1 font-bold text-muted tabular-nums">×{item.quantity}</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </HomeSection>
  )
})
