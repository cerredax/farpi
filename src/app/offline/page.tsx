import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sin conexión — Farpi',
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="mb-3 text-4xl">📴</p>
        <p className="text-lg font-extrabold text-ink">Sin conexión</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          No hay internet ahora mismo. Farpi volverá en cuanto recuperes la conexión.
        </p>
      </div>
    </div>
  )
}
