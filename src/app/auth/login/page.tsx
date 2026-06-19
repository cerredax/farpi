'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Eye,
  EyeOff,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  Utensils,
  FileText,
} from 'lucide-react'
import { createClient, IS_DEMO_MODE } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

type AuthMode = 'signin' | 'signup'

const PASSWORD_MIN_LENGTH = 8

const benefits = [
  {
    icon: Utensils,
    title: 'Comidas de la semana',
    desc: 'Planifica desayunos, comidas y cenas sin improvisar cada dia.',
  },
  {
    icon: ListChecks,
    title: 'Tareas de casa',
    desc: 'Compras, recados y pendientes compartidos con toda la familia.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda familiar',
    desc: 'Citas medicas, cole, actividades y planes, todos en el mismo sitio.',
  },
  {
    icon: FileText,
    title: 'Documentos importantes',
    desc: 'Cartillas, seguros y papeles del colegio siempre a mano.',
  },
]

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Correo o contrasena incorrectos.'
  if (normalized.includes('email not confirmed')) return 'Confirma tu correo desde el enlace que te hemos enviado.'
  if (normalized.includes('password')) return 'La contrasena debe tener al menos 8 caracteres.'
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

      setNotice('Revisa tu correo — te hemos enviado un enlace para confirmar la cuenta.')
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
    setNotice('Te hemos enviado un enlace para recuperar la contrasena.')
  }

  return (
    <div className="min-h-dvh bg-[#FAF7F2]">
      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px]">

        {/* ── Columna izquierda ── */}
        <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#3D5C3A] px-14 py-14 xl:px-20">
          {/* Decoración de fondo */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-[#8BA888]/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-80 w-96 rounded-full bg-[#D8A48F]/15 blur-3xl" />
            <div className="absolute top-1/2 left-1/3 h-48 w-48 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />
          </div>

          {/* Logo */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <span className="text-lg font-black text-white">N</span>
              </div>
              <span className="text-sm font-black uppercase tracking-[0.25em] text-white/60">Nido</span>
            </div>
          </div>

          {/* Titular principal */}
          <div className="relative">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-[#A8D4A5]" />
              <span className="text-xs font-bold text-white/80">Completamente gratuita</span>
            </div>

            <h1 className="text-5xl xl:text-[3.5rem] font-extrabold leading-[1.08] text-white">
              El orden de casa,<br />sin el caos de casa.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-white/60 max-w-md">
              Nido es el espacio privado de tu familia para organizarlo todo — comidas, tareas, citas y documentos — sin grupitos de WhatsApp ni notas perdidas.
            </p>

            {/* Beneficios */}
            <div className="mt-10 grid grid-cols-2 gap-3">
              {benefits.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
                    <Icon size={16} className="text-white" strokeWidth={2.2} />
                  </div>
                  <p className="text-sm font-bold text-white leading-snug mb-1">{title}</p>
                  <p className="text-xs text-white/55 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pie */}
          <div className="relative">
            <p className="text-xs text-white/35">Acceso privado · Solo tu familia puede ver tus datos.</p>
          </div>
        </div>

        {/* ── Columna derecha (formulario) ── */}
        <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 lg:min-h-0 lg:px-10">

          {/* Cabecera móvil */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#3D5C3A]">
              <span className="text-xl font-black text-white">N</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#252525]">Bienvenido a Nido</h1>
            <p className="mt-1.5 text-sm text-[#77716A]">La app gratuita de tu familia</p>
          </div>

          <div className="w-full max-w-sm">
            {/* Cabecera desktop */}
            <div className="mb-7 hidden lg:block">
              <h2 className="text-2xl font-extrabold text-[#252525]">
                {isSignup ? 'Crear cuenta' : 'Bienvenido de nuevo'}
              </h2>
              <p className="mt-1.5 text-sm text-[#77716A]">
                {isSignup
                  ? 'Gratis para siempre. Sin tarjetas, sin suscripciones.'
                  : 'Entra con tu correo y contrasena.'}
              </p>
            </div>

            {IS_DEMO_MODE ? (
              <div className="rounded-[1.75rem] border border-[#EDE9E3] bg-white p-6 shadow-sm">
                <div className="rounded-2xl bg-[#FFF8EF] border border-[#F0EDE8] px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#77716A] mb-1">Modo local</p>
                  <p className="text-sm text-[#252525] leading-relaxed">
                    Configura las variables de entorno de Supabase para activar el acceso real.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-[#EDE9E3] bg-white p-6 shadow-[0_4px_32px_rgba(37,37,37,0.08)]">

                {/* Selector Entrar / Crear cuenta */}
                <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-[#F0EDE8] p-1">
                  {(['signin', 'signup'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => switchMode(mode)}
                      className={`rounded-xl py-2.5 text-sm font-bold transition-all ${
                        authMode === mode
                          ? 'bg-white text-[#252525] shadow-sm'
                          : 'text-[#77716A] hover:text-[#252525]'
                      }`}
                    >
                      {mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
                    </button>
                  ))}
                </div>

                {/* Pill gratuita — solo en signup */}
                {isSignup && (
                  <div className="mb-4 flex items-center justify-center gap-1.5 rounded-2xl bg-[#EEF4ED] border border-[#DDEAD9] py-2.5 px-4">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5C7A59]" />
                    <p className="text-xs font-bold text-[#5C7A59]">Gratuita · Sin tarjeta · Sin suscripcion</p>
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

                  <Field label="Correo electronico" htmlFor="email">
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

                  <Field label="Contrasena" htmlFor="password">
                    <InputIcon
                      icon={<Lock size={15} />}
                      after={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A39B93] hover:text-[#77716A]"
                          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
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
                        placeholder="Minimo 8 caracteres"
                        className="form-input pr-11"
                      />
                    </InputIcon>
                    {password && !passwordIsValid && (
                      <p className="mt-1 text-[11px] font-semibold text-[#D96C6C]">Minimo 8 caracteres.</p>
                    )}
                  </Field>

                  {isSignup && (
                    <Field label="Repite la contrasena" htmlFor="confirm-password">
                      <InputIcon icon={<Lock size={15} />}>
                        <input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Misma contrasena"
                          className="form-input"
                        />
                      </InputIcon>
                      {confirmPassword && !passwordsMatch && (
                        <p className="mt-1 text-[11px] font-semibold text-[#D96C6C]">Las contrasenas no coinciden.</p>
                      )}
                    </Field>
                  )}

                  {error  && <Alert tone="error">{error}</Alert>}
                  {notice && <Alert tone="success">{notice}</Alert>}

                  <Button type="submit" fullWidth size="lg" disabled={loading || !formIsValid}>
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 size={15} className="animate-spin" />
                        Un momento…
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
                      className="w-full pt-1 text-center text-xs font-semibold text-[#8BA888] hover:underline disabled:opacity-40"
                    >
                      He olvidado mi contrasena
                    </button>
                  )}
                </form>
              </div>
            )}

            <p className="mt-5 text-center text-[11px] text-[#B8B3AC]">
              Acceso privado · Solo tu familia ve tus datos
            </p>
          </div>
        </div>
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
          transition: border-color 150ms, box-shadow 150ms;
        }
        .form-input::placeholder { color: #c4bfb9; }
        .form-input:focus {
          border-color: #8ba888;
          box-shadow: 0 0 0 3px rgba(139,168,136,0.18);
        }
      `}</style>
    </div>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-widest text-[#77716A]">
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
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4BFB9]">
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
        ? 'border-[#F1C9C9] bg-[#FDE8E8] text-[#B24D4D]'
        : 'border-[#DDEAD9] bg-[#EEF4ED] text-[#5C7A59]'
    }`}>
      {children}
    </div>
  )
}
