import { test, expect, type Page } from '@playwright/test'
import type { FixedEntry } from '@/types'

async function abrirGasto(page: Page) {
  await page.goto('/finances')
  await page.getByRole('tab', { name: 'Fijos', exact: true }).click()
  await page.getByRole('region', { name: 'Sale al mes' }).getByRole('button', { name: 'Nuevo gasto', exact: true }).click()
  return page.getByRole('dialog', { name: 'Nuevo gasto fijo', exact: true })
}

async function fijosGuardados(page: Page): Promise<FixedEntry[]> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('farpi_store_v1') ?? '{}').fixedEntries ?? [])
}

test('se añaden dos fijos seguidos conservando la persona y sin copiar el icono', async ({ page }) => {
  const sheet = await abrirGasto(page)
  await expect(sheet.locator('input:visible')).toHaveCount(2)
  await expect(sheet.getByText('Icono', { exact: true })).not.toBeVisible()
  await expect(sheet.locator('summary')).toContainText('Gasto · Familia')
  await expect(sheet).toContainText('Los meses cerrados conservan sus importes')
  await sheet.locator('summary').click()
  await sheet.getByRole('button', { name: '🛡️', exact: true }).click()
  await sheet.getByRole('button', { name: 'Carlos', exact: true }).click()
  await page.locator('#fixed-entry-name').fill('Seguro de prueba')
  await page.locator('#fixed-entry-amount').fill('32,50')
  await sheet.getByRole('button', { name: 'Guardar y añadir otro', exact: true }).click()

  await expect(sheet).not.toHaveAttribute('inert', '')
  await expect(sheet.getByRole('status')).toContainText('«Seguro de prueba» guardado')
  await expect(page.locator('#fixed-entry-name')).toHaveValue('')
  await expect(page.locator('#fixed-entry-amount')).toHaveValue('')
  await expect(page.locator('#fixed-entry-name')).toBeFocused()
  await expect(sheet.locator('summary')).toContainText('💶 · Gasto · Carlos')
  await expect.poll(async () => (await fijosGuardados(page)).filter(f => f.name === 'Seguro de prueba').length).toBe(1)

  await page.locator('#fixed-entry-name').fill('Internet de prueba')
  await page.locator('#fixed-entry-amount').fill('25')
  await page.locator('#fixed-entry-amount').press('Enter')
  await expect(sheet).toHaveAttribute('inert', '')
  await page.reload()
  await page.getByRole('tab', { name: 'Fijos', exact: true }).click()
  const guardados = (await fijosGuardados(page)).filter(f => ['Seguro de prueba', 'Internet de prueba'].includes(f.name))
  expect(guardados).toHaveLength(2)
  expect(guardados.map(f => [f.amount_cents, f.member_id, f.emoji])).toEqual([[3250, 'm1', '🛡️'], [2500, 'm1', '💶']])
  await expect(page.getByRole('region', { name: 'Sale al mes' })).toContainText('Internet de prueba')
})

test('guardar y continuar valida, conserva el borrador si falla y reintenta sin duplicarlo', async ({ page }) => {
  const sheet = await abrirGasto(page)
  const continuar = sheet.getByRole('button', { name: 'Guardar y añadir otro', exact: true })
  await expect(continuar).toBeEnabled()
  await page.locator('#fixed-entry-name').fill('Limpieza de prueba')
  await page.locator('#fixed-entry-amount').fill('abc')
  await continuar.click()
  await expect(sheet.getByRole('alert')).toBeVisible()
  await expect(page.locator('#fixed-entry-name')).toHaveValue('Limpieza de prueba')
  await expect(continuar).toBeEnabled()
  await page.locator('#fixed-entry-amount').fill('45,90')
  await page.evaluate(() => { crypto.randomUUID = () => { throw new Error('sin conexión') } })
  await continuar.click()
  await expect(page.getByText('No se ha guardado el cambio')).toBeVisible()
  await expect(sheet).not.toHaveAttribute('inert', '')
  await expect(page.locator('#fixed-entry-name')).toHaveValue('Limpieza de prueba')
  await expect(page.locator('#fixed-entry-amount')).toHaveValue('45,90')
  await expect(sheet.getByRole('status')).toHaveCount(0)
  await expect(continuar).toBeEnabled()
  await page.evaluate(() => { delete (crypto as { randomUUID?: unknown }).randomUUID })
  await continuar.click()
  await expect(sheet.getByRole('status')).toContainText('«Limpieza de prueba» guardado')
  await expect.poll(async () => (await fijosGuardados(page)).filter(f => f.name === 'Limpieza de prueba').length).toBe(1)
})

test('dos envíos inmediatos crean un solo fijo y respetan la primera intención de continuar', async ({ page }) => {
  const sheet = await abrirGasto(page)
  await page.locator('#fixed-entry-name').fill('Cuota de prueba')
  await page.locator('#fixed-entry-amount').fill('12')
  await page.locator('#fixed-entry-form').evaluate(form => {
    const continuar = document.querySelector<HTMLButtonElement>('button[form="fixed-entry-form"][value="otro"]')!
    const terminar = document.querySelector<HTMLButtonElement>('button[form="fixed-entry-form"]:not([value])')!
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: continuar }))
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: terminar }))
  })
  await expect(sheet.getByRole('status')).toContainText('«Cuota de prueba» guardado')
  await expect(sheet).not.toHaveAttribute('inert', '')
  await expect.poll(async () => (await fijosGuardados(page)).filter(f => f.name === 'Cuota de prueba').length).toBe(1)
})

