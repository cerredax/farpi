'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { BudgetBar } from './BudgetBar'
import { BudgetSheet } from './BudgetSheet'
import { ExpenseRow } from './ExpenseRow'
import { ExpenseSheet } from './ExpenseSheet'
import { QuoteGroupCard } from './QuoteGroupCard'
import { QuoteSheet } from './QuoteSheet'
import { useFinanzasState, type PestañaFinanzas } from './useFinanzasState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useStore } from '@/lib/store-context'
import { formatCents, formatCentsCorto } from '@/lib/finanzas'
import { capitalize } from '@/lib/text'

/**
 * Finanzas: lo que hay que saber del gasto de la casa, en dos pestañas.
 *
 * **Por qué dos y no dos pantallas.** En español "presupuesto" son dos cosas: lo
 * que te dejas al mes en la compra, y el papel que te pasa el fontanero. No se
 * parecen en nada por dentro —una es una cuenta que corre y la otra una decisión
 * que se toma una vez— pero las dos contestan "¿qué pasa con el dinero de
 * casa?", y separarlas en dos secciones de la barra dejaría a la app con nueve
 * sitios a los que entrar. La pestaña es el corte más barato que las mantiene
 * juntas sin mezclarlas.
 *
 * **El mes.** El de hoy al entrar, con flechas para ir atrás. El gasto del mes
 * pasado se mira; no se edita a ciegas, así que la pantalla dice siempre en qué
 * mes está y ofrece volver.
 *
 * **No sale en Inicio**, igual que Notas y por una razón parecida: Inicio
 * contesta "¿qué tenemos que saber hoy?", y "llevas 180 de 300 en la compra" no
 * es de hoy, es del mes. Meterlo ahí convertiría la primera pantalla de la app
 * en un cuadro de mandos, que es justo lo que Farpi no quiere ser.
 */
