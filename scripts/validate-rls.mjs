// Validación manual de RLS, RPCs, integridad y Storage contra el Supabase real.
//
// Uso:  node scripts/validate-rls.mjs
//
// Cuándo: después de tocar una migración, una policy o una RPC. NO es un test
// de CI — necesita la service role key y escribe en el proyecto real.
//
// Qué hace: crea dos usuarios y dos familias de prueba, comprueba el
// aislamiento con SESIONES DE USUARIO REALES (JWT contra PostgREST, el mismo
// camino que recorre la app) y borra todo lo que ha creado al terminar. Los
// datos reales de la familia no se tocan.
//
// Lee las credenciales de .env.local. Resultados esperados en
// docs/supabase-validation.md.
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function cargarEnv() {
  const env = {}
  const texto = readFileSync(resolve(RAIZ, '.env.local'), 'utf8')
  for (const linea of texto.split('\n')) {
    const limpia = linea.trim()
    if (!limpia || limpia.startsWith('#') || !limpia.includes('=')) continue
    const i = limpia.indexOf('=')
    env[limpia.slice(0, i).trim()] = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const env = cargarEnv()
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE || !ANON || !SVC) {
  console.error('Faltan credenciales en .env.local (URL, anon key y service role).')
  process.exit(1)
}

const resultados = []

async function api(ruta, { metodo = 'GET', token, datos, cabeceras } = {}) {
  const res = await fetch(URL_BASE + ruta, {
    method: metodo,
    headers: {
      apikey: token ? ANON : SVC,
      Authorization: `Bearer ${token ?? SVC}`,
      'Content-Type': 'application/json',
      ...cabeceras,
    },
    body: datos === undefined ? undefined : JSON.stringify(datos),
  })
  const texto = await res.text()
  let cuerpo = null
  try { cuerpo = texto ? JSON.parse(texto) : null } catch { cuerpo = texto }
  return { estado: res.status, cuerpo }
}

function comprobar(nombre, ok, detalle = '') {
  resultados.push({ nombre, ok })
  console.log(`  ${ok ? '[OK]  ' : '[FALLA]'} ${nombre}${detalle ? `  -> ${detalle}` : ''}`)
}

const filas = r => (Array.isArray(r.cuerpo) ? r.cuerpo.length : -1)

async function crearUsuario(email, password) {
  const r = await api('/auth/v1/admin/users', {
    metodo: 'POST',
    datos: { email, password, email_confirm: true },
  })
  if (r.estado >= 400) throw new Error(`No se pudo crear ${email}: ${JSON.stringify(r.cuerpo)}`)
  return r.cuerpo.id
}

async function entrar(email, password) {
  const r = await api('/auth/v1/token?grant_type=password', { metodo: 'POST', datos: { email, password } })
  if (r.estado >= 400) throw new Error(`No se pudo autenticar ${email}`)
  return r.cuerpo.access_token
}

const REPRESENTACION = { Prefer: 'return=representation' }

async function main() {
  const sufijo = randomUUID().slice(0, 8)
  const emailA = `rls-a-${sufijo}@nido-test.invalid`
  const emailB = `rls-b-${sufijo}@nido-test.invalid`
  const password = `Prueba-${randomUUID().slice(0, 10)}`

  console.log('== preparando usuarios y familias de prueba')
  const uidA = await crearUsuario(emailA, password)
  const uidB = await crearUsuario(emailB, password)
  const tokA = await entrar(emailA, password)
  const tokB = await entrar(emailB, password)

  const famA = (await api('/rest/v1/rpc/create_family_with_admin', {
    metodo: 'POST', token: tokA, datos: { family_name: 'Familia Test A' },
  })).cuerpo
  const famB = (await api('/rest/v1/rpc/create_family_with_admin', {
    metodo: 'POST', token: tokB, datos: { family_name: 'Familia Test B' },
  })).cuerpo
  comprobar('create_family_with_admin crea ambas familias', typeof famA === 'string' && typeof famB === 'string')

  const miembrosA = (await api(`/rest/v1/family_members?family_id=eq.${famA}&select=id,role`, { token: tokA })).cuerpo
  const miembroA = miembrosA?.[0]?.id
  comprobar('El creador queda como admin de su familia', miembrosA?.[0]?.role === 'admin')

  console.log('\n== 1. Aislamiento entre familias')
  comprobar('A ve su propia familia',
    filas(await api(`/rest/v1/families?id=eq.${famA}&select=id`, { token: tokA })) === 1)
  comprobar('B NO ve la familia de A',
    filas(await api(`/rest/v1/families?id=eq.${famA}&select=id`, { token: tokB })) === 0)
  comprobar('B NO puede renombrar la familia de A',
    filas(await api(`/rest/v1/families?id=eq.${famA}`, {
      metodo: 'PATCH', token: tokB, datos: { name: 'Secuestrada' }, cabeceras: REPRESENTACION,
    })) === 0)

  console.log('\n== 2. RLS de las tablas de contenido')
  const sembrar = async (tabla, datos) => {
    const r = await api(`/rest/v1/${tabla}`, { metodo: 'POST', token: tokA, datos, cabeceras: REPRESENTACION })
    comprobar(`A crea ${tabla} en su familia`, r.estado < 400, `estado ${r.estado}`)
    return r.cuerpo?.[0]?.id
  }
  const hijoA = await sembrar('children', { family_id: famA, name: 'Hija Test', color: '#8BA888' })
  await sembrar('events', { family_id: famA, title: 'Evento A', start_at: '2026-08-10T10:00:00Z', all_day: false })
  const tareaA = await sembrar('tasks', { family_id: famA, title: 'Tarea A', priority: 'medium' })
  const listaA = await sembrar('lists', { family_id: famA, name: 'Lista A' })
  await sembrar('list_items', { family_id: famA, list_id: listaA, text: 'Item A', sort_order: 0 })
  await sembrar('meal_plans', { family_id: famA, date: '2026-08-10', slot: 'lunch', name: 'Comida A' })

  for (const tabla of ['children', 'events', 'tasks', 'lists', 'list_items', 'meal_plans']) {
    comprobar(`B NO ve ${tabla} de la familia de A`,
      filas(await api(`/rest/v1/${tabla}?family_id=eq.${famA}&select=id`, { token: tokB })) === 0)
  }

  console.log('\n== 3. B intenta escribir en la familia de A')
  comprobar('B NO puede crear tareas en la familia de A',
    (await api('/rest/v1/tasks', { metodo: 'POST', token: tokB, datos: { family_id: famA, title: 'Intrusa', priority: 'high' } })).estado >= 400)
  comprobar('B NO puede auto-añadirse como miembro de A',
    (await api('/rest/v1/family_members', { metodo: 'POST', token: tokB, datos: { family_id: famA, user_id: uidB, display_name: 'Intruso', role: 'admin' } })).estado >= 400)
  comprobar('B NO puede borrar tareas de A',
    filas(await api(`/rest/v1/tasks?id=eq.${tareaA}`, { metodo: 'DELETE', token: tokB, cabeceras: REPRESENTACION })) === 0)

  console.log('\n== 4. Triggers de integridad cross-family')
  const hijoB = (await api('/rest/v1/children', {
    metodo: 'POST', token: tokB, datos: { family_id: famB, name: 'Hijo B', color: '#7EB8D4' }, cabeceras: REPRESENTACION,
  })).cuerpo?.[0]?.id
  const listaB = (await api('/rest/v1/lists', {
    metodo: 'POST', token: tokB, datos: { family_id: famB, name: 'Lista B' }, cabeceras: REPRESENTACION,
  })).cuerpo?.[0]?.id
  comprobar('Rechaza evento con child_id de otra familia',
    (await api('/rest/v1/events', { metodo: 'POST', token: tokA, datos: { family_id: famA, title: 'cross', start_at: '2026-08-11T10:00:00Z', all_day: false, child_id: hijoB } })).estado >= 400)
  comprobar('Rechaza documento con child_id de otra familia',
    (await api('/rest/v1/documents', { metodo: 'POST', token: tokA, datos: { family_id: famA, name: 'doc', storage_path: `${famA}/x/y.pdf`, mime_type: 'application/pdf', size_bytes: 10, child_id: hijoB } })).estado >= 400)
  comprobar('Rechaza item con list_id de otra familia',
    (await api('/rest/v1/list_items', { metodo: 'POST', token: tokA, datos: { family_id: famA, list_id: listaB, text: 'cross', sort_order: 9 } })).estado >= 400)

  console.log('\n== 5. RPCs de administración (regla del último admin)')
  comprobar('NO se puede eliminar al único admin',
    (await api('/rest/v1/rpc/remove_family_member', { metodo: 'POST', token: tokA, datos: { p_member_id: miembroA } })).estado >= 400)
  comprobar('NO se puede degradar al único admin',
    (await api('/rest/v1/rpc/update_family_member_role', { metodo: 'POST', token: tokA, datos: { p_member_id: miembroA, p_role: 'member' } })).estado >= 400)
  comprobar('B (ajeno) NO puede cambiar roles en la familia de A',
    (await api('/rest/v1/rpc/update_family_member_role', { metodo: 'POST', token: tokB, datos: { p_member_id: miembroA, p_role: 'member' } })).estado >= 400)
  comprobar('B (ajeno) NO puede eliminar miembros de A',
    (await api('/rest/v1/rpc/remove_family_member', { metodo: 'POST', token: tokB, datos: { p_member_id: miembroA } })).estado >= 400)

  console.log('\n== 6. update_my_family_profile')
  comprobar('A puede editar su propio perfil',
    (await api('/rest/v1/rpc/update_my_family_profile', { metodo: 'POST', token: tokA, datos: { member_id: miembroA, display_name: 'Nombre Nuevo', avatar_url: null } })).estado < 400)
  await api('/rest/v1/rpc/update_my_family_profile', { metodo: 'POST', token: tokB, datos: { member_id: miembroA, display_name: 'Hackeado', avatar_url: null } })
  const perfil = (await api(`/rest/v1/family_members?id=eq.${miembroA}&select=display_name`, { token: tokA })).cuerpo
  comprobar('B NO puede editar el perfil de A', perfil?.[0]?.display_name !== 'Hackeado')

  console.log('\n== 7. Invitaciones')
  const invitacion = (await api('/rest/v1/family_invites', {
    metodo: 'POST', token: tokA, datos: { family_id: famA, email: emailB, invited_by: uidA }, cabeceras: REPRESENTACION,
  })).cuerpo?.[0]?.id
  comprobar('A (admin) puede crear invitación en su familia', !!invitacion)
  comprobar('B NO puede crear invitaciones en la familia de A',
    (await api('/rest/v1/family_invites', { metodo: 'POST', token: tokB, datos: { family_id: famA, email: 'otro@test.invalid', invited_by: uidB } })).estado >= 400)

  const aceptada = await api('/rest/v1/rpc/accept_family_invite', { metodo: 'POST', token: tokB, datos: { p_invite_id: invitacion } })
  comprobar('B acepta la invitación dirigida a su email', aceptada.estado === 200, `estado ${aceptada.estado}`)

  const miembrosTrasAceptar = (await api(`/rest/v1/family_members?family_id=eq.${famA}&select=user_id`, { token: tokA })).cuerpo
  comprobar('Aceptar la invitación crea el family_member',
    Array.isArray(miembrosTrasAceptar) && miembrosTrasAceptar.some(m => m.user_id === uidB))
  const estadoInvitacion = (await api(`/rest/v1/family_invites?id=eq.${invitacion}&select=status`, { token: tokA })).cuerpo
  comprobar('La invitación queda marcada como accepted', estadoInvitacion?.[0]?.status === 'accepted')
  comprobar('Ya dentro, B SÍ ve los datos de la familia A',
    filas(await api(`/rest/v1/children?family_id=eq.${famA}&select=id`, { token: tokB })) >= 1)
  comprobar('Miembro NO admin no puede eliminar miembros',
    (await api('/rest/v1/rpc/remove_family_member', { metodo: 'POST', token: tokB, datos: { p_member_id: miembroA } })).estado >= 400)
  comprobar('Miembro NO admin no puede invitar',
    (await api('/rest/v1/family_invites', { metodo: 'POST', token: tokB, datos: { family_id: famA, email: 'otro2@test.invalid', invited_by: uidB } })).estado >= 400)

  console.log('\n== 8. Storage privado')
  const bucket = (await api('/storage/v1/bucket/documents')).cuerpo
  comprobar('El bucket documents existe y es privado', bucket?.public === false)
  // Nota: la prueba de fuga con signed URL sigue siendo manual (ver guía).

  console.log('\n== limpieza')
  for (const fam of [famA, famB]) await api(`/rest/v1/families?id=eq.${fam}`, { metodo: 'DELETE' })
  for (const uid of [uidA, uidB]) await api(`/auth/v1/admin/users/${uid}`, { metodo: 'DELETE' })
  const familias = (await api('/rest/v1/families?select=name')).cuerpo
  console.log('   familias que quedan:', Array.isArray(familias) ? familias.map(f => f.name) : familias)

  const fallos = resultados.filter(r => !r.ok)
  console.log(`\n===== ${resultados.length - fallos.length}/${resultados.length} comprobaciones OK`)
  if (fallos.length) {
    for (const f of fallos) console.log('   FALLA:', f.nombre)
    process.exit(1)
  }
  // Evita que el hijo sin usar dispare un aviso del linter en revisiones futuras.
  void hijoA
}

main().catch(err => { console.error(err); process.exit(1) })
