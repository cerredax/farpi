import { assigneeKeyOf, buildAssignees } from '@/lib/assignees'
import type { Child, FamilyMember } from '@/types'
import { DotOption } from './DotOption'
import { Field } from './Field'

interface AssigneePickerProps {
  /** El draft que se edita. Solo se miran sus dos ids de asignación. */
  value: { child_id: string | null; member_id: string | null }
  onChange: (asignado: { child_id: string | null; member_id: string | null }) => void
  members: FamilyMember[]
  kids: Child[]
  /** Rótulo del campo. Por defecto "Asignar a", que es como se pregunta en casi todos. */
  label?: string
  /** Texto secundario del rótulo, p. ej. "(opcional)". */
  hint?: string
}

/**
 * "Asignar a": la familia, los adultos y los hijos como círculos de color.
 *
 * Vive aquí porque el bloque estaba copiado letra por letra en el sheet de los
 * eventos y en el de las tareas, y una fila de opciones copiada es una fila que
 * se cambia en un sitio y se olvida en el otro.
 *
 * Documentos también pasa por aquí desde el 10-09-2026. Se quedó fuera porque
 * allí eran chips de texto con otro rótulo, y lo que dejaba era la única
 * pantalla de la app donde de quién es algo se elige sin color: en Tareas, en el
 * calendario y en Finanzas se elige un círculo, y en un papel un chip gris.
 * El rótulo se pasa por `label`, que es lo único que cambiaba de verdad: "de
 * quién es" el DNI, no a quién se le asigna.
 */
export function AssigneePicker({ value, onChange, members, kids, label = 'Asignar a', hint }: AssigneePickerProps) {
  return (
    <Field label={label} hint={hint} spacing="group">
      <div className="flex gap-3">
        {buildAssignees(members, kids).map(a => (
          <DotOption
            key={a.key}
            selected={assigneeKeyOf(value) === a.key}
            onClick={() => onChange({ child_id: a.child_id, member_id: a.member_id })}
            color={a.color}
            label={a.name}
          />
        ))}
      </div>
    </Field>
  )
}
