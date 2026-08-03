interface FieldProps {
  label: string
  /** Id del control asociado. Omitir en grupos de botones, que no son un único control. */
  htmlFor?: string
  /** Texto secundario dentro de la etiqueta, p. ej. "(opcional)". */
  hint?: string
  /** `input` para un control simple; `group` deja algo más de aire a rejillas de opciones. */
  spacing?: 'input' | 'group'
  children: React.ReactNode
}

/** Etiqueta + control con el espaciado estándar de los formularios de los sheets. */
export function Field({ label, htmlFor, hint, spacing = 'input', children }: FieldProps) {
  return (
    <div className={spacing === 'input' ? 'space-y-1.5' : 'space-y-2'}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {hint && <span className="normal-case font-normal"> {hint}</span>}
      </label>
      {children}
    </div>
  )
}
