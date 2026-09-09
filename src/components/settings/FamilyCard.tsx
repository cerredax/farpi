import { Home, Pencil } from 'lucide-react'
import type { Family } from '@/types'

interface FamilyCardProps {
  family: Family
  /**
   * Cómo se edita. **Sin él no hay lápiz**, y la tarjeta se queda solo con el
   * nombre: renombrar la familia —y cerrarla, que se hace desde el mismo
   * sheet— es cosa de un administrador, y la policy de `families` es la que
   * manda. Ofrecerlo a quien no puede era llevarle a un error.
   */
  onEdit?: () => void
}

/**
 * La casa: su nombre, cómo cambiarlo y —desde el mismo sheet— cómo cerrarla.
 *
 * Llevaba debajo "3 adultos · 2 hijos" y se lo ha quedado el bloque de
 * "Personas", que es donde se cambian: el recuento salía dos veces en la misma
 * pantalla, a dos dedos de distancia, y la segunda además dice las invitaciones.
 */
export function FamilyCard({ family, onEdit }: FamilyCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-surface bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-tint">
        <Home size={22} className="text-primary-strong" strokeWidth={1.8} />
      </div>
      {/* `title` además del recorte: "Familia de Carlos, María y…" no se podía
          leer entera desde ninguna parte —la única forma era abrir el sheet de
          editar, que desde el 09-09-2026 solo abre un administrador—. Con esto
          basta el ratón encima, y un lector de pantalla lee el nombre completo
          igualmente porque el texto está en el DOM. */}
      <p title={family.name} className="min-w-0 flex-1 truncate text-base font-extrabold leading-tight text-ink">{family.name}</p>
      {onEdit && (
        <button
          onClick={onEdit}
          aria-label="Editar familia"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-muted transition-all hover:bg-surface hover:text-ink active:scale-95"
        >
          <Pencil size={17} strokeWidth={1.8} />
        </button>
      )}
    </div>
  )
}
