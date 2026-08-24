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

/**
 * Una lista, con lo que falta adelantado. Se adelanta lo que falta y no cuánto
 * se ha hecho: así se decide si entrar sin entrar. Antes había una barra de
 * progreso y un "2/5", que contaban lo contrario de lo que se viene a mirar.
 *
 * El estado se dice dos veces y de dos formas: con palabras —"Hace falta:" o
 * "Al día"— y con la presencia de la tarjeta, que es la misma distinción que
 * separa un ítem pendiente de uno del catálogo: blanca y con sombra cuando hay
 * algo que hacer, plana sobre el fondo cuando no. Sin números: que falten dos
 * cosas o siete no cambia lo que haces, y un número pegado al nombre se lee como
 * parte de él ("Casa 2").
 */
export function ListCard({ list, pendientes, onClick }: ListCardProps) {
  const alDia = pendientes.length === 0
  const adelanto = pendientes.slice(0, ADELANTO).join(', ')
  const resumen = alDia
    ? 'Al día'
    : `Hace falta: ${pendientes.length > ADELANTO ? `${adelanto}…` : adelanto}`

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-canvas active:bg-canvas ${
        alDia ? 'border-hairline bg-canvas' : 'border-surface bg-white shadow-sm'
      }`}
    >
      <span className={`w-10 flex-shrink-0 text-center text-2xl ${alDia ? 'opacity-60' : ''}`}>
        {list.emoji ?? '📋'}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold leading-tight ${alDia ? 'text-muted' : 'text-ink'}`}>{list.name}</p>
        <p className={`mt-1 truncate text-xs leading-snug ${alDia ? 'text-faint' : 'text-muted'}`}>
          {resumen}
        </p>
      </div>
      <ChevronRight size={16} className="flex-shrink-0 text-faint" />
    </button>
  )
}
