import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Palmtree } from 'lucide-react'
import { extractDate } from '@/lib/date-utils'
import { resolveAssignee } from '@/lib/assignees'
import { FAMILY_COLOR } from '@/lib/constants'
import type { Event, Child, FamilyMember } from '@/types'

interface VacationLegendProps {
  vacaciones: Event[]
  kids: Child[]
  members: FamilyMember[]
  onEdit: (event: Event) => void
}

/** "1 – 15 ago", o un solo día si empieza y acaba igual. */
function rango(event: Event): string {
  const inicio = parseISO(extractDate(event.start_at))
  const fin = parseISO(extractDate(event.end_at ?? event.start_at))
  const mismoMes = inicio.getMonth() === fin.getMonth()
  const desde = format(inicio, mismoMes ? 'd' : 'd MMM', { locale: es })
  const hasta = format(fin, 'd MMM', { locale: es })
  return desde === hasta ? hasta : `${desde}–${hasta}`
}

/**
 * Quién está de vacaciones en el tramo que se ve, con su color.
 *
 * La franja del calendario dice que hay vacaciones y de qué color, pero no de
 * quién: había que saberse la paleta de memoria. Esto la traduce, y de paso
 * pone las fechas, que en la franja hay que contarlas a ojo.
 *
 * Desde el rediseño del 24-08-2026 es además el **único** sitio desde el que se
 * editan: la franja de la celda pasó a ser señal y no control, porque como barra
 * de 3 px nunca iba a llegar al mínimo de toque de 24×24. De ahí el `min-h-6` de
 * cada botón de aquí, que sí lo cumple.
 */
export function VacationLegend({ vacaciones, kids, members, onEdit }: VacationLegendProps) {
  if (vacaciones.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-hairline px-4 py-2.5">
      <Palmtree size={13} strokeWidth={2.2} className="flex-shrink-0 text-muted" aria-hidden />
      {vacaciones.map(v => {
        const asignado = resolveAssignee(v, members, kids)
        const color = v.color ?? asignado?.color ?? FAMILY_COLOR
        const quien = asignado?.name ?? 'Familia'
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onEdit(v)}
            aria-label={`Editar ${v.title}, ${quien}, ${rango(v)}`}
            className="flex min-h-6 items-center gap-1.5 rounded-full px-1.5 py-1 transition-colors hover:bg-surface"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <span className="text-[11px] font-bold text-ink">{quien}</span>
            <span className="text-[11px] text-muted">{rango(v)}</span>
          </button>
        )
      })}
    </div>
  )
}
