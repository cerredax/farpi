'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
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
      isEmpty={items.length === 0}
      emptyState={<EmptyState compact emoji="✓" title="Listas al día" />}
      footer={
        <Link href="/lists" className="text-xs font-semibold text-primary hover:underline">
          Ver todas las listas
        </Link>
      }
    >
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
      >
        <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          {cestas.map(cesta => (
            <span key={cesta.id} className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <span aria-hidden>{cesta.emoji ?? '📋'}</span>
              {cesta.name}
              <span className="text-muted font-bold">{cesta.count}</span>
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
                ariaLabel={`Marcar "${item.text}" como completado`}
                className="w-auto"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink text-sm leading-snug">{item.text}</p>
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
