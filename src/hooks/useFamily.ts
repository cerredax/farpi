'use client'

// EXPERIMENTAL — no forma parte del flujo actual de la app.
// La app usa StoreProvider + mock-store para todos los datos.
// Este hook será reemplazado por los repositorios Supabase (src/lib/repos/)
// cuando se conecte Supabase en Fase 4. No conectar a ninguna UI todavía.

import { useEffect, useState } from 'react'
import { createClient, IS_DEMO_MODE } from '@/lib/supabase/client'
import type { Family, FamilyMember, Child } from '@/types'

interface FamilyState {
  family: Family | null
  member: FamilyMember | null
  children: Child[]
  loading: boolean
  error: string | null
}

export function useFamily(): FamilyState {
  const [state, setState] = useState<FamilyState>({
    family: null,
    member: null,
    children: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      if (IS_DEMO_MODE) { setState(s => ({ ...s, loading: false })); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState(s => ({ ...s, loading: false }))
        return
      }

      const { data: member, error: memberErr } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (memberErr || !member) {
        setState(s => ({ ...s, loading: false, error: 'No estás asociado a ninguna familia' }))
        return
      }

      const { data: family } = await supabase
        .from('families')
        .select('*')
        .eq('id', member.family_id)
        .single()

      const { data: children } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', member.family_id)
        .order('birth_date')

      setState({
        family: family ?? null,
        member,
        children: children ?? [],
        loading: false,
        error: null,
      })
    }

    load()
  }, [])

  return state
}
