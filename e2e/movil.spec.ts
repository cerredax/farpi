import { test, expect, type Page } from '@playwright/test'
import { elegirVista } from './vistas'

// QA de móvil, automatizada. El repaso visual del MVP pedía revisar la app a
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

// La barra de la página de inicio pública lleva la marca y los dos botones de
// cuenta en una sola fila, que es justo lo que se sale a 390 px si crece.
const RUTAS = ['/', '/home', '/calendar', '/tasks', '/lists', '/meals', '/finances', '/notes', '/docs', '/birthdays', '/settings']

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

  // Un `BottomSheet` cerrado es `fixed bottom-0` con `translate-y-full`, así
  // que tiene que quedar **entero** por debajo del borde. Si algo le mete un
  // margen —estar dentro de un contenedor con `space-y-*`, que es lo que les
  // pasaba a Inicio y a Finanzas hasta el 05-09-2026— el ancla se corre hacia
  // arriba, el desplazamiento ya no basta y el sheet asoma tapando las
  // etiquetas de la barra de navegación. No lo veía ninguna de las dos
  // comprobaciones de arriba: ni desborda a lo ancho ni es un control pequeño,
  // simplemente está encima.
  test(`ningún sheet cerrado asoma por abajo en ${ruta}`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(900)

    const asoman = await page.evaluate(() => {
      const alto = window.innerHeight
      return [...document.querySelectorAll('[role="dialog"][inert]')]
        .map(el => ({
          titulo: el.querySelector('h3')?.textContent ?? el.tagName,
          asoma: Math.round(alto - el.getBoundingClientRect().top),
        }))
        .filter(x => x.asoma > 0)
    })

    expect(asoman, `Sheets cerrados asomando en ${ruta}: ${asoman.map(x => `${x.titulo} (${x.asoma}px)`).join(', ')}`)
      .toEqual([])
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
          // La excepción "inline" que la propia 2.5.8 recoge: un enlace metido
          // en una frase mide lo que mide el renglón, y agrandarlo rompería el
          // texto que lo rodea. En Farpi es uno: el correo de la carta de la
          // portada. No es una rendija abierta a los controles de la app, que
          // ninguno es `display: inline`.
          if (getComputedStyle(el).display === 'inline') return false
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

// El bucle de arriba recorre cada ruta como se abre, y el calendario abre en la
// agenda: así la rejilla del mes no llegaba a pintarse nunca y las dos
// comprobaciones no la miraban. Es justo la vista con más elementos por píxel de
// la app —42 celdas en 390 px—, así que se pide a mano.
test('el mes del calendario cabe y se puede tocar a 390 px', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(900)
  // El mes es la vista de partida, pero se pide igualmente: el test mide celdas de
  // día y no debe depender de cuál sea el valor por defecto hoy.
  await elegirVista(page, 'Mes')
  await page.waitForTimeout(400)

  const medidas = await page.evaluate(minimo => {
    const interactivos = [...document.querySelectorAll('button, a[href], input, select, textarea')]
    return {
      scroll: document.documentElement.scrollWidth,
      ancho: document.documentElement.clientWidth,
      pequenos: interactivos
        .filter(el => {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) return false
          if (el.closest('[inert]')) return false
          return r.width < minimo || r.height < minimo
        })
        .slice(0, 8)
        .map(el => {
          const r = el.getBoundingClientRect()
          const texto = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName
          return `${texto} (${Math.round(r.width)}×${Math.round(r.height)})`
        }),
    }
  }, MINIMO_TOQUE)

  expect(medidas.scroll, 'El mes del calendario se sale del ancho').toBeLessThanOrEqual(medidas.ancho + 1)
  expect(medidas.pequenos, `Controles por debajo de ${MINIMO_TOQUE}px en el mes`).toEqual([])
})

