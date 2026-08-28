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
 * Lo que falta por comprar, plegado y contado por cesta.
 *
 * Antes se listaban cinco ítems sueltos con el nombre de su lista repetido
 * debajo de cada uno: media pantalla de móvil para una compra que se hace en
 * otro sitio. En Inicio lo útil es cuánto queda y en qué lista; el detalle se
 * despliega si hace falta, y para trabajar de verdad está la pantalla de listas.
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
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
      >
        {/* Una cesta por línea. Iban en un `flex-wrap` y dos o tres compartían
            renglón sin nada que las separase: "Casa Compra bebé Cosas de Ana" se
            leía como una sola cosa con un nombre larguísimo. Con nombres cortos
            el problema era peor, porque cabían más en la misma línea. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {cestas.map(cesta => (
            <span key={cesta.id} className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
              <span className="flex-shrink-0" aria-hidden>{cesta.emoji ?? '📋'}</span>
              <span className="min-w-0 truncate">{cesta.name}</span>
            </span>
          ))}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={`flex-shrink-0 text-muted transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {items.map(item => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <CircleCheck
                checked={false}
                onClick={() => onToggle(item.id)}
                ariaLabel={`Ya tenéis "${item.text}", quitar de lo que falta`}
                className="w-10"
              />
              <div className="flex-1 min-w-0">
                {/* Las unidades pegadas al nombre y no como columna aparte: es
                    "dos leches", no dos cosas distintas. Y solo cuando pasan de
                    una, que "×1" es decir lo que ya dice la fila.

                    Lo que no se pone es el total por cesta: se probó en agosto y
                    se quitó el 04-08-2026 porque el número no decidía nada —que
                    falten dos cosas o siete no cambia lo que haces— y pegado al
                    nombre de la lista se leía como parte de él, "Casa 2". */}
                <p className="font-medium text-ink text-sm leading-snug">
                  {item.text}
                  {item.quantity > 1 && (
                    <span className="ml-1 font-bold text-muted tabular-nums">×{item.quantity}</span>
                  )}
                </p>
                <span className="text-[10px] text-muted">
                  <span aria-hidden className="mr-1">{item.list_emoji ?? '📋'}</span>
                  {item.list_name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HomeSection>
  )
})
