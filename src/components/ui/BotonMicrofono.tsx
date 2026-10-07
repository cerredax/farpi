'use client'

import { Mic, Square } from 'lucide-react'
import type { useDictado } from '@/hooks/useDictado'
import { useT } from '@/lib/i18n/contexto'

type Dictado = ReturnType<typeof useDictado>

interface BotonMicrofonoProps {
  dictado: Dictado
  /**
   * `icono` es el cuadrado de 44 px que cabe junto a un campo; `ancho` es el botón
   * con su nombre escrito, para un sheet donde sobra sitio. Los dos miden 44 px de
   * alto, que es el mínimo de la casa.
   */
  variante?: 'icono' | 'ancho'
}

/**
 * El botón de dictar. **Sin soporte no se pinta**: un botón que no puede hacer nada
 * es peor que no tenerlo, y Safari de iPhone no siempre trae reconocimiento de voz.
 */
export function BotonMicrofono({ dictado, variante = 'ancho' }: BotonMicrofonoProps) {
  const t = useT().comun.dictado
  if (!dictado.soportado) return null

  const nombre = dictado.escuchando ? t.escuchando : t.dictar
  const icono = dictado.escuchando
    ? <Square size={15} strokeWidth={2.2} aria-hidden />
    : <Mic size={variante === 'icono' ? 18 : 15} strokeWidth={2.2} aria-hidden />

  return (
    <button
      type="button"
      onClick={dictado.escuchando ? dictado.parar : dictado.iniciar}
      aria-pressed={dictado.escuchando}
      aria-label={variante === 'icono' ? nombre : undefined}
      className={
        variante === 'icono'
          ? `flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-line transition-colors ${
              dictado.escuchando ? 'bg-danger-soft text-danger-strong' : 'bg-canvas text-ink hover:bg-surface'
            }`
          : 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-sm font-semibold text-ink transition-colors hover:bg-surface'
      }
    >
      {icono}
      {variante === 'ancho' && nombre}
    </button>
  )
}

/** Por qué no se pudo dictar, o nada si todo fue bien. */
export function ErrorDeDictado({ dictado }: { dictado: Dictado }) {
  const t = useT().comun.dictado
  if (!dictado.error) return null
  return (
    <p className="text-xs font-medium text-danger-strong">
      {dictado.error === 'permiso' ? t.permiso : dictado.error === 'nada' ? t.nada : t.otro}
    </p>
  )
}
