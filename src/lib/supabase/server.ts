import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLACEHOLDER_URLS = ['your-supabase-project-url', 'placeholder', 'https://placeholder.supabase.co']
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const IS_DEMO_MODE =
  !url ||
  PLACEHOLDER_URLS.some(p => url.includes(p)) ||
  !key ||
  key === 'your-anon-key'

export async function createClient() {
  if (IS_DEMO_MODE) return null as never

  const cookieStore = await cookies()

  return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // En Server Components no se pueden setear cookies; el middleware lo maneja
          }
        },
      },
    }
  )
}
