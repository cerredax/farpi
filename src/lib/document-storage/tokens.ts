import 'server-only'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StorageProviderId } from '@/types'
import { cifrar, descifrar, leerClave } from './crypto'
import { caducidadDesdeExpiresIn, causaDeErrorGoogle, necesitaRefresco, REVOKE_URL, TOKEN_URL } from './oauth'
import { ErrorAlmacen, type ContextoAlmacen } from './types'

/**
 * El permiso prestado: dónde se guarda, cómo se refresca y qué pasa cuando deja
 * de valer.
 *
 * Todo lo de aquí usa el **cliente de servicio**, porque `storage_connections`
 * tiene RLS sin ninguna policy y no hay otra forma de entrar. Eso significa que
 * este módulo no comprueba permisos y no puede hacerlo: quien llame tiene que
 * haber comprobado antes, con el cliente del usuario, que puede ver el documento
 * del que cuelga el token. Está dicho en cada ruta que lo usa.
 */

const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID ?? '').trim()
const CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET ?? '').trim()
const REDIRECT_URI = (process.env.GOOGLE_REDIRECT_URI ?? '').trim()
const TOKEN_KEY = (process.env.DOCS_TOKEN_KEY ?? '').trim()

/**
 * Falta algo para poder hablar con Drive. Las rutas lo comprueban y responden
 * 503, igual que hacen con `SUPABASE_SERVICE_ROLE_KEY` y con `CRON_SECRET`: un
 * 500 sin dueño no dice qué variable falta y se investiga a ciegas.
 */
export const FALTA_CONFIG_DRIVE = !CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !TOKEN_KEY

export function respuestaSinConfigDrive(ruta: string) {
  const faltan = [
    !CLIENT_ID && 'GOOGLE_CLIENT_ID',
    !CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
    !REDIRECT_URI && 'GOOGLE_REDIRECT_URI',
    !TOKEN_KEY && 'DOCS_TOKEN_KEY',
  ].filter(Boolean)
  console.error(`[${ruta}] Falta configuración de Google Drive: ${faltan.join(', ')}`)
  return NextResponse.json({ error: 'Configuración incompleta en el servidor' }, { status: 503 })
}

export const CONFIG_GOOGLE = { clientId: CLIENT_ID, redirectUri: REDIRECT_URI }

function clave(): Buffer {
  return leerClave(TOKEN_KEY)
}

interface Conexion {
  userId: string
  provider: StorageProviderId
  accessToken: string
  refreshToken: string
  expiresAt: string
  email: string | null
  carpetaRef: string | null
  revocada: boolean
}

interface FilaConexion {
  user_id: string
  provider: StorageProviderId
  access_token: string
  refresh_token: string
  expires_at: string
  account_email: string | null
  folder_ref: string | null
  revoked_at: string | null
}

export async function leerConexion(
  userId: string,
  provider: StorageProviderId = 'google_drive',
): Promise<Conexion | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('storage_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle<FilaConexion>()

  if (error) {
    console.error('[document-storage] lectura de la conexión:', error.message)
    throw new ErrorAlmacen('desconocido', 'No se pudo leer la conexión de almacenamiento')
  }
  if (!data) return null

  return {
    userId: data.user_id,
    provider: data.provider,
    accessToken: descifrar(clave(), data.access_token),
    refreshToken: descifrar(clave(), data.refresh_token),
    expiresAt: data.expires_at,
    email: data.account_email,
    carpetaRef: data.folder_ref,
    revocada: !!data.revoked_at,
  }
}

interface DatosParaGuardar {
  userId: string
  provider?: StorageProviderId
  accessToken: string
  refreshToken: string
  expiresAt: string
  email?: string | null
  carpetaRef?: string | null
}

export async function guardarConexion(datos: DatosParaGuardar): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('storage_connections').upsert(
    {
      user_id: datos.userId,
      provider: datos.provider ?? 'google_drive',
      access_token: cifrar(clave(), datos.accessToken),
      refresh_token: cifrar(clave(), datos.refreshToken),
      expires_at: datos.expiresAt,
      account_email: datos.email ?? null,
      folder_ref: datos.carpetaRef ?? null,
      // Volver a conectar limpia la marca: es justo lo que arregla el problema.
      revoked_at: null,
    },
    { onConflict: 'user_id,provider' },
  )
  if (error) {
    console.error('[document-storage] guardado de la conexión:', error.message)
    throw new ErrorAlmacen('desconocido', 'No se pudo guardar la conexión de almacenamiento')
  }
}

