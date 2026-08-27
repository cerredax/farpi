import { test, expect } from '@playwright/test'
import {
  caducidadDesdeExpiresIn,
  causaDeErrorGoogle,
  construirUrlConsentimiento,
  mensajeDeCausa,
  necesitaRefresco,
  SCOPE_DRIVE,
} from '@/lib/document-storage/oauth'
import { cifrar, descifrar, leerClave } from '@/lib/document-storage/crypto'
import { safeFileName } from '@/lib/text'

// Los documentos viven en el Google Drive de quien los sube, y estas son las
// piezas de ese camino que se pueden probar sin red ni secretos. Son justo las
// que fallan tarde y en producción: un token que se cree vigente cuando ya no lo
// está, una URL de consentimiento a la que le falta un parámetro, o un error de
// Google que se cuenta como "vuelve a intentarlo" cuando no tiene arreglo solo.
//
// Lo que no se puede probar aquí es el viaje real a Google: la suite corre en
// modo demo forzado y sin credenciales. Eso es QA a mano y está en
// `docs/testing-checklist.md`.

test.describe('caducidad del token de acceso', () => {
  const ahora = new Date('2026-08-27T12:00:00Z')

  test('un token con media hora por delante no se refresca', () => {
    expect(necesitaRefresco('2026-08-27T12:30:00Z', ahora)).toBe(false)
  })

  test('uno ya caducado sí', () => {
    expect(necesitaRefresco('2026-08-27T11:59:00Z', ahora)).toBe(true)
  })

  // El margen es lo que evita que un token válido al empezar la descarga caduque
  // a mitad, cuando las cabeceras de la respuesta ya han salido y no hay forma de
  // reintentar limpiamente.
  test('uno que caduca dentro de treinta segundos también, por el margen', () => {
    expect(necesitaRefresco('2026-08-27T12:00:30Z', ahora)).toBe(true)
  })

  test('justo en el borde del margen, se refresca', () => {
    expect(necesitaRefresco('2026-08-27T12:01:00Z', ahora)).toBe(true)
    expect(necesitaRefresco('2026-08-27T12:01:01Z', ahora)).toBe(false)
  })

  // Una fecha ilegible no puede dar por bueno el token: ante la duda, se pide otro.
  test('una fecha que no se entiende se trata como caducada', () => {
    expect(necesitaRefresco('vete a saber', ahora)).toBe(true)
  })

  test('la caducidad se calcula desde el expires_in de Google', () => {
    expect(caducidadDesdeExpiresIn(3600, ahora)).toBe('2026-08-27T13:00:00.000Z')
  })

  test('un expires_in ausente o absurdo cae en una hora', () => {
    expect(caducidadDesdeExpiresIn(0, ahora)).toBe('2026-08-27T13:00:00.000Z')
    expect(caducidadDesdeExpiresIn(NaN, ahora)).toBe('2026-08-27T13:00:00.000Z')
  })
})

test.describe('url de consentimiento', () => {
  const url = new URL(construirUrlConsentimiento({
    clientId: 'cliente-123',
    redirectUri: 'https://nido.example/api/documents/providers/google/callback',
    state: 'estado-aleatorio',
  }))

  // Estos dos son los que rompen el sistema en silencio: sin ellos la conexión
  // funciona una hora y luego se cae, porque Google no devuelve refresh token.
  test('pide permiso duradero', () => {
    expect(url.searchParams.get('access_type')).toBe('offline')
  })

  test('fuerza el consentimiento, para que la reconexión también traiga refresh token', () => {
    expect(url.searchParams.get('prompt')).toBe('consent')
  })

  // Cambiarlo por `drive` o `drive.readonly` mete el proyecto en la verificación
  // de Google y en la auditoría CASA. El test está para que se note al hacerlo.
  test('pide solo drive.file, que es el scope no sensible', () => {
    expect(url.searchParams.get('scope')).toBe(SCOPE_DRIVE)
    expect(SCOPE_DRIVE).toBe('https://www.googleapis.com/auth/drive.file')
  })

  test('lleva el state que sostiene la cookie', () => {
    expect(url.searchParams.get('state')).toBe('estado-aleatorio')
  })

  test('va a la pantalla de consentimiento de Google', () => {
    expect(url.origin).toBe('https://accounts.google.com')
  })
})

