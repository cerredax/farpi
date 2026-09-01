import { test, expect, type Locator, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { abrirBloque, elegirVista } from './vistas'

// Recorre las pantallas en modo demo y verifica que cargan sin errores de
// consola ni excepciones no capturadas.

/**
 * Abre el montón de tareas del día en el calendario, si está plegado. Hoy
 * arrastra todo lo atrasado, así que casi siempre pasa de `TAREAS_PARA_PLEGAR`
 * y las tareas viven detrás de una línea de resumen. Es un toque, el mismo que
 * daría cualquiera que entre a marcar algo, y por eso el test lo da en vez de
 * saltárselo por dentro.
 *
 * Es idempotente sin comprobar nada: abierto, el botón pasa a llamarse "Ocultar
 * las tareas" y deja de casar con el patrón.
 */
async function abrirTareasDelDia(raiz: Page | Locator) {
  // El resumen dice "N tareas" o "N tareas atrasadas" según cuántas vayan
  // tarde, así que se busca por la parte que no cambia.
  const resumen = raiz.getByRole('button', { name: /^\d+ tareas/ })
  if (await resumen.count() > 0) await resumen.first().click()
}

/**
 * Se asegura de estar en la vista Mes.
 *
 * Es la de partida desde el 26-08-2026, así que casi siempre no hace nada; se
 * queda porque un test no debe depender de cuál sea el valor por defecto hoy, y
 * porque alguno llega aquí después de haber pasado por otra pestaña.
 */
async function verEnMes(page: Page) {
  await elegirVista(page, 'Mes')
  await page.waitForTimeout(300)
}

/**
 * Los dos tramos de la agenda que se pueden nombrar sin saber en qué día de la
 * semana corre el test. Desde que la agenda es una lista continua (25-08-2026)
 * cada tramo es su propia región, con el mismo nombre que su rótulo visible.
 *
 * "Hoy" y "Mañana" valen siempre: la lista arranca hoy, así que el primer tramo
 * es "Hoy" y el del día siguiente es "Mañana" —también en domingo—. Los demás
 * ("Esta semana", los meses) sí dependen del día, y por eso no se usan aquí.
 *
 * Un tramo sin nada no se pinta, así que estos localizadores pueden no resolver
 * a nada: es justo lo que comprueba el test de la tarea que se muda de día.
 */
function seccionDeHoy(page: Page): Locator {
  return page.getByRole('region', { name: 'Hoy', exact: true })
}

function seccionDeManana(page: Page): Locator {
  return page.getByRole('region', { name: 'Mañana', exact: true })
}

const ROUTES = [
  '/home',
  '/calendar',
  '/tasks',
  '/lists',
  '/meals',
  '/finanzas',
  '/notes',
  '/docs',
  '/settings',
  '/auth/login',
  '/privacidad',
  '/terminos',
]

for (const route of ROUTES) {
  test(`sin errores de consola ni runtime en ${route}`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`)
    })
    page.on('pageerror', err => problems.push(`pageerror: ${err.message}`))

    await page.goto(route)
    // Deja que el render de cliente y la carga async del store terminen.
    await page.waitForTimeout(800)

    expect(problems, `Problemas en ${route}:\n${problems.join('\n')}`).toEqual([])
  })
}

// Abrir y cerrar el sheet de creación en varias secciones ejercita los
// diálogos y las mutaciones del store sin depender de la bottom nav (que en
// dev queda parcialmente tapada por el indicador de Next.js).
const CREATE_SHEETS = [
  { route: '/tasks', button: 'Nueva tarea', dialog: 'Nueva tarea' },
  { route: '/lists', button: 'Nueva lista', dialog: 'Nueva lista' },
  { route: '/notes', button: 'Nueva nota', dialog: 'Nueva nota' },
  { route: '/finanzas', button: 'Nuevo gasto', dialog: 'Nuevo gasto' },
  { route: '/docs', button: 'Añadir documento', dialog: 'Añadir documento' },
  { route: '/calendar', button: 'Apuntar algo', dialog: 'Apuntar en el calendario' },
  { route: '/meals', button: 'Añadir comida', dialog: 'Añadir comida' },
]

for (const { route, button, dialog } of CREATE_SHEETS) {
  test(`abrir y cerrar el sheet de creación en ${route} sin errores`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`)
    })
    page.on('pageerror', err => problems.push(`pageerror: ${err.message}`))

    await page.goto(route)
    // `.first()`: en calendario y comidas el botón de añadir se repite por día.
    await page.getByRole('button', { name: button }).first().click()
    await expect(page.getByRole('dialog', { name: dialog })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    expect(problems, `Problemas en ${route}:\n${problems.join('\n')}`).toEqual([])
  })
}

