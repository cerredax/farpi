import { cookies } from 'next/headers'
import { COOKIE_IDIOMA, idiomaDesdeCookie, type Idioma } from './idiomas'

/**
 * El idioma de la petición, para lo que se pinta en el servidor.
 *
 * Leer la cookie hace dinámica la página que lo pide, y como lo pide el layout
 * raíz, lo son todas. No cuesta lo que parece: el proxy ya pasa por cada
 * petición a refrescar la sesión con Supabase, que es bastante más lento que
 * pintar el armazón.
 */
export async function idiomaDeLaPeticion(): Promise<Idioma> {
  const almacen = await cookies()
  return idiomaDesdeCookie(almacen.get(COOKIE_IDIOMA)?.value)
}
