import type { DocCategory } from '@/types'
import { CategoryIcon } from './CategoryIcon'

interface CategoryChipProps {
  /** La categoría, o `null` para el «Todos» de la tira de filtros, que no lleva icono. */
  category: DocCategory | null
  label: string
  selected: boolean
  onClick: () => void
}

/**
 * Una categoría de documento como pastilla pulsable.
 *
 * La usan los **dos** sitios donde se toca una categoría: la tira de filtros de
 * la pantalla y la rejilla del sheet al guardar un papel. Estaban escritas
 * aparte y habían derivado: el filtro era una pastilla de 44 px sobre blanco y
 * la del alta un `SelectChip` de 30, más apretado y más apagado, para elegir
 * exactamente lo mismo. Además 30 px se queda por debajo del mínimo de la casa
 * (44×44), que en un sheet no vigila `e2e/movil.spec.ts` porque mientras está
 * cerrado es `inert`.
 */
export function CategoryChip({ category, label, selected, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 flex-shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors ${
        selected
          ? 'bg-primary-strong text-white'
          : 'bg-white border border-line text-muted hover:bg-surface'
      }`}
    >
      {category && <CategoryIcon category={category} size={13} />}
      {label}
    </button>
  )
}