// El callback de los enlaces de correo tiene que entender el fragmento de la
// URL: los enlaces de invitación devuelven la sesión (o el error) ahí, y el
// servidor nunca lo ve. Cuando esto se resolvía en el servidor, una invitación
// caducada dejaba al usuario en /home sin ninguna explicación.
test('el callback explica un enlace caducado en vez de dejar al usuario tirado', async ({ page }) => {
  await page.goto('/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
  await expect(page.getByText('No hemos podido abrir el enlace')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ir a iniciar sesión' })).toBeVisible()
})

// Un fallo al guardar tiene que verse. Antes el store registraba el error y
// nadie lo mostraba: la operación no ocurría y la app no decía nada.
test('avisa cuando una operación no se ha podido guardar', async ({ page }) => {
  await page.goto('/tasks')
  await page.waitForTimeout(600)

  // El store mock crea los ids con crypto.randomUUID: si falla, la escritura
  // revienta igual que lo haría un corte de red contra Supabase.
  await page.evaluate(() => {
    crypto.randomUUID = () => { throw new Error('Se ha perdido la conexión') }
  })

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.locator('#task-title').fill('Tarea que no se guardará')
  await page.getByRole('button', { name: 'Crear tarea' }).click()

  await expect(page.getByText('No se ha guardado el cambio')).toBeVisible()
  await expect(page.getByText('Se ha perdido la conexión')).toBeVisible()
  // Y no se ha creado nada a medias.
  await expect(page.getByText('Tarea que no se guardará')).toHaveCount(0)
})

// El buscador de una lista solo aparece cuando hay ítems suficientes para que
// buscar compense; en una lista recién creada estorbaría. Se parte de una lista
// nueva porque las de la demo ya superan el mínimo.
test('el buscador de ítems aparece al crecer la lista y filtra', async ({ page }) => {
  await page.goto('/lists')
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'Nueva lista' }).click()
  await page.locator('#list-name').fill('Lista de prueba')
  await page.getByRole('button', { name: 'Crear lista' }).click()
  await page.waitForTimeout(300)
  await page.getByText('Lista de prueba').first().click()

  const buscador = page.getByLabel('Buscar ítems en la lista')
  await expect(buscador).toHaveCount(0)

  for (const texto of ['Zumo de naranja', 'Leche entera', 'Galletas']) {
    await page.getByRole('button', { name: 'Añadir ítem' }).click()
    await page.locator('#item-text').fill(texto)
    await page.getByRole('button', { name: 'Añadir', exact: true }).click()
    await page.waitForTimeout(250)
  }

  await expect(buscador).toBeVisible()
  await buscador.fill('leche')
  await expect(page.getByText('Leche entera')).toBeVisible()
  await expect(page.getByText('Zumo de naranja')).toHaveCount(0)
})

// Asignar a un adulto: hasta la migración 012 solo se podía asignar a hijos, así
// que este test protege que los miembros sigan apareciendo en el selector.
test('un evento se puede asignar a un adulto y se ve quién es', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()

  const dialogo = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await expect(dialogo.getByRole('button', { name: 'Familia', exact: true })).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Omar', exact: true })).toBeVisible()

  await page.locator('#event-title').fill('Dentista')
  await dialogo.getByRole('button', { name: 'Sofía', exact: true }).click()
  await page.getByRole('button', { name: 'Apuntar', exact: true }).click()

  // En la agenda, el evento aparece con el nombre de la persona asignada.
  // (En la celda del día también, pero ahí es un tooltip que solo se ve al pasar
  // el ratón, así que no sirve para comprobarlo.)
  await expect(page.getByRole('button', { name: /Dentista/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Dentista.*Sofía/ })).toBeVisible()
})