// El botón "Hoy" solo existe cuando lo que se mira no contiene hoy, así que el
// test de arriba —que abre el calendario en el mes actual— no llega a verlo
// nunca. Y entra en la fila más apretada de la app: a 390 px comparte línea con
// dos flechas, el título, el selector de vista y el `+`.
test('con el botón «Hoy» puesto, la cabecera del calendario sigue cabiendo a 390 px', async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(900)
  await elegirVista(page, 'Mes')

  // Un mes adelante: es lo que hace aparecer el botón.
  await page.getByRole('button', { name: 'Mes siguiente' }).click()
  await page.waitForTimeout(400)

  const hoy = page.getByRole('button', { name: 'Hoy', exact: true })
  await expect(hoy).toBeVisible()

  const caja = await hoy.boundingBox()
  expect(caja!.width, 'El botón «Hoy» es más estrecho que el mínimo de toque').toBeGreaterThanOrEqual(MINIMO_TOQUE)
  expect(caja!.height, 'El botón «Hoy» es más bajo que el mínimo de toque').toBeGreaterThanOrEqual(MINIMO_TOQUE)

  const desborde = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    ancho: document.documentElement.clientWidth,
  }))
  expect(desborde.scroll, 'La cabecera con «Hoy» se sale del ancho').toBeLessThanOrEqual(desborde.ancho + 1)

  // Y el título se lee entero, que es lo que el desborde no cazaba: `truncate`
  // recorta por dentro sin sacar un píxel de la pantalla, así que la fila cabía
  // mientras ponía "Agosto …" —sin el año, justo cuando te has ido del mes de
  // hoy y el año es la mitad de la respuesta—. Se mira el elemento y no el
  // texto: es el navegador quien dice si lo que pinta cabe en su caja.
  const titulo = await page.evaluate(() => {
    const h = document.querySelector('main h2')
    return h ? { texto: h.textContent, cabe: h.scrollWidth <= h.clientWidth + 1 } : null
  })
  expect(titulo?.cabe, `El título del mes sale recortado: «${titulo?.texto}»`).toBe(true)

  // Y hace lo que dice: vuelve al mes de hoy, con lo que el botón se va solo.
  await hoy.click()
  await page.waitForTimeout(400)
  await expect(hoy).toHaveCount(0)
})

// ── El listón cómodo ──────────────────────────────────────────────────────────
//
// Los 24 px de arriba son el mínimo de la WCAG 2.5.8 y siguen siendo el suelo
// duro. Esto es lo otro: **44 px**, que es lo que recomiendan Apple y Material y
// lo que mide un dedo de verdad. La app entera llegó ahí el 09-09-2026 —pestañas
// de 28, chips de 30, flechas de 36, los tres desplegables de 24 de Finanzas, la
// papelera de una tarea, las seis pastillas de la barra de abajo— y esto es para
// que no vuelva a bajar sin que nadie se entere.
//
// Va en su propio bucle y no dentro del de arriba a propósito: son dos
// exigencias distintas —una es la norma y la otra es el criterio de la casa— y
// mezclarlas haría que un control de 30 px fallase diciendo "mínimo 24".
const MINIMO_COMODO = 44

/**
 * Los controles de `raiz` que no llegan a `MINIMO_COMODO` por alguno de sus dos
 * lados, con el texto y la medida de cada uno para no tener que adivinarlo.
 *
 * Es una función y no otra copia del bucle porque ya no mide solo las rutas: lo
 * que hay dentro de un sheet abierto se mide con esta misma regla, y la regla
 * tiene que ser una.
 */
async function controlesCortos(page: Page, raiz = 'body'): Promise<string[]> {
  return page.evaluate(({ minimo, raiz }) => {
    const dentro = document.querySelector(raiz)
    // Que el sheet no se haya abierto no puede salir como "ningún control corto".
    if (!dentro) return [`no hay ningún ${raiz} en la página`]

    return [...dentro.querySelectorAll('button, a[href], input, select, textarea')]
      .filter(el => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return false
        if (el.closest('[inert]')) return false
        // La excepción que la propia WCAG 2.5.8 llama "inline": un enlace
        // dentro de una frase no se puede agrandar sin romper el renglón del
        // texto que lo rodea. Son los de la portada —el correo dentro de la
        // carta, Privacidad y Términos al pie—, no controles de la app.
        if (getComputedStyle(el).display === 'inline') return false
        // `area-de-toque` amplía el alto 8 px por arriba y por abajo con un
        // pseudoelemento, que `getBoundingClientRect` no ve.
        const extra = el.classList.contains('area-de-toque') ? 16 : 0
        return r.width < minimo || r.height + extra < minimo
      })
      .slice(0, 8)
      .map(el => {
        const r = el.getBoundingClientRect()
        const texto = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || el.tagName
        return `${texto} (${Math.round(r.width)}×${Math.round(r.height)})`
      })
  }, { minimo: MINIMO_COMODO, raiz })
}

