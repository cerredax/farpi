import { Suspense } from 'react'
import { SettingsView } from '@/components/settings/SettingsView'

// El `Suspense` no es decorativo: `SettingsView` lee `?seccion=` con
// `useSearchParams`, y sin frontera Next no puede prerenderizar esta ruta.
export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  )
}
