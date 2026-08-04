import { Search, X } from 'lucide-react'

interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
}

/** Campo de búsqueda con lupa y botón de limpiar. Lo comparten los dos buscadores de listas. */
export function SearchField({ value, onChange, placeholder, ariaLabel }: SearchFieldProps) {
  return (
    <div className="relative">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="field-input pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={14} strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}
