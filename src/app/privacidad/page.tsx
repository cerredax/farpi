import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Política de privacidad — Nido',
}

const CONTACT = 'tic@confia.es'

export default function PrivacidadPage() {
  return (
    <LegalShell title="Política de privacidad" updated="30 de julio de 2026">
      <p>
        En Nido nos tomamos en serio tu privacidad. Esta política explica qué datos tratamos, para qué y qué
        derechos tienes. Nido es un espacio familiar privado: no vendemos tus datos ni mostramos anuncios.
      </p>

      <LegalSection heading="Responsable del tratamiento">
        <p>
          Responsable de Nido. Para cualquier cuestión sobre tus datos, escribe a{' '}
          <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong">{CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Qué datos tratamos">
        <p>
          Datos de tu cuenta (correo electrónico y nombre para mostrar) y el contenido que creas en la app:
          familias y miembros, hijos, eventos, tareas, listas, comidas y los documentos que subes. Los
          documentos se guardan en un almacenamiento privado y solo son accesibles por tu familia.
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
          El tratamiento se basa en la ejecución del servicio que solicitas y, en el caso de las notificaciones,
          en tu consentimiento (que puedes retirar cuando quieras desactivándolas).
        </p>
      </LegalSection>

      <LegalSection heading="Dónde se almacenan">
        <p>
          Los datos se alojan en la infraestructura de <strong>Supabase</strong> (base de datos y almacenamiento
          de archivos) y la aplicación se sirve desde <strong>Vercel</strong>. Los correos (confirmación de cuenta
          e invitaciones) se envían a través de un proveedor de email. Estos proveedores actúan como encargados
          del tratamiento.
        </p>
      </LegalSection>

      <LegalSection heading="Conservación">
        <p>
          Conservamos tus datos mientras mantengas la cuenta. Si eliminas tu cuenta, se borran tus datos
          asociados. También puedes solicitar la supresión escribiéndonos.
        </p>
      </LegalSection>

      <LegalSection heading="Tus derechos">
        <p>
          Puedes acceder, rectificar, exportar o suprimir tus datos, y oponerte o limitar su tratamiento. Para
          ejercerlos, escribe a{' '}
          <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong">{CONTACT}</a>. Si resides en
          la UE, también puedes reclamar ante tu autoridad de protección de datos.
        </p>
      </LegalSection>

      <LegalSection heading="Datos de menores">
        <p>
          La información sobre hijos (nombre, fecha de nacimiento, documentos) la introducen y gestionan los
          adultos de la familia, que son responsables de dicho contenido.
        </p>
      </LegalSection>

      <LegalSection heading="Notificaciones">
        <p>
          Las notificaciones push son opcionales. Si las activas, guardamos la suscripción de tu dispositivo para
          poder enviarte recordatorios. Puedes desactivarlas en cualquier momento desde Ajustes.
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
