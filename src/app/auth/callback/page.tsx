'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeNextPath } from '@/lib/validators'
import { sesionDeInvitacion, type SesionDeInvitacion } from '@/lib/peticiones'
import { Button } from '@/components/ui/Button'

/**
 * Punto de aterrizaje de todos los enlaces de correo de Supabase.
 *
 * Tiene que ser una página de cliente, no un route handler: los enlaces de
 * invitación (`inviteUserByEmail`) devuelven la sesión en el **fragmento** de
 * la URL (`#access_token=…`), y el fragmento nunca llega al servidor. Cuando
 * esto se resolvía en el servidor, la invitación se perdía en silencio: el
 * usuario acababa autenticado pero sin entrar en la familia.
 *
 * Flujos que aterrizan aquí:
 *  - Invitación  → `#access_token=…&type=invite`  (implícito)
 *  - Alta, recuperación de contraseña y Google → `?code=…`  (PKCE)
 *  - Enlace caducado o ya usado → `#error=…&error_code=otp_expired`
 *
 * **La sesión del fragmento no se abre sola** (23-09-2026). Se abría en cuanto
 * llegaba, y unos tokens en una URL los puede escribir cualquiera: un enlace con
 * los de una cuenta ajena dejaba dentro de ella a quien lo abriera, sin que se
 * notara, y lo que subiera después acababa en la familia del que lo preparó. Ahora
 * solo se ofrece en un enlace de invitación y enseñando con qué correo se entra, y
 * hace falta pulsar «Entrar». El detalle, en `sesionDeInvitacion`.
 */
function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<SesionDeInvitacion | null>(null)
  const [entrando, setEntrando] = useState(false)

  /** Lo que se hace ya con la sesión abierta: entrar en la familia y seguir. */
  async function terminar() {
    const supabase = createClient()
    // Flujo de invitación: dar de alta en la familia. La RPC es idempotente,
    // así que repetir el enlace no rompe nada.
    const inviteId = params.get('invite_id')
    if (inviteId) {
      const { error: rpcError } = await supabase.rpc('accept_family_invite', { p_invite_id: inviteId })
      if (rpcError) console.error('[callback] No se pudo aceptar la invitación:', rpcError.message)
    }
    // `next` viene en la URL del correo: solo se acepta si es una ruta de la
    // propia app. Ver `safeNextPath`.
    router.replace(safeNextPath(params.get('next')))
    router.refresh()
  }

  async function entrar() {
    if (!pendiente) return
    setEntrando(true)
    const { data } = await createClient().auth.setSession({
      access_token: pendiente.accessToken,
      refresh_token: pendiente.refreshToken,
    })
    if (!data.session) {
      setPendiente(null)
      setError('No se ha podido iniciar la sesión desde el enlace.')
      return
    }
    await terminar()
  }

  useEffect(() => {
    let cancelado = false

    async function procesar() {
      const hash = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '',
      )

      // Supabase informa de los enlaces caducados o ya usados por el fragmento.
      const errorCode = hash.get('error_code') ?? hash.get('error')
      if (errorCode) {
        if (cancelado) return
        setError(
          errorCode === 'otp_expired'
            ? 'El enlace ha caducado o ya se había usado. Pide uno nuevo para continuar.'
            : hash.get('error_description') ?? 'No se ha podido validar el enlace.',
        )
        return
      }

      const supabase = createClient()

      // `detectSessionInUrl` canjea por su cuenta el `?code=` de PKCE, que es el
      // flujo del cliente; esto solo espera a que termine. El fragmento de una
      // invitación **no** lo abre: con PKCE, supabase-js lo rechaza.
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelado) return
      if (session) {
        await terminar()
        return
      }

      const invitacion = sesionDeInvitacion(window.location.hash, params.get('invite_id'))
      if (invitacion) {
        setPendiente(invitacion)
        return
      }

      setError('No se ha podido iniciar la sesión desde el enlace.')
    }

    void procesar()
    return () => { cancelado = true }
    // `terminar` se lee de este mismo render y solo depende de `params` y
    // `router`, que ya están aquí.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, router])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        {error ? (
          <>
            <p className="text-lg font-extrabold text-ink">No hemos podido abrir el enlace</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{error}</p>
            <a
              href="/auth/login"
              className="mt-5 inline-block rounded-2xl bg-primary-strong px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-deep"
            >
              Ir a iniciar sesión
            </a>
          </>
        ) : pendiente ? (
          <>
            <p className="text-lg font-extrabold text-ink">Vas a entrar en Farpi como</p>
            <p className="mt-2 break-all text-base font-bold text-ink">{pendiente.correo}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Si no es tu correo, no sigas: este enlace es de otra persona.
            </p>
            <Button size="lg" fullWidth className="mt-5" onClick={() => void entrar()} disabled={entrando}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </Button>
            <a
              href="/auth/login"
              className="mt-2 inline-flex min-h-11 items-center justify-center px-4 text-sm font-bold text-primary-strong"
            >
              No soy yo
            </a>
          </>
        ) : (
          <>
            <p className="text-lg font-extrabold text-ink">Entrando en Farpi</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">Validando el enlace…</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackHandler />
    </Suspense>
  )
}
