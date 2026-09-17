interface SuggestionsProps {
  values: string[]
  onPick: (value: string) => void
  label: string
  /**
   * Deja el bloque a una altura fija y lo hace scrollable. Para catálogos
   * largos —los platos ya cocinados— donde caben decenas de opciones y sin
   * tope empujarían el formulario fuera de la pantalla. El tope creció con las
   * pastillas: a 44 px, las 8 rem de antes dejaban ver fila y media.
   */
  scroll?: boolean
}

/**
 * Sugerencias en fila, pensadas para el pulgar: se tocan, no se navegan con
 * teclado. Por eso son botones y no un desplegable sobre el campo, que en móvil
 * pelea con el teclado del sistema.
 */
export function Suggestions({ values, onPick, label, scroll = false }: SuggestionsProps) {
  if (values.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <div className={`flex flex-wrap gap-1.5 ${scroll ? 'max-h-44 overflow-y-auto' : ''}`}>
        {values.map(value => (
          <button
            key={value}
            type="button"
            onClick={() => onPick(value)}
            className="flex min-h-11 max-w-full items-center px-3 rounded-full bg-canvas text-muted text-xs font-semibold hover:bg-primary-tint hover:text-primary-strong transition-colors"
          >
            {/* El recorte va en el texto y no en el botón: en un contenedor
                `flex`, el `text-overflow` no llega a lo que hay dentro. */}
            <span className="truncate">{value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
