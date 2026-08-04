import { PERSON_COLORS } from '@/lib/constants'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

/** Paleta de colores de una persona. La comparten hijos y adultos. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {PERSON_COLORS.map(({ value: color, label }) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="aspect-square rounded-full transition-transform"
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
