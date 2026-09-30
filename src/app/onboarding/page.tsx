'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { writeActiveFamilyId } from '@/lib/family-config'
import { supabaseRepos } from '@/lib/supabase-repos'
import { useT } from '@/lib/i18n/contexto'

export default function OnboardingPage() {
  const router = useRouter()
  const t = useT().acceso.onboarding
  const [familyName, setFamilyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabaseRepos.family.getFamilies().then(families => {
      if (families.length > 0) router.replace('/home')
    }).catch(() => { /* si falla, dejamos al usuario crear familia */ })
  }, [router])

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
      setError(err instanceof Error ? err.message : t.errorAlCrear)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-canvas px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-sm flex-col justify-center">
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary-deepest text-white shadow-sm">
            <Home size={25} strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">{t.titulo}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t.explicacion}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[1.75rem] border border-line bg-white p-6 shadow-sm">
          <div className="space-y-1.5">
            <label htmlFor="family-name" className="text-xs font-bold uppercase tracking-widest text-muted">
              {t.nombreDeLaFamilia}
            </label>
            <input
              id="family-name"
              autoFocus
              type="text"
              required
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder={t.placeholder}
              className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-sm font-medium text-ink outline-none transition focus:border-primary-strong focus:ring-2 focus:ring-primary-strong/40"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-danger-line bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
              {error}
            </div>
          )}

          <div className="mt-5">
            <Button type="submit" fullWidth size="lg" disabled={loading || !familyName.trim()}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  {t.creando}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={15} />
                  {t.crearMiFamilia}
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
