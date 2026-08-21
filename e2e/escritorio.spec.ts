import { test, expect } from '@playwright/test'

// Escritorio, desde `lg` (1024 px). El resto de la suite corre en un Pixel 7,
// así que sin esto nada vigilaría el layout ancho: la barra lateral podría
// desaparecer o la rejilla de comidas romperse y todo seguiría en verde.
//
// Las dos mitades importan por igual. Que en escritorio manda `SideNav`, y que
// **por debajo de `lg` no cambia nada**, que es la condición con la que se hizo:
// de ahí el test a 1023 px, un píxel por debajo del corte.

const RUTAS = ['/home', '/calendar', '/tasks', '/lists', '/meals', '/docs', '/settings']

// `SideNav` tiene nombre accesible; `BottomNav` no, así que se localiza por lo
// que la define: la barra pegada abajo. Si algún día se le pone un aria-label,
// esto se cambia por getByRole.
const BARRA_ABAJO = 'nav.fixed.bottom-0'

/**
 * La rejilla de comidas, medida por lo que es y no por lo que dice: la única
 * con ocho columnas (la de la franja más los siete días). Buscarla por el texto
 * "Franja" no vale, porque el sheet de comidas cerrado tiene un campo que se
 * llama igual.
 */
async function medirRejilla(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const rejilla = [...document.querySelectorAll('div.grid')].find(
      el => getComputedStyle(el).gridTemplateColumns.split(' ').length === 8
    )
    if (!rejilla) return null
    let caja: HTMLElement | null = rejilla.parentElement
    while (caja && getComputedStyle(caja).overflowX !== 'auto') caja = caja.parentElement
    return {
      primeraColumna: getComputedStyle(rejilla).gridTemplateColumns.split(' ')[0],
      scroll: caja?.scrollWidth ?? 0,
      ancho: caja?.clientWidth ?? 0,
    }
  })
}

/**
 * Cuántas columnas tiene la rejilla de una sección, buscada por su título. `0`
 * si esa sección no es una rejilla, que es lo que tiene que pasar en móvil.
 */
async function columnasDeSeccion(page: import('@playwright/test').Page, titulo: string) {
  return page.evaluate(t => {
    const cabecera = [...document.querySelectorAll('h2')].find(h => h.textContent?.trim() === t)
    const seccion = cabecera?.closest('section')
    if (!seccion) return -1
    const cols = getComputedStyle(seccion).gridTemplateColumns
    return cols === 'none' ? 0 : cols.split(' ').length
  }, titulo)
}

test.describe('escritorio a 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

  test('manda la barra lateral y desaparece la de abajo', async ({ page }) => {
    await page.goto('/meals')
    await page.waitForTimeout(800)

    const lateral = page.getByRole('navigation', { name: 'Secciones' })
    await expect(lateral).toBeVisible()
    await expect(page.locator(BARRA_ABAJO)).toBeHidden()

    // Las seis secciones más Ajustes, que en móvil vive en la rueda de arriba.
    for (const nombre of ['Inicio', 'Calendario', 'Listas', 'Tareas', 'Comidas', 'Documentos', 'Ajustes']) {
      await expect(lateral.getByRole('link', { name: nombre })).toBeVisible()
    }
  })

  test('la sección donde estás se marca en la barra lateral', async ({ page }) => {
    await page.goto('/meals')
    await page.waitForTimeout(800)
    const lateral = page.getByRole('navigation', { name: 'Secciones' })
    await expect(lateral.getByRole('link', { name: 'Comidas' })).toHaveAttribute('aria-current', 'page')
    await expect(lateral.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current', 'page')
  })

  test('en Comidas se ven los siete días sin arrastrar la rejilla', async ({ page }) => {
    await page.goto('/meals')
    await page.waitForTimeout(800)

    // Un botón "Copiar" por día: si están los siete, están las siete columnas.
    await expect(page.getByRole('button', { name: /^Copiar menú del/ })).toHaveCount(7)

    // Y la rejilla entra en su caja: con la barra lateral quitando 224 px, el
    // mínimo de 860 px se salía y había que arrastrar donde sobra sitio.
    const medidas = await medirRejilla(page)
    expect(medidas, 'no se encontró la rejilla de ocho columnas').not.toBeNull()
    expect(medidas!.primeraColumna, 'en lg las columnas van apretadas').toBe('112px')
    expect(medidas!.scroll, 'la rejilla de comidas se arrastra en horizontal').toBeLessThanOrEqual(medidas!.ancho + 1)
  })

  test('en Tareas las pendientes van en dos columnas', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(800)

    expect(await columnasDeSeccion(page, 'Pendientes'), 'Pendientes no está en dos columnas').toBe(2)

    // La cabecera de la sección ocupa las dos, para que el recuento no se quede
    // colgando encima de una sola columna.
    const cabeceraAncha = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2')].find(x => x.textContent?.trim() === 'Pendientes')
      const seccion = h?.closest('section')
      if (!h || !seccion) return false
      return h.parentElement!.getBoundingClientRect().width > seccion.getBoundingClientRect().width * 0.9
    })
    expect(cabeceraAncha, 'la cabecera de Pendientes no ocupa el ancho').toBe(true)
  })

  for (const ruta of RUTAS) {
    test(`sin desbordamiento horizontal en ${ruta} a 1440 px`, async ({ page }) => {
      await page.goto(ruta)
      await page.waitForTimeout(700)

      const desborde = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        ancho: document.documentElement.clientWidth,
        culpables: [...document.querySelectorAll('*')]
          .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 5)
          .map(el => `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 60)}`),
      }))

      expect(desborde.scroll, `Se sale del ancho en ${ruta}: ${desborde.culpables.join(' | ')}`)
        .toBeLessThanOrEqual(desborde.ancho + 1)
    })
  }
})

// Un píxel por debajo del corte: aquí no ha cambiado nada y tiene que seguir
// mandando la barra de abajo.
test.describe('justo por debajo de lg, a 1023 px', () => {
  test.use({ viewport: { width: 1023, height: 900 }, isMobile: false, hasTouch: false })

  test('sigue la barra de abajo y no aparece la lateral', async ({ page }) => {
    await page.goto('/meals')
    await page.waitForTimeout(800)

    await expect(page.locator(BARRA_ABAJO)).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Secciones' })).toBeHidden()
  })

  test('en Tareas las pendientes siguen en una sola columna', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForTimeout(800)
    expect(await columnasDeSeccion(page, 'Pendientes'), 'la rejilla de dos columnas se ha colado por debajo de lg').toBe(0)
  })

  test('la rejilla de comidas conserva las columnas de siempre', async ({ page }) => {
    await page.goto('/meals')
    await page.waitForTimeout(800)

    // 132 px de columna de etiqueta: el valor de siempre, sin apretar. Si esto
    // se rompe, el cambio de escritorio se ha colado por debajo del corte.
    const medidas = await medirRejilla(page)
    expect(medidas, 'no se encontró la rejilla de ocho columnas').not.toBeNull()
    expect(medidas!.primeraColumna).toBe('132px')
  })
})
