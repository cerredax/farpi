import type { Family, FamilyMember, FamilyInvite, MealSlot } from '@/types'
import { ALL_MEAL_SLOTS, normalizeMealSlots } from '../meal-slots'
import { db } from './db'

export function getFamily(familyId: string): Family | undefined {
  return db.families.find(f => f.id === familyId)
}

export function getFamilies(): Family[] {
  return db.families
}

export function setFamilyName(familyId: string, name: string): Family {
  db.families = db.families.map(f =>
    f.id !== familyId ? f : { ...f, name, updated_at: new Date().toISOString() }
  )
  return db.families.find(f => f.id === familyId)!
}

/**
 * Imita el update de `families` de la 019: normaliza como el repo real y nunca
 * se queda sin franjas. Lo que hubiera apuntado en una franja que se oculta no
 * se toca, igual que en Supabase.
 */
export function setFamilyMealSlots(familyId: string, slots: MealSlot[]): Family {
  const meal_slots = normalizeMealSlots(slots)
  db.families = db.families.map(f =>
    f.id !== familyId ? f : { ...f, meal_slots, updated_at: new Date().toISOString() }
  )
  return db.families.find(f => f.id === familyId)!
}

export function createFamily(name: string): Family {
  const now = new Date().toISOString()
  // Las cuatro franjas, que es el `default` de la columna en la 019.
  const f: Family = { id: crypto.randomUUID(), name: name.trim(), meal_slots: [...ALL_MEAL_SLOTS], created_at: now, updated_at: now }
  db.families = [...db.families, f]
  const adminMember: FamilyMember = {
    id: crypto.randomUUID(),
    family_id: f.id,
    user_id: 'u1',
    display_name: 'Omar',
    avatar_url: null,
    color: null,
    role: 'admin',
    created_at: now,
  }
  db.members = [...db.members, adminMember]
  return f
}

/**
 * Imita el `on delete cascade` de Supabase: al irse la familia se va todo lo que
 * cuelga de ella. Aquí no hay claves ajenas que lo hagan solas, así que se
 * recorre tabla por tabla; si se añade una nueva con `family_id`, hay que
 * acordarse de esta lista.
 *
 * Lo que **no** se toca son los archivos de los documentos: viven en el Google
 * Drive de quien los subió, igual que en la app real. Lo que se borra es la ficha.
 *
 * Quién puede borrar y cuándo lo decide la capa de arriba (`store-context`), que
 * es donde en Supabase manda la RPC `delete_family`.
 */
export function deleteFamily(familyId: string): void {
  const listaIds = db.lists.filter(l => l.family_id === familyId).map(l => l.id)
  db.families  = db.families.filter(f => f.id !== familyId)
  db.members   = db.members.filter(m => m.family_id !== familyId)
  db.invites   = db.invites.filter(i => i.family_id !== familyId)
  db.kids      = db.kids.filter(k => k.family_id !== familyId)
  db.events    = db.events.filter(e => e.family_id !== familyId)
  db.tasks     = db.tasks.filter(t => t.family_id !== familyId)
  db.lists     = db.lists.filter(l => l.family_id !== familyId)
  db.listItems = db.listItems.filter(i => i.family_id !== familyId && !listaIds.includes(i.list_id))
  db.mealPlans = db.mealPlans.filter(m => m.family_id !== familyId)
  db.documents = db.documents.filter(d => d.family_id !== familyId)
}

export function getMembers(familyId: string): FamilyMember[] {
  return db.members.filter(m => m.family_id === familyId)
}

export function updateMemberProfile(id: string, name: string, color: string | null): void {
  // Recorta y vacía a null como hace la RPC `update_family_member_profile`. Ahí
  // además se comprueba el permiso (uno mismo o un admin); en demo solo hay un
  // usuario y es admin, así que aquí no hay nada que comprobar.
  db.members = db.members.map(m => m.id !== id ? m : {
    ...m,
    display_name: name.trim(),
    color: color?.trim() || null,
  })
}

export function removeMember(id: string): void {
  db.members = db.members.filter(m => m.id !== id)
  // Imita el ON DELETE SET NULL de Supabase: lo que tuviera asignado esa
  // persona pasa a ser de toda la familia, en vez de quedar colgando.
  db.events = db.events.map(e => e.member_id === id ? { ...e, member_id: null } : e)
  db.documents = db.documents.map(d => d.member_id === id ? { ...d, member_id: null } : d)
}

export function getInvites(familyId: string): FamilyInvite[] {
  return db.invites.filter(i => i.family_id === familyId && i.status === 'pending')
}

export function createInvite(familyId: string, email: string): FamilyInvite {
  db.invites = db.invites.map(i =>
    i.family_id === familyId && i.email.toLowerCase() === email.toLowerCase() && i.status === 'pending'
      ? { ...i, status: 'cancelled' as const }
      : i
  )
  const invite: FamilyInvite = {
    id: crypto.randomUUID(),
    family_id: familyId,
    email: email.trim(),
    role: 'member',
    status: 'pending',
    invited_by: 'u1',
    accepted_at: null,
    created_at: new Date().toISOString(),
  }
  db.invites = [...db.invites, invite]
  return invite
}

export function cancelInvite(id: string): void {
  db.invites = db.invites.map(i => i.id !== id ? i : { ...i, status: 'cancelled' as const })
}
