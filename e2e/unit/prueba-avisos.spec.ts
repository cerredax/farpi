import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { enviarPruebaDeAviso } from '@/lib/prueba-avisos'
import { probarAvisos } from '@/lib/push'

const endpoint = 'https://fcm.googleapis.com/fcm/send/movil'
const prueba = '10000000-0000-4000-8000-000000000001'
const fila = { user_id: 'propietaria', endpoint, p256dh: 'publica-guardada', auth: 'secreto-guardado' }

function baseDePrueba(filas = [fila], fallo = false) {
  const consultas: URL[] = []
  const cliente = createClient('https://ejemplo.supabase.co', 'anon', {
    auth: { persistSession: false },
    global: { fetch: async entrada => {
      const url = new URL(String(entrada))
      consultas.push(url)
      if (fallo) return Response.json({ message: 'Fallo de lectura' }, { status: 500 })
      return Response.json(filas.filter(f => `eq.${f.user_id}` === url.searchParams.get('user_id') && `eq.${f.endpoint}` === url.searchParams.get('endpoint')))
    } },
  })
  return { cliente, consultas }
}

test('una prueba usa las claves guardadas y consulta solo el dispositivo de la propia cuenta', async () => {
  const { cliente, consultas } = baseDePrueba()
  const enviados: unknown[] = []
  const resultado = await enviarPruebaDeAviso(cliente, 'propietaria', endpoint, prueba, async (sub, payload) => {
    enviados.push(sub, JSON.parse(payload))
    return { statusCode: 201 }
  })
  expect(consultas).toHaveLength(1)
  expect(consultas[0].searchParams.get('user_id')).toBe('eq.propietaria')
  expect(consultas[0].searchParams.get('endpoint')).toBe(`eq.${endpoint}`)
  expect(enviados).toEqual([
    { endpoint, keys: { p256dh: fila.p256dh, auth: fila.auth } },
    expect.objectContaining({ prueba, url: '/settings?seccion=cuenta' }),
  ])
  expect(resultado).toEqual({ estado: 200, aceptada: true })
  expect(resultado).not.toHaveProperty('recibida')
})

test('conocer el endpoint de otra cuenta no permite enviarle una prueba', async () => {
  const { cliente } = baseDePrueba([{ ...fila, user_id: 'otra' }])
  let enviados = 0
  expect((await enviarPruebaDeAviso(cliente, 'propietaria', endpoint, prueba, async () => { enviados++ })).estado).toBe(404)
  expect(enviados).toBe(0)
})

test('rechaza direcciones ajenas a push e identificadores inválidos antes de consultar', async () => {
  const { cliente, consultas } = baseDePrueba()
  for (const [direccion, id] of [['https://localhost/secreto', prueba], [endpoint, 'suelto'], [null, prueba], [endpoint, {}]]) {
    expect((await enviarPruebaDeAviso(cliente, 'propietaria', direccion, id, async () => { throw Error('No debe enviar') })).estado).toBe(400)
  }
  expect(consultas).toHaveLength(0)
})

test('un fallo al consultar impide el envío', async () => {
  const { cliente } = baseDePrueba([], true)
  let enviados = 0
  expect((await enviarPruebaDeAviso(cliente, 'propietaria', endpoint, prueba, async () => { enviados++ })).estado).toBe(500)
  expect(enviados).toBe(0)
})

for (const codigo of [404, 410, 403, 503]) {
  test(`no confunde un rechazo ${codigo} del proveedor con una prueba aceptada`, async () => {
    const { cliente } = baseDePrueba()
    const resultado = await enviarPruebaDeAviso(cliente, 'propietaria', endpoint, prueba, async () => { throw { statusCode: codigo } })
    expect(resultado.estado).toBe(codigo === 404 || codigo === 410 ? 410 : 502)
    expect(resultado.aceptada).toBeUndefined()
  })
}

// El worker de producción: un 201 del proveedor no sirve como confirmación.
function prepararWorker(mostrar: () => Promise<void>) {
  const escuchas: Record<string, (evento: unknown) => void> = {}
  const mensajes: unknown[] = []
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self: {
      addEventListener: (tipo: string, accion: (evento: unknown) => void) => { escuchas[tipo] = accion },
      registration: { showNotification: mostrar },
      clients: { matchAll: async () => [{ postMessage: (mensaje: unknown) => mensajes.push(mensaje) }] },
    },
  })
  return { mensajes, push: (payload: unknown) => new Promise<void>((resolve, reject) => {
    escuchas.push({ data: { json: () => payload }, waitUntil: (tarea: Promise<void>) => tarea.then(resolve, reject) })
  }) }
}

