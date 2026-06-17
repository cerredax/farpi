'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, IS_DEMO_MODE } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/home` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-[#FAF7F2] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <span className="text-5xl">🏠</span>
          <h1 className="mt-3 text-3xl font-extrabold text-[#252525]">Nido</h1>
          <p className="mt-1 text-sm text-[#77716A]">Tu espacio familiar privado</p>
        </div>

        {IS_DEMO_MODE ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8] space-y-4 text-center">
            <span className="text-3xl">🔓</span>
            <p className="font-bold text-[#252525]">Modo demo</p>
            <p className="text-sm text-[#77716A]">
              La app funciona sin servidor. Los datos se guardan localmente en este dispositivo.
            </p>
            <Button fullWidth size="lg" onClick={() => router.push('/home')}>
              Entrar en modo demo
            </Button>
          </div>
        ) : sent ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8] text-center space-y-3">
            <span className="text-3xl">📬</span>
            <p className="font-bold text-[#252525]">Revisa tu correo</p>
            <p className="text-sm text-[#77716A]">
              Hemos enviado un enlace de acceso a <strong>{email}</strong>.
              No necesitas contraseña.
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-sm border border-[#F0EDE8] space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-[#252525]">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-[#EDE9E3] bg-[#FAF7F2] text-[#252525] placeholder:text-[#B8B3AC] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
              />
            </div>
            {error && (
              <p className="text-xs text-[#D96C6C] font-semibold">{error}</p>
            )}
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'Enviando…' : 'Acceder con email'}
            </Button>
            <p className="text-center text-xs text-[#77716A]">
              Sin contraseña. Te enviamos un enlace de acceso.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
