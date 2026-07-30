import { createBrowserClient } from '@supabase/ssr'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

export { IS_DEMO_MODE }

export function createClient() {
  if (IS_DEMO_MODE) return null as never
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export async function signOut() {
  if (IS_DEMO_MODE) return
  const supabase = createClient()
  await supabase.auth.signOut()
}
