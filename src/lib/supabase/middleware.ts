import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

/**
 * Cuánto se espera a que Supabase diga quién eres antes de darlo por caído.
 *
 * El 28-08-2026 una incidencia suya dejó `getUser()` sin volver y con él toda
 * ruta con sesión: el proxy tardaba entre 150 y 224 segundos, contra 3 ms sin
 * sesión, y quien entraba veía el logo de "Cargando Farpi" para siempre. Nadie
 * se enteró hasta que una persona se quejó. Una espera sin final es peor que un
 * error.
 *
 * Cinco segundos son de sobra para una llamada que en un día normal tarda
 * milisegundos, y poco para quien está esperando delante del móvil.
 */
const LIMITE_AUTH_MS = 5000

/**
 * Que Supabase conteste "no hay nadie" es una respuesta normal —quien no ha
 * entrado—, y no tiene nada que ver con que no conteste. Solo lo segundo es una
 * caída, y por eso son dos estados y no un `user | null`.
 */
type Sesion =
  | { estado: 'ok'; user: User | null }
  | { estado: 'caido' }

async function leerSesion(supabase: SupabaseClient): Promise<Sesion> {
  let temporizador: ReturnType<typeof setTimeout> | undefined
  try {
    const limite = new Promise<'agotado'>(resolve => {
      temporizador = setTimeout(() => resolve('agotado'), LIMITE_AUTH_MS)
    })
    const resultado = await Promise.race([supabase.auth.getUser(), limite])
    if (resultado === 'agotado') {
      // Va al log del servidor, que es donde se mira cuando algo se cae: en los
      // Runtime Logs de Vercel estaba el dato que resolvió aquella mañana.
      console.error(`[farpi] Supabase no contestó en ${LIMITE_AUTH_MS} ms`)
      return { estado: 'caido' }
    }
    return { estado: 'ok', user: resultado.data.user }
  } catch (err) {
    console.error('[farpi] Supabase falló al comprobar la sesión', err)
    return { estado: 'caido' }
  } finally {
    clearTimeout(temporizador)
  }
}

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

  const sesion = await leerSesion(supabase)

  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
  const PUBLIC_ROUTES = ['/', '/privacidad', '/terminos', '/offline', '/no-disponible']
  const isPublicRoute =
    PUBLIC_ROUTES.includes(request.nextUrl.pathname) ||
    // El cron de Vercel llama sin sesión: si lo redirigimos al login, la tarea
    // nunca se ejecuta. La ruta se protege por su cuenta con CRON_SECRET.
    request.nextUrl.pathname.startsWith('/api/cron/')

  if (sesion.estado === 'caido') {
    // Lo que no necesita saber quién eres se sirve igual: las páginas legales y
    // la de sin conexión no dependen de Supabase.
    if (isPublicRoute) return supabaseResponse

    // Una ruta API contesta como lo que es, para que quien la llamó pueda
    // distinguirlo de un fallo suyo.
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 })
    }

    // El resto enseña la pantalla sin cambiar la URL —es un `rewrite`, no un
    // redirect—, así que recargar reintenta donde estabas. **No se manda al
    // login**: parecería que se ha caído tu sesión y acabarías escribiendo la
    // contraseña contra un Supabase que no responde. No abre ningún hueco,
    // porque quien manda sobre los datos es la RLS y no este proxy.
    return NextResponse.rewrite(new URL('/no-disponible', request.url), { status: 503 })
  }

  const user = sesion.user

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
