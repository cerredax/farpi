interface SelectChipProps {
  selected: boolean
  onClick: () => void
  /** Color de fondo cuando está seleccionado. Por defecto, el primario. */
  selectedColor?: string
  children: React.ReactNode
}

/** Píldora seleccionable de una fila de opciones (categorías, personas, filtros). */
export function SelectChip({ selected, onClick, selectedColor, children }: SelectChipProps) {
  const tone = selected
    ? selectedColor ? 'text-white' : 'bg-primary text-white'
    : 'bg-canvas text-muted border border-line hover:bg-surface'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${tone}`}
      style={selected && selectedColor ? { backgroundColor: selectedColor } : undefined}
    >
      {children}
    </button>
  )
}
