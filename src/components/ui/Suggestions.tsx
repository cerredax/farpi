interface SuggestionsProps {
  values: string[]
  onPick: (value: string) => void
  label: string
}

/**
 * Sugerencias en fila, pensadas para el pulgar: se tocan, no se navegan con
 * teclado. Por eso son botones y no un desplegable sobre el campo, que en móvil
 * pelea con el teclado del sistema.
 */
export function Suggestions({ values, onPick, label }: SuggestionsProps) {
  if (values.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className="px-3 py-1.5 rounded-full bg-canvas text-muted text-xs font-semibold hover:bg-primary-tint hover:text-primary-strong transition-colors max-w-full truncate"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  )
}
