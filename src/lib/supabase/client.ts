import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Demo mode when env vars are missing or still placeholder values (same logic as middleware)
export const IS_DEMO_MODE = !SUPABASE_URL || SUPABASE_URL === 'your-supabase-project-url'

export function createClient() {
  if (IS_DEMO_MODE) return null as never
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}
