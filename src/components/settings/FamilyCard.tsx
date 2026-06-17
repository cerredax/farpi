import { Home, Pencil } from 'lucide-react'
import type { Family, FamilyMember, Child } from '@/types'

interface FamilyCardProps {
  family: Family
  members: FamilyMember[]
  kids: Child[]
  onEdit: () => void
}

export function FamilyCard({ family, members, kids, onEdit }: FamilyCardProps) {
  const adultsLabel = members.length === 1 ? '1 adulto' : `${members.length} adultos`
  const kidsLabel   = kids.length === 1 ? '1 hijo'   : `${kids.length} hijos`

  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm p-4 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-[#EEF4EE] flex items-center justify-center flex-shrink-0">
        <Home size={26} className="text-[#8BA888]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-extrabold text-[#252525] text-base leading-tight truncate">{family.name}</p>
        <p className="text-sm text-[#77716A] mt-0.5">{adultsLabel} · {kidsLabel}</p>
      </div>
      <button
        onClick={onEdit}
        aria-label="Editar nombre de la familia"
        className="w-9 h-9 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] hover:text-[#252525] active:scale-95 transition-all flex-shrink-0"
      >
        <Pencil size={17} strokeWidth={1.8} />
      </button>
    </div>
  )
}
