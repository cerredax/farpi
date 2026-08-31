import { NextResponse } from 'next/server'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/env'

export const runtime = 'nodejs'
// Se mide en cada llamada o no mide nada.
export const dynamic = 'force-dynamic'

/**
 * Si una de las dos medidas se pasa de aquí, se da por caída. Es el mismo
 * límite que el proxy le da a la sesión (`LIMITE_AUTH_MS`): lo que tarde más
 * que eso ya no sirve a quien está esperando delante del móvil.
 */
const LIMITE_MS = 5000

/** Que nadie —ni Vercel, ni el navegador, ni el vigía— sirva una medida vieja. */
const SIN_CACHE = { 'Cache-Control': 'no-store, max-age=0' }

interface Medida {
  ok: boolean
  ms: number
  /** Qué falló, en corto. Ausente cuando salió bien. */
  detalle?: string
}

async function medir(url: string): Promise<Medida> {
  const empezo = Date.now()
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(LIMITE_MS),
      cache: 'no-store',
    })
    return {
      ok: res.ok,
      ms: Date.now() - empezo,
      ...(res.ok ? {} : { detalle: `HTTP ${res.status}` }),
    }
  } catch (err) {
    // El nombre y nada más: un mensaje de error de red puede llevar dentro el
    // host y el trayecto, y esta ruta la puede leer cualquiera.
    return {
      ok: false,
      ms: Date.now() - empezo,
      detalle: err instanceof Error ? err.name : 'fallo',
    }
  }
}

/**
 * Dice si Farpi puede funcionar, y cuánto tarda en saberlo. Pensada para que la
 * mire un vigía externo cada pocos minutos: **200 si todo va, 503 si no**, que
 * es lo único que entienden esos servicios.
 *
 * Mide las dos mitades de Supabase por separado, porque no se caen juntas: el
 * 28-08-2026 fue la de sesión la que dejó de contestar mientras los datos
 * respondían.
 *
 * No lleva dentro ni un dato de nadie, que es lo que la hace publicable: la
 * consulta de datos va con la clave anónima, así que la RLS la deja siempre en
 * cero filas. Cuenta el viaje, no lo que se trae.
 */
export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ estado: 'demo' }, { headers: SIN_CACHE })
  }

  const [auth, datos] = await Promise.all([
    // GoTrue contesta a esto sin tocar la base: aísla el servicio de sesión.
    medir(`${SUPABASE_URL}/auth/v1/health`),
    // Y esto recorre PostgREST, Postgres y la RLS hasta el final. `limit=0` no
    // trae filas: lo que se mide es el trayecto.
    medir(`${SUPABASE_URL}/rest/v1/families?select=id&limit=0`),
  ])

  const ok = auth.ok && datos.ok

  return NextResponse.json(
    { estado: ok ? 'ok' : 'caido', auth, datos },
    { status: ok ? 200 : 503, headers: SIN_CACHE },
  )
}
