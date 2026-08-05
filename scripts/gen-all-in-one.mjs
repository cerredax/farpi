// Genera supabase/all_in_one.sql concatenando las migraciones en orden.
//
// El fichero existe para levantar un proyecto Supabase de cero sin ir pegando
// dieciséis ficheros a mano. Se generaba a mano, que es justo la forma de que un
// día deje de coincidir con las migraciones sin que nadie se entere. Ejecuta esto
// después de añadir una migración.
//
//   node scripts/gen-all-in-one.mjs
//
// Con --check no escribe nada: falla si el fichero no está al día. Sirve para
// comprobarlo sin tocar el disco.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const dirMigraciones = join(raiz, 'supabase', 'migrations')
const destino = join(raiz, 'supabase', 'all_in_one.sql')

const REGLA = '─'.repeat(57)

const migraciones = readdirSync(dirMigraciones)
  .filter((f) => /^\d{3}_.*\.sql$/.test(f))
  .sort()

if (migraciones.length === 0) {
  console.error('No hay migraciones en supabase/migrations/')
  process.exit(1)
}

const numero = (f) => f.slice(0, 3)
const primera = numero(migraciones[0])
const ultima = numero(migraciones.at(-1))

// Un hueco en la numeración casi siempre es un fichero sin commitear, y el
// esquema resultante saldría incompleto sin decir nada.
const esperados = migraciones.map((_, i) => String(i + Number(primera)).padStart(3, '0'))
const huecos = esperados.filter((n) => !migraciones.some((f) => numero(f) === n))
if (huecos.length > 0) {
  console.error(`Faltan migraciones en la secuencia: ${huecos.join(', ')}`)
  process.exit(1)
}

const cabecera = `-- ============================================================
-- NIDO — Esquema completo (migraciones ${primera}–${ultima} concatenadas)
--
-- GENERADO por scripts/gen-all-in-one.mjs. No editar a mano: los cambios se
-- hacen en supabase/migrations/ y se regenera este fichero.
--
-- Para un proyecto NUEVO/VACÍO. Si el proyecto YA tiene tablas, no ejecutes
-- esto entero: aplica solo las migraciones que falten, una a una.
-- ============================================================
`

const cuerpo = migraciones
  .map((fichero) => {
    const sql = readFileSync(join(dirMigraciones, fichero), 'utf8').trimEnd()
    return `\n-- ${REGLA}\n-- ${fichero}\n-- ${REGLA}\n${sql}\n`
  })
  .join('')

const contenido = cabecera + cuerpo

if (process.argv.includes('--check')) {
  let actual = ''
  try {
    actual = readFileSync(destino, 'utf8')
  } catch {
    console.error('all_in_one.sql no existe. Ejecuta: node scripts/gen-all-in-one.mjs')
    process.exit(1)
  }
  if (actual !== contenido) {
    console.error('all_in_one.sql NO está al día. Ejecuta: node scripts/gen-all-in-one.mjs')
    process.exit(1)
  }
  console.log(`all_in_one.sql al día (${migraciones.length} migraciones, ${primera}–${ultima}).`)
  process.exit(0)
}

writeFileSync(destino, contenido, 'utf8')
console.log(`supabase/all_in_one.sql generado: ${migraciones.length} migraciones (${primera}–${ultima}).`)
