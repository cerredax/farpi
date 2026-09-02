/**
 * El dinero, en un solo sitio.
 *
 * **Todo se guarda en céntimos, en enteros.** Con euros en coma flotante,
 * 0,1 + 0,2 da 0,30000000000000004 y un total de veinte gastos se va un céntimo;
 * un céntimo de más en "llevas 300,01 de 300" convierte un presupuesto cumplido
 * en uno incumplido. Con enteros no hay nada que redondear.
 *
 * El formato se escribe a mano y no con `Intl.NumberFormat`. Es una decisión
 * medida: `Intl` con `currency: 'EUR'` mete un espacio duro (U+00A0) antes del
 * símbolo, distinto según la versión de ICU del navegador, así que el mismo
 * importe no se compara igual en un test que en un móvil. Aquí la salida es la
 * misma en todas partes, que es lo que se le pide a una cifra que va en una
 * tarjeta y en una aserción.
 */

/** Formato español: mil separado por punto, decimales por coma. */
const SEPARADOR_MILES = '.'
const SEPARADOR_DECIMAL = ','

/**
 * Tope de un importe, en céntimos: un millón de euros. El mismo número que los
 * `check` de `budgets`, `expenses` y `quotes` en `supabase/schema.sql`; si se
 * cambia, se cambia en los dos sitios o el formulario deja pasar lo que la base
 * rechaza.
 */
export const MAX_CENTIMOS = 100_000_000

/**
 * Lo que se teclea, a céntimos. Devuelve `null` si no es un importe.
 *
 * Acepta lo que escribe cualquiera sin pensar: `12`, `12,5`, `12.50`, `1.234,56`,
 * `1234.56`, con espacios y con el símbolo del euro delante o detrás. La coma y
 * el punto se tratan igual cuando solo hay uno, porque el teclado numérico de
 * muchos móviles da punto aunque el país escriba coma; con los dos, manda el
 * último como decimal, que es lo que distingue `1.234,56` de `1,234.56`.
 *
 * Rechaza el cero y los negativos: un gasto de cero no es un gasto, y una
 * devolución contada en negativo rompería la lectura de "llevas 180 de 300".
 */
export function parseAmountToCents(texto: string): number | null {
  const centimos = parseAmountToCentsBruto(texto)
  return centimos !== null && centimos <= MAX_CENTIMOS ? centimos : null
}

/**
 * Lo mismo, **sin el tope**. Solo lo usa el validador, y para una cosa: poder
 * distinguir "esto no se entiende" de "esto se entiende y son dos millones de
 * euros". Son dos errores distintos y se arreglan distinto, así que merecen dos
 * mensajes.
 */
export function parseAmountToCentsBruto(texto: string): number | null {
  const limpio = texto.replace(/[€\s ]/g, '').trim()
  if (!limpio) return null
  if (!/^\d[\d.,]*$/.test(limpio)) return null

  const separadores = limpio.match(/[.,]/g) ?? []
  const corte = Math.max(limpio.lastIndexOf(','), limpio.lastIndexOf('.'))
  const cola = corte === -1 ? '' : limpio.slice(corte + 1)

  // El último separador es el decimal, salvo que solo haya uno de una clase y
  // detrás vengan exactamente tres cifras: eso es "1.234", mil doscientos
  // treinta y cuatro, y no un decimal de tres cifras que nadie escribe.
  const hayDosClases = limpio.includes(',') && limpio.includes('.')
  const esDecimal = corte !== -1 && cola.length > 0 && cola.length <= 3 &&
    (hayDosClases || separadores.length > 1 ? cola.length <= 2 : cola.length !== 3)

  const entero = (esDecimal ? limpio.slice(0, corte) : limpio).replace(/[.,]/g, '')
  const decimales = esDecimal ? cola : ''

  // Cuatro cifras detrás de un separador no es ni un decimal ni un grupo de
  // miles: es un número mal escrito, y adivinarlo sería inventarse un importe.
  if (corte !== -1 && (cola.length === 0 || cola.length > 3)) return null
  if (!esDecimal && corte !== -1 && cola.length !== 3) return null
  if (!entero && !decimales) return null

  const centimos = Number(entero || '0') * 100 + Number(decimales.padEnd(2, '0') || '0')
  if (!Number.isInteger(centimos) || centimos <= 0) return null
  return centimos
}

/** Los céntimos como se escriben en un campo de texto: `1234,56`, sin símbolo. */
export function centsToInput(centimos: number): string {
  const decimales = centimos % 100
  const enteros = Math.floor(centimos / 100)
  return decimales === 0
    ? String(enteros)
    : `${enteros}${SEPARADOR_DECIMAL}${String(decimales).padStart(2, '0')}`
}

function conMiles(enteros: number): string {
  return String(enteros).replace(/\B(?=(\d{3})+(?!\d))/g, SEPARADOR_MILES)
}

/** Un importe con sus dos decimales: `1.234,56 €`. Para totales y detalles. */
export function formatCents(centimos: number): string {
  const negativo = centimos < 0
  const abs = Math.abs(centimos)
  const decimales = String(abs % 100).padStart(2, '0')
  return `${negativo ? '−' : ''}${conMiles(Math.floor(abs / 100))}${SEPARADOR_DECIMAL}${decimales} €`
}

/**
 * El mismo importe sin los `,00` cuando son redondos: `300 €`, `1.234,56 €`.
 *
 * Es el que se usa en las tarjetas y en las partidas, que es donde la cifra tiene
 * que leerse de un vistazo: un presupuesto se pone en euros enteros y "300,00 €"
 * hace leer dos ceros que no dicen nada.
 */
export function formatCentsCorto(centimos: number): string {
  return centimos % 100 === 0
    ? `${centimos < 0 ? '−' : ''}${conMiles(Math.abs(centimos) / 100)} €`
    : formatCents(centimos)
}
