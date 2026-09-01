import { createClient } from '../supabase/client'
import { parseAmountToCents } from '../money'
import { assertNoError, currentUserId } from './shared'
import type { Budget, BudgetDraft, Expense, ExpenseDraft, Quote, QuoteDraft, QuoteStatus } from '@/types'
import type { BudgetsRepo, ExpensesRepo, QuotesRepo } from '../repos/types'

/**
 * El dinero de la casa contra Supabase: topes, gastos y presupuestos pedidos.
 *
 * Lo único que hay que mirar dos veces es la conversión del importe: el
 * formulario da texto ("12,50") y la base quiere céntimos enteros. Se hace con
 * el mismo `parseAmountToCents` que usa el mock, y no con una cuenta escrita
 * aquí, porque dos conversiones distintas es exactamente el modo en que el modo
 * demo y la app de verdad dejan de comportarse igual.
 *
 * El `?? 0` no es un valor por defecto de verdad: para llegar aquí el draft ya
 * pasó por `validateExpenseDraft`, que rechaza lo que no se entiende. Y si algo
 * se colara, el `check` de la tabla lo para —los importes van de 1 céntimo a un
 * millón de euros— en vez de guardar un cero silencioso.
 */
function centimos(texto: string): number {
  return parseAmountToCents(texto) ?? 0
}

export const budgetsRepo: BudgetsRepo = {
  async getBudgets(familyId: string): Promise<Budget[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('family_id', familyId)
      .order('sort_order', { ascending: true })
    assertNoError(error)
    return data ?? []
  },

  async createBudget(familyId: string, draft: BudgetDraft): Promise<Budget> {
    const supabase = createClient()
    const userId = await currentUserId()
    // El sitio en la lista se calcula con lo que ya hay. Una carrera entre dos
    // móviles dejaría dos con el mismo número, y no pasa nada: el orden desempata
    // por nombre (`resumenPresupuestos`).
    const { count, error: errorCuenta } = await supabase
      .from('budgets')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId)
    assertNoError(errorCuenta)

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        family_id: familyId,
        name: draft.name.trim(),
        emoji: draft.emoji || null,
        monthly_limit_cents: centimos(draft.monthly_limit),
        sort_order: count ?? 0,
        created_by: userId,
      })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateBudget(id: string, draft: BudgetDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('budgets')
      .update({
        name: draft.name.trim(),
        emoji: draft.emoji || null,
        monthly_limit_cents: centimos(draft.monthly_limit),
      })
      .eq('id', id)
    assertNoError(error)
  },

  // Los gastos que colgaban de él se quedan, sin presupuesto: lo hace el
  // `on delete set null` de la clave ajena, no hace falta tocarlos aquí.
  async deleteBudget(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    assertNoError(error)
  },
}

export const expensesRepo: ExpensesRepo = {
  async getExpenses(familyId: string): Promise<Expense[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('family_id', familyId)
      .order('date', { ascending: false })
    assertNoError(error)
    return data ?? []
  },

  async createExpense(familyId: string, draft: ExpenseDraft): Promise<Expense> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        family_id: familyId,
        budget_id: draft.budget_id,
        child_id: draft.child_id,
        member_id: draft.member_id,
        amount_cents: centimos(draft.amount),
        date: draft.date,
        description: draft.description.trim() || null,
        created_by: userId,
      })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateExpense(id: string, draft: ExpenseDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('expenses')
      .update({
        budget_id: draft.budget_id,
        child_id: draft.child_id,
        member_id: draft.member_id,
        amount_cents: centimos(draft.amount),
        date: draft.date,
        description: draft.description.trim() || null,
      })
      .eq('id', id)
    assertNoError(error)
  },

  async deleteExpense(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    assertNoError(error)
  },
}

export const quotesRepo: QuotesRepo = {
  async getQuotes(familyId: string): Promise<Quote[]> {
    const supabase = createClient()
    // Por título y precio, que es como los agrupa y ordena la pantalla. Quien
    // manda sigue siendo `agruparPresupuestos`, compartido con el mock.
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('family_id', familyId)
      .order('title', { ascending: true })
      .order('amount_cents', { ascending: true })
    assertNoError(error)
    return data ?? []
  },

  async createQuote(familyId: string, draft: QuoteDraft): Promise<Quote> {
    const supabase = createClient()
    const userId = await currentUserId()
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        family_id: familyId,
        title: draft.title.trim(),
        provider: draft.provider.trim(),
        amount_cents: centimos(draft.amount),
        status: draft.status,
        valid_until: draft.valid_until || null,
        notes: draft.notes.trim() || null,
        created_by: userId,
      })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateQuote(id: string, draft: QuoteDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('quotes')
      .update({
        title: draft.title.trim(),
        provider: draft.provider.trim(),
        amount_cents: centimos(draft.amount),
        status: draft.status,
        valid_until: draft.valid_until || null,
        notes: draft.notes.trim() || null,
      })
      .eq('id', id)
    assertNoError(error)
  },

  async setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id)
    assertNoError(error)
  },

  async deleteQuote(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    assertNoError(error)
  },
}
