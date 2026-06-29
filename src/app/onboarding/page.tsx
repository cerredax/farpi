'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { writeActiveFamilyId } from '@/lib/family-config'
import { supabaseRepos } from '@/lib/supabase-repos'

export default function OnboardingPage() {
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanName = familyName.trim()
    if (!cleanName) return

    setLoading(true)
    setError(null)

    try {
      const family = await supabaseRepos.family.createFamily(cleanName)
      writeActiveFamilyId(family.id)
      router.replace('/home')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la familia')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#FAF7F2] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-sm flex-col justify-center">
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#3D5C3A] text-white shadow-sm">
            <Home size={25} strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-extrabold text-[#252525]">Configura tu familia</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#77716A]">
            Crea el espacio privado de tu casa. Si te han invitado, entra desde el enlace del email para unirte directamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-[#EDE9E3] bg-white p-6 shadow-sm">
          <div className="space-y-1.5">
            <label htmlFor="family-name" className="text-xs font-bold uppercase tracking-widest text-[#77716A]">
              Nombre de la familia
            </label>
            <input
              id="family-name"
              autoFocus
              type="text"
              required
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder="Ej: Familia Garcia"
              className="w-full rounded-xl border border-[#EDE9E3] bg-[#FAF7F2] px-3 py-3 text-sm font-medium text-[#252525] outline-none transition focus:border-[#8BA888] focus:ring-2 focus:ring-[#8BA888]/25"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-[#F1C9C9] bg-[#FDE8E8] px-4 py-3 text-sm font-medium text-[#B24D4D]">
              {error}
            </div>
          )}

          <div className="mt-5">
            <Button type="submit" fullWidth size="lg" disabled={loading || !familyName.trim()}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Creando
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={15} />
                  Crear mi familia
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
