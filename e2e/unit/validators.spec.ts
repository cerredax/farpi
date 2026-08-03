import { test, expect } from '@playwright/test'
import {
  isValidEmail,
  normalizeEmail,
  validateChildDraft,
  validateEventDraft,
  validateFamilyName,
  validateListDraft,
  validateListItemDraft,
  validateMealDraft,
  validateTaskDraft,
} from '@/lib/validators'

// Los sheets delegan aquí su validación, así que estas reglas son las que ve el
// usuario al pulsar Guardar. Convenio: null = válido, string = mensaje de error.

test.describe('email', () => {
  test('normaliza recortando y pasando a minúsculas', () => {
    expect(normalizeEmail('  Foo@Example.COM ')).toBe('foo@example.com')
  })

  test('acepta direcciones normales', () => {
    for (const e of ['a@b.co', 'nombre.apellido@dominio.es', '  MAYUS@dominio.com  ']) {
      expect(isValidEmail(e)).toBe(true)
    }
  })

  test('rechaza las que no tienen forma de email', () => {
    for (const e of ['', 'suelto', 'sin@dominio', 'sin.arroba.com', 'a b@c.com', '@dominio.com']) {
      expect(isValidEmail(e)).toBe(false)
    }
  })
})

test.describe('validateFamilyName', () => {
  test('rechaza vacío o solo espacios', () => {
    expect(validateFamilyName('')).not.toBeNull()
    expect(validateFamilyName('   ')).not.toBeNull()
  })

  test('acepta un nombre con contenido', () => {
    expect(validateFamilyName('Familia García')).toBeNull()
  })
})

test.describe('validateChildDraft', () => {
  test('exige nombre', () => {
    expect(validateChildDraft({ name: '  ', birth_date: '', color: '#fff' })).not.toBeNull()
    expect(validateChildDraft({ name: 'Ana', birth_date: '', color: '#fff' })).toBeNull()
  })
})

test.describe('validateMealDraft', () => {
  const base = { date: '2026-08-03', slot: 'lunch' as const, name: 'Arroz', notes: '' }

  test('exige fecha y nombre de plato', () => {
    expect(validateMealDraft({ ...base, date: '' })).not.toBeNull()
    expect(validateMealDraft({ ...base, name: '   ' })).not.toBeNull()
    expect(validateMealDraft(base)).toBeNull()
  })
})

test.describe('validateEventDraft', () => {
  const base = {
    title: 'Cita', description: '', date: '2026-08-03',
    all_day: false, start_time: '10:00', end_time: '', child_id: null, member_id: null,
    kind: 'evento' as const, end_date: '',
  }

  test('exige título y fecha', () => {
    expect(validateEventDraft({ ...base, title: ' ' })).not.toBeNull()
    expect(validateEventDraft({ ...base, date: '' })).not.toBeNull()
  })

  test('rechaza que la hora de fin no sea posterior a la de inicio', () => {
    expect(validateEventDraft({ ...base, start_time: '10:00', end_time: '09:00' })).not.toBeNull()
    expect(validateEventDraft({ ...base, start_time: '10:00', end_time: '10:00' })).not.toBeNull()
    expect(validateEventDraft({ ...base, start_time: '10:00', end_time: '11:00' })).toBeNull()
  })

  test('en eventos de todo el día las horas no importan', () => {
    expect(validateEventDraft({ ...base, all_day: true, start_time: '10:00', end_time: '09:00' })).toBeNull()
  })

  test('sin hora de fin es válido', () => {
    expect(validateEventDraft({ ...base, end_time: '' })).toBeNull()
  })
})

test.describe('validateTaskDraft', () => {
  const base = {
    title: 'Tarea', notes: '', priority: 'medium' as const,
    due_date: '2026-08-03', recurrence: 'none' as const, recurrence_end: '',
  }

  test('exige título', () => {
    expect(validateTaskDraft({ ...base, title: '  ' })).not.toBeNull()
    expect(validateTaskDraft(base)).toBeNull()
  })

  test('rechaza que la recurrencia acabe antes de empezar', () => {
    expect(validateTaskDraft({
      ...base, recurrence: 'weekly', due_date: '2026-08-10', recurrence_end: '2026-08-03',
    })).not.toBeNull()
  })

  test('acepta que la recurrencia acabe después', () => {
    expect(validateTaskDraft({
      ...base, recurrence: 'weekly', due_date: '2026-08-03', recurrence_end: '2026-08-10',
    })).toBeNull()
  })

  test('sin recurrencia no comprueba las fechas de la serie', () => {
    expect(validateTaskDraft({
      ...base, recurrence: 'none', due_date: '2026-08-10', recurrence_end: '2026-08-03',
    })).toBeNull()
  })
})

test.describe('listas', () => {
  test('validateListDraft exige nombre', () => {
    expect(validateListDraft({ name: ' ', emoji: '📋' })).not.toBeNull()
    expect(validateListDraft({ name: 'Compra', emoji: '📋' })).toBeNull()
  })

  test('validateListItemDraft exige texto', () => {
    expect(validateListItemDraft({ text: '   ' })).not.toBeNull()
    expect(validateListItemDraft({ text: 'Leche' })).toBeNull()
  })
})
