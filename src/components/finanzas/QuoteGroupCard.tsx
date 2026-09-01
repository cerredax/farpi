'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
import { estaCaducado, type GrupoDePresupuestos } from '@/lib/budgets'
import { formatCentsCorto } from '@/lib/finanzas'
import type { Quote, QuoteStatus } from '@/types'

interface QuoteGroupCardProps {
  grupo: GrupoDePresupuestos
  hoy: string
  onEdit: (quote: Quote) => void
  onStatus: (id: string, status: QuoteStatus) => void
}

/**
 * Los presupuestos de un mismo trabajo, juntos y de más barato a más caro.
 *
 * Es la pantalla entera en una tarjeta: tres precios para la misma caldera,
 * puestos uno encima de otro, es lo que hace falta para decidir. El más barato
 * lleva la marca "más barato" —solo mientras el trabajo siga sin decidir— y cada
 * fila tiene sus dos botones para aceptarlo o descartarlo sin abrir nada.
 *
 * Aceptar y descartar están en la fila y no dentro del sheet por lo mismo que
 * marcar una tarea: es un toque que se da mientras se compara, no algo que
 * merezca un formulario. Editar sigue estando, tocando el nombre.
 *
 * Un precio caducado no se esconde ni se tacha: se dice. Sigue valiendo para
 * comparar —el fontanero suele repetirlo— y ocultarlo dejaría un hueco sin
 * explicación en una comparación de tres.
 */
export function QuoteGroupCard({ grupo, hoy, onEdit, onStatus }: QuoteGroupCardProps) {
  return (
    <section
      aria-label={grupo.titulo}
      className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm"
    >
      <header className="flex items-baseline justify-between gap-2 border-b border-hairline px-4 py-3">
        <h3 className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{grupo.titulo}</h3>
        <span className={`flex-shrink-0 text-[11px] font-bold uppercase tracking-wide ${grupo.decidido ? 'text-primary-strong' : 'text-muted'}`}>
          {grupo.decidido ? 'Decidido' : `${grupo.quotes.length} presupuesto${grupo.quotes.length !== 1 ? 's' : ''}`}
        </span>
      </header>

      <ul>
        {grupo.quotes.map(quote => {
          const caducado = estaCaducado(quote, hoy)
          const descartado = quote.status === 'descartado'
          return (
            <li key={quote.id} className="border-b border-hairline last:border-b-0">
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => onEdit(quote)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className={`flex items-center gap-1.5 truncate text-sm font-semibold ${descartado ? 'text-muted' : 'text-ink'}`}>
                    {quote.provider}
                    {quote.status === 'aceptado' && (
                      <span className="flex-shrink-0 rounded-full bg-primary-tint px-1.5 py-0.5 text-[10px] font-bold text-primary-strong">
                        Aceptado
                      </span>
                    )}
                    {quote.id === grupo.masBaratoId && (
                      <span className="flex-shrink-0 rounded-full bg-primary-tint px-1.5 py-0.5 text-[10px] font-bold text-primary-strong">
                        Más barato
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                    <span className={`font-bold ${descartado ? 'text-muted' : 'text-ink'}`}>
                      {formatCentsCorto(quote.amount_cents)}
                    </span>
                    {quote.valid_until && (
                      <span className={caducado ? 'font-semibold text-danger-strong' : ''}>
                        {caducado ? 'Caducó el ' : 'Vale hasta el '}
                        {format(parseISO(quote.valid_until), 'd MMM', { locale: es })}
                      </span>
                    )}
                    {descartado && <span>Descartado</span>}
                  </p>
                </button>

                {/* 36 px de lado, por encima del mínimo de 24 que exige
                    `movil.spec.ts`, porque se tocan con el pulgar mientras se
                    comparan precios. */}
                <div className="flex flex-shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onStatus(quote.id, quote.status === 'aceptado' ? 'pedido' : 'aceptado')}
                    aria-label={quote.status === 'aceptado' ? `Deshacer aceptar ${quote.provider}` : `Aceptar ${quote.provider}`}
                    aria-pressed={quote.status === 'aceptado'}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      quote.status === 'aceptado' ? 'bg-primary text-white' : 'bg-canvas text-muted hover:bg-surface'
                    }`}
                  >
                    <Check size={16} strokeWidth={2.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStatus(quote.id, descartado ? 'pedido' : 'descartado')}
                    aria-label={descartado ? `Deshacer descartar ${quote.provider}` : `Descartar ${quote.provider}`}
                    aria-pressed={descartado}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                      descartado ? 'bg-surface text-ink' : 'bg-canvas text-muted hover:bg-surface'
                    }`}
                  >
                    <X size={16} strokeWidth={2.6} />
                  </button>
                </div>
              </div>

              {quote.notes && (
                <p className="px-4 pb-3 text-[11px] leading-relaxed text-muted">{quote.notes}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
