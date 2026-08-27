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

  // El saludo vive en la cabecera y depende de la hora, así que vale cualquiera
  // de los tres. Se pinta ya en el navegador: en el HTML servido no está.
  await expect(page.getByText(/Buenos días|Buenas tardes|Buenas noches/).first()).toBeVisible()
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

// Crear una familia de más y volver a cerrarla, que es el caso por el que se
// añadió el borrado: se crea una por probar y hasta ahora no había forma de
// quitarla. El sheet la borra y la app salta sola a la que queda.
test('una familia creada se puede eliminar y la app vuelve a la anterior', async ({ page }) => {
  await page.goto('/settings')

  await page.getByRole('button', { name: '+ Nueva familia' }).click()
  await page.getByPlaceholder('Nombre de la familia').fill('Familia de prueba')
  await page.getByRole('button', { name: 'Crear', exact: true }).click()

  // Al crearla se queda activa: sale en la tarjeta de arriba y, ya con dos, en
  // la lista para cambiar de familia.
  await expect(page.getByText('Familia de prueba')).toHaveCount(2)

  await page.getByRole('button', { name: 'Editar familia' }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar familia' })
  await dialog.getByRole('button', { name: 'Eliminar familia' }).click()
  // El aviso de lo que se lleva por delante solo aparece al pedir el borrado.
  await expect(dialog.getByText(/No se puede deshacer/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Confirmar: se borra todo' }).click()

  await expect(page.getByText('Familia de prueba')).toHaveCount(0)
  await expect(page.getByText('Familia de Omar, Sofía y Ana')).toBeVisible()
})

// El segundo eje de la agenda. Se prueba en el navegador y no en unitarios
// —el reparto ya lo cubre `agruparPorPersona`— porque lo que puede romperse
// aquí es el montaje: que las secciones se llamen como la persona y que la
// etiqueta de quién es desaparezca de las filas cuando el rótulo ya lo dice.
test('la agenda se puede agrupar por persona', async ({ page }) => {
  await page.goto('/calendar')
  await page.getByRole('button', { name: 'Agenda', exact: true }).click()

  const porPersona = page.getByRole('button', { name: 'Por persona' })
  await expect(porPersona).toHaveAttribute('aria-pressed', 'false')
  await porPersona.click()
  await expect(porPersona).toHaveAttribute('aria-pressed', 'true')

  // Cada persona con algo es una sección con su nombre. La familia de demo
  // tiene tareas repartidas, así que "Familia" y "Omar" tienen grupo propio.
  await expect(page.getByRole('region', { name: 'Agenda por persona' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Familia' })).toBeVisible()

  // Y dentro ya no se repite de quién es cada línea: la única etiqueta con
  // nombre en el grupo es su propio rótulo. Se cuenta en el de una persona y
  // no en el de la familia, donde lo de todos nunca llevó etiqueta y la cuenta
  // daría uno aunque las filas siguieran diciendo el nombre. Contarlas, además,
  // porque buscar el texto tampoco valdría: el rótulo va en mayúsculas por CSS
  // y una comparación con "Omar" pasaría sin mirar las filas.
  await expect(page.getByRole('region', { name: 'Omar' }).locator('.etiqueta-persona')).toHaveCount(1)
})
