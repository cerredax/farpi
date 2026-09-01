'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useStore } from '@/lib/store-context'
import { construirExportacion, nombreDeArchivo, resumenDeExportacion } from '@/lib/export'

/**
 * Descargar una copia de todo.
 *
 * Va en "Tu familia" y no en "Cuenta y seguridad" por dos razones: son datos de la
 * familia y no de tu cuenta, y ese otro bloque está oculto en modo demo, lo que
 * dejaría esta función sin poder probarse en la suite.
 *
 * No hay pantalla de restauración, y es deliberado: una restauración de un clic es
 * bastante maquinaria para algo que pasará cero o una vez, y con el archivo delante
 * se resuelve con un script. El camino de vuelta está escrito en
 * `docs/project-status.md`, que es donde sirve de algo si un día no hay app.
 */
export function BackupCard() {
  const {
    family, members, invites, kids, allEvents, tasks, lists, allListItems,
    meals, notes, budgets, expenses, quotes, documents,
  } = useStore()
  const [error, setError] = useState<string | null>(null)
  const [hecho, setHecho] = useState(false)

  const datos = {
    family, members, invites, kids,
    events: allEvents, tasks, lists,
    listItems: allListItems, meals, notes,
    budgets, expenses, quotes, documents,
  }

  function descargar() {
    setError(null)
    try {
      const json = JSON.stringify(construirExportacion(datos), null, 2)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = nombreDeArchivo(family.name)
      enlace.click()
      // El blob se libera, pero **no en este mismo tick**: Chromium aguanta que la
      // URL desaparezca justo después del click y Safari puede cancelar la descarga
      // porque todavía no había ido a leerla. Sin liberarlo, se queda en memoria
      // hasta recargar la página.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setHecho(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar la copia.')
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-canvas text-primary">
          <Download size={18} strokeWidth={2.3} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">Copia de seguridad</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Un archivo con todo lo de la familia: personas, calendario, tareas, listas, comidas y las fichas de
            los documentos.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={descargar}
        onBlur={() => setHecho(false)}
        className="w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary-tint"
      >
        Descargar una copia de todo
      </button>

      {/* El recuento, a secas y como un albarán. Es lo que hace que una copia dé
          confianza: "descargar una copia" no dice si va vacía. Sin prosa alrededor,
          que la cabecera ya ha dicho qué lleva. */}
      <p className="text-[10px] text-faint">{resumenDeExportacion(datos)}</p>

      {/* El archivo lleva DNI, informes médicos y fechas de nacimiento de los
          niños. No se cifra a propósito —una contraseña que se olvida convierte la
          copia en nada— así que al menos se dice dónde guardarlo. */}
      <p className="text-[10px] leading-relaxed text-faint">
        Sin cifrar y con datos de la familia dentro: guárdalo donde guardarías los papeles. Los archivos de los
        documentos no van en la copia; están en Google Drive.
      </p>

      {hecho && <p className="text-[11px] font-semibold text-primary-strong">Copia descargada.</p>}
      {error && <p className="text-[11px] font-medium text-danger">{error}</p>}
    </Card>
  )
}
