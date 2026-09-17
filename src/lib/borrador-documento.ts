import type { DocumentDraft } from '@/types'

const CLAVE = 'farpi_borrador_documento'

/**
 * Lo que hubiera escrito en el sheet de subir un documento, guardado mientras se
 * va a dar permiso a Google.
 *
 * Conectar Drive es **salir de Farpi**: el navegador se va a la pantalla de
 * consentimiento de Google y vuelve a `/docs` recargando la app entera. Todo lo
 * escrito —el nombre, la categoría, de quién es, la caducidad— se quedaba por el
 * camino, y al volver había que teclearlo otra vez justo en el momento en que ya
 * se podía subir. El cartel de conectar ocupa el sitio del selector de archivo,
 * que está arriba del todo, así que la mayoría pulsa antes de escribir nada;
 * esto es para el que no.
 *
 * **`sessionStorage` y no `localStorage`**: esto vale para el viaje de ida y
 * vuelta de una pestaña, no para mañana. Y **se borra al recuperarlo**, para que
 * un borrador de hace media hora no aparezca dentro de un alta que no tiene nada
 * que ver.
 *
 * El almacén se pasa como argumento para poder probarlo sin navegador; por
 * defecto es el de la pestaña. Si no hay ninguno —render de servidor, o un
 * navegador con el almacenamiento capado— no pasa nada: se pierde lo escrito,
 * que es exactamente lo que pasaba antes.
 */
function almacenDeLaPestaña(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function guardaBorrador(draft: DocumentDraft, almacen = almacenDeLaPestaña()): void {
  if (!almacen) return
  try {
    // El archivo no viaja: no es serializable y, cuando esto se guarda, aún no
    // se ha podido elegir ninguno.
    const { file: _file, ...sinArchivo } = draft
    void _file
    almacen.setItem(CLAVE, JSON.stringify(sinArchivo))
  } catch {
    // Un almacén lleno o capado no puede tumbar el ir a conectar.
  }
}

export function recuperaBorrador(almacen = almacenDeLaPestaña()): Partial<DocumentDraft> | null {
  if (!almacen) return null
  try {
    const crudo = almacen.getItem(CLAVE)
    almacen.removeItem(CLAVE)
    if (!crudo) return null
    const guardado: unknown = JSON.parse(crudo)
    // Se comprueba la forma antes de creérselo: en `sessionStorage` puede haber
    // quedado cualquier cosa de una versión anterior.
    if (!guardado || typeof guardado !== 'object' || typeof (guardado as DocumentDraft).name !== 'string') {
      return null
    }
    const { file: _file, ...sinArchivo } = guardado as DocumentDraft
    void _file
    return sinArchivo
  } catch {
    return null
  }
}
