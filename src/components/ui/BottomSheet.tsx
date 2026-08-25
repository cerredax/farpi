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

  // Cerrar con Escape y llevar el foco al panel al abrir (accesibilidad).
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
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
              className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors"
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
