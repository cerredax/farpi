import { NextResponse } from 'next/server'
import { IS_DEMO_MODE, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/env'

export const runtime = 'nodejs'
// Que no la cachee Next: lo que se sirve de vuelta lo decide `VALIDEZ_MS`, más
// abajo, y no el framework.
export const dynamic = 'force-dynamic'

/**
 * Si una de las dos medidas se pasa de aquí, se da por caída. Es el mismo
 * límite que el proxy le da a la sesión (`LIMITE_AUTH_MS`): lo que tarde más
 * que eso ya no sirve a quien está esperando delante del móvil.
 */
const LIMITE_MS = 5000

/**
 * Cuánto vale una medida antes de volver a medir (03-09-2026).
 *
 * La ruta es pública y sin secreto —lo tiene que ser, la mira un vigía externo que
 * solo entiende de 200 y 503— y cada llamada hacía **dos** peticiones a Supabase.
 * Eso la convertía en un botón gratis para hacerle ruido al proyecto de la familia
 * desde fuera. Con esto, mil llamadas en diez segundos son dos peticiones y no dos
 * mil.
 *
 * Diez segundos porque un vigía pregunta cada uno o cinco minutos, así que nunca ve
 * una medida guardada; y porque cuando se está mirando a mano una caída, diez
 * segundos es lo que se tarda en recargar dos veces y querer que la segunda sea de
 * verdad.
 *
 * Vive en memoria del proceso a propósito: si Vercel levanta otra instancia, mide
 * otra vez, que es el lado bueno del error. No hay nada que invalidar ni que
 * limpiar.
 */
const VALIDEZ_MS = 10_000

let ultima: { cuando: number; cuerpo: Medida[]; ok: boolean } | null = null

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
 * La medida se guarda diez segundos (`VALIDEZ_MS`): un vigía nunca ve una guardada
 * y, siendo pública y sin secreto, deja de ser un botón para hacerle ruido a
 * Supabase desde fuera. Cuando se sirve una, la respuesta lo dice con
 * `medidaDeHace`.
 *
 * No lleva dentro ni un dato de nadie, que es lo que la hace publicable: la
 * consulta de datos va con la clave anónima, así que la RLS la deja siempre en
 * cero filas. Cuenta el viaje, no lo que se trae.
 */
export async function GET() {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ estado: 'demo' }, { headers: SIN_CACHE })
  }

  const ahora = Date.now()
  if (ultima && ahora - ultima.cuando < VALIDEZ_MS) {
    const [auth, datos] = ultima.cuerpo
    return NextResponse.json(
      { estado: ultima.ok ? 'ok' : 'caido', auth, datos, medidaDeHace: ahora - ultima.cuando },
      { status: ultima.ok ? 200 : 503, headers: SIN_CACHE },
    )
  }

  const [auth, datos] = await Promise.all([
    // GoTrue contesta a esto sin tocar la base: aísla el servicio de sesión.
    medir(`${SUPABASE_URL}/auth/v1/health`),
    // Y esto recorre PostgREST, Postgres y la RLS hasta el final. `limit=0` no
    // trae filas: lo que se mide es el trayecto.
    medir(`${SUPABASE_URL}/rest/v1/families?select=id&limit=0`),
  ])

  const ok = auth.ok && datos.ok
  ultima = { cuando: Date.now(), cuerpo: [auth, datos], ok }

  return NextResponse.json(
    { estado: ok ? 'ok' : 'caido', auth, datos },
    { status: ok ? 200 : 503, headers: SIN_CACHE },
  )
}
