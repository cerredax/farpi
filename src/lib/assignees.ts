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
 *
 * Los colores que ya tiene alguien no se vuelven a repartir. Sin esto, el
 * primer adulto y un hijo que hubiera elegido el primer color de la paleta
 * salían idénticos, y entonces el color deja de decir de quién es cada cosa,
 * que es lo único para lo que está.
 */
export function memberColor(members: FamilyMember[], memberId: string, kids: Child[] = []): string {
  const i = members.findIndex(m => m.id === memberId)
  const propio = members[i]?.color
  if (propio) return propio

  const ocupados = new Set<string>([
    // El amarillo de "toda la familia" cuenta como pillado. Desde que ningún
    // color de persona es exactamente ese amarillo esto no puede pasar, pero se
    // queda como red de seguridad: un adulto con ese color se confundiría con lo
    // que no es de nadie en particular. (Ojo: "Mostaza oscura" se parece de
    // nombre y no es el mismo color, está mucho más oscuro.)
    FAMILY_COLOR,
    ...kids.map(k => k.color),
    ...members.flatMap(m => (m.color ? [m.color] : [])),
  ])
  const libres = PERSON_COLORS.filter(c => !ocupados.has(c.value))
  // Si hay más gente que colores, alguno se repite: no hay nada mejor que hacer.
  const paleta = libres.length > 0 ? libres : PERSON_COLORS

  return paleta[(i < 0 ? 0 : i) % paleta.length].value
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

/**
 * Las personas sin cuenta, separadas por lo que son. La tabla es la misma —se
 * asignan igual, por `child_id`— pero en Ajustes van en bloques distintos y en
 * el selector los adultos van juntos, con cuenta o sin ella.
 */
export function splitPeople(kids: Child[]): { adultos: Child[]; hijos: Child[] } {
  return {
    adultos: kids.filter(k => k.kind === 'adulto'),
    hijos:   kids.filter(k => k.kind === 'hijo'),
  }
}

function kidAssignee(c: Child): Assignee {
  return { key: `c:${c.id}`, name: c.name, color: c.color, child_id: c.id, member_id: null }
}

/**
 * Las opciones en el orden en que se ofrecen: familia, adultos, hijos. Los
 * adultos sin cuenta van con los otros adultos y no al final con los hijos: a
 * la hora de asignar algo da igual quién entra en la app.
 */
export function buildAssignees(members: FamilyMember[], kids: Child[]): Assignee[] {
  const { adultos, hijos } = splitPeople(kids)
  return [
    FAMILY_ASSIGNEE,
    ...members.map(m => ({
      key: `m:${m.id}`,
      name: m.display_name,
      color: memberColor(members, m.id, kids),
      child_id: null,
      member_id: m.id,
    })),
    ...adultos.map(kidAssignee),
    ...hijos.map(kidAssignee),
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
      ? { key: `m:${m.id}`, name: m.display_name, color: memberColor(members, m.id, kids), child_id: null, member_id: m.id }
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

/**
 * El color con el que se pinta un evento: el suyo si lo tiene, si no el de
 * quien lo lleve, y si no hay nadie el de la familia. Vive aquí y no en cada
 * pantalla porque el amarillo de "esto es de todos" tiene que ser el mismo en
 * el calendario, en la agenda y en Inicio; cuando estaba copiado en cada sitio,
 * Inicio se quedó sin él y los eventos de la familia salían sin marca.
 */
export function eventColor(
  evento: { color: string | null; child_id: string | null; member_id: string | null },
  members: FamilyMember[],
  kids: Child[],
): string {
  if (evento.color) return evento.color
  return resolveAssignee(evento, members, kids)?.color ?? FAMILY_COLOR
}

/**
 * Con qué color se escribe encima de un color de persona.
 *
 * Iba en blanco a pelo, y encima de la mitad de la paleta no se leía: el
 * amarillo de "toda la familia" daba 1,67:1 cuando el mínimo de WCAG para texto
 * pequeño es 4,5:1. La paleta nueva es de claridad escalonada a propósito
 * —hace falta para que se distingan— y por eso el blanco no puede valer para
 * todos: cuatro de los ocho son claros.
 *
 * Se elige el que más contraste dé, no el que toque por una regla fija, porque
 * el color puede venir de la base de datos y ser cualquiera: un color viejo de
 * antes del cambio de paleta, o el de un evento. Con los ocho de ahora, los ocho
 * pasan de 4,5:1.
 */
const BLANCO = '#FFFFFF'
/** El mismo `--color-ink` de `globals.css`, aquí como dato porque viaja en `style`. */
const TINTA = '#252525'

/** Luminancia relativa (WCAG 2.1). `null` si el color no es un hex de seis dígitos. */
function luminancia(hex: string): number | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

const LUM_TINTA = luminancia(TINTA) as number

export function textColorOn(background: string): string {
  const fondo = luminancia(background)
  // Un color que no sabemos leer se trata como antes: blanco.
  if (fondo === null) return BLANCO
  const contraste = (texto: number) =>
    (Math.max(fondo, texto) + 0.05) / (Math.min(fondo, texto) + 0.05)
  return contraste(1) >= contraste(LUM_TINTA) ? BLANCO : TINTA
}

/** La opción que corresponde al estado actual de un draft. */
export function assigneeKeyOf(entidad: { child_id: string | null; member_id: string | null }): string {
  if (entidad.member_id) return `m:${entidad.member_id}`
  if (entidad.child_id) return `c:${entidad.child_id}`
  return 'familia'
}
