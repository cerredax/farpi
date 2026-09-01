import { parseAmountToCents } from '../finanzas'
import type {
  Budget, BudgetDraft, Expense, ExpenseDraft, FixedEntry, FixedEntryDraft,
  Quote, QuoteDraft, QuoteStatus,
} from '@/types'
import { db } from './db'

/**
 * Fijos, topes, movimientos y presupuestos pedidos, en memoria.
 *
 * Tiene que comportarse como Supabase, y aquí eso significa cuatro cosas
 * concretas: filtrar por `family_id`, guardar **céntimos enteros** pasando el
 * texto por `parseAmountToCents` —el mismo que usa el repo de Supabase, para que
 * "12,50" no valga 1250 en un sitio y 12,5 en el otro—, al borrar un tope dejar
 * sus movimientos con `budget_id` a null en vez de llevárselos por delante (el
 * `on delete set null` de la clave ajena) y forzar `budget_id` a null en los
 * ingresos, que en la base lo impide un `check`.
 */

/** Lo que un draft dice en céntimos. El validador ya garantizó que se entiende. */
function centimos(texto: string): number {
  return parseAmountToCents(texto) ?? 0
}

// ─── Fijos ────────────────────────────────────────────────────────────────────

export function getFixedEntries(familyId: string): FixedEntry[] {
  return db.fixedEntries.filter(f => f.family_id === familyId)
}

export function createFixedEntry(familyId: string, draft: FixedEntryDraft): FixedEntry {
  const now = new Date().toISOString()
  const f: FixedEntry = {
    id: crypto.randomUUID(),
    family_id: familyId,
    kind: draft.kind,
    name: draft.name.trim(),
    emoji: draft.emoji || null,
    amount_cents: centimos(draft.amount),
    child_id: draft.child_id,
    member_id: draft.member_id,
    // Al final de los de su tipo: los ingresos y los gastos son dos listas
    // distintas en pantalla, y un contador común dejaría huecos en las dos.
    sort_order: getFixedEntries(familyId).filter(x => x.kind === draft.kind).length,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.fixedEntries = [...db.fixedEntries, f]
  return f
}

export function updateFixedEntry(id: string, draft: FixedEntryDraft): void {
  db.fixedEntries = db.fixedEntries.map(f =>
    f.id !== id ? f : {
      ...f,
      kind: draft.kind,
      name: draft.name.trim(),
      emoji: draft.emoji || null,
      amount_cents: centimos(draft.amount),
      child_id: draft.child_id,
      member_id: draft.member_id,
      updated_at: new Date().toISOString(),
    }
  )
}

export function deleteFixedEntry(id: string): void {
  db.fixedEntries = db.fixedEntries.filter(f => f.id !== id)
}

// ─── Topes ────────────────────────────────────────────────────────────────────

export function getBudgets(familyId: string): Budget[] {
  return db.budgets.filter(b => b.family_id === familyId)
}

export function createBudget(familyId: string, draft: BudgetDraft): Budget {
  const now = new Date().toISOString()
  const b: Budget = {
    id: crypto.randomUUID(),
    family_id: familyId,
    name: draft.name.trim(),
    emoji: draft.emoji || null,
    monthly_limit_cents: centimos(draft.monthly_limit),
    // Al final de la lista, que es donde se espera lo que acabas de crear.
    sort_order: getBudgets(familyId).length,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.budgets = [...db.budgets, b]
  return b
}

export function updateBudget(id: string, draft: BudgetDraft): void {
  db.budgets = db.budgets.map(b =>
    b.id !== id ? b : {
      ...b,
      name: draft.name.trim(),
      emoji: draft.emoji || null,
      monthly_limit_cents: centimos(draft.monthly_limit),
      updated_at: new Date().toISOString(),
    }
  )
}

export function deleteBudget(id: string): void {
  db.budgets = db.budgets.filter(b => b.id !== id)
  // Los movimientos se quedan, sin tope: el dinero se gastó igual, y perder el
  // histórico del mes por reorganizar las categorías sería el peor modo posible
  // de fallar. Imita al `on delete set null` de la base.
  db.expenses = db.expenses.map(e => (e.budget_id === id ? { ...e, budget_id: null } : e))
}

// ─── Movimientos ──────────────────────────────────────────────────────────────

export function getExpenses(familyId: string): Expense[] {
  return db.expenses.filter(e => e.family_id === familyId)
}

export function createExpense(familyId: string, draft: ExpenseDraft): Expense {
  const now = new Date().toISOString()
  const e: Expense = {
    id: crypto.randomUUID(),
    family_id: familyId,
    // Un ingreso nunca cuelga de un tope. Se fuerza aquí y no solo en el
    // formulario porque en Supabase lo fuerza un `check` de la tabla: si el mock
    // lo dejara pasar, el modo demo enseñaría una cuenta que la app real
    // rechazaría.
    budget_id: draft.kind === 'ingreso' ? null : draft.budget_id,
    child_id: draft.child_id,
    member_id: draft.member_id,
    kind: draft.kind,
    amount_cents: centimos(draft.amount),
    date: draft.date,
    description: draft.description.trim() || null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.expenses = [...db.expenses, e]
  return e
}

export function updateExpense(id: string, draft: ExpenseDraft): void {
  db.expenses = db.expenses.map(e =>
    e.id !== id ? e : {
      ...e,
      budget_id: draft.kind === 'ingreso' ? null : draft.budget_id,
      child_id: draft.child_id,
      member_id: draft.member_id,
      kind: draft.kind,
      amount_cents: centimos(draft.amount),
      date: draft.date,
      description: draft.description.trim() || null,
      updated_at: new Date().toISOString(),
    }
  )
}

export function deleteExpense(id: string): void {
  db.expenses = db.expenses.filter(e => e.id !== id)
}

// ─── Presupuestos pedidos ─────────────────────────────────────────────────────

export function getQuotes(familyId: string): Quote[] {
  return db.quotes.filter(q => q.family_id === familyId)
}

export function createQuote(familyId: string, draft: QuoteDraft): Quote {
  const now = new Date().toISOString()
  const q: Quote = {
    id: crypto.randomUUID(),
    family_id: familyId,
    title: draft.title.trim(),
    provider: draft.provider.trim(),
    amount_cents: centimos(draft.amount),
    status: draft.status,
    valid_until: draft.valid_until || null,
    notes: draft.notes.trim() || null,
    created_by: 'u1',
    created_at: now,
    updated_at: now,
  }
  db.quotes = [...db.quotes, q]
  return q
}

export function updateQuote(id: string, draft: QuoteDraft): void {
  db.quotes = db.quotes.map(q =>
    q.id !== id ? q : {
      ...q,
      title: draft.title.trim(),
      provider: draft.provider.trim(),
      amount_cents: centimos(draft.amount),
      status: draft.status,
      valid_until: draft.valid_until || null,
      notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
  )
}

export function setQuoteStatus(id: string, status: QuoteStatus): void {
  db.quotes = db.quotes.map(q => (q.id !== id ? q : { ...q, status, updated_at: new Date().toISOString() }))
}

export function deleteQuote(id: string): void {
  db.quotes = db.quotes.filter(q => q.id !== id)
}
