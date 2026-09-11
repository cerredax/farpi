'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileTypeIcon } from './FileTypeIcon'
import { fondoDePersona } from '@/lib/assignees'
import { DOC_CATEGORY, FAMILY_COLOR } from '@/lib/constants'
import { selectExpiryState } from '@/lib/selectors'
import { formatFileSize } from '@/lib/text'
import type { DocCategory, Document } from '@/types'

const CADUCIDAD_ESTILO = {
  caducado: 'bg-danger-soft text-danger-strong',
  pronto:   'bg-sand/25 text-sand-strong',
  vigente:  'bg-surface text-muted',
} as const

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
  const etiqueta = DOC_CATEGORY[categoria]?.label ?? 'Otros'
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
          {/* La categoría, solo su icono y sin la palabra (09-09-2026). Era una
              píldora gris con el nombre escrito al lado, y en una fila donde ya
              compiten la caducidad, el tamaño y la fecha se llevaba el ancho
              para repetir la palabra por la que muchas veces se ha filtrado
              justo arriba.
              Y el icono es el emoji del catálogo, no un trazo de `lucide`: es lo
              mismo que hacen la tarjeta de una nota, la de una lista y la fila
              de un gasto, y ser la única sección con otro idioma de iconos no
              venía de ninguna decisión de producto.
              El nombre sigue estando para quien no ve el icono —lector de
              pantalla— y al pasar el ratón. */}
          <span
            role="img"
            aria-label={etiqueta}
            title={etiqueta}
            className="flex-shrink-0 text-base leading-none"
          >
            {DOC_CATEGORY[categoria]?.emoji ?? '📄'}
          </span>
          {/* De quién es, con la etiqueta de toda la app: el color de la persona
              de fondo y el nombre en tinta. Iba en color macizo con el texto
              calculado encima, que es lo que hacían todas antes de que la
              paleta de hijos se aclarara a L* 71-88; en esos tonos el blanco no
              llega al contraste. */}
          {assigneeName && (
            <span
              className="etiqueta-persona max-w-[7rem] px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: fondoDePersona(assigneeColor ?? FAMILY_COLOR) }}
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
          <span className="text-[10px] text-muted">
            {formatFileSize(doc.size_bytes)} · {format(parseISO(doc.created_at), 'd MMM yyyy', { locale: es })}
          </span>
        </div>
      </div>

      {/* Indicador de que es editable */}
      <span className="text-muted text-xs mt-1 flex-shrink-0">›</span>
    </button>
  )
}
