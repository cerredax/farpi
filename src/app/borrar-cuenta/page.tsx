import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal/LegalShell'

export const metadata: Metadata = {
  title: 'Borrar tu cuenta — Farpi',
}

const CONTACT = 'cerredax@gmail.com'

/**
 * Cómo se borra una cuenta de Farpi, **sin tener que entrar** (28-09-2026).
 *
 * Google Play exige un enlace público donde pedir el borrado de la cuenta y de sus
 * datos sin instalar la app. El borrado de verdad sigue en Ajustes →
 * Cuenta, que es donde se hace en un toque. Esta página lo explica y da la vía
 * para quien ya no puede entrar, que es escribir. Por eso va en `PUBLIC_ROUTES`,
 * como `/privacidad` y `/terminos`.
 *
 * Lo que dice que se borra tiene que ser lo que hace `/api/account/delete`: si
 * cambia una cosa, cambia la otra.
 */
export default function BorrarCuentaPage() {
  return (
    <LegalShell title="Borrar tu cuenta" updated="17 de octubre de 2026">
      <p>
        Puedes borrar tu cuenta de Farpi y sus datos cuando quieras. Se hace desde la propia app, y si ya no
        puedes entrar, escribiéndonos.
      </p>

      <LegalSection heading="Desde la app">
        <p>
          Entra en Farpi, ve a <strong>Ajustes → Cuenta</strong> y pulsa <strong>Borrar mi cuenta</strong> al
          final de la pantalla. Te pedirá una confirmación, y el borrado se hace en ese momento.
        </p>
        <p>
          Si eres el <strong>único administrador</strong> de una familia en la que hay más personas, antes tendrás
          que nombrar a otro administrador en <strong>Ajustes → Familia</strong>: una familia no se puede quedar
          sin nadie que la gestione.
        </p>
      </LegalSection>

      <LegalSection heading="Borrar datos sin darte de baja">
        <p>
          Si solo quieres quitar una parte de tus datos y seguir usando Farpi, puedes hacerlo desde la app:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Un plan, una tarea, un gasto, una nota, un documento…</strong>: ábrelo y pulsa{' '}
            <strong>Eliminar</strong>. Al borrar la ficha de un documento, su archivo sigue en tu Drive.
          </li>
          <li>
            <strong>Una familia entera</strong>, con todo lo que tiene dentro: <strong>Ajustes → Familia</strong>,
            editar la familia y <strong>Eliminar familia</strong>. Solo pueden hacerlo los administradores y solo se
            ofrece si perteneces a otra familia más.
          </li>
          <li>
            <strong>Los avisos de este dispositivo</strong>: <strong>Ajustes → Cuenta → Notificaciones</strong>,
            <strong> Desactivar notificaciones</strong>.
          </li>
          <li>
            <strong>La conexión con tu Google Drive</strong>: <strong>Ajustes → Sincronización → Desconectar
            Google Drive</strong>. No borra ningún archivo de tu Drive.
          </li>
        </ul>
        <p>
          Si necesitas borrar algo que no puedes quitar tú, escríbenos a{' '}
          <a href={`mailto:${CONTACT}?subject=Borrar%20datos%20de%20Farpi`} className="font-semibold text-primary-strong">
            {CONTACT}
          </a>{' '}
          indicando qué dato es.
        </p>
      </LegalSection>

      <LegalSection heading="Si no puedes entrar">
        <p>
          Escríbenos a{' '}
          <a href={`mailto:${CONTACT}?subject=Borrar%20mi%20cuenta%20de%20Farpi`} className="font-semibold text-primary-strong">
            {CONTACT}
          </a>{' '}
          desde el correo con el que te registraste, con el asunto «Borrar mi cuenta de Farpi». Borraremos la
          cuenta y te lo confirmaremos en un plazo máximo de 30 días.
        </p>
      </LegalSection>

      <LegalSection heading="Qué se borra">
        <p>
          Tu cuenta y tus datos personales: tu correo, tu nombre, tu pertenencia a cada familia, tus avisos en
          los dispositivos y la conexión con tu Google Drive. Las familias en las que eres la única persona se
          borran enteras, con todo lo que tienen dentro.
        </p>
        <p>
          En una familia <strong>compartida</strong>, lo que apuntaste para todos —un plan del calendario, un
          gasto, una lista— se queda para las demás personas, porque también es suyo.
        </p>
        <p>
          Lo mismo pasa con las <strong>fichas de los documentos</strong> que subiste: se quedan en la familia, pero
          sin el archivo, porque este vive en tu Drive y la conexión se corta. Tu familia ya no podrá abrirlos desde
          Farpi y cualquiera de sus adultos puede borrar esas fichas.
        </p>
      </LegalSection>

      <LegalSection heading="Qué no se borra">
        <p>
          Los <strong>archivos de los documentos</strong> no están en Farpi: viven en tu Google Drive, en la
          carpeta «Farpi». Al borrar la cuenta se corta la conexión, pero los archivos siguen siendo tuyos y
          puedes borrarlos desde tu Drive cuando quieras.
        </p>
        <p>
          Antes de borrar, puedes descargar una copia de los datos de tu familia en{' '}
          <strong>Ajustes → Cuenta → Copia de seguridad</strong>. Más detalle en la{' '}
          <a href="/privacidad" className="font-semibold text-primary-strong">política de privacidad</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
