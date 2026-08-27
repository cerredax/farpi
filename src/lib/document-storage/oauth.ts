import type { CausaAlmacen } from './types'

/**
 * Las piezas de OAuth que no hablan con nadie.
 *
 * Están aparte de `google-drive.ts` y de `tokens.ts` porque son las que hay que
 * poder probar sin red y sin secretos: montar mal la URL de consentimiento o
 * calcular mal si un token ha caducado no rompe nada en el momento, rompe una
 * semana después y en producción.
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

/**
 * El único permiso que se pide: los archivos que crea esta app y ninguno más.
 *
 * `drive.file` es un scope **no sensible**, así que Nido no pasa por la
 * verificación de Google ni por la auditoría CASA. Cambiarlo por `drive` o
 * `drive.readonly` —para "ver también lo que ya tenías"— mete el proyecto en un
 * proceso de semanas. No se toca.
 */
export const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.file'

/**
 * La cookie que sostiene el `state` de OAuth mientras se va y se vuelve de
 * Google. Vive aquí y no en la ruta porque la escriben dos archivos distintos —
 * la que sale y la que vuelve— y un nombre copiado a mano que baile rompe la
 * conexión sin decir por qué.
 */
export const COOKIE_STATE = 'nido_drive_state'

/** Margen antes de caducar. Un minuto sobra para una petición y evita el borde. */
const MARGEN_REFRESCO_MS = 60_000

/**
 * ¿Hay que pedir un token de acceso nuevo antes de usarlo?
 *
 * Se refresca por adelantado y no al recibir un 401 porque el 401 llega a mitad
 * de una descarga ya empezada, cuando las cabeceras de la respuesta ya salieron
 * y no hay forma de reintentar limpiamente.
 */
export function necesitaRefresco(expiresAt: string | Date, ahora: Date = new Date()): boolean {
  const caduca = expiresAt instanceof Date ? expiresAt : new Date(expiresAt)
  if (Number.isNaN(caduca.getTime())) return true
  return caduca.getTime() - ahora.getTime() <= MARGEN_REFRESCO_MS
}

/** Cuándo caduca un token que Google acaba de dar, a partir de su `expires_in`. */
export function caducidadDesdeExpiresIn(expiresIn: number, ahora: Date = new Date()): string {
  const segundos = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600
  return new Date(ahora.getTime() + segundos * 1000).toISOString()
}

interface OpcionesConsentimiento {
  clientId: string
  redirectUri: string
  state: string
}

/**
 * La pantalla de "Nido quiere acceder a tu Drive".
 *
 * Dos parámetros no son decorativos y quitarlos rompe el sistema en silencio:
 * `access_type=offline` es lo que hace que Google devuelva un refresh token, y
 * `prompt=consent` es lo que hace que lo devuelva **también al reconectar** — sin
 * él, la segunda autorización de la misma persona vuelve sin refresh token y la
 * conexión se cae a la hora, cuando caduca el de acceso.
 */
export function construirUrlConsentimiento({ clientId, redirectUri, state }: OpcionesConsentimiento): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE_DRIVE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

/**
 * Qué significa un fallo de la API de Google en el vocabulario de Nido.
 *
 * `invalid_grant` es el importante: es lo que contesta Google cuando el refresh
 * token ya no vale —revocado a mano desde la cuenta, caducado por estar la app
 * en modo "Testing", cambiado de contraseña—. No es un error transitorio y
 * reintentar no arregla nada: hay que volver a conectar.
 */
export function causaDeErrorGoogle(estado: number, cuerpo: string): CausaAlmacen {
  const texto = cuerpo.toLowerCase()
  if (texto.includes('invalid_grant') || estado === 401) return 'conexion_revocada'
  if (estado === 404) return 'archivo_no_esta'
  if (estado === 403) {
    if (texto.includes('quota') || texto.includes('storagequotaexceeded')) return 'cuota'
    // Un 403 de Drive con `drive.file` casi siempre es "este token no creó ese
    // archivo", que desde fuera se ve igual que si no estuviera.
    return texto.includes('ratelimit') ? 'cuota' : 'archivo_no_esta'
  }
  if (estado === 400 || estado === 413) return 'archivo_rechazado'
  return 'desconocido'
}

/** El mensaje que ve una persona. `nombreDueno` es de quien es el Drive. */
export function mensajeDeCausa(causa: CausaAlmacen, nombreDueno: string | null): string {
  const dueno = nombreDueno?.trim() || 'quien lo subió'
  switch (causa) {
    case 'sin_conexion':
      return `Este documento lo subió ${dueno} y todavía no ha conectado su almacenamiento.`
    case 'conexion_revocada':
      return `Este documento lo subió ${dueno} y su almacenamiento ya no está conectado. Pídele que vuelva a entrar en Documentos y lo conecte otra vez.`
    case 'archivo_no_esta':
      return `El archivo ya no está en el Google Drive de ${dueno}. La ficha se queda, pero el documento no se puede abrir.`
    case 'archivo_rechazado':
      return 'El archivo no se pudo guardar: revisa que sea un PDF, JPG o PNG de menos de 20 MB.'
    case 'cuota':
      return `El Google Drive de ${dueno} no admite más archivos ahora mismo.`
    default:
      return 'No se pudo acceder al documento. Inténtalo de nuevo en un momento.'
  }
}
