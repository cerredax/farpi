'use client'

import { createContext, useContext } from 'react'
import { diccionario, IDIOMA_POR_DEFECTO, type Diccionario, type Idioma } from './index'

const IdiomaContext = createContext<Idioma>(IDIOMA_POR_DEFECTO)

/**
 * El idioma de la página para todos los componentes de cliente.
 *
 * Lo decide **el servidor**, leyendo la cookie en el layout raíz, y llega aquí
 * como prop. No se vuelve a leer en el navegador: si el cliente pintara en otro
 * idioma que el HTML que ya llegó, React se quejaría de la hidratación, que en
 * la suite es un `console.error` y la tumba.
 */
export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  return <IdiomaContext.Provider value={idioma}>{children}</IdiomaContext.Provider>
}

export function useIdioma(): Idioma {
  return useContext(IdiomaContext)
}

/** Los textos del idioma de la página: `const t = useT()` y `t.secciones.inicio`. */
export function useT(): Diccionario {
  return diccionario(useIdioma())
}
