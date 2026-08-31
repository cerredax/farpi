'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Settings, LogOut } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useIsClient } from '@/hooks/useIsClient'
import { IS_DEMO_MODE, signOut } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import { SECCIONES_EN_MAS } from './secciones'

/**
 * "Más": la última pastilla de la barra de abajo, y todo lo que no cabe en ella.
 *
 * Lleva Notas, Documentos, Ajustes y cerrar sesión. Es lo que ocupaba el círculo de la
 * cuenta en la esquina de `TopBar` hasta el 28-08-2026, y viene de una cuenta
 * sencilla: en móvil había **dos** sitios donde tocar para salir de las cinco
 * pantallas de siempre —la barra de abajo y un icono arriba a la derecha—, y el
 * de arriba no decía a dónde llevaba. Ahora se navega por un solo borde de la
 * pantalla, el de abajo, que es el que alcanza el pulgar.
 *
 * Documentos baja aquí porque es la sección a la que menos se entra —el DNI y el
 * libro de familia se miran dos veces al año— y su sitio en la barra es el que
 * necesitaba "Más". Notas llega el 31-08-2026 y se pone delante, por lo mismo y
 * por orden: la clave del wifi se consulta cuando viene alguien. En escritorio no
 * cambia nada: `SideNav` tiene columna de sobra y las enseña con las otras cinco,
 * y la cuenta al pie.
 *
 * Ajustes entró aquí el mismo 28-08-2026 con sus cinco secciones sueltas
 * (Familia, Casa, Cuenta, Sincronización, Legal), una por fila, para que cada
 * una entrara directa a su pestaña. Duró también un día: cinco filas de Ajustes
 * mezcladas con Documentos y Cerrar sesión hacían el menú largo y confuso —no
 * se distinguía "una pantalla de la app" de "una pestaña dentro de otra
 * pantalla" a simple vista. Ahora Ajustes es una fila más, como Documentos, y
 * lleva a `/settings`, que abre en Familia (`pestañaDesdeUrl`). Elegir la
 * pestaña ya es cosa de las pestañas de `SettingsView`, no de este menú.
 *
 * Cerrar sesión va en su propia tarjeta, separado del resto: no es otro sitio al
 * que ir, es salir.
 *
 * El botón lo pinta quien lo usa (`children`), que es `BottomNav`: así la
 * pastilla es exactamente igual que las cinco de al lado sin que sus clases
 * vivan en dos archivos.
 */
export function MoreMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const enElNavegador = useIsClient()

  async function cerrarSesion() {
    await signOut()
    // Sin `router.replace`: el proxy decide a dónde se puede ir sin sesión, y
    // recargar de verdad tira además el estado que quedara en memoria.
    window.location.href = '/auth/login'
  }

  // Las secciones salen de `SECCIONES_EN_MAS` y no de una lista propia: eran los
  // dos sitios donde apuntar lo mismo, y con Documentos solo ya habían divergido
  // una vez. Ajustes sí se escribe aquí, porque no es una sección de la casa.
  const enlaces = [...SECCIONES_EN_MAS, { href: ROUTES.settings, label: 'Ajustes', icon: Settings }]

  const sheet = (
    <BottomSheet open={open} title="Más" onClose={() => setOpen(false)}>
      <div className="space-y-4 px-5 pt-1 pb-8">
        <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
          {/* Enlaces de verdad y no botones: llevan a otra pantalla, así que se
              pueden abrir en otra pestaña y el navegador dice a dónde van. */}
          {enlaces.map(({ href, label, icon: Icon }, i) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas ${
                i > 0 ? 'border-t border-hairline' : ''
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon size={16} strokeWidth={2} className="flex-shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 truncate">{label}</span>
              </span>
              <span aria-hidden className="text-faint">›</span>
            </Link>
          ))}
        </div>

        {/* En demo no hay sesión que cerrar: la app entera funciona sin cuenta,
            así que ofrecerlo llevaría al login desde ningún sitio. */}
        {!IS_DEMO_MODE && (
          <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
            <button
              type="button"
              onClick={cerrarSesion}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              <LogOut size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={className}
      >
        {children}
      </button>

      {/* El sheet se pinta en el `body` y no aquí dentro. `BottomNav` es
          `fixed z-50` y por tanto **crea contexto de apilamiento**: dentro de
          ella, el `z-[60]` del sheet no compite con el `z-50` de la propia
          barra, que se pintaría encima y taparía la última fila del menú. Es
          exactamente el mismo motivo por el que el menú de la cuenta salía en
          portal desde `TopBar`. El `lg:hidden` va porque el sheet ya no cuelga
          de la barra: sin él seguiría en el árbol en escritorio, donde esta
          navegación no se pinta. */}
      {enElNavegador && createPortal(<div className="lg:hidden">{sheet}</div>, document.body)}
    </>
  )
}
