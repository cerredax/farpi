'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import {
  agruparPresupuestos, apuntesDelMes, cuentaDelMes, fijosDe, gastosSinPartida,
  mesDe, mesVecino, plantillaDelMes, repartoDelMes, resumenPartidas, sumaDeFijos,
  titulosDePresupuestos,
} from '@/lib/budgets'
import { getLocalDateString } from '@/lib/date-utils'
import type {
  Budget, BudgetDraft, Expense, ExpenseDraft, FixedEntry, FixedEntryDraft,
  MovementKind, Quote, QuoteDraft,
} from '@/types'

export type PestañaFinanzas = 'mes' | 'plantilla' | 'presupuestos'

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
    fixedEntries, budgets, expenses, quotes, monthPlans, members, kids,
    closeMonthNow, reopenMonth,
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

  const mesActual = mesDe(hoy)

  // Qué valía en el mes que se está mirando: la plantilla viva si no ha
  // terminado, la copia congelada si terminó. Todo lo de «El mes» cuelga de aquí,
  // y por eso se calcula una sola vez y no en cada selector.
  const plantilla = useMemo(
    () => plantillaDelMes(mes, mesActual, fixedEntries, budgets, monthPlans),
    [mes, mesActual, fixedEntries, budgets, monthPlans],
  )

  const resumen = useMemo(() => resumenPartidas(plantilla, expenses, mes), [plantilla, expenses, mes])
  const delMes = useMemo(() => apuntesDelMes(expenses, mes), [expenses, mes])
  const sinPartida = useMemo(() => gastosSinPartida(expenses, mes), [expenses, mes])
  const cuenta = useMemo(() => cuentaDelMes(plantilla, expenses, mes), [plantilla, expenses, mes])
  const ingresosFijos = useMemo(() => fijosDe(fixedEntries, 'ingreso'), [fixedEntries])
  const gastosFijos = useMemo(() => fijosDe(fixedEntries, 'gasto'), [fixedEntries])
  const partidasPlantilla = useMemo(
    () => [...budgets].sort((a, b) => (
      a.sort_order === b.sort_order ? a.name.localeCompare(b.name, 'es') : a.sort_order - b.sort_order
    )),
    [budgets],
  )
  const totalPartidas = useMemo(
    () => budgets.reduce((total, b) => total + b.monthly_limit_cents, 0),
    [budgets],
  )
  const reparto = useMemo(() => repartoDelMes(expenses, mes, members, kids), [expenses, mes, members, kids])
  const grupos = useMemo(() => agruparPresupuestos(quotes), [quotes])
  const titulos = useMemo(() => titulosDePresupuestos(quotes), [quotes])

  // Los sheets se remontan al cambiar de cosa editada, como en el resto de la
  // app: sin esto, editar un apunte justo después de otro deja los valores del
  // primero escritos en los campos.
  //
  // Cada clave lleva delante de qué sheet es, y no es adorno: **los cuatro
  // cuelgan del mismo padre**, así que el `create` pelado que usan las demás
  // pantallas —donde solo hay un sheet— daba dos hermanos con la misma clave y
  // React lo cantaba por consola. Lo pilló `runtime.spec.ts`, que tumba la suite
  // ante cualquier `console.error`.
  const fixedKey = editingFixed ? `fijo-${editingFixed.id}` : `fijo-nuevo-${kindNuevoFijo}`
  const expenseKey = editingExpense ? `apunte-${editingExpense.id}` : `apunte-nuevo-${mes}`
  const budgetKey = editingBudget ? `partida-${editingBudget.id}` : 'partida-nueva'
  const quoteKey = editingQuote ? `pedido-${editingQuote.id}` : 'pedido-nuevo'

  return {
    hoy, mes, setMes,
    mesAnterior: () => setMes(m => mesVecino(m, -1)),
    mesSiguiente: () => setMes(m => mesVecino(m, 1)),
    /** Volver al mes en curso. Se ofrece solo cuando se está mirando otro. */
    volverAHoy: () => setMes(mesActual),
    esMesActual: mes === mesActual,
    /**
     * Si el plan de este mes está congelado: sus partidas no se editan desde aquí
     * y no se ofrece crear ninguna, porque una partida es de la plantilla.
     *
     * **No tiene nada que ver con apuntar.** Lo que se congela es el plan —los
     * fijos y los límites—, no el día a día: el 2 de octubre te acuerdas de los
     * 40 € del 29 de septiembre y tienen que caber. Estuvieron sin caber unas
     * horas el 02-09-2026, por confundir las dos cosas.
     */
    planCongelado: plantilla.origen === 'copia',
    /** Se puede cerrar a mano lo que aún no está cerrado y ya ha empezado. */
    sePuedeCerrarYa: plantilla.origen === 'plantilla' && mes <= mesActual,
    /** Y deshacerlo, solo mientras el mes siga siendo el de hoy. */
    sePuedeReabrir: plantilla.origen === 'copia' && mes === mesActual,
    cerrarMesYa: () => closeMonthNow(mes),
    reabrirMes: () => reopenMonth(mes),
    plantilla,

    pestaña, setPestaña,

    budgets, members, kids,
    resumen, delMes, sinPartida, cuenta, reparto, grupos, titulos,
    ingresosFijos, gastosFijos, partidasPlantilla, totalPartidas,
    totalIngresosFijos: sumaDeFijos(fixedEntries, 'ingreso'),
    totalGastosFijos: sumaDeFijos(fixedEntries, 'gasto'),

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
    abrirApunte(expense: Expense | null) {
      setEditingExpense(expense)
      setExpenseSheetOpen(true)
    },
    abrirPartida(budget: Budget | null) {
      setEditingBudget(budget)
      setBudgetSheetOpen(true)
    },
    /**
     * Editar una partida desde su barra en «El mes». La barra solo lleva el id
     * —lo demás lo tiene copiado, para poder pintar una partida ya borrada—, así
     * que hay que ir a buscar la viva. Si no está, no se abre nada.
     */
    abrirPartidaPorId(id: string) {
      const budget = budgets.find(b => b.id === id)
      if (!budget) return
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
    guardarApunte(draft: ExpenseDraft) {
      if (editingExpense) updateExpense(editingExpense.id, draft)
      else createExpense(draft)
    },
    guardarPartida(draft: BudgetDraft) {
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
