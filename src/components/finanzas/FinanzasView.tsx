'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus } from 'lucide-react'
import { BudgetBar } from './BudgetBar'
import { BudgetSheet } from './BudgetSheet'
import { CuentaDelMes } from './CuentaDelMes'
import { ExpenseRow } from './ExpenseRow'
import { ExpenseSheet } from './ExpenseSheet'
import { FijosPanel } from './FijosPanel'
import { FixedEntrySheet } from './FixedEntrySheet'
import { QuoteGroupCard } from './QuoteGroupCard'
import { QuoteSheet } from './QuoteSheet'
import { useFinanzasState, type PestañaFinanzas } from './useFinanzasState'
import { EmptyState } from '@/components/ui/EmptyState'
import { capitalize } from '@/lib/text'

/**
 * Finanzas: qué pasa con el dinero de casa, en tres pestañas.
 *
 * **Por qué tres y no tres pantallas.** Son tres preguntas distintas —«¿con
 * cuánto contamos?», «¿qué ha pasado este mes?», «¿cuánto va a costar esto?»— que
 * comparten materia. Separarlas en la barra de navegación dejaría la app con diez
 * sitios a los que entrar; mezclarlas en una lista haría ilegibles las tres.
 *
 * **El vocabulario.** «Presupuesto» en español son dos cosas y aquí solo significa
 * una: lo que cuesta algo que aún no has hecho —los tres de la caldera, la
 * reforma del baño—. Lo que antes se llamaba así en «El mes» ahora son **topes**,
 * que es lo que son; y lo que se apunta a mano son **movimientos**, porque una
 * entrada es un gasto o un ingreso, nunca un presupuesto.
 *
 * **El mes.** El de hoy al entrar, con flechas para ir atrás. Los fijos, en
 * cambio, no dependen del mes que se mire: son una cifra que vale hasta que se
 * cambie, y esa es la razón de que no haya nada que abrir cada treinta días.
 *
 * **No sale en Inicio**, igual que Notas y por una razón parecida: Inicio
 * contesta "¿qué tenemos que saber hoy?", y "quedan 758 € este mes" no es de hoy,
 * es del mes. Meterlo ahí convertiría la primera pantalla de la app en un cuadro
 * de mandos, que es justo lo que Farpi no quiere ser.
 */
