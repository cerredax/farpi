import { AuthCard, type AuthMode } from '@/components/auth/AuthCard'
import { LoginHero } from './LoginHero'

export type { AuthMode }

/**
 * La pantalla de login: presentación a la izquierda y la tarjeta de acceso a la
 * derecha.
 *
 * Aquí ya no hay lógica de autenticación. Estuvo en este archivo hasta el
 * 01-09-2026, cuando la portada pública pasó a enseñar el mismo formulario y se
 * llevó todo a `components/auth/AuthCard.tsx`. Lo que queda es la maqueta, que
 * es lo único que esta pantalla tiene de propio.
 *
 * Sigue existiendo aunque la portada ya no la enlace: es donde aterrizan las
 * invitaciones por correo, la confirmación de la cuenta y los enlaces de
 * recuperar contraseña, y `?modo=registro` la abre en la pestaña de registro.
 */
export function LoginForm({ modoInicial }: { modoInicial: AuthMode }) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <LoginHero />

        <aside className="flex items-center justify-center border-t border-line bg-white px-6 py-8 lg:border-l lg:border-t-0 lg:px-10">
          <div className="w-full max-w-sm">
            <AuthCard modoInicial={modoInicial} />
          </div>
        </aside>
      </div>
    </div>
  )
}
