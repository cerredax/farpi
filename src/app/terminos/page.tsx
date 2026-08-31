import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Términos de servicio — Farpi',
}

const CONTACT = 'cerredax@gmail.com'

export default function TerminosPage() {
  return (
    <LegalShell title="Términos de servicio" updated="27 de agosto de 2026">
      <p>
        Estos términos regulan el uso de Farpi. Al crear una cuenta o usar la aplicación, aceptas lo siguiente.
      </p>

      <LegalSection heading="Qué es Farpi">
        <p>
          Farpi es una aplicación privada para organizar el día a día de una familia (calendario, tareas, listas,
          comidas y documentos). Está pensada para uso personal y familiar.
        </p>
      </LegalSection>

      <LegalSection heading="Tu cuenta">
        <p>
          Eres responsable de mantener la confidencialidad de tus credenciales y de la actividad de tu cuenta.
          Debes facilitar información veraz al registrarte. Farpi está pensado para que lo usen adultos; los datos
          de menores se gestionan por los adultos de su familia.
        </p>
      </LegalSection>

      <LegalSection heading="Uso aceptable">
        <p>
          Te comprometes a no usar Farpi para fines ilícitos, a no subir contenido que infrinja derechos de
          terceros, a no introducir datos personales de terceros sin autorización suficiente y a no intentar dañar
          o acceder indebidamente al servicio o a los datos de otras familias.
        </p>
      </LegalSection>

      <LegalSection heading="Tu contenido">
        <p>
          El contenido que creas (eventos, tareas, documentos, etc.) es tuyo. Nos concedes el permiso necesario
          para almacenarlo y procesarlo con el único fin de prestarte el servicio. Puedes eliminarlo o darte de
          baja cuando quieras, teniendo en cuenta que parte del contenido compartido puede seguir siendo visible
          para otros adultos de tu familia si la familia continúa activa.
        </p>
      </LegalSection>

      <LegalSection heading="Los archivos no los guarda Farpi">
        <p>
          De cada documento, Farpi guarda su ficha (nombre, categoría, caducidad); el archivo se guarda en el{' '}
          <strong>Google Drive de quien lo sube</strong>, en su propia cuenta. Para subir hace falta conectar
          Drive; para mirar, no: la familia los abre desde la app como cualquier otra cosa.
        </p>
        <p>
          Eso tiene dos consecuencias que conviene tener claras. Si desconectas tu Drive, tu familia deja de
          poder abrir los documentos que subiste tú, aunque las fichas sigan ahí. Y si se borra un documento
          cuando no podemos tocar ese Drive, la ficha desaparece de Farpi pero el archivo se queda en la cuenta
          de su dueño. Los archivos son suyos y están sujetos también a las condiciones de Google Drive.
        </p>
      </LegalSection>

      <LegalSection heading="Menores y documentos familiares">
        <p>
          Si añades información de hijos, adultos sin cuenta u otros familiares, confirmas que tienes autorización
          suficiente para hacerlo y para compartirla con los adultos de la familia dentro de Farpi. No subas
          documentos o datos delicados de personas ajenas a tu familia sin permiso.
        </p>
      </LegalSection>

      <LegalSection heading="Roles familiares">
        <p>
          Algunas acciones de gestión, como invitar adultos, cambiar roles o eliminar miembros, pueden estar
          reservadas a administradores de la familia. La app intenta evitar que una familia compartida se quede
          sin ningún administrador.
        </p>
      </LegalSection>

      <LegalSection heading="Disponibilidad">
        <p>
          El servicio se ofrece &laquo;tal cual&raquo; y &laquo;según disponibilidad&raquo;. Hacemos lo posible por
          mantenerlo operativo, pero no garantizamos que esté libre de interrupciones o errores. Te recomendamos
          conservar copias propias de la información especialmente importante.
        </p>
      </LegalSection>

      <LegalSection heading="Precio">
        <p>
          Farpi es gratuito. Si en el futuro se ofrecen funciones de pago, se informará claramente antes de
          contratarlas.
        </p>
      </LegalSection>

      <LegalSection heading="Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley, Farpi no será responsable de daños indirectos o de la pérdida de datos.
          Te recomendamos conservar copias de la información importante.
        </p>
      </LegalSection>

      <LegalSection heading="Baja">
        <p>
          Puedes dejar de usar Farpi y eliminar tu cuenta en cualquier momento. También podemos suspender cuentas
          que incumplan estos términos.
        </p>
      </LegalSection>

      <LegalSection heading="Ley aplicable">
        <p>
          Farpi lo gestiona Omar García Carballo, como proyecto personal y familiar. Estos términos se
          rigen por la legislación española. Para cualquier cuestión, escribe a{' '}
          <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong">{CONTACT}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