// Vacaciones: un evento de varios días. Cubre que el formulario cambia de forma
// (dos fechas en vez de horas) y que el rango se guarda entero.
test('unas vacaciones ocupan todos los días del rango', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  await page.locator('#event-kind').selectOption('vacaciones')

  // En vacaciones se piden dos fechas y desaparecen las horas.
  await expect(page.locator('#event-end-date')).toBeVisible()
  await expect(page.locator('#event-start')).toHaveCount(0)

  await page.locator('#event-title').fill('Playa')
  await page.locator('#event-date').fill('2026-08-10')
  await page.locator('#event-end-date').fill('2026-08-16')
  await expect(page.getByRole('button', { name: 'Apuntar 7 días' })).toBeVisible()
  await page.getByRole('button', { name: 'Apuntar 7 días' }).click()
  await page.waitForTimeout(600)

  // La señal aparece en los siete días del rango, no solo en el primero. Se
  // cuenta por la etiqueta del día y no por el tinte, que es decorativo: quien
  // dice que ese día hay vacaciones es el nombre accesible del botón del día, y
  // es además la vía que funciona con el dedo. El `aria-pressed` acota a las
  // celdas del calendario: el bloque de "Vacaciones y descansos" también dice
  // "de vacaciones", y ahí la ausencia sale una sola vez.
  await verEnMes(page)
  await expect(page.locator('[aria-pressed][aria-label*="de vacaciones"]')).toHaveCount(7)

  // Y en el bloque, una vez y con nombre: siete días no son siete filas. El
  // bloque nace plegado, así que primero hay que abrirlo.
  await expect(page.getByText('Vacaciones y descansos')).toBeVisible()
  await abrirBloque(page, 'Vacaciones y descansos')
  const bloque = page.getByRole('button', { name: /Familia de vacaciones/ })
  await expect(bloque).toHaveCount(1)
})

// El rango invertido se rechaza antes de guardar.
test('unas vacaciones no pueden acabar antes de empezar', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  await page.locator('#event-kind').selectOption('vacaciones')
  await page.locator('#event-title').fill('Imposible')
  await page.locator('#event-date').fill('2026-08-16')
  await page.locator('#event-end-date').fill('2026-08-10')
  await expect(page.getByText('El último día no puede ser anterior al primero')).toBeVisible()
})

// Añadir dos ítems seguidos dejaba el texto del primero en el campo: la vista
// reutiliza el mismo sheet de creación, así que el formulario tiene que
// rearmarse en cada apertura.
test('el sheet de crear ítem llega vacío la segunda vez', async ({ page }) => {
  await page.goto('/lists')
  await page.waitForTimeout(700)
  await page.getByText('Farmacia').first().click()

  await page.getByRole('button', { name: 'Añadir ítem' }).click()
  await page.locator('#item-text').fill('Ibuprofeno')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: 'Añadir ítem' }).click()
  await expect(page.locator('#item-text')).toHaveValue('')
})

// Un ítem se apunta donde estás y luego resulta que iba en otra cesta. Se
// mueve desde su propia fila: un toque abre el sheet, otro lo manda.
test('un ítem se puede mover de una lista a otra', async ({ page }) => {
  await page.goto('/lists')
  await page.waitForTimeout(700)

  await page.getByText('Farmacia').first().click()
  await page.getByRole('button', { name: 'Añadir ítem' }).click()
  await page.locator('#item-text').fill('Jabón neutro')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: 'Mover Jabón neutro a otra lista' }).click()
  const sheet = page.getByRole('dialog', { name: 'Mover «Jabón neutro»' })

  // Mover algo a donde ya está no es una opción: Farmacia no se ofrece.
  await expect(sheet.getByRole('button', { name: 'Farmacia' })).toHaveCount(0)
  await sheet.getByRole('button', { name: 'Limpieza' }).click()
  await page.waitForTimeout(300)

  // Ya no está en Farmacia...
  await expect(page.getByRole('button', { name: 'Jabón neutro', exact: true })).toHaveCount(0)

  // ...sino en Limpieza.
  await page.getByRole('button', { name: 'Volver a las listas' }).click()
  await page.getByText('Limpieza').first().click()
  await expect(page.getByRole('button', { name: 'Jabón neutro', exact: true })).toBeVisible()
})

// Las listas van al revés que una lista de tareas: marcar no archiva, devuelve
// el ítem al catálogo de lo que se compra siempre, y desde ahí se vuelve a
// apuntar que hace falta sin reescribirlo.
test('lo marcado vuelve al catálogo y se puede volver a pedir', async ({ page }) => {
  await page.goto('/lists')
  await page.waitForTimeout(700)
  await page.getByText('Farmacia').first().click()

  // "Gasas estériles" viene ya marcado en la demo: está en el catálogo, y el
  // catálogo entra abierto, así que se ve sin tocar nada. Lo que se ofrece es
  // plegarlo.
  await expect(page.getByRole('button', { name: /Ocultar lo de siempre/ })).toBeVisible()

  await page.getByRole('button', { name: /Apuntar que hace falta Gasas estériles/ }).click()
  await page.waitForTimeout(300)

  // Ahora hace falta, y el círculo ofrece lo contrario.
  await expect(page.getByRole('button', { name: /Ya tenéis Gasas estériles/ })).toBeVisible()
})

