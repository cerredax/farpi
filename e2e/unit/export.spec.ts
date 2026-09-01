import { test, expect } from '@playwright/test'
import {
  construirExportacion,
  nombreDeArchivo,
  resumenDeExportacion,
  VERSION_EXPORT,
  type DatosParaExportar,
} from '@/lib/export'
import type { Family } from '@/types'

// La copia de seguridad de la familia. Lo que se prueba aquí es lo que puede
// romperse en silencio y no lo notarías hasta el día en que hace falta: que no se
// cuele un token, que no falte una tabla, y que el archivo no se llame como el día
// de ayer.

const FAMILIA: Family = {
  id: 'f1',
  name: 'García Farpón',
  meal_slots: ['breakfast', 'lunch', 'snack', 'dinner'],
  created_at: '2026-06-01T00:00:00',
  updated_at: '2026-06-01T00:00:00',
}

function datos(extra: Partial<DatosParaExportar> = {}): DatosParaExportar {
  return {
    family: FAMILIA,
    members: [], invites: [], kids: [], events: [],
    tasks: [], lists: [], listItems: [], meals: [], notes: [],
    fixedEntries: [], budgets: [], expenses: [], quotes: [], documents: [],
    ...extra,
  }
}

test.describe('contenido de la copia', () => {
  test('lleva las quince tablas de la familia, aunque estén vacías', () => {
    const e = construirExportacion(datos())
    expect(Object.keys(e.datos).sort()).toEqual([
      'budgets', 'children', 'documents', 'events', 'expenses', 'families',
      'family_invites', 'family_members', 'fixed_entries', 'list_items', 'lists',
      'meal_plans', 'notes', 'quotes', 'tasks',
    ])
  })

  // Lo más importante del archivo: un refresh token de Google Drive es una llave
  // permanente al disco de una persona y no baja a la carpeta de Descargas. El
  // store no los tiene, y este test es lo que impide que alguien los añada.
  test('NO lleva tokens ni suscripciones push, en ninguna parte', () => {
    const bruto = JSON.stringify(construirExportacion(datos()))
    for (const prohibido of ['storage_connections', 'access_token', 'refresh_token', 'push_subscriptions', 'p256dh']) {
      expect(bruto).not.toContain(prohibido)
    }
  })

  test('la familia va identificada y con su versión de formato', () => {
    const e = construirExportacion(datos())
    expect(e.farpi_export).toBe(VERSION_EXPORT)
    expect(e.familia).toEqual({ id: 'f1', nombre: 'García Farpón' })
    expect(e.datos.families).toEqual([FAMILIA])
  })

  // Quien abra el archivo dentro de dos años tiene que entender por qué no hay
  // ningún PDF dentro, sin tener que leer el código.
  test('avisa de que los archivos no están dentro', () => {
    expect(construirExportacion(datos()).aviso).toContain('Google Drive')
  })

  test('las filas van tal cual, con sus ids, para poder reponerlas', () => {
    const doc = {
      id: 'd1', family_id: 'f1', child_id: null, member_id: null,
      name: 'DNI', description: null, category: 'personal' as const,
      storage_path: 'id-de-drive-123', storage_provider: 'google_drive' as const,
      storage_owner: 'u1', mime_type: 'application/pdf' as const, size_bytes: 10,
      expires_on: null, created_by: 'u1',
      created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00',
    }
    const e = construirExportacion(datos({ documents: [doc] }))
    expect(e.datos.documents[0]).toEqual(doc)
    // El puntero al archivo en Drive es lo que permite volver a encajarlo.
    expect(e.datos.documents[0].storage_path).toBe('id-de-drive-123')
    expect(e.datos.documents[0].storage_owner).toBe('u1')
  })
})

test.describe('nombre del archivo', () => {
  const ahora = new Date(2026, 7, 27, 10, 0)

  test('lleva el nombre de la familia sin tildes ni espacios, y la fecha', () => {
    expect(nombreDeArchivo('García Farpón', ahora)).toBe('farpi-garcia-farpon-2026-08-27.json')
  })

  // La regla de la casa: fecha local, no `toISOString`. A las 00:30 de un martes,
  // la de UTC sería lunes y la copia parecería del día anterior.
  test('usa la fecha local y no la de UTC', () => {
    expect(nombreDeArchivo('Casa', new Date(2026, 7, 27, 0, 30))).toContain('2026-08-27')
  })

  test('una familia sin nombre no deja el archivo sin nombre', () => {
    expect(nombreDeArchivo('', ahora)).toBe('farpi-familia-2026-08-27.json')
    expect(nombreDeArchivo('¿?', ahora)).toBe('farpi-documento-2026-08-27.json')
  })
})

test.describe('resumen de lo que lleva', () => {
  test('cuenta personas, y suma miembros con hijos', () => {
    const r = resumenDeExportacion(datos({
      members: [{ id: 'm1' }, { id: 'm2' }] as never,
      kids: [{ id: 'k1' }] as never,
    }))
    expect(r).toContain('3 personas')
  })

  test('el singular no dice "1 documentos"', () => {
    expect(resumenDeExportacion(datos({ documents: [{ id: 'd1' }] as never }))).toBe('1 documento')
  })

  test('lo que está a cero no se nombra: una casa nueva no lee "0 tareas"', () => {
    expect(resumenDeExportacion(datos())).toBe('')
    expect(resumenDeExportacion(datos({ tasks: [{ id: 't1' }] as never }))).toBe('1 tarea')
  })
})
