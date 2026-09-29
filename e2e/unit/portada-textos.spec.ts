import { test, expect } from '@playwright/test'
import { PORTADA_ES, type TextosPortada } from '@/components/landing/textos'

// Los textos de la portada viven en un objeto desde el 28-09-2026, para poder
// traducirla sin tocar la maqueta. Eso los convierte en datos, y a los datos se
// les pueden pasar reglas: las de la casa estaban escritas en los documentos y
// no las miraba nadie. Cuando exista `PORTADA_EN`, se añade a `IDIOMAS` y pasa
// por lo mismo.

const IDIOMAS: [string, TextosPortada][] = [['es', PORTADA_ES]]

/** Todas las frases del objeto, con la ruta de cada una para saber cuál falla. */
function frases(valor: unknown, ruta = ''): [string, string][] {
  if (typeof valor === 'string') return [[ruta, valor]]
  // Si algún texto llega a ser una función, se prueba con un valor cualquiera.
  if (typeof valor === 'function') return [[ruta, (valor as (t: string) => string)('Inicio')]]
  if (Array.isArray(valor)) return valor.flatMap((v, i) => frases(v, `${ruta}[${i}]`))
  if (valor && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([k, v]) => frases(v, ruta ? `${ruta}.${k}` : k))
  }
  return []
}

for (const [idioma, textos] of IDIOMAS) {
  test.describe(`textos de la portada (${idioma})`, () => {
    const todas = frases(textos)

    test('hay frases que mirar', () => {
      // Si el recorrido dejara de entrar en el objeto, las demás pasarían sin
      // comprobar nada.
      expect(todas.length).toBeGreaterThan(40)
    })

    test('ninguna lleva un guion largo', () => {
      // Se usaban a puñados para meter incisos, y es de lo que más delata un
      // texto escrito por una máquina. Van con comas, paréntesis o partiendo la
      // frase. En los comentarios del código sí: ahí no lee nadie de fuera.
      const conGuion = todas.filter(([, frase]) => frase.includes('—')).map(([ruta]) => ruta)
      expect(conGuion).toEqual([])
    })

    test('ninguna está vacía ni lleva espacios de sobra', () => {
      const malas = todas
        .filter(([, frase]) => !frase || frase !== frase.trim() || frase.includes('  '))
        .map(([ruta]) => ruta)
      expect(malas).toEqual([])
    })

    test('los títulos no llevan punto final', () => {
      // Lo pidió Omar el 28-09-2026: un título no es una frase. Incluye la
      // primera frase de su texto, que va en grande y hace de título.
      const titulos = [
        textos.titular,
        textos.historia.frase,
        textos.capturas.titulo,
        textos.preguntas.titulo,
        ...textos.capturas.inicio.notas.map(n => n.titulo),
        textos.capturas.listas.titulo,
        textos.capturas.calendario.titulo,
      ]
      expect(titulos.filter(t => t.endsWith('.'))).toEqual([])
    })
  })
}

test('en castellano se dice «casa», no «hogar»', () => {
  // "Hogar" es la palabra de los seguros y de los anuncios de sofás, y
  // "¿Qué tenemos que saber hoy en casa?" es la marca.
  const conHogar = frases(PORTADA_ES).filter(([, frase]) => /hogar/i.test(frase)).map(([ruta]) => ruta)
  expect(conHogar).toEqual([])
})

test('la captura de Inicio se sigue llamando «Pantalla de Inicio»', () => {
  // `e2e/smoke.spec.ts` la busca por ese nombre para ver que la imagen carga.
  expect(PORTADA_ES.capturas.inicio.alt).toMatch(/^Pantalla de Inicio/)
})
