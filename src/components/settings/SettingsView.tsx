'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, X } from 'lucide-react'
import { useStore } from '@/lib/store-context'
import { memberColor, splitPeople } from '@/lib/assignees'
import { resetDemoData } from '@/lib/family-config'
import { selectFamilySummary } from '@/lib/selectors'
import { IS_DEMO_MODE } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'
import { PESTAÑAS_VISIBLES, pestañaDesdeUrl, type PestañaKey } from './pestanas'
import { FamilyCard } from './FamilyCard'
import { MealSlotsCard } from './MealSlotsCard'
import { NotificationsCard } from './NotificationsCard'
import { StorageCard } from './StorageCard'
import { BackupCard } from './BackupCard'
import { AccountActions } from './AccountActions'
import { DeleteAccountCard } from './DeleteAccountCard'
import { InstallPWA } from './InstallPWA'
import { MembersList } from './MembersList'
import { ChildrenList } from './ChildrenList'
import { FamilySheet } from './FamilySheet'
import { MemberSheet } from './MemberSheet'
import { ChildSheet } from './ChildSheet'
import type { FamilyMember, Child, ChildDraft, Family, PersonKind } from '@/types'

/**
 * Ajustes, agrupado por para qué entras y no por componentes.
 *
 * Antes eran once secciones al mismo nivel —familia, familias, adultos, otros
 * adultos, hijos, comidas, demo, notificaciones, cuenta y legal— en una columna
 * que en móvil no se acababa nunca. Se resolvió con cinco bloques en una sola
 * columna, **sin plegables**: esconder contenido ya había salido mal dos veces
 * en este repositorio (el catálogo de las listas, las tareas del día), así que
 * la solución fue nombrar bien los bloques, no ocultarlos.
 *
 * Esa razón se mantiene para el resto de la app, pero Ajustes ha vuelto a
 * crecer —ahora también hay conexión de Google Drive— y en escritorio una
 * columna larga y estrecha se ve desproporcionada en una pantalla ancha. Aquí
 * se hace una excepción consciente: pestañas. La diferencia con un plegable es
 * que aquí no hay "lo que se viene a buscar" escondido por sorpresa dentro de
 * un bloque que ya se está mirando — son secciones distintas de la pantalla,
 * cada una con su propio propósito (familia, casa, cuenta, sincronización,
 * legal), así que cambiar de pestaña es una decisión de navegación, no un
 * contenido que se pierde de vista sin querer.
 *
 * Con qué pestaña se entra lo dice la URL (`?seccion=casa`), porque el menú de
 * la cuenta lleva directo a cada una. Sin `seccion` se abre "Familia": es la más
 * predecible y la que más se usa. La última visitada no se recuerda.
 *
 * En escritorio (02-09-2026) esas pestañas se ponen de pie: columna de secciones
 * a la izquierda y contenido a la derecha, que es como se ordenan los ajustes de
 * cualquier herramienta seria y lo que la pantalla pedía desde que se hizo. Las
 * pestañas arreglaron la columna interminable, pero Ajustes seguía siendo la
 * única pantalla de contenido atada a `max-w-lg`: 512 px de contenido en medio
 * de 1440, con una fila de pastillas encima. Es **el mismo `role="tablist"`**,
 * no dos: duplicarlo para móvil y escritorio repetiría los `id` de cada pestaña
 * y dejaría los `aria-controls` apuntando a dos sitios. Solo cambia cómo se
 * coloca, de fila que envuelve a columna pegada (`lg:sticky`), para que las
 * secciones sigan a la vista mientras se baja por una pestaña larga.
 */

