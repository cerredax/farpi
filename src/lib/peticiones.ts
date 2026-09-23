/**
 * Lo que se puede saber de una petición sin salir de ella.
 *
 * Vive aparte de `supabase/guard.ts` por lo mismo que `push.ts` vive aparte de
 * `/api/push`: es una regla que hay que poder probar sin levantar un servidor ni
 * fabricar una sesión, y el guard no se puede importar desde un test porque
 * arrastra el cliente de Supabase y las cookies de Next.
 */

/**
 * Los métodos que cambian algo.
 *
 * Un `GET` no entra: la vuelta de Google al conectar Drive es una navegación
 * desde otro sitio y tiene que pasar, y lo que la protege es el `state` con su
 * cookie, no esto.
 */
const METODOS_QUE_ESCRIBEN = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export interface QuienLlama {
  metodo: string
  /** `Sec-Fetch-Site`: el navegador diciendo de dónde sale, sin interpretaciones. */
  sitio: string | null
  /** `Origin`, el respaldo para quien no manda la de arriba. */
  origen: string | null
  /** `Host`, para comparar con el `Origin`. */
  host: string | null
}

/**
 * ¿La ha lanzado otra web, y cambia algo?
 *
 * Hoy Farpi no tiene CSRF porque las cookies de Supabase son `SameSite=Lax` y una
 * petición cruzada no las lleva. Eso es una defensa **prestada**: el día que una
 * cookie pase a `SameSite=None` por cualquier razón, `/api/account/delete` queda a
 * un `fetch` de una web ajena y no habría nada nuestro que lo pare. Esto es lo
 * nuestro.
 *
 * `Sec-Fetch-Site` primero, que lo manda el navegador y no se puede falsificar
 * desde una página. Si no viene —un cliente viejo, `curl`, un test— se compara el
 * `Origin` con el `Host`. Y si tampoco viene `Origin`, **se deja pasar**: no lo
 * manda quien no es un navegador, y ahí no hay CSRF que valga porque no hay
 * cookies que alguien pueda hacer viajar sin querer.
 */
export function deOtroSitio({ metodo, sitio, origen, host }: QuienLlama): boolean {
  if (!METODOS_QUE_ESCRIBEN.has(metodo.toUpperCase())) return false

  if (sitio) return sitio !== 'same-origin'

  if (!origen) return false
  try {
    return new URL(origen).host !== host
  } catch {
    // Un `Origin` que no es una URL no es de ningún navegador.
    return true
  }
}

/** La sesión que trae un enlace de invitación en el fragmento de la URL. */
export interface SesionDeInvitacion {
  accessToken: string
  refreshToken: string
  /** Con qué cuenta se va a entrar: es lo que se enseña antes de entrar. */
  correo: string
}

/**
 * ¿Trae este enlace una sesión de invitación que se pueda ofrecer?
 *
 * Es la única puerta por la que Farpi acepta una sesión escrita en la URL, y está
 * acotada a propósito (23-09-2026). El alta, la contraseña olvidada y Google
 * vuelven por PKCE (`?code=`), que solo canjea el navegador que lo pidió. La
 * invitación no puede: la manda el servidor con `inviteUserByEmail` y Supabase la
 * devuelve con los tokens en el fragmento. Y unos tokens en una URL los puede
 * poner cualquiera: bastaba un enlace con los de una cuenta ajena para dejar a
 * quien lo abriera dentro de ella sin enterarse —y lo que subiera después, su DNI
 * incluido, en la familia del que preparó el enlace—.
 *
 * Por eso dos condiciones. Que el enlace sea de invitación (`invite_id`), porque
 * ningún otro flujo de la app trae tokens así. Y que se sepa **con qué correo**
 * se va a entrar, porque eso es lo que la pantalla enseña y hay que confirmar: sin
 * correo no hay nada que confirmar, y no se entra.
 */
export function sesionDeInvitacion(fragmento: string, inviteId: string | null): SesionDeInvitacion | null {
  if (!inviteId) return null
  const params = new URLSearchParams(fragmento.replace(/^#/, ''))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null
  const correo = correoDelToken(accessToken)
  if (!correo) return null
  return { accessToken, refreshToken, correo }
}

/**
 * El correo que lleva dentro un token de acceso de Supabase.
 *
 * **Se lee, no se verifica**: la firma la comprueba Supabase en el `setSession`,
 * que es el que decide si se entra. Esto solo dice qué nombre poner en la pantalla
 * de confirmar, y un token falsificado no pasaría de ahí.
 */
export function correoDelToken(token: string): string | null {
  const partes = token.split('.')
  if (partes.length !== 3) return null
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/')
    const binario = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
    const texto = new TextDecoder().decode(Uint8Array.from(binario, c => c.charCodeAt(0)))
    const carga = JSON.parse(texto) as { email?: unknown }
    return typeof carga.email === 'string' && carga.email.trim() ? carga.email.trim() : null
  } catch {
    return null
  }
}