// Lo que hay que hacer un día es parte de lo que pasa ese día. La tarea se crea
// en Tareas pero se ve —y se marca— en el calendario, sin volver: el calendario
// abre en la agenda del día de hoy, y ahí las tareas van con los planes.
// Los datos de demo son de junio, así que la tarea se crea aquí para que caiga
// en el día que se está pintando.
test('el calendario enseña las tareas que vencen hoy', async ({ page }) => {
  const hoy = new Date()
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  await page.goto('/tasks')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.locator('#task-title').fill('Recoger el paquete')
  await page.locator('#task-due').fill(iso)
  await page.getByRole('button', { name: 'Crear tarea' }).click()
  await page.waitForTimeout(300)
  await expect(page.getByText('Recoger el paquete')).toBeVisible()

  await page.goto('/calendar')
  await page.waitForTimeout(800)

  await abrirTareasDelDia(page)
  await expect(page.getByText('Recoger el paquete')).toBeVisible()

  // Y se marca sin salir del calendario: al hacerlo deja de estar pendiente.
  await page.getByRole('button', { name: /Marcar .*Recoger el paquete.* como completada/ }).click()
  await page.waitForTimeout(400)
  await expect(page.getByText('Recoger el paquete')).toHaveCount(0)
})

// Marcar una tarea que se repite no la completa: le empuja la fecha a la
// siguiente vez. Por eso no había forma de deshacerlo —no quedaba nada
// desmarcado que volver a tocar— y hacía falta el aviso con el botón.
test('una tarea que se repite, marcada sin querer, se puede deshacer', async ({ page }) => {
  const hoy = new Date()
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  await page.goto('/tasks')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.locator('#task-title').fill('Regar las plantas')
  await page.locator('#task-due').fill(iso)
  await page.getByRole('button', { name: 'Diaria', exact: true }).click()
  await page.getByRole('button', { name: 'Crear tarea' }).click()
  await page.waitForTimeout(300)

  await page.goto('/calendar')
  await page.waitForTimeout(800)

  // Marcarla no la completa: le empuja la fecha a mañana. Se comprueba por
  // bloques y no en toda la página, porque desde el rediseño la agenda enseña
  // también los próximos días: la tarea no desaparece, se muda de sitio, y eso
  // es justo lo que hay que ver.
  await abrirTareasDelDia(seccionDeHoy(page))
  await expect(seccionDeHoy(page).getByText('Regar las plantas')).toBeVisible()

  await page.getByRole('button', { name: /Marcar .*Regar las plantas.* como completada/ }).click()
  await page.waitForTimeout(400)
  await expect(seccionDeHoy(page).getByText('Regar las plantas')).toHaveCount(0)
  await expect(seccionDeManana(page).getByText('Regar las plantas')).toBeVisible()

  // El aviso dice las dos cosas: que se ha hecho y cómo volver atrás.
  await expect(page.getByRole('status')).toContainText('Hecho')
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await page.waitForTimeout(600)

  // Vuelve a vencer hoy, y el aviso se retira.
  await abrirTareasDelDia(seccionDeHoy(page))
  await expect(seccionDeHoy(page).getByText('Regar las plantas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Deshacer' })).toHaveCount(0)
})

// La pregunta de una tarea compartida es "¿quién la hace?". Hasta la migración
// 015 era la única cosa de la app que no sabía contestarla.
test('una tarea se puede asignar a alguien y se ve de quién es', async ({ page }) => {
  await page.goto('/tasks')
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  const sheet = page.getByRole('dialog', { name: 'Nueva tarea' })
  await page.locator('#task-title').fill('Llamar al seguro')
  await sheet.getByRole('button', { name: 'Sofía' }).click()
  await page.getByRole('button', { name: 'Crear tarea' }).click()
  await page.waitForTimeout(400)

  // La tarea aparece con el nombre de quien la lleva.
  const fila = page.locator('div').filter({ hasText: /^Llamar al seguro/ }).first()
  await expect(fila).toContainText('Sofía')
})

// Con el tiempo la lista se hace larga y "¿apunté lo del seguro?" solo se
// contesta a base de scroll.
test('las tareas se buscan por texto', async ({ page }) => {
  await page.goto('/tasks')
  await page.waitForTimeout(700)

  await expect(page.getByText('Comprar pañales talla 1')).toBeVisible()
  await page.getByLabel('Buscar tareas').fill('vitamina')

  await expect(page.getByText('Dar vitamina D a Ana')).toBeVisible()
  await expect(page.getByText('Comprar pañales talla 1')).toHaveCount(0)
})

