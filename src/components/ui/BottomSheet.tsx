'use client'

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
        className={[
          'fixed z-[60] bg-white shadow-2xl max-h-[92dvh] flex flex-col',
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
          <div className="w-10 h-1 rounded-full bg-[#E0DDD8]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
          <h3 className="font-extrabold text-[#252525] text-base">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#77716A] hover:bg-[#F0EDE8] transition-colors"
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
          <div className="flex-shrink-0 border-t border-[#F5F2EE]">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
