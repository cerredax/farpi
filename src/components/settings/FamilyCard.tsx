import { Home, Pencil } from 'lucide-react'
import type { Family } from '@/types'

interface FamilyCardProps {
  family: Family
  onEdit: () => void
}

/**
 * La casa: su nombre y cómo cambiarlo.
 *
 * Llevaba debajo "3 adultos · 2 hijos" y se lo ha quedado el bloque de
 * "Personas", que es donde se cambian: el recuento salía dos veces en la misma
 * pantalla, a dos dedos de distancia, y la segunda además dice las invitaciones.
 */
export function FamilyCard({ family, onEdit }: FamilyCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-surface bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-tint">
        <Home size={22} className="text-primary-strong" strokeWidth={1.8} />
      </div>
      <p className="min-w-0 flex-1 truncate text-base font-extrabold leading-tight text-ink">{family.name}</p>
      <button
        onClick={onEdit}
        aria-label="Editar nombre de la familia"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted transition-all hover:bg-surface hover:text-ink active:scale-95"
      >
        <Pencil size={17} strokeWidth={1.8} />
      </button>
    </div>
  )
}
