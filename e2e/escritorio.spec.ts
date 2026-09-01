import { test, expect } from '@playwright/test'
import { abrirBloque } from './vistas'

// Escritorio, desde `lg` (1024 px). El resto de la suite corre en un Pixel 7,
// así que sin esto nada vigilaría el layout ancho: la barra lateral podría
// desaparecer o la rejilla de comidas romperse y todo seguiría en verde.
//
// Las dos mitades importan por igual. Que en escritorio manda `SideNav`, y que
// **por debajo de `lg` no cambia nada**, que es la condición con la que se hizo:
// de ahí el test a 1023 px, un píxel por debajo del corte.

const RUTAS = ['/home', '/calendar', '/tasks', '/lists', '/meals', '/finanzas', '/docs', '/settings']

// `SideNav` tiene nombre accesible; `BottomNav` no, así que se localiza por lo
// que la define: la barra pegada abajo. Si algún día se le pone un aria-label,
// esto se cambia por getByRole.
const BARRA_ABAJO = 'nav.fixed.bottom-0'

// El botón de guardar del sheet del calendario, por lo que es y no por lo que
// dice: desde que el `+` de la cabecera se llama "Apuntar algo", buscar el
// guardar por /Apuntar/ engancha los dos y Playwright para por ambigüedad.
const GUARDAR_EVENTO = 'button[type="submit"][form="event-form"]'

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

/**
 * Columnas de una caja de tarjetas, localizada por el `space-y-3` que lleva de
 * base y por tener varias tarjetas dentro. `0` si no es rejilla.
 */
async function columnasDeTarjetas(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const caja = [...document.querySelectorAll('div')].find(
      el => el.className.toString().includes('space-y-3') && el.querySelectorAll(':scope > button').length >= 2
    )
    if (!caja) return -1
    const cols = getComputedStyle(caja).gridTemplateColumns
    return cols === 'none' ? 0 : cols.split(' ').length
  })
}

