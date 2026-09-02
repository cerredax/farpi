'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CategoryIcon } from './CategoryIcon'
import { FileTypeIcon } from './FileTypeIcon'
import { textColorOn } from '@/lib/assignees'
import { DOC_CATEGORIES, FAMILY_COLOR } from '@/lib/constants'
import { selectExpiryState } from '@/lib/selectors'
import { formatFileSize } from '@/lib/text'
import type { DocCategory, Document } from '@/types'

const CADUCIDAD_ESTILO = {
  caducado: 'bg-danger-soft text-danger-strong',
  pronto:   'bg-sand/25 text-sand-strong',
  vigente:  'bg-surface text-muted',
} as const

const ETIQUETAS = Object.fromEntries(
  DOC_CATEGORIES.map(c => [c.key, c.label])
) as Record<DocCategory, string>

interface DocCardProps {
  doc: Document
  /** Nombre de la persona asignada, si la hay. Sin ella, el documento es de toda la familia. */
  assigneeName?: string
  assigneeColor?: string
  onEdit: () => void
}

/** Tarjeta de documento en el listado, con categoría, dueño y metadatos. */
export function DocCard({ doc, assigneeName, assigneeColor, onEdit }: DocCardProps) {
  const categoria: DocCategory = doc.category ?? 'otros'
  const caducidad = selectExpiryState(doc.expires_on)

  return (
    <button
      onClick={onEdit}
      className="w-full bg-white rounded-2xl border border-surface shadow-sm px-4 py-3.5 flex items-start gap-3 text-left hover:bg-canvas active:bg-canvas transition-colors"
    >
      {/* Icono de tipo */}
      <div className="w-10 h-10 rounded-xl bg-canvas flex items-center justify-center flex-shrink-0 mt-0.5">
        <FileTypeIcon mime={doc.mime_type} size={20} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-ink text-sm leading-tight truncate">{doc.name}</p>
        {doc.description && (
          <p className="text-xs text-muted mt-0.5 truncate">{doc.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-surface text-muted px-2 py-0.5 rounded-full">
            <CategoryIcon category={categoria} /> {ETIQUETAS[categoria] ?? 'Otros'}
          </span>
          {assigneeName && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: assigneeColor ?? FAMILY_COLOR, color: textColorOn(assigneeColor ?? FAMILY_COLOR) }}
            >
              {assigneeName}
            </span>
          )}
          {/* Lo que caduca se dice aquí y no en un rincón: un papel caducado no
              avisa por su cuenta, vale hasta que un día no vale. */}
          {caducidad && doc.expires_on && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CADUCIDAD_ESTILO[caducidad]}`}>
              {caducidad === 'caducado' ? 'Caducó el' : 'Caduca el'}{' '}
              {format(parseISO(doc.expires_on), 'd MMM yyyy', { locale: es })}
            </span>
          )}
          <span className="text-[10px] text-faint">
            {formatFileSize(doc.size_bytes)} · {format(parseISO(doc.created_at), 'd MMM yyyy', { locale: es })}
          </span>
        </div>
      </div>

      {/* Indicador de que es editable */}
      <span className="text-faint text-xs mt-1 flex-shrink-0">›</span>
    </button>
  )
}
