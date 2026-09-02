'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { useStore } from '@/lib/store-context'
import { memberColor, textColorOn } from '@/lib/assignees'
import { IS_DEMO_MODE, signOut } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'

/**
 * El pie de `SideNav` en escritorio: quién eres, Ajustes y cerrar sesión.
 *
 * La fila con la inicial y el nombre está porque la app no decía en ninguna
 * pantalla con qué cuenta estabas. Es solo eso, un letrero: no abre nada.
 *
 * Debajo, las dos cosas que hay que poder hacer desde cualquier pantalla, cada
 * una en su fila y a un clic. Antes esta misma fila era un botón que abría un
 * sheet con las cinco secciones de Ajustes dentro, y duró un día: en una
 * columna que tiene sitio de sobra no hay nada que esconder, y el menú metía un
 * paso —y un armario que abrir— entre la persona y las dos únicas cosas que
 * buscaba. Es exactamente lo que ya se decidió en móvil, donde "Más"
 * (`MoreMenu`) enseña Ajustes como una fila y no sus cinco secciones sueltas.
 *
 * Ajustes lleva a `/settings` a secas, que abre en Familia (`pestañaDesdeUrl`):
 * elegir pestaña es cosa de las pestañas de `SettingsView`, no de la
 * navegación. Y se marca activa como los demás enlaces de la columna, porque
 * eso es lo que es: otra pantalla de la app, aunque viva en el pie.
 *
 * Cerrar sesión va aparte, bajo una línea: no es otro sitio al que ir, es salir.
 *
 * Aquí no se nombra la familia. Estuvo un rato bajo el nombre de la persona y
 * confundía las dos cosas —quién eres y en qué casa estás—; el nombre de la casa
 * se dice en Ajustes → Familia, que es donde se cambia.
 */
export function AccountFooter() {
  const { currentMember, members, kids } = useStore()
  const pathname = usePathname()

  const nombre = currentMember?.display_name ?? 'Mi cuenta'
  const color = currentMember ? memberColor(members, currentMember.id, kids) : null
  const inicial = nombre.trim().charAt(0).toUpperCase() || '?'

  const enAjustes = pathname === ROUTES.settings || pathname.startsWith(ROUTES.settings + '/')

  async function cerrarSesion() {
    await signOut()
    // A la portada y no al login: quien sale de casa no está intentando entrar.
    // Al login se llega desde una invitación o un correo de recuperación, no al
    // terminar. Sin `router.replace`: recargar de verdad tira además el estado
    // que quedara en memoria.
    window.location.href = '/'
  }

  return (
    <div className="space-y-1">
      {/* El letrero de la cuenta. Mismo alto y mismos márgenes que las filas de
          abajo para que la columna no dé un salto, pero sin `hover` ni foco:
          no es un control. */}
      <div className="flex min-h-11 items-center gap-3 px-3 py-2.5">
        <span
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
            color ? '' : 'bg-surface text-muted'
          }`}
          style={color ? { backgroundColor: color, color: textColorOn(color) } : undefined}
        >
          {inicial}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{nombre}</span>
      </div>

      <Link
        href={ROUTES.settings}
        aria-current={enAjustes ? 'page' : undefined}
        className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          enAjustes ? 'bg-primary-tint text-primary' : 'text-muted hover:bg-canvas hover:text-ink'
        }`}
      >
        <Settings size={19} strokeWidth={enAjustes ? 2.4 : 1.8} className="flex-shrink-0" />
        Ajustes
      </Link>

      {/* En demo no hay sesión que cerrar: la app entera funciona sin cuenta,
          así que ofrecerlo llevaría al login desde ningún sitio. */}
      {!IS_DEMO_MODE && (
        <button
          type="button"
          onClick={cerrarSesion}
          className="flex w-full min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <LogOut size={19} strokeWidth={1.8} className="flex-shrink-0" />
          Cerrar sesión
        </button>
      )}
    </div>
  )
}