test.describe('escritorio a 1440 px', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

  test('manda la barra lateral y desaparece la de abajo', async ({ page }) => {
    await page.goto('/meals')
    await page.waitForTimeout(800)

    const lateral = page.getByRole('navigation', { name: 'Secciones' })
    await expect(lateral).toBeVisible()
    await expect(page.locator(BARRA_ABAJO)).toBeHidden()

    for (const nombre of ['Inicio', 'Calendario', 'Listas', 'Tareas', 'Comidas', 'Notas', 'Documentos']) {
      await expect(lateral.getByRole('link', { name: nombre })).toBeVisible()
    }

    // El pie: el nombre de quien mira y Ajustes, que es el único camino a
    // Ajustes en escritorio. Es una fila y no un menú que abrir, así que se
    // comprueba que lleva directa a la pantalla, que abre en Familia.
    await expect(lateral.getByText('Omar')).toBeVisible()
    await lateral.getByRole('link', { name: 'Ajustes' }).click()
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole('tab', { name: 'Familia' })).toHaveAttribute('aria-selected', 'true')
  })

  // En escritorio la celda del mes escribe los títulos de lo que hay ese día, y
  // tienen que abrir el evento. Estuvieron pintados y muertos: la celda era un
  // solo botón —no caben botones dentro de un botón— y pulsar un título
  // seleccionaba el día sin abrir nada.
  test('un título escrito en la celda del mes abre su evento', async ({ page }) => {
    const hoy = new Date()
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    await page.goto('/calendar')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
    await page.locator('#event-title').fill('Revisión del coche')
    await page.locator('#event-date').fill(iso)
    await page.locator('#event-start').fill('10:00')
    await page.locator(GUARDAR_EVENTO).click()
    await page.waitForTimeout(700)

    // El botón de la rejilla y no la fila de la agenda de al lado: `exact` los
    // separa, porque la fila de la agenda se llama "10:00 Revisión del coche
    // Familia" y el título de la celda se llama solo como el evento.
    const enLaRejilla = page.getByRole('button', { name: 'Revisión del coche', exact: true })
    await expect(enLaRejilla).toHaveCount(1)
    await enLaRejilla.click()

    await expect(page.getByRole('dialog', { name: 'Editar lo apuntado' })).toBeVisible()
  })

  // El trio de vistas de escritorio. La semana en columnas no existe en móvil
  // —a 390 px cada columna son ~45 px— así que este es el único sitio donde se
  // puede comprobar que el eje de horas se pinta y que sus bloques se abren.
  test('las vistas Día, Semana y Mes enseñan cada una lo suyo', async ({ page }) => {
    const hoy = new Date()
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

    await page.goto('/calendar')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
    await page.locator('#event-title').fill('Pediatra Ana')
    await page.locator('#event-date').fill(iso)
    await page.locator('#event-start').fill('09:30')
    await page.locator('#event-end').fill('10:15')
    await page.locator(GUARDAR_EVENTO).click()
    await page.waitForTimeout(700)

    // Semana: siete columnas de día y el eje de horas con su bloque.
    await page.getByRole('button', { name: 'Semana', exact: true }).click()
    await page.waitForTimeout(500)
    for (const dia of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      await expect(page.getByText(dia, { exact: true })).toBeVisible()
    }
    const bloque = page.getByRole('button', { name: '09:30 Pediatra Ana' })
    await expect(bloque).toHaveCount(1)

    // Y el bloque abre su evento, que es lo que se espera de un calendario.
    await bloque.click()
    await expect(page.getByRole('dialog', { name: 'Editar lo apuntado' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // Día: una sola columna, con el nombre del día entero y no abreviado.
    await page.getByRole('button', { name: 'Día', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: '09:30 Pediatra Ana' })).toHaveCount(1)
    await expect(page.getByText('Sáb', { exact: true })).toHaveCount(0)

    // Mes: vuelve la rejilla y con ella la agenda de al lado, que el eje no lleva.
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    await page.waitForTimeout(500)
    await expect(page.getByPlaceholder('Buscar…')).toBeVisible()
  })

  // Una ausencia se marca con una franja pegada al borde de arriba de la celda,
  // sobre un carril gris. La posición —fuera del flujo donde van las cosas del
  // día— es lo que la separa de la etiqueta de un evento; el carril es lo que la
  // hace visible con cualquier color. La celda **no** se tiñe: la trama es de la
  // casa entera (finde y festivos), no de una persona.
  test('una ausencia pone su franja en la celda del mes', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
    await page.locator('#event-kind').selectOption('descanso')
    await page.locator('#event-date').fill('2026-08-11')
    await page.locator('#event-end-date').fill('2026-08-12')
    await page.getByRole('button', { name: 'Sofía' }).click()
    await page.locator(GUARDAR_EVENTO).click()
    await page.waitForTimeout(700)

    // Los dos días del rango quedan marcados, cada uno con su franja.
    const celda = page.locator('[aria-pressed][aria-label*="descansando"]')
    await expect(celda).toHaveCount(2)
    await expect(page.locator('.franja-ausencia')).toHaveCount(2)

    // Y no se tiñen: el 11 y el 12 de agosto de 2026 son martes y miércoles.
    await expect(page.locator('.dia-libre').filter({ has: celda })).toHaveCount(0)

    // Y el nombre sale una sola vez, en "Vacaciones y descansos", que nace
    // plegado: hasta que no se abre, del bloque solo se ve el título.
    await expect(page.getByRole('button', { name: /Sofía descansa/ })).toHaveCount(0)
    await abrirBloque(page, 'Vacaciones y descansos')
    await expect(page.getByRole('button', { name: /Sofía descansa/ })).toHaveCount(1)
  })

  // Un festivo se apunta como los otros tres tipos y se pinta en la celda con su
  // nombre. En gris y no en la paleta: no es de nadie, y darle el amarillo de
  // "Familia" lo confundiría con unas vacaciones de todos.
  test('un festivo se apunta y se nombra en la celda', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
    await page.locator('#event-kind').selectOption('festivo')

    // Como en vacaciones y descansos: días completos, dos fechas y sin horas.
    await expect(page.locator('#event-end-date')).toBeVisible()
    await expect(page.locator('#event-start')).toHaveCount(0)

    await page.locator('#event-title').fill('Hispanidad')
    await page.locator('#event-date').fill('2026-08-12')
    await page.locator('#event-end-date').fill('2026-08-12')
    await page.locator(GUARDAR_EVENTO).click()
    await page.waitForTimeout(700)

    const celda = page.locator('[aria-pressed][aria-label*="12 de agosto"]')
    await expect(celda.getByText('Hispanidad', { exact: true })).toHaveCount(1)
  })

  // El título es opcional, como en los otros dos de rango. Pero un festivo sin
  // nombre propio **no escribe nada en la celda**: de que el día es festivo ya
  // avisa la trama, y poner "FESTIVO" encima sería decirlo dos veces gastando la
  // única línea de texto que tiene la celda.
  test('un festivo sin nombre propio no escribe nada en la celda', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
    await page.locator('#event-kind').selectOption('festivo')
    await page.locator('#event-date').fill('2026-08-19')
    await page.locator('#event-end-date').fill('2026-08-19')
    await page.locator(GUARDAR_EVENTO).click()
    await page.waitForTimeout(700)

    const celda = page.locator('[aria-pressed][aria-label*="19 de agosto"]')
    await expect(celda.getByText('Festivo', { exact: true })).toHaveCount(0)

    // Pero el día sí queda marcado como día libre, que es lo que tenía que pasar.
    await expect(page.locator('.dia-libre').filter({ has: celda })).toHaveCount(1)
  })

  // Elegir un día en la rejilla tiene que contestar **también en escritorio**.
  // El panel del día nació con `lg:hidden` el 28-08-2026 dando por hecho que
  // aquí no hacía falta —la celda escribe títulos y la agenda está al lado—, y
  // era falso: la agenda arranca en hoy y solo pinta días con algo, así que
  // elegir el 19 mirando el 28 pintaba el número de verde y no pasaba nada más.
  test('elegir un día enseña qué hay ese día, también en escritorio', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(900)
    await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
    await page.locator('#event-title').fill('Revisión del coche')
    await page.locator('#event-date').fill('2026-08-18')
    await page.locator('#event-start').fill('10:30')
    await page.locator(GUARDAR_EVENTO).click()
    await page.waitForTimeout(700)

    const panel = page.getByRole('region', { name: /Qué hay el 18 de agosto/ })
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Revisión del coche')

    // Y un día vacío también contesta, que es la mitad que faltaba: sin esto,
    // elegir un día sin nada se lee igual que un fallo.
    await page.locator('[aria-pressed][aria-label*="19 de agosto"]').click()
    const vacio = page.getByRole('region', { name: /Qué hay el 19 de agosto/ })
    await expect(vacio).toContainText('Nada apuntado')
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

  // A 1440 px estamos por encima de `xl` (1280), así que toca la de tres.
  test('en Listas las tarjetas van en rejilla', async ({ page }) => {
    await page.goto('/lists')
    await page.waitForTimeout(800)
    expect(await columnasDeTarjetas(page), 'las listas no están en rejilla').toBe(3)
  })

  test('al abrir una lista, ocupa más que la columna de móvil', async ({ page }) => {
    await page.goto('/lists')
    await page.waitForTimeout(800)
    await page.getByText('Farmacia').first().click()
    await page.waitForTimeout(500)

    const ancho = await page.evaluate(() => {
      const caja = document.querySelector('main h1')?.closest('.flex.flex-col.h-full')?.parentElement
      return caja ? getComputedStyle(caja).maxWidth : ''
    })
    // `lg:max-w-3xl` = 48rem. En móvil son 32rem (`max-w-lg`).
    expect(ancho).toBe('768px')
  })

  test('en Documentos las tarjetas van en rejilla', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForTimeout(800)
    expect(await columnasDeTarjetas(page), 'los documentos no están en rejilla').toBe(3)
  })

  test('los filtros de Documentos no se arrastran, caben los cinco', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForTimeout(800)

    const filtros = page.getByRole('button', { name: 'Todos' })
    const medidas = await filtros.evaluate(el => {
      const caja = el.parentElement!
      return { scroll: caja.scrollWidth, ancho: caja.clientWidth }
    })
    expect(medidas.scroll, 'la fila de filtros se arrastra en horizontal').toBeLessThanOrEqual(medidas.ancho + 1)
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

  test('las tarjetas de Listas siguen en una sola columna', async ({ page }) => {
    await page.goto('/lists')
    await page.waitForTimeout(800)
    expect(await columnasDeTarjetas(page), 'la rejilla de Listas se ha colado por debajo de lg').toBe(0)
  })

  test('una lista abierta conserva el ancho de móvil', async ({ page }) => {
    await page.goto('/lists')
    await page.waitForTimeout(800)
    await page.getByText('Farmacia').first().click()
    await page.waitForTimeout(500)

    const ancho = await page.evaluate(() => {
      const caja = document.querySelector('main h1')?.closest('.flex.flex-col.h-full')?.parentElement
      return caja ? getComputedStyle(caja).maxWidth : ''
    })
    expect(ancho).toBe('512px')
  })

  test('las tarjetas de Documentos siguen en una sola columna', async ({ page }) => {
    await page.goto('/docs')
    await page.waitForTimeout(800)
    expect(await columnasDeTarjetas(page), 'la rejilla de Documentos se ha colado por debajo de lg').toBe(0)
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
