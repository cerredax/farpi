import { test, expect } from '@playwright/test'

// Recorre las pantallas en modo demo y verifica que cargan sin errores de
// consola ni excepciones no capturadas.

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

  // La franja aparece en los siete días del rango, no solo en el primero.
  await expect(page.locator('[title="Playa"]')).toHaveCount(7)
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

  // "Gasas estériles" viene ya marcado en la demo: está en el catálogo.
  await expect(page.getByText('Gasas estériles')).toHaveCount(0)
  await page.getByRole('button', { name: /Apuntar de lo de siempre/ }).click()

  await page.getByRole('button', { name: /Apuntar que hace falta Gasas estériles/ }).click()
  await page.waitForTimeout(300)

  // Ahora hace falta, y el círculo ofrece lo contrario.
  await expect(page.getByRole('button', { name: /Ya tenéis Gasas estériles/ })).toBeVisible()
})
