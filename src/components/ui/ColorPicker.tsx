import { PERSON_COLORS } from '@/lib/constants'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

/** Paleta de colores de una persona. La comparten hijos y adultos. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    // Tamaño fijo, no una rejilla que estire los círculos: en el sheet ancho de
    // escritorio la rejilla los convertía en pelotas. 44 px desde el 17-09-2026
    // —eran 36— y por eso los catorce pasan de dos filas de siete a tres: el
    // criterio de la casa manda sobre que la paleta cuadre.
    <div className="flex flex-wrap gap-2.5">
      {PERSON_COLORS.map(({ value: color, label }) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-11 w-11 flex-shrink-0 rounded-full transition-transform"
            style={{
              backgroundColor: color,
              boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
              transform: selected ? 'scale(1.2)' : 'scale(1)',
            }}
            aria-label={label}
            aria-pressed={selected}
          />
        )
      })}
    </div>
  )
}
