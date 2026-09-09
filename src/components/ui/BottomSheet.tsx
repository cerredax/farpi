'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Contenido fijo bajo el área scrollable (botones de acción). */
  footer?: React.ReactNode
  /** Acciones extra en el header, a la izquierda del botón de cerrar. */
  headerActions?: React.ReactNode
}

export function BottomSheet({ open, title, onClose, children, footer, headerActions }: BottomSheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  /**
   * Escape cierra, el foco entra al abrir, **se queda dentro mientras está
   * abierto** y vuelve al botón que lo abrió al cerrarse.
   *
   * Las dos últimas faltaban. El panel dice `aria-modal="true"`, que promete que
   * detrás no hay nada con lo que interactuar, pero el `Tab` se escapaba a la
   * pantalla de debajo: quien navega con teclado acababa recorriendo la barra de
   * abajo y los enlaces de Inicio con un formulario abierto encima, sin ver
   * dónde estaba el foco. Y al cerrar, el foco se iba al `body`, así que el
   * siguiente `Tab` empezaba por el principio de la página en vez de por el
   * botón desde el que se había entrado.
   *
   * Los focusables se piden **en cada `Tab`** y no una vez al abrir: dentro de
   * un sheet aparecen y desaparecen controles —el selector de rol, los campos de
   * una serie, el paso de confirmar un borrado— y una lista tomada al abrirlo se
   * quedaría vieja al primer cambio.
   */
  useEffect(() => {
    if (!open) return

    const disparador = document.activeElement as HTMLElement | null
    // El nodo se guarda aquí y no se lee de la ref en la limpieza: para entonces
    // puede haber cambiado, y es lo que avisa `react-hooks/exhaustive-deps`.
    const panel = panelRef.current

    function focusables(): HTMLElement[] {
      if (!panel) return []
      return [...panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter(el => el.offsetParent !== null || el === document.activeElement)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return

      const dentro = focusables()
      // Sin nada que enfocar, el foco se queda en el panel: dejarlo salir sería
      // justo lo que esto viene a evitar.
      if (dentro.length === 0) { e.preventDefault(); panel?.focus(); return }

      const primero = dentro[0]
      const ultimo = dentro[dentro.length - 1]
      const actual = document.activeElement

      if (e.shiftKey && (actual === primero || actual === panel)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && actual === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => panel?.focus(), 0)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      // Solo si el foco sigue dentro del sheet: si mientras tanto se ha ido a
      // otro sitio a propósito —un enlace del menú que navega—, robárselo sería
      // peor que no devolverlo.
      if (disparador?.isConnected && panel?.contains(document.activeElement)) {
        disparador.focus()
      }
    }
  }, [open, onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel — bottom sheet en móvil, modal centrado en desktop */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // inert (React 19): cuando está cerrado lo saca del orden de tabulación
        // y lo oculta a lectores de pantalla sin dejar descendientes focusables.
        inert={!open}
        tabIndex={-1}
        className={[
          'fixed z-[60] bg-white shadow-2xl max-h-[92dvh] flex flex-col outline-none',
          'transition-all duration-300 ease-out',
          // Móvil: desliza desde abajo
          'bottom-0 left-0 right-0 rounded-t-3xl',
          // Desktop: modal centrado con ancho fijo
          'md:bottom-auto md:left-1/2 md:right-auto md:top-1/2',
          'md:w-[480px] md:max-h-[85dvh] md:rounded-3xl',
          open
            ? 'translate-y-0 md:-translate-x-1/2 md:-translate-y-1/2 md:opacity-100 md:scale-100'
            : 'translate-y-full md:-translate-x-1/2 md:-translate-y-1/2 md:opacity-0 md:scale-95 md:pointer-events-none',
        ].join(' ')}
      >
        {/* Handle — solo móvil */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
          <div className="w-10 h-1 rounded-full bg-grip" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          {/* En verde, como el nombre de la pantalla en la cabecera: es el
              título de lo que estás haciendo, no una línea de texto más. */}
          <h3 id={titleId} className="text-base font-extrabold text-primary-strong">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>

        {/* Footer fijo */}
        {footer && (
          <div className="flex-shrink-0 border-t border-hairline">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
