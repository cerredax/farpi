'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'
import { createClient, IS_DEMO_MODE } from '@/lib/supabase/client'
import { isAuthProviderEnabled } from '@/lib/supabase/auth-providers'
import { LoginHero } from './LoginHero'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

type AuthMode = 'signin' | 'signup'

const PASSWORD_MIN_LENGTH = 8

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (normalized.includes('email not confirmed')) return 'Confirma tu correo desde el enlace que te hemos enviado.'
  if (normalized.includes('password')) return 'La contraseña debe tener al menos 8 caracteres.'
  if (normalized.includes('already registered') || normalized.includes('already exists')) return 'Ese correo ya tiene cuenta. Prueba a entrar directamente.'
  return message
}

export default function LoginPage() {
  const router = useRouter()

  const [authMode, setAuthMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [googleEnabled, setGoogleEnabled] = useState(false)

  // El botón de Google solo aparece si el proveedor está habilitado en Supabase.
  useEffect(() => {
    let active = true
    isAuthProviderEnabled('google').then(enabled => { if (active) setGoogleEnabled(enabled) })
    return () => { active = false }
  }, [])

  const isSignup = authMode === 'signup'
  const passwordIsValid = password.length >= PASSWORD_MIN_LENGTH
  const passwordsMatch = !isSignup || password === confirmPassword
  const formIsValid = email.trim() && passwordIsValid && passwordsMatch && (!isSignup || fullName.trim())

  function switchMode(mode: AuthMode) {
    setAuthMode(mode)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formIsValid) return

    const supabase = createClient()
    const cleanEmail = email.trim().toLowerCase()

    setLoading(true)
    setError(null)
    setNotice(null)

    if (isSignup) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=/home`,
          data: { full_name: fullName.trim() },
        },
      })

      setLoading(false)

      if (signUpError) { setError(authErrorMessage(signUpError.message)); return }
      if (data.session) { router.replace('/home'); router.refresh(); return }

      setNotice('Revisa tu correo. Te hemos enviado un enlace para confirmar la cuenta.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    setLoading(false)

    if (signInError) { setError(authErrorMessage(signInError.message)); return }
    router.replace('/home')
    router.refresh()
  }

  async function handlePasswordReset() {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) { setError('Escribe tu correo primero.'); return }

    const supabase = createClient()
    setLoading(true)
    setError(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${location.origin}/auth/callback?next=/home`,
    })

    setLoading(false)
    if (resetError) { setError(authErrorMessage(resetError.message)); return }
    setNotice('Te hemos enviado un enlace para recuperar la contraseña.')
  }

  async function handleGoogle() {
    setError(null)
    setNotice(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?next=/home` },
    })
    if (oauthError) setError(authErrorMessage(oauthError.message))
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_440px]">
        <LoginHero />

        <aside className="flex items-center justify-center border-t border-line bg-white px-6 py-8 lg:border-l lg:border-t-0 lg:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <p className="text-2xl font-black tracking-tight text-ink">
                {isSignup ? 'Crea tu cuenta' : 'Entra a Farpi'}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {isSignup
                  ? 'Gratis, privado y pensado para el día a día de una familia.'
                  : 'Accede a tu espacio familiar privado.'}
              </p>
            </div>

            {IS_DEMO_MODE ? (
              <div className="rounded-[1.5rem] border border-line bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3 rounded-2xl bg-warm px-4 py-4">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                    <CheckCircle2 size={18} strokeWidth={2.4} />
                  </span>
                  <div>
                    <p className="text-sm font-black text-ink">Modo local activo</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      Configura Supabase para activar cuentas reales, invitaciones y sincronización.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-line bg-white p-5 shadow-[0_12px_45px_rgba(37,37,37,0.08)]">
                <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1">
                  {(['signin', 'signup'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => switchMode(mode)}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                        authMode === mode
                          ? 'bg-white text-ink shadow-sm'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
                    </button>
                  ))}
                </div>

                {googleEnabled && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogle}
                      className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-line bg-white py-3 text-sm font-bold text-ink transition-colors hover:bg-surface"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                        <path fill="#FBBC05" d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
                      </svg>
                      Continuar con Google
                    </button>

                    <div className="mb-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-line" />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-faint">o</span>
                      <div className="h-px flex-1 bg-line" />
                    </div>
                  </>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignup && (
                    <Field label="Tu nombre" htmlFor="full-name">
                      <InputIcon icon={<User size={15} />}>
                        <input
                          id="full-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Nombre y apellido"
                          className="form-input"
                        />
                      </InputIcon>
                    </Field>
                  )}

                  <Field label="Correo electrónico" htmlFor="email">
                    <InputIcon icon={<Mail size={15} />}>
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="form-input"
                      />
                    </InputIcon>
                  </Field>

                  <Field label="Contraseña" htmlFor="password">
                    <InputIcon
                      icon={<Lock size={15} />}
                      after={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-soft transition-colors hover:text-muted"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      }
                    >
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete={isSignup ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="form-input pr-11"
                      />
                    </InputIcon>
                    {password && !passwordIsValid && (
                      <p className="mt-1 text-[11px] font-semibold text-danger">Mínimo 8 caracteres.</p>
                    )}
                  </Field>

                  {isSignup && (
                    <Field label="Repite la contraseña" htmlFor="confirm-password">
                      <InputIcon icon={<Lock size={15} />}>
                        <input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Misma contraseña"
                          className="form-input"
                        />
                      </InputIcon>
                      {confirmPassword && !passwordsMatch && (
                        <p className="mt-1 text-[11px] font-semibold text-danger">Las contraseñas no coinciden.</p>
                      )}
                    </Field>
                  )}

                  {error && <Alert tone="error">{error}</Alert>}
                  {notice && <Alert tone="success">{notice}</Alert>}

                  <Button type="submit" fullWidth size="lg" disabled={loading || !formIsValid}>
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin" />
                        Un momento
                      </span>
                    ) : isSignup ? (
                      'Crear cuenta'
                    ) : (
                      'Entrar'
                    )}
                  </Button>

                  {!isSignup && (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={loading}
                      className="w-full pt-1 text-center text-xs font-semibold text-primary-strong hover:underline disabled:opacity-40"
                    >
                      Recuperar contraseña
                    </button>
                  )}
                </form>
              </div>
            )}

            <p className="mt-5 text-center text-[11px] font-medium text-muted-soft">
              Farpi es gratuito y privado para tu familia.
            </p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .form-input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1.5px solid var(--color-line);
          background: var(--color-canvas);
          padding: 0.8rem 1rem 0.8rem 2.6rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-ink);
          outline: none;
          transition: border-color 150ms, box-shadow 150ms, background 150ms;
        }
        .form-input::placeholder { color: var(--color-faint); }
        .form-input:focus {
          border-color: var(--color-primary);
          background: #fffdf9;
          box-shadow: 0 0 0 3px rgba(139,168,136,0.18);
        }
      `}</style>
    </div>
  )
}

function InputIcon({
  icon,
  after,
  children,
}: {
  icon: React.ReactNode
  after?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">
        {icon}
      </span>
      {children}
      {after}
    </div>
  )
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
      tone === 'error'
        ? 'border-danger-line bg-danger-soft text-danger-strong'
        : 'border-primary-line bg-primary-tint text-primary-strong'
    }`}>
      {children}
    </div>
  )
}
