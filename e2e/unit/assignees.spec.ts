import { test, expect } from '@playwright/test'
import { assigneeKeyOf, buildAssignees, memberColor, resolveAssignee } from '@/lib/assignees'
import type { Child, FamilyMember } from '@/types'

const miembros: FamilyMember[] = [
  { id: 'm1', family_id: 'f1', user_id: 'u1', display_name: 'Omar', avatar_url: null, role: 'admin', created_at: '' },
  { id: 'm2', family_id: 'f1', user_id: 'u2', display_name: 'Sofía', avatar_url: null, role: 'member', created_at: '' },
]
const hijos: Child[] = [
  { id: 'c1', family_id: 'f1', name: 'Ana', birth_date: null, color: '#123456', created_at: '' },
]

test('ofrece familia, adultos e hijos, en ese orden', () => {
  const opciones = buildAssignees(miembros, hijos)
  expect(opciones.map(o => o.name)).toEqual(['Familia', 'Omar', 'Sofía', 'Ana'])
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

test('la clave del draft casa con la de su opción', () => {
  const opciones = buildAssignees(miembros, hijos)
  expect(assigneeKeyOf({ child_id: null, member_id: null })).toBe(opciones[0].key)
  expect(assigneeKeyOf({ child_id: null, member_id: 'm2' })).toBe(opciones[2].key)
  expect(assigneeKeyOf({ child_id: 'c1', member_id: null })).toBe(opciones[3].key)
})
