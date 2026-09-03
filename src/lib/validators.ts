import { VALID_MIME_TYPES, MAX_DOC_SIZE } from './constants'
import { isRangeKind } from './events'
import { MAX_CENTIMOS, formatCentsCorto, parseAmountToCentsBruto } from './finanzas'
import type {
  BudgetDraft, ChildDraft, EventDraft, ExpenseDraft, FixedEntryDraft, TaskDraft,
  MealDraft, ListDraft, ListItemDraft, NoteDraft, QuoteDraft,
} from '@/types'

// ─── Email ────────────────────────────────────────────────────────────────────

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export function validateDocumentFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!VALID_MIME_TYPES.includes(file.type as typeof VALID_MIME_TYPES[number])) {
    return { ok: false, message: 'Solo se admiten PDF, JPG o PNG.' }
  }
  if (file.size > MAX_DOC_SIZE) {
    return { ok: false, message: 'El archivo supera el límite de 20 MB.' }
  }
  return { ok: true }
}

// ─── Familia ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el nombre es válido. */
export function validateFamilyName(name: string): string | null {
  if (!name.trim()) return 'El nombre de la familia no puede estar vacío.'
  return null
}

// ─── Hijos ────────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateChildDraft(draft: ChildDraft): string | null {
  if (!draft.name.trim())
    return draft.kind === 'adulto'
      ? 'El nombre del adulto no puede estar vacío.'
      : 'El nombre del hijo no puede estar vacío.'
  return null
}

