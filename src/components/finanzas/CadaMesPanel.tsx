'use client'

import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { resolveAssignee } from '@/lib/assignees'
import { formatCentsCorto } from '@/lib/finanzas'
import type { Budget, Child, FamilyMember, FixedEntry, MovementKind } from '@/types'

interface CadaMesPanelProps {
  ingresos: FixedEntry[]
  gastos: FixedEntry[]
  partidas: Budget[]
  totalIngresos: number
  totalGastos: number
  totalPartidas: number
  paraElMes: number
  members: FamilyMember[]
  kids: Child[]
  onNuevoFijo: (kind: MovementKind) => void
  onEditarFijo: (fijo: FixedEntry) => void
  onNuevaPartida: () => void
  onEditarPartida: (partida: Budget) => void
}

/** La cabecera de un bloque: qué es, cuánto suma y por dónde se añade. */
function Cabecera({ titulo, total, etiquetaNuevo, onNuevo }: {
  titulo: string
  total: string | null
  etiquetaNuevo: string
  onNuevo: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
        {titulo} {total && <span className="text-ink">{total}</span>}
      </h2>
      {/* `-mr-2` y el relleno vertical, como en el resto de la pantalla: sube la
          zona de toque a los 24 px que exige `movil.spec.ts` (WCAG 2.5.8) sin
          sacar el texto de la línea del título. */}
      <button
        type="button"
        onClick={onNuevo}
        className="-mr-2 flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-bold text-primary-strong"
      >
        <Plus size={14} strokeWidth={2.6} aria-hidden />
        {etiquetaNuevo}
      </button>
    </div>
  )
}

/** El envoltorio de una lista de filas. Las tres del panel se ven igual. */
function Lista({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
      {children}
    </div>
  )
}

function FijoRow({ fijo, members, kids, onEdit }: {
  fijo: FixedEntry
  members: FamilyMember[]
  kids: Child[]
  onEdit: () => void
}) {
  const persona = resolveAssignee(fijo, members, kids)

  return (
    <button
      onClick={onEdit}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas active:bg-canvas"
    >
      {fijo.emoji && <span className="flex-shrink-0 text-base leading-none" aria-hidden>{fijo.emoji}</span>}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{fijo.name}</p>
        {/* Solo se pinta a quien es de alguien. Un recibo de la cuenta común es
            el caso normal y repetir "de casa" en cada fila sería ruido. */}
        {persona && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: persona.color }}
              aria-hidden
            />
            {persona.name}
          </p>
        )}
      </div>

      <span className="flex-shrink-0 text-sm font-bold tabular-nums text-ink">
        {formatCentsCorto(fijo.amount_cents)}
      </span>
    </button>
  )
}

/**
 * Una partida en la plantilla: sin barra y sin «llevas X».
 *
 * Aquí no hay mes al que referirse, así que no hay nada que llevar: lo que se
 * está diciendo es «en un mes normal, a la compra le tocan 400 €». La barra vive
 * en «El mes», que es donde sí hay gastos con los que compararla.
 */
function PartidaRow({ partida, onEdit }: { partida: Budget; onEdit: () => void }) {
  return (
    <button
      onClick={onEdit}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas active:bg-canvas"
    >
      {partida.emoji && <span className="flex-shrink-0 text-base leading-none" aria-hidden>{partida.emoji}</span>}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{partida.name}</p>
      <span className="flex-shrink-0 text-sm font-bold tabular-nums text-ink">
        {formatCentsCorto(partida.monthly_limit_cents)}
      </span>
    </button>
  )
}

