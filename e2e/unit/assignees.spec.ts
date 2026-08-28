import { test, expect } from '@playwright/test'
import { assigneeKeyOf, buildAssignees, eventColor, memberColor, resolveAssignee, splitPeople, textColorOn } from '@/lib/assignees'
import { CUMPLE_COLOR, FAMILY_COLOR, PERSON_COLORS } from '@/lib/constants'
import type { Child, FamilyMember } from '@/types'

// `color: null` a propósito: es lo que hace que el color salga de la posición
// en la familia, que es justo lo que comprueba el test de más abajo.
const miembros: FamilyMember[] = [
  { id: 'm1', family_id: 'f1', user_id: 'u1', display_name: 'Omar', avatar_url: null, color: null, role: 'admin', created_at: '' },
  { id: 'm2', family_id: 'f1', user_id: 'u2', display_name: 'Sofía', avatar_url: null, color: null, role: 'member', created_at: '' },
]
const hijos: Child[] = [
  { id: 'c1', family_id: 'f1', name: 'Ana', birth_date: null, color: '#123456', kind: 'hijo', created_at: '' },
]

test('ofrece familia, adultos e hijos, en ese orden', () => {
  const opciones = buildAssignees(miembros, hijos)
  expect(opciones.map(o => o.name)).toEqual(['Familia', 'Omar', 'Sofía', 'Ana'])
})

// Una abuela es un adulto de la familia aunque no entre en la app. Vive en la
// misma tabla que los hijos —se asigna por `child_id`— pero al ofrecerla tiene
// que salir con los adultos, no al final.
const abuela: Child = { id: 'c2', family_id: 'f1', name: 'Carmen', birth_date: null, color: '#654321', kind: 'adulto', created_at: '' }

test('los adultos sin cuenta van con los adultos, antes de los hijos', () => {
  const opciones = buildAssignees(miembros, [hijos[0], abuela])
  expect(opciones.map(o => o.name)).toEqual(['Familia', 'Omar', 'Sofía', 'Carmen', 'Ana'])
})

test('splitPeople separa por tipo sin perder a nadie', () => {
  const { adultos, hijos: kids } = splitPeople([hijos[0], abuela])
  expect(adultos.map(a => a.name)).toEqual(['Carmen'])
  expect(kids.map(k => k.name)).toEqual(['Ana'])
})

test('un adulto sin cuenta se asigna por child_id, igual que un hijo', () => {
  const opcion = buildAssignees(miembros, [abuela]).find(o => o.name === 'Carmen')!
  expect(opcion.child_id).toBe('c2')
  expect(opcion.member_id).toBeNull()
  expect(resolveAssignee({ child_id: 'c2', member_id: null }, miembros, [abuela])?.name).toBe('Carmen')
})

test('cada opción lleva una sola asignación', () => {
  for (const o of buildAssignees(miembros, hijos)) {
    expect(o.child_id === null || o.member_id === null).toBe(true)
  }
})

test('los hijos conservan su color y los miembros reciben uno por posición', () => {
  const opciones = buildAssignees(miembros, hijos)
  expect(opciones.find(o => o.name === 'Ana')!.color).toBe('#123456')
  expect(opciones.find(o => o.name === 'Omar')!.color).toBe(memberColor(miembros, 'm1'))
  expect(memberColor(miembros, 'm1')).not.toBe(memberColor(miembros, 'm2'))
})

// ─── La paleta ────────────────────────────────────────────────────────────────
//
// La paleta es un dato, no lógica, pero es un dato con condiciones que se
// rompen sin darse cuenta al añadir "un color más". Antes tenía doce pasteles
// con dieciséis parejas indistinguibles y once que no aguantaban las iniciales
// blancas que la app les pone encima. Esto vigila lo que se puede vigilar sin
// meter CIEDE2000 en el repositorio.

