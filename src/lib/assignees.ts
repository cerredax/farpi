import { FAMILY_COLOR } from './constants'
import type { Child, FamilyMember } from '@/types'

/**
 * Colores de avatar de los miembros. A diferencia de los hijos, que guardan su
 * color en la base de datos, los miembros lo reciben por su posición en la
 * familia. Vive aquí para que sea el mismo en Ajustes, el calendario y los
 * documentos.
 */
export const AVATAR_COLORS = ['#D8A48F', '#8BA888', '#E9C46A', '#7EB8D4', '#B39DDB', '#F4A261']

export function memberColor(members: FamilyMember[], memberId: string): string {
  const i = members.findIndex(m => m.id === memberId)
  return AVATAR_COLORS[(i < 0 ? 0 : i) % AVATAR_COLORS.length]
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
