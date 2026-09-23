import { test, expect } from '@playwright/test'
import { correoDelToken, deOtroSitio, sesionDeInvitacion } from '@/lib/peticiones'

// Lo que hoy para un CSRF en Farpi es el `SameSite=Lax` de las cookies de
// Supabase, que es una defensa prestada: el día que una cookie pase a `None`,
// `/api/account/delete` queda a un `fetch` de una web ajena. Esto es lo nuestro, y
// por eso se prueba: una guarda que no se prueba es una guarda que un refactor
// desactiva sin que nadie se entere.

const MISMA_CASA = { sitio: 'same-origin', origen: 'https://www.farpi.app', host: 'www.farpi.app' }

test.describe('deOtroSitio', () => {
  test('lo de la propia app pasa', () => {
    expect(deOtroSitio({ metodo: 'POST', ...MISMA_CASA })).toBe(false)
    expect(deOtroSitio({ metodo: 'DELETE', ...MISMA_CASA })).toBe(false)
  })

  test('lo que viene de otra web y escribe, no', () => {
    for (const sitio of ['cross-site', 'same-site', 'none']) {
      expect(deOtroSitio({ metodo: 'POST', sitio, origen: 'https://otra-cosa.test', host: 'www.farpi.app' })).toBe(true)
    }
  })

  // La vuelta de Google al conectar Drive es una navegación desde otro sitio y
  // tiene que pasar. Lo que la protege es el `state` con su cookie.
  test('un GET de otro sitio pasa, que es la vuelta de Google', () => {
    expect(deOtroSitio({ metodo: 'GET', sitio: 'cross-site', origen: null, host: 'www.farpi.app' })).toBe(false)
  })

  test('sin Sec-Fetch-Site se compara el Origin con el Host', () => {
    expect(deOtroSitio({ metodo: 'POST', sitio: null, origen: 'https://www.farpi.app', host: 'www.farpi.app' })).toBe(false)
    expect(deOtroSitio({ metodo: 'POST', sitio: null, origen: 'https://otra-cosa.test', host: 'www.farpi.app' })).toBe(true)
    // Un puerto distinto es otro origen, y en local eso importa.
    expect(deOtroSitio({ metodo: 'POST', sitio: null, origen: 'http://localhost:3000', host: 'localhost:3100' })).toBe(true)
  })

  // Sin `Origin` no hay navegador, y sin navegador no hay cookie que alguien pueda
  // hacer viajar sin querer: es `curl`, y lo que le falta es la sesión, que se le
  // pide justo después.
  test('sin ninguna de las dos cabeceras se deja pasar', () => {
    expect(deOtroSitio({ metodo: 'POST', sitio: null, origen: null, host: 'www.farpi.app' })).toBe(false)
  })

  test('un Origin que no es una URL no es de ningún navegador', () => {
    expect(deOtroSitio({ metodo: 'POST', sitio: null, origen: 'null', host: 'www.farpi.app' })).toBe(true)
    expect(deOtroSitio({ metodo: 'POST', sitio: null, origen: 'lo que sea', host: 'www.farpi.app' })).toBe(true)
  })

  test('el método llega como llegue', () => {
    expect(deOtroSitio({ metodo: 'post', sitio: 'cross-site', origen: null, host: 'x' })).toBe(true)
    expect(deOtroSitio({ metodo: 'get', sitio: 'cross-site', origen: null, host: 'x' })).toBe(false)
  })
})

// Un token de mentira con la forma de uno de Supabase: la firma da igual, porque
// esto solo lee el correo para enseñarlo, y quien verifica es `setSession`.
function tokenCon(carga: object): string {
  const b64 = Buffer.from(JSON.stringify(carga)).toString('base64url')
  return `eyJhbGciOiJIUzI1NiJ9.${b64}.firma`
}

// Unos tokens en la URL los puede escribir cualquiera, y abrirlos sin más dejaba a
// quien pulsaba el enlace dentro de la cuenta de otro. Estas son las condiciones
// para siquiera ofrecer entrar: si una se afloja, vuelve el hueco.
test.describe('sesionDeInvitacion', () => {
  const token = tokenCon({ email: 'marta@example.com', sub: 'x' })
  const fragmento = `#access_token=${token}&refresh_token=r1&type=invite`

  test('un enlace de invitación con tokens se ofrece, con su correo', () => {
    expect(sesionDeInvitacion(fragmento, 'inv-1')).toEqual({
      accessToken: token, refreshToken: 'r1', correo: 'marta@example.com',
    })
  })

  test('sin invite_id no se ofrece: ningún otro flujo trae tokens en el fragmento', () => {
    expect(sesionDeInvitacion(fragmento, null)).toBeNull()
    expect(sesionDeInvitacion(fragmento, '')).toBeNull()
  })

  test('sin alguno de los dos tokens, tampoco', () => {
    expect(sesionDeInvitacion(`#access_token=${token}`, 'inv-1')).toBeNull()
    expect(sesionDeInvitacion('#refresh_token=r1', 'inv-1')).toBeNull()
    expect(sesionDeInvitacion('', 'inv-1')).toBeNull()
  })

  test('si no se sabe con qué correo se entra, no se entra', () => {
    const sinCorreo = tokenCon({ sub: 'x' })
    expect(sesionDeInvitacion(`#access_token=${sinCorreo}&refresh_token=r1`, 'inv-1')).toBeNull()
    expect(sesionDeInvitacion('#access_token=basura&refresh_token=r1', 'inv-1')).toBeNull()
  })
})

test.describe('correoDelToken', () => {
  test('lee el correo, también con acentos y en base64url', () => {
    expect(correoDelToken(tokenCon({ email: 'íñigo@example.com' }))).toBe('íñigo@example.com')
  })

  test('lo que no es un token no da correo, y no lanza', () => {
    for (const malo of ['', 'a.b', 'a.b.c', 'a.!!!.c', tokenCon({ email: '' }), tokenCon({ email: 42 })]) {
      expect(correoDelToken(malo)).toBeNull()
    }
  })
})
