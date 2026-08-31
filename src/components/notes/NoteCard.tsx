'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pin } from 'lucide-react'
import type { Note } from '@/types'

interface NoteCardProps {
  note: Note
  onEdit: () => void
}

/**
 * Una nota en el índice.
 *
 * **Se lee entera desde aquí**, y esa es la diferencia con `DocCard`, que se le
 * parece. Un documento es un archivo que hay que abrir; una nota es su propio
 * contenido, y obligar a tocar para ver el teléfono del pediatra convertiría en
 * dos gestos lo que tiene que ser cero. Por eso el cuerpo se pinta en la
 * tarjeta, con los saltos de línea que le pusieron (`whitespace-pre-wrap`): una
 * lista de tres teléfonos escrita en tres líneas se lee en tres líneas.
 *
 * El corte a seis líneas es el tope para que una nota larga no empuje a las
 * demás fuera de la pantalla. La mayoría no llega, y la que llega se abre.
 *
 * Toda la tarjeta es un botón y lleva a editarla. No hay un segundo botón para
 * fijar: un botón no puede llevar botones dentro —es la misma piedra con la que
 * tropezó `DayCell` cuando la celda del mes empezó a escribir títulos—, y
 * partir la tarjeta en dos zonas pulsables por un gesto que se usa una vez en la
 * vida de la nota no sale a cuenta. Fijar se marca al escribirla.
 */
export function NoteCard({ note, onEdit }: NoteCardProps) {
  return (
    <button
      onClick={onEdit}
      className="flex w-full flex-col gap-2 rounded-2xl border border-surface bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-canvas active:bg-canvas"
    >
      <div className="flex w-full items-start gap-2">
        {note.emoji && (
          <span className="flex-shrink-0 text-lg leading-tight" aria-hidden>{note.emoji}</span>
        )}
        <p className="min-w-0 flex-1 text-sm font-bold leading-tight text-ink">{note.title}</p>
        {/* La chincheta y no una etiqueta con la palabra: es la única marca de
            la tarjeta, así que no compite con nada y no hace falta explicarla.
            El nombre accesible lo pone el `title` del icono. */}
        {note.pinned && (
          <Pin size={14} strokeWidth={2.4} className="mt-0.5 flex-shrink-0 text-primary" aria-label="Fijada" />
        )}
      </div>

      {note.body && (
        <p className="line-clamp-6 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
          {note.body}
        </p>
      )}

      <span className="text-[10px] text-faint">
        {format(parseISO(note.updated_at), "d MMM yyyy", { locale: es })}
      </span>
    </button>
  )
}