test.describe('traducción de los errores de Google', () => {
  test('invalid_grant es la conexión caída, no un fallo pasajero', () => {
    expect(causaDeErrorGoogle(400, '{"error":"invalid_grant"}')).toBe('conexion_revocada')
  })

  test('un 401 también', () => {
    expect(causaDeErrorGoogle(401, '')).toBe('conexion_revocada')
  })

  test('un 404 es que el archivo ya no está', () => {
    expect(causaDeErrorGoogle(404, '')).toBe('archivo_no_esta')
  })

  // Con `drive.file` el token solo ve lo que creó esta app, así que un 403 normal
  // significa "eso no es tuyo", que desde fuera se ve igual que no estar.
  test('un 403 corriente se cuenta como archivo ausente', () => {
    expect(causaDeErrorGoogle(403, '{"reason":"insufficientFilePermissions"}')).toBe('archivo_no_esta')
  })

  test('un 403 por cuota o por ritmo sí se distingue', () => {
    expect(causaDeErrorGoogle(403, '{"reason":"storageQuotaExceeded"}')).toBe('cuota')
    expect(causaDeErrorGoogle(403, '{"reason":"rateLimitExceeded"}')).toBe('cuota')
  })

  test('un 400 sin más es un archivo que no entra', () => {
    expect(causaDeErrorGoogle(400, '{"error":"invalid mime"}')).toBe('archivo_rechazado')
  })

  test('lo que no se reconoce no se inventa', () => {
    expect(causaDeErrorGoogle(500, '')).toBe('desconocido')
  })
})

test.describe('mensajes que lee la familia', () => {
  // El nombre no es adorno: "no se pudo abrir el documento" no se puede
  // resolver, y "lo subió Marta y hay que reconectar" dice a quién avisar.
  test('la conexión revocada nombra a quien tiene que arreglarlo', () => {
    const mensaje = mensajeDeCausa('conexion_revocada', 'Marta')
    expect(mensaje).toContain('Marta')
    expect(mensaje).toContain('conecte')
  })

  test('sin nombre, no se queda a medias', () => {
    expect(mensajeDeCausa('conexion_revocada', null)).toContain('quien lo subió')
  })

  // Son dos situaciones distintas: una se arregla reconectando y la otra no.
  test('el archivo borrado y la conexión caída no dicen lo mismo', () => {
    expect(mensajeDeCausa('archivo_no_esta', 'Marta')).not.toBe(mensajeDeCausa('conexion_revocada', 'Marta'))
  })
})

test.describe('cifrado de los tokens', () => {
  const clave = leerClave('a'.repeat(64))

  test('lo cifrado vuelve tal cual', () => {
    const token = '1//04abcDEF-refresh_token_de_google'
    expect(descifrar(clave, cifrar(clave, token))).toBe(token)
  })

  test('el mismo token cifrado dos veces no se parece', () => {
    // Si se parecieran, el que mirase la tabla sabría quién comparte token.
    expect(cifrar(clave, 'hola')).not.toBe(cifrar(clave, 'hola'))
  })

  test('lo guardado no contiene el token en claro', () => {
    expect(cifrar(clave, 'secreto-en-claro')).not.toContain('secreto-en-claro')
  })

  test('con otra clave no se descifra, no se descifra a medias', () => {
    const otra = leerClave('b'.repeat(64))
    expect(() => descifrar(otra, cifrar(clave, 'hola'))).toThrow()
  })

  test('un token manipulado no pasa: GCM autentica además de cifrar', () => {
    const guardado = cifrar(clave, 'hola')
    const roto = guardado.slice(0, -4) + 'AAAA'
    expect(() => descifrar(clave, roto)).toThrow()
  })

  test('la clave admite hex y base64, y rechaza cualquier otra longitud', () => {
    expect(leerClave('a'.repeat(64)).length).toBe(32)
    expect(leerClave(Buffer.alloc(32, 7).toString('base64')).length).toBe(32)
    expect(() => leerClave('')).toThrow()
    expect(() => leerClave('demasiado-corta')).toThrow()
  })
})

test.describe('nombre de archivo para servir el documento', () => {
  // Viaja en la cabecera `Content-Disposition`, que no admite acentos ni comillas.
  test('quita tildes, espacios y lo que no sea seguro', () => {
    expect(safeFileName('Cartilla vacunas Ana.pdf')).toBe('cartilla-vacunas-ana.pdf')
    expect(safeFileName('Informe "médico" 2026.pdf')).toBe('informe-medico-2026.pdf')
  })

  test('un nombre que se queda en nada tiene respaldo', () => {
    expect(safeFileName('¿¡!?')).toBe('documento')
  })
})
