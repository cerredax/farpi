import { test, expect } from '@playwright/test'
import {
  cookieDeIdioma, diccionario, IDIOMA_POR_DEFECTO, IDIOMAS, IDIOMAS_OFRECIDOS, idiomaDelNavegador,
  idiomaDesdeCookie, idiomasParaElegir, leerCookieIdioma, NOMBRE_DEL_IDIOMA, textosDelNavegador,
} from '@/lib/i18n'
import { es } from '@/lib/i18n/es'
import { en } from '@/lib/i18n/en'
import { localeDeFechas } from '@/lib/i18n/fechas'
import { mensajeDeError } from '@/lib/errores'
import { validateBudgetDraft, validateFamilyName, validateTaskDraft } from '@/lib/validators'
import type { BudgetDraft, TaskDraft } from '@/types'

// La app en otro idioma, preparada el 28-09-2026. TypeScript ya obliga a que
// cada traducción tenga la forma del castellano; esto mira lo que el tipo no ve:
// que no haya frases vacías, que una función siga siendo una función, y que la
// mecánica de la cookie diga lo mismo en el servidor y en el navegador.

/** Cada hoja del diccionario con su ruta, y las funciones probadas con un número. */
function hojas(valor: unknown, ruta = ''): [string, string, 'texto' | 'funcion'][] {
  if (typeof valor === 'string') return [[ruta, valor, 'texto']]
  if (typeof valor === 'function') {
    // Con un número, que es lo que reciben los plurales; y si la función espera
    // texto (`franja.toLowerCase()`), con la cifra escrita.
    const llamar = (n: number) => {
      const f = valor as (...args: unknown[]) => string
      try { return f(n, n) } catch { return f(String(n), String(n)) }
    }
    return [1, 3].map(n => [`${ruta}(${n})`, llamar(n), 'funcion'] as [string, string, 'funcion'])
  }
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([k, v]) => hojas(v, ruta ? `${ruta}.${k}` : k))
  }
  return []
}

test.describe('los diccionarios', () => {
  test('hay frases que mirar', () => {
    // Si el recorrido dejara de entrar en el objeto, lo demás pasaría sin mirar nada.
    expect(hojas(es).length).toBeGreaterThan(80)
  })

  for (const idioma of IDIOMAS) {
    test(`${idioma}: la misma forma que el castellano`, () => {
      // El tipo lo exige al compilar, pero un `as` o un objeto armado a mano lo
      // saltan. Aquí se compara lo que hay de verdad: las mismas rutas, y lo que
      // era una función sigue siéndolo.
      const forma = (d: unknown) => hojas(d).map(([ruta, , tipo]) => `${ruta}:${tipo}`)
      expect(forma(diccionario(idioma))).toEqual(forma(es))
    })

    test(`${idioma}: ninguna frase vacía ni con espacios de sobra`, () => {
      const malas = hojas(diccionario(idioma))
        // Un espacio en el extremo vale: hay frases que son un trozo antes o después
        // de un `<strong>` (`'Se borra '`). Lo que no vale es más de uno seguido.
        .filter(([, frase]) => !frase.trim() || frase.includes('  ') || /^\s{2,}|\s{2,}$/.test(frase))
        .map(([ruta]) => ruta)
      expect(malas).toEqual([])
    })

    test(`${idioma}: ninguna lleva un guion largo`, () => {
      // La regla de la casa para lo que lee alguien de fuera: los incisos, con
      // comas o paréntesis.
      const conGuion = hojas(diccionario(idioma)).filter(([, frase]) => frase.includes('—')).map(([ruta]) => ruta)
      expect(conGuion).toEqual([])
    })
  }

  test('el inglés está traducido, no copiado', () => {
    // Una traducción a medias se nota en las frases que siguen igual que en
    // castellano. Se permiten las que se escriben igual en los dos idiomas, por
    // su valor: si una palabra vale igual en inglés, vale en cualquier sitio.
    const igualesEnLosDos = new Set(['Legal', 'Beta', 'Personal', 'Email', 'Agenda', 'Google Drive', '1 plan'])
    // Los patrones de fecha (`d MMM yyyy`), las iniciales y las cifras se escriben
    // igual en los dos idiomas: no hay nada que traducir.
    const esPatron = (frase: string) => /^[dDEMyS0-9 ,.\-–]+$/.test(frase)
    const castellano = new Map(hojas(es).map(([ruta, frase]) => [ruta, frase]))
    const sinTraducir = hojas(en)
      .filter(([ruta, frase]) => castellano.get(ruta) === frase && !igualesEnLosDos.has(frase) && !esPatron(frase))
      .map(([ruta]) => ruta)
    expect(sinTraducir).toEqual([])
  })

  test('los plurales cambian con el número', () => {
    expect(es.ajustes.adultos(1)).toBe('1 adulto')
    expect(es.ajustes.adultos(2)).toBe('2 adultos')
    expect(en.ajustes.hijos(1)).toBe('1 child')
    expect(en.ajustes.hijos(3)).toBe('3 children')
  })
})

