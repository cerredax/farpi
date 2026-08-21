import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Términos de servicio — Nido',
}

const CONTACT = 'cerredax@gmail.com'

export default function TerminosPage() {
  return (
    <LegalShell title="Términos de servicio" updated="4 de agosto de 2026">
      <p>
        Estos términos regulan el uso de Nido. Al crear una cuenta o usar la aplicación, aceptas lo siguiente.
      </p>

      <LegalSection heading="Qué es Nido">
        <p>
          Nido es una aplicación privada para organizar el día a día de una familia (calendario, tareas, listas,
          comidas y documentos). Está pensada para uso personal y familiar.
        </p>
      </LegalSection>

      <LegalSection heading="Tu cuenta">
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales y de la actividad de tu cuenta.
          Debes facilitar información veraz al registrarte.
        </p>
      </LegalSection>

      <LegalSection heading="Uso aceptable">
        <p>
          Te comprometes a no usar Nido para fines ilícitos, a no subir contenido que infrinja derechos de
          terceros y a no intentar dañar o acceder indebidamente al servicio o a los datos de otras familias.
        </p>
      </LegalSection>

      <LegalSection heading="Tu contenido">
        <p>
          El contenido que creas (eventos, tareas, documentos, etc.) es tuyo. Nos concedes el permiso necesario
          para almacenarlo y procesarlo con el único fin de prestarte el servicio. Puedes eliminarlo o darte de
          baja cuando quieras.
        </p>
      </LegalSection>

      <LegalSection heading="Disponibilidad">
        <p>
          El servicio se ofrece &laquo;tal cual&raquo; y &laquo;según disponibilidad&raquo;. Hacemos lo posible por
          mantenerlo operativo, pero no garantizamos que esté libre de interrupciones o errores.
        </p>
      </LegalSection>

      <LegalSection heading="Precio">
        <p>
          Nido es gratuito. Si en el futuro se ofrecen funciones de pago, se informará claramente antes de
          contratarlas.
        </p>
      </LegalSection>

      <LegalSection heading="Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley, Nido no será responsable de daños indirectos o de la pérdida de datos.
          Te recomendamos conservar copias de la información importante.
        </p>
      </LegalSection>

      <LegalSection heading="Baja">
        <p>
          Puedes dejar de usar Nido y eliminar tu cuenta en cualquier momento. También podemos suspender cuentas
          que incumplan estos términos.
        </p>
      </LegalSection>

      <LegalSection heading="Ley aplicable">
        <p>
          Nido lo gestiona Omar García Carballo, como proyecto personal y familiar. Estos términos se
          rigen por la legislación española. Para cualquier cuestión, escribe a{' '}
          <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong">{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
