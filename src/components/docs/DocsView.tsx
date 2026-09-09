'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryIcon } from './CategoryIcon'
import { DocCard } from './DocCard'
import { DocSheet } from './DocSheet'
import { useDocsState } from './useDocsState'
import { resolveAssignee } from '@/lib/assignees'
import { ViewHeader } from '@/components/ui/ViewHeader'

/**
 * Cuántas categorías se enseñan sin pedirlo.
 *
 * Con las ocho que tiene la familia de la demo, la tira envolvía en **tres
 * filas y ocupaba unos 230 px a 390 px de ancho**: un muro entre quien entra y
 * los papeles, en la única sección a la que se entra buscando **uno** concreto.
 * Cuatro caben en dos filas y dejan ver la primera tarjeta.
 *
 * No es esconder contenido —la trampa en la que este repositorio ha caído dos
 * veces— porque nada de esto es contenido: son filtros, el buscador está justo
 * encima y el resto está a un toque con su cuenta escrita.
 */
const CATEGORIAS_A_LA_VISTA = 4

export function DocsView() {
  const s = useDocsState()
  const [verTodasLasCategorias, setVerTodasLasCategorias] = useState(false)

  // La que está puesta se enseña siempre, aunque caiga fuera de las cuatro: si
  // no, filtrar por «Viajes» dejaría la tira sin decir por qué se ven tres
  // papeles de once.
  const activaEstaFuera =
    s.activeFilter !== null &&
    s.categorias.findIndex(c => c.key === s.activeFilter) >= CATEGORIAS_A_LA_VISTA
  const todasALaVista = verTodasLasCategorias || activaEstaFuera
  const categoriasVisibles = todasALaVista ? s.categorias : s.categorias.slice(0, CATEGORIAS_A_LA_VISTA)
  const ocultas = s.categorias.length - categoriasVisibles.length

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-6xl lg:px-6">
      <ViewHeader
        resumen={`${s.documents.length} documento${s.documents.length !== 1 ? 's' : ''} guardados`}
        buscador={s.puedeBuscar ? {
          value: s.busqueda,
          onChange: s.setBusqueda,
          placeholder: `Buscar en ${s.documents.length} documentos…`,
          ariaLabel: 'Buscar documentos',
        } : null}
        onAdd={s.openCreate}
        addLabel="Añadir documento"
      />

      {/* La vuelta de conectar Drive. Es lo único que enseña esta pantalla sobre
          el proveedor, y solo justo después de haber ido a conectarlo: si sale
          bien hay que decirlo —volver a una pantalla idéntica no confirma nada— y
          si sale mal, más. */}
      {s.avisoDrive && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${s.avisoDrive === 'ok' ? 'border-line bg-primary-tint' : 'border-danger-line bg-danger-soft'}`}
        >
          <p className="min-w-0 flex-1 text-xs font-semibold leading-relaxed text-ink">
            {s.avisoDrive === 'ok'
              ? 'Google Drive conectado. Ya puedes guardar documentos: se quedarán en tu Drive y la familia los verá aquí.'
              : 'No se pudo conectar Google Drive. Vuelve a intentarlo desde el botón de añadir documento.'}
          </p>
          <button
            type="button"
            onClick={s.cerrarAvisoDrive}
            aria-label="Cerrar aviso"
            className="-m-1.5 flex-shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-white/60 hover:text-ink"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
      )}

      {/* Filtros */}
      {/* Solo se ofrecen las categorías **que tienen algún papel dentro** (ver
          `selectDocCategoryFilters`). Las once del catálogo siguen estando al
          guardar un documento; como filtro, la mitad daban a una pantalla
          vacía, y con un icono cada una la tira se leía como un muro antes de
          llegar al primer documento: cuatro filas a 390 px, y en escritorio
          once en una fila con «Otros» colgando solo en la segunda.

          Envueltas y no arrastrables, eso sigue igual desde el 02-09-2026: se
          ven todas de un golpe. Lo que cambió el 03-09-2026 es cuántas hay que
          ver. Esconder contenido en esta app ha salido mal cada vez, pero una
          categoría vacía no es contenido, es un filtro muerto. */}
      {s.puedeFiltrar && (
        <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2 pb-1">
          {[{ key: null, label: 'Todos' }, ...categoriasVisibles].map(f => (
            <button
              key={String(f.key)}
              onClick={() => s.setActiveFilter(f.key)}
              className={`flex min-h-11 flex-shrink-0 items-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${s.activeFilter === f.key ? 'bg-primary-strong text-white' : 'bg-white border border-line text-muted hover:bg-surface'}`}
            >
              {f.key && <CategoryIcon category={f.key} size={13} />}
              {f.label}
            </button>
          ))}

          {ocultas > 0 && (
            <button
              type="button"
              onClick={() => setVerTodasLasCategorias(true)}
              className="flex min-h-11 flex-shrink-0 items-center rounded-xl border border-dashed border-line-strong px-3 text-xs font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              +{ocultas} más
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {s.filtered.length === 0 ? (
        /* El mismo `EmptyState` que el resto de la app y no un vacío escrito a
           mano aquí: era el único que se había quedado fuera, con su propio
           tamaño de emoji y su propio hueco. Lo que hay debajo del título solo
           se pinta cuando se ha buscado algo, que es la única de las tres ramas
           que informa en vez de explicar. */
        <EmptyState
          emoji={s.busqueda.trim() ? '🔍' : '📄'}
          title={s.busqueda.trim()
            ? 'Sin coincidencias'
            : s.activeFilter ? 'Sin documentos en esta categoría' : 'Sin documentos'}
          description={s.busqueda.trim() ? `Ningún documento coincide con «${s.busqueda.trim()}»` : undefined}
        />
      ) : (
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start xl:grid-cols-3">
          {s.filtered.map(doc => {
            const asignado = resolveAssignee(doc, s.members, s.kids)
            return (
              <DocCard
                key={doc.id}
                doc={doc}
                assigneeName={asignado?.name}
                assigneeColor={asignado?.color}
                onEdit={() => s.openEdit(doc)}
              />
            )
          })}
        </div>
      )}

      <DocSheet
        key={s.sheetKey}
        open={s.sheetOpen}
        mode={s.sheetMode}
        initial={s.editingDoc}
        kids={s.kids}
        members={s.members}
        onClose={() => s.setSheetOpen(false)}
        onSave={s.handleSave}
        onDelete={s.deleteDocument}
        onOpenFile={s.getDocumentUrl}
        conexion={s.storageConnection}
        connectUrl={s.connectStorageUrl}
      />
    </div>
  )
}
