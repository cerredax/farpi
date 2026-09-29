import { test, expect, type Page } from '@playwright/test'

// La app en otro idioma (28-09-2026). El inglés todavía no se ofrece en Ajustes
// —solo está traducido el primer tramo—, así que se entra en él como lo haría
// quien prueba la traducción: escribiendo la cookie a mano.

async function ponerIdioma(page: Page, idioma: string) {
  await page.context().addCookies([{ name: 'farpi_idioma', value: idioma, url: 'http://localhost:3100' }])
}

/** Lo que tumbaría `runtime.spec.ts`: un aviso de hidratación es un `console.error`. */
function vigilarErrores(page: Page): string[] {
  const errores: string[] = []
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
  page.on('pageerror', e => errores.push(e.message))
  return errores
}

test('sin cookie, la app está en castellano y no ofrece otro idioma', async ({ page }) => {
  await page.goto('/settings?seccion=cuenta')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeVisible()
  // Con un solo idioma ofrecido, el selector sería un control que no hace nada.
  await expect(page.getByRole('radiogroup', { name: 'Idioma' })).toHaveCount(0)
  // Y las etiquetas de la página, que es lo que ven WhatsApp y Google: entran
  // sin cookie, así que para ellos esto es lo único que hay.
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^El espacio privado de tu familia/)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'es_ES')
})

test('con la cookie en inglés, lo traducido sale en inglés y sin errores de hidratación', async ({ page }) => {
  const errores = vigilarErrores(page)
  await ponerIdioma(page, 'en')

  await page.goto('/home')
  // El `lang` lo pone el servidor: es lo que usa un lector de pantalla para la voz.
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible()
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Your family’s private space/)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_GB')

  await page.getByRole('button', { name: 'More' }).click()
  const mas = page.getByRole('dialog', { name: 'More' })
  await expect(mas.getByRole('link', { name: 'Settings' })).toBeVisible()
  await expect(mas.getByRole('link', { name: 'Documents' })).toBeVisible()

  expect(errores).toEqual([])
})

test('desde el inglés se puede volver al castellano en Ajustes', async ({ page }) => {
  await ponerIdioma(page, 'en')
  await page.goto('/settings?seccion=cuenta')

  // Aunque el inglés no esté ofrecido, quien ya lo tiene puesto ve el selector:
  // si no, no habría forma de volver.
  const selector = page.getByRole('radiogroup', { name: 'Language' })
  await expect(selector.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')

  await Promise.all([
    page.waitForEvent('load'),
    selector.getByRole('radio', { name: 'Castellano' }).click(),
  ])

  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeVisible()
  // Y de vuelta en castellano, el selector se calla otra vez.
  await expect(page.getByRole('radiogroup', { name: 'Idioma' })).toHaveCount(0)
  const cookies = await page.context().cookies()
  expect(cookies.find(c => c.name === 'farpi_idioma')?.value).toBe('es')
})
