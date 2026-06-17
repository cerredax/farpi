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

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[92dvh] flex flex-col ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
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
