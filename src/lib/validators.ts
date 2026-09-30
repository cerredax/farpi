import { VALID_MIME_TYPES, MAX_DOC_SIZE } from './constants'
import { antelacionDelAviso, isRangeKind } from './events'
import { MAX_CENTIMOS, formatCentsCorto, parseAmountToCentsBruto } from './finanzas'
import { textosDelNavegador, type Diccionario } from './i18n'
import type {
  BudgetDraft, ChildDraft, EventDraft, ExpenseDraft, FixedEntryDraft,
  FixedOverrideDraft, TaskDraft,
  MealDraft, ListDraft, ListItemDraft, NoteDraft, QuoteDraft,
} from '@/types'

/**
 * Los mensajes salen del diccionario del idioma de este dispositivo
 * (28-09-2026). Cada validador los recibe como último parámetro, con ese idioma
 * por defecto: los sheets no tienen que pasar nada, y los tests pueden probar
 * cualquier idioma. El convenio no cambia: `null` es válido, y un texto es el
 * mensaje que se enseña.
 */
type TextosDeValidacion = Diccionario['validacion']
const textos = (): TextosDeValidacion => textosDelNavegador().validacion

// ─── Email ────────────────────────────────────────────────────────────────────

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export function validateDocumentFile(file: File, t: TextosDeValidacion = textos()): { ok: true } | { ok: false; message: string } {
  if (!VALID_MIME_TYPES.includes(file.type as typeof VALID_MIME_TYPES[number])) {
    return { ok: false, message: t.documentoTipo }
  }
  if (file.size > MAX_DOC_SIZE) {
    return { ok: false, message: t.documentoTamano }
  }
  return { ok: true }
}

// ─── Familia ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el nombre es válido. */
export function validateFamilyName(name: string, t: TextosDeValidacion = textos()): string | null {
  if (!name.trim()) return t.familiaSinNombre
  return null
}

// ─── Hijos ────────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateChildDraft(draft: ChildDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.name.trim())
    return draft.kind === 'adulto' ? t.adultoSinNombre : t.hijoSinNombre
  return null
}

// ─── Comidas ──────────────────────────────────────────────────────────────────

/** Devuelve el mensaje de error o null si el draft es válido. */
export function validateMealDraft(draft: MealDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.date) return t.fechaObligatoria
  if (!draft.name.trim()) return t.platoSinNombre
  return null
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

export function validateEventDraft(draft: EventDraft, t: TextosDeValidacion = textos()): string | null {
  // Solo un plan necesita nombre. Unas vacaciones o un descanso ya dicen lo que
  // son por el tipo, y `eventTitleOr` les pone el nombre al guardar.
  if (draft.kind === 'evento' && !draft.title.trim()) return t.tituloObligatorio
  // Un cumpleaños es el nombre de alguien: sin él no queda nada que felicitar,
  // y "Cumpleaños" a secas en la tarjeta de hoy no dice de quién.
  if (draft.kind === 'cumple' && !draft.title.trim()) return t.cumpleSinNombre
  if (!draft.date) return t.fechaObligatoria
  if (draft.kind === 'cumple' && draft.birth_year.trim()) {
    const ano = Number(draft.birth_year)
    // El año solo sirve para decir la edad, así que un año imposible o
    // posterior al día que se celebra daría una edad negativa o absurda.
    if (!Number.isInteger(ano) || ano < 1900 || ano > Number(draft.date.slice(0, 4)))
      return t.añoDeNacimiento
  }
  if (isRangeKind(draft.kind) && (!draft.end_date || draft.end_date < draft.date))
    return t.fechaFinal
  // Sin esto la comparación de abajo no salta —cualquier hora es mayor que la
  // cadena vacía— y el evento se guardaba empezando a las 00:00, que es lo que
  // pone `eventInsert` cuando no hay hora de inicio.
  if (!draft.all_day && draft.end_time && !draft.start_time)
    return t.horaDeInicioPrimero
  if (!draft.all_day && draft.end_time && draft.end_time <= draft.start_time)
    return t.horaDeFin
  // Un aviso «30 minutos antes» de un plan sin hora sería antes de las 00:00 (el
  // evento se guarda a esa hora cuando no hay otra): no hay cuándo avisar.
  if (antelacionDelAviso(draft) !== null && !draft.start_time)
    return t.avisoSinHora
  return null
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export function validateTaskDraft(draft: TaskDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.title.trim()) return t.tituloObligatorio
  if (draft.recurrence !== 'none' && draft.recurrence_end && draft.due_date && draft.recurrence_end < draft.due_date)
    return t.finDeRecurrencia
  return null
}

