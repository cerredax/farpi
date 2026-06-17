'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { useStore } from '@/lib/store-context'

const titles: Record<string, string> = {
  '/calendar': 'Calendario',
  '/tasks':    'Tareas',
  '/lists':    'Listas',
  '/meals':    'Comidas',
  '/docs':     'Documentos',
  '/settings': 'Ajustes',
}

export function TopBar() {
  const pathname = usePathname()
  const base = '/' + pathname.split('/')[1]
  const title = titles[base]
  const isHome = base === '/home'
  const { family } = useStore()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF7F2] border-b border-[#EDE9E3]">
      <div className="flex items-center justify-between h-14 max-w-lg mx-auto px-4">
        {isHome ? (
          <div className="flex flex-col">
            <span className="text-[#8BA888] font-extrabold tracking-tight text-lg leading-tight">Nido</span>
            <span className="text-[10px] font-semibold text-[#77716A] leading-none">{family.name}</span>
          </div>
        ) : (
          <span className="font-extrabold tracking-tight text-[#252525] text-lg">{title ?? 'Nido'}</span>
        )}
        <Link
          href="/settings"
          className="p-2 rounded-full text-[#77716A] hover:text-[#252525] hover:bg-[#EDE9E3] transition-colors"
          aria-label="Ajustes"
        >
          <Settings size={20} strokeWidth={1.8} />
        </Link>
      </div>
    </header>
  )
}
