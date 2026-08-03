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