for (const ruta of RUTAS) {
  test(`los controles llegan a ${MINIMO_COMODO}px en ${ruta}`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(900)

    const cortos = await controlesCortos(page)

    expect(cortos, `Controles por debajo de ${MINIMO_COMODO}px en ${ruta}`).toEqual([])
  })
}

// Y lo que hay **dentro de los sheets**, que es donde más se toca y donde el
// bucle de arriba no llegaba nunca: un sheet cerrado es `inert` y el filtro lo
// salta. Así se descubrió el 17-09-2026 que "la app entera llegó a 44 px" era
// verdad de las pantallas y no de los formularios —chips de 30 a 34, rejillas de
// emoji de 36, sugerencias de 28— y por eso esto se mide desde aquí y no a ojo.
const SHEETS = [
  { ruta: '/tasks', boton: 'Nueva tarea', dialogo: 'Nueva tarea' },
  { ruta: '/lists', boton: 'Nueva lista', dialogo: 'Nueva lista' },
  { ruta: '/notes', boton: 'Nueva nota', dialogo: 'Nueva nota' },
  { ruta: '/finances', boton: 'Nuevo apunte', dialogo: 'Nuevo apunte' },
  { ruta: '/docs', boton: 'Añadir documento', dialogo: 'Añadir documento' },
  { ruta: '/calendar', boton: 'Apuntar algo', dialogo: 'Apuntar en el calendario' },
  { ruta: '/meals', boton: 'Añadir comida', dialogo: 'Añadir comida' },
]

for (const { ruta, boton, dialogo } of SHEETS) {
  test(`los controles del sheet de ${ruta} llegan a ${MINIMO_COMODO}px`, async ({ page }) => {
    await page.goto(ruta)
    await page.waitForTimeout(900)

    // `.first()`: en calendario y comidas el botón de añadir se repite por día.
    await page.getByRole('button', { name: boton }).first().click()
    await expect(page.getByRole('dialog', { name: dialogo })).toBeVisible()
    await page.waitForTimeout(500)

    const cortos = await controlesCortos(page, '[role="dialog"]:not([inert])')

    expect(cortos, `Controles por debajo de ${MINIMO_COMODO}px en el sheet de ${ruta}`).toEqual([])
  })
}

// La ficha de una persona no se abre desde ningún `+`, así que tampoco entra en
// el bucle de arriba, y es donde viven los dos controles que quedaban cortos: los
// catorce círculos de color (36) y el «Eliminar» de la cabecera (28).
test(`los controles de la ficha de una persona llegan a ${MINIMO_COMODO}px`, async ({ page }) => {
  await page.goto('/settings')
  await page.waitForTimeout(900)
  // En móvil, Ajustes abre en el índice de secciones.
  await page.getByRole('link', { name: /Familia/ }).first().click()
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: /Cris/ }).first().click()
  await expect(page.getByRole('dialog').filter({ hasText: 'Color' }).first()).toBeVisible()
  await page.waitForTimeout(400)

  const cortos = await controlesCortos(page, '[role="dialog"]:not([inert])')

  expect(cortos, `Controles por debajo de ${MINIMO_COMODO}px en la ficha de una persona`).toEqual([])
})

// Lo que solo aparece al pedirlo: los días de la semana del calendario salen
// cuando la repetición es semanal, así que el bucle de arriba tampoco los ve.
test(`los días de una repetición semanal llegan a ${MINIMO_COMODO}px`, async ({ page }) => {
  await page.goto('/calendar')
  await page.waitForTimeout(900)

  await page.getByRole('button', { name: 'Apuntar algo' }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Apuntar en el calendario' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Cada semana' }).click()
  await expect(sheet.getByText('Repetir los días')).toBeVisible()
  await page.waitForTimeout(400)

  const cortos = await controlesCortos(page, '[role="dialog"]:not([inert])')

  expect(cortos, `Controles por debajo de ${MINIMO_COMODO}px al repetir cada semana`).toEqual([])
})

