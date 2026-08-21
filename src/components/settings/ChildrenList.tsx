import { Pencil, UserPlus } from 'lucide-react'
import { differenceInYears, differenceInMonths, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Child, PersonKind } from '@/types'

interface ChildrenListProps {
  kids: Child[]
  /** Qué lista es: la de los hijos o la de los adultos sin cuenta. */
  kind: PersonKind
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

const TEXTOS: Record<PersonKind, { vacio: string; anadir: string }> = {
  hijo:   { vacio: 'Aún no hay hijos añadidos',  anadir: 'Añadir hijo' },
  adulto: { vacio: 'Aún no hay otros adultos',   anadir: 'Añadir adulto' },
}

export function ChildrenList({ kids, kind, onEdit, onAdd }: ChildrenListProps) {
  const textos = TEXTOS[kind]

  return (
    <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden">
      {kids.length === 0 && (
        <div className="px-4 py-5 text-center">
          <p className="text-sm text-muted">{textos.vacio}</p>
        </div>
      )}
      {kids.map((child, i) => (
        <button
          key={child.id}
          onClick={() => onEdit(child)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-canvas active:bg-hairline transition-colors ${i > 0 ? 'border-t border-hairline' : ''}`}
        >
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0" style={{ backgroundColor: child.color }}>
            {child.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-ink text-sm leading-tight">{child.name}</p>
            {child.birth_date && (
              // De un hijo interesa la edad; de un adulto, la fecha para
              // acordarse del cumpleaños. Poner "78 años" ahí no dice nada.
              <p className="text-xs text-muted mt-0.5">
                {format(parseISO(child.birth_date), 'd MMM yyyy', { locale: es })}
                {child.kind === 'hijo' && ` · ${getAge(child.birth_date)}`}
              </p>
            )}
          </div>
          <span className="w-8 h-8 flex items-center justify-center rounded-full text-faint flex-shrink-0">
            <Pencil size={15} strokeWidth={1.8} />
          </span>
        </button>
      ))}
      <div className={kids.length > 0 ? 'border-t border-hairline' : ''}>
        <button onClick={onAdd} className="w-full flex items-center gap-3 px-4 py-3.5 text-primary hover:bg-primary-tint active:bg-primary-tint transition-colors">
          <span className="w-10 h-10 rounded-full border-2 border-dashed border-primary flex items-center justify-center flex-shrink-0">
            <UserPlus size={17} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">{textos.anadir}</span>
        </button>
      </div>
    </div>
  )
}
