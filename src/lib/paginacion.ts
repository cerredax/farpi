import { es } from './i18n/es'

/** Reúne páginas completas, también si el servidor devuelve menos filas de las pedidas. */
export async function leerPaginas<T>(
  pedir: (desde: number, hasta: number) => Promise<{ filas: T[]; total: number | null }>,
  mensajeIncompleta = es.comun.datos.lecturaIncompleta,
): Promise<T[]> {
  const filas: T[] = []
  const tamano = 500
  for (;;) {
    const pagina = await pedir(filas.length, filas.length + tamano - 1)
    filas.push(...pagina.filas)
    if (pagina.total !== null && filas.length >= pagina.total) return filas
    if (pagina.filas.length === 0) {
      if (pagina.total !== null && filas.length < pagina.total) {
        throw new Error(mensajeIncompleta)
      }
      return filas
    }
  }
}
