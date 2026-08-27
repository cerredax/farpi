import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Política de privacidad — Nido',
}

const CONTACT = 'cerredax@gmail.com'

export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de privacidad" updated="24 de agosto de 2026">
      <p>
        En Nido nos tomamos en serio tu privacidad. Esta política explica qué datos tratamos, para qué y qué
        derechos tienes. Nido es un espacio familiar privado: no vendemos tus datos ni mostramos anuncios.
      </p>

      <LegalSection heading="Responsable del tratamiento">
        <p>
          Omar García Carballo, como responsable de este proyecto personal y familiar. Para cualquier
          cuestión sobre tus datos, escribe a{' '}
          <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong">{CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Qué datos tratamos">
        <p>
          Datos de tu cuenta (correo electrónico y nombre para mostrar) y el contenido que creas en la app:
          familias y miembros, hijos, eventos, tareas, listas, comidas y los documentos que subes. De cada
          documento guardamos su ficha (nombre, categoría, fecha de caducidad); <strong>el archivo en sí se
          guarda en el Google Drive de la persona que lo sube</strong>, en una carpeta llamada «Nido». Solo tu
          familia puede verlo, y siempre a través de la app.
        </p>
      </LegalSection>

      <LegalSection heading="Quién puede acceder a tus datos">
        <p>
          La información de una familia se comparte con los adultos que forman parte de esa familia dentro de
          Nido. Esto incluye eventos, tareas, listas, comidas, documentos y datos de hijos o adultos sin cuenta
          que se hayan añadido para organizar el día a día. Una persona de otra familia no puede acceder a esos
          datos.
        </p>
      </LegalSection>

      <LegalSection heading="Para qué los usamos">
        <p>
          Únicamente para prestarte el servicio: mostrar y sincronizar la información de tu familia entre
          dispositivos y, si las activas, enviarte recordatorios. No usamos tus datos para publicidad ni los
          cedemos a terceros con fines comerciales.
        </p>
      </LegalSection>

      <LegalSection heading="Base legal">
        <p>
          El tratamiento necesario para usar Nido se basa en la ejecución del servicio que solicitas. Las
          notificaciones push se basan en tu consentimiento, que puedes retirar cuando quieras desactivándolas
          desde Ajustes o desde tu navegador. Cuando introduces información de menores u otros familiares, eres
          responsable de contar con autorización suficiente para gestionarla en la app.
        </p>
      </LegalSection>

      <LegalSection heading="Dónde se almacenan">
        <p>
          Los datos se alojan en la infraestructura de <strong>Supabase</strong> (base de datos) y la aplicación
          se sirve desde <strong>Vercel</strong>. Los archivos de los documentos se guardan en el
          <strong>Google Drive</strong> de quien los sube, en su propia cuenta de Google. Los correos
          (confirmación de cuenta e invitaciones) se envían a través de un proveedor de email. Estos proveedores
          actúan como encargados del tratamiento.
        </p>
      </LegalSection>

      <LegalSection heading="Proveedores y transferencias internacionales">
        <p>
          Usamos proveedores técnicos para prestar el servicio: Supabase para la base de datos, Google Drive para
          los archivos de los documentos, Vercel para alojar y ejecutar la aplicación y un proveedor de correo
          para emails de cuenta e invitaciones. Esos
          proveedores pueden tratar datos fuera del Espacio Económico Europeo. En ese caso, se aplican las
          garantías contractuales y medidas exigidas por la normativa de protección de datos.
        </p>
      </LegalSection>

      <LegalSection heading="Conservación">
        <p>
          Conservamos los datos mientras tu cuenta o tu familia sigan activas en Nido. Si eliminas tu cuenta, se
          borran los datos asociados a ella, pero parte del contenido familiar compartido puede mantenerse si
          pertenece a una familia donde siguen otros adultos. Las suscripciones push se eliminan al desactivar los
          avisos o cuando dejan de ser válidas. También puedes solicitar la supresión escribiéndonos.
        </p>
      </LegalSection>

      <LegalSection heading="Tus derechos">
        <p>
          Puedes acceder, rectificar, exportar o suprimir tus datos, y oponerte o limitar su tratamiento cuando
          proceda. Dos de ellos no hace falta pedirlos: en <strong>Ajustes</strong> puedes{' '}
          <strong>descargar una copia de todos los datos de tu familia</strong> en un archivo, y borrar tu cuenta.
          Para el resto, escribe a{' '}
          <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong">{CONTACT}</a>. Responderemos
          sin dilación indebida y, en general, en el plazo de un mes. Si resides en la UE, también puedes reclamar
          ante tu autoridad de protección de datos; en España, ante la Agencia Española de Protección de Datos
          (<a href="https://www.aepd.es" className="font-semibold text-primary-strong">www.aepd.es</a>).
        </p>
      </LegalSection>

      <LegalSection heading="Datos de menores">
        <p>
          La información sobre hijos (nombre, fecha de nacimiento, documentos, eventos o tareas) la introducen y
          gestionan los adultos de la familia, que son responsables de ese contenido. Nido no está dirigido a
          menores para crear cuentas propias: está pensado para que los adultos organicen información familiar.
        </p>
      </LegalSection>

      <LegalSection heading="Documentos y datos delicados">
        <p>
          Nido permite subir documentos familiares. Algunos pueden contener información especialmente delicada,
          por ejemplo datos de salud, colegio o identificación. Sube solo documentos que tengas derecho a guardar
          y compartir con tu familia dentro de la app. No uses Nido para almacenar información de terceros sin su
          autorización.
        </p>
        <p>
          Para subir documentos hace falta conectar tu Google Drive. Nido pide el permiso mínimo
          (<code>drive.file</code>): solo puede ver y gestionar los archivos que la propia app crea, nunca el
          resto de tu Drive. Puedes retirar ese permiso cuando quieras desde Ajustes o desde tu cuenta de
          Google; los archivos seguirán siendo tuyos y en tu Drive, pero tu familia dejará de poder abrirlos
          desde Nido. Los documentos que subas están sujetos también a las condiciones de Google Drive.
        </p>
      </LegalSection>

      <LegalSection heading="Notificaciones">
        <p>
          Las notificaciones push son opcionales. Si las activas, guardamos la suscripción técnica de tu
          dispositivo (endpoint y claves públicas de la suscripción) para poder enviarte recordatorios de eventos,
          tareas y documentos próximos a caducar. Puedes desactivarlas en cualquier momento desde Ajustes.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies y almacenamiento local">
        <p>
          No usamos cookies publicitarias ni analítica de terceros. La app puede usar cookies o almacenamiento
          local estrictamente necesarios para mantener la sesión, recordar preferencias, permitir el modo demo y
          funcionar como PWA instalada.
        </p>
      </LegalSection>

      <LegalSection heading="Seguridad">
        <p>
          Aplicamos medidas técnicas razonables para proteger los datos: autenticación de usuarios, separación por
          familia y reglas de acceso en la base de datos. Los archivos nunca son públicos: los sirve la propia
          app tras comprobar que quien los pide es de la familia, y los permisos de acceso a Google Drive se
          guardan cifrados. Ningún sistema es infalible, por lo que conviene
          conservar copia propia de la información más importante.
        </p>
      </LegalSection>

      <LegalSection heading="Cambios">
        <p>
          Podemos actualizar esta política. Publicaremos aquí la versión vigente con su fecha de actualización.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
