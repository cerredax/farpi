import { createClient } from '../supabase/client'
import { assertNoError } from './shared'
import type { Child, ChildDraft } from '@/types'
import type { ChildrenRepo } from '../repos/types'

export const childrenRepo: ChildrenRepo = {
  async getKids(familyId: string): Promise<Child[]> {
    const supabase = createClient()
    const { data, error } = await supabase.from('children').select('*').eq('family_id', familyId).order('created_at')
    assertNoError(error)
    return data ?? []
  },

  async createKid(familyId: string, draft: ChildDraft): Promise<Child> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('children')
      .insert({ family_id: familyId, name: draft.name.trim(), birth_date: draft.birth_date || null, color: draft.color })
      .select('*')
      .single()
    assertNoError(error)
    return data
  },

  async updateKid(id: string, draft: ChildDraft): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('children')
      .update({ name: draft.name.trim(), birth_date: draft.birth_date || null, color: draft.color })
      .eq('id', id)
    assertNoError(error)
  },

  // Al borrar un hijo, lo suyo no se borra: queda sin asignar (`child_id = null`
  // por la FK). Lo hace la base, no hay que replicarlo aquí.
  async deleteKid(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase.from('children').delete().eq('id', id)
    assertNoError(error)
  },
}
