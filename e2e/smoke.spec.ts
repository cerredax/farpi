import { test, expect } from '@playwright/test'
import { abrirBloque, elegirVista } from './vistas'

// Smoke mínimo en modo demo: login demo → /home con datos mock.

test('la pantalla de login muestra el modo demo', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByText('Modo local activo')).toBeVisible()
})

test('home carga con datos demo y la navegación inferior', async ({ page }) => {
  await page.goto('/home')

  // La navegación inferior está presente con sus secciones.
  await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Comidas' })).toBeVisible()

  // Documentos ya no es una pastilla de la barra (28-08-2026): está en "Más",
  // la sexta, con Ajustes. Es además el único camino a Ajustes en móvil desde
  // que la cabecera no lleva icono de cuenta, así que se comprueba entero.
  await expect(page.getByRole('link', { name: 'Docs' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Más' }).click()
  const mas = page.getByRole('dialog', { name: 'Más' })
  for (const fila of ['Notas', 'Documentos', 'Ajustes']) {
    await expect(mas.getByRole('link', { name: fila })).toBeVisible()
  }
  await mas.getByRole('link', { name: 'Documentos' }).click()
  await expect(page).toHaveURL(/\/docs/)
  await page.goBack()

  // El saludo abre la tarjeta del día y depende de la hora, así que vale
  // cualquiera de los tres. Se pinta ya en el navegador: en el HTML servido no
  // está, porque /home se prerenderiza.
  await expect(page.getByText(/Buenos días|Buenas tardes|Buenas noches/).first()).toBeVisible()
})

test('el sheet de tareas abre como diálogo con campos etiquetados', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Nueva tarea' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nueva tarea' })
  await expect(dialog).toBeVisible()

  // Los campos se localizan por su etiqueta (label ↔ input asociados).
  await expect(dialog.getByRole('textbox', { name: 'Tarea', exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Notas', exact: true })).toBeVisible()

  // Escape cierra el diálogo (pasa a estado inert).
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveAttribute('inert', '')
})

// Crear una familia de más y volver a cerrarla, que es el caso por el que se
// añadió el borrado: se crea una por probar y hasta ahora no había forma de
// quitarla. El sheet la borra y la app salta sola a la que queda.
test('una familia creada se puede eliminar y la app vuelve a la anterior', async ({ page }) => {
  await page.goto('/settings')

  await page.getByRole('button', { name: '+ Nueva familia' }).click()
  await page.getByPlaceholder('Nombre de la familia').fill('Familia de prueba')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()

  // Al crearla se queda activa: sale en la tarjeta de arriba y, ya con dos, en
  // la lista para cambiar de familia.
  await expect(page.getByText('Familia de prueba')).toHaveCount(2)

  await page.getByRole('button', { name: 'Editar familia' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar familia' })
  await dialog.getByRole('button', { name: 'Eliminar familia' }).click()
  // El aviso de lo que se lleva por delante solo aparece al pedir el borrado.
  await expect(dialog.getByText(/No se puede deshacer/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirmar: se borra todo' }).click()

  await expect(page.getByText('Familia de prueba')).toHaveCount(0)
  await expect(page.getByText('Familia de Omar, Sofía y Ana')).toBeVisible()
})

// El segundo eje de la agenda. Se prueba en el navegador y no en unitarios
// —el reparto ya lo cubre `agruparPorPersona`— porque lo que puede romperse
// aquí es el montaje: que las secciones se llamen como la persona y que la
// etiqueta de quién es desaparezca de las filas cuando el rótulo ya lo dice.
test('la agenda se puede agrupar por persona', async ({ page }) => {
  await page.goto('/calendar')
  await elegirVista(page, 'Agenda')

  const porPersona = page.getByRole('button', { name: 'Por persona' })
  await expect(porPersona).toHaveAttribute('aria-pressed', 'false')
  await porPersona.click()
  await expect(porPersona).toHaveAttribute('aria-pressed', 'true')

  // Cada persona con algo es una sección con su nombre. La familia de demo
  // tiene tareas repartidas, así que "Familia" y "Omar" tienen grupo propio.
  await expect(page.getByRole('region', { name: 'Agenda por persona' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Familia' })).toBeVisible()

  // Y dentro ya no se repite de quién es cada línea: la única etiqueta con
  // nombre en el grupo es su propio rótulo. Se cuenta en el de una persona y
  // no en el de la familia, donde lo de todos nunca llevó etiqueta y la cuenta
  // daría uno aunque las filas siguieran diciendo el nombre. Contarlas, además,
  // porque buscar el texto tampoco valdría: el rótulo va en mayúsculas por CSS
  // y una comparación con "Omar" pasaría sin mirar las filas.
  await expect(page.getByRole('region', { name: 'Omar' }).locator('.etiqueta-persona')).toHaveCount(1)
})

// El botón de guardar del sheet del calendario, por lo que es y no por lo que
// dice: buscarlo por /Apuntar/ engancharía también el `+` de la cabecera.
const GUARDAR_EVENTO = 'button[type="submit"][form="event-form"]'

/**
 * Los cumpleaños de fuera de casa: la abuela, el amigo del cole.
 *
 * Se prueba en el navegador y no solo en unitarios —`cumplesDeLaCasa` ya cubre
 * la cuenta— porque lo que puede romperse aquí es la costura: que el tipo de
 * evento fuerce la serie anual sin preguntar, que el cumpleaños suba al bloque
 * de la tarjeta de hoy y que **no** salga además como un plan más, que era la
 * forma en que se veía dos veces. Desde el 28-08-2026 su sitio en el calendario
 * es el bloque de debajo del mes, y ni la rejilla ni la agenda lo enseñan.
 */
test('un cumpleaños de fuera se apunta y sube a la tarjeta de hoy', async ({ page }) => {
  const hoy = new Date()
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  await page.locator('#event-kind').selectOption('cumple')

  // Un cumpleaños no tiene hora, no se asigna a nadie y no pregunta cada cuánto
  // se repite: es anual por definición.
  await expect(page.locator('#event-start')).toHaveCount(0)
  await expect(page.locator('#event-end-date')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cada año' })).toHaveCount(0)

  await page.locator('#event-title').fill('Abuela Carmen')
  await page.locator('#event-birth-year').fill('1949')
  await page.locator('#event-date').fill(iso)
  await page.locator(GUARDAR_EVENTO).click()

  // Un cumpleaños no es un plan, así que no baja a la lista: sale en su propio
  // bloque debajo del mes, al lado de "Vacaciones y descansos".
  // El bloque nace plegado: el título dice que hay uno y se abre quien quiera.
  await expect(page.getByRole('heading', { name: /Cumpleaños/ })).toBeVisible()
  await abrirBloque(page, 'Cumpleaños')
  const enElBloque = page.getByRole('button', { name: /Editar el cumpleaños de Abuela Carmen/ })
  await expect(enElBloque).toBeVisible()
  await expect(enElBloque).toContainText('hoy')

  // Y en la agenda no está: la lista contesta qué hay que hacer, y felicitar a
  // la abuela no ocupa una hora del jueves.
  await elegirVista(page, 'Agenda')
  await expect(page.getByText('Abuela Carmen').locator('visible=true')).toHaveCount(0)

  // Y en Inicio va arriba, con la edad que cumple, no en la lista de planes.
  await page.goto('/home')
  const anos = hoy.getFullYear() - 1949
  await expect(page.getByText(`Hoy Abuela Carmen cumple ${anos} años`)).toBeVisible()
})

// Sin año de nacimiento no hay edad, y la felicitación tiene que seguir
// funcionando: es el caso normal del amigo del cole.
test('un cumpleaños sin año de nacimiento se felicita sin edad', async ({ page }) => {
  const hoy = new Date()
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  await page.locator('#event-kind').selectOption('cumple')
  await page.locator('#event-title').fill('Nico del cole')
  await page.locator('#event-date').fill(iso)
  await page.locator(GUARDAR_EVENTO).click()

  await page.goto('/home')
  await expect(page.getByText('Hoy es el cumple de Nico del cole')).toBeVisible()
})

/**
 * Pasar de mes con el dedo.
 *
 * Se prueba en el navegador porque lo que puede romperse es justo lo que no se
 * ve en un unitario: que el gesto llegue a React desde dentro de la rejilla y
 * que un desliz vertical —el de leer la pantalla— no cambie de mes por el
 * camino.
 *
 * Los eventos táctiles se fabrican a mano: Playwright sabe tocar, pero no
 * arrastrar un dedo, y `touchstart`/`touchend` con la posición inicial y final
 * es exactamente lo que mira `useSwipe`.
 */
async function desliza(page: import('@playwright/test').Page, dx: number, dy: number) {
  await page.evaluate(({ dx, dy }) => {
    // Cualquier cosa de dentro de la rejilla vale: el gesto sube por burbujeo
    // hasta el contenedor que lo escucha.
    const dentro = document.querySelector('.grid.grid-cols-7')
    if (!dentro) throw new Error('no se encontró la rejilla del mes')
    const caja = dentro.getBoundingClientRect()
    const x = caja.left + caja.width / 2
    const y = caja.top + caja.height / 2
    const dedo = (cx: number, cy: number) =>
      new Touch({ identifier: 1, target: dentro, clientX: cx, clientY: cy })

    dentro.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, touches: [dedo(x, y)], targetTouches: [dedo(x, y)], changedTouches: [dedo(x, y)],
    }))
    dentro.dispatchEvent(new TouchEvent('touchend', {
      bubbles: true, touches: [], targetTouches: [], changedTouches: [dedo(x + dx, y + dy)],
    }))
  }, { dx, dy })
}

test('el mes se pasa arrastrando el dedo', async ({ page }) => {
  await page.goto('/calendar')
  const titulo = page.getByRole('heading', { level: 2 }).first()
  const agosto = await titulo.textContent()

  // Llevarse el mes hacia la izquierda trae el siguiente, como pasar una hoja.
  await desliza(page, -120, 0)
  await expect(titulo).not.toHaveText(agosto!)

  // Y hacia la derecha, el anterior: se vuelve a donde se estaba.
  await desliza(page, 120, 0)
  await expect(titulo).toHaveText(agosto!)

  // Bajar por la pantalla no es pasar de mes. Es el gesto que comparten los dos
  // y el que hay que dejar en paz.
  await desliza(page, 0, -150)
  await expect(titulo).toHaveText(agosto!)
})

/**
 * Elegir un día en la rejilla del mes tiene que **contestar algo**.
 *
 * Antes no contestaba: la idea era que la agenda de abajo se deslizara hasta el
 * día, pero esa lista arranca en hoy y solo pinta días con algo, así que un día
 * pasado —o uno futuro vacío— dejaba el número marcado y nada más. Se prueban
 * los dos casos que fallaban: el día de atrás y el día sin nada.
 */
test('elegir un día del mes enseña qué hay ese día', async ({ page }) => {
  await page.goto('/calendar')

  // Un día cualquiera que no sea hoy. El 3 siempre está en la rejilla y, en el
  // demo, no tiene nada apuntado.
  await page.locator('button[aria-label*="3 de"]').first().click()
  const panel = page.getByRole('region', { name: /Qué hay el/ })
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Nada apuntado.')).toBeVisible()

  // Y desde ahí se apunta algo en ese día, sin pasar por el `+` de arriba.
  await panel.getByRole('button', { name: /^Apuntar algo el/ }).click()
  await expect(page.getByRole('dialog', { name: 'Apuntar en el calendario' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Con hoy elegido no sale: la agenda de debajo ya empieza justo ahí.
  await page.getByRole('button', { name: /hoy|,/ }).first().waitFor({ state: 'attached' })
  const hoy = new Date()
  await page.locator(`button[aria-label*="${hoy.getDate()} de"]`).first().click()
  await expect(panel).toBeHidden()
})

/**
 * El selector de vista en móvil es **un botón que despliega las cuatro**, no una
 * banda de pastillas: se comía 48 px de pantalla todo el rato. Lo que se prueba
 * es que abre, que cambia de vista y que se cierra sin elegir nada.
 */
test('el selector de vista despliega y cambia de vista', async ({ page }) => {
  await page.goto('/calendar')
  const selector = page.locator('main button[aria-haspopup="menu"]')
  await expect(selector).toHaveText(/Mes/)

  await selector.click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitemradio', { name: 'Agenda', exact: true }).click()
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(selector).toHaveText(/Agenda/)

  // Escape lo cierra sin cambiar nada.
  await selector.click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(selector).toHaveText(/Agenda/)
})

/**
 * La semana, que a 390 px no cabe entera y se recorre a lo ancho.
 *
 * Dos cosas que se rompen solas y no se ven en un unitario:
 *
 * - **El canal de las horas se queda quieto.** Es lo único que dice a qué hora
 *   es un bloque, y depende de un `sticky` que solo funciona si la rejilla mide
 *   lo que su contenido: es un bloque, así que por defecto mide lo que la
 *   pantalla y el canal se iba con el desplazamiento.
 * - **Al pasar de semana, el eje vuelve al principio.** Si no, se llegaba a la
 *   semana siguiente mirando su domingo, sin haber visto el lunes, y el cambio
 *   no se notaba.
 */
test('la semana se recorre a lo ancho sin perder las horas', async ({ page }) => {
  await page.goto('/calendar')
  await elegirVista(page, 'Semana')

  const eje = page.locator('.overflow-x-auto').first()
  await expect(eje).toBeVisible()
  const canal = eje.locator('.sticky').first()

  // Hasta el final de la semana: el canal sigue pegado al borde izquierdo.
  await eje.evaluate(el => { el.scrollLeft = el.scrollWidth })
  await expect.poll(async () => {
    const [c, s] = await Promise.all([canal.boundingBox(), eje.boundingBox()])
    return Math.round((c?.x ?? 0) - (s?.x ?? 0))
  }).toBe(0)

  // Y al pasar de semana se vuelve al lunes, no al domingo de la siguiente.
  const titulo = page.getByRole('heading', { level: 2 }).first()
  const antes = await titulo.textContent()
  // Dos veces: la semana de al lado tiene hoy, y entonces el eje se coloca en
  // hoy a propósito. La de después ya no, así que empieza por el lunes.
  await page.getByRole('button', { name: /siguiente/i }).click()
  await page.getByRole('button', { name: /siguiente/i }).click()
  await expect(titulo).not.toHaveText(antes!)
  await expect.poll(() => eje.evaluate(el => el.scrollLeft)).toBe(0)
})

/**
 * La ruta que mira el vigía externo. En la suite corre en modo demo, así que lo
 * comprobable aquí es el contrato: que contesta, que no la cachea nadie por el
 * camino y que en demo ni intenta hablar con un Supabase que no existe.
 *
 * Que devuelva 503 cuando Supabase está caído no se puede probar desde aquí
 * —haría falta un Supabase caído—; eso se comprobó a mano contra el build
 * servido y está contado en `docs/historial.md`.
 */
test('la ruta de salud contesta y no se cachea', async ({ request }) => {
  const res = await request.get('/api/salud')

  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toContain('no-store')
  expect(await res.json()).toEqual({ estado: 'demo' })
})