test.describe('el idioma del dispositivo', () => {
  test('por defecto, castellano', () => {
    expect(IDIOMA_POR_DEFECTO).toBe('es')
    expect(idiomaDesdeCookie(undefined)).toBe('es')
    expect(idiomaDesdeCookie(null)).toBe('es')
    expect(idiomaDesdeCookie('')).toBe('es')
  })

  test('la cookie manda si dice un idioma que conocemos, y si no, se ignora', () => {
    expect(idiomaDesdeCookie('en')).toBe('en')
    expect(idiomaDesdeCookie('fr')).toBe('es')
    expect(idiomaDesdeCookie('EN')).toBe('es')
  })

  test('se encuentra entre las demás cookies', () => {
    expect(leerCookieIdioma('a=1; farpi_idioma=en; b=2')).toBe('en')
    expect(leerCookieIdioma('farpi_idioma=en')).toBe('en')
    expect(leerCookieIdioma('otra_farpi_idioma=en')).toBeNull()
    expect(leerCookieIdioma('')).toBeNull()
  })

  test('lo que se escribe es lo que se vuelve a leer', () => {
    const linea = cookieDeIdioma('en')
    // Solo el primer trozo va en la cabecera `Cookie`; lo demás son atributos.
    expect(leerCookieIdioma(linea.split(';')[0])).toBe('en')
    // Toda la app, no solo la página donde se eligió, y sin `HttpOnly`: la tiene
    // que leer el navegador.
    expect(linea).toContain('Path=/')
    expect(linea).not.toMatch(/httponly/i)
  })

  test('fuera del navegador es el de siempre', () => {
    // Aquí no hay `document`: es lo que pasa en el servidor.
    expect(idiomaDelNavegador()).toBe('es')
    expect(textosDelNavegador()).toBe(es)
  })

  test('cada idioma tiene su nombre, escrito en sí mismo', () => {
    for (const idioma of IDIOMAS) expect(NOMBRE_DEL_IDIOMA[idioma]).toBeTruthy()
    expect(NOMBRE_DEL_IDIOMA.en).toBe('English')
  })

  test('el locale de las fechas empieza la semana en lunes en los dos idiomas', () => {
    for (const idioma of IDIOMAS) expect(localeDeFechas(idioma).options?.weekStartsOn).toBe(1)
  })
})

test.describe('entre qué idiomas se elige', () => {
  test('el inglés no se ofrece mientras la app no esté entera', () => {
    // Si este test falla porque se ha añadido `'en'`, es que la traducción está
    // completa: quítalo junto con esa línea.
    expect(IDIOMAS_OFRECIDOS).toEqual(['es'])
    expect(idiomasParaElegir('es')).toEqual(['es'])
  })

  test('el idioma que ya se usa siempre sale, para poder volver', () => {
    // Con la cookie en inglés y solo el castellano ofrecido, el selector tiene
    // que aparecer: si no, no habría forma de salir del inglés.
    expect(idiomasParaElegir('en')).toEqual(['es', 'en'])
  })
})

test.describe('los errores en otro idioma', () => {
  test('el fallo de RLS se cuenta en inglés', () => {
    const dicho = mensajeDeError('new row violates row-level security policy for table "family_invites"', '42501', en.errores)
    expect(dicho).toBe(en.errores.permiso)
  })

  test('una frase nuestra en inglés no se confunde con una de Postgres', () => {
    // El mismo fallo pasa por aquí dos veces (la frontera de los repositorios y
    // el `catch` del store). Sin la comprobación de las frases propias, la
    // segunda vuelta veía inglés sin acentos y lo cambiaba por la genérica.
    for (const frase of Object.values(en.errores)) {
      expect(mensajeDeError(frase, null, en.errores)).toBe(frase)
    }
  })

  test('lo técnico sigue siendo la genérica, en el idioma de cada uno', () => {
    expect(mensajeDeError('unexpected server response for relation tasks', null, en.errores)).toBe(en.errores.generico)
    expect(mensajeDeError('   ', null, en.errores)).toBe(en.errores.generico)
  })

  test('sin decir idioma, castellano', () => {
    expect(mensajeDeError('otro texto raro', '23505')).toBe(es.errores.duplicado)
  })
})

test.describe('los validadores en otro idioma', () => {
  test('dicen el mensaje del idioma que se les pasa', () => {
    expect(validateFamilyName('  ', en.validacion)).toBe(en.validacion.familiaSinNombre)
    const tarea = { title: '', recurrence: 'none' } as TaskDraft
    expect(validateTaskDraft(tarea, en.validacion)).toBe(en.validacion.tituloObligatorio)
  })

  test('el importe también, con el máximo escrito dentro', () => {
    const partida = { name: 'Súper', monthly_limit: '' } as BudgetDraft
    expect(validateBudgetDraft(partida, en.validacion)).toBe(en.validacion.faltaImporte.partida)
    const excesivo = validateBudgetDraft({ ...partida, monthly_limit: '5000000' }, en.validacion)
    expect(excesivo).toMatch(/ at most\.$/)
  })

  test('sin decir idioma, el castellano de siempre', () => {
    expect(validateFamilyName('')).toBe('El nombre de la familia no puede estar vacío.')
  })
})
