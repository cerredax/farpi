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
}

/**
 * "Asignar a": la familia, los adultos y los hijos como círculos de color.
 *
 * Vive aquí porque el bloque estaba copiado letra por letra en el sheet de los
 * eventos y en el de las tareas, y una fila de opciones copiada es una fila que
 * se cambia en un sitio y se olvida en el otro.
 *
 * El de Documentos no pasa por aquí a propósito: allí es una fila de
 * `SelectChip` con otra etiqueta y otro orden, así que comparte la lógica
 * (`buildAssignees`, `assigneeKeyOf`) pero no el control. Meterlo con una
 * bandera dejaría un componente que se lee peor que las dos versiones.
 */
export function AssigneePicker({ value, onChange, members, kids }: AssigneePickerProps) {
  return (
    <Field label="Asignar a" spacing="group">
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
