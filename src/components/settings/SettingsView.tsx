'use client'

import { useState } from 'react'
import { useStore } from '@/lib/store-context'
import { resetDemoData } from '@/lib/family-config'
import { FamilyCard } from './FamilyCard'
import { MembersList } from './MembersList'
import { ChildrenList } from './ChildrenList'
import { FamilySheet } from './FamilySheet'
import { MemberSheet } from './MemberSheet'
import { ChildSheet } from './ChildSheet'
import type { FamilyMember, Child, ChildDraft, Family } from '@/types'

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#77716A] px-1">{label}</h2>
      {children}
    </section>
  )
}

export function SettingsView() {
  const {
    family, families, activeFamilyId, switchFamily, createFamily,
    members, invites, kids,
    updateFamilyName, inviteMember, updateMember, removeMember, cancelInvite,
    createKid, updateKid, deleteKid,
  } = useStore()

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

  function openInvite() { setEditingMember(null); setMemberMode('invite'); setMemberSheetOpen(true) }
  function openEditMember(m: FamilyMember) { setEditingMember(m); setMemberMode('edit'); setMemberSheetOpen(true) }
  function openAddChild() { setEditingChild(null); setChildMode('create'); setChildSheetOpen(true) }
  function openEditChild(c: Child) { setEditingChild(c); setChildMode('edit'); setChildSheetOpen(true) }

  const childSheetKey  = editingChild  ? `edit-${editingChild.id}`  : 'create'
  const memberSheetKey = editingMember ? `edit-${editingMember.id}` : 'invite'

  const [confirmReset, setConfirmReset] = useState(false)

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); return }
    resetDemoData()
  }

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-4 pb-10 space-y-6">
        <p className="text-sm text-[#77716A] px-1">Gestiona tu familia y sus miembros</p>

        <Section label="Familia">
          <FamilyCard family={family} members={members} kids={kids} onEdit={() => setFamilySheetOpen(true)} />
        </Section>

        <Section label="Familias">
          <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm overflow-hidden">
            {families.map((f: Family) => (
              <button
                key={f.id}
                onClick={() => f.id !== activeFamilyId && switchFamily(f.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-[#F0EDE8] last:border-b-0 ${f.id === activeFamilyId ? 'bg-[#F5F2ED]' : 'hover:bg-[#FAF7F2]'}`}
              >
                <span className="text-sm font-semibold text-[#252525]">{f.name}</span>
                {f.id === activeFamilyId && (
                  <span className="text-xs font-bold text-[#8BA888] uppercase tracking-wide">activa</span>
                )}
              </button>
            ))}
            {creatingFamily ? (
              <form onSubmit={handleCreateFamily} className="flex gap-2 px-4 py-3 border-t border-[#F0EDE8]">
                <input
                  autoFocus
                  value={newFamilyName}
                  onChange={e => setNewFamilyName(e.target.value)}
                  placeholder="Nombre de la familia"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#EDE9E3] bg-[#FAF7F2] text-sm text-[#252525] placeholder:text-[#B8B3AC] focus:outline-none focus:ring-2 focus:ring-[#8BA888]"
                />
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#8BA888] text-white text-sm font-semibold">Crear</button>
                <button type="button" onClick={() => { setCreatingFamily(false); setNewFamilyName('') }} className="px-3 py-2 rounded-xl border border-[#EDE9E3] text-sm text-[#77716A]">✕</button>
              </form>
            ) : (
              <button
                onClick={() => setCreatingFamily(true)}
                className="w-full px-4 py-3 text-sm text-[#8BA888] font-semibold text-left hover:bg-[#FAF7F2] transition-colors border-t border-[#F0EDE8]"
              >
                + Nueva familia
              </button>
            )}
          </div>
        </Section>

        <Section label="Adultos">
          <MembersList members={members} invites={invites} onEdit={openEditMember} onInvite={openInvite} onCancelInvite={cancelInvite} />
        </Section>

        <Section label="Hijos">
          <ChildrenList kids={kids} onEdit={openEditChild} onAdd={openAddChild} />
        </Section>

        <Section label="Demo">
          <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm px-4 py-4 space-y-3">
            <p className="text-xs text-[#77716A] leading-relaxed">
              La app funciona en modo demo con datos de prueba guardados localmente. Puedes reiniciar todos los datos al estado inicial en cualquier momento.
            </p>
            <button
              onClick={handleReset}
              onBlur={() => setConfirmReset(false)}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${confirmReset ? 'bg-[#D96C6C] text-white' : 'border border-[#EDE9E3] text-[#77716A] hover:bg-[#F0EDE8]'}`}
            >
              {confirmReset ? 'Confirmar reinicio' : 'Reiniciar datos de demo'}
            </button>
          </div>
        </Section>
      </div>

      <FamilySheet key={familySheetOpen ? 'open' : 'closed'} open={familySheetOpen} family={family} onClose={() => setFamilySheetOpen(false)} onSave={updateFamilyName} />

      <MemberSheet
        key={memberSheetKey}
        open={memberSheetOpen}
        mode={memberMode}
        initial={editingMember}
        onClose={() => setMemberSheetOpen(false)}
        onInvite={(email) => inviteMember(email)}
        onUpdate={updateMember}
        onRemove={removeMember}
      />

      <ChildSheet
        key={childSheetKey}
        open={childSheetOpen}
        mode={childMode}
        initial={editingChild}
        onClose={() => setChildSheetOpen(false)}
        onCreate={(draft: ChildDraft) => createKid(draft)}
        onUpdate={updateKid}
        onDelete={deleteKid}
      />
    </>
  )
}
