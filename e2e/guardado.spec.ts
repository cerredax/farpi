import { test, expect } from '@playwright/test'

test('la barra de listas conserva el texto si falla y permite reintentar', async ({ page }) => {
  await page.goto('/lists')
  await page.getByText('Farmacia', { exact: true }).first().click()
  const campo = page.getByLabel('Apuntar algo en Farmacia')
  await campo.fill('Apósitos del botiquín')
  await page.evaluate(() => { crypto.randomUUID = () => { throw new Error('sin conexión') } })
  await campo.press('Enter')
  await expect(page.getByText('No se ha guardado el cambio')).toBeVisible()
  await expect(campo).toHaveValue('Apósitos del botiquín')
  await page.evaluate(() => { delete (crypto as { randomUUID?: unknown }).randomUUID })
  await campo.press('Enter')
  await expect(campo).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Apósitos del botiquín', exact: true }).first()).toBeVisible()
})

test('un apunte fallido conserva sus campos y reintentar lo guarda una sola vez', async ({ page }) => {
  await page.goto('/finances')
  await page.getByRole('button', { name: 'Nuevo apunte', exact: true }).click()
  const dialogo = page.locator('[role="dialog"]').filter({ has: page.locator('#expense-amount') })
  await page.locator('#expense-amount').fill('15,50')
  await page.locator('#expense-description').fill('Revisión del garaje')
  await page.evaluate(() => { crypto.randomUUID = () => { throw new Error('sin conexión') } })
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(page.getByText('No se ha guardado el cambio')).toBeVisible()
  await expect(dialogo).not.toHaveAttribute('inert', '')
  await expect(page.locator('#expense-amount')).toHaveValue('15,50')
  await expect(page.locator('#expense-description')).toHaveValue('Revisión del garaje')
  await page.evaluate(() => { delete (crypto as { randomUUID?: unknown }).randomUUID })
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
  const apuntes = () => page.evaluate(() => JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').expenses
    .filter((e: { description: string }) => e.description === 'Revisión del garaje'))
  await expect.poll(async () => (await apuntes()).length).toBe(1)
  await page.reload()
  await expect.poll(async () => (await apuntes()).length).toBe(1)
  await expect(page.getByText('Revisión del garaje', { exact: true })).toBeVisible()
})

for (const caso of [
  { ruta: '/notes', alta: 'Nueva nota', campo: '#note-title', guardar: 'Crear nota', texto: 'Código del portón' },
  { ruta: '/lists', alta: 'Nueva lista', campo: '#list-name', guardar: 'Crear lista', texto: 'Recambios del trastero' },
  { ruta: '/calendar', alta: 'Apuntar algo', campo: '#event-title', guardar: 'Apuntar', texto: 'Revisar el portero' },
]) {
  test(`${caso.ruta}: conserva el borrador si el guardado falla`, async ({ page }) => {
    await page.goto(caso.ruta)
    await page.getByRole('button', { name: caso.alta, exact: true }).click()
    const campo = page.locator(caso.campo)
    const dialogo = page.locator('[role="dialog"]').filter({ has: campo })
    await campo.fill(caso.texto)
    await page.evaluate(() => { crypto.randomUUID = () => { throw new Error('sin conexión') } })
    await dialogo.getByRole('button', { name: caso.guardar, exact: true }).click()
    await expect(page.getByText('No se ha guardado el cambio')).toBeVisible()
    await expect(dialogo).not.toHaveAttribute('inert', '')
    await expect(campo).toHaveValue(caso.texto)
    await expect(dialogo.getByRole('button', { name: caso.guardar, exact: true })).toBeEnabled()
  })
}

test('el refresco automático conserva el foco y el texto del formulario', async ({ page }) => {
  await page.clock.install()
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Apuntar algo', exact: true }).click()
  await page.clock.fastForward(500)
  const titulo = page.locator('#event-title')
  await titulo.fill('Llamar a la gestoría')
  await titulo.focus()
  await page.clock.fastForward(65_000)
  await page.clock.runFor(100)
  await expect(titulo).toBeFocused()
  await expect(titulo).toHaveValue('Llamar a la gestoría')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Apuntar algo', exact: true })).toBeFocused()
})

test('cada apertura del calendario empieza sin repetición ni ajustes anteriores', async ({ page }) => {
  await page.goto('/calendar')
  const alta = page.getByRole('button', { name: 'Apuntar algo', exact: true })
  await alta.click()
  const dialogo = page.locator('[role="dialog"]').filter({ has: page.locator('#event-title') })
  await dialogo.getByRole('button', { name: 'Cada semana', exact: true }).click()
  await dialogo.getByRole('button', { name: '2 semanas', exact: true }).click()
  await expect(dialogo.locator('#event-rec-end')).toBeVisible()
  await page.keyboard.press('Escape')
  await alta.click()
  await expect(dialogo.locator('#event-title')).toHaveValue('')
  await expect(dialogo.locator('#event-rec-end')).toHaveCount(0)
  await expect(dialogo.getByRole('button', { name: 'Apuntar', exact: true })).toBeVisible()
  await dialogo.getByRole('button', { name: 'Cada semana', exact: true }).click()
  await expect(dialogo.getByRole('button', { name: 'Semana', exact: true })).toHaveClass(/bg-primary-strong/)
})

test('dos envíos inmediatos del mismo formulario crean un solo apunte', async ({ page }) => {
  await page.goto('/finances')
  await page.getByRole('button', { name: 'Nuevo apunte', exact: true }).click()
  await page.locator('#expense-amount').fill('12')
  await page.locator('#expense-description').fill('Arreglo del timbre')
  await page.locator('#expense-form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').expenses
    .filter((e: { description: string }) => e.description === 'Arreglo del timbre').length)).toBe(1)
})
