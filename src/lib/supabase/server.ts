import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

export async function createClient() {
  if (IS_DEMO_MODE) return null as never

  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
