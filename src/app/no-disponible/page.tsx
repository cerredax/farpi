import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nido no está disponible',
}

/**
 * La cara del "Supabase no contesta". La enseña el proxy cuando el servicio de
 * sesión se pasa de tiempo, sin cambiar la URL: recargar vuelve a intentarlo
 * donde estabas. No habla con Supabase ni carga el `StoreProvider`, porque es
 * justo lo que está caído.
 */
export default function NoDisponiblePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="mb-3 text-4xl">⚠️</p>
        <p className="text-lg font-extrabold text-ink">Nido no está disponible</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          El servicio donde se guardan vuestros datos no responde ahora mismo. No se
          ha perdido nada: en cuanto vuelva, todo estará donde lo dejasteis.
        </p>
        <a
          href="/home"
          className="mt-6 inline-block rounded-xl bg-primary-strong px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-deep active:bg-primary-deepest"
        >
          Volver a intentarlo
        </a>
      </div>
    </div>
  )
}
