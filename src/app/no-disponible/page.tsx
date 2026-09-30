import type { Metadata } from 'next'
import { diccionario } from '@/lib/i18n'
import { idiomaDeLaPeticion } from '@/lib/i18n/servidor'

export async function generateMetadata(): Promise<Metadata> {
  const t = diccionario(await idiomaDeLaPeticion()).acceso.noDisponible
  return { title: t.titulo }
}

/**
 * La cara del "Supabase no contesta". La enseña el proxy cuando el servicio de
 * sesión se pasa de tiempo, sin cambiar la URL: recargar vuelve a intentarlo
 * donde estabas. No habla con Supabase ni carga el `StoreProvider`, porque es
 * justo lo que está caído.
 */
export default async function NoDisponiblePage() {
  const t = diccionario(await idiomaDeLaPeticion()).acceso.noDisponible

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="mb-3 text-4xl">⚠️</p>
        <p className="text-lg font-extrabold text-ink">{t.titulo}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t.texto}
        </p>
        <a
          href="/home"
          className="mt-6 inline-block rounded-xl bg-primary-strong px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-deep active:bg-primary-deepest"
        >
          {t.reintentar}
        </a>
      </div>
    </div>
  )
}