/**
 * «Cada mes»: cómo suele ser un mes en esta casa.
 *
 * **El nombre.** Se llamó «El mes tipo» hasta el 02-09-2026 y se cambió porque
 * «tipo» es una palabra de formulario: hay que pararse a deducir que significa
 * «un mes cualquiera». «Cada mes» dice lo mismo sin traducirlo —lo que pasa cada
 * mes: las nóminas, los recibos y lo que se le da a cada partida— y encaja al
 * lado de «El mes», que es un mes concreto. Dentro del código el concepto sigue
 * llamándose **la plantilla**, que es lo que es.
 *
 * **Es una plantilla, no un mes.** Lo que se pone aquí es lo que se copia a cada
 * mes que empieza: las nóminas, los recibos y cuánto se le da a cada partida.
 * Cambiarlo se ve en el mes en curso al momento y **no toca los meses que ya
 * terminaron**, que se quedaron con la copia que tenían. Esa es la decisión
 * entera de esta pantalla desde el 02-09-2026.
 *
 * **Las partidas viven aquí y no en «El mes».** Una partida es exactamente lo
 * mismo que un fijo —una cifra de la plantilla—, solo que en vez de gastarse sola se
 * va llenando. Tenerlas en el mes obligaba a decidir qué significaba cambiarlas a
 * mitad de mes; aquí no hay nada que decidir.
 *
 * Tres bloques y una cifra. El orden es el de la cuenta: primero con cuánto
 * cuentas, luego qué está comprometido, luego cómo repartes lo que queda.
 * Empezar por los gastos deja la pantalla leyéndose como una factura.
 *
 * **Los fijos no se marcan como pagados.** No hay casilla, ni "pendiente", ni
 * nada que abrir cada mes: se dan por hechos. Es lo que separa esto de una app de
 * contabilidad. Si un mes la luz sale distinta, se cambia el fijo o se apunta la
 * diferencia en el día a día.
 */
export function CadaMesPanel({
  ingresos, gastos, partidas, totalIngresos, totalGastos, totalPartidas, paraElMes,
  members, kids, onNuevoFijo, onEditarFijo, onNuevaPartida, onEditarPartida,
}: CadaMesPanelProps) {
  return (
    <div className="space-y-5">
      <p className="px-1 text-xs text-muted">
        Cómo suele ser un mes en esta casa. Se copia a cada mes que empieza;
        cambiarlo no toca los meses que ya terminaron.
      </p>

      <section aria-label="Entra al mes" className="space-y-2">
        <Cabecera
          titulo="Entra al mes"
          total={ingresos.length > 0 ? formatCentsCorto(totalIngresos) : null}
          etiquetaNuevo="Nuevo ingreso"
          onNuevo={() => onNuevoFijo('ingreso')}
        />
        {ingresos.length === 0 ? (
          <EmptyState
            emoji="💼"
            title="Sin ingresos fijos"
            description="Pon las nóminas y lo que entre todos los meses. Es la mitad de la cuenta."
          />
        ) : (
          <Lista>
            {ingresos.map(fijo => (
              <FijoRow key={fijo.id} fijo={fijo} members={members} kids={kids} onEdit={() => onEditarFijo(fijo)} />
            ))}
          </Lista>
        )}
      </section>

      <section aria-label="Sale al mes" className="space-y-2">
        <Cabecera
          titulo="Sale al mes"
          total={gastos.length > 0 ? formatCentsCorto(-totalGastos) : null}
          etiquetaNuevo="Nuevo gasto"
          onNuevo={() => onNuevoFijo('gasto')}
        />
        {gastos.length === 0 ? (
          <EmptyState
            emoji="🏠"
            title="Sin gastos fijos"
            description="El alquiler, la luz, las suscripciones: lo que se paga sí o sí cada mes."
          />
        ) : (
          <Lista>
            {gastos.map(fijo => (
              <FijoRow key={fijo.id} fijo={fijo} members={members} kids={kids} onEdit={() => onEditarFijo(fijo)} />
            ))}
          </Lista>
        )}
      </section>

      <section aria-label="Partidas de cada mes" className="space-y-2">
        <Cabecera
          titulo="Se reparte en"
          total={partidas.length > 0 ? formatCentsCorto(totalPartidas) : null}
          etiquetaNuevo="Nueva partida"
          onNuevo={onNuevaPartida}
        />
        {partidas.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="Sin partidas"
            description="Reparte el mes en partidas para lo que varía —la compra, el ocio— y en «El mes» verás cuánto llevas de cada una."
          />
        ) : (
          <Lista>
            {partidas.map(partida => (
              <PartidaRow key={partida.id} partida={partida} onEdit={() => onEditarPartida(partida)} />
            ))}
          </Lista>
        )}
      </section>

      {(ingresos.length > 0 || gastos.length > 0) && (
        <div className="flex items-baseline justify-between gap-3 rounded-2xl border border-surface bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">Para el mes</p>
            <p className="mt-0.5 text-[11px] text-muted">Lo que queda antes de gastar nada.</p>
          </div>
          <span className={`flex-shrink-0 text-lg font-extrabold tabular-nums ${paraElMes < 0 ? 'text-danger-strong' : 'text-ink'}`}>
            {formatCentsCorto(paraElMes)}
          </span>
        </div>
      )}
    </div>
  )
}
