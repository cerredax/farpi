import { createClient } from '../supabase/client'
import { assertNoError, fail } from './shared'
import type { Family, FamilyInvite, FamilyMember } from '@/types'
import type { FamilyRepo, InvitesRepo, MembersRepo } from '../repos/types'

type Role = 'admin' | 'member'

export const familyRepo: FamilyRepo = {
  async getFamily(familyId: string): Promise<Family | undefined> {
    const supabase = createClient()
    const { data, error } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle()
    assertNoError(error)
    return data ?? undefined
  },

  async getFamilies(): Promise<Family[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('families').select('*').order('created_at')
    assertNoError(error)
    return data ?? []
  },

  async setFamilyName(familyId: string, name: string): Promise<Family> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('families')
      .update({ name: name.trim() })
      .eq('id', familyId)
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async createFamily(name: string): Promise<Family> {
    const supabase = createClient()
    const { data: familyId, error } = await supabase.rpc('create_family_with_admin', { family_name: name.trim() })
    assertNoError(error)
    return familyRepo.getFamily(familyId) as Promise<Family>
  },
}

// El alta, el rol y la baja van por RPC `security definer`: la regla del último
// admin no se puede expresar con policies.
export const membersRepo: MembersRepo = {
  async getMembers(familyId: string): Promise<FamilyMember[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at')
    assertNoError(error)
    return data ?? []
  },

  async updateMemberProfile(id: string, name: string, color: string | null): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.rpc('update_family_member_profile', {
      p_member_id: id,
      p_display_name: name.trim(),
      p_color: color,
    })
    assertNoError(error)
  },

  async updateMemberRole(id: string, role: Role): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.rpc('update_family_member_role', { p_member_id: id, p_role: role })
    assertNoError(error)
  },

  async removeMember(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.rpc('remove_family_member', { p_member_id: id })
    assertNoError(error)
  },
}

export const invitesRepo: InvitesRepo = {
  async getInvites(familyId: string): Promise<FamilyInvite[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('family_invites')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    assertNoError(error)
    return data ?? []
  },

  async createInvite(familyId: string, email: string): Promise<FamilyInvite> {
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId, email }),
    })
    const body = await res.json().catch(() => ({})) as { error?: string; inviteId?: string }
    if (!res.ok) fail(body.error ?? 'Error al enviar la invitación')
    const supabase = createClient()
    const { data, error } = await supabase.from('family_invites').select('*').eq('id', body.inviteId).single()
    assertNoError(error)
    return data
  },

  async cancelInvite(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('family_invites').update({ status: 'cancelled' }).eq('id', id)
    assertNoError(error)
  },
}
