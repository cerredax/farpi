import { test, expect } from '@playwright/test'
import { enviarAvisosPendientes, type RepositorioAvisos, type AvisoPendiente } from '../../src/lib/envio-avisos'

const aviso: AvisoPendiente = {
  evento: { id: 'e1', family_id: 'f1', title: 'Dentista', start_at: '2026-10-15T10:30:00Z', remind_before_minutes: 30 },
  fireAt: '2026-10-15T10:00:00.000Z',
}

function preparar() {
  const pasos: string[] = []
  const repos: RepositorioAvisos = {
    miembros: async () => { pasos.push('miembros'); return [{ user_id: 'u1', family_id: 'f1' }] },
    suscripciones: async () => { pasos.push('suscripciones'); return [{ user_id: 'u1', endpoint: 'movil', p256dh: 'clave', auth: 'auth', notify_events: true }] },
    reclamar: async () => { pasos.push('reclamar'); return [{ event_id: 'e1', fire_at: aviso.fireAt }] },
    liberar: async () => { pasos.push('liberar') },
  }
  return { pasos, repos }
}

for (const consulta of ['miembros', 'suscripciones'] as const) {
  test(`si falla la consulta de ${consulta}, no reclama ni consume el aviso y permite reintentar`, async () => {
    const { pasos, repos } = preparar()
    const originales = { ...repos }
    repos[consulta] = async () => { throw new Error('fallo de lectura') }
    await expect(enviarAvisosPendientes([aviso], repos, async () => { pasos.push('enviar'); return 'enviada' })).rejects.toThrow('fallo de lectura')
    expect(pasos).not.toContain('reclamar')
    expect(pasos).not.toContain('enviar')
    Object.assign(repos, originales)
    expect((await enviarAvisosPendientes([aviso], repos, async () => 'enviada')).sent).toBe(1)
  })
}

test('consulta los destinatarios antes de reclamar y envía solo después', async () => {
  const { pasos, repos } = preparar()
  const resultado = await enviarAvisosPendientes([aviso], repos, async () => { pasos.push('enviar'); return 'enviada' })
  expect(pasos).toEqual(['miembros', 'suscripciones', 'reclamar', 'enviar'])
  expect(resultado.sent).toBe(1)
})

test('un aviso reclamado por otra ejecución no se envía ni se libera', async () => {
  const { pasos, repos } = preparar()
  repos.reclamar = async () => []
  const resultado = await enviarAvisosPendientes([aviso], repos, async () => { pasos.push('enviar'); return 'enviada' })
  expect(resultado.sent).toBe(0)
  expect(resultado.yaAvisados).toBe(1)
  expect(pasos).not.toContain('enviar')
  expect(pasos).not.toContain('liberar')
})

test('si todos los envíos fallan libera el aviso para el siguiente intento', async () => {
  const { pasos, repos } = preparar()
  const resultado = await enviarAvisosPendientes([aviso], repos, async () => 'fallida')
  expect(resultado.fallidos).toBe(1)
  expect(pasos).toContain('liberar')
})

test('una preferencia desactivada impide el envío y no provoca reintentos', async () => {
  const { pasos, repos } = preparar()
  repos.suscripciones = async () => [{ user_id: 'u1', endpoint: 'movil', p256dh: 'clave', auth: 'auth', notify_events: false }]
  expect((await enviarAvisosPendientes([aviso], repos, async () => { pasos.push('enviar'); return 'enviada' })).sent).toBe(0)
  expect(pasos).not.toContain('enviar')
  expect(pasos).not.toContain('liberar')
})

test('no manda a otra familia y conserva un envío parcial sin duplicarlo', async () => {
  const { pasos, repos } = preparar()
  repos.suscripciones = async () => ['u1', 'u1', 'otra'].map((user_id, i) => ({ user_id, endpoint: String(i), p256dh: 'clave', auth: 'auth', notify_events: true }))
  const enviados: string[] = []
  const resultado = await enviarAvisosPendientes([aviso], repos, async sub => { enviados.push(sub.endpoint); return sub.endpoint === '0' ? 'enviada' : 'fallida' })
  expect(enviados).toEqual(['0', '1'])
  expect(resultado).toMatchObject({ sent: 1, fallidos: 1 })
  expect(pasos).not.toContain('liberar')
})
