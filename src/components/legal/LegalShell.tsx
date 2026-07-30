import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link href="/home" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
          <ArrowLeft size={16} strokeWidth={2.3} /> Volver
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">{title}</h1>
        <p className="mt-1 text-xs text-muted">Última actualización: {updated}</p>
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </div>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-ink">{heading}</h2>
      {children}
    </section>
  )
}
