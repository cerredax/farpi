'use client'

import { memo } from 'react'
import Link from 'next/link'
import { format, type Locale } from 'date-fns'
import { FileClock } from 'lucide-react'
import { parseLocalDate } from '@/lib/date-utils'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { localeDeFechas } from '@/lib/i18n/fechas'
import type { Diccionario } from '@/lib/i18n'
import type { DocsQueCaducan } from '@/lib/selectors'

interface ExpiringDocsProps {
  docs: DocsQueCaducan
}

type Textos = Diccionario['inicio']['papeles']

function fecha(expiresOn: string | null, t: Textos, locale: Locale): string {
  return expiresOn ? format(parseLocalDate(expiresOn), t.formatoFecha, { locale }) : ''
}

/**
 * Qué decir, en una frase.
 *
 * Con un solo papel se dice **cuál** y **cuándo**: es la diferencia entre un
 * aviso que se puede atender desde la cama y uno que obliga a entrar a mirar de
 * qué habla. Con varios ya no cabe, así que se cuentan.
 */
function mensaje({ caducados, pronto }: DocsQueCaducan, t: Textos, locale: Locale): string {
  if (caducados.length === 1 && pronto.length === 0) {
    return t.caducoEl(caducados[0].name, fecha(caducados[0].expires_on, t, locale))
  }
  if (caducados.length === 0 && pronto.length === 1) {
    return t.caducaEl(pronto[0].name, fecha(pronto[0].expires_on, t, locale))
  }
  return t.varios(caducados.length, pronto.length)
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
  const t = useT()
  const locale = localeDeFechas(useIdioma())
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
      <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-ink">{mensaje(docs, t.inicio.papeles, locale)}</p>
      <span className="flex-shrink-0 text-xs text-muted" aria-hidden>›</span>
    </Link>
  )
})
