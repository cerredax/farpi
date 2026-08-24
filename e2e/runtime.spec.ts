import { test, expect, type Locator, type Page } from '@playwright/test'

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
 * Pasa el calendario al modo Mes. El móvil abre en Agenda —la tira de siete días
 * y el detalle del día—, así que la rejilla del mes no está en la página hasta
 * que se pide. `exact` es obligatorio: sin él, "Mes" casaría también con las
 * flechas "Mes anterior" y "Mes siguiente".
 */
async function verEnMes(page: Page) {
  await page.getByRole('button', { name: 'Mes', exact: true }).click()
  await page.waitForTimeout(300)
}

/** El bloque del día elegido, que en el día de hoy se titula "Hoy, …". */
function seccionDeHoy(page: Page): Locator {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: /^Hoy,/ }) })
}

/**
 * El bloque de lo que viene después del día elegido. Se localiza por su nombre
 * accesible y no por un título visible: dentro va agrupado en tramos ("Esta
 * semana", "La semana que viene", los meses), y buscar uno concreto haría que el
 * test dependiera del día de la semana en que se ejecuta.
 */
function seccionProximos(page: Page): Locator {
  return page.getByRole('region', { name: 'Próximos días' })
}

const ROUTES = [
  '/home',
  '/calendar',
  '/tasks',
  '/lists',
  '/meals',
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
  { route: '/docs', button: 'Añadir documento', dialog: 'Añadir documento' },
  { route: '/calendar', button: 'Añadir evento', dialog: 'Nuevo evento' },
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
  await page.getByRole('button', { name: 'Añadir evento' }).first().click()

  const dialogo = page.getByRole('dialog', { name: 'Nuevo evento' })
  await expect(dialogo.getByRole('button', { name: 'Familia', exact: true })).toBeVisible()
  await expect(dialogo.getByRole('button', { name: 'Omar', exact: true })).toBeVisible()

  await page.locator('#event-title').fill('Dentista')
  await dialogo.getByRole('button', { name: 'Sofía', exact: true }).click()
  await page.getByRole('button', { name: /^Crear evento/ }).click()

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
  await page.getByRole('button', { name: 'Añadir evento' }).first().click()
  await page.getByRole('button', { name: 'Vacaciones' }).click()

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

  // Y en el bloque, una vez y con nombre: siete días no son siete filas.
  const bloque = page.getByRole('button', { name: /Familia de vacaciones/ })
  await expect(bloque).toHaveCount(1)
  await expect(page.getByText('Vacaciones y descansos')).toBeVisible()
})

// El rango invertido se rechaza antes de guardar.
test('unas vacaciones no pueden acabar antes de empezar', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Añadir evento' }).first().click()
  await page.getByRole('button', { name: 'Vacaciones' }).click()
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
  await expect(seccionProximos(page).getByText('Regar las plantas')).toBeVisible()

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

// Un papel caducado no avisa por su cuenta: el DNI vale hasta que un día no
// vale. En la demo, el DNI de Omar caduca el 20 de agosto de 2026.
test('un documento con caducidad lo dice en su tarjeta', async ({ page }) => {
  await page.goto('/docs')
  await page.waitForTimeout(700)

  await expect(page.getByText(/Caduc[óa] el 20 ago\.? 2026/)).toBeVisible()
})

// Buscar en el calendario mira todo el histórico y no el tramo que se pinta:
// "¿cuándo fue la revisión?" es una pregunta sobre el pasado.
test('el calendario busca también en el pasado', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(800)

  await page.getByLabel('Buscar eventos').fill('registro civil')

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
  await page.getByRole('button', { name: 'Añadir evento' }).first().click()
  const evento = page.getByRole('dialog', { name: 'Nuevo evento' })
  await expect(evento.getByRole('button', { name: 'Carmen', exact: true })).toBeVisible()
})

// Unas vacaciones sin nombre: el tipo ya dice lo que son, así que el formulario
// no pide título y al guardar se llaman "Vacaciones". Antes el botón se quedaba
// desactivado y no había forma de apuntarlas sin inventarse un texto.
test('unas vacaciones se apuntan sin escribir título', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Añadir evento' }).first().click()
  await page.getByRole('button', { name: 'Vacaciones' }).click()

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

  // Vuelta atrás: la franja reaparece con todo lo que tuviera.
  await page.goto('/settings')
  await page.waitForTimeout(800)
  await page.getByRole('switch', { name: 'Merienda' }).click()
  await page.waitForTimeout(500)
  await page.goto('/meals')
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Esta semana' }).click()
  await expect(page.getByText('Merienda').first()).toBeVisible()
})

// El color del número es la única vía visual de saber que ese día alguien
// descansa cuando la raya no se pinta —con vacaciones de otro el mismo día manda
// la banda—, y un color se rompe sin que salte ningún test de estructura. Se
// comprueba el valor exacto: Sofía no tiene color propio, así que le toca el
// segundo de la paleta de adultos por posición (Cuero, #7E5522 → rgb(126,85,34)),
// y encima de un tono oscuro `textColorOn` elige blanco.
test('un descanso pinta el número del día con el color de quien descansa', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Añadir evento' }).first().click()
  await page.getByRole('button', { name: 'Descanso' }).click()

  // Dos días a propósito: al guardar, la vista salta al primero y lo deja
  // seleccionado, y el día elegido manda sobre el descanso —es dónde estás—. El
  // color se comprueba en el segundo, que es una celda cualquiera.
  await page.locator('#event-date').fill('2026-08-11')
  await page.locator('#event-end-date').fill('2026-08-12')
  await page.getByRole('button', { name: 'Sofía' }).click()
  await page.getByRole('button', { name: /Apuntar/ }).click()
  await page.waitForTimeout(600)

  await verEnMes(page)
  await expect(page.locator('[aria-pressed][aria-label*="descansando"]')).toHaveCount(2)

  const celda = page.locator('[aria-pressed][aria-label*="12 de agosto"][aria-label*="descansando"]')
  const numero = celda.locator('span', { hasText: /^12$/ }).first()
  await expect(numero).toHaveCSS('background-color', 'rgb(126, 85, 34)')
  await expect(numero).toHaveCSS('color', 'rgb(255, 255, 255)')
})