// ─── Comidas ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateMealDraft(draft: MealDraft): string | null {
  if (!draft.date) return 'La fecha es obligatoria.'
  if (!draft.name.trim()) return 'El nombre del plato no puede estar vacío.'
  return null
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export function validateEventDraft(draft: EventDraft): string | null {
  // Solo un plan necesita nombre. Unas vacaciones o un descanso ya dicen lo que
  // son por el tipo, y `eventTitleOr` les pone el nombre al guardar.
  if (draft.kind === 'evento' && !draft.title.trim()) return 'El título es obligatorio.'
  // Un cumpleaños es el nombre de alguien: sin él no queda nada que felicitar,
  // y "Cumpleaños" a secas en la tarjeta de hoy no dice de quién.
  if (draft.kind === 'cumple' && !draft.title.trim()) return 'Pon de quién es el cumpleaños.'
  if (!draft.date) return 'La fecha es obligatoria.'
  if (draft.kind === 'cumple' && draft.birth_year.trim()) {
    const ano = Number(draft.birth_year)
    // El año solo sirve para decir la edad, así que un año imposible o
    // posterior al día que se celebra daría una edad negativa o absurda.
    if (!Number.isInteger(ano) || ano < 1900 || ano > Number(draft.date.slice(0, 4)))
      return 'El año de nacimiento no parece correcto.'
  }
  if (isRangeKind(draft.kind) && (!draft.end_date || draft.end_date < draft.date))
    return 'La fecha final debe ser posterior o igual a la inicial.'
  // Sin esto la comparación de abajo no salta —cualquier hora es mayor que la
  // cadena vacía— y el evento se guardaba empezando a las 00:00, que es lo que
  // pone `eventInsert` cuando no hay hora de inicio.
  if (!draft.all_day && draft.end_time && !draft.start_time)
    return 'Indica primero la hora de inicio.'
  if (!draft.all_day && draft.end_time && draft.end_time <= draft.start_time)
    return 'La hora de fin debe ser posterior a la de inicio.'
  return null
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export function validateTaskDraft(draft: TaskDraft): string | null {
  if (!draft.title.trim()) return 'El título es obligatorio.'
  if (draft.recurrence !== 'none' && draft.recurrence_end && draft.due_date && draft.recurrence_end < draft.due_date)
    return 'La fecha de fin de recurrencia debe ser posterior a la fecha de inicio.'
  return null
}

// ─── Listas ───────────────────────────────────────────────────────────────────

export function validateListDraft(draft: ListDraft): string | null {
  if (!draft.name.trim()) return 'El nombre de la lista no puede estar vacío.'
  return null
}

// ─── Ítems de lista ───────────────────────────────────────────────────────────

export function validateListItemDraft(draft: ListItemDraft): string | null {
  if (!draft.text.trim()) return 'El texto es obligatorio.'
  return null
}

// ─── Notas ────────────────────────────────────────────────────────────────────

/**
 * El título es lo único obligatorio: es lo que se lee en el índice y lo que se
 * busca. Una nota sin cuerpo es legítima —"Wifi: casa-garcia / 1234" cabe entera
 * en el título—, pero una sin título sería una tarjeta en blanco.
 */
export function validateNoteDraft(draft: NoteDraft): string | null {
  if (!draft.title.trim()) return 'El título de la nota no puede estar vacío.'
  return null
}

// ─── Finanzas ────────────────────────────────────────────────────────────────

/**
 * Un importe tecleado, validado una sola vez para las cuatro cosas que llevan
 * dinero. El mensaje distingue los dos fallos posibles porque no se arreglan
 * igual: uno es no entender lo escrito, y el otro es entenderlo perfectamente y
 * que sea absurdo.
 */
function validateImporte(texto: string, queEs: string): string | null {
  if (!texto.trim()) return `Pon ${queEs}.`
  // Sin tope aquí: pasarse es un error distinto de no entenderse, y decir "no
  // parece correcto" ante un número perfectamente escrito de dos millones no
  // ayuda a nadie a arreglarlo.
  const centimos = parseAmountToCentsBruto(texto)
  if (centimos === null) return 'El importe no parece correcto. Prueba con algo como 24,90.'
  if (centimos > MAX_CENTIMOS) return `Como mucho ${formatCentsCorto(MAX_CENTIMOS)}.`
  return null
}

/**
 * Un fijo necesita nombre e importe. No pide fecha ni persona: no ocurre ningún
 * día concreto —vale todos los meses— y el recibo domiciliado de la casa no es
 * de nadie, que es el caso normal.
 */
export function validateFixedEntryDraft(draft: FixedEntryDraft): string | null {
  if (!draft.name.trim()) {
    return draft.kind === 'ingreso' ? 'Di de qué es el ingreso.' : 'Di de qué es el gasto.'
  }
  return validateImporte(draft.amount, 'cuánto es al mes')
}

export function validateBudgetDraft(draft: BudgetDraft): string | null {
  if (!draft.name.trim()) return 'La partida necesita un nombre.'
  return validateImporte(draft.monthly_limit, 'cuánto se puede gastar al mes')
}

/**
 * Un apunte necesita importe y fecha, y nada más. La descripción es opcional
 * a propósito: la mitad de los gastos de una casa son "la compra" y obligar a
 * escribirlo cada vez es la clase de fricción que hace que se deje de apuntar,
 * que es el único modo en que esta pantalla falla de verdad.
 */
export function validateExpenseDraft(draft: ExpenseDraft): string | null {
  const importe = validateImporte(draft.amount, 'cuánto ha sido')
  if (importe) return importe
  if (!draft.date) return 'La fecha es obligatoria.'
  return null
}

export function validateQuoteDraft(draft: QuoteDraft): string | null {
  if (!draft.title.trim()) return 'Di para qué es el presupuesto.'
  if (!draft.provider.trim()) return 'Di quién te lo ha pasado.'
  return validateImporte(draft.amount, 'cuánto cuesta')
}

// ─── Vuelta al sitio después de entrar ────────────────────────────────────────

const ORIGEN_DE_PRUEBA = 'https://farpi.invalid'

/**
 * A dónde se puede mandar a alguien después de validar un enlace de correo.
 *
 * El `?next=` de la URL lo escribe quien manda el enlace, no la app, así que un
 * `next=https://otra-cosa.example` convertiría un correo legítimo de Farpi en un
 * salto a una web ajena justo después de iniciar sesión — que es el momento en
 * el que uno se cree lo que ve. Solo se aceptan rutas de la propia app.
 *
 * Mirar el principio de la cadena **no basta** (03-09-2026): el navegador borra
 * los tabuladores y los saltos de línea de una URL *antes* de interpretarla, así
 * que un `/<salto>//otra-cosa.example` pasaba el filtro por la izquierda y se
 * leía después como `///otra-cosa.example`, que es otro dominio. Se limpian esos
 * tres caracteres y luego se resuelve la ruta contra un origen inventado: si al
 * resolverla el origen cambia, no era una ruta de la app. Decide el navegador,
 * que es quien va a interpretarla, en vez de imitar sus reglas a mano.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/home'

  // Los tres que el navegador ignora al parsear, y en todo el valor, no solo al
  // principio: tabulador, salto de línea y retorno de carro.
  const limpio = next.replace(/[\t\n\r]/g, '')
  if (!limpio.startsWith('/')) return '/home'

  try {
    const url = new URL(limpio, ORIGEN_DE_PRUEBA)
    if (url.origin !== ORIGEN_DE_PRUEBA) return '/home'
    // Se devuelve lo que el navegador entendió y no lo que llegó, para que el
    // destino sea exactamente el que se acaba de comprobar.
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/home'
  }
}
