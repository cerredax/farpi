'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
 */
function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)

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

      // `detectSessionInUrl` resuelve por su cuenta tanto el fragmento como el
      // `?code=`; esto solo espera a que termine y confirma el resultado.
      let { data: { session } } = await supabase.auth.getSession()

      // Red de seguridad por si la detección automática no llegó a aplicarse.
      if (!session) {
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        if (accessToken && refreshToken) {
          const { data } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          session = data.session
        }
      }

      if (!session) {
        if (cancelado) return
        setError('No se ha podido iniciar la sesión desde el enlace.')
        return
      }

      // Flujo de invitación: dar de alta en la familia. La RPC es idempotente,
      // así que repetir el enlace no rompe nada.
      const inviteId = params.get('invite_id')
      if (inviteId) {
        const { error: rpcError } = await supabase.rpc('accept_family_invite', { p_invite_id: inviteId })
        if (rpcError) console.error('[callback] No se pudo aceptar la invitación:', rpcError.message)
      }

      if (cancelado) return
      router.replace(params.get('next') ?? '/home')
      router.refresh()
    }

    void procesar()
    return () => { cancelado = true }
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
              className="mt-5 inline-block rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Ir a iniciar sesión
            </a>
          </>
        ) : (
          <>
            <p className="text-lg font-extrabold text-ink">Entrando en Nido</p>
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
