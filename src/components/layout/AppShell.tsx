'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StoreProvider } from '@/lib/store-context'
import { readActiveFamilyId, writeActiveFamilyId } from '@/lib/family-config'
import { IS_DEMO_MODE } from '@/lib/supabase/client'
import { supabaseRepos } from '@/lib/supabase-repos'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { SaveStatus } from './SaveStatus'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [familyId, setFamilyId] = useState<string>(() => readActiveFamilyId())
  const [isResolvingFamily, setIsResolvingFamily] = useState(!IS_DEMO_MODE)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (IS_DEMO_MODE) return

    let cancelled = false

    async function resolveFamily() {
      setIsResolvingFamily(true)
      setResolveError(null)
      try {
        const families = await supabaseRepos.family.getFamilies()
        if (cancelled) return

        if (families.length === 0) {
          router.replace('/onboarding')
          return
        }

        const stored = readActiveFamilyId()
        const nextFamilyId = families.some(family => family.id === stored)
          ? stored
          : families[0].id

        writeActiveFamilyId(nextFamilyId)
        setFamilyId(nextFamilyId)
        setIsResolvingFamily(false)
      } catch (err) {
        if (cancelled) return
        setResolveError(err instanceof Error ? err.message : 'No se pudo resolver la familia activa')
        setIsResolvingFamily(false)
      }
    }

    void resolveFamily()

    return () => {
      cancelled = true
    }
  }, [router])

  function switchFamily(newId: string) {
    writeActiveFamilyId(newId)
    setFamilyId(newId)
    // El key={familyId} en StoreProvider provoca un remount limpio con el nuevo ID
  }

  if (isResolvingFamily) {
    return <ShellMessage title="Cargando Nido" description="Buscando tu familia..." />
  }

  if (resolveError) {
    return <ShellMessage title="No se pudo cargar Nido" description={resolveError} />
  }

  return (
    // key={familyId} garantiza que StoreProvider se remonta al cambiar de familia,
    // re-ejecutando todos los useState initializers con el nuevo familyId.
    <StoreProvider key={familyId} familyId={familyId} switchFamily={switchFamily}>
      <div className="flex flex-col min-h-dvh bg-canvas">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 pt-14">
          {children}
        </main>
        <SaveStatus />
        <BottomNav />
      </div>
    </StoreProvider>
  )
}

function ShellMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="text-lg font-extrabold text-ink">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  )
}
