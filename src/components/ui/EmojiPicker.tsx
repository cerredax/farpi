interface EmojiPickerProps {
  /** Los emoji que se ofrecen, en el orden en que se pintan. */
  opciones: readonly string[]
  value: string
  onChange: (emoji: string) => void
}

/**
 * Rejilla de emoji para nombrar una lista, una nota, una partida o un fijo.
 *
 * Vive aquí porque el bloque estaba copiado en los cuatro sheets que dejan
 * elegir icono —idéntico carácter a carácter en tres de ellos y con las clases
 * en otro orden en `ListSheet`—, y una rejilla copiada cuatro veces es una que
 * se cambia en un sitio y se olvida en los otros tres.
 *
 * **El vocabulario no viene aquí: lo trae cada pantalla.** Los juegos son
 * distintos a propósito y cada uno está razonado en su archivo: una lista se
 * nombra con el súper y la casa, una nota con lo que se consulta (📶, 🔐), y una
 * partida o un fijo con aquello en lo que se va el dinero. Un juego común
 * serviría mal a los cuatro. Lo que se comparte es el control.
 *
 * **Seis por fila en móvil y ocho a partir del ancho del sheet de escritorio.**
 * Los juegos se escribieron para cuadrar a ocho —24 en tres filas justas, 16 los
 * ingresos de un fijo— y a ocho seguirán donde caben. En móvil no caben: la
 * celda tiene que llegar a 44 px por el criterio de la casa y ocho de 44 con sus
 * huecos piden 408 px contra los 350 que hay dentro del sheet a 390. Con seis,
 * los juegos de 24 siguen cuadrando —cuatro filas justas— y el de 16 deja una
 * fila corta, que es el precio de que el dedo acierte.
 */
export function EmojiPicker({ opciones, value, onChange }: EmojiPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2 md:grid-cols-8">
      {opciones.map(emoji => {
        const selected = value === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            // El nombre accesible del botón es el propio emoji, que un lector de
            // pantalla ya sabe leer; lo que no se oía era cuál está puesto.
            aria-pressed={selected}
            className={`flex h-11 w-full items-center justify-center rounded-xl text-xl transition-colors ${selected ? 'bg-primary/20 ring-2 ring-primary-strong' : 'bg-canvas hover:bg-surface'}`}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}
