import { test, expect } from '@playwright/test'
import { leerPaginas } from '../../src/lib/paginacion'

test('recupera más de mil filas sin perder el orden ni duplicar los límites', async () => {
  const datos = Array.from({ length: 1257 }, (_, i) => i)
  const rangos: number[][] = []
  const filas = await leerPaginas(async (desde, hasta) => {
    rangos.push([desde, hasta])
    return { filas: datos.slice(desde, hasta + 1), total: datos.length }
  })
  expect(filas).toEqual(datos)
  expect(rangos).toEqual([[0, 499], [500, 999], [1000, 1499]])
})

test('respeta un límite del servidor inferior al tamaño solicitado', async () => {
  const datos = Array.from({ length: 1201 }, (_, i) => i)
  const filas = await leerPaginas(async desde => ({ filas: datos.slice(desde, desde + 100), total: datos.length }))
  expect(filas).toEqual(datos)
})

test('una consulta vacía solo cuesta una petición', async () => {
  let peticiones = 0
  expect(await leerPaginas(async () => { peticiones++; return { filas: [], total: 0 } })).toEqual([])
  expect(peticiones).toBe(1)
})

test('sin recuento continúa hasta encontrar una página vacía', async () => {
  const datos = [1, 2, 3]
  expect(await leerPaginas(async desde => ({ filas: datos.slice(desde, desde + 2), total: null }))).toEqual(datos)
})

test('un fallo intermedio no devuelve un historial parcial como completo', async () => {
  await expect(leerPaginas(async desde => {
    if (desde > 0) throw new Error('sin conexión')
    return { filas: [1], total: 2 }
  })).rejects.toThrow('sin conexión')
})

test('detecta una página vacía cuando el recuento dice que faltan datos', async () => {
  await expect(leerPaginas(async () => ({ filas: [], total: 2 }))).rejects.toThrow('incompleta')
})
