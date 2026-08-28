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
 * - Y se puede **ceder el gesto** a lo que haya debajo con `permite`, para
 *   cuando el desliz horizontal ya significa algo ahí dentro: la vista Semana
 *   se desplaza a lo ancho, y ahí pasar de semana solo tiene sentido cuando ya
 *   no queda semana que recorrer. Se pregunta al **empezar** el gesto y no al
 *   acabarlo: al levantar el dedo el contenido ya se ha desplazado hasta el
 *   borde, así que preguntar entonces haría las dos cosas de una sola pasada.
 */

/** Recorrido mínimo, en píxeles, para que un desliz cuente. */
const MINIMO = 50

/** Cuánto más horizontal que vertical tiene que ser el gesto. */
const PROPORCION = 2

export function useSwipe(
  onAnterior: () => void,
  onSiguiente: () => void,
  /**
   * Si el gesto cuenta en esa dirección (`-1` anterior, `1` siguiente). Sin
   * ella, siempre cuenta.
   */
  permite?: (direccion: -1 | 1) => boolean,
) {
  const inicio = useRef<{ x: number; y: number; anterior: boolean; siguiente: boolean } | null>(null)

  return {
    onTouchStart: (e: TouchEvent) => {
      if (e.touches.length !== 1) { inicio.current = null; return }
      inicio.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        anterior: permite ? permite(-1) : true,
        siguiente: permite ? permite(1) : true,
      }
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
      if (dx < 0) { if (desde.siguiente) onSiguiente() }
      else if (desde.anterior) onAnterior()
    },
  }
}