// Los dos sitios de Documentos que el bucle de arriba **no puede ver**, y que por
// eso se habían quedado atrás: 42 px el de abrir el archivo y 28 el aspa del
// aviso. Uno vive dentro de un sheet —inerte mientras está cerrado, así que el
// filtro lo salta— y el otro solo aparece al volver de conectar Google Drive,
// con un parámetro en la URL que ninguna ruta de la lista lleva.
//
// Van acotados a Documentos y no a toda la app a propósito: **dentro de los
// sheets del resto de secciones sigue habiendo controles de 28 a 36 px**, casi
// todos de dos componentes compartidos, y subirlos es otro trabajo. La lista
// medida está en docs/project-status.md.
test(`el aviso de vuelta de Drive llega a ${MINIMO_COMODO}px`, async ({ page }) => {
  await page.goto('/docs?drive=ok')
  await page.waitForTimeout(900)

  // Por el texto: en la página hay dos `role="status"`, este y la región viva
  // —vacía— con la que `SaveStatus` cuenta lo que no se ha guardado.
  await expect(page.getByRole('status').filter({ hasText: 'Google Drive conectado' })).toBeVisible()
  // Y se mide la ruta entera, no solo el aviso: con el parámetro puesto es una
  // pantalla más de la app, y nadie más la estaba mirando.
  const cortos = await controlesCortos(page)

  expect(cortos, `Controles por debajo de ${MINIMO_COMODO}px en el aviso de Drive`).toEqual([])
})

test(`los controles del sheet de editar un documento llegan a ${MINIMO_COMODO}px`, async ({ page }) => {
  await page.goto('/docs')
  await page.waitForTimeout(900)

  await page.getByRole('button', { name: /DNI de Carlos/ }).first().click()
  const sheet = page.getByRole('dialog', { name: 'Editar documento' })
  await expect(sheet).toBeVisible()
  await page.waitForTimeout(400)

  const cortos = await controlesCortos(page, '[role="dialog"]:not([inert])')

  expect(cortos, `Controles por debajo de ${MINIMO_COMODO}px al editar un documento`).toEqual([])
})

// Las cuatro pestañas de Finanzas pasaron a ser una barra segmentada el
// 14-09-2026, y lo que esa barra promete es que se ve entera: antes eran cuatro
// píldoras con `overflow-x-auto` y a 390 px la cuarta se quedaba fuera del borde,
// así que «Presupuestos» solo aparecía si a alguien se le ocurría arrastrar. El
// bucle de arriba no lo habría visto nunca: un contenedor que se arrastra no
// desborda la página.
test('las cuatro pestañas de Finanzas caben enteras a 390 px', async ({ page }) => {
  await page.goto('/finances')
  await page.waitForTimeout(900)

  const barra = page.getByRole('tablist', { name: 'Secciones de finanzas' })
  await expect(barra).toBeVisible()

  // Sin arrastre: lo que se ve es todo lo que hay.
  const medidas = await barra.evaluate(el => ({ scroll: el.scrollWidth, visible: el.clientWidth }))
  expect(medidas.scroll).toBeLessThanOrEqual(medidas.visible)

  for (const nombre of ['Este mes', 'Estadísticas', 'Fijos', 'Presupuestos']) {
    const pestaña = page.getByRole('tab', { name: nombre })
    const caja = await pestaña.boundingBox()
    expect(caja, `falta la pestaña ${nombre}`).not.toBeNull()
    // Dentro de la pantalla y con el nombre sin recortar.
    expect(caja!.x + caja!.width, `${nombre} se sale a la derecha`).toBeLessThanOrEqual(390)
    const recortada = await pestaña.evaluate(el => el.scrollWidth > el.clientWidth)
    expect(recortada, `${nombre} sale recortada`).toBe(false)
  }
})
