import { test, expect } from '@playwright/test'
import { assigneeKeyOf, buildAssignees, eventColor, memberColor, resolveAssignee, splitPeople } from '@/lib/assignees'
import { FAMILY_COLOR, PERSON_COLORS } from '@/lib/constants'
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

test('la clave del draft casa con la de su opción', () => {
  const opciones = buildAssignees(miembros, hijos)
  expect(assigneeKeyOf({ child_id: null, member_id: null })).toBe(opciones[0].key)
  expect(assigneeKeyOf({ child_id: null, member_id: 'm2' })).toBe(opciones[2].key)
  expect(assigneeKeyOf({ child_id: 'c1', member_id: null })).toBe(opciones[3].key)
})
