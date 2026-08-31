'use client'

import { NoteCard } from './NoteCard'
import { NoteSheet } from './NoteSheet'
import { useNotesState } from './useNotesState'
import { EmptyState } from '@/components/ui/EmptyState'
import { ViewHeader } from '@/components/ui/ViewHeader'

/**
 * Notas: lo que hay que tener apuntado en casa y no es una fecha, una tarea ni
 * un papel. El teléfono del pediatra, la clave del wifi, dónde está el contador
 * de la luz.
 *
 * Es la pantalla más simple de la app y se queda así a propósito: cabecera,
 * buscador y una rejilla de tarjetas. Sin filtros, sin pestañas y sin
 * categorías. Una casa tiene veinte notas, no doscientas, y para veinte el
 * buscador gana a cualquier índice —una nota no tiene fecha ni persona por la
 * que filtrar, así que un filtro no tendría de qué agarrarse.
 *
 * Y **no sale en Inicio**. Inicio contesta "¿qué tenemos que saber hoy?", y la
 * clave del wifi no es de hoy: es de siempre, que es justo lo contrario.
 *
 * Aviso que vale la pena repetir donde se lea: lo que se escriba aquí se guarda
 * como texto plano en la base, protegido por la RLS y por nada más. Sirve para
 * la clave del wifi de casa; no es un gestor de contraseñas.
 */
export function NotesView() {
  const s = useNotesState()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-6xl lg:px-6">
      <ViewHeader
        resumen={`${s.notes.length} nota${s.notes.length !== 1 ? 's' : ''} de la familia`}
        buscador={s.puedeBuscar ? {
          value: s.busqueda,
          onChange: s.setBusqueda,
          placeholder: `Buscar en ${s.notes.length} notas…`,
          ariaLabel: 'Buscar notas',
        } : null}
        onAdd={s.openCreate}
        addLabel="Nueva nota"
      />

      {s.filtered.length === 0 ? (
        <EmptyState
          emoji="📝"
          title={s.busqueda.trim() ? 'Ninguna nota coincide' : 'Sin notas'}
          description={s.busqueda.trim()
            ? `Ninguna coincide con «${s.busqueda.trim()}»`
            : 'Apunta lo que hay que tener a mano: teléfonos, la clave del wifi, dónde está cada cosa.'}
        />
      ) : (
        /* `items-start` para que una nota corta no se estire hasta el alto de la
           más larga de su fila: son tarjetas de contenido, no celdas. */
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 xl:grid-cols-3">
          {s.filtered.map(note => (
            <NoteCard key={note.id} note={note} onEdit={() => s.openEdit(note)} />
          ))}
        </div>
      )}

      <NoteSheet
        key={s.sheetKey}
        open={s.sheetOpen}
        mode={s.sheetMode}
        initial={s.editingNote}
        onClose={() => s.setSheetOpen(false)}
        onSave={s.handleSave}
        onDelete={s.deleteNote}
      />
    </div>
  )
}
