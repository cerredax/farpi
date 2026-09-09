'use client'

import { memo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { FileClock } from 'lucide-react'
import { parseLocalDate } from '@/lib/date-utils'
import type { DocsQueCaducan } from '@/lib/selectors'

interface ExpiringDocsProps {
  docs: DocsQueCaducan
}

function fecha(expiresOn: string | null): string {
  return expiresOn ? format(parseLocalDate(expiresOn), "d 'de' MMMM", { locale: es }) : ''
}

/**
 * Qué decir, en una frase.
 *
 * Con un solo papel se dice **cuál** y **cuándo**: es la diferencia entre un
 * aviso que se puede atender desde la cama y uno que obliga a entrar a mirar de
 * qué habla. Con varios ya no cabe, así que se cuentan.
 */
function mensaje({ caducados, pronto }: DocsQueCaducan): string {
  if (caducados.length === 1 && pronto.length === 0) {
    return `«${caducados[0].name}» caducó el ${fecha(caducados[0].expires_on)}`
  }
  if (caducados.length === 0 && pronto.length === 1) {
    return `«${pronto[0].name}» caduca el ${fecha(pronto[0].expires_on)}`
  }

  const partes: string[] = []
  if (caducados.length === 1) partes.push('un papel ha caducado')
  else if (caducados.length > 1) partes.push(`${caducados.length} papeles han caducado`)
  if (pronto.length === 1) partes.push('uno caduca pronto')
  else if (pronto.length > 1) partes.push(`${pronto.length} caducan pronto`)

  const frase = partes.join(' y ')
  return frase.charAt(0).toUpperCase() + frase.slice(1)
}

/**
 * El aviso de los papeles que hay que renovar.
 *
 * **No es una sección de Inicio y por eso no usa `HomeSection`.** Las secciones
 * son el ritmo de lo que se mira a diario —la compra, las tareas, lo que
 * viene—; esto no está casi nunca, y cuando está no se navega, se atiende. Una
 * tarjeta con su rótulo en mayúsculas y su "ver todos" al pie prometería una
 * lista que se consulta, y además habría gastado el quinto color de acento en
 * una paleta de marca que solo tiene cuatro.
 *
 * Los días normales devuelve `null` y no ocupa nada, como hacen "Próximos días"
 * y "Lo demás por hacer" cuando no tienen qué enseñar. Inicio no se convierte
 * en un panel de control porque este bloque no vive ahí: aparece.
 *
 * Dos tonos, no uno: lo vencido es rojo porque ya está mal, y lo que va a
 * vencer es el amarillo de los avisos, que dice "hay tiempo, pero ponte".
 */
export const ExpiringDocs = memo(function ExpiringDocs({ docs }: ExpiringDocsProps) {
  const { caducados, pronto } = docs
  if (caducados.length === 0 && pronto.length === 0) return null

  const urgente = caducados.length > 0

  return (
    <Link
      href="/docs"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-colors lg:col-span-2 ${
        urgente
          ? 'border-danger-line bg-danger-tint hover:bg-danger-soft'
          : 'border-sand/40 bg-sand/10 hover:bg-sand/20'
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${
          urgente ? 'bg-danger-soft text-danger-strong' : 'bg-sand/25 text-sand-strong'
        }`}
        aria-hidden
      >
        <FileClock size={18} strokeWidth={2.2} />
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-ink">{mensaje(docs)}</p>
      <span className="flex-shrink-0 text-xs text-muted" aria-hidden>›</span>
    </Link>
  )
})
