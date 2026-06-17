import { Pencil, UserPlus } from 'lucide-react'
import { differenceInYears, differenceInMonths, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Child } from '@/types'

interface ChildrenListProps {
  kids: Child[]
  onEdit: (child: Child) => void
  onAdd: () => void
}

function getAge(birthDate: string | null): string {
  if (!birthDate) return ''
  const birth = parseISO(birthDate)
  const years = differenceInYears(new Date(), birth)
  if (years === 0) {
    const months = differenceInMonths(new Date(), birth)
    return months === 1 ? '1 mes' : `${months} meses`
  }
  return years === 1 ? '1 año' : `${years} años`
}

export function ChildrenList({ kids, onEdit, onAdd }: ChildrenListProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm overflow-hidden">
      {kids.length === 0 && (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-[#77716A]">Aún no hay hijos añadidos</p>
        </div>
      )}
      {kids.map((child, i) => (
        <button
          key={child.id}
          onClick={() => onEdit(child)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#FAF7F2] active:bg-[#F5F2EE] transition-colors ${i > 0 ? 'border-t border-[#F5F2EE]' : ''}`}
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0" style={{ backgroundColor: child.color }}>
            {child.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#252525] text-sm leading-tight">{child.name}</p>
            {child.birth_date && (
              <p className="text-xs text-[#77716A] mt-0.5">
                {format(parseISO(child.birth_date), 'd MMM yyyy', { locale: es })} · {getAge(child.birth_date)}
              </p>
            )}
          </div>
          <span className="w-8 h-8 flex items-center justify-center rounded-full text-[#C4BFB9] flex-shrink-0">
            <Pencil size={15} strokeWidth={1.8} />
          </span>
        </button>
      ))}
      <div className={kids.length > 0 ? 'border-t border-[#F5F2EE]' : ''}>
        <button onClick={onAdd} className="w-full flex items-center gap-3 px-4 py-3.5 text-[#8BA888] hover:bg-[#F5F9F5] active:bg-[#EEF4EE] transition-colors">
          <span className="w-10 h-10 rounded-full border-2 border-dashed border-[#8BA888] flex items-center justify-center flex-shrink-0">
            <UserPlus size={17} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Añadir hijo</span>
        </button>
      </div>
    </div>
  )
}
