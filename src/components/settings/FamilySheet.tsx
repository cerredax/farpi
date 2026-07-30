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
          <label htmlFor="family-name" className="field-label">Nombre</label>
          <input
            id="family-name"
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Familia de Omar, Sofía y Ana"
            required
            className="field-input"
          />
        </div>
        <Button type="submit" fullWidth size="lg" disabled={!name.trim()}>Guardar</Button>
      </form>
    </BottomSheet>
  )
}
