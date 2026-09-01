'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import {
  agruparPresupuestos, gastosDelMes, gastosSinPresupuesto, mesDe, mesVecino,
  repartoDelMes, resumenPresupuestos, sumaDe, titulosDePresupuestos,
} from '@/lib/budgets'
import { getLocalDateString } from '@/lib/date-utils'
import type { Budget, BudgetDraft, Expense, ExpenseDraft, Quote, QuoteDraft } from '@/types'

export type PestañaFinanzas = 'mes' | 'presupuestos'

/**
 * El estado de la pantalla de Finanzas: qué pestaña se mira, qué mes y qué sheet
 * está abierto.
 *
 * El mes vive **aquí y no en la URL**, al revés que las pestañas de Ajustes.
 * Allí la URL importaba porque el menú de la cuenta entraba directo a una
 * sección; aquí nadie enlaza a "las finanzas de julio", y una URL que cambia cada
 * vez que se toca una flecha llena el historial de pasos atrás que no llevan a
 * ninguna parte.
 */
export function useFinanzasState() {
  const {
    budgets, expenses, quotes, members, kids,
    createBudget, updateBudget, deleteBudget,
    createExpense, updateExpense, deleteExpense,
    createQuote, updateQuote, deleteQuote, setQuoteStatus,
  } = useStore()

  const hoy = getLocalDateString(new Date())

  const [pestaña, setPestaña] = useState<PestañaFinanzas>('mes')
  const [mes, setMes] = useState(() => mesDe(hoy))

  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)

  const resumen = useMemo(() => resumenPresupuestos(budgets, expenses, mes), [budgets, expenses, mes])
  const delMes = useMemo(() => gastosDelMes(expenses, mes), [expenses, mes])
  const sinPresupuesto = useMemo(() => gastosSinPresupuesto(expenses, mes), [expenses, mes])
  const total = useMemo(() => sumaDe(delMes), [delMes])
  const reparto = useMemo(() => repartoDelMes(expenses, mes, members, kids), [expenses, mes, members, kids])
  const grupos = useMemo(() => agruparPresupuestos(quotes), [quotes])
  const titulos = useMemo(() => titulosDePresupuestos(quotes), [quotes])

  // Los sheets se remontan al cambiar de cosa editada, como en el resto de la
  // app: sin esto, editar un gasto justo después de otro deja los valores del
  // primero escritos en los campos.
  //
  // Cada clave lleva delante de qué sheet es, y no es adorno: **los tres cuelgan
  // del mismo padre**, así que el `create` pelado que usan las demás pantallas
  // —donde solo hay un sheet— daba dos hermanos con la misma clave y React lo
  // cantaba por consola. Lo pilló `runtime.spec.ts`, que tumba la suite ante
  // cualquier `console.error`.
  const expenseKey = editingExpense ? `gasto-${editingExpense.id}` : `gasto-nuevo-${mes}`
  const budgetKey = editingBudget ? `presupuesto-${editingBudget.id}` : 'presupuesto-nuevo'
  const quoteKey = editingQuote ? `pedido-${editingQuote.id}` : 'pedido-nuevo'

  return {
    hoy, mes, setMes,
    mesAnterior: () => setMes(m => mesVecino(m, -1)),
    mesSiguiente: () => setMes(m => mesVecino(m, 1)),
    /** Volver al mes en curso. Se ofrece solo cuando se está mirando otro. */
    volverAHoy: () => setMes(mesDe(hoy)),
    esMesActual: mes === mesDe(hoy),

    pestaña, setPestaña,

    budgets, resumen, delMes, sinPresupuesto, total, reparto, grupos, titulos,

    expenseSheetOpen, setExpenseSheetOpen, editingExpense, expenseKey,
    budgetSheetOpen, setBudgetSheetOpen, editingBudget, budgetKey,
    quoteSheetOpen, setQuoteSheetOpen, editingQuote, quoteKey,

    abrirGasto(expense: Expense | null) {
      setEditingExpense(expense)
      setExpenseSheetOpen(true)
    },
    abrirPresupuesto(budget: Budget | null) {
      setEditingBudget(budget)
      setBudgetSheetOpen(true)
    },
    abrirPedido(quote: Quote | null) {
      setEditingQuote(quote)
      setQuoteSheetOpen(true)
    },

    guardarGasto(draft: ExpenseDraft) {
      if (editingExpense) updateExpense(editingExpense.id, draft)
      else createExpense(draft)
    },
    guardarPresupuesto(draft: BudgetDraft) {
      if (editingBudget) updateBudget(editingBudget.id, draft)
      else createBudget(draft)
    },
    guardarPedido(draft: QuoteDraft) {
      if (editingQuote) updateQuote(editingQuote.id, draft)
      else createQuote(draft)
    },

    deleteExpense, deleteBudget, deleteQuote, setQuoteStatus,
  }
}