// Las notas: el ciclo entero en la pantalla más simple de la app. Se prueba aquí
// y no solo en unitarios porque lo que puede romperse es la vuelta al store —una
// nota nueva tiene que aparecer sin recargar— y el orden, que es lo único que
// esta pantalla decide.
test('una nota nueva aparece en el índice, se edita y se borra', async ({ page }) => {
  await page.goto('/notes')
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'Nueva nota' }).click()
  const alta = page.getByRole('dialog', { name: 'Nueva nota' })
  await alta.getByLabel('Título').fill('Alarma de casa')
  await alta.getByLabel(/Contenido/).fill('Código: 4321' + String.fromCharCode(10) + 'Se apaga desde el panel de la entrada')
  await alta.getByRole('button', { name: 'Crear nota' }).click()

  await expect(page.getByText('Alarma de casa')).toBeVisible()
  // El cuerpo se lee desde la tarjeta, sin abrir nada: es la diferencia con un
  // documento, que hay que abrir para verlo. Se busca dentro del botón de la
  // tarjeta porque el sheet cerrado sigue en el árbol con su textarea escrito.
  await expect(page.getByRole('button', { name: /Alarma de casa/ })).toContainText('Código: 4321')

  await page.getByRole('button', { name: /Alarma de casa/ }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar nota' })
  await edicion.getByLabel('Título').fill('Alarma de casa y garaje')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Alarma de casa y garaje')).toBeVisible()

  await page.getByRole('button', { name: /Alarma de casa y garaje/ }).click()
  const borrado = page.getByRole('dialog', { name: 'Editar nota' })
  await borrado.getByRole('button', { name: 'Eliminar nota' }).click()
  await borrado.getByRole('button', { name: 'Confirmar eliminación' }).click()
  await expect(page.getByText('Alarma de casa y garaje')).toHaveCount(0)
})

// Lo que justifica que exista `pinned`: la clave del wifi se consulta todo el año
// y no se toca nunca, así que sin fijar quedaría la última. En los datos demo va
// fijada y "Contador de la luz" no.
test('las notas fijadas salen las primeras', async ({ page }) => {
  await page.goto('/notes')
  await page.waitForTimeout(700)

  const titulos = await page.locator('main button p.font-bold').allInnerTexts()
  // Las dos fijadas ocupan los dos primeros sitios. Entre ellas manda la fecha
  // —'Teléfonos útiles' se tocó después—, así que no se fija cuál va primera:
  // lo que prueba el test es que ninguna sin fijar se les cuela delante.
  expect(titulos.slice(0, 2).sort()).toEqual(['Teléfonos útiles', 'Wifi de casa'])
  expect(titulos.indexOf('Contador de la luz')).toBeGreaterThan(1)
})

// Un papel caducado no avisa por su cuenta: el DNI vale hasta que un día no
// vale. En la demo, el DNI de Omar caduca el 20 de agosto de 2026.
test('un documento con caducidad lo dice en su tarjeta', async ({ page }) => {
  await page.goto('/docs')
  await page.waitForTimeout(700)

  await expect(page.getByText(/Caduc[óa] el 20 ago\.? 2026/)).toBeVisible()
})

// La copia de seguridad de la familia. Se descarga de verdad y se lee: es lo único
// que prueba el camino completo —store, JSON, blob y descarga—, y sobre todo lo
// único que puede confirmar que dentro no hay tokens. El resto de la lógica está en
// `e2e/unit/export.spec.ts`, que no necesita navegador.
test('la copia de seguridad se descarga y lleva los datos de la familia', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForTimeout(800)
  // La copia de seguridad vive en la pestaña "Cuenta", no en la que abre por defecto.
  await page.getByRole('tab', { name: 'Cuenta' }).click()

  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar una copia de todo' }).click()
  const archivo = await descarga

  // El nombre lleva la familia y la fecha local.
  expect(archivo.suggestedFilename()).toMatch(/^farpi-.+-\d{4}-\d{2}-\d{2}\.json$/)

  const ruta = await archivo.path()
  const contenido = JSON.parse(readFileSync(ruta, 'utf8'))

  expect(contenido.farpi_export).toBe(1)
  expect(contenido.familia.nombre).toBeTruthy()
  // Los datos demo tienen documentos, eventos y personas: si alguno viene vacío,
  // es que el store no llegó a la exportación.
  expect(contenido.datos.documents.length).toBeGreaterThan(0)
  expect(contenido.datos.events.length).toBeGreaterThan(0)
  expect(contenido.datos.family_members.length).toBeGreaterThan(0)

  // Lo que no puede estar, mirado sobre el archivo real y no sobre el objeto.
  const bruto = readFileSync(ruta, 'utf8')
  for (const prohibido of ['refresh_token', 'access_token', 'storage_connections', 'p256dh']) {
    expect(bruto).not.toContain(prohibido)
  }
})

