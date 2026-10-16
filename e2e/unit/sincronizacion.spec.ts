import { test, expect } from '@playwright/test'
import { crearCoordinador } from '../../src/lib/sincronizacion'

function diferida<T>() {
  let resolver!: (valor: T) => void
  const promesa = new Promise<T>(resolve => { resolver = resolve })
  return { promesa, resolver }
}

test('una respuesta antigua no sustituye la lectura más reciente', async () => {
  const c = crearCoordinador<'tasks'>()
  const antigua = diferida<string>()
  let mostrado = ''
  const primera = c.leer('tasks', () => antigua.promesa, v => { mostrado = v })
  await c.leer('tasks', async () => 'nuevo', v => { mostrado = v })
  antigua.resolver('viejo')
  await primera
  expect(mostrado).toBe('nuevo')
})

test('una lectura iniciada antes de guardar queda invalidada', async () => {
  const c = crearCoordinador<'tasks' | 'notes'>()
  const antigua = diferida<string>()
  let mostrado = ''
  const lectura = c.leer('tasks', () => antigua.promesa, v => { mostrado = v })
  await c.escribir(async () => true, () => c.leer('tasks', async () => 'guardado', v => { mostrado = v }).then(() => {}), ['tasks'], () => {})
  antigua.resolver('anterior')
  await lectura
  expect(mostrado).toBe('guardado')
})

test('escribir en una porción conserva las lecturas de otras', async () => {
  const c = crearCoordinador<'tasks' | 'notes'>()
  const notas = diferida<string>()
  let mostrado = ''
  const lectura = c.leer('notes', () => notas.promesa, v => { mostrado = v })
  await c.escribir(async () => true, async () => {}, ['tasks'], () => {})
  notas.resolver('nota válida')
  await lectura
  expect(mostrado).toBe('nota válida')
})

test('dos escrituras conservan su orden y siguen pendientes hasta terminar ambas', async () => {
  const c = crearCoordinador<'tasks'>()
  const primera = diferida<void>()
  const segunda = diferida<void>()
  const estados: number[] = []
  const orden: string[] = []
  const a = c.escribir(async () => { orden.push('a'); await primera.promesa }, async () => { orden.push('leer a') }, ['tasks'], n => estados.push(n))
  const b = c.escribir(async () => { orden.push('b'); await segunda.promesa }, async () => { orden.push('leer b') }, ['tasks'], n => estados.push(n))
  await Promise.resolve()
  expect(orden).toEqual(['a'])
  expect(c.pendientes).toBe(2)
  primera.resolver()
  await a
  expect(c.pendientes).toBe(1)
  segunda.resolver()
  await b
  expect(orden).toEqual(['a', 'leer a', 'b', 'leer b'])
  expect(estados).toEqual([1, 2, 1, 0])
})

test('un fallo de lectura conserva el resultado guardado y no repite la escritura', async () => {
  const c = crearCoordinador<'expenses'>()
  let escrituras = 0
  const error = new Error('lectura sin conexión')
  const resultado = await c.escribir(async () => { escrituras++; return 'apunte-1' }, async () => { throw error }, ['expenses'], () => {})
  expect(resultado).toEqual({ guardado: true, valor: 'apunte-1', errorDeLectura: error })
  expect(escrituras).toBe(1)
})

test('una escritura fallida no refresca ni bloquea la siguiente', async () => {
  const c = crearCoordinador<'notes'>()
  let lecturas = 0
  const a = c.escribir(async () => { throw new Error('sin conexión') }, async () => { lecturas++ }, ['notes'], () => {})
  const b = c.escribir(async () => 'nota', async () => { lecturas++ }, ['notes'], () => {})
  expect((await a).guardado).toBe(false)
  expect(await b).toEqual({ guardado: true, valor: 'nota' })
  expect(lecturas).toBe(1)
  expect(c.pendientes).toBe(0)
})
