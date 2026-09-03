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
  await sembrar('fixed_entries', { family_id: famA, kind: 'ingreso', name: 'Nómina A', amount_cents: 165000 })
  const presuA = await sembrar('budgets', { family_id: famA, name: 'Compra A', monthly_limit_cents: 30000 })
  await sembrar('expenses', { family_id: famA, budget_id: presuA, amount_cents: 1250, date: '2026-08-10' })
  await sembrar('quotes', { family_id: famA, title: 'Caldera A', provider: 'Clima A', amount_cents: 120000 })

  for (const tabla of ['children', 'events', 'tasks', 'lists', 'list_items', 'meal_plans', 'notes', 'fixed_entries', 'budgets', 'expenses', 'quotes']) {
    comprobar(`B NO ve ${tabla} de la familia de A`,
      filas(await api(`/rest/v1/${tabla}?family_id=eq.${famA}&select=id`, { token: tokB })) === 0)
  }

  console.log('\n== 3. B intenta escribir en la familia de A')
  comprobar('B NO puede crear tareas en la familia de A',
    (await api('/rest/v1/tasks', { metodo: 'POST', token: tokB, datos: { family_id: famA, title: 'Intrusa', priority: 'high' } })).estado >= 400)
  comprobar('B NO puede crear notas en la familia de A',
    (await api('/rest/v1/notes', { metodo: 'POST', token: tokB, datos: { family_id: famA, title: 'Intrusa' } })).estado >= 400)
  // Lo que se apunta en Finanzas es lo más sensible que guarda la app después de
  // los documentos: cuánto entra, en qué se va y quién paga qué.
  comprobar('B NO puede crear gastos en la familia de A',
    (await api('/rest/v1/expenses', { metodo: 'POST', token: tokB, datos: { family_id: famA, amount_cents: 100, date: '2026-08-10' } })).estado >= 400)
  // Un fijo es lo que más dice de una casa: cuánto cobra cada uno.
  comprobar('B NO puede crear fijos en la familia de A',
    (await api('/rest/v1/fixed_entries', { metodo: 'POST', token: tokB, datos: { family_id: famA, kind: 'ingreso', name: 'Intruso', amount_cents: 100 } })).estado >= 400)
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
  // Un gasto apunta a tres sitios —presupuesto, hijo y miembro— y cada uno tiene
  // su trigger, así que se prueban los tres. Con `budget_id` no basta la RLS:
  // el id de otra familia no se ve, pero escribirlo a ciegas sí llegaría a la
  // tabla si nadie lo comprueba.
  const presuB = (await api('/rest/v1/budgets', {
    metodo: 'POST', token: tokB, datos: { family_id: famB, name: 'Compra B', monthly_limit_cents: 20000 }, cabeceras: REPRESENTACION,
  })).cuerpo?.[0]?.id
  comprobar('Rechaza gasto con budget_id de otra familia',
    (await api('/rest/v1/expenses', { metodo: 'POST', token: tokA, datos: { family_id: famA, amount_cents: 500, date: '2026-08-11', budget_id: presuB } })).estado >= 400)
  comprobar('Rechaza gasto con child_id de otra familia',
    (await api('/rest/v1/expenses', { metodo: 'POST', token: tokA, datos: { family_id: famA, amount_cents: 500, date: '2026-08-11', child_id: hijoB } })).estado >= 400)
  comprobar('Rechaza gasto con member_id de otra familia',
    (await api('/rest/v1/expenses', { metodo: 'POST', token: tokA, datos: { family_id: famA, amount_cents: 500, date: '2026-08-11', member_id: miembroB } })).estado >= 400)
  // Los fijos también se asignan —quién cobra la nómina, quién paga el recibo—,
  // con el mismo par de columnas y por tanto el mismo modo de asignarlos mal.
  comprobar('Rechaza fijo con child_id de otra familia',
    (await api('/rest/v1/fixed_entries', { metodo: 'POST', token: tokA, datos: { family_id: famA, kind: 'gasto', name: 'cross', amount_cents: 500, child_id: hijoB } })).estado >= 400)
  comprobar('Rechaza fijo con member_id de otra familia',
    (await api('/rest/v1/fixed_entries', { metodo: 'POST', token: tokA, datos: { family_id: famA, kind: 'ingreso', name: 'cross', amount_cents: 500, member_id: miembroB } })).estado >= 400)
  // Los dos `check` que sostienen el vocabulario: un tipo que no existe, y un
  // ingreso que descontaría de una partida.
  comprobar('Rechaza un apunte con un tipo que no existe',
    (await api('/rest/v1/expenses', { metodo: 'POST', token: tokA, datos: { family_id: famA, amount_cents: 500, date: '2026-08-11', kind: 'traspaso' } })).estado >= 400)
  comprobar('Rechaza un ingreso colgado de una partida',
    (await api('/rest/v1/expenses', { metodo: 'POST', token: tokA, datos: { family_id: famA, amount_cents: 500, date: '2026-08-11', kind: 'ingreso', budget_id: presuA } })).estado >= 400)

  // ── Los meses cerrados ─────────────────────────────────────────────────────
  //
  // Son las dos primeras tablas de contenido con policy de **solo `select`**, y
  // eso es justo lo que hay que ver funcionar: que se leen las de tu familia, que
  // no se leen las de otra, y sobre todo **que nadie puede escribirlas ni
  // reescribirlas desde la app**. Si esto último se cayera, un mes cerrado
  // dejaría de significar nada.
  console.log('\n== 4b. Los meses cerrados (solo lectura)')

  // El mes pasado, calculado igual que la RPC. Cerrar el actual no hace nada a
  // propósito, así que probar con él no probaría nada.
  const ahora = new Date()
  const mesPasado = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1, 1))
    .toISOString().slice(0, 7)

  // Primero, la guarda contra los meses inventados (03-09-2026): la plantilla de
  // esta familia se ha sembrado hace un segundo, así que **no estuvo** en el mes
  // pasado y cerrarlo no puede copiar nada. Es el caso de agosto, que se cerró el
  // 1 de septiembre con unas nóminas creadas ese mismo día.
  const cierreVacio = await api('/rest/v1/rpc/close_previous_month', {
    metodo: 'POST', token: tokA, datos: { p_family_id: famA },
  })
  comprobar('Cerrar el mes pasado NO copia una plantilla creada después',
    cierreVacio.cuerpo === false)
  comprobar('Y ese mes se queda sin plan, en vez de con uno inventado',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesPasado}&select=month`, { token: tokA })) === 0)

  // Ahora con una plantilla que sí estuvo en ese mes: se siembra con `created_at`
  // viejo, que es lo único que distingue un caso del otro.
  const haceUnAño = new Date(Date.UTC(ahora.getUTCFullYear() - 1, ahora.getUTCMonth(), 1)).toISOString()
  await sembrar('fixed_entries', {
    family_id: famA, kind: 'gasto', name: 'Alquiler viejo', amount_cents: 78000, created_at: haceUnAño,
  })
  await sembrar('budgets', {
    family_id: famA, name: 'Compra vieja', monthly_limit_cents: 30000, created_at: haceUnAño,
  })

  const cierre = await api('/rest/v1/rpc/close_previous_month', {
    metodo: 'POST', token: tokA, datos: { p_family_id: famA },
  })
  comprobar('A puede cerrar el mes pasado de su familia', cierre.estado < 400)
  comprobar('El cierre deja el plan del mes pasado',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesPasado}&select=month`, { token: tokA })) === 1)
  // La foto lleva el fijo y la partida viejos, y **solo** esos dos: los de hoy no
  // estuvieron en ese mes.
  comprobar('El plan copia solo lo que ya existía en aquel mes',
    filas(await api(`/rest/v1/month_plan_lines?family_id=eq.${famA}&month=eq.${mesPasado}&select=id`, { token: tokA })) === 2)
  // Idempotente: es lo que permite llamarla desde el cron y desde la app sin que
  // se coordinen. Un segundo cierre no puede duplicar las líneas.
  await api('/rest/v1/rpc/close_previous_month', { metodo: 'POST', token: tokA, datos: { p_family_id: famA } })
  comprobar('Cerrar dos veces no duplica las líneas',
    filas(await api(`/rest/v1/month_plan_lines?family_id=eq.${famA}&month=eq.${mesPasado}&select=id`, { token: tokA })) === 2)

  comprobar('B NO ve los meses cerrados de la familia de A',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&select=month`, { token: tokB })) === 0)
  comprobar('B NO ve las líneas de los meses cerrados de A',
    filas(await api(`/rest/v1/month_plan_lines?family_id=eq.${famA}&select=id`, { token: tokB })) === 0)
  comprobar('B NO puede cerrarle el mes a la familia de A',
    (await api('/rest/v1/rpc/close_previous_month', { metodo: 'POST', token: tokB, datos: { p_family_id: famA } })).estado >= 400)
  // `close_month` es `security definer` y no comprueba familia, así que su
  // `execute` está revocado. Si esta comprobación se cae, cualquiera puede
  // congelarle el mes a cualquier casa.
  comprobar('Nadie puede llamar a close_month directamente',
    (await api('/rest/v1/rpc/close_month', { metodo: 'POST', token: tokB, datos: { p_family_id: famB, p_month: mesPasado } })).estado >= 400)
  // `close_month_copy` es la que de verdad escribe, y no tiene ninguna guarda de
  // fecha: si se pudiera llamar desde fuera, cualquiera congelaría cualquier mes
  // de cualquier casa, incluido uno que no ha llegado.
  comprobar('Nadie puede llamar a close_month_copy directamente',
    (await api('/rest/v1/rpc/close_month_copy', { metodo: 'POST', token: tokB, datos: { p_family_id: famB, p_month: mesPasado } })).estado >= 400)

  // El cierre a mano y antes de tiempo, que es lo que permite preparar el mes que
  // viene sin que el cambio caiga en el que está en curso.
  const mesActual = new Date().toISOString().slice(0, 7)
  comprobar('A puede cerrar a mano el mes en curso',
    (await api('/rest/v1/rpc/close_month_now', { metodo: 'POST', token: tokA, datos: { p_family_id: famA, p_month: mesActual } })).cuerpo === true)
  comprobar('El mes en curso queda cerrado',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesActual}&select=month`, { token: tokA })) === 1)
  // Congelar noviembre en septiembre guardaría una foto de tres meses antes y
  // nadie se acordaría de que está ahí.
  const mesFuturo = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 2, 1))
    .toISOString().slice(0, 7)
  comprobar('NO se puede cerrar un mes que no ha llegado',
    (await api('/rest/v1/rpc/close_month_now', { metodo: 'POST', token: tokA, datos: { p_family_id: famA, p_month: mesFuturo } })).estado >= 400)
  comprobar('B NO puede cerrarle a mano el mes a la familia de A',
    (await api('/rest/v1/rpc/close_month_now', { metodo: 'POST', token: tokB, datos: { p_family_id: famA, p_month: mesActual } })).estado >= 400)

  // Reabrir existe para deshacer un cierre anticipado, y **solo eso**. Si un mes
  // terminado se pudiera reabrir, no estaría cerrado, y todo lo de arriba sobra.
  comprobar('A puede reabrir el mes en curso que cerró de más',
    (await api('/rest/v1/rpc/reopen_month', { metodo: 'POST', token: tokA, datos: { p_family_id: famA, p_month: mesActual } })).cuerpo === true)
  comprobar('Tras reabrirlo, el mes en curso ya no está cerrado',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesActual}&select=month`, { token: tokA })) === 0)
  comprobar('A NO puede reabrir un mes que ya terminó',
    (await api('/rest/v1/rpc/reopen_month', { metodo: 'POST', token: tokA, datos: { p_family_id: famA, p_month: mesPasado } })).estado >= 400)
  comprobar('El mes pasado sigue cerrado después del intento',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesPasado}&select=month`, { token: tokA })) === 1)
  comprobar('B NO puede reabrirle el mes a la familia de A',
    (await api('/rest/v1/rpc/reopen_month', { metodo: 'POST', token: tokB, datos: { p_family_id: famA, p_month: mesActual } })).estado >= 400)

  // Poner a cero un mes pasado (03-09-2026): la salida para un mes que se cerró
  // con lo que no vivió. **Vacía el plan y deja la cabecera**, que es lo que evita
  // que el cierre automático lo vuelva a cerrar en la siguiente carga.
  comprobar('A puede poner a cero un mes que ya terminó',
    (await api('/rest/v1/rpc/empty_month', { metodo: 'POST', token: tokA, datos: { p_family_id: famA, p_month: mesPasado } })).cuerpo === true)
  comprobar('Al ponerlo a cero se van sus líneas',
    filas(await api(`/rest/v1/month_plan_lines?family_id=eq.${famA}&month=eq.${mesPasado}&select=id`, { token: tokA })) === 0)
  comprobar('Pero la cabecera se queda, o el cierre automático lo repetiría',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesPasado}&select=month`, { token: tokA })) === 1)
  comprobar('Y volver a cerrarlo no lo revive con la plantilla de hoy',
    (await api('/rest/v1/rpc/close_previous_month', { metodo: 'POST', token: tokA, datos: { p_family_id: famA } })).cuerpo === false)
  comprobar('NO se puede poner a cero el mes en curso',
    (await api('/rest/v1/rpc/empty_month', { metodo: 'POST', token: tokA, datos: { p_family_id: famA, p_month: mesActual } })).estado >= 400)
  comprobar('B NO puede poner a cero un mes de la familia de A',
    (await api('/rest/v1/rpc/empty_month', { metodo: 'POST', token: tokB, datos: { p_family_id: famA, p_month: mesPasado } })).estado >= 400)

  // Lo que hace que un mes cerrado se pueda dar por bueno: ni el propio dueño lo
  // reescribe. No hay policy de insert, update ni delete para nadie.
  comprobar('A NO puede escribir a mano en los meses cerrados',
    (await api('/rest/v1/month_plans', { metodo: 'POST', token: tokA, datos: { family_id: famA, month: '2020-01' } })).estado >= 400)
  comprobar('A NO puede añadir una línea a un mes cerrado',
    (await api('/rest/v1/month_plan_lines', { metodo: 'POST', token: tokA, datos: { family_id: famA, month: mesPasado, line: 'gasto', name: 'Inventado', amount_cents: 999 } })).estado >= 400)
  comprobar('A NO puede reescribir una línea de un mes cerrado',
    filas(await api(`/rest/v1/month_plan_lines?family_id=eq.${famA}&month=eq.${mesPasado}`, {
      metodo: 'PATCH', token: tokA, datos: { amount_cents: 1 }, cabeceras: REPRESENTACION,
    })) === 0)
  comprobar('A NO puede borrar un mes cerrado',
    filas(await api(`/rest/v1/month_plans?family_id=eq.${famA}&month=eq.${mesPasado}`, {
      metodo: 'DELETE', token: tokA, cabeceras: REPRESENTACION,
    })) === 0)

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

  // Una invitación no vale para siempre (03-09-2026). El enlace del correo lo
  // caduca Supabase a las pocas horas, pero lo que abre la familia es el
  // `invite_id` de la URL de vuelta, y esa URL se puede guardar: quien la tuviera
  // apuntada entraba en casa un año después. Se envejece la fila con el service
  // role, que es la única forma de probar el paso del tiempo sin esperarlo.
  //
  // Se hace con C y no con B —que ya está dentro— y **tiene que ser rechazada**,
  // así que C sigue siendo el ajeno permanente que las secciones de abajo
  // necesitan. Si esta comprobación se pusiera en verde al revés, la §12 empezaría
  // a fallar sola: eso es lo que la sostiene.
  const invitacionVieja = (await api('/rest/v1/family_invites', {
    metodo: 'POST', token: tokA, datos: { family_id: famA, email: emailC, invited_by: uidA }, cabeceras: REPRESENTACION,
  })).cuerpo?.[0]?.id
  await api(`/rest/v1/family_invites?id=eq.${invitacionVieja}`, {
    metodo: 'PATCH',
    datos: { created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
  })
  comprobar('Una invitación de hace 40 días ya no se puede aceptar',
    (await api('/rest/v1/rpc/accept_family_invite', { metodo: 'POST', token: tokC, datos: { p_invite_id: invitacionVieja } })).estado >= 400)
  comprobar('Y quien la guardaba sigue fuera de la familia',
    filas(await api(`/rest/v1/children?family_id=eq.${famA}&select=id`, { token: tokC })) === 0)
  // El caso bueno no hace falta montarlo aquí: es B aceptando la suya recién
  // hecha, seis líneas más arriba en esta misma sección. Eso es lo que impide que
  // estas dos pasen con una RPC que rechazara **todas** las invitaciones — y sale
  // gratis, sin meter a C en la familia para luego sacarlo y dejar las secciones
  // de abajo colgando de que esa limpieza funcione.

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

  // ── 8 bis. El comedor y los platos de una comida (02-09-2026) ────────
  // La franja del comedor es un valor más en dos `check` distintos —el de
  // `meal_plans.slot` y el del array de `families.meal_slots`, que además pasó de
  // cuatro a cinco elementos— y las dos columnas de platos son opcionales. Lo que
  // se comprueba es que el valor nuevo entra por los dos sitios, que sigue
  // **apagado** por defecto (una familia nueva no se despierta con la fila puesta)
  // y que las columnas guardan y admiten nulo.
  console.log('\n== 8 bis. Comedor y platos (02-09-2026)')
  comprobar('El comedor NO viene puesto en una familia nueva',
    !(await api(`/rest/v1/families?id=eq.${famB}&select=meal_slots`, { token: tokB })).cuerpo?.[0]?.meal_slots?.includes('school'))
  comprobar('A puede encender el comedor, y caben las cinco franjas',
    filas(await api(`/rest/v1/families?id=eq.${famA}`, {
      metodo: 'PATCH', token: tokA,
      datos: { meal_slots: ['breakfast', 'lunch', 'school', 'snack', 'dinner'] },
      cabeceras: REPRESENTACION,
    })) === 1)
  const menuComedor = await api('/rest/v1/meal_plans', {
    metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
    datos: {
      family_id: famA, date: '2026-09-02', slot: 'school',
      name: 'Sopa de fideos', second_course: 'Filete de pollo', dessert: 'Fruta',
    },
  })
  comprobar('Un menú de comedor con tres platos se guarda', menuComedor.estado < 400, `estado ${menuComedor.estado}`)
  comprobar('Los tres platos quedan guardados',
    menuComedor.cuerpo?.[0]?.name === 'Sopa de fideos'
      && menuComedor.cuerpo?.[0]?.second_course === 'Filete de pollo'
      && menuComedor.cuerpo?.[0]?.dessert === 'Fruta')
  comprobar('Una comida sin segundo ni postre sigue valiendo',
    filas(await api('/rest/v1/meal_plans', {
      metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
      datos: { family_id: famA, date: '2026-09-03', slot: 'breakfast', name: 'Tostadas' },
    })) === 1)
  comprobar('El check rechaza una franja de comida que no existe',
    (await api('/rest/v1/meal_plans', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, date: '2026-09-04', slot: 'brunch', name: 'Lo que sea' },
    })).estado >= 400)
  comprobar('Un ajeno NO ve el menú del comedor de A',
    filas(await api(`/rest/v1/meal_plans?family_id=eq.${famA}&slot=eq.school&select=id`, { token: tokC })) === 0)
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

  // La ficha dice en el disco de quién está el archivo, y `/api/documents/[id]/file`
  // se lo cree: lee `storage_owner` y con él pide prestado el token de esa persona,
  // ya con el cliente de servicio y sin RLS que le pare. Así que quien escribe esa
  // columna solo puede ponerse a sí mismo. B es miembro de la familia de A (§7), o
  // sea el caso que parece inofensivo: está dentro y aun así no puede señalar el
  // Drive de otro.
  comprobar('B, miembro de la familia, NO puede crear una ficha que apunte al Drive de A',
    (await api('/rest/v1/documents', {
      metodo: 'POST', token: tokB,
      datos: { family_id: famA, name: 'doc ajeno', storage_path: 'id-de-drive-999', storage_owner: uidA, mime_type: 'application/pdf', size_bytes: 10 },
    })).estado >= 400)
  // Lo que se prohíbe es señalar a **otro**, no reclamar lo propio: si B se pone a
  // sí mismo como dueño de un papel de A, el archivo deja de abrirse (su token no
  // ve lo que subió A) pero nadie se lleva nada, y borrar ese documento ya podía
  // cualquier miembro por diseño. La columna es una llave prestada, y la regla es
  // que solo se presta la de uno.
  comprobar('Ni puede cambiar el dueño de un documento que ya existe por un tercero',
    (await api('/rest/v1/documents?storage_path=eq.id-de-drive-123', {
      metodo: 'PATCH', token: tokB,
      datos: { storage_owner: uidC },
    })).estado >= 400)
  comprobar('Pero sí puede subir el suyo a la misma familia',
    filas(await api('/rest/v1/documents', {
      metodo: 'POST', token: tokB, cabeceras: REPRESENTACION,
      datos: { family_id: famA, name: 'doc de B', storage_path: 'id-de-drive-de-b', storage_owner: uidB, mime_type: 'application/pdf', size_bytes: 10 },
    })) === 1)

  // Las once carpetas (02-09-2026). El `check` de `category` es la copia en la base
  // de `DOC_CATEGORIES`, y las dos tienen que decir lo mismo: si la app ofrece
  // «Vivienda» y el check no la conoce, guardar ese papel falla en producción.
  comprobar('Una categoría nueva entra (vivienda)',
    filas(await api('/rest/v1/documents', {
      metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
      datos: { family_id: famA, name: 'contrato', category: 'vivienda', storage_path: 'x1', storage_owner: uidA, mime_type: 'application/pdf', size_bytes: 10 },
    })) === 1)
  comprobar('Y también las otras seis (vehiculo, seguros, finanzas, facturas, mascotas, viajes)',
    (await Promise.all(['vehiculo', 'seguros', 'finanzas', 'facturas', 'mascotas', 'viajes'].map(async (cat, i) =>
      filas(await api('/rest/v1/documents', {
        metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
        datos: { family_id: famA, name: `papel ${cat}`, category: cat, storage_path: `x2-${i}`, storage_owner: uidA, mime_type: 'application/pdf', size_bytes: 10 },
      })) === 1))).every(Boolean))
  comprobar('El check rechaza una categoría que no existe',
    (await api('/rest/v1/documents', {
      metodo: 'POST', token: tokA,
      datos: { family_id: famA, name: 'papel raro', category: 'astronomia', storage_path: 'x3', storage_owner: uidA, mime_type: 'application/pdf', size_bytes: 10 },
    })).estado >= 400)
  comprobar('Un papel sin categoría sigue valiendo (nulo permitido)',
    filas(await api('/rest/v1/documents', {
      metodo: 'POST', token: tokA, cabeceras: REPRESENTACION,
      datos: { family_id: famA, name: 'papel sin carpeta', storage_path: 'x4', storage_owner: uidA, mime_type: 'application/pdf', size_bytes: 10 },
    })) === 1)

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
