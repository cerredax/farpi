/**
 * Las capturas de la portada, hechas contra la app de verdad.
 *
 * La alternativa era dibujar maquetas a mano en `LandingPage`, y esas mienten:
 * se quedan con la interfaz de hace tres meses sin que nadie se entere. Aquí se
 * abre Farpi en **modo demo**, se recorren las pantallas y se guarda lo que se
 * ve. Si la interfaz cambia, se vuelve a lanzar esto y la portada se entera.
 *
 * Dos decisiones que hacen que las capturas salgan bien:
 *
 * - **El reloj se congela en el 17-06-2026 a las 9:40.** Los datos de demo
 *   (`src/lib/store/db.ts`) son los de aquella semana: Ana acababa de nacer, el
 *   pediatra de los 14 días caía ese miércoles. Con la fecha de hoy la pantalla
 *   enseñaría lo mismo pero marcado como atrasado, que es lo contrario de lo que
 *   se quiere enseñar. Congelarlo también hace la captura reproducible: dos
 *   ejecuciones distintas dan el mismo píxel.
 * - **Se sirve `npm run dev`, y se esconde la burbuja de las Dev Tools de Next**
 *   (`nextjs-portal`), que si no sale flotando en una esquina de cada captura.
 *   Compilar un build de producción solo para esto costaría un minuto largo y no
 *   cambia ni un píxel de lo que se fotografía.
 *
 *   node scripts/gen-capturas.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const RAIZ    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SALIDA  = path.join(RAIZ, 'public', 'capturas')
const PUERTO  = 3102 // ni el 3000 de `npm run dev` ni el 3100 de la suite
const BASE    = `http://localhost:${PUERTO}`
const INSTANTE = new Date('2026-06-17T09:40:00')

// Los mismos placeholders que usa `playwright.config.ts` para forzar el modo
// demo: Next no pisa lo que ya está en el entorno, así que ganan sobre
// `.env.local` y las capturas nunca salen con datos de una familia real.
const ENTORNO_DEMO = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'your-supabase-project-url',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key',
}

/**
 * Qué se fotografía. `espera` es un texto que solo aparece cuando la pantalla ya
 * ha cargado de verdad: sin eso se capturan esqueletos. Se pide **visible** y no
 * "presente": el calendario pinta las etiquetas de los eventos de las cuatro
 * vistas a la vez y esconde las de las que no se están mirando, así que un
 * `waitFor` a secas se quedaba esperando a un botón que nunca se iba a ver.
 */
const PANTALLAS = [
  { ruta: '/home',     nombre: 'inicio',     espera: 'Buenos días' },
  { ruta: '/calendar', nombre: 'calendario', espera: 'Abuelos vienen a merendar' },
  { ruta: '/tasks',    nombre: 'tareas',     espera: 'Dar vitamina D a Ana' },
  { ruta: '/lists',    nombre: 'listas',     espera: 'Compra bebé' },
  { ruta: '/meals',    nombre: 'comidas',    espera: 'Pollo al horno con patatas' },
  { ruta: '/finanzas', nombre: 'finanzas',   espera: 'Compra semanal' },
  { ruta: '/notes',    nombre: 'notas',      espera: 'Wifi de casa' },
]

/** Espera a que el servidor conteste, sin dar por hecho cuánto tarda en arrancar. */
async function esperarServidor(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(`${BASE}/auth/login`)
      if (res.ok) return
    } catch {
      // aún no escucha
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error(`El servidor no respondió en ${BASE} tras ${intentos} s`)
}

/**
 * En Windows matar el proceso de npm deja vivo al de Next, que se queda con el
 * puerto y la siguiente ejecución falla. `taskkill /T` se lleva el árbol entero.
 */
function matarArbol(proc) {
  if (process.platform === 'win32') spawn('taskkill', ['/pid', proc.pid, '/T', '/F'])
  else proc.kill('SIGTERM')
}

// Un solo string y no [comando, args]: con `shell: true` Node avisa (DEP0190) de
// que no escapa los argumentos, y aquí no hay ninguno que venga de fuera.
const servidor = spawn(`npm run dev -- --port ${PUERTO}`, {
  cwd: RAIZ,
  env: ENTORNO_DEMO,
  shell: true,
  stdio: 'ignore',
})

try {
  process.stdout.write(`Levantando Farpi en modo demo (${BASE})…\n`)
  await esperarServidor()
  await mkdir(SALIDA, { recursive: true })

  const navegador = await chromium.launch()
  const contexto = await navegador.newContext({
    // Un iPhone normal: 390 px es el ancho que la app se compromete a soportar
    // (`e2e/movil.spec.ts`), y a 3x la captura aguanta una pantalla de retina.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    colorScheme: 'light',
  })
  await contexto.clock.setFixedTime(INSTANTE)

  // La burbuja de las Dev Tools de Next y la barra de scroll, fuera: ni una ni
  // otra son la app, y en una captura de móvil las dos cantan.
  const MAQUILLAJE = `
    nextjs-portal { display: none !important }
    ::-webkit-scrollbar { display: none }
    html { scrollbar-width: none }
  `

  const pagina = await contexto.newPage()

  for (const { ruta, nombre, espera } of PANTALLAS) {
    await pagina.goto(`${BASE}${ruta}`)
    await pagina.addStyleTag({ content: MAQUILLAJE })
    await pagina.getByText(espera).filter({ visible: true }).first().waitFor({ timeout: 20_000 })
    // El ancla dice que la pantalla ya está montada; este respiro es para que
    // terminen las transiciones de entrada y no se fotografíe nada a medio opacar.
    await pagina.waitForTimeout(600)
    const destino = path.join(SALIDA, `${nombre}.png`)
    await pagina.screenshot({ path: destino })
    process.stdout.write(`  ${ruta} → public/capturas/${nombre}.png\n`)
  }

  await navegador.close()
  process.stdout.write(`\n${PANTALLAS.length} capturas en public/capturas/.\n`)
} finally {
  matarArbol(servidor)
}
