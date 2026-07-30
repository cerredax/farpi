'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Home,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Utensils,
} from 'lucide-react'
import { createClient, IS_DEMO_MODE } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

type AuthMode = 'signin' | 'signup'

const PASSWORD_MIN_LENGTH = 8

const benefits = [
  { icon: CalendarDays, title: 'Agenda', text: 'Citas, planes y recordatorios familiares.' },
  { icon: ListChecks, title: 'Pendientes', text: 'Tareas y listas compartidas sin ruido.' },
  { icon: Utensils, title: 'Comidas', text: 'Menús semanales y compras mejor ordenadas.' },
  { icon: FileText, title: 'Documentos', text: 'Papeles importantes siempre localizados.' },
]

const assurances = ['Gratis', 'Privado', 'Sin anuncios']

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

  return (
    <div className="min-h-dvh bg-[#F7F3EC] text-ink">
      <div className="mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-[minmax(0,1fr)_480px] xl:grid-cols-[minmax(0,1fr)_520px]">
        <section className="flex min-h-[52dvh] flex-col justify-between px-6 py-7 sm:px-10 lg:min-h-dvh lg:px-14 lg:py-12 xl:px-20">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#3D5C3A] text-white shadow-sm">
                <Home size={21} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-lg font-black leading-none tracking-tight">Nido</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Familia en calma</p>
              </div>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              {assurances.map(item => (
                <span key={item} className="rounded-full border border-[#E5DED4] bg-white/70 px-3 py-1 text-xs font-bold text-[#5C6854]">
                  {item}
                </span>
              ))}
            </div>
          </header>

          <div className="py-12 lg:py-0">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#DDEAD9] bg-[#EEF4ED] px-3 py-1.5 text-xs font-bold text-[#4F6A4C]">
                <Heart size={14} fill="currentColor" strokeWidth={2.2} />
                Un espacio privado para tu casa
              </div>
              <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
                Todo lo importante de tu familia, en un solo lugar.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#676159] sm:text-lg">
                Nido reúne comidas, tareas, citas y documentos para que la semana sea más clara y la casa se sienta un poco más ligera.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {benefits.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-start gap-3 rounded-2xl border border-[#E8E1D8] bg-white/75 px-4 py-3 shadow-sm">
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF4ED] text-primary-strong">
                      <Icon size={18} strokeWidth={2.25} />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-ink">{title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">{text}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="hidden items-center gap-2 text-xs font-semibold text-muted lg:flex">
            <ShieldCheck size={15} strokeWidth={2.3} />
            Solo tu familia puede ver sus datos.
          </footer>
        </section>

        <aside className="flex items-center justify-center border-t border-[#E9E2D8] bg-[#FFFCF8] px-6 py-8 lg:border-l lg:border-t-0 lg:px-10">
          <div className="w-full max-w-sm">
            <div className="mb-6">
              <p className="text-2xl font-black tracking-tight text-ink">
                {isSignup ? 'Crea tu cuenta' : 'Entra a Nido'}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {isSignup
                  ? 'Gratis, privado y pensado para el día a día de una familia.'
                  : 'Accede a tu espacio familiar privado.'}
              </p>
            </div>

            {IS_DEMO_MODE ? (
              <div className="rounded-[1.5rem] border border-line bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3 rounded-2xl bg-[#FFF8EF] px-4 py-4">
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

                {isSignup && (
                  <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#DDEAD9] bg-[#EEF4ED] px-4 py-3 text-xs font-bold text-[#4F6A4C]">
                    <CheckCircle2 size={15} strokeWidth={2.4} />
                    Sin tarjeta, sin anuncios y gratis para empezar.
                  </div>
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
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A39B93] transition-colors hover:text-muted"
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
                      <span className="inline-flex items-center gap-2">
                        <Sparkles size={15} />
                        Crear cuenta gratis
                      </span>
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

            <p className="mt-5 text-center text-[11px] font-medium text-[#A39B93]">
              Nido es gratuito y privado para tu familia.
            </p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .form-input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1.5px solid #ede9e3;
          background: #faf7f2;
          padding: 0.8rem 1rem 0.8rem 2.6rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #252525;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms, background 150ms;
        }
        .form-input::placeholder { color: #c4bfb9; }
        .form-input:focus {
          border-color: #8ba888;
          background: #fffdf9;
          box-shadow: 0 0 0 3px rgba(139,168,136,0.18);
        }
      `}</style>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </label>
      {children}
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
        ? 'border-danger-line bg-danger-soft text-[#B24D4D]'
        : 'border-[#DDEAD9] bg-[#EEF4ED] text-primary-strong'
    }`}>
      {children}
    </div>
  )
}
