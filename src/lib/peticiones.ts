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
