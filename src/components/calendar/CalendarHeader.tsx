'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { capitalize } from '@/lib/text'

interface CalendarHeaderProps {
  currentMonth: Date
  onPrev: () => void
  onNext: () => void
}

export function CalendarHeader({ currentMonth, onPrev, onNext }: CalendarHeaderProps) {
  const label = capitalize(format(currentMonth, 'MMMM yyyy', { locale: es }))

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={onPrev}
        aria-label="Mes anterior"
        className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:bg-line active:bg-grip transition-colors"
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>

      <h2 className="text-base font-extrabold text-ink tracking-tight">
        {label}
      </h2>

      <button
        onClick={onNext}
        aria-label="Mes siguiente"
        className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:bg-line active:bg-grip transition-colors"
      >
        <ChevronRight size={20} strokeWidth={2} />
      </button>
    </div>
  )
}