export function FinanzasView() {
  const { budgets, members, kids } = useStore()
  const s = useFinanzasState()

  const nombreDelMes = capitalize(format(parseISO(`${s.mes}-01`), 'MMMM yyyy', { locale: es }))

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-4xl lg:px-6">
      {/* Mismo patrón de pestañas que Ajustes: se arrastran en móvil y caben
          enteras en escritorio. */}
      <div role="tablist" aria-label="Secciones de finanzas" className="flex gap-2">
        {([
          { key: 'mes', label: 'El mes' },
          { key: 'presupuestos', label: 'Presupuestos' },
        ] as { key: PestañaFinanzas; label: string }[]).map(p => (
          <button
            key={p.key}
            type="button"
            role="tab"
            id={`tab-${p.key}`}
            aria-selected={s.pestaña === p.key}
            aria-controls={`panel-${p.key}`}
            onClick={() => s.setPestaña(p.key)}
            className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              s.pestaña === p.key ? 'bg-primary text-white' : 'bg-white border border-line text-muted hover:bg-surface'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div id="panel-mes" role="tabpanel" aria-labelledby="tab-mes" hidden={s.pestaña !== 'mes'} className="space-y-5">
        <section aria-label="Resumen del mes" className="rounded-2xl border border-surface bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={s.mesAnterior}
              aria-label="Mes anterior"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas"
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-xs font-bold uppercase tracking-widest text-muted">{nombreDelMes}</p>
              <p className="text-xl font-extrabold leading-tight text-ink">{formatCents(s.total)}</p>
            </div>

            <button
              type="button"
              onClick={s.mesSiguiente}
              aria-label="Mes siguiente"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-canvas"
            >
              <ChevronRight size={18} strokeWidth={2.4} />
            </button>
          </div>

          {!s.esMesActual && (
            <button
              type="button"
              onClick={s.volverAHoy}
              className="mt-1 min-h-6 w-full py-1 text-center text-[11px] font-semibold text-primary-strong"
            >
              Volver a este mes
            </button>
          )}

          {/* Quién ha puesto el dinero. Una línea de nombres con su color y su
              parte, y nada más: ni saldos ni "te debe". */}
          {s.reparto.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-hairline pt-2.5">
              {s.reparto.map(a => (
                <li key={a.key} className="flex items-center gap-1.5 text-[11px] text-muted">
                  {a.color && (
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} aria-hidden />
                  )}
                  <span>{a.nombre}</span>
                  <span className="font-bold text-ink">{formatCentsCorto(a.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Presupuestos del mes" className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Presupuestos</h2>
            {/* `-mr-2` y el relleno vertical: el enlace tenía 16 px de alto y
                `movil.spec.ts` lo cazó, que exige 24 (WCAG 2.5.8). El margen
                negativo devuelve el texto a la línea del título para que la
                zona de toque crezca sin que se note. */}
            <button
              type="button"
              onClick={() => s.abrirPresupuesto(null)}
              className="-mr-2 flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-bold text-primary-strong"
            >
              <Plus size={14} strokeWidth={2.6} aria-hidden />
              Nuevo presupuesto
            </button>
          </div>

          {s.resumen.length === 0 ? (
            <EmptyState
              emoji="🎯"
              title="Sin presupuestos"
              description="Pon un tope al mes para lo que más se va —la compra, la casa— y verás cuánto llevas."
            />
          ) : (
            s.resumen.map(r => (
              <BudgetBar key={r.budget.id} resumen={r} onEdit={() => s.abrirPresupuesto(r.budget)} />
            ))
          )}
        </section>

        <section aria-label="Gastos del mes" className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">
            Gastos {s.delMes.length > 0 && <span className="text-faint">({s.delMes.length})</span>}
          </h2>

          {s.delMes.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title={s.esMesActual ? 'Nada apuntado este mes' : 'Nada apuntado ese mes'}
              description="Apunta lo que se va gastando y la barra de arriba se mueve sola."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
              {s.delMes.map(gasto => (
                <ExpenseRow
                  key={gasto.id}
                  expense={gasto}
                  budgets={budgets}
                  members={members}
                  kids={kids}
                  onEdit={() => s.abrirGasto(gasto)}
                />
              ))}
            </div>
          )}

          {s.sinPresupuesto.length > 0 && (
            <p className="px-1 text-[11px] text-faint">
              {s.sinPresupuesto.length === 1
                ? 'Hay 1 gasto sin presupuesto: no cuenta para ningún tope.'
                : `Hay ${s.sinPresupuesto.length} gastos sin presupuesto: no cuentan para ningún tope.`}
            </p>
          )}
        </section>
      </div>

      <div
        id="panel-presupuestos"
        role="tabpanel"
        aria-labelledby="tab-presupuestos"
        hidden={s.pestaña !== 'presupuestos'}
        className="space-y-3"
      >
        <p className="px-1 text-xs text-muted">
          Lo que te pasan de fuera: el fontanero, el dentista, la academia. Apunta
          varios para lo mismo y se comparan solos.
        </p>

        {s.grupos.length === 0 ? (
          <EmptyState
            emoji="📄"
            title="Sin presupuestos pedidos"
            description="Apunta lo que te pasen y, si pides otro para lo mismo, saldrán juntos con el más barato marcado."
          />
        ) : (
          s.grupos.map(grupo => (
            <QuoteGroupCard
              key={grupo.titulo}
              grupo={grupo}
              hoy={s.hoy}
              onEdit={quote => s.abrirPedido(quote)}
              onStatus={(id, estado) => s.setQuoteStatus(id, estado)}
            />
          ))
        )}
      </div>

      {/* El botón de alta es uno y hace lo de la pestaña que se está mirando: en
          "El mes" apunta un gasto, en "Presupuestos" apunta uno pedido. Un `+`
          que significara siempre lo mismo obligaría a tener dos, y el segundo
          estaría inactivo la mitad del tiempo. */}
      <button
        type="button"
        onClick={() => (s.pestaña === 'mes' ? s.abrirGasto(null) : s.abrirPedido(null))}
        aria-label={s.pestaña === 'mes' ? 'Nuevo gasto' : 'Nuevo presupuesto pedido'}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-hover lg:bottom-8 lg:right-8"
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <ExpenseSheet
        key={s.expenseKey}
        open={s.expenseSheetOpen}
        initial={s.editingExpense}
        // Un gasto nuevo nace hoy si se está mirando este mes; si se está
        // mirando otro, el día 1 de ese, que es lo que se estaba haciendo:
        // rellenar un mes pasado. Poner "hoy" ahí lo colaría en un mes que no se
        // está mirando y desaparecería de la lista al guardarlo.
        fechaPorDefecto={s.esMesActual ? s.hoy : `${s.mes}-01`}
        budgets={budgets}
        onClose={() => s.setExpenseSheetOpen(false)}
        onSave={s.guardarGasto}
        onDelete={s.deleteExpense}
      />

      <BudgetSheet
        key={s.budgetKey}
        open={s.budgetSheetOpen}
        initial={s.editingBudget}
        onClose={() => s.setBudgetSheetOpen(false)}
        onSave={s.guardarPresupuesto}
        onDelete={s.deleteBudget}
      />

      <QuoteSheet
        key={s.quoteKey}
        open={s.quoteSheetOpen}
        initial={s.editingQuote}
        titulos={s.titulos}
        onClose={() => s.setQuoteSheetOpen(false)}
        onSave={s.guardarPedido}
        onDelete={s.deleteQuote}
      />
    </div>
  )
}
