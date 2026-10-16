import type { EventoConAviso } from './reminders'

export interface AvisoPendiente {
  evento: EventoConAviso & { family_id: string }
  fireAt: string
}

interface Suscripcion {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  notify_events: boolean
}

export interface RepositorioAvisos {
  miembros: (familias: string[]) => Promise<{ user_id: string; family_id: string }[]>
  suscripciones: (usuarios: string[]) => Promise<Suscripcion[]>
  reclamar: (avisos: AvisoPendiente[]) => Promise<{ event_id: string; fire_at: string }[]>
  liberar: (aviso: AvisoPendiente) => Promise<void>
}

/** Consulta antes de reclamar: un fallo de lectura deja todos los avisos reintentables. */
export async function enviarAvisosPendientes(
  pendientes: AvisoPendiente[],
  repos: RepositorioAvisos,
  enviar: (sub: Suscripcion, evento: AvisoPendiente['evento']) => Promise<'enviada' | 'caducada' | 'fallida'>,
) {
  const miembros = await repos.miembros([...new Set(pendientes.map(p => p.evento.family_id))])
  const usuarios = [...new Set(miembros.map(m => m.user_id))]
  const suscripciones = usuarios.length ? await repos.suscripciones(usuarios) : []
  const reclamados = await repos.reclamar(pendientes)
  const clave = (id: string, fecha: string) => `${id}|${new Date(fecha).toISOString()}`
  const mios = new Set(reclamados.map(r => clave(r.event_id, r.fire_at)))
  const porMandar = pendientes.filter(p => mios.has(clave(p.evento.id, p.fireAt)))
  let sent = 0
  let fallidos = 0
  let caducadas = 0

  for (const aviso of porMandar) {
    const usuariosDeCasa = new Set(miembros.filter(m => m.family_id === aviso.evento.family_id).map(m => m.user_id))
    let enviadas = 0
    let fallidas = 0
    for (const sub of suscripciones.filter(s => usuariosDeCasa.has(s.user_id) && s.notify_events)) {
      const resultado = await enviar(sub, aviso.evento)
      if (resultado === 'enviada') enviadas++
      else if (resultado === 'caducada') caducadas++
      else fallidas++
    }
    sent += enviadas
    fallidos += fallidas
    // Si llegó a alguien, reintentar toda la casa duplicaría su aviso. Sin
    // destinatarios tampoco hay nada que reintentar; se conserva la reclamación.
    if (enviadas === 0 && fallidas > 0) await repos.liberar(aviso)
  }
  return { sent, fallidos, caducadas, avisos: porMandar.length, yaAvisados: pendientes.length - porMandar.length }
}