/**
 * Un bloque de Ajustes: el nivel de "¿a qué he entrado?".
 *
 * Con su rayita de color encima, la misma que separa las secciones de la
 * portada. Hasta el 02-09-2026 era un `<h2>` de 14 px sin nada alrededor,
 * flotando sobre unas tarjetas que sí tienen borde y sombra: el título pesaba
 * menos que lo que titulaba y la pantalla se leía como una lista de trozos
 * sueltos. La rayita dice "aquí empieza algo" sin encerrarlo en otra caja —
 * meter cada bloque en un cuadro habría sido cuadros dentro de cuadros— y de
 * paso mete el color de marca en una pantalla que no tenía ninguno.
 */
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <span aria-hidden className="mb-2.5 block h-1 w-9 rounded-full bg-primary" />
        <h2 className="text-base font-extrabold tracking-tight text-ink">{titulo}</h2>
      </div>
      {children}
    </section>
  )
}

/**
 * Un grupo dentro de un bloque, para cuando sus partes necesitan nombre.
 *
 * En gris y a media voz, que es todo lo que tiene que hacer: nombrar la tabla
 * de abajo. Iba en versalitas con `tracking-widest`, y esa letra ancha y
 * espaciada llamaba tanto la atención como el título del bloque —a veces más,
 * porque era más larga—, así que los dos niveles competían en vez de ordenarse.
 */
function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-xs font-bold text-muted">{titulo}</h3>
      {children}
    </div>
  )
}

