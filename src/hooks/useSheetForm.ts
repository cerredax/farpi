'use client'

import { useEffect, useRef, useState } from 'react'
import { useConfirmAction } from './useConfirmAction'

interface UseSheetFormOptions<D> {
  open: boolean
  /**
   * Draft inicial. Se evalúa una sola vez: las vistas remontan los sheets con
   * `key` al abrirlos, así que no hace falta resincronizar en cada apertura.
   */
  initialDraft: () => D
  /** Devuelve el mensaje de error, o null si el draft es válido. */
  validate?: (draft: D) => string | null
  /** Enfoca el primer campo al abrir. Desactívalo en sheets sin campo de texto. */
  autoFocus?: boolean
}

/**
 * Andamiaje común de los sheets con formulario: estado del draft, mensaje de
 * error, foco del primer campo y validación en el submit.
 */
export function useSheetForm<D>({ open, initialDraft, validate, autoFocus = true }: UseSheetFormOptions<D>) {
  const [draft, setDraft] = useState<D>(initialDraft)
  const [formError, setFormError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // El retardo espera a que termine la animación de apertura del sheet;
    // enfocar antes hace que el teclado móvil abra a medias.
    if (open && autoFocus) setTimeout(() => firstFieldRef.current?.focus(), 300)
  }, [open, autoFocus])

  /** Actualiza campos sueltos del draft sin repetir el spread. */
  function patch(changes: Partial<D>) {
    setDraft(d => ({ ...d, ...changes }))
  }

  /** Envuelve el onSubmit del form: valida y solo llama a `onValid` si pasa. */
  function submitHandler(onValid: (draft: D) => void) {
    return (e: React.FormEvent) => {
      e.preventDefault()
      const message = validate?.(draft) ?? null
      if (message) {
        setFormError(message)
        return
      }
      setFormError(null)
      onValid(draft)
    }
  }

  return { draft, setDraft, patch, formError, setFormError, firstFieldRef, submitHandler }
}

interface UseSheetDeleteOptions {
  initial: { id: string } | null | undefined
  onDelete: (id: string) => void
  onClose: () => void
}

/** Borrado en dos pasos y cierre del sheet, común a todos los sheets editables. */
export function useSheetDelete({ initial, onDelete, onClose }: UseSheetDeleteOptions) {
  const { confirming, requestConfirm } = useConfirmAction()

  function handleDelete() {
    if (!initial) return
    requestConfirm(() => {
      onDelete(initial.id)
      onClose()
    })
  }

  return { confirming, handleDelete }
}
