'use client'

import { useRef, type TouchEvent } from 'react'

/**
 * Pasar de mes o de día **arrastrando con el dedo**.
 *
 * Es el gesto que ya tiene cualquier calendario del móvil, y sin él las flechas
 * de la cabecera eran la única forma de moverse: dos toques finos en la parte de
 * arriba de la pantalla para algo que se pide todo el rato.
 *
 * Lo que hace falta cuidar es **no robarle el gesto al desplazamiento vertical**,
 * que es el otro dedo de esta pantalla. Por eso:
 *
 * - Se mide al levantar el dedo, no mientras se mueve: así no hay que
 *   `preventDefault` en `touchmove` —que es lo que congela el desplazamiento— ni
 *   listeners no pasivos.
 * - Tiene que ser un gesto **claramente horizontal**: al menos `MINIMO` px de
 *   recorrido y más del doble en horizontal que en vertical. Un desliz en
 *   diagonal para bajar por el mes no cambia de mes.
 * - Con dos dedos no pasa nada: eso es un pellizco para acercar, no un desliz.
 */

/** Recorrido mínimo, en píxeles, para que un desliz cuente. */
const MINIMO = 50

/** Cuánto más horizontal que vertical tiene que ser el gesto. */
const PROPORCION = 2

export function useSwipe(onAnterior: () => void, onSiguiente: () => void) {
  const inicio = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length !== 1) { inicio.current = null; return }
      inicio.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    onTouchEnd: (e: TouchEvent) => {
      const desde = inicio.current
      inicio.current = null
      if (!desde || e.changedTouches.length !== 1) return

      const dx = e.changedTouches[0].clientX - desde.x
      const dy = e.changedTouches[0].clientY - desde.y
      if (Math.abs(dx) < MINIMO || Math.abs(dx) < Math.abs(dy) * PROPORCION) return

      // Se arrastra el contenido, no el calendario: llevarse el mes hacia la
      // izquierda trae el siguiente, como pasar una hoja.
      if (dx < 0) onSiguiente()
      else onAnterior()
    },
  }
}
