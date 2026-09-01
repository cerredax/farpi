'use client'

import { Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { resolveAssignee } from '@/lib/assignees'
import { formatCentsCorto } from '@/lib/finanzas'
import type { Child, FamilyMember, FixedEntry, MovementKind } from '@/types'

interface FijosPanelProps {
  ingresos: FixedEntry[]
  gastos: FixedEntry[]
  totalIngresos: number
  totalGastos: number
  paraElMes: number
  members: FamilyMember[]
  kids: Child[]
  onNuevo: (kind: MovementKind) => void
  onEditar: (fijo: FixedEntry) => void
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

function Bloque({ titulo, kind, fijos, total, members, kids, onNuevo, onEditar, vacio }: {
  titulo: string
  kind: MovementKind
  fijos: FixedEntry[]
  total: number
  members: FamilyMember[]
  kids: Child[]
  onNuevo: (kind: MovementKind) => void
  onEditar: (fijo: FixedEntry) => void
  vacio: { emoji: string; title: string; description: string }
}) {
  return (
    <section aria-label={titulo} className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted">
          {titulo}{' '}
          {fijos.length > 0 && (
            <span className="text-ink">{formatCentsCorto(kind === 'gasto' ? -total : total)}</span>
          )}
        </h2>
        {/* `-mr-2` y el relleno vertical, como en el resto de la pantalla: sube
            la zona de toque a los 24 px que exige `movil.spec.ts` (WCAG 2.5.8)
            sin sacar el texto de la línea del título. */}
        <button
          type="button"
          onClick={() => onNuevo(kind)}
          className="-mr-2 flex min-h-6 items-center gap-1 px-2 py-1 text-xs font-bold text-primary-strong"
        >
          <Plus size={14} strokeWidth={2.6} aria-hidden />
          {kind === 'ingreso' ? 'Nuevo ingreso' : 'Nuevo gasto'}
        </button>
      </div>

      {fijos.length === 0 ? (
        <EmptyState emoji={vacio.emoji} title={vacio.title} description={vacio.description} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
          {fijos.map(fijo => (
            <FijoRow key={fijo.id} fijo={fijo} members={members} kids={kids} onEdit={() => onEditar(fijo)} />
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * El mes tipo: lo que entra y lo que sale todos los meses sin apuntar nada.
 *
 * Dos bloques y una cifra. Los ingresos van arriba porque es el orden en que se
 * hace la cuenta —primero con cuánto cuentas, luego qué está comprometido— y
 * porque empezar por los gastos deja la pantalla leyéndose como una factura.
 *
 * **Los fijos no se marcan como pagados.** No hay casilla, ni "pendiente", ni
 * nada que abrir cada mes: se dan por hechos. Esa es la decisión entera de esta
 * pestaña, y lo que la separa de una app de contabilidad. Si un mes la luz sale
 * distinta, se cambia el fijo o se apunta la diferencia como movimiento.
 */
export function FijosPanel({
  ingresos, gastos, totalIngresos, totalGastos, paraElMes, members, kids, onNuevo, onEditar,
}: FijosPanelProps) {
  return (
    <div className="space-y-5">
      <p className="px-1 text-xs text-muted">
        Lo que entra y lo que sale todos los meses sin que nadie lo apunte: las
        nóminas, el alquiler, los recibos. Cuentan solos en «El mes».
      </p>

      <Bloque
        titulo="Entra al mes"
        kind="ingreso"
        fijos={ingresos}
        total={totalIngresos}
        members={members}
        kids={kids}
        onNuevo={onNuevo}
        onEditar={onEditar}
        vacio={{
          emoji: '💼',
          title: 'Sin ingresos fijos',
          description: 'Pon las nóminas y lo que entre todos los meses. Es la mitad de la cuenta.',
        }}
      />

      <Bloque
        titulo="Sale al mes"
        kind="gasto"
        fijos={gastos}
        total={totalGastos}
        members={members}
        kids={kids}
        onNuevo={onNuevo}
        onEditar={onEditar}
        vacio={{
          emoji: '🏠',
          title: 'Sin gastos fijos',
          description: 'El alquiler, la luz, las suscripciones: lo que se paga sí o sí cada mes.',
        }}
      />

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
