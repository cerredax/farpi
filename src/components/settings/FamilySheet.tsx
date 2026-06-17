'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
    <>
      <div className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-[#E0DDD8]" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="font-extrabold text-[#252525] text-base">Nombre de la familia</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#77716A] uppercase tracking-widest">Nombre</label>
            <input ref={inputRef} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Familia García" required className="w-full bg-[#FAF7F2] border border-[#EDE9E3] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#C4BFB9] focus:outline-none focus:ring-2 focus:ring-[#8BA888] transition" />
          </div>
          <Button type="submit" fullWidth size="lg" disabled={!name.trim()}>Guardar</Button>
        </form>
      </div>
    </>
  )
}