/**
 * La conexión dejó de valer. Se **marca**, no se borra: la interfaz tiene que
 * poder distinguir "nunca conectó" de "conectó y hay que volver a hacerlo", que
 * son dos mensajes distintos y dos situaciones distintas para quien lee.
 */
export async function marcarRevocada(userId: string, provider: StorageProviderId = 'google_drive'): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('storage_connections')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) console.error('[document-storage] marcado de revocación:', error.message)
}

export async function borrarConexion(userId: string, provider: StorageProviderId = 'google_drive'): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('storage_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) {
    console.error('[document-storage] borrado de la conexión:', error.message)
    throw new ErrorAlmacen('desconocido', 'No se pudo desconectar el almacenamiento')
  }
}

interface RespuestaToken {
  access_token: string
  expires_in: number
  refresh_token?: string
}

async function pedirToken(cuerpo: Record<string, string>): Promise<RespuestaToken> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(cuerpo).toString(),
  })
  const texto = await res.text()
  if (!res.ok) {
    throw new ErrorAlmacen(causaDeErrorGoogle(res.status, texto), 'Google rechazó la autorización')
  }
  return JSON.parse(texto)
}

/** Primera conexión: el código de la pantalla de consentimiento por tokens. */
export async function canjearCodigo(code: string): Promise<Required<RespuestaToken>> {
  const datos = await pedirToken({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  })
  if (!datos.refresh_token) {
    // Pasa cuando falta `prompt=consent` y la persona ya había autorizado antes.
    // Sin refresh token la conexión se cae a la hora, así que mejor no guardarla.
    throw new ErrorAlmacen('conexion_revocada', 'Google no devolvió permiso duradero. Vuelve a intentarlo.')
  }
  return datos as Required<RespuestaToken>
}

/** Deshacer el permiso también del lado de Google, no solo en nuestra tabla. */
export async function revocarEnGoogle(refreshToken: string): Promise<void> {
  try {
    await fetch(REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }).toString(),
    })
  } catch {
    // Si Google no contesta, la conexión se borra igual por nuestro lado: lo que
    // se ha pedido es dejar de usarlo, y eso ya se cumple.
  }
}

/**
 * Un contexto listo para dárselo al proveedor, con el token vigente.
 *
 * Aquí se decide qué pasa cuando el permiso se ha caído, y por eso los errores
 * son de tipo `ErrorAlmacen`: `sin_conexion` cuando esa persona no ha conectado
 * nunca, `conexion_revocada` cuando conectó y ya no vale. Los dos acaban en un
 * mensaje distinto, y el segundo se arregla volviendo a conectar.
 */
export async function contextoDeAlmacen(opciones: {
  ownerId: string
  familyId: string
  origen: string
  provider?: StorageProviderId
}): Promise<ContextoAlmacen> {
  const provider = opciones.provider ?? 'google_drive'
  const conexion = await leerConexion(opciones.ownerId, provider)
  if (!conexion) throw new ErrorAlmacen('sin_conexion', 'No hay almacenamiento conectado')
  if (conexion.revocada) throw new ErrorAlmacen('conexion_revocada', 'El almacenamiento ya no está conectado')

  let accessToken = conexion.accessToken
  if (necesitaRefresco(conexion.expiresAt)) {
    try {
      const datos = await pedirToken({
        refresh_token: conexion.refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
      })
      accessToken = datos.access_token
      await guardarConexion({
        userId: conexion.userId,
        provider,
        accessToken,
        // Google no reemite el refresh token al refrescar: se conserva el que hay.
        refreshToken: conexion.refreshToken,
        expiresAt: caducidadDesdeExpiresIn(datos.expires_in),
        email: conexion.email,
        carpetaRef: conexion.carpetaRef,
      })
    } catch (err) {
      if (err instanceof ErrorAlmacen && err.causa === 'conexion_revocada') {
        await marcarRevocada(conexion.userId, provider)
      }
      throw err
    }
  }

  return {
    accessToken,
    familyId: opciones.familyId,
    carpetaRef: conexion.carpetaRef,
    origen: opciones.origen,
  }
}

/**
 * Guardar la carpeta que acaba de resolver el proveedor. Si no se guarda no se
 * rompe nada: la siguiente subida la vuelve a buscar.
 */
export async function recordarCarpeta(
  userId: string,
  carpetaRef: string,
  provider: StorageProviderId = 'google_drive',
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('storage_connections')
    .update({ folder_ref: carpetaRef })
    .eq('user_id', userId)
    .eq('provider', provider)
  if (error) console.error('[document-storage] guardado de la carpeta:', error.message)
}
