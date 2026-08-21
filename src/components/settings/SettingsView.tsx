'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store-context'
import { memberColor, splitPeople } from '@/lib/assignees'
import { resetDemoData } from '@/lib/family-config'
import { IS_DEMO_MODE } from '@/lib/supabase/client'
import { FamilyCard } from './FamilyCard'
import { NotificationsCard } from './NotificationsCard'
import { AccountActions } from './AccountActions'
import { InstallPWA } from './InstallPWA'
import { MembersList } from './MembersList'
import { ChildrenList } from './ChildrenList'
import { FamilySheet } from './FamilySheet'
import { MemberSheet } from './MemberSheet'
import { ChildSheet } from './ChildSheet'
import type { FamilyMember, Child, ChildDraft, Family, PersonKind } from '@/types'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted px-1">{label}</h2>
      {children}
    </section>
  )
}

export function SettingsView() {
  const {
    family, families, activeFamilyId, switchFamily, createFamily,
    members, invites, kids,
    updateFamilyName, inviteMember, updateMember, updateMemberRole, removeMember, cancelInvite,
    createKid, updateKid, deleteKid,
  } = useStore()

  const adminCount = members.filter(m => m.role === 'admin').length
  // La misma tabla, dos bloques: los adultos sin cuenta no son hijos.
  const { adultos: otrosAdultos, hijos } = splitPeople(kids)

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

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-4 pb-10 space-y-6">
        <p className="text-sm text-muted px-1">Gestiona tu familia y sus miembros</p>

        <InstallPWA />

        <Section label="Familia">
          <FamilyCard family={family} members={members} kids={kids} onEdit={() => setFamilySheetOpen(true)} />
        </Section>

        <Section label="Familias">
          <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden">
            {families.map((f: Family) => (
              <button
                key={f.id}
                onClick={() => f.id !== activeFamilyId && switchFamily(f.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-surface last:border-b-0 ${f.id === activeFamilyId ? 'bg-hairline' : 'hover:bg-canvas'}`}
              >
                <span className="text-sm font-semibold text-ink">{f.name}</span>
                {f.id === activeFamilyId && (
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">activa</span>
                )}
              </button>
            ))}
            {creatingFamily ? (
              <form onSubmit={handleCreateFamily} className="flex gap-2 px-4 py-3 border-t border-surface">
                <input
                  autoFocus
                  value={newFamilyName}
                  onChange={e => setNewFamilyName(e.target.value)}
                  placeholder="Nombre de la familia"
                  className="flex-1 px-3 py-2 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">Crear</button>
                <button type="button" onClick={() => { setCreatingFamily(false); setNewFamilyName('') }} className="px-3 py-2 rounded-xl border border-line text-sm text-muted">✕</button>
              </form>
            ) : (
              <button
                onClick={() => setCreatingFamily(true)}
                className="w-full px-4 py-3 text-sm text-primary font-semibold text-left hover:bg-canvas transition-colors border-t border-surface"
              >
                + Nueva familia
              </button>
            )}
          </div>
        </Section>

        <Section label="Adultos">
          <MembersList members={members} invites={invites} kids={kids} onEdit={openEditMember} onInvite={openInvite} onCancelInvite={cancelInvite} />
        </Section>

        <Section label="Otros adultos">
          <ChildrenList kids={otrosAdultos} kind="adulto" onEdit={openEditChild} onAdd={() => openAddChild('adulto')} />
        </Section>

        <Section label="Hijos">
          <ChildrenList kids={hijos} kind="hijo" onEdit={openEditChild} onAdd={() => openAddChild('hijo')} />
        </Section>

        {IS_DEMO_MODE && (
          <Section label="Demo">
            <div className="bg-white rounded-2xl border border-surface shadow-sm px-4 py-4 space-y-3">
              <p className="text-xs text-muted leading-relaxed">
                La app funciona en modo demo con datos de prueba guardados localmente. Puedes reiniciar todos los datos al estado inicial en cualquier momento.
              </p>
              <button
                onClick={handleReset}
                onBlur={() => setConfirmReset(false)}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmReset ? 'bg-danger text-white' : 'border border-line text-muted hover:bg-surface'}`}
              >
                {confirmReset ? 'Confirmar reinicio' : 'Reiniciar datos de demo'}
              </button>
            </div>
          </Section>
        )}

        {!IS_DEMO_MODE && (
          <Section label="Notificaciones">
            <NotificationsCard />
          </Section>
        )}

        {!IS_DEMO_MODE && (
          <Section label="Cuenta">
            <AccountActions />
          </Section>
        )}

        <Section label="Legal">
          <div className="bg-white rounded-2xl border border-surface shadow-sm overflow-hidden">
            <Link href="/privacidad" className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-canvas transition-colors border-b border-surface">
              Política de privacidad <span className="text-faint">›</span>
            </Link>
            <Link href="/terminos" className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-ink hover:bg-canvas transition-colors">
              Términos de servicio <span className="text-faint">›</span>
            </Link>
          </div>
        </Section>
      </div>

      <FamilySheet key={familySheetOpen ? 'open' : 'closed'} open={familySheetOpen} family={family} onClose={() => setFamilySheetOpen(false)} onSave={updateFamilyName} />

      <MemberSheet
        key={memberSheetKey}
        open={memberSheetOpen}
        mode={memberMode}
        initial={editingMember}
        isOnlyAdmin={editingMember?.role === 'admin' && adminCount <= 1}
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
