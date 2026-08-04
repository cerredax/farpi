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

export async function currentUserId(): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getUser()
  assertNoError(error)
  return data.user?.id ?? fail('Usuario no autenticado')
}
