import { Plus } from 'lucide-react'
import { SearchField } from './SearchField'

interface ViewHeaderProps {
  /** Lo que hay en la pantalla: "6 listas de la familia", "12 documentos guardados". */
  resumen: string
  /** El buscador, o `null` cuando hay tan poco que no hay nada que buscar. */
  buscador?: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    ariaLabel: string
  } | null
  /**
   * Qué hace el `+`. **Sin él no hay botón**, y la cabecera se queda solo con el
   * resumen. Lo usa Finanzas mirando un mes que aún no ha empezado: ahí no hay
   * nada que apuntar, y un `+` que abriera un gasto con fecha del mes que viene
   * sería un botón que hace lo que nadie ha pedido.
   */
  onAdd?: () => void
  /** Nombre del botón de alta: "Nueva lista", "Añadir documento"… */
  addLabel: string
}

/**
 * La fila de cabecera que abre Listas, Tareas, Comidas y Documentos: el resumen
 * de lo que hay, el buscador y el `+` de alta, todo en una línea bajo el título
 * verde de `TopBar`.
 *
 * Vive aquí porque las cuatro pantallas la tenían escrita por separado y ya
 * habían divergido: Tareas ponía el `+` flotando abajo a la derecha, Listas y
 * Comidas lo ponían arriba con el buscador debajo, y Documentos lo subía a la
 * fila solo en escritorio. Cuatro sitios donde buscar lo mismo, distintos según
 * la pantalla.
 *
 * En móvil, cuando hay buscador el resumen se calla: a 390 px no caben las tres
 * cosas, y el propio buscador ya dice cuántas hay ("Buscar en 19 ítems…"). En
 * escritorio caben las tres, así que el resumen manda a la izquierda, el
 * buscador se queda a lo suyo con tope de ancho —estirado a 1152 px la pantalla
 * parecía el móvil ensanchado— y la acción cierra a la derecha.
 */
export function ViewHeader({ resumen, buscador, onAdd, addLabel }: ViewHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 lg:gap-6">
      <p className={`text-xs text-muted ${buscador ? 'hidden lg:block lg:flex-shrink-0' : ''}`}>{resumen}</p>

      {buscador && (
        <SearchField
          className="min-w-0 flex-1 lg:ml-auto lg:w-full lg:max-w-sm lg:flex-none"
          value={buscador.value}
          onChange={buscador.onChange}
          placeholder={buscador.placeholder}
          ariaLabel={buscador.ariaLabel}
        />
      )}

      {onAdd && (
        <button
          onClick={onAdd}
          aria-label={addLabel}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-colors hover:bg-primary-hover"
        >
          <Plus size={20} />
        </button>
      )}
    </div>
  )
}
