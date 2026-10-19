import { test, expect, type Page } from '@playwright/test'
import type { Expense } from '@/types'

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00+02:00'))
})

async function abrirApunte(page: Page) {
  await page.goto('/finances')
  await page.getByRole('button', { name: 'Nuevo apunte', exact: true }).click()
  return page.getByRole('dialog', { name: 'Nuevo apunte', exact: true })
}

async function apuntesGuardados(page: Page): Promise<Expense[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').expenses ?? [])
}

test('un gasto nuevo empieza por el importe y se guarda sin concepto ni partida', async ({ page }) => {
  const dialogo = await abrirApunte(page)
  await expect(dialogo.locator('input:visible').first()).toHaveAttribute('id', 'expense-amount')
  await expect(dialogo.locator('#expense-details')).not.toHaveAttribute('open', '')
  await expect(dialogo.locator('summary')).toContainText('Sin partida')
  await expect(dialogo.locator('summary')).toContainText('Hoy · Familia')
  await expect(page.locator('#expense-description')).toHaveValue('')
  await page.locator('#expense-amount').fill('12,34')
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
  await page.reload()
  await page.getByRole('button', { name: 'Nuevo apunte', exact: true }).waitFor()
  const guardados = (await apuntesGuardados(page)).filter(apunte => apunte.amount_cents === 1234 && apunte.date === '2026-10-15')
  expect(guardados).toHaveLength(1)
  expect(guardados[0]).toMatchObject({ kind: 'gasto', budget_id: null, member_id: null, child_id: null })
  expect(guardados[0].description ?? '').toBe('')
})

test('un atajo habitual queda antes del concepto y solo asigna partida al elegirlo', async ({ page }) => {
  let dialogo = await abrirApunte(page)
  for (const importe of ['30', '40']) {
    await page.locator('#expense-amount').fill(importe)
    await page.locator('#expense-description').fill('Gasolina de prueba')
    await dialogo.locator('summary').click()
    await dialogo.getByRole('button', { name: 'Coche', exact: true }).click()
    await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
    await expect(dialogo).toHaveAttribute('inert', '')
    await page.getByRole('button', { name: 'Nuevo apunte', exact: true }).click()
    dialogo = page.getByRole('dialog', { name: 'Nuevo apunte', exact: true })
  }
  const atajo = dialogo.getByRole('button', { name: 'Gasolina de prueba', exact: true })
  await expect(atajo).toBeVisible()
  const orden = await atajo.evaluate(el => Boolean(el.compareDocumentPosition(document.getElementById('expense-description')!) & Node.DOCUMENT_POSITION_FOLLOWING))
  expect(orden).toBe(true)
  await expect(dialogo.locator('summary')).toContainText('Sin partida')
  await expect(page.locator('#expense-description')).toHaveValue('')
  await atajo.click()
  await expect(page.locator('#expense-description')).toHaveValue('Gasolina de prueba')
  await expect(page.locator('#expense-amount')).toBeFocused()
  await expect(dialogo.locator('summary')).toContainText('Coche')
  await page.locator('#expense-amount').fill('35,50')
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
  const gasolina = (await apuntesGuardados(page)).filter(apunte => apunte.description === 'Gasolina de prueba')
  expect(gasolina).toHaveLength(3)
  expect(new Set(gasolina.map(apunte => apunte.budget_id)).size).toBe(1)
  expect(gasolina[2].budget_id).not.toBeNull()
})

test('el resumen conserva partida, fecha y persona al plegarse y guarda esos valores', async ({ page }) => {
  const dialogo = await abrirApunte(page)
  await page.locator('#expense-amount').fill('22,10')
  await page.locator('#expense-description').fill('Gasto de septiembre de prueba')
  await dialogo.locator('summary').click()
  await dialogo.getByRole('button', { name: 'Compra', exact: true }).click()
  await page.locator('#expense-date').fill('2026-09-22')
  await dialogo.getByRole('button', { name: 'Carlos', exact: true }).click()
  await dialogo.locator('summary').click()
  await expect(dialogo.locator('#expense-details')).not.toHaveAttribute('open', '')
  await expect(dialogo.locator('summary')).toContainText('Compra')
  await expect(dialogo.locator('summary')).toContainText('22 sep 2026 · Carlos')
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
  expect((await apuntesGuardados(page)).find(apunte => apunte.description === 'Gasto de septiembre de prueba'))
    .toMatchObject({ amount_cents: 2210, date: '2026-09-22', member_id: 'm1', budget_id: 'b1' })
})

test('editar un apunte abre sus detalles y conserva la asignación al cambiar solo el importe', async ({ page }) => {
  await page.goto('/finances')
  await page.getByPlaceholder(/^Buscar en/).fill('Compra semanal')
  await page.getByRole('button', { name: /Compra semanal/ }).first().click()
  const dialogo = page.getByRole('dialog', { name: 'Editar apunte', exact: true })
  await expect(dialogo.locator('#expense-details')).toHaveAttribute('open', '')
  const antes = (await apuntesGuardados(page)).find(apunte => apunte.description === 'Compra semanal')!
  await page.locator('#expense-amount').fill('28,90')
  await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
  expect((await apuntesGuardados(page)).find(apunte => apunte.id === antes.id))
    .toMatchObject({ amount_cents: 2890, date: antes.date, budget_id: antes.budget_id, member_id: antes.member_id, child_id: antes.child_id })
})

