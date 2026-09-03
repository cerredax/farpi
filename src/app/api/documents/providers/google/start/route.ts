import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { requiereSesion } from '@/lib/supabase/guard'
import { construirUrlConsentimiento, COOKIE_STATE } from '@/lib/document-storage/oauth'
import { CONFIG_GOOGLE, FALTA_CONFIG_DRIVE, respuestaSinConfigDrive } from '@/lib/document-storage/tokens'

/**
 * Empezar a conectar Google Drive: mandar a la pantalla de consentimiento.
 *
 * El `state` no es opcional. Sin él, cualquier web puede llevar a alguien con
 * sesión abierta a nuestra ruta de vuelta con un `code` suyo y dejar los
 * documentos de esa familia cayendo en un Drive ajeno. Se genera aquí, se guarda
 * en una cookie que el navegador no puede leer y se compara al volver.
 *
 * `sameSite: 'lax'` y no `strict`: la vuelta desde Google es una navegación de
 * primer nivel desde otro dominio, y con `strict` la cookie no viaja y la
 * conexión falla siempre.
 */
export async function GET(req: NextRequest) {
  const guardia = await requiereSesion(req)
  if (guardia.fallo) return guardia.fallo
  if (FALTA_CONFIG_DRIVE) return respuestaSinConfigDrive('documents/providers/google/start')

  const state = randomUUID()
  const destino = construirUrlConsentimiento({
    clientId: CONFIG_GOOGLE.clientId,
    redirectUri: CONFIG_GOOGLE.redirectUri,
    state,
  })

  const respuesta = NextResponse.redirect(destino)
  respuesta.cookies.set(COOKIE_STATE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 600,
  })
  return respuesta
}
