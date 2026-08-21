import { Home, Pencil } from 'lucide-react'
import { splitPeople } from '@/lib/assignees'
import type { Family, FamilyMember, Child } from '@/types'

interface FamilyCardProps {
  family: Family
  members: FamilyMember[]
  kids: Child[]
  onEdit: () => void
}

export function FamilyCard({ family, members, kids, onEdit }: FamilyCardProps) {
  // Los adultos sin cuenta cuentan como adultos: una abuela es de la familia
  // aunque no entre en la app.
  const { adultos, hijos } = splitPeople(kids)
  const numAdultos = members.length + adultos.length
  const adultsLabel = numAdultos === 1 ? '1 adulto' : `${numAdultos} adultos`
  const kidsLabel   = hijos.length === 1 ? '1 hijo' : `${hijos.length} hijos`

  return (
    <div className="bg-white rounded-2xl border border-surface shadow-sm p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center flex-shrink-0">
        <Home size={26} className="text-primary" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-ink text-base leading-tight truncate">{family.name}</p>
        <p className="text-sm text-muted mt-0.5">{adultsLabel} · {kidsLabel}</p>
      </div>
      <button
        onClick={onEdit}
        aria-label="Editar nombre de la familia"
        className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink active:scale-95 transition-all flex-shrink-0"
      >
        <Pencil size={17} strokeWidth={1.8} />
      </button>
    </div>
  )
}
