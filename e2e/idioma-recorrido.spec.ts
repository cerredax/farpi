import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// La app entera en inglés, pantalla a pantalla (29-09-2026): con la cookie en
// inglés, ningún texto de la interfaz puede quedar en castellano.
//
// Se mira **todo el DOM**, no solo lo visible: un sheet cerrado está en la
// página (es `inert`, no se desmonta), así que sus rótulos, sus `placeholder` y
// sus mensajes entran en el recorrido sin tener que abrirlo. Y los atributos que
// lee un lector de pantalla (`aria-label`, `placeholder`, `title`, `alt`).
//
// **Los datos de demo no cuentan**: son de una familia de aquí y están en
// castellano («Pediatra de Cris»), como estarían los de cualquiera. Se quitan
// de cada texto antes de mirarlo, sacados de `src/lib/store/db.ts`. Un texto
// que es solo contenido de la persona y no se reconoce como dato se marca con
// `translate="no"` (el atributo estándar), y el recorrido se lo salta.
//
// Para ver qué le falta a una pantalla: `npx playwright test
// e2e/idioma-recorrido.spec.ts -g "/calendar"`.

/** Todos los textos de los datos de ejemplo, de más largo a más corto para quitar primero el entero. */
const DATOS_DE_DEMO = (() => {
  const fuente = readFileSync('src/lib/store/db.ts', 'utf-8')
  const literales = [...fuente.matchAll(/'((?:[^'\\\n]|\\.)*)'|`([^`$]*)`/g)].map(m => (m[1] ?? m[2] ?? '').trim())
  return [...new Set(literales.filter(l => l.length > 1))].sort((a, b) => b.length - a.length)
})()

/**
 * Palabras que solo existen en castellano. No lleva las que también son
 * inglesas («no», «a», «me»): una lista así caza de sobra, porque una frase de
 * la interfaz casi nunca se escribe sin una de estas.
 */
const PALABRAS = [
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'con', 'para', 'por', 'que', 'sin', 'una', 'uno', 'un',
  'hoy', 'ayer', 'semana', 'mes', 'meses', 'dia', 'todo', 'todos', 'todas', 'nada', 'nuevo', 'nueva',
  'guardar', 'cancelar', 'borrar', 'eliminar', 'editar', 'buscar', 'cerrar', 'abrir', 'volver',
  'pendiente', 'pendientes', 'hecho', 'hecha', 'tarea', 'tareas', 'lista', 'listas', 'comida', 'comidas',
  'gasto', 'gastos', 'ingreso', 'ingresos', 'documento', 'documentos', 'nota', 'notas', 'familia', 'casa',
  'hay', 'cuando', 'ninguna', 'ninguno', 'este', 'esta', 'esto', 'otro', 'otra', 'ya', 'al', 'lo', 'se',
  'su', 'sus', 'mi', 'tu', 'tus', 'pon', 'elige', 'apunta', 'desde', 'hasta', 'entre', 'cada', 'mas',
]

interface Pantalla {
  ruta: string
  /** Lo que hay que tocar antes de mirar, para llegar a lo que la ruta no enseña de entrada. */
  preparar?: (page: Page, paso: number) => Promise<void>
  /** Cuántas veces se prepara y se mira (una por vista del calendario, por ejemplo). */
  pasos?: number
}

/** Las vistas del calendario, por su posición en el menú: el nombre cambia con el idioma. */
async function vistaDelCalendario(page: Page, paso: number) {
  if (paso === 0) return
  await page.locator('main button[aria-haspopup="menu"]').click()
  await page.getByRole('menuitemradio').nth(paso - 1).click()
  await page.waitForTimeout(400)
}

