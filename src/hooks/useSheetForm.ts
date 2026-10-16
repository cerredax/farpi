'use client'

import { useEffect, useRef, useState } from 'react'
import { useConfirmAction } from './useConfirmAction'
import { textosDelNavegador } from '@/lib/i18n'

interface UseSheetFormOptions<D> {
  open: boolean
  /** Draft inicial. Se vuelve a evaluar cada vez que el sheet se abre. */
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
  const enviando = useRef(false)
  const [guardando, setGuardando] = useState(false)

  // La `key` de las vistas remonta el sheet al editar cosas distintas, pero al
  // crear vale siempre lo mismo: sin esto, añadir dos ítems seguidos dejaba el
  // texto del primero escrito en el campo. Se rearma en cada apertura, que
  // además recoge los valores por defecto del momento (la fecha y la franja de
  // la comida, por ejemplo). Es el ajuste de estado en render que documenta
  // React, no un efecto: así el sheet ya aparece limpio en el primer pintado.
  const [abiertoAntes, setAbiertoAntes] = useState(open)
  if (open !== abiertoAntes) {
    setAbiertoAntes(open)
    if (open) {
      setDraft(initialDraft())
      setFormError(null)
    }
  }

  useEffect(() => {
    // El retardo espera a que termine la animación de apertura del sheet;
    // enfocar antes hace que el teclado móvil abra a medias.
    if (!open || !autoFocus) return
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [open, autoFocus])

  /** Actualiza campos sueltos del draft sin repetir el spread. */
  function patch(changes: Partial<D>) {
    setDraft(d => ({ ...d, ...changes }))
  }

  /**
   * Envuelve el onSubmit del form: valida y solo llama a `onValid` si pasa.
   *
   * Espera al guardado y conserva el borrador si falla. El bloqueo usa una ref
   * además del botón: dos Enter seguidos pueden llegar antes del siguiente render.
   */
  function submitHandler(onValid: (draft: D) => void | boolean | Promise<void | boolean>, onGuardado?: () => void) {
    return async (e: React.FormEvent) => {
      e.preventDefault()
      if (enviando.current) return
      const message = validate?.(draft) ?? null
      if (message) {
        setFormError(message)
        return
      }
      setFormError(null)
      enviando.current = true
      setGuardando(true)
      try {
        if (await onValid(draft) !== false) onGuardado?.()
      } catch (error) {
        setFormError(error instanceof Error ? error.message : textosDelNavegador().comun.store.noSeGuardo)
      } finally {
        enviando.current = false
        setGuardando(false)
      }
    }
  }

  return { draft, setDraft, patch, formError, setFormError, firstFieldRef, submitHandler, guardando }
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

interface UseSheetDeleteDialogOptions extends UseSheetDeleteOptions {
  open: boolean
}

/**
 * Borrado que pregunta en el propio sheet, para lo que se lleva por delante datos
 * que no están en pantalla (una lista con sus ítems, una partida, una persona,
 * una familia). El resto sigue con el doble toque de `useSheetDelete`.
 *
 * `preguntar` cambia el sheet a la pregunta y `cancelar` lo devuelve al
 * formulario, con lo escrito donde estaba. El porqué de que sea el mismo sheet y
 * no otro encima está en `ConfirmDelete`.
 */
export function useSheetDeleteDialog({ open, initial, onDelete, onClose }: UseSheetDeleteDialogOptions) {
  const [preguntando, setPreguntando] = useState(false)

  // El mismo ajuste en render que el draft de `useSheetForm`, y por lo mismo: si
  // el sheet se cierra con la pregunta puesta —por Escape, por el overlay o
  // porque lo cierra la pantalla—, la próxima vez tiene que abrirse por el
  // formulario y no por una pregunta que ya nadie hizo.
  const [abiertoAntes, setAbiertoAntes] = useState(open)
  if (open !== abiertoAntes) {
    setAbiertoAntes(open)
    if (preguntando) setPreguntando(false)
  }

  function preguntar(): void {
    if (initial) setPreguntando(true)
  }

  function cancelar(): void {
    setPreguntando(false)
  }

  function confirmar(): void {
    if (!initial) return
    onDelete(initial.id)
    setPreguntando(false)
    onClose()
  }

  return { preguntando, preguntar, cancelar, confirmar }
}
