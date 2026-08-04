import { PERSON_COLORS } from '@/lib/constants'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

/** Paleta de colores de una persona. La comparten hijos y adultos. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    // Tamaño fijo, no una rejilla que estire los círculos: en el sheet ancho de
    // escritorio la rejilla los convertía en pelotas.
    <div className="flex flex-wrap gap-2.5">
      {PERSON_COLORS.map(({ value: color, label }) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-9 w-9 flex-shrink-0 rounded-full transition-transform"
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
