'use client'

import { X } from 'lucide-react'
import { DocCard } from './DocCard'
import { DocSheet } from './DocSheet'
import { useDocsState } from './useDocsState'
import { DOC_CATEGORIES } from '@/lib/constants'
import { resolveAssignee } from '@/lib/assignees'
import { ViewHeader } from '@/components/ui/ViewHeader'

const ALL_FILTERS = [
  { key: null as string | null, label: 'Todos' },
  ...DOC_CATEGORIES.map(c => ({ key: c.key as string | null, label: `${c.emoji} ${c.label}` })),
]

export function DocsView() {
  const s = useDocsState()

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
      {/* En móvil los filtros se arrastran y sangran hasta el borde (`-mx-4
          px-4`); en escritorio caben los cinco de una vez, así que se quita el
          sangrado y el arrastre. */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:flex-wrap lg:overflow-x-visible lg:px-0">
        {ALL_FILTERS.map(f => (
          <button
            key={String(f.key)}
            onClick={() => s.setActiveFilter(f.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${s.activeFilter === f.key ? 'bg-primary text-white' : 'bg-white border border-line text-muted hover:bg-surface'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {s.filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="font-bold text-ink">Sin documentos</p>
          <p className="text-sm text-muted mt-1">
            {s.busqueda.trim()
              ? `Ninguno coincide con «${s.busqueda.trim()}»`
              : s.activeFilter
              ? 'No hay documentos en esta categoría'
              : 'Guarda el primer documento de la familia'}
          </p>
        </div>
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
