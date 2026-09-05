import { useEffect, useRef, useState } from 'react'

/**
 * Gestiona el patrón "doble clic para confirmar".
 * El primer `requestConfirm` pone `confirming` a true; el segundo ejecuta la acción.
 *
 * `resetMs` desarma la confirmación sola pasado ese tiempo. Sin él —como lo usan
 * los sheets— el comportamiento es el de siempre: el sheet se cierra y se lleva
 * el estado con él. Hace falta en una fila de lista, que no se cierra: si la
 * papelera se quedara armada para siempre, el toque de dentro de un rato sobre
 * esa misma fila borraría creyendo que solo estaba pidiendo confirmación, que es
 * justo el descuido del que esto protege.
 */
export function useConfirmAction(resetMs?: number) {
  const [confirming, setConfirming] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cancelarTemporizador(): void {
    if (temporizador.current) {
      clearTimeout(temporizador.current)
      temporizador.current = null
    }
  }

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current)
  }, [])

  function requestConfirm(action: () => void): void {
    if (!confirming) {
      setConfirming(true)
      if (resetMs) {
        cancelarTemporizador()
        temporizador.current = setTimeout(() => {
          temporizador.current = null
          setConfirming(false)
        }, resetMs)
      }
      return
    }
    cancelarTemporizador()
    action()
    setConfirming(false)
  }

  function resetConfirm(): void {
    cancelarTemporizador()
    setConfirming(false)
  }

  return { confirming, requestConfirm, resetConfirm }
}
