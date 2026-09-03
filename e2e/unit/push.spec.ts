import { test, expect } from '@playwright/test'
import { clavesDePushValidas, endpointDePushValido } from '@/lib/push'

// Lo que guarda `/api/push` no es un dato: es una URL que el servidor de Farpi
// **visita**, una vez al día por suscripción, desde el cron. Así que estas reglas
// no son de forma, son de a quién se le permite llamar.

test.describe('endpointDePushValido', () => {
  test('acepta los cuatro servidores de push que existen', () => {
    for (const url of [
      'https://fcm.googleapis.com/fcm/send/dGhpcy1lcy11bi1lamVtcGxv',
      'https://fcm.googleapis.com/wp/dGhpcy1lcy11bi1lamVtcGxv',
      'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABkZXNkZQ',
      'https://web.push.apple.com/QIAAAAA-ejemplo-de-token',
      // WNS reparte por región, así que el centro de datos va delante.
      'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB-ejemplo',
      'https://wns2-by3p.notify.windows.com/w/?token=otro',
    ]) {
      expect(endpointDePushValido(url), url).toBe(true)
    }
  })

  test('rechaza cualquier otro host, que es de lo que va todo esto', () => {
    for (const url of [
      // El caso que se está cerrando: el cron llamando a donde le digan.
      'https://ejemplo-de-quien-escucha.test/recogida',
      'https://169.254.169.254/latest/meta-data/',
      'http://127.0.0.1:3000/api/salud',
      'https://localhost/algo',
    ]) {
      expect(endpointDePushValido(url), url).toBe(false)
    }
  })

  test('el sufijo de WNS lleva el punto delante, o se cuela un host parecido', () => {
    // Sin el punto, `endsWith('notify.windows.com')` daría por bueno un dominio
    // registrado a propósito para parecerlo.
    expect(endpointDePushValido('https://malonotify.windows.com/w/?token=x')).toBe(false)
    expect(endpointDePushValido('https://notify.windows.com.ataque.test/w/')).toBe(false)
  })

  test('solo https: ningún navegador emite otra cosa', () => {
    expect(endpointDePushValido('http://fcm.googleapis.com/fcm/send/x')).toBe(false)
    expect(endpointDePushValido('data:text/plain,hola')).toBe(false)
    expect(endpointDePushValido('file:///etc/passwd')).toBe(false)
  })

  test('rechaza lo que no es ni una URL', () => {
    for (const valor of ['', 'suelto', '   ', null, undefined, 42, {}, []]) {
      expect(endpointDePushValido(valor)).toBe(false)
    }
  })

  test('rechaza una URL desmesurada aunque el host valga', () => {
    const larga = `https://fcm.googleapis.com/fcm/send/${'a'.repeat(1200)}`
    expect(endpointDePushValido(larga)).toBe(false)
  })
})

test.describe('clavesDePushValidas', () => {
  // Las que escribe un navegador: la pública son 65 bytes en base64url (87
  // caracteres) y el secreto 16 (22).
  const p256dh = 'B'.repeat(87)
  const auth = 'C'.repeat(22)

  test('acepta las que escribe un navegador', () => {
    expect(clavesDePushValidas({ p256dh, auth })).toBe(true)
  })

  test('acepta el base64url con relleno y con sus dos caracteres propios', () => {
    expect(clavesDePushValidas({ p256dh: `${'-_'.repeat(43)}a`, auth: `${'Q'.repeat(21)}=` })).toBe(true)
  })

  test('rechaza que falte cualquiera de las dos', () => {
    expect(clavesDePushValidas(undefined)).toBe(false)
    expect(clavesDePushValidas({})).toBe(false)
    expect(clavesDePushValidas({ p256dh })).toBe(false)
    expect(clavesDePushValidas({ auth })).toBe(false)
  })

  test('rechaza lo que no es base64url', () => {
    // El `+` y el `/` son del base64 de toda la vida; el navegador manda base64url.
    expect(clavesDePushValidas({ p256dh: `${'B'.repeat(86)}+`, auth })).toBe(false)
    expect(clavesDePushValidas({ p256dh, auth: `${'C'.repeat(21)}/` })).toBe(false)
    expect(clavesDePushValidas({ p256dh: `${'B'.repeat(86)} `, auth })).toBe(false)
  })

  test('rechaza los tamaños que no puede tener una clave', () => {
    expect(clavesDePushValidas({ p256dh: 'corta', auth })).toBe(false)
    expect(clavesDePushValidas({ p256dh: 'B'.repeat(500), auth })).toBe(false)
    expect(clavesDePushValidas({ p256dh, auth: 'x' })).toBe(false)
    expect(clavesDePushValidas({ p256dh, auth: 'C'.repeat(200) })).toBe(false)
  })
})
