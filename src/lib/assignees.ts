import { FAMILY_COLOR, PERSON_COLORS } from './constants'
import type { Child, FamilyMember } from '@/types'

/** Color de un miembro por su sitio en la familia, cuando no ha elegido ninguno. */
export function defaultMemberColor(index: number): string {
  return PERSON_COLORS[(index < 0 ? 0 : index) % PERSON_COLORS.length].value
}

/**
 * Color de un adulto: el que ha elegido, o el que le toca por posición. El
 * segundo caso es el de los miembros de siempre, que no tenían color propio, y
 * el de quien acaba de entrar en la familia. Vive aquí para que sea el mismo en
 * Ajustes, el calendario y los documentos.
 */
export function memberColor(members: FamilyMember[], memberId: string): string {
  const i = members.findIndex(m => m.id === memberId)
  return members[i]?.color ?? defaultMemberColor(i)
}

/**
 * Una opción del selector "asignar a". Un evento o documento pertenece a toda
 * la familia (los dos ids a null), a un miembro adulto o a un hijo; nunca a los
 * dos a la vez, cosa que la base de datos también impide.
 */
export interface Assignee {
  key: string
  name: string
  color: string
  child_id: string | null
  member_id: string | null
}

export const FAMILY_ASSIGNEE: Assignee = {
  key: 'familia',
  name: 'Familia',
  color: FAMILY_COLOR,
  child_id: null,
  member_id: null,
}

/** Las opciones en el orden en que se ofrecen: familia, adultos, hijos. */
export function buildAssignees(members: FamilyMember[], kids: Child[]): Assignee[] {
  return [
    FAMILY_ASSIGNEE,
    ...members.map(m => ({
      key: `m:${m.id}`,
      name: m.display_name,
      color: memberColor(members, m.id),
      child_id: null,
      member_id: m.id,
    })),
    ...kids.map(c => ({
      key: `c:${c.id}`,
      name: c.name,
      color: c.color,
      child_id: c.id,
      member_id: null,
    })),
  ]
}

/** Quién tiene asignado algo, o null si es de toda la familia. */
export function resolveAssignee(
  entidad: { child_id: string | null; member_id: string | null },
  members: FamilyMember[],
  kids: Child[],
): Assignee | null {
  if (entidad.member_id) {
    const m = members.find(x => x.id === entidad.member_id)
    return m
      ? { key: `m:${m.id}`, name: m.display_name, color: memberColor(members, m.id), child_id: null, member_id: m.id }
      : null
  }
  if (entidad.child_id) {
    const c = kids.find(x => x.id === entidad.child_id)
    return c
      ? { key: `c:${c.id}`, name: c.name, color: c.color, child_id: c.id, member_id: null }
      : null
  }
  return null
}

/** La opción que corresponde al estado actual de un draft. */
export function assigneeKeyOf(entidad: { child_id: string | null; member_id: string | null }): string {
  if (entidad.member_id) return `m:${entidad.member_id}`
  if (entidad.child_id) return `c:${entidad.child_id}`
  return 'familia'
}
