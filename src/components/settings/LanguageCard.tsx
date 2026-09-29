'use client'

import { Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useIdioma, useT } from '@/lib/i18n/contexto'
import { guardarIdioma, NOMBRE_DEL_IDIOMA, type Idioma } from '@/lib/i18n'

/**
 * El idioma de la app en este dispositivo (28-09-2026).
 *
 * Cada idioma se escribe en sí mismo («English», no «Inglés»), que es como lo
 * busca quien no lee el que está puesto, y lleva su `lang` para que el lector de
 * pantalla lo pronuncie bien.
 *
 * Se guarda al toque, como las franjas de comida, y **recarga la página**: el
 * idioma lo decide el servidor al pintarla (`<html lang>`, el primer HTML), y
 * cambiarlo solo en el cliente dejaría la mitad de las cosas en el idioma de
 * antes. Se cambia una vez y no vuelve a tocarse, así que la recarga no molesta.
 */
export function LanguageCard({ idiomas }: { idiomas: Idioma[] }) {
  const t = useT()
  const actual = useIdioma()

  function elegir(idioma: Idioma) {
    if (idioma === actual) return
    guardarIdioma(idioma)
    window.location.reload()
  }

  return (
    <Card padded={false}>
      <p className="px-4 pt-3 pb-2 text-xs text-muted">{t.ajustes.idioma.explicacion}</p>

      <ul role="radiogroup" aria-label={t.ajustes.idioma.titulo} className="border-t border-hairline divide-y divide-hairline">
        {idiomas.map(idioma => {
          const elegido = idioma === actual
          return (
            <li key={idioma}>
              <button
                type="button"
                role="radio"
                aria-checked={elegido}
                lang={idioma}
                onClick={() => elegir(idioma)}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas"
              >
                <span className={`text-sm font-semibold ${elegido ? 'text-ink' : 'text-muted'}`}>
                  {NOMBRE_DEL_IDIOMA[idioma]}
                </span>
                {elegido && <Check size={16} strokeWidth={2.6} className="flex-shrink-0 text-primary-strong" aria-hidden />}
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