export function SettingsView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    family, families, activeFamilyId, switchFamily, createFamily, deleteFamily,
    members, invites, kids, mealSlots, documents, allEvents, tasks, lists, meals,
    updateFamilyName, updateMealSlots, inviteMember, updateMember, updateMemberRole, removeMember, cancelInvite,
    createKid, updateKid, deleteKid,
  } = useStore()

  const adminCount = members.filter(m => m.role === 'admin').length
  // La misma tabla, dos bloques: los adultos sin cuenta no son hijos.
  const { adultos: otrosAdultos, hijos } = splitPeople(kids)

  // El resumen de la casa, al principio de "Personas" y solo ahí. Los adultos
  // sin cuenta cuentan como adultos: una abuela es de la familia aunque no entre
  // en la app. Las invitaciones solo se nombran si hay alguna pendiente, que es
  // lo único que este resumen dice y la tarjeta de la familia no.
  const numAdultos = members.length + otrosAdultos.length
  const resumenPersonas = [
    numAdultos === 1 ? '1 adulto' : `${numAdultos} adultos`,
    hijos.length === 1 ? '1 hijo' : `${hijos.length} hijos`,
    ...(invites.length > 0 ? [invites.length === 1 ? '1 invitación' : `${invites.length} invitaciones`] : []),
  ].join(' · ')

  // Lo que hay dentro de la familia, para el aviso de borrarla. Las personas van
  // juntas —con cuenta y sin ella— porque al cerrarla se van todas igual.
  const contenidoFamilia = selectFamilySummary({
    personas: members.length + kids.length,
    eventos: allEvents.length,
    tareas: tasks.length,
    listas: lists.length,
    comidas: meals.length,
    documentos: documents.length,
  })

  const [newFamilyName, setNewFamilyName] = useState('')
  const [creatingFamily, setCreatingFamily] = useState(false)

  function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault()
    const name = newFamilyName.trim()
    if (!name) return
    createFamily(name)
    setNewFamilyName('')
    setCreatingFamily(false)
  }

  const [familySheetOpen, setFamilySheetOpen] = useState(false)
  const [memberSheetOpen, setMemberSheetOpen] = useState(false)
  const [childSheetOpen, setChildSheetOpen]   = useState(false)
  const [memberMode, setMemberMode] = useState<'invite' | 'edit'>('invite')
  const [childMode, setChildMode]             = useState<'create' | 'edit'>('create')
  const [editingMember, setEditingMember]     = useState<FamilyMember | null>(null)
  const [editingChild, setEditingChild]       = useState<Child | null>(null)
  const [childKind, setChildKind]             = useState<PersonKind>('hijo')

  function openInvite() { setEditingMember(null); setMemberMode('invite'); setMemberSheetOpen(true) }
  function openEditMember(m: FamilyMember) { setEditingMember(m); setMemberMode('edit'); setMemberSheetOpen(true) }
  function openAddChild(kind: PersonKind) { setEditingChild(null); setChildKind(kind); setChildMode('create'); setChildSheetOpen(true) }
  function openEditChild(c: Child) { setEditingChild(c); setChildKind(c.kind); setChildMode('edit'); setChildSheetOpen(true) }

  const childSheetKey  = editingChild  ? `edit-${editingChild.id}`  : `create-${childKind}`
  const memberSheetKey = editingMember ? `edit-${editingMember.id}` : 'invite'

  const [confirmReset, setConfirmReset] = useState(false)

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return }
    resetDemoData()
  }

  // Qué pestaña se ve lo dice la URL y solo la URL. Sin estado propio: el menú
  // de la cuenta entra por `/settings?seccion=casa` sin desmontar la pantalla, y
  // con dos fuentes de verdad había que sincronizarlas en un efecto. Las
  // pestañas escriben la suya con `replace` para no llenar el historial de pasos
  // atrás dentro de la misma pantalla.
  const pestañaActiva = pestañaDesdeUrl(searchParams.get('seccion'))
  const irAPestaña = (key: PestañaKey) =>
    router.replace(`${ROUTES.settings}?seccion=${key}`, { scroll: false })

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-4 pb-10 lg:max-w-5xl lg:px-6 lg:py-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8 lg:items-start">
        {/* Mismo patrón que los filtros de Documentos, que el 02-09-2026 dejaron
            de arrastrarse: las cinco se ven a la vez y envuelven si no caben.
            Una pestaña que hay que descubrir arrastrando es peor que un
            plegable, porque ni siquiera se sabe que está ahí.

            El verde macizo se fue el mismo día. La pestaña activa se marca como
            se marca la sección activa en `SideNav` —fondo verde muy claro y
            letra verde oscura, que da 4,5:1 sobre el tinte—, y las demás son
            texto y nada más: cinco pastillas blancas con borde eran cinco
            botones pidiendo que los pulsaras, y solo uno era el sitio donde ya
            estabas.

            El `lg:top-6` del pegado es 24 px y no 80: quien hace scroll aquí no
            es la ventana sino el `<main>` de `AppShell`, que ya lleva el `pt-14`
            que deja sitio a `TopBar`. Un `sticky` se mide contra su contenedor
            de scroll, así que 80 px habría bajado la columna otros 56 px de
            entrada, desalineada con el contenido antes incluso de mover nada. */}
        <div
          role="tablist"
          aria-label="Secciones de ajustes"
          className="mb-6 flex flex-wrap gap-2 pb-1 lg:mb-0 lg:flex-col lg:flex-nowrap lg:gap-1 lg:pb-0 lg:sticky lg:top-6"
        >
          {PESTAÑAS_VISIBLES.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`tab-${p.key}`}
              aria-selected={pestañaActiva === p.key}
              aria-controls={`panel-${p.key}`}
              onClick={() => irAPestaña(p.key)}
              className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-bold transition-colors lg:flex lg:w-full lg:min-h-11 lg:gap-3 lg:py-2.5 lg:text-sm ${
                pestañaActiva === p.key
                  ? 'bg-primary-tint text-primary-strong'
                  : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              <p.icon
                size={19}
                strokeWidth={pestañaActiva === p.key ? 2.4 : 1.8}
                aria-hidden
                className="hidden flex-shrink-0 lg:block"
              />
              {p.label}
            </button>
          ))}
        </div>

        {/* La segunda columna. En móvil no es nada: los paneles van uno detrás
            de otro como siempre. `min-w-0` porque una rejilla no deja encoger a
            sus columnas por debajo de su contenido, y basta una tabla ancha
            dentro de un panel para empujar la página a lo ancho. */}
        <div className="min-w-0">
          <div id="panel-familia" role="tabpanel" aria-labelledby="tab-familia" hidden={pestañaActiva !== 'familia'} className="space-y-7">
            <Bloque titulo="Tu familia">
              <FamilyCard family={family} onEdit={() => setFamilySheetOpen(true)} />

              <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
                {/* Con una sola familia la lista repetía el nombre que ya está en la
                    tarjeta de arriba, y tocarla no hacía nada. Se enseña cuando hay
                    de dónde elegir; crear una nueva se puede siempre. */}
                {families.length > 1 && families.map((f: Family) => (
                  <button
                    key={f.id}
                    onClick={() => f.id !== activeFamilyId && switchFamily(f.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-surface ${f.id === activeFamilyId ? 'bg-hairline' : 'hover:bg-canvas'}`}
                  >
                    <span className="text-sm font-semibold text-ink">{f.name}</span>
                    {f.id === activeFamilyId && (
                      <span className="text-xs font-bold text-primary-strong uppercase tracking-wide">activa</span>
                    )}
                  </button>
                ))}
                {creatingFamily ? (
                  <form onSubmit={handleCreateFamily} className="flex gap-2 px-4 py-3">
                    <input
                      autoFocus
                      value={newFamilyName}
                      onChange={e => setNewFamilyName(e.target.value)}
                      placeholder="Nombre de la familia"
                      className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button type="submit" className="flex-shrink-0 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Crear</button>
                    <button type="button" onClick={() => { setCreatingFamily(false); setNewFamilyName('') }} aria-label="Cancelar" className="flex flex-shrink-0 items-center justify-center px-3 py-2 rounded-xl border border-line text-muted transition-colors hover:bg-surface hover:text-ink"><X size={16} strokeWidth={2.4} /></button>
                  </form>
                ) : (
                  <button
                    onClick={() => setCreatingFamily(true)}
                    className="w-full px-4 py-3 text-sm text-primary-strong font-semibold text-left hover:bg-canvas transition-colors"
                  >
                    + Nueva familia
                  </button>
                )}
              </div>
            </Bloque>

            <Bloque titulo="Personas">
              <p className="-mt-1 px-1 text-xs text-muted">{resumenPersonas}</p>

              {/* "Con cuenta" y "sin cuenta" es la frontera de verdad de la app, no
                  adulto/niño: para estar en `family_members` hace falta correo,
                  cuenta y sesión. Antes decían "Adultos" y "Otros adultos", que
                  dejaba a la abuela como un adulto de segunda y no explicaba nada. */}
              <Grupo titulo="Adultos con cuenta">
                <MembersList members={members} invites={invites} kids={kids} onEdit={openEditMember} onInvite={openInvite} onCancelInvite={cancelInvite} />
              </Grupo>

              <Grupo titulo="Adultos sin cuenta">
                <ChildrenList kids={otrosAdultos} kind="adulto" onEdit={openEditChild} onAdd={() => openAddChild('adulto')} />
              </Grupo>

              <Grupo titulo="Hijos">
                <ChildrenList kids={hijos} kind="hijo" onEdit={openEditChild} onAdd={() => openAddChild('hijo')} />
              </Grupo>
            </Bloque>
          </div>

          <div id="panel-casa" role="tabpanel" aria-labelledby="tab-casa" hidden={pestañaActiva !== 'casa'} className="space-y-7">
            <Bloque titulo="Preferencias de la casa">
              {/* Solo aparece cuando el navegador ofrece instalar. */}
              <InstallPWA />

              <Grupo titulo="Franjas de comida">
                <MealSlotsCard slots={mealSlots} onChange={updateMealSlots} />
              </Grupo>
            </Bloque>
          </div>

          <div id="panel-cuenta" role="tabpanel" aria-labelledby="tab-cuenta" hidden={pestañaActiva !== 'cuenta'} className="space-y-7">
            <Bloque titulo="Cuenta">
              {!IS_DEMO_MODE && (
                <Grupo titulo="Notificaciones">
                  <NotificationsCard />
                </Grupo>
              )}

              {/* La copia de seguridad son datos de la familia, no de tu cuenta,
                  pero vive en esta pestaña porque es donde se buscan las cosas de
                  "gestionar mi cuenta y mis datos". Funciona igual en modo demo
                  (exporta lo que hay en localStorage), así que no depende de
                  IS_DEMO_MODE: si dependiera, la suite no podría probarla. */}
              <BackupCard />

              {!IS_DEMO_MODE && <AccountActions />}

              {/* Borrar cuenta, al final de su propia pestaña (28-08-2026). Estuvo
                  en Legal para que no se confundiera con cerrar sesión, que vivía
                  justo encima; ahora cerrar sesión está en el menú de la cuenta y
                  ya no hay con qué confundirla, así que vuelve donde se busca. La
                  separación sigue siendo visual: tarjeta aparte, en rojo y con
                  confirmación. */}
              {!IS_DEMO_MODE && <DeleteAccountCard />}
            </Bloque>
          </div>

          {!IS_DEMO_MODE && (
            <div id="panel-sincronizacion" role="tabpanel" aria-labelledby="tab-sincronizacion" hidden={pestañaActiva !== 'sincronizacion'} className="space-y-7">
              <Bloque titulo="Sincronización">
                <StorageCard />
              </Bloque>
            </div>
          )}

          <div id="panel-legal" role="tabpanel" aria-labelledby="tab-legal" hidden={pestañaActiva !== 'legal'} className="space-y-7">
            <Bloque titulo="Legal">
              <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden">
                <Link href="/privacidad" className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-canvas transition-colors border-b border-surface">
                  Política de privacidad <ChevronRight size={16} strokeWidth={2.4} className="flex-shrink-0 text-faint" />
                </Link>
                <Link href="/terminos" className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-canvas transition-colors">
                  Términos de servicio <ChevronRight size={16} strokeWidth={2.4} className="flex-shrink-0 text-faint" />
                </Link>
              </div>
            </Bloque>
          </div>

          {/* Modo demo no entra en pestañas: no es una sección más de la
              pantalla, es un aviso sobre la pantalla entera, así que se queda
              siempre a la vista debajo, pase lo que pase con la pestaña activa. */}
          {IS_DEMO_MODE && (
            <div className="mt-7">
              <Bloque titulo="Modo demo">
                <div className="rounded-2xl border border-surface bg-white px-4 py-4 shadow-sm space-y-3">
                  <p className="text-xs text-muted">Los datos son de prueba y viven en este navegador.</p>
                  <button
                    onClick={handleReset}
                    onBlur={() => setConfirmReset(false)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmReset ? 'bg-danger text-white' : 'border border-line text-muted hover:bg-surface'}`}
                  >
                    {confirmReset ? 'Confirmar reinicio' : 'Reiniciar datos de demo'}
                  </button>
                </div>
              </Bloque>
            </div>
          )}
        </div>
      </div>

      <FamilySheet
        key={familySheetOpen ? 'open' : 'closed'}
        open={familySheetOpen}
        family={family}
        contenido={contenidoFamilia}
        puedeEliminar={families.length > 1}
        hayDocumentos={documents.length > 0}
        onClose={() => setFamilySheetOpen(false)}
        onSave={updateFamilyName}
        onDelete={deleteFamily}
      />

      <MemberSheet
        key={memberSheetKey}
        open={memberSheetOpen}
        mode={memberMode}
        initial={editingMember}
        isOnlyAdmin={editingMember?.role === 'admin' && adminCount <= 1}
        documentosSubidos={editingMember ? documents.filter(d => d.storage_owner === editingMember.user_id).length : 0}
        defaultColor={editingMember ? memberColor(members, editingMember.id, kids) : undefined}
        onClose={() => setMemberSheetOpen(false)}
        onInvite={(email) => inviteMember(email)}
        onUpdate={updateMember}
        onChangeRole={updateMemberRole}
        onRemove={removeMember}
      />

      <ChildSheet
        key={childSheetKey}
        open={childSheetOpen}
        mode={childMode}
        kind={childKind}
        initial={editingChild}
        onClose={() => setChildSheetOpen(false)}
        onCreate={(draft: ChildDraft) => createKid(draft)}
        onUpdate={updateKid}
        onDelete={deleteKid}
      />
    </>
  )
}