// Los archivos viven en el Google Drive de quien los sube, pero en modo demo no
// hay proveedor al que conectarse: los papeles no salen de este navegador. El
// sheet tiene que decirlo y **no** ofrecer un botón que no lleva a ningún sitio,
// que es lo que pasaría si `connectUrl` no fuese `null` en el mock.
test('en modo demo el sheet de documentos no ofrece conectar Drive', async ({ page }) => {
  await page.goto('/docs')
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'Añadir documento' }).click()
  const dialog = page.getByRole('dialog', { name: 'Añadir documento' })
  await expect(dialog).toBeVisible()

  // El selector de archivo de siempre sigue estando: en demo se sube igual, al
  // almacenamiento del navegador.
  await expect(dialog.getByText('Seleccionar archivo…')).toBeVisible()
  await expect(dialog.getByRole('link', { name: /Conectar Google Drive/ })).toHaveCount(0)
})

// Buscar en el calendario mira todo el histórico y no el tramo que se pinta:
// "¿cuándo fue la revisión?" es una pregunta sobre el pasado.
test('el calendario busca también en el pasado', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(800)

  await page.getByLabel('Buscar en el calendario').fill('registro civil')

  // La cabecera dice cuántos hay y dónde ha mirado. Antes ponía "Búsqueda" en
  // una línea aparte, encima del recuento; ahora es una sola línea, que dice lo
  // mismo con más información y deja sitio a los resultados.
  await expect(page.getByText(/1 resultado en todo el calendario/)).toBeVisible()
  await expect(page.getByText('Registro civil')).toBeVisible()
})

// Las cabeceras se configuran en next.config.ts y no se ven al usar la app: si
// alguien las quita sin querer, nadie se entera hasta que pasa algo.
test('las respuestas llevan las cabeceras de seguridad', async ({ page }) => {
  const respuesta = await page.goto('/home')
  const cabeceras = respuesta!.headers()

  expect(cabeceras['x-frame-options']).toBe('DENY')
  expect(cabeceras['x-content-type-options']).toBe('nosniff')
  expect(cabeceras['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(cabeceras['permissions-policy']).toContain('camera=()')
})

// Una abuela que recoge a los niños los martes no tiene cuenta ni correo, y
// aun así hay que poder asignarle cosas. Se da de alta en Ajustes, en su propio
// bloque, y desde ese momento sale en "asignar a" con los adultos. El test
// recorre las dos mitades porque el valor está en la segunda: darla de alta sin
// que aparezca donde se asigna no sirve de nada.
test('un adulto sin cuenta se da de alta en Ajustes y se puede asignar', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForTimeout(800)

  await page.getByRole('button', { name: 'Añadir adulto' }).click()
  const sheet = page.getByRole('dialog', { name: 'Añadir adulto' })
  // Sin correo y sin acceso: el sheet lo dice, para que nadie espere una invitación.
  await expect(sheet.getByText(/No entra en la app/)).toBeVisible()
  await expect(sheet.locator('#child-name')).toBeVisible()

  await sheet.locator('#child-name').fill('Carmen')
  await sheet.getByRole('button', { name: 'Añadir adulto' }).click()
  await page.waitForTimeout(600)

  // Sale en su bloque, no con los hijos.
  await expect(page.getByRole('button', { name: /Carmen/ })).toBeVisible()
  await expect(page.getByText('Aún no hay adultos sin cuenta')).toHaveCount(0)

  // Y ya se le puede asignar un evento, como a cualquier adulto de la familia.
  await page.goto('/calendar')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  const evento = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await expect(evento.getByRole('button', { name: 'Carmen', exact: true })).toBeVisible()
})

// Unas vacaciones sin nombre: el tipo ya dice lo que son, así que el formulario
// no pide título y al guardar se llaman "Vacaciones". Antes el botón se quedaba
// desactivado y no había forma de apuntarlas sin inventarse un texto.
test('unas vacaciones se apuntan sin escribir título', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  await page.locator('#event-kind').selectOption('vacaciones')

  // El campo lo dice, y enseña con qué nombre se va a guardar.
  await expect(page.locator('#event-title')).toHaveAttribute('placeholder', 'Vacaciones')
  await expect(page.getByText('Título (opcional)')).toBeVisible()

  await page.locator('#event-date').fill('2026-09-07')
  await page.locator('#event-end-date').fill('2026-09-09')
  const apuntar = page.getByRole('button', { name: 'Apuntar 3 días' })
  await expect(apuntar).toBeEnabled()
  await apuntar.click()
  await page.waitForTimeout(600)

  await verEnMes(page)
  await expect(page.locator('[aria-pressed][aria-label*="de vacaciones"]')).toHaveCount(3)
})

