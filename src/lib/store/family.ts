import type { Family, FamilyMember, FamilyInvite } from '@/types'
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

export function createFamily(name: string): Family {
  const now = new Date().toISOString()
  const f: Family = { id: crypto.randomUUID(), name: name.trim(), created_at: now, updated_at: now }
  db.families = [...db.families, f]
  const adminMember: FamilyMember = {
    id: crypto.randomUUID(),
    family_id: f.id,
    user_id: 'u1',
    display_name: 'Omar',
    avatar_url: null,
    role: 'admin',
    created_at: now,
  }
  db.members = [...db.members, adminMember]
  return f
}

export function getMembers(familyId: string): FamilyMember[] {
  return db.members.filter(m => m.family_id === familyId)
}

export function updateMemberName(id: string, name: string): void {
  db.members = db.members.map(m => m.id !== id ? m : { ...m, display_name: name })
}

export function removeMember(id: string): void {
  db.members = db.members.filter(m => m.id !== id)
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
