'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Eye,
  EyeOff,
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

const DEMO_USER = 'admin'
const DEMO_PASS = 'admin'
const PASSWORD_MIN_LENGTH = 8

const benefits = [
  { icon: Utensils, title: 'Comidas planificadas', desc: 'Decide que cocinar cada dia sin perder energia.' },
  { icon: ListChecks, title: 'Tareas compartidas', desc: 'Todos en casa saben que toca, sin tener que preguntar.' },
  { icon: CalendarDays, title: 'Agenda familiar', desc: 'Citas, cole, actividades y planes en el mismo sitio.' },
  { icon: ShieldCheck, title: 'Acceso privado', desc: 'Un espacio cuidado para las cosas de vuestra familia.' },
]

function authErrorMessage(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Correo o contrasena incorrectos.'
  if (normalized.includes('email not confirmed')) return 'Antes de entrar, confirma tu correo desde el enlace que te hemos enviado.'
  if (normalized.includes('password')) return 'La contrasena debe tener al menos 8 caracteres.'
  if (normalized.includes('already registered') || normalized.includes('already exists')) return 'Ese correo ya tiene cuenta. Prueba a entrar.'
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

  const [demoUser, setDemoUser] = useState('')
  const [demoPass, setDemoPass] = useState('')
  const [demoError, setDemoError] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)

  const isSignup = authMode === 'signup'
  const passwordIsValid = password.length >= PASSWORD_MIN_LENGTH
  const passwordsMatch = !isSignup || password === confirmPassword
  const formIsValid = email.trim() && passwordIsValid && passwordsMatch && (!isSignup || fullName.trim())

  function switchMode(mode: AuthMode) {
    setAuthMode(mode)
    setError(null)
    setNotice(null)
  }

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDemoError(null)
    setDemoLoading(true)
    await new Promise(r => setTimeout(r, 500))
    if (demoUser.trim() === DEMO_USER && demoPass === DEMO_PASS) {
      router.push('/home')
    } else {
      setDemoError('Usuario o contrasena incorrectos.')
      setDemoLoading(false)
    }
  }

  async function handleRealSubmit(e: React.FormEvent) {
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
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      setLoading(false)

      if (signUpError) {
        setError(authErrorMessage(signUpError.message))
        return
      }

      if (data.session) {
        // TODO: check family_member row; redirect to /onboarding if none
        router.replace('/home')
        router.refresh()
        return
      }

      setNotice('Cuenta creada. Revisa tu correo para confirmar el alta y entrar en Nido.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(authErrorMessage(signInError.message))
      return
    }

    router.replace('/home')
    router.refresh()
  }

  async function handlePasswordReset() {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Escribe tu correo para enviarte el enlace de recuperacion.')
      return
    }

    const supabase = createClient()
    setLoading(true)
    setError(null)
    setNotice(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${location.origin}/auth/callback?next=/home`,
    })

    setLoading(false)

    if (resetError) {
      setError(authErrorMessage(resetError.message))
      return
    }

    setNotice('Te hemos enviado un enlace para recuperar la contrasena.')
  }

  return (
    <div
      className="min-h-dvh"
      style={{
        background:
          'radial-gradient(ellipse at top left, rgba(139,168,136,0.20) 0%, transparent 45%), ' +
          'radial-gradient(ellipse at bottom right, rgba(216,164,143,0.18) 0%, transparent 45%), ' +
          '#FAF7F2',
      }}
    >
      <div className="lg:hidden px-6 pt-12 pb-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white shadow-md text-[#8BA888] mb-5">
          <Home size={30} strokeWidth={2.4} />
        </div>
        <h1 className="text-3xl font-extrabold text-[#252525] leading-snug">Bienvenido a casa</h1>
        <p className="mt-2 text-sm text-[#77716A] leading-relaxed max-w-xs mx-auto">
          Un espacio tranquilo para organizar comidas, tareas, listas y planes familiares.
        </p>
      </div>

      <div className="lg:flex lg:min-h-dvh">
        <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-[#8BA888] relative overflow-hidden p-12 xl:p-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 -right-16 w-[28rem] h-80 rounded-full bg-[#D8A48F]/25 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#FAF7F2]/6 blur-2xl" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                <Home size={23} strokeWidth={2.4} />
              </div>
              <span className="text-white/70 text-xs font-black uppercase tracking-[0.3em]">Nido</span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-5">
              Bienvenido<br />a casa.
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              Una entrada privada para tener la semana de la familia un poco mas en calma.
            </p>
          </div>

          <div className="relative my-10 grid grid-cols-2 gap-3">
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 ring-1 ring-white/10">
                <Icon className="text-white mb-3" size={23} strokeWidth={2.2} />
                <p className="text-sm font-bold text-white leading-tight mb-1">{title}</p>
                <p className="text-xs text-white/65 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="relative">
            <p className="text-white/45 text-xs font-medium">Acceso privado para tu familia.</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 lg:py-12">
          <div className="w-full max-w-sm">
            <div className="hidden lg:block mb-8">
              <p className="text-2xl font-extrabold text-[#252525]">
                {IS_DEMO_MODE ? 'Entrar a Nido' : isSignup ? 'Crear cuenta' : 'Entrar a Nido'}
              </p>
              <p className="mt-1 text-sm text-[#77716A] leading-relaxed">
                {IS_DEMO_MODE
                  ? 'Introduce tus credenciales para acceder al modo local.'
                  : isSignup
                    ? 'Crea tu acceso familiar para empezar a organizar Nido.'
                    : 'Entra con tu correo y contrasena.'}
              </p>
            </div>

            <div className="bg-white rounded-[2rem] border border-[#EDE9E3] shadow-[0_8px_48px_rgba(37,37,37,0.09)] p-7">
              {IS_DEMO_MODE ? (
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="rounded-2xl bg-[#FFF8EF] border border-[#F0EDE8] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#77716A]">Modo local</p>
                    <p className="mt-1 text-sm font-semibold text-[#252525]">
                      Configura Supabase para activar login real y altas.
                    </p>
                  </div>

                  <FieldLabel label="Usuario" htmlFor="demo-user" />
                  <InputWithIcon icon={<User size={15} />}>
                    <input
                      id="demo-user"
                      type="text"
                      required
                      autoComplete="username"
                      value={demoUser}
                      onChange={e => setDemoUser(e.target.value)}
                      placeholder="admin"
                      className="form-input"
                    />
                  </InputWithIcon>

                  <FieldLabel label="Contrasena" htmlFor="demo-pass" />
                  <InputWithIcon icon={<Lock size={15} />}>
                    <input
                      id="demo-pass"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={demoPass}
                      onChange={e => setDemoPass(e.target.value)}
                      placeholder="admin"
                      className="form-input"
                    />
                  </InputWithIcon>

                  {demoError && <AuthAlert tone="error">{demoError}</AuthAlert>}

                  <Button type="submit" fullWidth size="lg" disabled={demoLoading || !demoUser.trim() || !demoPass}>
                    {demoLoading
                      ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Entrando</span>
                      : 'Entrar a ver Nido'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRealSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#F0EDE8] p-1">
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className={`rounded-xl py-2 text-sm font-bold transition-colors ${!isSignup ? 'bg-white text-[#252525] shadow-sm' : 'text-[#77716A]'}`}
                    >
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className={`rounded-xl py-2 text-sm font-bold transition-colors ${isSignup ? 'bg-white text-[#252525] shadow-sm' : 'text-[#77716A]'}`}
                    >
                      Crear cuenta
                    </button>
                  </div>

                  {isSignup && (
                    <div className="space-y-1.5">
                      <FieldLabel label="Tu nombre" htmlFor="full-name" />
                      <InputWithIcon icon={<User size={15} />}>
                        <input
                          id="full-name"
                          type="text"
                          required
                          autoComplete="name"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          placeholder="Omar"
                          className="form-input"
                        />
                      </InputWithIcon>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <FieldLabel label="Correo electronico" htmlFor="email" />
                    <InputWithIcon icon={<Mail size={15} />}>
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
                    </InputWithIcon>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel label="Contrasena" htmlFor="password" />
                    <InputWithIcon
                      icon={<Lock size={15} />}
                      action={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A39B93] hover:text-[#77716A]"
                          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    </InputWithIcon>
                    {password && !passwordIsValid && (
                      <p className="text-[11px] font-semibold text-[#D96C6C]">Minimo 8 caracteres.</p>
                    )}
                  </div>

                  {isSignup && (
                    <div className="space-y-1.5">
                      <FieldLabel label="Repite la contrasena" htmlFor="confirm-password" />
                      <InputWithIcon icon={<Lock size={15} />}>
                        <input
                          id="confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="La misma contrasena"
                          className="form-input"
                        />
                      </InputWithIcon>
                      {confirmPassword && !passwordsMatch && (
                        <p className="text-[11px] font-semibold text-[#D96C6C]">Las contrasenas no coinciden.</p>
                      )}
                    </div>
                  )}

                  {error && <AuthAlert tone="error">{error}</AuthAlert>}
                  {notice && <AuthAlert tone="success">{notice}</AuthAlert>}

                  <Button type="submit" fullWidth size="lg" disabled={loading || !formIsValid}>
                    {loading
                      ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Un momento</span>
                      : isSignup
                        ? <span className="inline-flex items-center gap-2"><Sparkles size={16} />Crear cuenta</span>
                        : 'Entrar'}
                  </Button>

                  {!isSignup && (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={loading}
                      className="w-full text-center text-xs font-semibold text-[#8BA888] hover:underline disabled:opacity-50"
                    >
                      He olvidado mi contrasena
                    </button>
                  )}

                  <p className="text-center text-xs text-[#A39B93] pt-1">
                    Acceso privado para tu familia.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .form-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #ede9e3;
          background: #faf7f2;
          padding: 0.875rem 1rem 0.875rem 2.75rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #252525;
          outline: none;
          transition: box-shadow 150ms, border-color 150ms;
        }
        .form-input::placeholder {
          color: #c4bfb9;
        }
        .form-input:focus {
          border-color: #8ba888;
          box-shadow: 0 0 0 2px rgba(139, 168, 136, 0.35);
        }
      `}</style>
    </div>
  )
}

function FieldLabel({ label, htmlFor }: { label: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-[#252525]">
      {label}
    </label>
  )
}

function InputWithIcon({
  icon,
  action,
  children,
}: {
  icon: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C4BFB9]" aria-hidden="true">
        {icon}
      </span>
      {children}
      {action}
    </div>
  )
}

function AuthAlert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const classes = tone === 'error'
    ? 'border-[#F1C9C9] bg-[#FDE8E8] text-[#B24D4D]'
    : 'border-[#DDEAD9] bg-[#EEF4ED] text-[#5C7A59]'

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${classes}`}>
      {children}
    </div>
  )
}
