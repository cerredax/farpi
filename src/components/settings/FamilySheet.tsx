'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { Family } from '@/types'

interface FamilySheetProps {
  open: boolean
  family: Family
  onClose: () => void
  onSave: (name: string) => void
}

export function FamilySheet({ open, family, onClose, onSave }: FamilySheetProps) {
  const [name, setName] = useState(family.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim())
    onClose()
  }

  return (
    <BottomSheet open={open} title="Nombre de la familia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 py-4 pb-8 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Familia de Omar, Sofía y Ana"
            required
            className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition"
          />
        </div>
        <Button type="submit" fullWidth size="lg" disabled={!name.trim()}>Guardar</Button>
      </form>
    </BottomSheet>
  )
}