test('cambiar a ingreso suelta la partida y conserva importe y concepto', async ({ page }) => {
  const dialogo = await abrirApunte(page)
  await page.locator('#expense-amount').fill('18,50')
  await page.locator('#expense-description').fill('Devolución de prueba')
  await dialogo.locator('summary').click()
  await dialogo.getByRole('button', { name: 'Compra', exact: true }).click()
  await dialogo.getByRole('button', { name: 'Apuntar un ingreso', exact: true }).click()
  await expect(dialogo.getByText('De qué partida sale', { exact: true })).toHaveCount(0)
  await expect(dialogo.locator('summary')).not.toContainText('Compra')
  await expect(page.locator('#expense-amount')).toHaveValue('18,50')
  await expect(page.locator('#expense-description')).toHaveValue('Devolución de prueba')
  await dialogo.getByRole('button', { name: 'Volver a gastos', exact: true }).click()
  await expect(dialogo.locator('summary')).toContainText('Sin partida')
  await dialogo.getByRole('button', { name: 'Apuntar un ingreso', exact: true }).click()
  await dialogo.getByRole('button', { name: 'Apuntar ingreso', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
  expect((await apuntesGuardados(page)).find(apunte => apunte.description === 'Devolución de prueba'))
    .toMatchObject({ kind: 'ingreso', amount_cents: 1850, budget_id: null })
})

test('una fecha vacía dentro de detalles plegados se puede corregir sin perder el borrador', async ({ page }) => {
  const errores: string[] = []
  page.on('console', mensaje => { if (mensaje.type() === 'error') errores.push(mensaje.text()) })
  const dialogo = await abrirApunte(page)
  await page.locator('#expense-amount').fill('14')
  await dialogo.locator('summary').click()
  await page.locator('#expense-date').fill('')
  await dialogo.locator('summary').click()
  await expect(dialogo.locator('summary')).toContainText('Sin fecha')
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(dialogo).not.toHaveAttribute('inert', '')
  await expect(dialogo.locator('#expense-details')).toHaveAttribute('open', '')
  await expect(page.locator('#expense-date')).toBeFocused()
  await expect(page.locator('#expense-amount')).toHaveValue('14')
  expect(errores).toEqual([])
  await page.locator('#expense-date').fill('2026-10-15')
  await dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true }).click()
  await expect(dialogo).toHaveAttribute('inert', '')
})

test('reabrir un apunte nuevo reinicia tipo, detalles y campos', async ({ page }) => {
  const dialogo = await abrirApunte(page)
  await dialogo.locator('summary').click()
  await dialogo.getByRole('button', { name: 'Compra', exact: true }).click()
  await page.locator('#expense-date').fill('2026-09-22')
  await dialogo.getByRole('button', { name: 'Carlos', exact: true }).click()
  await dialogo.getByRole('button', { name: 'Apuntar un ingreso', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Nuevo apunte', exact: true }).click()
  await expect(dialogo.locator('#expense-details')).not.toHaveAttribute('open', '')
  await expect(dialogo.locator('summary')).toContainText('Sin partida')
  await expect(dialogo.locator('summary')).toContainText('Hoy · Familia')
  await expect(page.locator('#expense-amount')).toHaveValue('')
  await expect(page.locator('#expense-date')).toHaveValue('2026-10-15')
  await expect(dialogo.getByRole('button', { name: 'Apuntar gasto', exact: true })).toBeVisible()
})

test('el apunte cabe a 320 y 390 px y mantiene controles de 44 px al desplegarlo', async ({ page }) => {
  for (const ancho of [320, 390]) {
    await page.setViewportSize({ width: ancho, height: 844 })
    const dialogo = await abrirApunte(page)
    for (const abierto of [false, true]) {
      if (abierto) await dialogo.locator('summary').click()
      const cortos = await dialogo.evaluate(raiz => Array.from(raiz.querySelectorAll<HTMLElement>('button,input,summary'))
        .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
        .flatMap(el => {
          const caja = el.getBoundingClientRect()
          return caja.width < 44 || caja.height < 44 || caja.left < 0 || caja.right > innerWidth
            ? [`${el.id || el.textContent?.trim()}: ${caja.width}×${caja.height}`] : []
        }))
      expect(cortos).toEqual([])
    }
  }
})

test('el formulario de apuntes usa los textos del idioma del dispositivo', async ({ page, context }) => {
  await context.addCookies([{ name: 'farpi_idioma', value: 'en', domain: 'localhost', path: '/' }])
  await page.goto('/finances')
  await page.getByRole('button', { name: 'New entry', exact: true }).click()
  const dialogo = page.getByRole('dialog', { name: 'New entry', exact: true })
  await expect(dialogo.locator('summary')).toContainText('No allowance')
  await expect(dialogo.locator('summary')).toContainText('Today · Family')
  await dialogo.getByRole('button', { name: 'Record an income', exact: true }).click()
  await expect(dialogo.getByRole('button', { name: 'Record income', exact: true })).toBeVisible()
})
