import { Pencil, UserPlus, X } from 'lucide-react'
import type { FamilyMember, FamilyInvite } from '@/types'

interface MembersListProps {
  members: FamilyMember[]
  invites: FamilyInvite[]
  onEdit: (member: FamilyMember) => void
  onInvite: () => void
  onCancelInvite: (id: string) => void
}

const AVATAR_COLORS = ['#D8A48F', '#8BA888', '#E9C46A', '#7EB8D4', '#B39DDB', '#F4A261']

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function MembersList({ members, invites, onEdit, onInvite, onCancelInvite }: MembersListProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0EDE8] shadow-sm overflow-hidden">
      {members.map((member, i) => (
        <div key={member.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-[#F5F2EE]' : ''}`}>
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
            style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
          >
            {initials(member.display_name)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#252525] text-sm leading-tight truncate">{member.display_name}</p>
            <p className="text-xs text-[#77716A] mt-0.5">
              {member.role === 'admin' ? 'Administrador' : 'Miembro'}
            </p>
          </div>
          <button
            onClick={() => onEdit(member)}
            aria-label={`Editar ${member.display_name}`}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#77716A] hover:bg-[#F0EDE8] transition-colors flex-shrink-0"
          >
            <Pencil size={15} strokeWidth={1.8} />
          </button>
        </div>
      ))}

      {invites.map((invite, i) => (
        <div key={invite.id} className="flex items-center gap-3 px-4 py-3.5 border-t border-[#F5F2EE]">
          <span
            className="w-9 h-9 rounded-full border-2 border-dashed border-[#E9C46A] flex items-center justify-center text-[#9A7D1A] text-xs font-extrabold flex-shrink-0"
            style={{ backgroundColor: AVATAR_COLORS[(members.length + i) % AVATAR_COLORS.length] + '22' }}
          >
            {invite.email[0].toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[#252525] text-sm leading-tight truncate">{invite.email}</p>
              <span className="flex-shrink-0 text-[9px] font-bold bg-[#E9C46A]/30 text-[#9A7D1A] px-1.5 py-0.5 rounded-full">
                Pendiente
              </span>
            </div>
            <p className="text-xs text-[#77716A] mt-0.5">Invitación enviada</p>
          </div>
          <button
            onClick={() => onCancelInvite(invite.id)}
            aria-label={`Cancelar invitación a ${invite.email}`}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[#C4BFB9] hover:text-[#D96C6C] hover:bg-[#FDE8E8] transition-colors flex-shrink-0"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>
      ))}

      <div className="border-t border-[#F5F2EE]">
        <button
          onClick={onInvite}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-[#8BA888] hover:bg-[#F5F9F5] active:bg-[#EEF4EE] transition-colors"
        >
          <span className="w-9 h-9 rounded-full border-2 border-dashed border-[#8BA888] flex items-center justify-center flex-shrink-0">
            <UserPlus size={16} strokeWidth={1.8} />
          </span>
          <span className="text-sm font-semibold">Invitar persona</span>
        </button>
      </div>
    </div>
  )
}
