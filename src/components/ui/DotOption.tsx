interface DotOptionProps {
  selected: boolean
  onClick: () => void
  color: string
  label: string
}

/**
 * Opción con círculo de color y etiqueta debajo, en fila de ancho repartido.
 * La usan la prioridad de las tareas y el asignado de los eventos.
 */
export function DotOption({ selected, onClick, color, label }: DotOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-1 py-2 rounded-2xl transition-colors"
      style={{ backgroundColor: selected ? color + '22' : 'transparent' }}
    >
      <span
        className="w-7 h-7 rounded-full transition-all"
        style={{
          backgroundColor: color,
          boxShadow: selected ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
          transform: selected ? 'scale(1.15)' : 'scale(1)',
        }}
      />
      <span className="text-[11px] font-bold transition-colors" style={{ color: selected ? color : '#77716A' }}>
        {label}
      </span>
    </button>
  )
}
