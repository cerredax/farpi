import { test, expect } from '@playwright/test'

// QA de móvil, automatizada. La Fase 2 del roadmap pedía revisar la app a
// 390×844 —el ancho de un iPhone normal, más estrecho que el Pixel 7 con el que
// corre el resto de la suite— y esto deja fijas las dos comprobaciones que se
// pueden hacer sin un teléfono en la mano:
//
//   1. Que nada desborde a lo ancho. En móvil, 4 px de más convierten toda la
//      página en una que se arrastra de lado.
//   2. Que no haya controles diminutos. El mínimo de la WCAG 2.5.8 es 24×24
//      CSS px; por debajo de eso, el dedo falla.
//
// Lo que sigue necesitando un teléfono de verdad está en docs/testing-checklist.md.

const RUTAS = ['/home', '/calendar', '/tasks', '/lists', '/meals', '/docs', '/settings']

const MINIMO_TOQUE = 24

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

for (const ruta of RUTAS) {
  test(`sin desbordamiento horizontal en ${ruta} a 390 px`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(900)

    const desborde = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      ancho: document.documentElement.clientWidth,
      // Quién se sale, para no tener que adivinarlo si falla.
      culpables: [...document.querySelectorAll('*')]
        .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
        .slice(0, 5)
        .map(el => `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 60)}`),
    }))

    expect(desborde.scroll, `Se sale del ancho en ${ruta}: ${desborde.culpables.join(' | ')}`)
      .toBeLessThanOrEqual(desborde.ancho + 1)
  })

  test(`los controles se pueden tocar con el dedo en ${ruta}`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(900)

    const pequenos = await page.evaluate(minimo => {
      const interactivos = [...document.querySelectorAll('button, a[href], input, select, textarea')]
      return interactivos
        .filter(el => {
          const r = el.getBoundingClientRect()
          // Los que no se ven (sheets cerrados, menús plegados) no cuentan.
          if (r.width === 0 || r.height === 0) return false
          if (el.closest('[inert]')) return false
          return r.width < minimo || r.height < minimo
        })
        .slice(0, 8)
        .map(el => {
          const r = el.getBoundingClientRect()
          const texto = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName
          return `${texto} (${Math.round(r.width)}×${Math.round(r.height)})`
        })
    }, MINIMO_TOQUE)

    expect(pequenos, `Controles por debajo de ${MINIMO_TOQUE}px en ${ruta}`).toEqual([])
  })
}
