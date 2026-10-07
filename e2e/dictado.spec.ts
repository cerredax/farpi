import { test, expect, type Page } from '@playwright/test'

// El micrófono de verdad no se puede probar desde aquí, pero **todo lo que va detrás
// sí**: el navegador de pruebas no trae reconocimiento de voz, así que se le pone uno
// falso que contesta con la frase que diga el test. Lo que se comprueba es el camino
// entero —botón, propuesta, confirmar, guardar— y no que el micrófono entienda.

async function conVoz(page: Page, frase: string) {
  await page.addInitScript(texto => {
    class ReconocimientoFalso {
      lang = ''
      interimResults = false
      continuous = false
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: texto }]] })
          this.onend?.()
        }, 30)
      }
      stop() { this.onend?.() }
    }
    const w = window as unknown as Record<string, unknown>
    w.webkitSpeechRecognition = ReconocimientoFalso
    w.SpeechRecognition = ReconocimientoFalso
  }, frase)
}

test('dictar en una lista enseña los ítems y los guarda al confirmar', async ({ page }) => {
  await conVoz(page, 'Añade ibuprofeno, tiritas y gasas')
  await page.goto('/lists')
  await page.waitForTimeout(700)
  await page.getByText('Farmacia').first().click()

  await page.getByRole('button', { name: 'Dictar con la voz' }).click()
  await expect(page.getByText('Se añadirán 3:')).toBeVisible()
  // Nada se ha guardado todavía.
  await expect(page.getByRole('button', { name: 'Tiritas', exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Añadir 3' }).click()
  for (const item of ['Ibuprofeno', 'Tiritas', 'Gasas']) {
    await expect(page.getByRole('button', { name: item, exact: true })).toBeVisible()
  }
})

test('descartar lo dictado no guarda nada', async ({ page }) => {
  await conVoz(page, 'ibuprofeno y tiritas')
  await page.goto('/lists')
  await page.waitForTimeout(700)
  await page.getByText('Farmacia').first().click()

  await page.getByRole('button', { name: 'Dictar con la voz' }).click()
  await page.getByRole('button', { name: 'Descartar' }).click()
  await expect(page.getByText('Se añadirán 2:')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tiritas', exact: true })).toHaveCount(0)
})

test('decir la lista al final manda los ítems a esa lista', async ({ page }) => {
  await conVoz(page, 'zumo de piña y cereales a la compra')
  await page.goto('/lists')
  await page.waitForTimeout(700)
  await page.getByText('Farmacia').first().click()

  await page.getByRole('button', { name: 'Dictar con la voz' }).click()
  await expect(page.getByText('Se añadirán 2 a «Compra»:')).toBeVisible()
  await page.getByRole('button', { name: 'Añadir 2' }).click()

  await page.goto('/lists')
  await page.waitForTimeout(700)
  await page.getByText('Compra', { exact: true }).first().click()
  await expect(page.getByRole('main').getByRole('button', { name: 'Cereales', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('main').getByRole('button', { name: 'Zumo de piña', exact: true }).first()).toBeVisible()
})

test('dictar un plan rellena el título, el día y la hora, y no guarda solo', async ({ page }) => {
  await conVoz(page, 'Dentista mañana a las 5 de la tarde')
  await page.goto('/calendar')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()

  await page.getByRole('button', { name: 'Dictar con la voz' }).click()
  await expect(page.locator('#event-title')).toHaveValue('Dentista')
  await expect(page.locator('#event-start')).toHaveValue('17:00')

  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  const esperado = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, '0')}-${String(manana.getDate()).padStart(2, '0')}`
  await expect(page.locator('#event-date')).toHaveValue(esperado)

  // El formulario sigue abierto: hay que revisarlo y pulsar «Apuntar».
  await expect(page.getByRole('button', { name: 'Apuntar', exact: true })).toBeVisible()
})
