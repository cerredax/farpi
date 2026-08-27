import { NextResponse, type NextRequest } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { getProvider } from '@/lib/document-storage'
import { caducidadDesdeExpiresIn, COOKIE_STATE } from '@/lib/document-storage/oauth'
import { canjearCodigo, FALTA_CONFIG_DRIVE, guardarConexion, respuestaSinConfigDrive } from '@/lib/document-storage/tokens'

/**
 * La vuelta de Google.
 *
 * Termina siempre en `/docs`, con `?drive=ok` o `?drive=error`, y nunca en una
 * pantalla propia: quien pulsó "Conectar" estaba subiendo un documento y es ahí
 * donde quiere volver a estar. Que salga mal no es raro —se puede cancelar el
 * consentimiento con un botón— así que el camino del error tiene que ser tan
 * normal como el del acierto.
 */
function volverADocumentos(req: NextRequest, resultado: 'ok' | 'error'): NextResponse {
  const destino = new URL('/docs', req.nextUrl.origin)
  destino.searchParams.set('drive', resultado)
  const respuesta = NextResponse.redirect(destino)
  // La cookie ha cumplido: se va tanto si salió bien como si no, para que un
  // `state` viejo no valga en un segundo intento.
  respuesta.cookies.delete(COOKIE_STATE)
  return respuesta
}

export async function GET(req: NextRequest) {
  const guardia = await requiereSesion()
  if (guardia.fallo) return guardia.fallo
  const { user } = guardia
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/providers/google/callback')

  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const guardado = req.cookies.get(COOKIE_STATE)?.value

  // Cancelar en la pantalla de Google llega aquí con `?error=access_denied`, sin
  // código. No es un fallo que haya que registrar: es alguien que se lo pensó.
  if (!code) return volverADocumentos(req, 'error')

  if (!state || !guardado || state !== guardado) {
    console.error('[documents/providers/google/callback] el state no coincide con la cookie')
    return volverADocumentos(req, 'error')
  }

  try {
    const tokens = await canjearCodigo(code)
    const proveedor = getProvider('google_drive')
    // Con qué cuenta de Google se ha conectado. Se pregunta antes de guardar
    // porque es el único momento en que se tiene el token recién hecho y da
    // igual que falle: sin correo la conexión vale, solo se ve más pobre.
    const { email } = await proveedor.cuenta({
      accessToken: tokens.access_token,
      familyId: '',
      carpetaRef: null,
      origen: req.nextUrl.origin,
    })

    await guardarConexion({
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: caducidadDesdeExpiresIn(tokens.expires_in),
      email,
    })
    return volverADocumentos(req, 'ok')
  } catch (err) {
    console.error('[documents/providers/google/callback]', err instanceof Error ? err.message : err)
    return volverADocumentos(req, 'error')
  }
}
