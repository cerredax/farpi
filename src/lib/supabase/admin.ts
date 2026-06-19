import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const skey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Cliente de servicio — solo usar en Route Handlers o Server Actions.
// Nunca exponer SUPABASE_SERVICE_ROLE_KEY al cliente.
export function createAdminClient() {
  return createClient(url, skey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
