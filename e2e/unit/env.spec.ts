import { test, expect } from '@playwright/test'
import { isDemoConfig } from '@/lib/supabase/env'

// Esta función decide si la app arranca contra Supabase o en modo demo. Una
// configuración mal detectada se manifiesta como un "Failed to fetch" opaco en
// el navegador, así que conviene tener sus reglas fijadas.

const URL_OK = 'https://abcdefghijklmnop.supabase.co'
const CLAVE_OK = 'sb_publishable_Ejemplo123456789012345678901'

test('con URL y clave válidas NO es modo demo', () => {
  expect(isDemoConfig(URL_OK, CLAVE_OK)).toBe(false)
})

test('acepta también las claves legacy en formato JWT', () => {
  expect(isDemoConfig(URL_OK, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def')).toBe(false)
})

test('sin URL o sin clave es modo demo', () => {
  expect(isDemoConfig('', CLAVE_OK)).toBe(true)
  expect(isDemoConfig(URL_OK, '')).toBe(true)
})

test('los placeholders cuentan como modo demo', () => {
  expect(isDemoConfig('your-supabase-project-url', CLAVE_OK)).toBe(true)
  expect(isDemoConfig('https://placeholder.supabase.co', CLAVE_OK)).toBe(true)
  expect(isDemoConfig(URL_OK, 'your-anon-key')).toBe(true)
})

test('ignora los espacios alrededor de los valores', () => {
  // Un espacio delante de la URL rompía el host sin dar ninguna pista.
  expect(isDemoConfig(`  ${URL_OK}  `, CLAVE_OK)).toBe(false)
  expect(isDemoConfig(URL_OK, `  ${CLAVE_OK}  `)).toBe(false)
})

test('una cadena de solo espacios es modo demo', () => {
  expect(isDemoConfig('   ', CLAVE_OK)).toBe(true)
  expect(isDemoConfig(URL_OK, '   ')).toBe(true)
})

test('una clave con forma de URL indica valores cruzados', () => {
  // Caso real: se pegó la URL en el campo de la clave. Mejor arrancar en demo
  // que apuntar a un servidor imposible.
  expect(isDemoConfig(URL_OK, URL_OK)).toBe(true)
})
