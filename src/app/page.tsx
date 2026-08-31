import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IS_DEMO_MODE } from '@/lib/supabase/env'
import { LandingPage } from '@/components/landing/LandingPage'

export default async function RootPage() {
  if (!IS_DEMO_MODE) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/home')
  }

  return <LandingPage />
}