/** Luminancia relativa según WCAG 2.1. */
function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}
function contraste(fondo: string, texto: string): number {
  const [a, b] = [luminancia(fondo), luminancia(texto)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test.describe('PERSON_COLORS', () => {
  test('no hay dos colores repetidos', () => {
    const valores = PERSON_COLORS.map(c => c.value)
    expect(new Set(valores).size).toBe(valores.length)
  })

  test('todos son hexadecimales de seis dígitos', () => {
    for (const { value } of PERSON_COLORS) expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test('cada uno tiene nombre, que es su etiqueta accesible', () => {
    for (const { label } of PERSON_COLORS) expect(label.trim().length).toBeGreaterThan(0)
  })

  // Se podía elegir a mano el amarillo que significa "de toda la familia": el
  // color dejaba de decir de quién era algo.
  test('ninguno es el color de la familia ni el verde de la app', () => {
    const prohibidos = [FAMILY_COLOR.toUpperCase(), '#8BA888']
    for (const { value } of PERSON_COLORS) {
      expect(prohibidos).not.toContain(value.toUpperCase())
    }
  })

  // Lo que de verdad importa: que la inicial se lea. Va en blanco o en tinta
  // según el color, y con el color que le toca los catorce pasan el 4,5:1 que
  // WCAG pide para texto pequeño: los ocho de adulto con blanco (el peor,
  // Ladrillo, 5,42:1) y los seis de niño con tinta (el peor, Canela clara,
  // 6,92:1). Antes, en blanco a pelo, once de doce no llegaban ni a 3:1. El
  // recuento va en el comentario y no en un `expect`: lo que hay que sostener es
  // la regla, no cuántos colores haya.
  test('con el color de texto que les toca, todos llegan a 4,5:1', () => {
    for (const { value, label } of PERSON_COLORS) {
      expect(contraste(value, textColorOn(value)), `${label} ${value}`).toBeGreaterThanOrEqual(4.5)
    }
  })
})

test.describe('textColorOn', () => {
  test('elige tinta en los claros y blanco en los oscuros', () => {
    expect(textColorOn('#FFFFFF')).toBe('#252525')
    expect(textColorOn('#000000')).toBe('#FFFFFF')
  })

  // El amarillo de "toda la familia" es el caso que lo destapó: en blanco daba
  // 1,67:1 y se leía en las etiquetas de Inicio y de Documentos.
  test('sobre el amarillo de la familia escribe en tinta', () => {
    expect(textColorOn(FAMILY_COLOR)).toBe('#252525')
    expect(contraste(FAMILY_COLOR, textColorOn(FAMILY_COLOR))).toBeGreaterThanOrEqual(4.5)
  })

  // Los colores vienen de la base de datos: pueden ser cualquier cosa.
  test('un color que no se entiende se trata como antes, en blanco', () => {
    expect(textColorOn('rojo')).toBe('#FFFFFF')
    expect(textColorOn('')).toBe('#FFFFFF')
    expect(textColorOn('#FFF')).toBe('#FFFFFF')
  })
})

// El color es lo único que dice de quién es cada cosa. Repartido dos veces no
// dice nada: en Ajustes, Omar y Ana salían con el mismo círculo salmón.
test('a un adulto no le toca un color que ya lleva un hijo', () => {
  const anaConElPrimerColor: Child[] = [
    { id: 'c1', family_id: 'f1', name: 'Ana', birth_date: null, color: PERSON_COLORS[0].value, kind: 'hijo', created_at: '' },
  ]
  const color = memberColor(miembros, 'm1', anaConElPrimerColor)
  expect(color).not.toBe(PERSON_COLORS[0].value)

  // Y los dos adultos siguen siendo distintos entre sí.
  expect(color).not.toBe(memberColor(miembros, 'm2', anaConElPrimerColor))
})

// La paleta de personas incluye el mismo mostaza que "toda la familia": un
// adulto con ese color se confunde con lo que no es de nadie en particular.
test('a nadie le toca por defecto el amarillo de la familia', () => {
  const muchos: FamilyMember[] = [0, 1, 2, 3].map(i => ({
    ...miembros[0], id: `m${i}`, user_id: `u${i}`, display_name: `Persona ${i}`,
  }))
  for (const m of muchos) {
    expect(memberColor(muchos, m.id, [])).not.toBe(FAMILY_COLOR)
  }
})

test('el color elegido a mano manda sobre el reparto', () => {
  const conColor = [{ ...miembros[0], color: '#ABCDEF' }, miembros[1]]
  expect(memberColor(conColor, 'm1', hijos)).toBe('#ABCDEF')
  // Y ese color deja de estar libre para los demás.
  expect(memberColor(conColor, 'm2', hijos)).not.toBe('#ABCDEF')
})

test('resuelve a quién pertenece cada cosa', () => {
  expect(resolveAssignee({ child_id: null, member_id: 'm2' }, miembros, hijos)!.name).toBe('Sofía')
  expect(resolveAssignee({ child_id: 'c1', member_id: null }, miembros, hijos)!.name).toBe('Ana')
  // Sin asignar es "de toda la familia", no un error.
  expect(resolveAssignee({ child_id: null, member_id: null }, miembros, hijos)).toBeNull()
})

test('si la persona ya no está, deja de estar asignado', () => {
  expect(resolveAssignee({ child_id: null, member_id: 'borrado' }, miembros, hijos)).toBeNull()
  expect(resolveAssignee({ child_id: 'borrado', member_id: null }, miembros, hijos)).toBeNull()
})

// Lo de toda la familia también tiene color. Cuando este cálculo estaba copiado
// en cada pantalla, Inicio se quedó sin el amarillo y esos eventos salían sin
// ninguna marca.
test('el color de un evento sale de quien lo lleve, y si no hay nadie es el de la familia', () => {
  const base = { color: null, child_id: null, member_id: null }
  expect(eventColor(base, miembros, hijos)).toBe(FAMILY_COLOR)
  expect(eventColor({ ...base, member_id: 'm1' }, miembros, hijos)).toBe(memberColor(miembros, 'm1'))
  expect(eventColor({ ...base, child_id: 'c1' }, miembros, hijos)).toBe('#123456')

  // El color propio del evento manda sobre el de la persona.
  expect(eventColor({ ...base, color: '#ABCDEF', child_id: 'c1' }, miembros, hijos)).toBe('#ABCDEF')

  // Si la persona ya no está, vuelve a ser de la familia en vez de quedarse sin color.
  expect(eventColor({ ...base, member_id: 'borrado' }, miembros, hijos)).toBe(FAMILY_COLOR)
})

// Un cumpleaños de fuera no es de nadie de la casa: ni de una persona ni de la
// familia. Sin esto salía en el amarillo de "esto es de todos", que es decir que
// la abuela es de la familia justo después de decidir no darla de alta.
test('un cumpleaños lleva su propio color, no el de la familia', () => {
  const base = { color: null, child_id: null, member_id: null }
  expect(eventColor({ ...base, kind: 'cumple' as const }, miembros, hijos)).toBe(CUMPLE_COLOR)
  // Y manda sobre lo demás: un cumpleaños no se pinta del color de nadie ni
  // aunque traiga uno guardado de antes.
  expect(eventColor({ ...base, kind: 'cumple' as const, color: '#ABCDEF', child_id: 'c1' }, miembros, hijos)).toBe(CUMPLE_COLOR)
  // El color de un cumpleaños no puede ser el de una persona ni el de la casa.
  expect(PERSON_COLORS.map(c => c.value)).not.toContain(CUMPLE_COLOR)
  expect(CUMPLE_COLOR).not.toBe(FAMILY_COLOR)
})

test('la clave del draft casa con la de su opción', () => {
  const opciones = buildAssignees(miembros, hijos)
  expect(assigneeKeyOf({ child_id: null, member_id: null })).toBe(opciones[0].key)
  expect(assigneeKeyOf({ child_id: null, member_id: 'm2' })).toBe(opciones[2].key)
  expect(assigneeKeyOf({ child_id: 'c1', member_id: null })).toBe(opciones[3].key)
})
