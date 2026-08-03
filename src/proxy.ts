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
    '/((?!_next/static|_next/image|favicon.ico|icons|sw\\.js|manifest\\.json|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
