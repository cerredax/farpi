'use client'

import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Field } from '@/components/ui/Field'
import { useSheetForm } from '@/hooks/useSheetForm'
import { validateFamilyName } from '@/lib/validators'
import type { Family } from '@/types'

interface FamilySheetProps {
  open: boolean
  family: Family
  onClose: () => void
  onSave: (name: string) => void
}

export function FamilySheet({ open, family, onClose, onSave }: FamilySheetProps) {
  const { draft, patch, formError, firstFieldRef, submitHandler } = useSheetForm<{ name: string }>({
    open,
    initialDraft: () => ({ name: family.name }),
    validate: d => validateFamilyName(d.name),
  })

  const handleSubmit = submitHandler(valid => {
    onSave(valid.name.trim())
    onClose()
  })

  return (
    <BottomSheet open={open} title="Nombre de la familia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="px-5 py-4 pb-8 space-y-5">
        <Field label="Nombre" htmlFor="family-name">
          <input
            id="family-name"
            ref={firstFieldRef}
            type="text"
            value={draft.name}
            onChange={e => patch({ name: e.target.value })}
            placeholder="Ej: Familia de Omar, Sofía y Ana"
            required
            className="field-input"
          />
          {formError && <p className="text-[10px] text-danger font-semibold">{formError}</p>}
        </Field>
        <Button type="submit" fullWidth size="lg" disabled={!draft.name.trim()}>Guardar</Button>
      </form>
    </BottomSheet>
  )
}
