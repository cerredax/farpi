import { LoginForm, type AuthMode } from './LoginForm'

/**
 * El formulario es cliente; esta página no, solo para poder mirar la URL antes
 * de pintarlo. El botón "Crear cuenta" de la página de inicio pública llega con
 * `?modo=registro`, y así abre ya en el formulario de registro en vez de
 * hacerlo en el de entrar y obligar a cambiar de pestaña.
 *
 * Se hace aquí y no dentro con `useSearchParams` porque eso pediría un
 * `Suspense` alrededor de toda la pantalla; y no con un efecto, porque el modo
 * llegaría después del primer pintado y se vería el salto.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>
}) {
  const { modo } = await searchParams
  const modoInicial: AuthMode = modo === 'registro' ? 'signup' : 'signin'

  return <LoginForm modoInicial={modoInicial} />
}
