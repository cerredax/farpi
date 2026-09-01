import { test, expect } from '@playwright/test'
import {
  MAX_CENTIMOS, centsToInput, formatCents, formatCentsCorto,
  parseAmountToCents, parseAmountToCentsBruto,
} from '@/lib/finanzas'
import { validateBudgetDraft, validateExpenseDraft, validateQuoteDraft } from '@/lib/validators'

// El dinero es la única parte de Farpi donde un error de un céntimo se nota, y
// donde lo que se teclea no se parece a lo que se guarda. Aquí se prueban las dos
// puntas de esa conversión.

test.describe('parseAmountToCents', () => {
  test('entiende un entero, con coma y con punto', () => {
    expect(parseAmountToCents('12')).toBe(1200)
    expect(parseAmountToCents('12,5')).toBe(1250)
    expect(parseAmountToCents('12,50')).toBe(1250)
    // El punto vale igual que la coma: el teclado numérico de muchos móviles da
    // punto aunque el país escriba coma.
    expect(parseAmountToCents('12.50')).toBe(1250)
  })

  test('aguanta el símbolo, los espacios y los miles', () => {
    expect(parseAmountToCents(' 24,90 € ')).toBe(2490)
    expect(parseAmountToCents('€1234')).toBe(123400)
    // Tres cifras detrás de un único separador son miles, no decimales: nadie
    // escribe un precio con tres decimales.
    expect(parseAmountToCents('1.234')).toBe(123400)
  })

  test('con los dos separadores, manda el último como decimal', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456)
    expect(parseAmountToCents('1,234.56')).toBe(123456)
  })

  test('rechaza lo que no es un importe', () => {
    for (const malo of ['', '  ', 'gratis', '-5', '12,', '12,5678', 'e5', '1e3']) {
      expect(parseAmountToCents(malo), `debería rechazar «${malo}»`).toBeNull()
    }
  })

  // Un gasto de cero no es un gasto, y en negativo rompería la lectura de
  // "llevas 180 de 300". Los dos casos los para también el `check` de la tabla.
  test('rechaza el cero', () => {
    expect(parseAmountToCents('0')).toBeNull()
    expect(parseAmountToCents('0,00')).toBeNull()
  })

  test('el tope solo lo aplica la versión con tope', () => {
    expect(parseAmountToCents('1000000')).toBe(MAX_CENTIMOS)
    expect(parseAmountToCents('2000000')).toBeNull()
    expect(parseAmountToCentsBruto('2000000')).toBe(200_000_000)
  })
})

test.describe('formato', () => {
  test('el largo lleva siempre dos decimales', () => {
    expect(formatCents(0)).toBe('0,00 €')
    expect(formatCents(5)).toBe('0,05 €')
    expect(formatCents(1250)).toBe('12,50 €')
    expect(formatCents(123456)).toBe('1.234,56 €')
    expect(formatCents(100000000)).toBe('1.000.000,00 €')
  })

  test('el corto se calla los ceros redondos', () => {
    expect(formatCentsCorto(30000)).toBe('300 €')
    expect(formatCentsCorto(123456)).toBe('1.234,56 €')
  })

  // "Te has pasado por" recibe el restante cambiado de signo, así que el cero
  // negativo no puede acabar escribiéndose como "−0 €".
  test('el negativo lleva su signo', () => {
    expect(formatCentsCorto(-4000)).toBe('−40 €')
    expect(formatCents(-4050)).toBe('−40,50 €')
  })

  test('ida y vuelta: lo formateado para el campo se vuelve a entender', () => {
    for (const centimos of [1, 99, 100, 1250, 30000, 123456, MAX_CENTIMOS]) {
      expect(parseAmountToCents(centsToInput(centimos)), `ida y vuelta de ${centimos}`).toBe(centimos)
    }
  })
})

test.describe('validadores', () => {
  test('un gasto necesita importe y fecha, y nada más', () => {
    expect(validateExpenseDraft({
      amount: '24,90', date: '2026-08-31', description: '',
      budget_id: null, child_id: null, member_id: null,
    })).toBeNull()

    expect(validateExpenseDraft({
      amount: '', date: '2026-08-31', description: '',
      budget_id: null, child_id: null, member_id: null,
    })).toMatch(/cuánto/)

    expect(validateExpenseDraft({
      amount: '24,90', date: '', description: '',
      budget_id: null, child_id: null, member_id: null,
    })).toMatch(/fecha/)
  })

  test('pasarse del tope dice cuánto es el tope, no que no se entiende', () => {
    const mensaje = validateBudgetDraft({ name: 'Compra', emoji: '🛒', monthly_limit: '2000000' })
    expect(mensaje).toBe('Como mucho 1.000.000 €.')
  })

  test('un presupuesto pedido necesita para qué es y quién lo pasa', () => {
    const base = { title: 'Caldera', provider: 'López', amount: '2400', status: 'pedido' as const, valid_until: '', notes: '' }
    expect(validateQuoteDraft(base)).toBeNull()
    expect(validateQuoteDraft({ ...base, title: '  ' })).toMatch(/para qué/)
    expect(validateQuoteDraft({ ...base, provider: '' })).toMatch(/quién/)
  })
})
