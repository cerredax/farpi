'use client'

import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { resolveAssignee } from '@/lib/assignees'
import { formatCentsCorto } from '@/lib/money'
import type { Budget, Child, Expense, FamilyMember } from '@/types'

interface ExpenseRowProps {
  expense: Expense
  budgets: Budget[]
  members: FamilyMember[]
  kids: Child[]
  onEdit: () => void
}

/**
 * Un gasto en la lista del mes: qué fue, de qué presupuesto sale, quién lo pagó
 * y cuánto.
 *
 * Quien pagó va como un punto de su color con el nombre al lado, y no solo como
 * punto: el color dice **de quién** —eso sí es lo suyo en Farpi— pero no puede
 * ser lo único, porque catorce colores no se recuerdan y dos de ellos se parecen.
 * Cuando lo pagó la cuenta común no se pinta nada: "de casa" es el caso normal y
 * repetirlo en cada fila sería ruido.
 */
export function ExpenseRow({ expense, budgets, members, kids, onEdit }: ExpenseRowProps) {
  const budget = budgets.find(b => b.id === expense.budget_id)
  const quienPago = resolveAssignee(expense, members, kids)

  return (
    <button
      onClick={onEdit}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas active:bg-canvas"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {expense.description ?? (budget ? budget.name : 'Gasto')}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
          <span>{format(parseISO(expense.date), 'd MMM', { locale: es })}</span>
          {budget && (
            <span className="truncate">
              {budget.emoji ? `${budget.emoji} ` : ''}{budget.name}
            </span>
          )}
          {quienPago && (
            <span className="flex items-center gap-1 truncate">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: quienPago.color }}
                aria-hidden
              />
              {quienPago.name}
            </span>
          )}
        </p>
      </div>

      <span className="flex-shrink-0 text-sm font-bold text-ink">{formatCentsCorto(expense.amount_cents)}</span>
    </button>
  )
}
