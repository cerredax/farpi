import 'server-only'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from './env'

// La URL viene de `env.ts` y no de `process.env`, que es de donde se leía: allí
// se le quita el espacio que se cuela al pegar un valor en un panel de entorno.
// Sin el recorte, un espacio de más rompía **solo** las rutas con service role
// —invitar, borrar la cuenta, los documentos— mientras el resto de la app
// funcionaba, que es la clase de avería que se investiga por el sitio
// equivocado. Y es además la regla del proyecto: la configuración de Supabase se
// resuelve en un único módulo.
const url  = SUPABASE_URL
const skey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

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
