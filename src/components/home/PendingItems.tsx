'use client'

import Link from 'next/link'
import { memo, useMemo } from 'react'
import { HomeSection } from '@/components/ui/HomeSection'
import { CircleCheck } from '@/components/ui/CircleCheck'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ListItem } from '@/types'

interface PendingItem extends ListItem {
  list_name: string
}

interface PendingItemsProps {
  items: PendingItem[]
  onToggle: (id: string) => void
}

export const PendingItems = memo(function PendingItems({ items, onToggle }: PendingItemsProps) {
  const visible = useMemo(() => items.slice(0, 5), [items])

  return (
    <HomeSection
      label="Listas de casa"
      isEmpty={items.length === 0}
      emptyState={<EmptyState emoji="✓" title="Listas al dia" description="No falta nada importante por ahora" />}
      footer={
        <Link href="/lists" className="text-xs font-semibold text-[#8BA888] hover:underline">
          Ver todas las listas
        </Link>
      }
    >
      <ul className="divide-y divide-[#F5F2EE]">
        {visible.map(item => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3">
            <CircleCheck
              checked={false}
              onClick={() => onToggle(item.id)}
              ariaLabel={`Marcar "${item.text}" como completado`}
              className="w-auto"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#252525] text-sm leading-snug">{item.text}</p>
              <span className="text-[10px] text-[#77716A]">{item.list_name}</span>
            </div>
          </li>
        ))}
        {items.length > 5 && (
          <li className="px-4 py-2.5 text-xs text-[#77716A] font-semibold">
            +{items.length - 5} mas en las listas
          </li>
        )}
      </ul>
    </HomeSection>
  )
})
