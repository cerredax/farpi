import { test, expect } from '@playwright/test'
import { abrirBloque, elegirVista } from './vistas'
import { cabecera, concepto, final, finFichero, movimiento } from './n43-fixture'
import { cabeceraBbva, filaBbva, xlsx } from './xlsx-fixture'

// Smoke mínimo en modo demo: login demo → /home con datos mock.

// La portada enseña capturas de la app de verdad, generadas por
// `scripts/gen-capturas.mjs`. Si alguien renombra una pantalla y no vuelve a
// lanzarlo, el archivo deja de existir y la portada se queda con huecos: el
// navegador no avisa de una imagen rota, así que se pregunta por `naturalWidth`.
test('la portada enseña el acceso y las capturas cargan', async ({ page }) => {
  await page.goto('/')

  // El formulario de verdad está en la propia portada desde el 01-09-2026, así
  // que aquí se ve lo mismo que en `/auth/login`: en modo demo, el aviso de que
  // no hay Supabase detrás. Que salga **este** cartel y no un botón es la
  // prueba de que la portada monta `AuthCard` y no una copia suya.
  await expect(page.locator('#entrar').getByText('Modo local activo')).toBeVisible()

  // Y en la barra no queda **ningún** enlace de cuenta: ni al login ni al
  // formulario de aquí abajo. Aquí ya no se navega para entrar, se entra.
  await expect(page.getByRole('link', { name: 'Entrar', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveCount(0)

  const primera = page.getByRole('img', { name: /Pantalla de Inicio/ })
  await expect(primera).toBeVisible()
  expect(await primera.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
})

test('la pantalla de login muestra el modo demo', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByText('Modo local activo')).toBeVisible()
})

test('home carga con datos demo y la navegación inferior', async ({ page }) => {
  await page.goto('/home')

  // La cabecera dice en qué pantalla estás, y en Inicio también (04-09-2026):
  // era la única de la app donde ponía "Farpi" en vez del nombre de la sección.
  await expect(page.getByRole('heading', { level: 1, name: 'Inicio' })).toBeVisible()

  // La navegación inferior está presente con sus secciones.
  await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Comidas' })).toBeVisible()

  // Documentos ya no es una pastilla de la barra (28-08-2026): está en "Más",
  // la sexta, con Ajustes. Es además el único camino a Ajustes en móvil desde
  // que la cabecera no lleva icono de cuenta, así que se comprueba entero.
  await expect(page.getByRole('link', { name: 'Docs' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Más' }).click()
  const mas = page.getByRole('dialog', { name: 'Más' })
  // Y en este orden, que también se decidió: Cumpleaños va encima de Documentos,
  // que entre las cuatro es la que menos se abre. La última fila de una lista es
  // el sitio de lo que menos se usa, no el de lo último que se añadió.
  const enMas = ['Finanzas', 'Notas', 'Cumpleaños', 'Documentos', 'Ajustes']
  for (const [i, fila] of enMas.entries()) {
    await expect(mas.getByRole('link').nth(i)).toHaveAccessibleName(fila)
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

// El sheet de tareas se cierra cuando la tarea **ya se ha guardado**. Se cerraba al
// pulsar, y con la red caída lo escrito se perdía: el aviso salía con el sheet
// cerrado y había que volver a teclearla. El fallo se fuerza haciendo que el mock
// no pueda crear el id, que es lo primero que hace al guardar.
test('si una tarea no se guarda, el sheet sigue abierto con lo escrito', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nueva tarea' })
  await dialog.getByRole('textbox', { name: 'Tarea', exact: true }).fill('Comprar cortinas')

  await page.evaluate(() => { crypto.randomUUID = () => { throw new Error('sin conexión') } })
  await dialog.getByRole('button', { name: 'Crear tarea' }).click()

  // Sigue abierto, con el texto, y el botón vuelve a estar pulsable.
  await expect(page.getByText('No se ha guardado')).toBeVisible()
  await expect(dialog).not.toHaveAttribute('inert', '')
  await expect(dialog.getByRole('textbox', { name: 'Tarea', exact: true })).toHaveValue('Comprar cortinas')
  await expect(dialog.getByRole('button', { name: 'Crear tarea' })).toBeEnabled()
  await expect(page.getByText('Comprar cortinas')).toHaveCount(0) // no está en la lista: el campo no cuenta como texto

  // Con la red de vuelta, el mismo botón guarda y ahora sí cierra.
  await page.evaluate(() => { delete (crypto as { randomUUID?: unknown }).randomUUID })
  await dialog.getByRole('button', { name: 'Crear tarea' }).click()
  await expect(dialog).toHaveAttribute('inert', '')
  await expect(page.getByText('Comprar cortinas')).toBeVisible()
})

// Lo que se apunta en una nota se pega en otro sitio: la clave del wifi, un
// teléfono. Al editarla hay un botón que copia lo escrito en el campo, y en una
// nota nueva, donde no hay nada que copiar, no está.
test('una nota se puede copiar entera al editarla', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/notes')

  await page.getByRole('button', { name: 'Nueva nota' }).click()
  const alta = page.getByRole('dialog', { name: 'Nueva nota' })
  await expect(alta.getByRole('button', { name: 'Copiar contenido' })).toHaveCount(0)
  await alta.getByRole('textbox', { name: 'Título' }).fill('Alarma del garaje')
  await alta.getByRole('textbox', { name: /Contenido/ }).fill('Red: ALARMA_G\nClave: tortuga-azul-42')
  await alta.getByRole('button', { name: 'Crear nota' }).click()

  await page.getByRole('button', { name: /Alarma del garaje/ }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar nota' })
  await edicion.getByRole('button', { name: 'Copiar contenido' }).click()
  await expect(edicion.getByRole('button', { name: 'Copiado' })).toBeVisible()
  // El portapapeles de Windows guarda los saltos como \r\n: se compara sin esa diferencia del sistema.
  const copiado = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n')
  expect(copiado).toBe('Red: ALARMA_G\nClave: tortuga-azul-42')
})

// Lo que apunta otra persona se ve sin recargar. La otra persona es aquí otra
// pestaña del mismo navegador: en modo demo comparten `localStorage`, y la app
// vuelve a leerlo antes de refrescar. El minuto se adelanta con el reloj del
// test en vez de esperarlo.
test('lo que apunta otra persona aparece sin recargar la pantalla', async ({ page, context }) => {
  await page.clock.install()
  await page.goto('/tasks')
  await expect(page.getByText('Sacar la basura')).toBeVisible()

  const otra = await context.newPage()
  await otra.goto('/tasks')
  await otra.getByRole('button', { name: 'Nueva tarea' }).click()
  const alta = otra.getByRole('dialog', { name: 'Nueva tarea' })
  await alta.getByRole('textbox', { name: 'Tarea', exact: true }).fill('Llamar al fontanero')
  await alta.getByRole('button', { name: 'Crear tarea' }).click()
  await expect(otra.getByText('Llamar al fontanero')).toBeVisible()

  // Todavía no ha pasado el minuto: esta pantalla sigue como estaba.
  await expect(page.getByText('Llamar al fontanero')).toHaveCount(0)

  await page.clock.fastForward(65_000)
  await expect(page.getByText('Llamar al fontanero')).toBeVisible()
})

// «¿Qué me toca a mí?»: con tareas de más de una persona, una fila de chips filtra
// por quién las tiene. En los datos de demo hay de Carlos (que es quien está
// dentro), de María, de Cris y de toda la casa.
test('las tareas se pueden filtrar por persona, y «Mías» es la de quien está dentro', async ({ page }) => {
  await page.goto('/tasks')
  const filtro = page.getByRole('group', { name: 'Filtrar por persona' })
  await expect(filtro).toBeVisible()
  await expect(page.getByText('Poner una lavadora')).toBeVisible() // de María

  await filtro.getByRole('button', { name: 'Mías' }).click()
  await expect(page.getByText('Llamar al seguro del coche')).toBeVisible() // de Carlos
  await expect(page.getByText('Poner una lavadora')).toHaveCount(0)
  await expect(page.getByText('Sacar la basura')).toHaveCount(0) // de nadie: es de la casa

  await filtro.getByRole('button', { name: 'Familia' }).click()
  await expect(page.getByText('Sacar la basura')).toBeVisible()
  await expect(page.getByText('Llamar al seguro del coche')).toHaveCount(0)

  await filtro.getByRole('button', { name: 'Todas' }).click()
  await expect(page.getByText('Poner una lavadora')).toBeVisible()
  await expect(page.getByText('Llamar al seguro del coche')).toBeVisible()
})

// Quién marcó una tarea como hecha, escrito en ella. Antes se guardaba y no se
// enseñaba en ninguna parte.
test('una tarea completada dice quién la hizo', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  const alta = page.getByRole('dialog', { name: 'Nueva tarea' })
  await alta.getByRole('textbox', { name: 'Tarea', exact: true }).fill('Regar el jardín')
  await alta.getByRole('button', { name: 'Crear tarea' }).click()
  await expect(alta).toHaveAttribute('inert', '')

  // El botón de marcar se llama igual en todas las filas: se coge el de la de esta tarea.
  const fila = page.getByText('Regar el jardín').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")][1]')
  await fila.getByRole('button', { name: 'Marcar como completada' }).click()
  await page.getByRole('button', { name: /^Completadas/ }).click()
  await expect(page.getByText('Hecha por Carlos').first()).toBeVisible()
})

// Una serie semanal ya no obliga a poner fecha de fin y admite «una semana sí y
// otra no». Sin fin no es infinito: cada ocurrencia es una fila, así que se
// apuntan las 52 semanas del tope, y el formulario lo dice antes de guardar.
test('un evento se repite cada dos semanas y sin fecha de fin', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await sheet.locator('#event-title').fill('Recoger a los abuelos')
  await sheet.locator('#event-date').fill('2027-03-01') // lunes
  await sheet.getByRole('button', { name: 'Cada semana' }).click()
  await sheet.getByRole('button', { name: '2 semanas' }).click()

  // Sin fecha de fin: lo dice, y cuenta bien. 52 semanas desde el lunes 1 son 27 lunes alternos.
  await expect(sheet.getByText('una semana sí y otra no')).toBeVisible()
  await expect(sheet.getByText('durante las próximas 52 semanas')).toBeVisible()
  await expect(sheet.getByText('Se crearán 27 eventos.')).toBeVisible()
  await sheet.locator(GUARDAR_EVENTO).click()

  const fechas: string[] = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').events ?? [])
      .filter((e: { title: string }) => e.title === 'Recoger a los abuelos')
      .map((e: { start_at: string }) => e.start_at.slice(0, 10))
      .sort())
  expect(fechas).toHaveLength(27)
  expect(fechas[0]).toBe('2027-03-01')
  // Todas a catorce días de la anterior, y todas lunes.
  const dias = fechas.map(f => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) / 86_400_000)
  expect(dias.slice(1).map((d, i) => d - dias[i]).every(paso => paso === 14)).toBe(true)
  expect(fechas.every(f => new Date(f + 'T12:00:00').getDay() === 1)).toBe(true)
})

// La semana de Comidas en el móvil eran los siete días desde hoy y no había más:
// planificar la semana que viene era imposible desde el móvil. Ahora se pasa de
// semana en las dos direcciones, y «Volver a hoy» solo sale estando en otra.
test('en el móvil se puede pasar de semana en Comidas y volver a hoy', async ({ page }) => {
  await page.goto('/meals')
  await page.getByRole('button', { name: 'Esta semana', exact: true }).click()
  const rango = page.locator('p[aria-live="polite"]')
  const hoy = await rango.innerText()
  await expect(page.getByRole('button', { name: 'Volver a hoy' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Semana siguiente' }).click()
  await expect(rango).not.toHaveText(hoy)
  const siguiente = await rango.innerText()
  await expect(page.getByRole('button', { name: 'Volver a hoy' })).toBeVisible()

  // La fila con los tres controles es la más apretada: a 390 px no desborda.
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  // Y hacia atrás: dos semanas menos son la anterior a hoy, distinta de las dos.
  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await page.getByRole('button', { name: 'Semana anterior' }).click()
  await expect(rango).not.toHaveText(hoy)
  await expect(rango).not.toHaveText(siguiente)

  await page.getByRole('button', { name: 'Volver a hoy' }).click()
  await expect(rango).toHaveText(hoy)
  await expect(page.getByRole('button', { name: 'Volver a hoy' })).toHaveCount(0)
})

// Pedir el aviso de un evento («30 minutos antes»). Se mira lo guardado y no solo
// la pantalla: lo que el cron lee es la columna, y un selector que enseña «30
// minutos antes» sin guardarlo avisaría a nadie.
test('un plan con hora puede pedir que se avise antes, y se guarda', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await sheet.locator('#event-title').fill('Pediatra de aviso')
  await sheet.locator('#event-date').fill('2027-04-12')

  // Sin hora no hay cuándo avisar: pedirlo y guardar dice qué falta.
  await sheet.getByRole('button', { name: '30 minutos antes' }).click()
  await sheet.locator(GUARDAR_EVENTO).click()
  await expect(sheet.getByText('Pon la hora de inicio para que el aviso sepa cuándo llegar.')).toBeVisible()

  await sheet.locator('#event-start').fill('10:30')
  await sheet.locator(GUARDAR_EVENTO).click()
  await expect(sheet).toHaveAttribute('inert', '')

  const guardado = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').events ?? [])
      .find((e: { title: string }) => e.title === 'Pediatra de aviso'))
  expect(guardado.remind_before_minutes).toBe(30)
})

test('el aviso no se ofrece en un evento de todo el día ni en un cumpleaños', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await expect(sheet.getByRole('button', { name: '30 minutos antes' })).toBeVisible()

  // Todo el día: no hay hora de la que restar.
  await sheet.getByRole('switch').click()
  await expect(sheet.getByRole('button', { name: '30 minutos antes' })).toHaveCount(0)
  await sheet.getByRole('switch').click()
  await expect(sheet.getByRole('button', { name: '30 minutos antes' })).toBeVisible()

  // Un cumpleaños ocupa el día entero y ya lo cuenta el resumen de las siete.
  await sheet.locator('#event-kind').selectOption('cumple')
  await expect(sheet.getByRole('button', { name: '30 minutos antes' })).toHaveCount(0)
})

test('un aviso pedido y luego pasado a «todo el día» se guarda sin aviso', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await sheet.locator('#event-title').fill('Cambia de idea')
  await sheet.locator('#event-date').fill('2027-04-13')
  await sheet.locator('#event-start').fill('09:00')
  await sheet.getByRole('button', { name: '1 hora antes' }).click()
  await sheet.getByRole('switch').click() // ahora es de todo el día
  await sheet.locator(GUARDAR_EVENTO).click()
  await expect(sheet).toHaveAttribute('inert', '')

  const guardado = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').events ?? [])
      .find((e: { title: string }) => e.title === 'Cambia de idea'))
  expect(guardado.all_day).toBe(true)
  expect(guardado.remind_before_minutes).toBeNull()
})

// Los dos crons se llaman sin sesión —Vercel el de las siete, Supabase el de cada
// evento—, así que el proxy los tiene que dejar pasar por el prefijo `/api/cron/` y
// el `CRON_SECRET` es su única defensa. Aquí se comprueba lo que se puede sin base
// real: que la ruta existe, que **no** se manda a nadie al login (un 307 con un
// `fetch` que lo sigue parece un 200) y que sin el secreto correcto no atiende.
for (const ruta of ['/api/cron/reminders', '/api/cron/event-reminders']) {
  test(`${ruta} no atiende sin el secreto y no redirige al login`, async ({ request }) => {
    const sinNada = await request.get(ruta, { maxRedirects: 0 })
    // 503 si el servidor no tiene CRON_SECRET, 401 si lo tiene: las dos son un no.
    expect([401, 503]).toContain(sinNada.status())

    const conOtro = await request.get(ruta, { maxRedirects: 0, headers: { Authorization: 'Bearer secreto-que-no-es' } })
    expect([401, 503]).toContain(conOtro.status())
  })
}

// Crear una familia de más y volver a cerrarla, que es el caso por el que se
// añadió el borrado: se crea una por probar y hasta ahora no había forma de
// quitarla. El sheet la borra y la app salta sola a la que queda.
test('una familia creada se puede eliminar y la app vuelve a la anterior', async ({ page }) => {
  await page.goto('/settings')

  // En móvil Ajustes abre en el índice de secciones; la familia está en la
  // primera fila.
  await page.getByRole('link', { name: 'Familia' }).click()

  await page.getByRole('button', { name: '+ Nueva familia' }).click()
  await page.getByPlaceholder('Nombre de la familia').fill('Familia de prueba')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()

  // Al crearla se queda activa: sale en la tarjeta de arriba y, ya con dos, en
  // la lista para cambiar de familia.
  await expect(page.getByText('Familia de prueba')).toHaveCount(2)

  await page.getByRole('button', { name: 'Editar familia' }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar familia' })
  await edicion.getByRole('button', { name: 'Eliminar familia' }).click()

  // El sheet se convierte en la pregunta: cambia de título y dice lo que se
  // lleva por delante, que es lo que un doble toque no puede contar.
  const pregunta = page.getByRole('dialog', { name: 'Eliminar familia' })
  await expect(pregunta.getByText(/No se puede deshacer/)).toBeVisible()

  // Y cancelar devuelve el formulario tal como estaba, con el nombre puesto.
  await pregunta.getByRole('button', { name: 'Cancelar' }).click()
  await expect(edicion.getByLabel('Nombre')).toHaveValue('Familia de prueba')

  await edicion.getByRole('button', { name: 'Eliminar familia' }).click()
  await pregunta.getByRole('button', { name: 'Sí, borrarla con todo' }).click()

  await expect(page.getByText('Familia de prueba')).toHaveCount(0)
  await expect(page.getByText('Familia de Carlos, María y Cris')).toBeVisible()
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
  // tiene tareas repartidas, así que "Familia" y "Carlos" tienen grupo propio.
  await expect(page.getByRole('region', { name: 'Agenda por persona' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Familia' })).toBeVisible()

  // Y dentro ya no se repite de quién es cada línea: la única etiqueta con
  // nombre en el grupo es su propio rótulo. Se cuenta en el de una persona y
  // no en el de la familia, donde lo de todos nunca llevó etiqueta y la cuenta
  // daría uno aunque las filas siguieran diciendo el nombre. Contarlas, además,
  // porque buscar el texto tampoco valdría: el rótulo va en mayúsculas por CSS
  // y una comparación con "Carlos" pasaría sin mirar las filas.
  await expect(page.getByRole('region', { name: 'Carlos' }).locator('.etiqueta-persona')).toHaveCount(1)
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
 * La pantalla de Cumpleaños: los doce meses que vienen, de una vez.
 *
 * Lo que se prueba aquí es lo que no se ve en un unitario. Que la lista **junta
 * los dos orígenes** —Cris sale de su fecha de nacimiento sin que nadie haya
 * apuntado nada, la abuela de un cumpleaños apuntado— y que el `+` abre el
 * sheet del calendario **sin el selector de "Qué es"**: quien entra por aquí ya
 * ha elegido qué está apuntando.
 */
test('los cumpleaños se ven todos juntos y se apuntan desde su pantalla', async ({ page }) => {
  const hoy = new Date()
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  await page.goto('/birthdays')

  // Cris está sin haber apuntado nada: su cumpleaños se deduce de la fecha de
  // nacimiento que tiene en Ajustes.
  await expect(page.getByText('Cris')).toBeVisible()

  await page.getByRole('button', { name: 'Apuntar un cumpleaños' }).click()
  await expect(page.locator('#event-kind')).toHaveCount(0)
  await page.locator('#event-title').fill('Abuela Carmen')
  await page.locator('#event-date').fill(iso)
  await page.locator(GUARDAR_EVENTO).click()

  // Y baja a la lista, el primero: es hoy.
  const filas = page.getByRole('listitem')
  await expect(filas.filter({ hasText: 'Abuela Carmen' })).toContainText('Hoy')

  // Y se corrige sin salir de aquí: la fila del apuntado abre el mismo sheet,
  // ya en edición. Antes había que ir a buscarlo al bloque del calendario, y
  // solo si caía en el mes que se estuviera mirando.
  await page.getByRole('button', { name: 'Editar el cumpleaños de Abuela Carmen' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar lo apuntado' })).toBeVisible()
  await page.locator('#event-title').fill('Abuela Carmen Ruiz')
  await page.locator('#event-birth-year').fill('1949')
  await page.locator(GUARDAR_EVENTO).click()

  const anos = hoy.getFullYear() - 1949
  await expect(filas.filter({ hasText: 'Abuela Carmen Ruiz' })).toContainText(`cumple ${anos} años`)

  // El de quien es de la casa no abre formulario: no está apuntado en ninguna
  // parte, se deduce de su fecha de nacimiento, y la fila lleva a donde vive.
  await expect(page.getByRole('link', { name: /Cambiar la fecha de nacimiento de Cris/ }))
    .toHaveAttribute('href', '/settings?seccion=familia')

  // Con un tercero aparece el buscador —el umbral es el mismo que en las
  // listas— y la lista ya viene repartida por meses. Lo de los meses se prueba
  // aquí porque `agrupaCumplesPorMes` solo dice qué grupos salen, no que la
  // pantalla los pinte; lo del buscador, porque filtra sobre lo agrupado.
  const dentroDeUnMes = new Date(hoy)
  dentroDeUnMes.setDate(dentroDeUnMes.getDate() + 40)
  const isoLejos = `${dentroDeUnMes.getFullYear()}-${String(dentroDeUnMes.getMonth() + 1).padStart(2, '0')}-${String(dentroDeUnMes.getDate()).padStart(2, '0')}`

  await page.getByRole('button', { name: 'Apuntar un cumpleaños' }).click()
  await page.locator('#event-title').fill('Tío Paco')
  await page.locator('#event-date').fill(isoLejos)
  await page.locator(GUARDAR_EVENTO).click()

  const mesDeHoy = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(hoy)
  const rotulo = mesDeHoy.charAt(0).toUpperCase() + mesDeHoy.slice(1)
  await expect(page.getByRole('heading', { name: rotulo, exact: true })).toBeVisible()

  // Sin tildes y sin mayúsculas, como en las listas: nadie las escribe al buscar.
  await page.getByRole('searchbox', { name: 'Buscar un cumpleaños por nombre' }).fill('tio paco')
  await expect(filas.filter({ hasText: 'Tío Paco' })).toBeVisible()
  await expect(page.getByText('Abuela Carmen Ruiz')).toHaveCount(0)
})

/**
 * Corregir un cumpleaños apuntado corrige **toda la serie**.
 *
 * Un cumpleaños apuntado son unas veinte filas, una por año. Editar solo la que
 * se abría dejaba el nombre o el día viejos en las demás, y el error salía al año
 * siguiente. Se mira lo guardado y no solo la pantalla: la pantalla enseña la
 * próxima fila, y las otras diecinueve no se ven.
 */
test('corregir un cumpleaños apuntado corrige toda la serie, no una copia', async ({ page }) => {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = (d: number) => String(d).padStart(2, '0')
  const diaOriginal = hoy.getDate() === 15 ? 14 : 15
  const diaNuevo = diaOriginal + 2

  await page.goto('/birthdays')
  await page.getByRole('button', { name: 'Apuntar un cumpleaños' }).click()
  await page.locator('#event-title').fill('Tía Rosa')
  await page.locator('#event-date').fill(`${hoy.getFullYear()}-${mes}-${dia(diaOriginal)}`)
  await page.locator(GUARDAR_EVENTO).click()

  const guardadas = () => page.evaluate<{ titulo: string, fecha: string, grupo: string | null }[]>(() =>
    (JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').events ?? [])
      .filter((e: { title: string }) => e.title.startsWith('Tía Rosa'))
      .map((e: { title: string, start_at: string, recurrence_group_id: string | null }) => ({
        titulo: e.title,
        fecha: e.start_at.slice(0, 10),
        grupo: e.recurrence_group_id,
      })))

  const antes = await guardadas()
  expect(antes.length).toBeGreaterThan(5)

  await page.getByRole('button', { name: 'Editar el cumpleaños de Tía Rosa' }).click()
  await page.locator('#event-title').fill('Tía Rosa Pérez')
  await page.locator('#event-date').fill(`${hoy.getFullYear()}-${mes}-${dia(diaNuevo)}`)
  await page.locator(GUARDAR_EVENTO).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Tía Rosa Pérez' })).toBeVisible()

  const despues = await guardadas()
  // Ninguna fila se pierde, ninguna se queda con el nombre viejo, y todas caen el día nuevo…
  expect(despues.length).toBe(antes.length)
  expect(despues.every(e => e.titulo === 'Tía Rosa Pérez')).toBe(true)
  expect(new Set(despues.map(e => e.fecha.slice(5))).size).toBe(1)
  expect(despues[0].fecha.slice(5)).toBe(`${mes}-${dia(diaNuevo)}`)
  // …cada una en su año, y siguen siendo una sola serie.
  expect(new Set(despues.map(e => e.fecha.slice(0, 4))).size).toBe(despues.length)
  expect(new Set(despues.map(e => e.grupo)).size).toBe(1)
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

  // Un día cualquiera que no sea hoy. El 3 y el 4 están siempre en la rejilla y,
  // en el demo, no tienen nada apuntado; se coge el que no caiga hoy.
  //
  // El día se elegía a pelo y era el 3, con este mismo comentario al lado: así
  // que el 3 de cada mes el test pinchaba **hoy** y luego comprobaba que el panel
  // de hoy no sale, que es justo lo que la app hace bien. Fallaba un día de cada
  // treinta, y el aviso llegaba en la pasada previa al commit de otra cosa.
  const diaSuelto = new Date().getDate() === 3 ? 4 : 3
  await page.locator(`button[aria-label*="${diaSuelto} de"]`).first().click()
  const panel = page.getByRole('region', { name: /Qué hay el/ })
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Nada apuntado.')).toBeVisible()

  // Y desde ahí se apunta algo en ese día, sin pasar por el `+` de arriba.
  await panel.getByRole('button', { name: /^Apuntar algo el/ }).click()
  await expect(page.getByRole('dialog', { name: 'Apuntar en el calendario' })).toBeVisible()
  await page.keyboard.press('Escape')

  // Y en móvil sale también con hoy elegido (28-09-2026): la agenda ya no va
  // debajo del mes, así que el panel es la única respuesta y va siempre en el
  // mismo sitio. Lo que viene está a un toque, en la vista Agenda.
  await page.getByRole('button', { name: /hoy|,/ }).first().waitFor({ state: 'attached' })
  const hoy = new Date()
  await page.locator(`button[aria-label*="${hoy.getDate()} de"]`).first().click()
  await expect(panel).toBeVisible()
  await expect(page.getByText('Elige un día para ver qué tiene.')).toBeHidden()
  await page.getByRole('button', { name: 'Ver todo lo que viene' }).click()
  await expect(page.locator('main button[aria-haspopup="menu"]')).toHaveText(/Agenda/)
})

/**
 * Los días de los meses vecinos se ven en gris **y se pueden tocar**
 * (28-09-2026): llevan a su mes con el día elegido, desde donde se apunta. Se
 * busca un mes que acabe antes del domingo, que es cuando la última fila presta
 * días del siguiente; en el peor caso hay que avanzar uno o dos.
 */
test('un día del mes siguiente se toca y lleva a su mes', async ({ page }) => {
  await page.goto('/calendar')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  let mes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  for (let i = 0; i < 3; i++) {
    const siguiente = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    const celda = page.locator(`button[aria-label*=", 1 de ${meses[siguiente.getMonth()]}"]`)
    if (await celda.count() > 0) {
      await celda.first().click()
      await expect(celda.first()).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('region', { name: `Qué hay el 1 de ${meses[siguiente.getMonth()]}` })).toBeVisible()
      return
    }
    await page.getByRole('button', { name: 'Mes siguiente' }).click()
    mes = siguiente
  }
  throw new Error('En tres meses no salió ningún día del mes siguiente')
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

  // Por `data-eje` y no por la clase: el filtro de personas también se desliza
  // a lo ancho y estaba antes en la página.
  const eje = page.locator('[data-eje]').first()
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
 * servido, y está contado en `docs/project-status.md` y en el commit que la trajo.
 */
test('la ruta de salud contesta y no se cachea', async ({ request }) => {
  const res = await request.get('/api/salud')

  expect(res.status()).toBe(200)
  expect(res.headers()['cache-control']).toContain('no-store')
  expect(await res.json()).toEqual({ estado: 'demo' })
})

/**
 * El extracto del banco: de un fichero de la Norma 43 a «El día a día».
 *
 * Se prueba en el navegador y no solo en unitarios porque lo que hay que ver es
 * justo lo que no se ve desde `importacion.ts`: que el fichero sube, que la fila
 * que ya está cubierta por un fijo **llega desmarcada y con su motivo escrito**,
 * que lo confirmado aparece luego en la lista del mes, y que volver a subir el
 * mismo fichero no lo apunta otra vez.
 *
 * Ese último caso es el que paga el `import_ref` de la base: sin él, importar
 * dos veces el mismo mes —que es lo que pasa en cuanto alguien pide un rango de
 * fechas solapado— duplicaría todo el extracto sin que nadie lo notara hasta
 * mirar la cuenta del mes.
 */
test('el extracto del banco se revisa antes de apuntarlo, y no entra dos veces', async ({ page }) => {
  const hoy = new Date()
  const aammdd = `${String(hoy.getFullYear()).slice(2)}${String(hoy.getMonth() + 1).padStart(2, '0')}${String(hoy.getDate()).padStart(2, '0')}`

  // Dos movimientos que son los dos casos de la pantalla: una compra, que es un
  // gasto de la casa, y un recibo de 74,00 € que es el fijo «Luz y gas» de la
  // demo, que ya está contado en la plantilla del mes.
  const fichero = [
    cabecera({ desde: aammdd, hasta: aammdd, saldo: 150000 }),
    movimiento({ fecha: aammdd, valor: aammdd, comun: '12', signo: '1', importe: 2345 }),
    concepto('COMPRA EN SUPERMERCADO'),
    movimiento({ fecha: aammdd, valor: aammdd, comun: '03', signo: '1', importe: 7400 }),
    final({ apuntesDebe: 2, totalDebe: 9745, saldo: 150000 - 9745 }),
    finFichero,
  ].join('\n')

  const subir = () => page.locator('input[type="file"]').setInputFiles({
    // Los bancos lo mandan en ISO-8859-1, que es lo que había cuando se escribió
    // la norma: se sube con esa codificación para probar el camino de verdad.
    name: 'extracto.n43', mimeType: 'text/plain', buffer: Buffer.from(fichero, 'latin1'),
  })

  await page.goto('/finances/importar')
  await subir()

  // La compra entra marcada y con la partida que suena por el nombre.
  const compra = page.getByRole('checkbox', { name: /Compra en supermercado/ })
  await expect(compra).toBeChecked()
  await expect(page.getByRole('combobox', { name: /Compra en supermercado/ })).toHaveValue('b1')

  // El recibo no, y dice por qué. Esto es lo que evita contar la luz dos veces.
  await expect(page.getByRole('checkbox', { name: /Recibo domiciliado/ })).not.toBeChecked()
  await expect(page.getByText('Esto suele estar en «Luz y gas» (74,00 €)')).toBeVisible()

  await page.getByRole('button', { name: 'Apuntar 1 movimiento' }).click()
  await expect(page.getByText('Ya están apuntados 1 movimiento')).toBeVisible()

  // Y está en el mes, como un apunte más: desde aquí ya no se distingue de uno
  // tecleado a mano, que es como tiene que ser.
  await page.goto('/finances')
  await expect(page.getByText('Compra en supermercado').first()).toBeVisible()

  // El mismo fichero otra vez: ya no hay nada que apuntar.
  await page.goto('/finances/importar')
  await subir()
  await expect(page.getByText('Ya se apuntó en una importación anterior')).toBeVisible()
  await expect(page.getByRole('button', { name: 'No has marcado ninguno' })).toBeDisabled()
})

/**
 * El `.txt` del Sabadell, que no da la Norma 43, por la misma pantalla.
 *
 * Lo que hay que ver aquí es que el recibo, que en este fichero no trae clave
 * de la AEB y se reconoce por la referencia del acreedor, **sigue llegando
 * desmarcado por el fijo**, y que la tarjeta no aparece en lo que se apuntaría.
 */
test('el .txt del Sabadell se lee igual, sin el número de la tarjeta', async ({ page }) => {
  const hoy = new Date()
  const dia = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

  // Lo más reciente arriba y el saldo que deja cada línea, como lo da el banco.
  const fichero = [
    `${dia}|LUZ Compañía Eléctrica, S.A.|${dia}|-74.00|1402.55|A00000000000|0000001`,
    `${dia}|COMPRA TARJ. 5402XXXXXXXX1111 PANADERIA-OVIEDO|${dia}|-23.45|1476.55||5402__1111`,
  ].join('\n') + '\n'

  await page.goto('/finances/importar')
  await page.locator('input[type="file"]').setInputFiles({
    name: '23092026_0000_0000000000.txt', mimeType: 'text/plain', buffer: Buffer.from(fichero, 'latin1'),
  })

  await expect(page.getByRole('checkbox', { name: /Panaderia-oviedo/ })).toBeChecked()
  await expect(page.getByText(/5402/)).toHaveCount(0)

  await expect(page.getByRole('checkbox', { name: /LUZ Compañía Eléctrica/ })).not.toBeChecked()
  await expect(page.getByText('Esto suele estar en «Luz y gas» (74,00 €)')).toBeVisible()
})

/**
 * El Excel del BBVA. Lo que no se ve desde los unitarios es que la pantalla
 * pase los **bytes** y no el texto: un `.xlsx` leído como texto es basura, y el
 * error solo aparecería en el navegador.
 */
test('el Excel del BBVA se lee igual, sin la tarjeta entera', async ({ page }) => {
  const hoy = new Date()
  const dia = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`

  const libro = xlsx([
    ...cabeceraBbva(),
    filaBbva(dia, 'Adeudo mensual de tarjeta', '4552000011112222', -120, 1286),
    filaBbva(dia, 'Adeudo iberdrola clientes', 'Adeudo nº 2026240002003836', -74, 1406),
  ])

  await page.goto('/finances/importar')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Últimos movimientos.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: libro,
  })

  await expect(page.getByRole('checkbox', { name: /Adeudo mensual de tarjeta/ })).toBeChecked()
  await expect(page.getByText(/4552/)).toHaveCount(0)

  await expect(page.getByRole('checkbox', { name: /Adeudo iberdrola/ })).not.toBeChecked()
  await expect(page.getByText('Esto suele estar en «Luz y gas» (74,00 €)')).toBeVisible()
})

/**
 * Vaciar «El día a día» de un mes.
 *
 * Lo que hay que comprobar no es que borre —eso es un `delete`— sino **lo que
 * deja en pie**: los apuntes de los demás meses y el plan del mes. Son las dos
 * formas que tiene de salir mal, y las dos son irreversibles, así que valen un
 * test aunque el botón se pulse una vez al año.
 *
 * Lo de los otros meses se mira con el buscador, que cruza los meses: si junio
 * sigue ahí después de vaciar septiembre, el filtro por mes hizo su trabajo.
 */
test('borrar los apuntes del mes no se lleva ni los otros meses ni los fijos', async ({ page }) => {
  await page.goto('/finances')

  // Un apunte en el mes en curso, que es el que se va a borrar.
  await page.getByRole('button', { name: 'Nuevo apunte' }).click()
  await page.locator('#expense-amount').fill('12,34')
  await page.locator('#expense-description').fill('Apunte de prueba')
  await page.getByRole('button', { name: 'Apuntar gasto' }).click()

  // Dentro de la sección y no en la página entera: el sheet cerrado sigue
  // montado y lleva dentro las sugerencias, donde el texto también aparece.
  const diaADia = page.locator('section[aria-label="El día a día"]')
  await expect(diaADia).toContainText('Apunte de prueba')

  // El diálogo dice cuántos y cuánto, que es lo que deja darse cuenta de que el
  // mes abierto no era el que uno creía.
  await page.getByRole('button', { name: 'Borrar los apuntes del mes' }).click()
  await expect(page.getByText('12,34 € de gastos')).toBeVisible()
  await page.getByRole('button', { name: /Sí, borrar/ }).click()

  await expect(diaADia).not.toContainText('Apunte de prueba')
  await expect(diaADia).toContainText('Nada apuntado este mes')

  // Junio sigue entero: el buscador cruza los meses y ahí está.
  const buscador = page.getByLabel('Buscar en los apuntes')
  await buscador.fill('Compra semanal')
  await expect(page.getByText('Compra semanal').first()).toBeVisible()

  // Y el plan tampoco se ha tocado: esto vacía el día a día, no los fijos.
  await buscador.fill('')
  await page.getByRole('tab', { name: 'Fijos' }).click()
  await expect(page.locator('#panel-plantilla')).toContainText('Alquiler')
})