test('un guardado lento bloquea la edición y devuelve el foco al nombre al terminar', async ({ page }) => {
  const sheet = await abrirGasto(page)
  await page.locator('#fixed-entry-name').fill('Cuota con espera')
  await page.locator('#fixed-entry-amount').fill('18')
  // El repo demo devuelve el fijo con Promise.resolve. Retenemos solo esa
  // respuesta para poder comprobar el estado pendiente sin hablar con Supabase.
  await page.evaluate(() => {
    const original = Promise.resolve
    const ventana = window as Window & { terminarGuardado?: () => void }
    Promise.resolve = ((valor: unknown) => {
      if (valor && typeof valor === 'object' && 'name' in valor && valor.name === 'Cuota con espera') {
        return new Promise<unknown>(resolve => {
          ventana.terminarGuardado = () => {
            Promise.resolve = original
            resolve(valor)
          }
        })
      }
      return original.call(Promise, valor)
    }) as typeof Promise.resolve
  })
  await sheet.getByRole('button', { name: 'Guardar y añadir otro' }).click()
  await expect(page.locator('#fixed-entry-name')).toBeDisabled()
  await expect(page.locator('#fixed-entry-amount')).toBeDisabled()
  await expect(sheet.getByRole('button', { name: 'Guardar y añadir otro' })).toBeDisabled()
  await page.evaluate(() => (window as Window & { terminarGuardado?: () => void }).terminarGuardado?.())
  await expect(page.locator('#fixed-entry-name')).toHaveValue('')
  await expect(page.locator('#fixed-entry-name')).toBeEnabled()
  await expect(page.locator('#fixed-entry-name')).toBeFocused()
  await expect(sheet.getByRole('status')).toContainText('«Cuota con espera» guardado')
})

test('editar solo el importe conserva icono y persona y no ofrece añadir otro', async ({ page }) => {
  await page.goto('/finances')
  await page.getByRole('tab', { name: 'Fijos', exact: true }).click()
  const antes = (await fijosGuardados(page)).find(f => f.name === 'Alquiler')!
  await page.getByRole('region', { name: 'Sale al mes' }).getByText('Alquiler', { exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Editar fijo', exact: true })
  await expect(sheet.locator('details')).not.toHaveAttribute('open', '')
  await expect(sheet.getByRole('button', { name: 'Guardar y añadir otro' })).toHaveCount(0)
  await page.locator('#fixed-entry-amount').fill('810,50')
  await sheet.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(sheet).toHaveAttribute('inert', '')
  const despues = (await fijosGuardados(page)).find(f => f.id === antes.id)!
  expect(despues).toMatchObject({ amount_cents: 81050, kind: antes.kind, emoji: antes.emoji, member_id: antes.member_id, child_id: antes.child_id })
})

test('el bloque de ingresos prepara el tipo y reabrir empieza limpio y plegado', async ({ page }) => {
  await page.goto('/finances')
  await page.getByRole('tab', { name: 'Fijos', exact: true }).click()
  const nuevo = page.getByRole('region', { name: 'Entra al mes' }).getByRole('button', { name: 'Nuevo ingreso', exact: true })
  await nuevo.click()
  const sheet = page.getByRole('dialog', { name: 'Nuevo ingreso fijo', exact: true })
  await expect(sheet.locator('summary')).toContainText('Ingreso · Familia')
  await page.locator('#fixed-entry-name').fill('Nómina de prueba')
  await page.locator('#fixed-entry-amount').fill('1600')
  await sheet.getByRole('button', { name: 'Guardar y añadir otro' }).click()
  await expect(sheet.getByRole('status')).toContainText('«Nómina de prueba» guardado')
  expect((await fijosGuardados(page)).find(f => f.name === 'Nómina de prueba')?.kind).toBe('ingreso')
  await sheet.locator('summary').click()
  await sheet.getByRole('button', { name: 'Sale', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Nuevo gasto fijo', exact: true })).not.toHaveAttribute('inert', '')
  await page.keyboard.press('Escape')
  await nuevo.click()
  await expect(sheet).not.toHaveAttribute('inert', '')
  await expect(sheet.locator('details')).not.toHaveAttribute('open', '')
  await expect(sheet.getByRole('status')).toHaveCount(0)
  await expect(page.locator('#fixed-entry-name')).toHaveValue('')
  await expect(page.locator('#fixed-entry-amount')).toHaveValue('')
  await expect(sheet.locator('summary')).toContainText('Ingreso · Familia')
})

test('el formulario de fijos cabe a 390 px y sus controles llegan a 44 px, también desplegado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const sheet = await abrirGasto(page)
  for (const desplegado of [false, true]) {
    if (desplegado) await sheet.locator('summary').click()
    const errores = await sheet.evaluate(raiz => Array.from(raiz.querySelectorAll<HTMLElement>('button, input, summary'))
      .filter(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
      .flatMap(el => {
        const caja = el.getBoundingClientRect()
        return caja.width < 44 || caja.height < 44 || caja.left < 0 || caja.right > innerWidth
          ? [`${el.textContent?.trim() || el.id}: ${caja.width}×${caja.height}`] : []
      }))
    expect(errores).toEqual([])
  }
})

test('los textos del formulario de fijos siguen el idioma del dispositivo', async ({ page, context }) => {
  await context.addCookies([{ name: 'farpi_idioma', value: 'en', domain: 'localhost', path: '/' }])
  await page.goto('/finances')
  await page.getByRole('tab', { name: 'Fijos', exact: true }).click()
  await page.getByRole('region', { name: 'Sale al mes' }).getByRole('button', { name: 'Nuevo gasto', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'New recurring expense', exact: true })
  await expect(sheet.getByRole('button', { name: 'Save and add another' })).toBeVisible()
  await expect(sheet.locator('summary')).toContainText('More options')
  await expect(sheet).toContainText('Closed months keep their amounts')
})
