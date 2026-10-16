/** Coordina las lecturas y escrituras de una familia, sin depender de React. */
export function crearCoordinador<Porcion extends string>() {
  const versiones = new Map<Porcion, number>()
  let cola: Promise<unknown> = Promise.resolve()
  let pendientes = 0

  function invalidar(porciones: Porcion[]) {
    for (const porcion of porciones) versiones.set(porcion, (versiones.get(porcion) ?? 0) + 1)
  }

  return {
    get pendientes() { return pendientes },
    async leer<T>(porcion: Porcion, obtener: () => Promise<T>, aplicar: (valor: T) => void): Promise<T> {
      invalidar([porcion])
      const version = versiones.get(porcion)
      const valor = await obtener()
      // Una lectura anterior a otra lectura o escritura ya no manda sobre la UI.
      if (version === versiones.get(porcion)) aplicar(valor)
      return valor
    },
    escribir<T>(
      guardar: () => Promise<T>,
      actualizar: () => Promise<void>,
      porciones: Porcion[],
      alCambiarPendientes: (cantidad: number) => void,
    ): Promise<ResultadoEscritura<T>> {
      pendientes++
      invalidar(porciones)
      alCambiarPendientes(pendientes)
      // Mantener el orden de los gestos evita que dos cambios del mismo elemento
      // se adelanten entre sí. Una escritura fallida no bloquea las siguientes.
      const turno = cola.then(async (): Promise<ResultadoEscritura<T>> => {
        invalidar(porciones)
        let valor: T
        try {
          valor = await guardar()
        } catch (error) {
          return { guardado: false, error }
        }
        invalidar(porciones)
        try {
          await actualizar()
          return { guardado: true, valor }
        } catch (errorDeLectura) {
          // Repetir la escritura aquí duplicaría lo que ya se ha guardado.
          return { guardado: true, valor, errorDeLectura }
        }
      })
      cola = turno.catch(() => {})
      return turno.finally(() => {
        pendientes--
        alCambiarPendientes(pendientes)
      })
    },
  }
}

export type ResultadoEscritura<T> =
  | { guardado: false; error: unknown }
  | { guardado: true; valor: T; errorDeLectura?: unknown }
