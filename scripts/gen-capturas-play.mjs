/**
 * Capturas reales para la ficha de Google Play, sin datos de producción.
 * Ejecutar: node scripts/gen-capturas-play.mjs
 * La web y sus imágenes de portada no se modifican con este comando.
 */
import assert from 'node:assert/strict'
import { spawn, execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { chromium, devices } from '@playwright/test'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA = path.join(RAIZ, 'google-play', 'capturas')
const BASE = 'http://localhost:3103'
const INSTANTE = new Date('2026-06-17T07:40:00Z')
const PANTALLAS = [
  { ruta: '/home', nombre: 'inicio', espera: 'Buenos días' },
  { ruta: '/calendar', nombre: 'calendario', espera: 'Pediatra de Cris' },
  { ruta: '/lists', nombre: 'listas', espera: 'Bricolaje' },
  { ruta: '/tasks', nombre: 'tareas', espera: 'Dar la vitamina a Cris' },
  { ruta: '/meals', nombre: 'comidas', espera: 'Pollo al horno con patatas' },
  { ruta: '/finances', nombre: 'finanzas', espera: 'Compra semanal' },
  { ruta: '/notes', nombre: 'notas', espera: 'Wifi de casa' },
  { ruta: '/docs', nombre: 'documentos', espera: 'Seguro del coche' },
]
const FORMATOS = [
  { nombre: 'telefono', ancho: 432, alto: 768, escala: 2.5 },
  { nombre: 'tablet-7', ancho: 720, alto: 1280, escala: 1.5 },
  { nombre: 'tablet-10', ancho: 1280, alto: 720, escala: 1.5 },
]

// Los placeholders prevalecen sobre .env.local: ni el servidor ni el navegador
// deben consultar Supabase al preparar material público con la familia de demo.
const servidor = spawn(process.execPath, [
  path.join(RAIZ, 'node_modules', 'next', 'dist', 'bin', 'next'),
  'dev', '--port', '3103',
], {
  cwd: RAIZ,
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: 'your-supabase-project-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key',
  },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let registro = ''
for (const salida of [servidor.stdout, servidor.stderr]) {
  salida.on('data', datos => { registro = (registro + datos.toString()).slice(-6000) })
}
let falloServidor
servidor.on('error', error => { falloServidor = error })

async function esperarServidor() {
  for (let intento = 0; intento < 90; intento++) {
    if (falloServidor) throw falloServidor
    if (servidor.exitCode !== null) throw new Error(`Next terminó: ${registro}`)
    try {
      if ((await fetch(`${BASE}/auth/login`)).ok) return
    } catch { /* Next todavía está arrancando. */ }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error(`Next no respondió: ${registro}`)
}

let navegador
try {
  await esperarServidor()
  navegador = await chromium.launch()
  const inventario = []
  for (const formato of FORMATOS) {
    const carpeta = path.join(SALIDA, formato.nombre)
    await mkdir(carpeta, { recursive: true })
    const contexto = await navegador.newContext({
      ...devices['Pixel 7'],
      viewport: { width: formato.ancho, height: formato.alto },
      deviceScaleFactor: formato.escala,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      colorScheme: 'light',
      reducedMotion: 'reduce',
    })
    await contexto.clock.setFixedTime(INSTANTE)
    // Segunda barrera: solo se permite la app local y sus fuentes públicas.
    await contexto.route('**/*', ruta => {
      const url = new URL(ruta.request().url())
      const permitido = url.origin === BASE || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)
      return permitido ? ruta.continue() : ruta.abort()
    })
    const pagina = await contexto.newPage()
    const errores = []
    pagina.on('pageerror', error => errores.push(error.message))
    pagina.on('console', mensaje => {
      if (mensaje.type() === 'error') errores.push(mensaje.text())
    })
    for (const [indice, pantalla] of PANTALLAS.entries()) {
      const respuesta = await pagina.goto(`${BASE}${pantalla.ruta}`)
      assert(respuesta?.ok(), `No se pudo abrir ${pantalla.ruta}`)
      await pagina.getByText(pantalla.espera).filter({ visible: true }).first().waitFor({ timeout: 30_000 })
      await pagina.evaluate(() => document.fonts.ready)
      await pagina.addStyleTag({ content: `
        nextjs-portal { display: none !important }
        ::-webkit-scrollbar { display: none }
        html { scrollbar-width: none }
        *, *::before, *::after { animation: none !important; transition: none !important }
      ` })
      await pagina.waitForTimeout(500)
      const medidas = await pagina.evaluate(() => ({
        ancho: document.documentElement.clientWidth,
        contenido: document.documentElement.scrollWidth,
      }))
      assert(medidas.contenido <= medidas.ancho + 1, `Desbordamiento en ${formato.nombre}/${pantalla.nombre}`)
      assert.equal(errores.length, 0, errores.join('\n'))
      const nombre = `${String(indice + 1).padStart(2, '0')}-${pantalla.nombre}.png`
      // RGB sin transparencia, conservando todos los píxeles de la captura.
      const destino = path.join(carpeta, nombre)
      await sharp(await pagina.screenshot()).removeAlpha().png().toFile(destino)
      const imagen = await sharp(destino).metadata()
      assert.equal(imagen.width, formato.ancho * formato.escala)
      assert.equal(imagen.height, formato.alto * formato.escala)
      assert.equal(imagen.channels, 3)
      assert.equal(imagen.hasAlpha, false)
      assert.equal(Math.max(imagen.width, imagen.height) * 9, Math.min(imagen.width, imagen.height) * 16)
      inventario.push({ archivo: `${formato.nombre}/${nombre}`, ancho: imagen.width, alto: imagen.height })
      console.log(`${formato.nombre}/${nombre}: ${imagen.width}×${imagen.height}, RGB`)
    }
    await contexto.close()
  }
  await writeFile(path.join(SALIDA, 'inventario.json'), JSON.stringify({
    generado: new Date().toISOString(),
    datos: 'Demostración local, sin conexión a Supabase',
    fechaDemo: INSTANTE.toISOString(),
    archivos: inventario,
  }, null, 2) + '\n')
  console.log(`Comprobadas ${inventario.length} capturas en google-play/capturas/.`)
} finally {
  try {
    await navegador?.close()
  } finally {
    if (servidor.pid && servidor.exitCode === null) {
      if (process.platform === 'win32') {
        try {
          await promisify(execFile)('taskkill', ['/pid', String(servidor.pid), '/T', '/F'], { windowsHide: true })
        } catch (error) {
          // Next puede haber terminado entre la comprobación y taskkill.
          if (servidor.exitCode === null) throw error
        }
      } else servidor.kill('SIGTERM')
    }
  }
}