// ─── Listas ───────────────────────────────────────────────────────────────────

export function validateListDraft(draft: ListDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.name.trim()) return t.listaSinNombre
  return null
}

// ─── Ítems de lista ───────────────────────────────────────────────────────────

export function validateListItemDraft(draft: ListItemDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.text.trim()) return t.textoObligatorio
  return null
}

// ─── Notas ────────────────────────────────────────────────────────────────────

/**
 * El título es lo único obligatorio: es lo que se lee en el índice y lo que se
 * busca. Una nota sin cuerpo es legítima —"Wifi: casa-garcia / 1234" cabe entera
 * en el título—, pero una sin título sería una tarjeta en blanco.
 */
export function validateNoteDraft(draft: NoteDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.title.trim()) return t.notaSinTitulo
  return null
}

// ─── Finanzas ────────────────────────────────────────────────────────────────

/**
 * Un importe tecleado, validado una sola vez para las cuatro cosas que llevan
 * dinero. El mensaje distingue los dos fallos posibles porque no se arreglan
 * igual: uno es no entender lo escrito, y el otro es entenderlo perfectamente y
 * que sea absurdo.
 */
function validateImporte(texto: string, falta: keyof TextosDeValidacion['faltaImporte'], t: TextosDeValidacion): string | null {
  if (!texto.trim()) return t.faltaImporte[falta]
  // Sin tope aquí: pasarse es un error distinto de no entenderse, y decir "no
  // parece correcto" ante un número perfectamente escrito de dos millones no
  // ayuda a nadie a arreglarlo.
  const centimos = parseAmountToCentsBruto(texto)
  if (centimos === null) return t.importeIncorrecto
  if (centimos > MAX_CENTIMOS) return t.importeMaximo(formatCentsCorto(MAX_CENTIMOS))
  return null
}

/**
 * Un fijo necesita nombre e importe. No pide fecha ni persona: no ocurre ningún
 * día concreto —vale todos los meses— y el recibo domiciliado de la casa no es
 * de nadie, que es el caso normal.
 */
export function validateFixedEntryDraft(draft: FixedEntryDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.name.trim()) {
    return draft.kind === 'ingreso' ? t.ingresoSinNombre : t.gastoSinNombre
  }
  return validateImporte(draft.amount, 'fijo', t)
}

/**
 * Un ajuste de mes solo lleva importe: el nombre, el icono y de quién es siguen
 * siendo los de la referencia, porque lo que cambia un mes es **cuánto** y no qué
 * es.
 */
export function validateFixedOverrideDraft(draft: FixedOverrideDraft, t: TextosDeValidacion = textos()): string | null {
  return validateImporte(draft.amount, 'ajusteDelMes', t)
}

export function validateBudgetDraft(draft: BudgetDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.name.trim()) return t.partidaSinNombre
  return validateImporte(draft.monthly_limit, 'partida', t)
}

/**
 * Un apunte necesita importe y fecha, y nada más. La descripción es opcional
 * a propósito: la mitad de los gastos de una casa son "la compra" y obligar a
 * escribirlo cada vez es la clase de fricción que hace que se deje de apuntar,
 * que es el único modo en que esta pantalla falla de verdad.
 */
export function validateExpenseDraft(draft: ExpenseDraft, t: TextosDeValidacion = textos()): string | null {
  const importe = validateImporte(draft.amount, 'gasto', t)
  if (importe) return importe
  if (!draft.date) return t.fechaObligatoria
  return null
}

export function validateQuoteDraft(draft: QuoteDraft, t: TextosDeValidacion = textos()): string | null {
  if (!draft.title.trim()) return t.presupuestoSinTitulo
  if (!draft.provider.trim()) return t.presupuestoSinProveedor
  return validateImporte(draft.amount, 'presupuesto', t)
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
