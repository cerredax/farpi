'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import {
  agruparPresupuestos, cuentaDelMes, fijosDe, gastosSinTope, mesDe,
  mesVecino, movimientosDelMes, repartoDelMes, resumenTopes,
  titulosDePresupuestos,
} from '@/lib/budgets'
import { getLocalDateString } from '@/lib/date-utils'
import type {
  Budget, BudgetDraft, Expense, ExpenseDraft, FixedEntry, FixedEntryDraft,
  MovementKind, Quote, QuoteDraft,
} from '@/types'

export type PestañaFinanzas = 'mes' | 'fijos' | 'presupuestos'

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
    fixedEntries, budgets, expenses, quotes, members, kids,
    createFixedEntry, updateFixedEntry, deleteFixedEntry,
    createBudget, updateBudget, deleteBudget,
    createExpense, updateExpense, deleteExpense,
    createQuote, updateQuote, deleteQuote, setQuoteStatus,
  } = useStore()

  const hoy = getLocalDateString(new Date())

  const [pestaña, setPestaña] = useState<PestañaFinanzas>('mes')
  const [mes, setMes] = useState(() => mesDe(hoy))

  const [fixedSheetOpen, setFixedSheetOpen] = useState(false)
  const [editingFixed, setEditingFixed] = useState<FixedEntry | null>(null)
  const [kindNuevoFijo, setKindNuevoFijo] = useState<MovementKind>('ingreso')
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)

  const resumen = useMemo(() => resumenTopes(budgets, expenses, mes), [budgets, expenses, mes])
  const delMes = useMemo(() => movimientosDelMes(expenses, mes), [expenses, mes])
  const sinTope = useMemo(() => gastosSinTope(expenses, mes), [expenses, mes])
  const cuenta = useMemo(() => cuentaDelMes(fixedEntries, expenses, mes), [fixedEntries, expenses, mes])
  const ingresosFijos = useMemo(() => fijosDe(fixedEntries, 'ingreso'), [fixedEntries])
  const gastosFijos = useMemo(() => fijosDe(fixedEntries, 'gasto'), [fixedEntries])
  const reparto = useMemo(() => repartoDelMes(expenses, mes, members, kids), [expenses, mes, members, kids])
  const grupos = useMemo(() => agruparPresupuestos(quotes), [quotes])
  const titulos = useMemo(() => titulosDePresupuestos(quotes), [quotes])

  // Los sheets se remontan al cambiar de cosa editada, como en el resto de la
  // app: sin esto, editar un gasto justo después de otro deja los valores del
  // primero escritos en los campos.
  //
  // Cada clave lleva delante de qué sheet es, y no es adorno: **los cuatro
  // cuelgan del mismo padre**, así que el `create` pelado que usan las demás
  // pantallas —donde solo hay un sheet— daba dos hermanos con la misma clave y
  // React lo cantaba por consola. Lo pilló `runtime.spec.ts`, que tumba la suite
  // ante cualquier `console.error`.
  const fixedKey = editingFixed ? `fijo-${editingFixed.id}` : `fijo-nuevo-${kindNuevoFijo}`
  const expenseKey = editingExpense ? `gasto-${editingExpense.id}` : `gasto-nuevo-${mes}`
  const budgetKey = editingBudget ? `tope-${editingBudget.id}` : 'tope-nuevo'
  const quoteKey = editingQuote ? `pedido-${editingQuote.id}` : 'pedido-nuevo'

  return {
    hoy, mes, setMes,
    mesAnterior: () => setMes(m => mesVecino(m, -1)),
    mesSiguiente: () => setMes(m => mesVecino(m, 1)),
    /** Volver al mes en curso. Se ofrece solo cuando se está mirando otro. */
    volverAHoy: () => setMes(mesDe(hoy)),
    esMesActual: mes === mesDe(hoy),

    pestaña, setPestaña,

    budgets, members, kids,
    resumen, delMes, sinTope, cuenta, reparto, grupos, titulos,
    ingresosFijos, gastosFijos,

    fixedSheetOpen, setFixedSheetOpen, editingFixed, kindNuevoFijo, fixedKey,
    expenseSheetOpen, setExpenseSheetOpen, editingExpense, expenseKey,
    budgetSheetOpen, setBudgetSheetOpen, editingBudget, budgetKey,
    quoteSheetOpen, setQuoteSheetOpen, editingQuote, quoteKey,

    abrirFijoNuevo(kind: MovementKind) {
      setEditingFixed(null)
      setKindNuevoFijo(kind)
      setFixedSheetOpen(true)
    },
    abrirFijo(fijo: FixedEntry) {
      setEditingFixed(fijo)
      setFixedSheetOpen(true)
    },
    abrirGasto(expense: Expense | null) {
      setEditingExpense(expense)
      setExpenseSheetOpen(true)
    },
    abrirTope(budget: Budget | null) {
      setEditingBudget(budget)
      setBudgetSheetOpen(true)
    },
    abrirPedido(quote: Quote | null) {
      setEditingQuote(quote)
      setQuoteSheetOpen(true)
    },

    guardarFijo(draft: FixedEntryDraft) {
      if (editingFixed) updateFixedEntry(editingFixed.id, draft)
      else createFixedEntry(draft)
    },
    guardarGasto(draft: ExpenseDraft) {
      if (editingExpense) updateExpense(editingExpense.id, draft)
      else createExpense(draft)
    },
    guardarTope(draft: BudgetDraft) {
      if (editingBudget) updateBudget(editingBudget.id, draft)
      else createBudget(draft)
    },
    guardarPedido(draft: QuoteDraft) {
      if (editingQuote) updateQuote(editingQuote.id, draft)
      else createQuote(draft)
    },

    deleteFixedEntry, deleteExpense, deleteBudget, deleteQuote, setQuoteStatus,
  }
}