const PANTALLAS: Pantalla[] = [
  { ruta: '/home' },
  { ruta: '/calendar', preparar: vistaDelCalendario, pasos: 5 },
  { ruta: '/tasks' },
  { ruta: '/lists' },
  { ruta: '/meals' },
  { ruta: '/finances' },
  { ruta: '/finances/importar' },
  { ruta: '/notes' },
  { ruta: '/docs' },
  { ruta: '/birthdays' },
  { ruta: '/settings' },
  { ruta: '/settings?seccion=familia' },
  { ruta: '/settings?seccion=casa' },
  { ruta: '/settings?seccion=cuenta' },
  { ruta: '/settings?seccion=legal' },
  { ruta: '/auth/login' },
  { ruta: '/onboarding' },
  { ruta: '/offline' },
  { ruta: '/no-disponible' },
]

/** Los textos del DOM que siguen en castellano, quitados los datos de demo. */
async function textosEnCastellano(page: Page): Promise<string[]> {
  return page.evaluate(({ datos, palabras }) => {
    const soloCastellano = new Set(palabras)
    const quitaDatos = (texto: string) => datos.reduce((resto, dato) => resto.split(dato).join(' '), texto)
    const suenaACastellano = (texto: string) => {
      const resto = quitaDatos(texto)
      if (/[áéíóúñ¿¡ü]/i.test(resto)) return true
      return resto.toLowerCase().split(/[^\p{L}]+/u).some(p => soloCastellano.has(p))
    }
    const saltar = (el: Element | null) =>
      !el || !!el.closest('script, style, noscript, [translate="no"], nextjs-portal')

    const encontrados = new Set<string>()
    const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let nodo = recorrido.nextNode(); nodo; nodo = recorrido.nextNode()) {
      const texto = (nodo.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (texto && !saltar(nodo.parentElement) && suenaACastellano(texto)) encontrados.add(texto)
    }
    for (const el of document.body.querySelectorAll('[aria-label], [placeholder], [title], [alt]')) {
      if (saltar(el)) continue
      for (const atributo of ['aria-label', 'placeholder', 'title', 'alt']) {
        const valor = el.getAttribute(atributo)?.trim()
        if (valor && suenaACastellano(valor)) encontrados.add(`[${atributo}] ${valor}`)
      }
    }
    // El título de la pestaña también se lee.
    if (suenaACastellano(document.title)) encontrados.add(`[title] ${document.title}`)
    return [...encontrados]
  }, { datos: DATOS_DE_DEMO, palabras: PALABRAS.map(p => p.normalize('NFD').replace(/\p{M}/gu, '')) })
}

/**
 * Las pantallas que aún tienen castellano dentro (30-09-2026), a la espera de
 * migrarse a `useT()`. **Se van quitando de aquí una a una**: al sacar una ruta,
 * el recorrido pasa a exigirle que no quede ni un texto en castellano.
 *
 * Inicio arrastra los sheets de Calendario y de Tareas; Ajustes, `MemberSheet` y
 * sus hermanos. Mientras estén aquí, el inglés no se ofrece (`IDIOMAS_OFRECIDOS`).
 */
const SIN_MIGRAR = new Set([
  '/home', '/calendar', '/tasks', '/finances', '/finances/importar', '/notes', '/docs', '/birthdays',
  '/settings', '/settings?seccion=familia', '/settings?seccion=casa', '/settings?seccion=cuenta',
  '/settings?seccion=legal',
])

test.describe('la app en inglés', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().addCookies([{ name: 'farpi_idioma', value: 'en', url: 'http://localhost:3100' }])
  })

  for (const { ruta, preparar, pasos = 1 } of PANTALLAS) {
    test(`ningún texto en castellano en ${ruta}`, async ({ page }) => {
      test.fixme(SIN_MIGRAR.has(ruta), 'pantalla pendiente de migrar a useT()')
      await page.goto(ruta)
      await page.waitForTimeout(900)

      const sueltos = new Set<string>()
      for (let paso = 0; paso < pasos; paso++) {
        if (preparar) await preparar(page, paso)
        for (const texto of await textosEnCastellano(page)) sueltos.add(texto)
      }
      expect([...sueltos], `En ${ruta} queda texto en castellano`).toEqual([])
    })
  }
})
