import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from './server'
import { IS_DEMO_MODE } from './env'

type Cliente = Awaited<ReturnType<typeof createClient>>

type Resultado =
  | { fallo: NextResponse; supabase?: never; user?: never }
  | { fallo?: never; supabase: Cliente; user: User }

/**
 * La puerta de las rutas API que llama la interfaz.
 *
 * Hace las dos comprobaciones que **todas** tienen que hacer, en este orden:
 *
 * 1. **Cortar en modo demo.** Sin esta guarda el modo demo intenta hablar con
 *    Supabase sin credenciales y la suite e2e se cae. No es una comodidad: es
 *    la razón de que la suite pueda correr sin secretos.
 * 2. **Exigir sesión.** La RLS ya protege los datos, pero una ruta que sigue
 *    adelante sin usuario acaba haciendo trabajo con `user` a `null`.
 *
 * Estaba copiada palabra por palabra en `/api/invite`, `/api/push` (dos veces) y
 * `/api/account/delete`. Copiada no es solo fea: es una guarda que se puede
 * olvidar al escribir la quinta ruta, y olvidarla rompe el modo demo entero.
 *
 * `/api/cron/reminders` no la usa y no debe: no la llama la interfaz sino Vercel,
 * no hay sesión que exigir y va con el cliente de servicio.
 *
 * Se usa así, y el `if` es obligatorio para que TypeScript estreche el tipo:
 *
 * ```ts
 * const guardia = await requiereSesion()
 * if (guardia.fallo) return guardia.fallo
 * const { supabase, user } = guardia
 * ```
 */
export async function requiereSesion(): Promise<Resultado> {
  if (IS_DEMO_MODE) {
    return { fallo: NextResponse.json({ error: 'No disponible en modo demo' }, { status: 400 }) }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { fallo: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }

  return { supabase, user }
}
