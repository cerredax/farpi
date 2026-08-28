'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Check, ChevronRight, LogOut, Settings, Users } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useStore } from '@/lib/store-context'
import { memberColor, textColorOn } from '@/lib/assignees'
import { IS_DEMO_MODE, signOut } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'

/**
 * La cuenta de quien mira: su inicial, su nombre y, al pulsar, lo poco que se
 * hace con la cuenta —entrar en Ajustes, cambiar de familia si hay más de una y
 * cerrar sesión—.
 *
 * Sustituye al enlace "Ajustes" que había en el pie de `SideNav` y al final de
 * Inicio. Dos cosas que arregla: la app no decía en ningún sitio con qué cuenta
 * estabas, y cerrar sesión vivía enterrado en la pestaña Cuenta de Ajustes,
 * cuatro toques dentro de una pantalla a la que se entra dos veces al año.
 *
 * Lo que **no** hace es llevarse dentro los ajustes. En Nido, Ajustes no es "mi
 * cuenta": es la casa —familia, personas, comidas, notificaciones, Drive,
 * legal—, cinco pestañas que no caben en un menú, y esconder contenido ya ha
 * salido mal aquí dos veces (el catálogo de las listas, las tareas del día).
 * Así que el menú es una puerta, no un armario: el contenido sigue en
 * `/settings`.
 */
export function AccountMenu({ className = '' }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentMember, members, kids, family, families, activeFamilyId, switchFamily } = useStore()
  const [open, setOpen] = useState(false)

  const nombre = currentMember?.display_name ?? 'Mi cuenta'
  const color = currentMember ? memberColor(members, currentMember.id, kids) : null
  const inicial = nombre.trim().charAt(0).toUpperCase() || '?'
  const enAjustes = pathname === ROUTES.settings || pathname.startsWith(ROUTES.settings + '/')

  async function cerrarSesion() {
    await signOut()
    router.replace('/auth/login')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Con nombre propio y no el del texto que lleva dentro: sin esto la fila
        // se llama "Omar Familia de Omar, Sofía y Ana", y el nombre de la casa
        // lleva dentro los de la familia, que es exactamente lo que se llaman
        // los botones de asignar. Un `getByRole('button', { name: 'Sofía' })`
        // pasaba a encontrar dos cosas.
        aria-label={`Cuenta de ${nombre}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-canvas ${
          enAjustes ? 'bg-primary-tint' : ''
        } ${className}`}
      >
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
            color ? '' : 'bg-surface text-muted'
          }`}
          style={color ? { backgroundColor: color, color: textColorOn(color) } : undefined}
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight text-ink">{nombre}</span>
          <span className="block truncate text-xs font-semibold leading-tight text-muted">{family.name}</span>
        </span>
        <ChevronRight size={16} strokeWidth={2.2} className="flex-shrink-0 text-faint" aria-hidden />
      </button>

      <BottomSheet open={open} title={nombre} onClose={() => setOpen(false)}>
        <div className="space-y-4 px-5 pt-1 pb-8">
          <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
            {/* Un enlace de verdad y no un botón: lleva a otra pantalla, así
                que se puede abrir en otra pestaña y el navegador dice a dónde va. */}
            <Link
              href={ROUTES.settings}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              <Settings size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
              Ajustes
            </Link>
            {/* En demo no hay sesión que cerrar: la app entera funciona sin
                cuenta, así que ofrecerlo llevaría al login desde ningún sitio.
                Es la misma guarda que tenía `AccountActions`, de donde viene. */}
            {!IS_DEMO_MODE && (
              <button
                type="button"
                onClick={cerrarSesion}
                className="flex w-full items-center gap-3 border-t border-hairline px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas"
              >
                <LogOut size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
                Cerrar sesión
              </button>
            )}
          </div>

          {/* Cambiar de familia solo se nombra si hay más de una. Estaba metido
              en Ajustes, y es lo único de esa pantalla que se hace a menudo. */}
          {families.length > 1 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-widest text-muted">
                <Users size={13} strokeWidth={2.2} aria-hidden />
                Cambiar de familia
              </h3>
              <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
                {families.map((f, i) => {
                  const activa = f.id === activeFamilyId
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => { switchFamily(f.id); setOpen(false) }}
                      aria-current={activa ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold transition-colors hover:bg-canvas ${
                        i > 0 ? 'border-t border-hairline' : ''
                      } ${activa ? 'text-primary-strong' : 'text-ink'}`}
                    >
                      <span className="min-w-0 flex-1 truncate">{f.name}</span>
                      {activa && <Check size={16} strokeWidth={2.4} className="flex-shrink-0 text-primary-strong" aria-hidden />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </>
  )
}
