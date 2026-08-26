import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ''
const skey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/**
 * Si falta la clave de servicio, la ruta no puede hacer nada: hasta ahora se
 * pasaba una cadena vacía y `createClient` reventaba con «supabaseKey is
 * required», un 500 sin dueño que no dice qué variable falta. Las rutas que
 * usan el cliente admin lo comprueban antes y responden 503, igual que el cron
 * hace con `CRON_SECRET`.
 */
export const FALTA_SERVICE_ROLE = !skey

export function respuestaSinServiceRole(ruta: string) {
  console.error(`[${ruta}] Falta SUPABASE_SERVICE_ROLE_KEY: la ruta no puede operar.`)
  return NextResponse.json({ error: 'Configuración incompleta en el servidor' }, { status: 503 })
}

// Cliente de servicio — solo usar en Route Handlers o Server Actions.
// Nunca exponer SUPABASE_SERVICE_ROLE_KEY al cliente.
export function createAdminClient() {
  return createClient(url, skey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
