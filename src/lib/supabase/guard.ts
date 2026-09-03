import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from './server'
import { IS_DEMO_MODE } from './env'
import { deOtroSitio } from '../peticiones'

type Cliente = Awaited<ReturnType<typeof createClient>>

type Resultado =
  | { fallo: NextResponse; supabase?: never; user?: never }
  | { fallo?: never; supabase: Cliente; user: User }

/**
 * La puerta de las rutas API que llama la interfaz.
 *
 * Hace las tres comprobaciones que **todas** tienen que hacer, en este orden:
 *
 * 1. **Cortar en modo demo.** Sin esta guarda el modo demo intenta hablar con
 *    Supabase sin credenciales y la suite e2e se cae. No es una comodidad: es
 *    la razón de que la suite pueda correr sin secretos.
 * 2. **Rechazar lo que venga de otra web** si cambia algo. Ver `deOtroSitio`: hoy
 *    lo para el `SameSite=Lax` de las cookies de Supabase, que es una defensa que
 *    no es nuestra.
 * 3. **Exigir sesión.** La RLS ya protege los datos, pero una ruta que sigue
 *    adelante sin usuario acaba haciendo trabajo con `user` a `null`.
 *
 * Estaba copiada palabra por palabra en `/api/invite`, `/api/push` (dos veces) y
 * `/api/account/delete`. Copiada no es solo fea: es una guarda que se puede
 * olvidar al escribir la quinta ruta, y olvidarla rompe el modo demo entero.
 *
 * `/api/cron/reminders` no la usa y no debe: no la llama la interfaz sino Vercel,
 * no hay sesión que exigir y va con el cliente de servicio.
 *
 * **La petición es obligatoria y no opcional** a propósito: si se pudiera omitir,
 * la comprobación de origen sería justo la clase de guarda que se olvida en la ruta
 * siguiente, que es lo que este archivo existe para evitar. Así no compila sin ella.
 *
 * Se usa así, y el `if` es obligatorio para que TypeScript estreche el tipo:
 *
 * ```ts
 * const guardia = await requiereSesion(req)
 * if (guardia.fallo) return guardia.fallo
 * const { supabase, user } = guardia
 * ```
 */
export async function requiereSesion(req: Request): Promise<Resultado> {
  if (IS_DEMO_MODE) {
    return { fallo: NextResponse.json({ error: 'No disponible en modo demo' }, { status: 400 }) }
  }

  const fuera = deOtroSitio({
    metodo: req.method,
    sitio: req.headers.get('sec-fetch-site'),
    origen: req.headers.get('origin'),
    host: req.headers.get('host'),
  })
  if (fuera) {
    console.error(`[guard] ${req.method} desde otro sitio:`, req.headers.get('origin') ?? 'sin origin')
    return { fallo: NextResponse.json({ error: 'Petición no permitida' }, { status: 403 }) }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { fallo: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }

  return { supabase, user }
}