test('el worker confirma la prueba después de solicitar mostrarla', async () => {
  let mostrar!: () => void
  const worker = prepararWorker(() => new Promise<void>(resolve => { mostrar = resolve }))
  const tarea = worker.push({ title: 'Prueba', prueba })
  expect(worker.mensajes).toEqual([])
  mostrar()
  await tarea
  expect(worker.mensajes).toEqual([{ tipo: 'farpi:prueba-avisos', prueba }])
})

test('si el sistema rechaza mostrar el aviso, el worker no confirma recepción', async () => {
  const worker = prepararWorker(async () => { throw Error('Permiso bloqueado') })
  await expect(worker.push({ prueba })).rejects.toThrow('Permiso bloqueado')
  expect(worker.mensajes).toEqual([])
})

test('los avisos habituales siguen mostrándose sin generar confirmaciones de prueba', async () => {
  let mostrados = 0
  const worker = prepararWorker(async () => { mostrados++ })
  await worker.push({ title: 'Dentista', body: 'Dentro de media hora', url: '/calendar' })
  expect(mostrados).toBe(1)
  expect(worker.mensajes).toEqual([])
})

test.describe('confirmación en el dispositivo', () => {
  const originales = new Map<string, PropertyDescriptor | undefined>()
  function reemplazar(nombre: string, valor: unknown) {
    if (!originales.has(nombre)) originales.set(nombre, Object.getOwnPropertyDescriptor(globalThis, nombre))
    Object.defineProperty(globalThis, nombre, { configurable: true, writable: true, value: valor })
  }
  test.afterEach(() => {
    for (const [nombre, descriptor] of originales) {
      if (descriptor) Object.defineProperty(globalThis, nombre, descriptor)
      else Reflect.deleteProperty(globalThis, nombre)
    }
    originales.clear()
  })

  function prepararNavegador(confirmar: boolean, rechazar = false) {
    const peticiones: { url: string; cuerpo: Record<string, unknown> }[] = []
    const worker = new EventTarget()
    const registro = { pushManager: { getSubscription: async () => ({ endpoint, toJSON: () => ({ endpoint, keys: { p256dh: 'actual', auth: 'actual' } }) }) } }
    Object.assign(worker, { register: async () => registro, ready: Promise.resolve(registro) })
    reemplazar('window', { PushManager: {}, Notification: {} })
    reemplazar('navigator', { serviceWorker: worker })
    reemplazar('Notification', { permission: 'granted' })
    const temporizador = globalThis.setTimeout
    reemplazar('setTimeout', (accion: () => void, tiempo: number) => temporizador(accion, tiempo === 20_000 ? 25 : tiempo))
    reemplazar('fetch', async (url: string, opciones: RequestInit) => {
      const cuerpo = JSON.parse(String(opciones.body))
      peticiones.push({ url, cuerpo })
      if (url.endsWith('/test')) {
        // Una confirmación anterior o de otra pestaña no demuestra nada.
        worker.dispatchEvent(new MessageEvent('message', { data: { tipo: 'farpi:prueba-avisos', prueba: 'otra' } }))
        if (confirmar) worker.dispatchEvent(new MessageEvent('message', { data: { tipo: 'farpi:prueba-avisos', prueba: cuerpo.prueba } }))
        if (rechazar) return Response.json({ error: 'Prueba rechazada' }, { status: 502 })
      }
      return Response.json({ aceptada: true })
    })
    return peticiones
  }

  test('repara las claves del dispositivo y espera su confirmación concreta', async () => {
    const peticiones = prepararNavegador(true)
    expect(await probarAvisos()).toBe('recibida')
    expect(peticiones.map(p => p.url)).toEqual(['/api/push', '/api/push/test'])
    expect(peticiones[0].cuerpo).toEqual({ endpoint, keys: { p256dh: 'actual', auth: 'actual' } })
    expect(peticiones[1].cuerpo.endpoint).toBe(endpoint)
  })

  test('la aceptación HTTP y una confirmación ajena nunca se dan por recepción', async () => {
    prepararNavegador(false)
    expect(await probarAvisos()).toBe('sin-confirmacion')
  })

  test('conserva el error del servidor sin presentarlo como prueba enviada', async () => {
    prepararNavegador(false, true)
    await expect(probarAvisos()).rejects.toThrow('Prueba rechazada')
  })
})
