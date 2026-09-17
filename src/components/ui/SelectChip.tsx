interface SelectChipProps {
  selected: boolean
  onClick: () => void
  /** Color de fondo cuando está seleccionado. Por defecto, el primario. */
  selectedColor?: string
  children: React.ReactNode
}

/**
 * Píldora seleccionable de una fila de opciones (categorías, personas, filtros).
 *
 * `min-h-11` porque medía 30 px de alto: por encima del mínimo de la WCAG (24) y
 * por debajo del de la casa (44), y nadie lo veía —vive dentro de los sheets, que
 * el bucle de `e2e/movil.spec.ts` saltaba por estar `inert` mientras están
 * cerrados—.
 */
export function SelectChip({ selected, onClick, selectedColor, children }: SelectChipProps) {
  const tone = selected
    ? selectedColor ? 'text-white' : 'bg-primary-strong text-white'
    : 'bg-canvas text-muted border border-line hover:bg-surface'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${tone}`}
      style={selected && selectedColor ? { backgroundColor: selectedColor } : undefined}
    >
      {children}
    </button>
  )
}
