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
// El 27-08-2026 se fue la sección de Storage (§8, diez comprobaciones): el bucket
// `documents` se borró al pasar los archivos al Google Drive de quien los sube.
// Lo que las sustituye son las §11 y §12, que cubren el camino nuevo.
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
  const emailA = `rls-a-${sufijo}@farpi-test.invalid`
  const emailB = `rls-b-${sufijo}@farpi-test.invalid`
  // C nunca entra en ninguna familia: es el "ajeno" permanente. B deja de serlo
  // en la sección 7, cuando acepta la invitación a la familia A.
  const emailC = `rls-c-${sufijo}@farpi-test.invalid`
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
  await sembrar('notes', { family_id: famA, title: 'Nota A', body: 'Clave del wifi de A' })

  for (const tabla of ['children', 'events', 'tasks', 'lists', 'list_items', 'meal_plans', 'notes']) {
    comprobar(`B NO ve ${tabla} de la familia de A`,
      filas(await api(`/rest/v1/${tabla}?family_id=eq.${famA}&select=id`, { token: tokB })) === 0)
  }

  console.log('\n== 3. B intenta escribir en la familia de A')
  comprobar('B NO puede crear tareas en la familia de A',
    (await api('/rest/v1/tasks', { metodo: 'POST', token: tokB, datos: { family_id: famA, title: 'Intrusa', priority: 'high' } })).estado >= 400)
  comprobar('B NO puede crear notas en la familia de A',
    (await api('/rest/v1/notes', { metodo: 'POST', token: tokB, datos: { family_id: famA, title: 'Intrusa' } })).estado >= 400)
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

  // La 019 guarda en `families` qué franjas de comida ve la casa. No trae policy
  // nueva —usa la de update de la 002— así que lo que hay que comprobar es que esa
  // policy sigue diciendo "solo admin" con una columna más, y que el `check`
  // aguanta los dos casos que romperían la pantalla: una franja inventada y
  // quedarse sin ninguna. B, a estas alturas, ya es miembro NO admin de la familia
  // de A (aceptó la invitación en la sección 7), que es justo el caso interesante.
  console.log('\n== 8. Franjas de comida (019)')
  comprobar('Una familia nueva nace con las cuatro franjas',
    JSON.stringify((await api(`/rest/v1/families?id=eq.${famB}&select=meal_slots`, { token: tokB })).cuerpo?.[0]?.meal_slots)
      === JSON.stringify(['breakfast', 'lunch', 'snack', 'dinner']))
  comprobar('A (admin) puede cambiar las franjas de su familia',
    filas(await api(`/rest/v1/families?id=eq.${famA}`, {
      metodo: 'PATCH', token: tokA, datos: { meal_slots: ['breakfast', 'lunch'] }, cabeceras: REPRESENTACION,
    })) === 1)
  comprobar('Las franjas quedan guardadas',
    JSON.stringify((await api(`/rest/v1/families?id=eq.${famA}&select=meal_slots`, { token: tokA })).cuerpo?.[0]?.meal_slots)
      === JSON.stringify(['breakfast', 'lunch']))
  comprobar('El check rechaza una franja que no existe',
    (await api(`/rest/v1/families?id=eq.${famA}`, {
      metodo: 'PATCH', token: tokA, datos: { meal_slots: ['brunch'] },
    })).estado >= 400)
  comprobar('El check rechaza quedarse sin ninguna franja',
    (await api(`/rest/v1/families?id=eq.${famA}`, {
      metodo: 'PATCH', token: tokA, datos: { meal_slots: [] },
    })).estado >= 400)
  comprobar('Un miembro NO admin no puede cambiar las franjas',
    filas(await api(`/rest/v1/families?id=eq.${famA}`, {
      metodo: 'PATCH', token: tokB, datos: { meal_slots: ['dinner'] }, cabeceras: REPRESENTACION,
    })) === 0)
  comprobar('Tras los rechazos, las franjas siguen siendo las de A',
    JSON.stringify((await api(`/rest/v1/families?id=eq.${famA}&select=meal_slots`, { token: tokA })).cuerpo?.[0]?.meal_slots)
      === JSON.stringify(['breakfast', 'lunch']))
  // ── 9. Festivos (020) ──────────────────────────────────────────────
  // La 020 añade el cuarto valor de `kind` y su restricción de rango. Se comprueban
  // las dos cosas: que el valor nuevo entra, que uno inventado no, y que un festivo
  // sin día final o que no sea de día completo se rechaza —que es lo que la app ya
  // exige en `validateEventDraft`, y aquí lo sostiene la base—.
  console.log('\n== 9. Festivos (020)')
  comprobar('Un festivo con rango se guarda',
    filas(await api('/rest/v1/events', {
      metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
      datos: { family_id: famA, title: 'Hispanidad', kind: 'festivo', all_day: true,
               start_at: '2026-10-12T00:00:00Z', end_at: '2026-10-12T23:59:00Z' },
    })) === 1)
  comprobar('El check rechaza un kind que no existe',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'raro', kind: 'puente', all_day: true,
               start_at: '2026-10-12T00:00:00Z', end_at: '2026-10-12T23:59:00Z' },
    })).estado >= 400)
  comprobar('El check rechaza un festivo sin día final',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'sin fin', kind: 'festivo', all_day: true,
               start_at: '2026-10-12T00:00:00Z' },
    })).estado >= 400)
  comprobar('El check rechaza un festivo que no sea de día completo',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'con hora', kind: 'festivo', all_day: false,
               start_at: '2026-10-12T09:00:00Z', end_at: '2026-10-12T10:00:00Z' },
    })).estado >= 400)
  comprobar('Un ajeno no ve el festivo de la familia A',
    filas(await api(`/rest/v1/events?family_id=eq.${famA}&kind=eq.festivo`, { token: tokC })) === 0)

  // ── 9 bis. Cumpleaños de fuera de casa (27-08-2026) ─────────────────
  // El quinto valor de `kind` y la columna `birth_year`. Un cumpleaños es al revés
  // que un festivo: día completo pero de un solo día, así que `end_at` tiene que ir
  // vacío. Y el año solo puede existir en un cumpleaños, para que no aparezca una
  // edad colgada de un plan cualquiera.
  console.log('\n== 9 bis. Cumpleaños (27-08-2026)')
  comprobar('Un cumpleaños de un día con año de nacimiento se guarda',
    filas(await api('/rest/v1/events', {
      metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
      datos: { family_id: famA, title: 'Abuela Carmen', kind: 'cumple', all_day: true,
               start_at: '2026-09-14T00:00:00Z', birth_year: 1949 },
    })) === 1)
  comprobar('Un cumpleaños sin año de nacimiento también',
    filas(await api('/rest/v1/events', {
      metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
      datos: { family_id: famA, title: 'Nico del cole', kind: 'cumple', all_day: true,
               start_at: '2026-09-20T00:00:00Z' },
    })) === 1)
  comprobar('El check rechaza un cumpleaños con día final',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'largo', kind: 'cumple', all_day: true,
               start_at: '2026-09-14T00:00:00Z', end_at: '2026-09-15T23:59:00Z' },
    })).estado >= 400)
  comprobar('El check rechaza un cumpleaños con hora',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'con hora', kind: 'cumple', all_day: false,
               start_at: '2026-09-14T18:00:00Z' },
    })).estado >= 400)
  comprobar('El check rechaza un año de nacimiento en algo que no es un cumpleaños',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'un plan', kind: 'evento', all_day: false,
               start_at: '2026-09-14T18:00:00Z', birth_year: 1949 },
    })).estado >= 400)
  comprobar('El check rechaza un año imposible',
    (await api('/rest/v1/events', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, title: 'imposible', kind: 'cumple', all_day: true,
               start_at: '2026-09-14T00:00:00Z', birth_year: 1500 },
    })).estado >= 400)
  comprobar('Un ajeno no ve los cumpleaños de la familia A',
    filas(await api(`/rest/v1/events?family_id=eq.${famA}&kind=eq.cumple`, { token: tokC })) === 0)

  // ── 10. Unidades de la lista (021) ──────────────────────────────────
  // La 021 no trae policy propia —una unidad es una columna más de `list_items`—,
  // así que lo que hay que comprobar es el `default` y el `check`: que lo que ya
  // existía nació en 1 sin cambiar de significado, y que ni el cero ni un número
  // absurdo entran. El tope también lo acotan los dos repositorios, pero la base es
  // la que lo sostiene.
  console.log('\n== 10. Unidades de la lista (021)')
  comprobar('Un ítem nace con una unidad',
    (await api(`/rest/v1/list_items?list_id=eq.${listaA}&select=quantity`, { token: tokA })).cuerpo?.[0]?.quantity === 1)
  comprobar('A puede cambiar las unidades de su ítem',
    filas(await api(`/rest/v1/list_items?list_id=eq.${listaA}`, {
      metodo: 'PATCH', token: tokA, datos: { quantity: 6 }, cabeceras: REPRESENTACION,
    })) === 1)
  comprobar('Las unidades quedan guardadas',
    (await api(`/rest/v1/list_items?list_id=eq.${listaA}&select=quantity`, { token: tokA })).cuerpo?.[0]?.quantity === 6)
  comprobar('El check rechaza cero unidades',
    (await api(`/rest/v1/list_items?list_id=eq.${listaA}`, {
      metodo: 'PATCH', token: tokA, datos: { quantity: 0 },
    })).estado >= 400)
  comprobar('El check rechaza pasarse del tope',
    (await api(`/rest/v1/list_items?list_id=eq.${listaA}`, {
      metodo: 'PATCH', token: tokA, datos: { quantity: 100 },
    })).estado >= 400)
  comprobar('Tras los rechazos, las unidades siguen siendo las de A',
    (await api(`/rest/v1/list_items?list_id=eq.${listaA}&select=quantity`, { token: tokA })).cuerpo?.[0]?.quantity === 6)


  // ── 11. Conexiones de almacenamiento ────────────────────────────────
  // La tabla que guarda los tokens de Google Drive tiene RLS activada y **ninguna
  // policy**, a propósito: solo entra el service role desde una ruta API. Esto es
  // lo que hay que comprobar de verdad, porque el fallo sería silencioso — si
  // alguien le añadiera un `select` "para que la interfaz sepa si está conectada",
  // un XSS en línea (que la CSP no para) se llevaría un refresh token, y con él
  // acceso permanente al Drive de una persona.
  //
  // Se prueba con A sobre **su propia fila**, que es el caso que parece inofensivo
  // y no lo es. La fila se siembra con el service role, porque por el otro camino
  // no hay forma de meterla.
  console.log('\n== 11. Conexiones de almacenamiento (storage_connections)')
  const sembradaConexion = await api('/rest/v1/storage_connections', {
    metodo: 'POST',
    datos: {
      user_id: uidA,
      provider: 'google_drive',
      access_token: 'v1.cifrado-de-prueba',
      refresh_token: 'v1.cifrado-de-prueba',
      expires_at: '2030-01-01T00:00:00Z',
      account_email: 'prueba@farpi-test.invalid',
    },
    cabeceras: REPRESENTACION,
  })
  comprobar('El service role puede sembrar una conexión', sembradaConexion.estado < 400, `estado ${sembradaConexion.estado}`)

  comprobar('A NO puede leer su propia conexión (ni la suya)',
    filas(await api(`/rest/v1/storage_connections?user_id=eq.${uidA}&select=user_id`, { token: tokA })) === 0)
  comprobar('B NO puede leer la conexión de A',
    filas(await api(`/rest/v1/storage_connections?user_id=eq.${uidA}&select=user_id`, { token: tokB })) === 0)
  comprobar('Un ajeno NO puede listar conexiones',
    filas(await api('/rest/v1/storage_connections?select=user_id', { token: tokC })) === 0)
  comprobar('A NO puede insertarse una conexión a mano',
    (await api('/rest/v1/storage_connections', {
      metodo: 'POST', token: tokA,
      datos: { user_id: uidA, provider: 'google_drive', access_token: 'x', refresh_token: 'x', expires_at: '2030-01-01T00:00:00Z' },
    })).estado >= 400)
  comprobar('A NO puede borrar su conexión por PostgREST (se hace por la ruta API)',
    filas(await api(`/rest/v1/storage_connections?user_id=eq.${uidA}`, { metodo: 'DELETE', token: tokA, cabeceras: REPRESENTACION })) === 0)
  comprobar('El check de provider rechaza un proveedor que no existe',
    (await api('/rest/v1/storage_connections', {
      metodo: 'POST',
      datos: { user_id: uidB, provider: 'dropbox', access_token: 'x', refresh_token: 'x', expires_at: '2030-01-01T00:00:00Z' },
    })).estado >= 400)

  // La columna que dice en el disco de quién está el archivo. Sin ella, el proxy
  // de lectura no sabría a quién pedirle el token prestado.
  console.log('\n== 12. Documentos con proveedor y dueño')
  const docConDueno = await api('/rest/v1/documents', {
    metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
    datos: { family_id: famA, name: 'doc drive', storage_path: 'id-de-drive-123', storage_owner: uidA, mime_type: 'application/pdf', size_bytes: 100 },
  })
  comprobar('A crea un documento con dueño de almacenamiento', docConDueno.estado < 400, `estado ${docConDueno.estado}`)
  comprobar('El proveedor por defecto es google_drive',
    docConDueno.cuerpo?.[0]?.storage_provider === 'google_drive')
  comprobar('El check rechaza un proveedor que no existe',
    (await api('/rest/v1/documents', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, name: 'doc raro', storage_path: 'x', storage_provider: 'disquete', mime_type: 'application/pdf', size_bytes: 10 },
    })).estado >= 400)
  comprobar('Un ajeno NO ve el documento de A aunque conozca su id de Drive',
    filas(await api('/rest/v1/documents?storage_path=eq.id-de-drive-123&select=id', { token: tokC })) === 0)

  // ── 13. Cerrar una familia (delete_family) ──────────────────────────
  // `families` no tiene policy de `delete`, así que cerrar una casa va por RPC.
  // Lo que hay que comprobar es lo que la RPC añade y una policy no sabría: que
  // solo la cierra un admin **de esa familia**, y que nadie se queda sin ninguna
  // —la app siempre trabaja dentro de una, y sin familia activa no hay pantalla—.
  // B es, a estas alturas, miembro NO admin de la familia de A (sección 7), que es
  // justo el caso que parece inofensivo: está dentro, pero no manda.
  console.log('\n== 13. Cerrar una familia (delete_family)')
  comprobar('B, miembro no admin, NO puede cerrar la familia de A',
    (await api('/rest/v1/rpc/delete_family', { metodo: 'POST', token: tokB, datos: { p_family_id: famA } })).estado >= 400)
  comprobar('Un ajeno NO puede cerrar la familia de A',
    (await api('/rest/v1/rpc/delete_family', { metodo: 'POST', token: tokC, datos: { p_family_id: famA } })).estado >= 400)
  comprobar('A NO puede cerrar la única familia que tiene',
    (await api('/rest/v1/rpc/delete_family', { metodo: 'POST', token: tokA, datos: { p_family_id: famA } })).estado >= 400)
  comprobar('A NO puede saltarse la RPC con un delete por PostgREST',
    filas(await api(`/rest/v1/families?id=eq.${famA}`, { metodo: 'DELETE', token: tokA, cabeceras: REPRESENTACION })) === 0)
  comprobar('Tras los rechazos, la familia de A sigue en pie',
    filas(await api(`/rest/v1/families?id=eq.${famA}&select=id`, { token: tokA })) === 1)

  // Y el camino bueno: A crea una segunda familia y cierra esa. Se le cuelga una
  // tarea antes para ver la cascada, que es lo que de verdad se lleva el borrado.
  const famA2 = (await api('/rest/v1/rpc/create_family_with_admin', {
    metodo: 'POST', token: tokA, datos: { family_name: 'Familia Test A2' },
  })).cuerpo
  await api('/rest/v1/tasks', {
    metodo: 'POST', token: tokA, datos: { family_id: famA2, title: 'tarea que se va con la familia' },
  })
  comprobar('A cierra la familia que le sobra',
    (await api('/rest/v1/rpc/delete_family', { metodo: 'POST', token: tokA, datos: { p_family_id: famA2 } })).estado < 400)
  comprobar('La familia cerrada ya no existe',
    filas(await api(`/rest/v1/families?id=eq.${famA2}&select=id`)) === 0)
  comprobar('Lo que colgaba de ella se fue en cascada',
    filas(await api(`/rest/v1/tasks?family_id=eq.${famA2}&select=id`)) === 0)
  comprobar('La familia de A sigue intacta',
    filas(await api(`/rest/v1/families?id=eq.${famA}&select=id`, { token: tokA })) === 1)

  console.log('\n== limpieza')
  for (const fam of [famA, famB, famA2]) await api(`/rest/v1/families?id=eq.${fam}`, { metodo: 'DELETE' })
  // `storage_connections` cuelga del usuario y no de la familia, así que se iría
  // con el borrado del usuario (on delete cascade). Se borra igual por si el
  // script se corta antes de llegar ahí.
  for (const uid of [uidA, uidB, uidC]) await api(`/rest/v1/storage_connections?user_id=eq.${uid}`, { metodo: 'DELETE' })
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
