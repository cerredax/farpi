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
  // C nunca entra en ninguna familia: es el "ajeno" permanente. B deja de serlo
  // en la sección 7, cuando acepta la invitación a la familia A.
  const emailC = `rls-c-${sufijo}@nido-test.invalid`
  const password = `Prueba-${randomUUID().slice(0, 10)}`

  console.log('== preparando usuarios y familias de prueba')
  const uidA = await crearUsuario(emailA, password)
  const uidB = await crearUsuario(emailB, password)
  const uidC = await crearUsuario(emailC, password)
  const tokA = await entrar(emailA, password)
  const tokB = await entrar(emailB, password)
  const tokC = await entrar(emailC, password)

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
  // Migración 015: las tareas también se asignan, así que también hay que poder
  // asignarlas mal. El trigger es el mismo patrón que el de eventos.
  comprobar('Rechaza tarea con child_id de otra familia',
    (await api('/rest/v1/tasks', { metodo: 'POST', token: tokA, datos: { family_id: famA, title: 'cross', child_id: hijoB } })).estado >= 400)
  const miembroB = (await api(`/rest/v1/family_members?family_id=eq.${famB}&select=id`, { token: tokB })).cuerpo?.[0]?.id
  comprobar('Rechaza tarea con member_id de otra familia',
    (await api('/rest/v1/tasks', { metodo: 'POST', token: tokA, datos: { family_id: famA, title: 'cross', member_id: miembroB } })).estado >= 400)

  console.log('\n== 5. RPCs de administración (regla del último admin)')
  comprobar('NO se puede eliminar al único admin',
    (await api('/rest/v1/rpc/remove_family_member', { metodo: 'POST', token: tokA, datos: { p_member_id: miembroA } })).estado >= 400)
  comprobar('NO se puede degradar al único admin',
    (await api('/rest/v1/rpc/update_family_member_role', { metodo: 'POST', token: tokA, datos: { p_member_id: miembroA, p_role: 'member' } })).estado >= 400)
  comprobar('B (ajeno) NO puede cambiar roles en la familia de A',
    (await api('/rest/v1/rpc/update_family_member_role', { metodo: 'POST', token: tokB, datos: { p_member_id: miembroA, p_role: 'member' } })).estado >= 400)
  comprobar('B (ajeno) NO puede eliminar miembros de A',
    (await api('/rest/v1/rpc/remove_family_member', { metodo: 'POST', token: tokB, datos: { p_member_id: miembroA } })).estado >= 400)

  console.log('\n== 6. update_family_member_profile')
  comprobar('A puede editar su propio perfil (nombre y color)',
    (await api('/rest/v1/rpc/update_family_member_profile', { metodo: 'POST', token: tokA, datos: { p_member_id: miembroA, p_display_name: 'Nombre Nuevo', p_color: '#EC7FA9' } })).estado < 400)
  const perfilPropio = (await api(`/rest/v1/family_members?id=eq.${miembroA}&select=color`, { token: tokA })).cuerpo
  comprobar('El color elegido queda guardado', perfilPropio?.[0]?.color === '#EC7FA9')
  comprobar('Un nombre vacío se rechaza',
    (await api('/rest/v1/rpc/update_family_member_profile', { metodo: 'POST', token: tokA, datos: { p_member_id: miembroA, p_display_name: '   ', p_color: null } })).estado >= 400)
  await api('/rest/v1/rpc/update_family_member_profile', { metodo: 'POST', token: tokB, datos: { p_member_id: miembroA, p_display_name: 'Hackeado', p_color: null } })
  const perfil = (await api(`/rest/v1/family_members?id=eq.${miembroA}&select=display_name`, { token: tokA })).cuerpo
  comprobar('B (ajeno, admin solo de SU familia) NO puede editar el perfil de A',
    perfil?.[0]?.display_name !== 'Hackeado')

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

  // Ruta con el convenio de la app: {family_id}/{document_id}/{filename},
  // dentro del bucket `documents`.
  const docId = randomUUID()
  const rutaObjeto = `${famA}/${docId}/informe.pdf`
  const enBucket = `documents/${rutaObjeto}`
  const contenido = new Blob(['%PDF-1.4 prueba de validacion'], { type: 'application/pdf' })

  const subida = await fetch(`${URL_BASE}/storage/v1/object/${enBucket}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${tokA}`, 'Content-Type': 'application/pdf' },
    body: contenido,
  })
  comprobar('A sube un documento a la carpeta de su familia', subida.ok, `estado ${subida.status}`)

  const firmar = async token => api(`/storage/v1/object/sign/${enBucket}`, {
    metodo: 'POST', token, datos: { expiresIn: 60 },
  })

  const firmaA = await firmar(tokA)
  comprobar('A obtiene una signed URL de su propio documento',
    firmaA.estado === 200 && !!firmaA.cuerpo?.signedURL, `estado ${firmaA.estado}`)

  if (firmaA.cuerpo?.signedURL) {
    const descarga = await fetch(`${URL_BASE}/storage/v1${firmaA.cuerpo.signedURL}`)
    comprobar('La signed URL de A descarga el contenido', descarga.ok, `estado ${descarga.status}`)
  }

  // El caso que de verdad importa: un usuario ajeno conoce la ruta exacta e
  // intenta llegar al archivo. Se usa C porque B ya es miembro de la familia A.
  const firmaC = await firmar(tokC)
  comprobar('Un ajeno NO puede firmar el documento de A aun conociendo la ruta',
    firmaC.estado >= 400, `estado ${firmaC.estado}`)

  const directaC = await fetch(`${URL_BASE}/storage/v1/object/${enBucket}`, {
    headers: { apikey: ANON, Authorization: `Bearer ${tokC}` },
  })
  comprobar('Un ajeno NO puede descargar el documento de A directamente',
    !directaC.ok, `estado ${directaC.status}`)

  const listadoC = await api('/storage/v1/object/list/documents', {
    metodo: 'POST', token: tokC, datos: { prefix: `${famA}/`, limit: 100 },
  })
  comprobar('Un ajeno NO ve el contenido de la carpeta de A al listar',
    Array.isArray(listadoC.cuerpo) && listadoC.cuerpo.length === 0,
    `elementos: ${Array.isArray(listadoC.cuerpo) ? listadoC.cuerpo.length : listadoC.estado}`)

  const borradoC = await fetch(`${URL_BASE}/storage/v1/object/${enBucket}`, {
    method: 'DELETE', headers: { apikey: ANON, Authorization: `Bearer ${tokC}` },
  })
  comprobar('Un ajeno NO puede borrar el documento de A', !borradoC.ok, `estado ${borradoC.status}`)

  // B sí debe poder verlo: en la sección 7 se unió a la familia A.
  const firmaMiembro = await firmar(tokB)
  comprobar('Un miembro de la familia SÍ puede firmar el documento',
    firmaMiembro.estado === 200, `estado ${firmaMiembro.estado}`)

  const borradoA = await fetch(`${URL_BASE}/storage/v1/object/${enBucket}`, {
    method: 'DELETE', headers: { apikey: ANON, Authorization: `Bearer ${tokA}` },
  })
  comprobar('A sí puede borrar su propio documento', borradoA.ok, `estado ${borradoA.status}`)

  console.log('\n== limpieza')
  for (const fam of [famA, famB]) await api(`/rest/v1/families?id=eq.${fam}`, { metodo: 'DELETE' })
  for (const uid of [uidA, uidB, uidC]) await api(`/auth/v1/admin/users/${uid}`, { metodo: 'DELETE' })
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