export function FinanzasView() {
  const s = useFinanzasState()

  const nombreDelMes = capitalize(format(parseISO(`${s.mes}-01`), 'MMMM yyyy', { locale: es }))

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 lg:max-w-4xl lg:px-6">
      {/* Mismo patrón de pestañas que Ajustes: se arrastran en móvil y caben
          enteras en escritorio. */}
      <div role="tablist" aria-label="Secciones de finanzas" className="flex gap-2">
        {([
          { key: 'mes', label: 'El mes' },
          { key: 'fijos', label: 'Fijos' },
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
        <CuentaDelMes
          cuenta={s.cuenta}
          nombreDelMes={nombreDelMes}
          esMesActual={s.esMesActual}
          onAnterior={s.mesAnterior}
          onSiguiente={s.mesSiguiente}
          onVolverAHoy={s.volverAHoy}
          reparto={s.reparto}
          onPonerFijos={() => s.setPestaña('fijos')}
        />

        <section aria-label="Topes del mes" className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Topes</h2>
            {/* `-mr-2` y el relleno vertical: el enlace tenía 16 px de alto y
                `movil.spec.ts` lo cazó, que exige 24 (WCAG 2.5.8). El margen
                negativo devuelve el texto a la línea del título para que la
                zona de toque crezca sin que se note. */}
            <button
              type="button"
              onClick={() => s.abrirTope(null)}
              className="-mr-2 flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-bold text-primary-strong"
            >
              <Plus size={14} strokeWidth={2.6} aria-hidden />
              Nuevo tope
            </button>
          </div>

          {s.resumen.length === 0 ? (
            <EmptyState
              emoji="🎯"
              title="Sin topes"
              description="Pon un tope al mes a lo que varía —la compra, el ocio— y verás cuánto llevas."
            />
          ) : (
            s.resumen.map(r => (
              <BudgetBar key={r.budget.id} resumen={r} onEdit={() => s.abrirTope(r.budget)} />
            ))
          )}
        </section>

        <section aria-label="Movimientos del mes" className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-widest text-muted">
            Movimientos {s.delMes.length > 0 && <span className="text-faint">({s.delMes.length})</span>}
          </h2>

          {s.delMes.length === 0 ? (
            <EmptyState
              emoji="🧾"
              title={s.esMesActual ? 'Nada apuntado este mes' : 'Nada apuntado ese mes'}
              description="Apunta lo que se va gastando —y lo que entra sin ser fijo— y la cuenta de arriba se mueve sola."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
              {s.delMes.map(movimiento => (
                <ExpenseRow
                  key={movimiento.id}
                  expense={movimiento}
                  budgets={s.budgets}
                  members={s.members}
                  kids={s.kids}
                  onEdit={() => s.abrirGasto(movimiento)}
                />
              ))}
            </div>
          )}

          {s.sinTope.length > 0 && (
            <p className="px-1 text-[11px] text-faint">
              {s.sinTope.length === 1
                ? 'Hay 1 gasto sin tope: no cuenta para ninguno.'
                : `Hay ${s.sinTope.length} gastos sin tope: no cuentan para ninguno.`}
            </p>
          )}
        </section>
      </div>

      <div id="panel-fijos" role="tabpanel" aria-labelledby="tab-fijos" hidden={s.pestaña !== 'fijos'}>
        <FijosPanel
          ingresos={s.ingresosFijos}
          gastos={s.gastosFijos}
          totalIngresos={s.cuenta.ingresosFijos}
          totalGastos={s.cuenta.gastosFijos}
          paraElMes={s.cuenta.paraElMes}
          members={s.members}
          kids={s.kids}
          onNuevo={s.abrirFijoNuevo}
          onEditar={s.abrirFijo}
        />
      </div>

      <div
        id="panel-presupuestos"
        role="tabpanel"
        aria-labelledby="tab-presupuestos"
        hidden={s.pestaña !== 'presupuestos'}
        className="space-y-3"
      >
        <p className="px-1 text-xs text-muted">
          Lo que cuesta algo que aún no has hecho: el fontanero, el dentista, la
          reforma. Apunta varios para lo mismo y se comparan solos.
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

      {/* El botón de alta es uno y hace lo de la pestaña que se está mirando. Un
          `+` que significara siempre lo mismo obligaría a tener tres, y dos
          estarían inactivos en todo momento.

          En «Fijos» abre uno de gasto: las nóminas se ponen una vez y son dos, y
          lo que se va añadiendo después son recibos. De todos modos el tipo es lo
          primero que hay dentro del sheet, así que corregirlo es un toque. */}
      <button
        type="button"
        onClick={() => {
          if (s.pestaña === 'mes') s.abrirGasto(null)
          else if (s.pestaña === 'fijos') s.abrirFijoNuevo('gasto')
          else s.abrirPedido(null)
        }}
        aria-label={
          s.pestaña === 'mes' ? 'Nuevo movimiento'
            : s.pestaña === 'fijos' ? 'Nuevo gasto fijo'
              : 'Nuevo presupuesto pedido'
        }
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-hover lg:bottom-8 lg:right-8"
      >
        <Plus size={24} strokeWidth={2.4} />
      </button>

      <FixedEntrySheet
        key={s.fixedKey}
        open={s.fixedSheetOpen}
        initial={s.editingFixed}
        kindPorDefecto={s.kindNuevoFijo}
        onClose={() => s.setFixedSheetOpen(false)}
        onSave={s.guardarFijo}
        onDelete={s.deleteFixedEntry}
      />

      <ExpenseSheet
        key={s.expenseKey}
        open={s.expenseSheetOpen}
        initial={s.editingExpense}
        // Un movimiento nuevo nace hoy si se está mirando este mes; si se está
        // mirando otro, el día 1 de ese, que es lo que se estaba haciendo:
        // rellenar un mes pasado. Poner "hoy" ahí lo colaría en un mes que no se
        // está mirando y desaparecería de la lista al guardarlo.
        fechaPorDefecto={s.esMesActual ? s.hoy : `${s.mes}-01`}
        budgets={s.budgets}
        onClose={() => s.setExpenseSheetOpen(false)}
        onSave={s.guardarGasto}
        onDelete={s.deleteExpense}
      />

      <BudgetSheet
        key={s.budgetKey}
        open={s.budgetSheetOpen}
        initial={s.editingBudget}
        onClose={() => s.setBudgetSheetOpen(false)}
        onSave={s.guardarTope}
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
