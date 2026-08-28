import type { Page } from '@playwright/test'

/**
 * Cambiar de vista en el calendario **desde el móvil**, que es donde corre la
 * suite (el proyecto de Playwright es un Pixel 7).
 *
 * Desde el 28-08-2026 las cuatro pastillas de móvil son un solo botón que
 * despliega las vistas, así que ya no basta con pulsar "Semana": hay que abrir
 * el menú primero. En escritorio siguen siendo pastillas y `escritorio.spec.ts`
 * las pulsa directamente, que por eso no usa esto.
 *
 * El `main` no sobra: en `npm run dev` la burbuja de las Dev Tools de Next
 * también es un botón con `aria-haspopup="menu"`, y la suite corre en dev.
 */
export async function elegirVista(page: Page, vista: 'Agenda' | 'Día' | 'Semana' | 'Mes') {
  await page.locator('main button[aria-haspopup="menu"]').click()
  await page.getByRole('menuitemradio', { name: vista, exact: true }).click()
}
