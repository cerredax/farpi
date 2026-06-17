'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, Mail, User } from 'lucide-react'
import { createClient, IS_DEMO_MODE } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

const DEMO_USER = 'admin'
const DEMO_PASS = 'admin'

const benefits = [
  { emoji: '🍽️', title: 'Comidas planificadas',  desc: 'Decide qué cocinar cada día sin perder tiempo ni energía.' },
  { emoji: '✅',  title: 'Tareas compartidas',    desc: 'Todos en casa saben qué toca, sin tener que preguntar.' },
  { emoji: '📅',  title: 'Agenda familiar',       desc: 'Citas, cole, actividades y planes todos en un mismo sitio.' },
  { emoji: '🛒',  title: 'Listas siempre a mano', desc: 'Añade, tacha y comparte la lista de la compra al instante.' },
]

export default function LoginPage() {
  const router = useRouter()

  // Demo state
  const [demoUser,    setDemoUser]    = useState('')
  const [demoPass,    setDemoPass]    = useState('')
  const [demoError,   setDemoError]   = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState(false)

  // Real auth state
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    setDemoError(null)
    setDemoLoading(true)
    await new Promise(r => setTimeout(r, 600))
    if (demoUser.trim() === DEMO_USER && demoPass === DEMO_PASS) {
      router.push('/home')
    } else {
      setDemoError('Usuario o contraseña incorrectos.')
      setDemoLoading(false)
    }
  }

  async function sendMagicLink(targetEmail: string) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { emailRedirectTo: `${location.origin}/home` },
    })
    if (error) { setError(error.message); setSent(false); return }
    setSent(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = email.trim()
    if (!t) return
    setLoading(true)
    setError(null)
    await sendMagicLink(t)
    setLoading(false)
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
      {/* ── Mobile header ─────────────────────────────────── */}
      <div className="lg:hidden px-6 pt-12 pb-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white shadow-md text-3xl mb-5">
          🏠
        </div>
        <h1 className="text-3xl font-extrabold text-[#252525] leading-snug">
          Bienvenido a casa
        </h1>
        <p className="mt-2 text-sm text-[#77716A] leading-relaxed max-w-xs mx-auto">
          Un espacio tranquilo para organizar comidas, tareas, listas y planes familiares.
        </p>
      </div>

      <div className="lg:flex lg:min-h-dvh">

        {/* ── Left column (desktop only) ─────────────────── */}
        <div className="hidden lg:flex lg:w-[52%] flex-col justify-between bg-[#8BA888] relative overflow-hidden p-12 xl:p-16">
          {/* Ambient blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 -right-16 w-[28rem] h-80 rounded-full bg-[#D8A48F]/25 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-[#FAF7F2]/6 blur-2xl" />
          </div>

          {/* Top: brand */}
          <div className="relative">
            <div className="flex items-center gap-3 mb-12">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-xl backdrop-blur-sm">
                🏠
              </div>
              <span className="text-white/70 text-xs font-black uppercase tracking-[0.3em]">Nido</span>
            </div>

            <h1 className="text-5xl xl:text-6xl font-extrabold text-white leading-[1.1] mb-5">
              Bienvenido<br />a casa.
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              Un espacio tranquilo para organizar comidas, tareas, listas y planes familiares.
            </p>
          </div>

          {/* Mid: benefit cards */}
          <div className="relative my-10 grid grid-cols-2 gap-3">
            {benefits.map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 ring-1 ring-white/10">
                <span className="text-2xl mb-2 block">{emoji}</span>
                <p className="text-sm font-bold text-white leading-tight mb-1">{title}</p>
                <p className="text-xs text-white/65 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Bottom: trust line */}
          <div className="relative">
            <p className="text-white/45 text-xs font-medium">Acceso privado para tu familia. ❤️</p>
          </div>
        </div>

        {/* ── Right column: form ─────────────────────────── */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 lg:py-12">
          <div className="w-full max-w-sm">

            {/* Desktop subtitle (hidden on mobile, mobile has its own header) */}
            <div className="hidden lg:block mb-8">
              <p className="text-2xl font-extrabold text-[#252525]">Entrar a Nido</p>
              <p className="mt-1 text-sm text-[#77716A] leading-relaxed">
                {IS_DEMO_MODE
                  ? 'Introduce tus credenciales para acceder.'
                  : 'Te mandaremos un enlace seguro para entrar sin contraseña.'}
              </p>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-[2rem] border border-[#EDE9E3] shadow-[0_8px_48px_rgba(37,37,37,0.09)] p-7">
              {IS_DEMO_MODE ? (
                /* ── Demo mode: user + password ── */
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="demo-user" className="text-sm font-semibold text-[#252525]">
                      Usuario
                    </label>
                    <div className="relative">
                      <User size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C4BFB9]" />
                      <input
                        id="demo-user"
                        type="text"
                        required
                        autoComplete="username"
                        value={demoUser}
                        onChange={e => setDemoUser(e.target.value)}
                        placeholder="admin"
                        className="w-full rounded-2xl border border-[#EDE9E3] bg-[#FAF7F2] py-3.5 pl-11 pr-4 text-sm font-medium text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="demo-pass" className="text-sm font-semibold text-[#252525]">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C4BFB9]" />
                      <input
                        id="demo-pass"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={demoPass}
                        onChange={e => setDemoPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-[#EDE9E3] bg-[#FAF7F2] py-3.5 pl-11 pr-4 text-sm font-medium text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
                      />
                    </div>
                  </div>

                  {demoError && (
                    <div className="rounded-2xl border border-[#F1C9C9] bg-[#FDE8E8] px-4 py-3 text-sm font-medium text-[#B24D4D]">
                      {demoError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={demoLoading || !demoUser.trim() || !demoPass}
                  >
                    {demoLoading
                      ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Entrando…</span>
                      : 'Entrar a ver Nido'}
                  </Button>

                  <p className="text-center text-xs text-[#A39B93] pt-1">
                    Acceso privado para tu familia. 🏠
                  </p>
                </form>

              ) : sent ? (
                /* ── Email sent ── */
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4ED] text-2xl mb-3">
                      📬
                    </div>
                    <p className="font-bold text-[#252525]">Revisa tu correo</p>
                    <p className="text-sm text-[#77716A] mt-1.5 leading-relaxed">
                      Hemos enviado un enlace a{' '}
                      <strong className="text-[#252525]">{email}</strong>.
                      Úsalo para entrar directamente, sin contraseña.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-[#F1C9C9] bg-[#FDE8E8] px-4 py-3 text-sm font-medium text-[#B24D4D]">
                      {error}
                    </div>
                  )}

                  <Button
                    fullWidth
                    size="lg"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true)
                      setError(null)
                      await sendMagicLink(email.trim())
                      setLoading(false)
                    }}
                  >
                    {loading
                      ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Reenviando</span>
                      : 'Reenviar enlace'}
                  </Button>
                </div>

              ) : (
                /* ── Magic link form ── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-semibold text-[#252525]">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C4BFB9]" />
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full rounded-2xl border border-[#EDE9E3] bg-[#FAF7F2] py-3.5 pl-11 pr-4 text-sm font-medium text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-[#F1C9C9] bg-[#FDE8E8] px-4 py-3 text-sm font-medium text-[#B24D4D]">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={loading || !email.trim()}
                  >
                    {loading
                      ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Enviando</span>
                      : 'Enviar enlace mágico ✨'}
                  </Button>

                  <p className="text-center text-xs text-[#A39B93] pt-1">
                    Te mandaremos un enlace seguro para entrar sin contraseña.
                  </p>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-[#C4BFB9] mt-5">
              Acceso privado para tu familia. ❤️
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
