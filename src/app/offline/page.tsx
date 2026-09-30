import type { Metadata } from 'next'
import { diccionario } from '@/lib/i18n'
import { idiomaDeLaPeticion } from '@/lib/i18n/servidor'

export async function generateMetadata(): Promise<Metadata> {
  const t = diccionario(await idiomaDeLaPeticion()).acceso.offline
  // « — Farpi» va aquí y no en el diccionario, como el título del layout.
  return { title: `${t.titulo} — Farpi` }
}

export default async function OfflinePage() {
  const t = diccionario(await idiomaDeLaPeticion()).acceso.offline

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="mb-3 text-4xl">📴</p>
        <p className="text-lg font-extrabold text-ink">{t.titulo}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t.texto}
        </p>
      </div>
    </div>
  )
}
