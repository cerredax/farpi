import { useState } from 'react'

/**
 * Gestiona el patrón "doble clic para confirmar".
 * El primer `requestConfirm` pone `confirming` a true; el segundo ejecuta la acción.
 */
export function useConfirmAction() {
  const [confirming, setConfirming] = useState(false)

  function requestConfirm(action: () => void): void {
    if (!confirming) {
      setConfirming(true)
      return
    }
    action()
    setConfirming(false)
  }

  function resetConfirm(): void {
    setConfirming(false)
  }

  return { confirming, requestConfirm, resetConfirm }
}
