import { test, expect } from '@playwright/test'
import { ERROR_GENERICO, mensajeDeError } from '@/lib/errores'

// Lo que sale por aquí es lo que lee la familia en el aviso de `SaveStatus`,
// debajo de "No se ha guardado el cambio". Antes salía el mensaje de Postgres
// tal cual, en inglés y hablando de policies y de columnas.

test.describe('lo que dice Postgres', () => {
  test('una policy de RLS se cuenta como un permiso que falta', () => {
    const dicho = mensajeDeError('new row violates row-level security policy for table "family_invites"', '42501')
    expect(dicho).toContain('No tienes permiso')
    expect(dicho).toContain('administrador')
    expect(dicho).not.toContain('row-level')
  })

  test('el código basta aunque el texto cambie de versión', () => {
    expect(mensajeDeError('something entirely new', '42501')).toContain('No tienes permiso')
    expect(mensajeDeError('otro texto raro', '23505')).toBe('Eso ya estaba guardado.')
  })

  test('la sesión caducada invita a volver a entrar', () => {
    expect(mensajeDeError('JWT expired')).toContain('sesión ha caducado')
  })

  test('la red caída se distingue de un fallo de datos', () => {
    expect(mensajeDeError('TypeError: Failed to fetch')).toContain('conexión')
  })

  test('un inglés que no reconocemos no se enseña', () => {
    expect(mensajeDeError('unexpected server response for relation tasks')).toBe(ERROR_GENERICO)
  })

  test('un mensaje vacío tampoco deja el aviso en blanco', () => {
    expect(mensajeDeError('   ')).toBe(ERROR_GENERICO)
  })
})

test.describe('lo que decimos nosotros', () => {
  test('las excepciones de las RPC pasan tal cual', () => {
    for (const nuestro of [
      'No se puede eliminar al único administrador de la familia',
      'La invitación ha caducado. Pide que te la manden otra vez.',
      'El nombre de la familia no puede estar vacío',
    ]) {
      expect(mensajeDeError(nuestro)).toBe(nuestro)
    }
  })

  test('un mensaje nuestro no arrastra el código de Postgres detrás', () => {
    const nuestro = 'No se puede eliminar al único administrador de la familia'
    expect(mensajeDeError(nuestro, 'P0001')).toBe(nuestro)
  })

  test('"Acceso denegado" se cuenta sin hablar de "el usuario"', () => {
    const dicho = mensajeDeError('Acceso denegado: el usuario no es administrador de esta familia')
    expect(dicho).toContain('No tienes permiso')
    expect(dicho).not.toContain('el usuario')
  })

  test('una guarda interna del esquema no es asunto de quien mira', () => {
    expect(mensajeDeError('list_items: list_id no pertenece a la misma family_id')).toBe(ERROR_GENERICO)
    expect(mensajeDeError('close_month_copy: el mes tiene que ser YYYY-MM, y llegó 2026-1')).toBe(ERROR_GENERICO)
  })
})