// Las cuatro franjas de comida están fijas en el código, pero no todas las casas
// meriendan: en Ajustes se apagan las que no se usan y Comidas deja de pedirlas.
// Apagar no borra, y por eso al final se vuelve a encender: lo que hubiera
// apuntado en esa franja sigue ahí.
test('una franja apagada en Ajustes desaparece de Comidas', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForTimeout(800)
  // Las franjas de comida viven en la pestaña "Casa", no en la que abre por defecto.
  await page.getByRole('tab', { name: 'Casa' }).click()

  const merienda = page.getByRole('switch', { name: 'Merienda' })
  await expect(merienda).toHaveAttribute('aria-checked', 'true')
  await merienda.click()
  await page.waitForTimeout(500)
  await expect(merienda).toHaveAttribute('aria-checked', 'false')

  // La semana, que es donde se ven las franjas una debajo de otra.
  await page.goto('/meals')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Esta semana' }).click()
  await page.waitForTimeout(300)

  await expect(page.getByText('Desayuno').first()).toBeVisible()
  await expect(page.getByText('Merienda')).toHaveCount(0)

  // Y el formulario tampoco la ofrece: no se puede apuntar lo que no se ve.
  await page.getByRole('button', { name: 'Añadir comida' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Añadir comida' })
  await expect(sheet.getByRole('button', { name: /Comida/ }).first()).toBeVisible()
  await expect(sheet.getByText('Merienda')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // Vuelta atrás: la franja reaparece con todo lo que tuviera. La pestaña
  // vuelve a abrir en "Familia" por defecto, así que hay que volver a entrar
  // en "Casa".
  await page.goto('/settings')
  await page.waitForTimeout(800)
  await page.getByRole('tab', { name: 'Casa' }).click()
  await page.getByRole('switch', { name: 'Merienda' }).click()
  await page.waitForTimeout(500)
  await page.goto('/meals')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Esta semana' }).click()
  await expect(page.getByText('Merienda').first()).toBeVisible()
})

// Un descanso deja marcados **todos** los días de su rango, no solo el primero.
// Se cuenta por el nombre accesible del día y no por el color, que es la vía que
// funciona con el dedo y con lector de pantalla; el color de la etiqueta, que en
// móvil va sin nombre, se comprueba en `escritorio.spec.ts`, donde sí lo lleva.
test('un descanso marca todos los días de su rango', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  await page.locator('#event-kind').selectOption('descanso')

  await page.locator('#event-date').fill('2026-08-11')
  await page.locator('#event-end-date').fill('2026-08-12')
  await page.getByRole('button', { name: 'Sofía' }).click()
  await page.locator('button[type="submit"][form="event-form"]').click()
  await page.waitForTimeout(600)

  await verEnMes(page)
  await expect(page.locator('[aria-pressed][aria-label*="descansando"]')).toHaveCount(2)

  // Y una vez en el bloque, con nombre y fechas: dos días no son dos filas.
  await abrirBloque(page, 'Vacaciones y descansos')
  await expect(page.getByRole('button', { name: /Sofía descansa/ })).toHaveCount(1)
})

// Las unidades de un ítem se suben y se bajan **desde la propia fila**, sin abrir
// nada: se tocan en el súper, con una mano. En 1 no se escribe el número ni se
// ofrece el menos, que "×1" es decir lo que ya dice la fila.
//
// Se apunta un ítem nuevo en vez de coger uno de los de demo: lo recién apuntado
// arranca siempre en uno, y así el test no depende de las cantidades del seed.
// Y se espera por estado y no por reloj, que cada toque pasa por el store y
// recarga: con esperas fijas los clics se atropellaban.
test('las unidades de la compra se cambian desde la fila', async ({ page }) => {
  await page.goto('/lists')
  await page.waitForTimeout(800)
  await page.getByText('Farmacia').first().click()
  await page.waitForTimeout(500)

  await page.getByRole('button', { name: 'Añadir ítem' }).click()
  await page.locator('#item-text').fill('Ibuprofeno')
  await page.getByRole('button', { name: 'Añadir', exact: true }).click()

  const mas = page.getByRole('button', { name: 'Añadir una unidad de Ibuprofeno' })
  const menos = page.getByRole('button', { name: 'Quitar una unidad de Ibuprofeno' })

  // Recién apuntado hace falta uno: ni número escrito ni botón de quitar.
  await expect(mas).toHaveCount(1)
  await expect(menos).toHaveCount(0)

  await mas.click()
  await expect(menos).toHaveCount(1)

  // Y de vuelta a uno, donde el menos se retira solo.
  await menos.click()
  await expect(menos).toHaveCount(0)
})

// En Inicio, lo que falta se pliega por cesta. Al desplegarlo, cada ítem dice sus
// unidades si pasan de una: "Pñales talla 1 ×2". Lo que **no** se pone es el total
// por cesta, que se probó y se quitó el 04-08-2026: el número no decidía nada y
// pegado al nombre de la lista se leía como parte de él, "Casa 2".
test('en Inicio, cada ítem dice sus unidades', async ({ page }) => {
  await page.goto('/home')
  await page.waitForTimeout(1000)

  // La sección abre plegada: primero se despliega.
  const cestas = page.getByRole('button', { expanded: false }).filter({ hasText: 'Casa' }).first()
  await cestas.click()

  // Acotado a su sección: arriba hay una tarea que se llama "Comprar pañales
  // talla 1" y se colaba en la búsqueda por texto.
  const seccion = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Listas de casa' }) })

  const fila = seccion.getByText('Pañales talla 1', { exact: false }).first()
  await expect(fila).toBeVisible()
  await expect(fila).toContainText('×2')

  // Y un ítem de uno no escribe nada: "×1" diría lo que ya dice la fila.
  await expect(seccion.getByText('Toallitas sin perfume', { exact: false }).first()).not.toContainText('×')
})

// ─── Finanzas ────────────────────────────────────────────────────────────────
//
// Los dos flujos que sostienen la pantalla, y los dos son de cuenta: que apuntar
// un gasto mueva el tope de su presupuesto, y que dos presupuestos pedidos para
// el mismo trabajo salgan juntos con el barato marcado. La conversión de "24,90"
// a céntimos vive en `e2e/unit/finanzas.spec.ts`; aquí se comprueba que llega entera
// hasta la pantalla.

test('un gasto apuntado mueve el tope de su presupuesto', async ({ page }) => {
  await page.goto('/finanzas')
  await page.waitForTimeout(800)

  // La demo está sembrada en junio de 2026, así que el mes en curso arranca
  // vacío: el presupuesto de la compra empieza a cero y su tope entero libre.
  const compra = page.getByRole('button').filter({ hasText: 'Compra' }).first()
  await expect(compra).toContainText('Quedan 400 €')

  await page.getByRole('button', { name: 'Nuevo gasto' }).click()
  await page.locator('#expense-amount').fill('24,90')
  await page.locator('#expense-description').fill('Compra semanal')
  await page.getByRole('button', { name: 'Compra', exact: true }).click()
  await page.getByRole('button', { name: 'Apuntar gasto' }).click()
  await page.waitForTimeout(500)

  // El importe se lee igual en la fila y en el tope, y el resto sale de restar.
  await expect(page.getByText('Compra semanal')).toBeVisible()
  await expect(compra).toContainText('24,90 €')
  await expect(compra).toContainText('Quedan 375,10 €')
})

test('dos presupuestos para lo mismo se comparan juntos', async ({ page }) => {
  await page.goto('/finanzas')
  await page.waitForTimeout(800)
  await page.getByRole('tab', { name: 'Presupuestos' }).click()

  // La caldera viene sembrada con tres, uno de ellos descartado. El más barato
  // de los que siguen vivos es el de Clima Ruiz.
  const caldera = page.getByRole('region', { name: 'Cambiar la caldera' })
  await expect(caldera).toBeVisible()
  await expect(caldera.getByText('Más barato')).toBeVisible()
  await expect(caldera.getByText('Más barato').locator('xpath=ancestor::p[1]')).toContainText('Clima Ruiz')

  // Al aceptar uno, el grupo queda decidido y la marca del barato desaparece:
  // no se le reprocha a nadie la decisión que acaba de tomar.
  await caldera.getByRole('button', { name: 'Aceptar Clima Ruiz' }).click()
  await page.waitForTimeout(500)
  await expect(caldera).toContainText('Decidido')
  await expect(caldera.getByText('Más barato')).toHaveCount(0)
})
