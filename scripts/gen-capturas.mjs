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
 * Y con la primera captura ya hecha compone además **la imagen de compartir**
 * (`public/og.png`, 1200×630): la que sale cuando alguien manda farpi.app por
 * WhatsApp. Va aquí y no en un script aparte porque necesita esa captura: dos
 * comandos que hay que lanzar en orden acaban lanzándose en el orden que no es.
 *
 *   node scripts/gen-capturas.mjs
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
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
  { ruta: '/calendar', nombre: 'calendario', espera: 'Cena con Marta y Javi' },
  {
    ruta: '/calendar',
    nombre: 'semana',
    espera: 'Cena con Marta y Javi',
    // La misma ruta con otra vista: el calendario abre en el mes y la semana
    // hay que pedirla. En móvil las cuatro vistas están detrás de un botón que
    // despliega, igual que en `e2e/vistas.ts`.
    async preparar(pagina) {
      await pagina.locator('main button[aria-haspopup="menu"]').click()
      await pagina.getByRole('menuitemradio', { name: 'Semana', exact: true }).click()
      await pagina.waitForTimeout(700)
    },
  },
  { ruta: '/tasks',    nombre: 'tareas',     espera: 'Dar la vitamina a Cris' },
  { ruta: '/lists',    nombre: 'listas',     espera: 'Bricolaje' },
  { ruta: '/meals',    nombre: 'comidas',    espera: 'Pollo al horno con patatas' },
  { ruta: '/finanzas', nombre: 'finanzas',   espera: 'Compra semanal' },
  { ruta: '/notes',    nombre: 'notas',      espera: 'Wifi de casa' },
  { ruta: '/docs',     nombre: 'documentos', espera: 'Seguro del coche' },
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
 * La imagen que se ve cuando alguien manda el enlace de Farpi por WhatsApp,
 * Telegram o cualquier sitio que lea las etiquetas `og:`. Sin ella el enlace
 * viaja pelado, y esta app se comparte por ahí y no por un buscador.
 *
 * Se compone en el propio navegador —una página suelta con `setContent`, la
 * captura de Inicio incrustada en base64 y la Nunito de siempre— y se
 * fotografía a 1200×630, que es lo que esperan todos. Los colores van en
 * literal porque aquí no llega `globals.css`: si cambia la paleta, hay que
 * cambiarlos también.
 */
async function componerOg(navegador) {
  const captura = await readFile(path.join(SALIDA, 'inicio.png'))
  const icono = await readFile(path.join(RAIZ, 'public', 'icon-192.png'))

  // Contexto propio: el de las capturas es un móvil a 3x, y esto no es ni lo
  // uno ni lo otro. **1200×630 clavados y sin retina**, que es la medida que
  // esperan WhatsApp, Telegram y los demás; a 3x pesaba el triple para una
  // miniatura que ninguno enseña por encima de 400 px de ancho.
  const contexto = await navegador.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
    locale: 'es-ES',
  })

  const pagina = await contexto.newPage()
  await pagina.setContent(`
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box }
      body {
        width: 1200px; height: 630px; display: flex; align-items: center; gap: 60px;
        padding: 0 72px; overflow: hidden;
        background: #FAF7F2; color: #252525;
        font-family: Nunito, system-ui, sans-serif;
      }
      .marca { display: flex; align-items: center; gap: 14px; margin-bottom: 32px }
      .marca img { width: 52px; height: 52px; border-radius: 15px }
      .marca span { font-size: 30px; font-weight: 900; letter-spacing: -0.02em }
      h1 { font-size: 60px; font-weight: 900; line-height: 1.05; letter-spacing: -0.03em }
      p { margin-top: 22px; font-size: 25px; line-height: 1.45; color: #77716A }
      .pie { margin-top: 32px; font-size: 21px; font-weight: 700; color: #5C7A59 }
      /* El móvil asoma por abajo y se sale del alto a propósito: enseñar la
         pantalla entera a esta escala la dejaría ilegible, y lo que tiene que
         reconocerse de un vistazo es que esto es una app de móvil. */
      .movil {
        flex-shrink: 0; width: 330px; margin-top: 170px;
        border-radius: 40px; border: 1px solid #EDE9E3; background: #F0EDE8;
        overflow: hidden; box-shadow: 0 30px 70px rgba(37,37,37,0.16);
      }
      .movil img { width: 100%; display: block }
    </style>
    <div>
      <div class="marca">
        <img src="data:image/png;base64,${icono.toString('base64')}" alt="">
        <span>Farpi</span>
      </div>
      <h1>Qué tenemos que saber hoy en casa.</h1>
      <p>El espacio privado de tu familia: agenda,<br>tareas, comidas y papeles importantes.</p>
      <div class="pie">www.farpi.app</div>
    </div>
    <div class="movil"><img src="data:image/png;base64,${captura.toString('base64')}" alt=""></div>
  `)

  // A que la Nunito esté cargada de verdad: sin esperarla, una de cada tres
  // veces la imagen sale con la tipografía de reserva.
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.waitForTimeout(500)
  await pagina.screenshot({ path: path.join(RAIZ, 'public', 'og.png') })
  await contexto.close()
  process.stdout.write('  compartir → public/og.png\n')
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

  for (const { ruta, nombre, espera, preparar } of PANTALLAS) {
    await pagina.goto(`${BASE}${ruta}`)
    await pagina.addStyleTag({ content: MAQUILLAJE })
    await pagina.getByText(espera).filter({ visible: true }).first().waitFor({ timeout: 20_000 })
    // Lo que haya que tocar antes de la foto: cambiar de vista, abrir algo.
    if (preparar) await preparar(pagina)
    // El ancla dice que la pantalla ya está montada; este respiro es para que
    // terminen las transiciones de entrada y no se fotografíe nada a medio opacar.
    await pagina.waitForTimeout(600)
    const destino = path.join(SALIDA, `${nombre}.png`)
    await pagina.screenshot({ path: destino })
    process.stdout.write(`  ${ruta} → public/capturas/${nombre}.png\n`)
  }

  await componerOg(navegador)

  await navegador.close()
  process.stdout.write(`\n${PANTALLAS.length} capturas en public/capturas/, y la imagen de compartir.\n`)
} finally {
  matarArbol(servidor)
}
