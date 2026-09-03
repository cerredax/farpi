import { createClient } from '../supabase/client'

/**
 * Lo que comparten todos los repos de Supabase: cómo se falla y quién eres.
 *
 * El equivalente a `store/db.ts` en el mock. Cada dominio vive en su archivo y
 * sube aquí lo único que necesitan todos.
 */
export function fail(message: string): never {
  throw new Error(message)
}

export function assertNoError(error: { message: string } | null | undefined): void {
  if (error) fail(error.message)
}

/**
 * Quién está escribiendo, para el `created_by` de la fila.
 *
 * Va por `getSession()` y no por `getUser()`, que era lo que había: `getUser()`
 * **pregunta al servidor** cada vez, así que cada alta de la app llevaba delante
 * un viaje a GoTrue —hay diecisiete escrituras que pasan por aquí— antes de
 * empezar a hacer nada. `getSession()` lee la sesión que ya está en el navegador.
 *
 * **Y no se pierde nada de seguridad**, que es la pregunta obvia: este id no
 * decide ningún permiso. Quien decide es la RLS con `auth.uid()`, que sale del
 * JWT en el servidor y no de lo que diga el cliente; esto solo rellena una
 * columna informativa que, de hecho, un cliente malicioso ya podía escribir a
 * mano. Cambiar la comprobación por la lectura local no mueve esa frontera ni un
 * milímetro: la frontera nunca estuvo aquí.
 */
export async function currentUserId(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  assertNoError(error)
  return data.session?.user.id ?? fail('Usuario no autenticado')
}
