import { ChevronRight } from 'lucide-react'
import type { List } from '@/types'

interface ListCardProps {
  list: List
  /** Lo que falta, por orden alfabético. Vacío significa lista al día. */
  pendientes: string[]
  onClick: () => void
}

/** Cuántos ítems se adelantan antes de cortar con puntos suspensivos. */
const ADELANTO = 3

export function ListCard({ list, pendientes, onClick }: ListCardProps) {
  // Se adelanta lo que falta, no cuánto se ha hecho: así se decide si entrar
  // sin entrar. Antes había una barra de progreso y un "2/5", que contaban lo
  // contrario de lo que se viene a mirar.
  const adelanto = pendientes.slice(0, ADELANTO).join(', ')
  const resumen = pendientes.length === 0
    ? 'No falta nada'
    : pendientes.length > ADELANTO ? `${adelanto}…` : adelanto

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-surface shadow-sm px-4 py-4 flex items-center gap-3 hover:bg-canvas active:bg-canvas transition-colors text-left"
    >
      <span className="text-2xl w-10 text-center flex-shrink-0">{list.emoji ?? '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ink text-sm leading-tight">{list.name}</p>
        <p className={`mt-1 truncate text-xs leading-snug ${pendientes.length === 0 ? 'text-faint' : 'text-muted'}`}>
          {resumen}
        </p>
      </div>
      <ChevronRight size={16} className="text-faint flex-shrink-0" />
    </button>
  )
}
