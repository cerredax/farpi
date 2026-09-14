'use client'

import { ExpenseRow } from './ExpenseRow'
import { formatCentsCorto } from '@/lib/finanzas'
import type { GrupoDeApuntes } from '@/lib/budgets'
import type { Budget, Child, Expense, FamilyMember } from '@/types'

interface ListaDeApuntesProps {
  grupos: GrupoDeApuntes[]
  /** Cómo se escribe el rótulo de un grupo: «Hoy», «Sábado 13», «Agosto». */
  rotulo: (clave: string) => string
  /**
   * Si cada fila dice su fecha. Agrupando por días sobra —ya lo dice el rótulo—;
   * agrupando por meses hace falta, que es el caso de una búsqueda.
   */
  conFecha?: boolean
  budgets: Budget[]
  members: FamilyMember[]
  kids: Child[]
  onEdit: (apunte: Expense) => void
}

/**
 * Los apuntes, en grupos con su rótulo y su cifra: los días de un mes en «El día
 * a día», los meses en los resultados de una búsqueda.
 *
 * **Por qué agrupar** (14-09-2026). Un mes con setenta apuntes eran setenta filas
 * iguales con la fecha en gris de 11 px, y la única forma de saber qué se fue el
 * sábado era ir bajando y leyendo la columna de la izquierda renglón a renglón.
 * Es el mismo problema que tenían los doce meses seguidos de Cumpleaños el día
 * antes, y se arregla igual: cada grupo con su rótulo encima. El patrón es el de
 * ahí y el de los tramos de la agenda —versalitas apagadas, que separan sin
 * competir con lo que hay dentro— y por eso no se inventa aquí nada nuevo.
 *
 * **Y con la cifra del grupo**, que es lo que un rótulo puede dar gratis: «Sábado
 * 13 · 96,40 €» contesta de un vistazo algo que antes había que sumar a mano.
 *
 * Lo que entra y lo que sale van **separados y no restados**: un día con una
 * devolución de 40 € y una compra de 40 € no es un día en el que no pasó nada. El
 * ingreso lleva su «+» y el verde de la marca, igual que en su fila.
 */
export function ListaDeApuntes({ grupos, rotulo, conFecha = true, budgets, members, kids, onEdit }: ListaDeApuntesProps) {
  return (
    <>
      {grupos.map(grupo => (
        <section key={grupo.clave} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">
              {rotulo(grupo.clave)}
            </h3>
            <p className="flex-shrink-0 text-xs font-bold tabular-nums text-muted">
              {grupo.gastado > 0 && formatCentsCorto(grupo.gastado)}
              {grupo.gastado > 0 && grupo.ingresado > 0 && ' · '}
              {grupo.ingresado > 0 && (
                <span className="text-primary-strong">+{formatCentsCorto(grupo.ingresado)}</span>
              )}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm divide-y divide-hairline">
            {grupo.apuntes.map(apunte => (
              <ExpenseRow
                key={apunte.id}
                expense={apunte}
                budgets={budgets}
                members={members}
                kids={kids}
                conFecha={conFecha}
                onEdit={() => onEdit(apunte)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
