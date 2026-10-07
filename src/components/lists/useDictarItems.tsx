'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useDictado } from '@/hooks/useDictado'
import { destinoDeLista, separarItems } from '@/lib/dictado'
import { useT } from '@/lib/i18n/contexto'

interface Propuesta {
  items: string[]
  /** La lista dicha en la frase, o `null` si no se dijo ninguna. */
  listaId: string | null
}

/**
 * Apuntar en una lista **hablando**: lo dictado se parte en ítems y se enseña,
 * y no se guarda hasta que se confirma.
 *
 * `onAnadir` recibe los ítems y la lista que se dijo en la frase, si se dijo
 * alguna («…a la ferretería»); si no, `null` y quien llama usa la suya.
 */
export function useDictarItems(
  listas: { id: string; name: string }[],
  onAnadir: (items: string[], listaId: string | null) => void,
) {
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null)

  const dictado = useDictado(texto => {
    const { frase, listaId } = destinoDeLista(texto, listas)
    const items = separarItems(frase)
    setPropuesta(items.length > 0 ? { items, listaId } : null)
  })

  function confirmar() {
    if (!propuesta) return
    onAnadir(propuesta.items, propuesta.listaId)
    setPropuesta(null)
  }

  return { dictado, propuesta, confirmar, descartar: () => setPropuesta(null) }
}

/** Lo que se va a añadir, con su lista, y los dos botones para decidir. */
export function PropuestaDeItems({
  propuesta, listas, onConfirmar, onDescartar,
}: {
  propuesta: Propuesta | null
  listas: { id: string; name: string }[]
  onConfirmar: () => void
  onDescartar: () => void
}) {
  const t = useT().listas.dictado
  if (!propuesta) return null
  const lista = listas.find(l => l.id === propuesta.listaId)?.name ?? null

  return (
    <div className="space-y-2 rounded-xl border border-line bg-canvas p-3" role="group" aria-live="polite">
      <p className="text-xs font-semibold text-ink">{t.seAnadiran(propuesta.items.length, lista)}</p>
      <ul className="list-disc pl-5 text-sm text-ink">
        {propuesta.items.map(item => <li key={item}>{item}</li>)}
      </ul>
      <div className="flex gap-2">
        <Button onClick={onConfirmar} className="min-h-11 flex-1">{t.anadirN(propuesta.items.length)}</Button>
        <Button variant="ghost" onClick={onDescartar} className="min-h-11">{t.descartar}</Button>
      </div>
    </div>
  )
}
