'use client'

import { useSyncExternalStore } from 'react'

/** La hora no cambia sola: no hay a qué suscribirse. */
const sinSuscripcion = () => () => {}

/**
 * `false` durante el render del servidor, `true` ya en el navegador.
 *
 * Sirve para lo que depende del momento actual: las pantallas se
 * prerenderizan, así que pintar la fecha directamente serviría el día del
 * build hasta que React hidratase.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(sinSuscripcion, () => true, () => false)
}
