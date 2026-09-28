import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // `sw.js` y `manifest.json` deben quedar fuera: son ficheros públicos de la
    // PWA y, si pasan por el control de sesión, se redirigen a /auth/login. El
    // navegador rechaza registrar un service worker que responde con redirect.
    //
    // `api/salud` también, y por una razón propia: es lo que mira el vigía
    // externo para saber si Supabase responde, así que no puede atravesar
    // justo la pieza que puede estar colgada. Pasando por el proxy esperaría
    // cinco segundos a la sesión antes de empezar a medir.
    //
    // `.well-known` tampoco (28-09-2026): ahí va `assetlinks.json`, que Android
    // descarga sin sesión para comprobar que la app de Google Play es de este
    // dominio. Redirigido al login, la app enseñaría la barra del navegador.
    '/((?!_next/static|_next/image|favicon.ico|icons|sw\\.js|manifest\\.json|robots\\.txt|api/salud|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
