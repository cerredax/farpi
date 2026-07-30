import { test, expect } from '@playwright/test'

// Smoke mínimo en modo demo: login demo → /home con datos mock.

test('la pantalla de login muestra el modo demo', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByText('Modo local activo')).toBeVisible()
})

test('home carga con datos demo y la navegación inferior', async ({ page }) => {
  await page.goto('/home')

  // La navegación inferior está presente con sus secciones.
  await expect(page.getByRole('link', { name: 'Inicio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Comidas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()

  // El saludo de la home aparece (cualquier franja horaria contiene "familia").
  await expect(page.getByText(/familia/i).first()).toBeVisible()
})

test('el sheet de tareas abre como diálogo con campos etiquetados', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Nueva tarea' }).click()

  const dialog = page.getByRole('dialog', { name: 'Nueva tarea' })
  await expect(dialog).toBeVisible()

  // Los campos se localizan por su etiqueta (label ↔ input asociados).
  await expect(dialog.getByRole('textbox', { name: 'Tarea', exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: 'Notas', exact: true })).toBeVisible()

  // Escape cierra el diálogo (pasa a estado inert).
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveAttribute('inert', '')
})
