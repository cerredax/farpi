'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, ClipboardList, CheckSquare, UtensilsCrossed, FolderOpen } from 'lucide-react'
import { ROUTES } from '@/lib/constants'

const navItems = [
  { href: ROUTES.home,     label: 'Inicio',     icon: Home },
  { href: ROUTES.calendar, label: 'Calendario', icon: Calendar },
  { href: ROUTES.tasks,    label: 'Tareas',     icon: ClipboardList },
  { href: ROUTES.lists,    label: 'Listas',     icon: CheckSquare },
  { href: ROUTES.meals,    label: 'Comidas',    icon: UtensilsCrossed },
  { href: ROUTES.docs,     label: 'Docs',       icon: FolderOpen },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#EDE9E3] safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-xl transition-colors min-w-0 ${
                active
                  ? 'text-[#8BA888]'
                  : 'text-[#77716A] hover:text-[#252525]'
              }`}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? 'drop-shadow-sm' : ''}
              />
              <span className={`text-[10px] font-semibold leading-none truncate ${active ? 'text-[#8BA888]' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
