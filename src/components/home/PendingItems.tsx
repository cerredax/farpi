import Link from 'next/link'
import { Check } from 'lucide-react'
import { Card, CardSection } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { ListItem } from '@/types'

interface PendingItem extends ListItem {
  list_name: string
}

interface PendingItemsProps {
  items: PendingItem[]
  onToggle: (id: string) => void
}

export function PendingItems({ items, onToggle }: PendingItemsProps) {
  return (
    <CardSection label="Listas pendientes">
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState emoji="✓" title="Listas al día" description="No hay elementos pendientes en las listas" />
        ) : (
          <ul className="divide-y divide-[#F5F2EE]">
            {items.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  aria-label={`Marcar "${item.text}" como completado`}
                  className="w-6 h-6 rounded-full border-2 border-[#8BA888] text-[#8BA888] flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#8BA888] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#8BA888]/30"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
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
        )}
        <div className="border-t border-[#F5F2EE] px-4 py-2.5">
          <Link href="/lists" className="text-xs font-semibold text-[#8BA888] hover:underline">
            Ver todas las listas →
          </Link>
        </div>
      </Card>
    </CardSection>
  )
}
