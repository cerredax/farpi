'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, Loader2 } from 'lucide-react'
import { createClient, signOut } from '@/lib/supabase/client'

const PASSWORD_MIN = 8

export function AccountActions() {
  const router = useRouter()

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwDone, setPwDone] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < PASSWORD_MIN) {
      setPwError(`La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
      return
    }
    setPwBusy(true)
    setPwError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setPwBusy(false)
    if (error) {
      setPwError(error.message)
      return
    }
    setPassword('')
    setShowPasswordForm(false)
    setPwDone(true)
  }

  async function handleLogout() {
    await signOut()
    router.replace('/auth/login')
  }

  return (
    // Las dos acciones normales en una sola tarjeta, como filas: eran dos
    // tarjetas de una línea cada una, con un botón enmarcado dentro de un
    // marco. Aquí se leen como lo que son, dos cosas que se pueden hacer con
    // la cuenta, y ocupan la mitad.
    // Borrar cuenta ya no vive aquí: está en DeleteAccountCard, dentro de la
    // pestaña Legal, para que una acción tan grave no se confunda con estas.
    <div className="overflow-hidden rounded-2xl border border-surface bg-white shadow-sm">
      {showPasswordForm ? (
        <form onSubmit={handleChangePassword} className="space-y-3 p-4">
          <label htmlFor="new-password" className="field-label">Nueva contraseña</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setPwError(null) }}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            className="field-input"
          />
          {pwError && <p className="text-xs font-medium text-danger">{pwError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pwBusy} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60">
              {pwBusy ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Guardando…</span> : 'Guardar'}
            </button>
            <button type="button" onClick={() => { setShowPasswordForm(false); setPassword(''); setPwError(null) }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-surface">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => { setShowPasswordForm(true); setPwDone(false) }} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas">
          <KeyRound size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
          Cambiar contraseña
        </button>
      )}
      {pwDone && !showPasswordForm && (
        <p className="px-4 pb-3 text-xs font-medium text-primary-strong">Contraseña actualizada.</p>
      )}
      <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-hairline px-4 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-canvas">
        <LogOut size={16} strokeWidth={2} className="flex-shrink-0 text-muted" />
        Cerrar sesión
      </button>
    </div>
  )
}
