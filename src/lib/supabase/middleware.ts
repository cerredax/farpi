import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

export async function updateSession(request: NextRequest) {
  // Sin credenciales de Supabase reales, dejamos pasar todas las rutas (modo demo).
  if (IS_DEMO_MODE) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const PUBLIC_ROUTES = ['/', '/privacidad', '/terminos', '/offline', '/api/_diag']
  const isPublicRoute = PUBLIC_ROUTES.includes(request.nextUrl.pathname)

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute && !request.nextUrl.pathname.startsWith('/auth/callback')) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
