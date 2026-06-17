'use client'

import { useState } from 'react'
import { StoreProvider } from '@/lib/store-context'
import { readActiveFamilyId, writeActiveFamilyId } from '@/lib/family-config'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [familyId, setFamilyId] = useState<string>(() => readActiveFamilyId())

  function switchFamily(newId: string) {
    writeActiveFamilyId(newId)
    setFamilyId(newId)
    // El key={familyId} en StoreProvider provoca un remount limpio con el nuevo ID
  }

  return (
    // key={familyId} garantiza que StoreProvider se remonta al cambiar de familia,
    // re-ejecutando todos los useState initializers con el nuevo familyId.
    <StoreProvider key={familyId} familyId={familyId} switchFamily={switchFamily}>
      <div className="flex flex-col min-h-dvh bg-[#FAF7F2]">
        <TopBar />
        <main className="flex-1 overflow-y-auto pb-20 pt-14">
          {children}
        </main>
        <BottomNav />
      </div>
    </StoreProvider>
  )
}
