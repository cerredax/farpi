import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const PLACEHOLDER_URLS = ['your-supabase-project-url', 'placeholder', 'https://placeholder.supabase.co']

export const IS_DEMO_MODE =
  !SUPABASE_URL ||
  PLACEHOLDER_URLS.some(p => SUPABASE_URL.includes(p)) ||
  !SUPABASE_KEY ||
  SUPABASE_KEY === 'your-anon-key'

export function createClient() {
  if (IS_DEMO_MODE) return null as never
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function signOut() {
  if (IS_DEMO_MODE) return
  const supabase = createClient()
  await supabase.auth.signOut()
}
