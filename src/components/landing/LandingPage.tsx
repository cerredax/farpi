import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  ListChecks,
  NotebookText,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'

const CONTACT = 'cerredax@gmail.com'

// Las mismas pintas que `ui/Button`, pero en un enlace: aquí no se envía nada,
// se navega. Duplicar el componente para eso no compensa.
const BOTON_BASE =
  'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold ' +
  'select-none touch-manipulation transition-[background-color,color,transform] duration-150 ' +
  'active:scale-[0.97] active:duration-0'
const BOTON_PRIMARIO = `${BOTON_BASE} bg-primary-strong text-white shadow-sm hover:bg-primary-deep active:bg-primary-deepest`
const BOTON_SECUNDARIO = `${BOTON_BASE} border border-line bg-canvas text-ink hover:bg-surface active:bg-line`

/**
 * El nombre de la app, dentro de un párrafo. Los textos van en gris (`muted`),
 * así que basta el peso y la tinta fuerte para que se reconozca: cambiarle la
 * tipografía desajustaría la línea base y se leería como un fallo de
 * maquetación, no como una marca. Es un `span` y no un `strong` a propósito —
 * no es una palabra importante de la frase, es un nombre propio.
 */
function Marca() {
  return <span className="font-bold text-ink">Farpi</span>
}

/** Lo mismo, para los textos que viven en una constante y no en el JSX. */
function conMarca(texto: string) {
  return texto.split(/(Farpi)/).map((trozo, i) =>
    trozo === 'Farpi' ? <Marca key={i} /> : trozo
  )
}

const SECCIONES = [
  { id: 'como-funciona', titulo: 'Cómo funciona' },
  { id: 'en-que-ayuda', titulo: 'En qué ayuda' },
  { id: 'preguntas', titulo: 'Preguntas' },
]

const PASOS = [
  {
    titulo: 'Creas tu familia',
    texto: 'Te haces una cuenta y le pones nombre a la casa. Es lo único que hay que configurar.',
  },
  {
    titulo: 'Invitas a los tuyos',
    texto: 'Un correo a cada uno. Quien entra ve lo mismo que el resto, sin tener que preparar nada.',
  },
  {
    titulo: 'Lo de casa, en un sitio',
    texto: 'Lo que apunta cualquiera aparece en el móvil de los demás. Sin grupos de mensajes ni papeles en la nevera.',
  },
]

const FUNCIONES = [
  {
    icon: CalendarDays,
    titulo: 'Calendario',
    texto: 'Lo que hay apuntado, quién no está y qué se acerca, sin tener que preguntarlo.',
  },
  {
    icon: ListChecks,
    titulo: 'Tareas y listas',
    texto: 'Lo que falta por hacer y lo que hay que comprar, a la vista de toda la familia.',
  },
  {
    icon: UtensilsCrossed,
    titulo: 'Comidas',
    texto: 'El menú de la semana, para no decidirlo cada día a las dos.',
  },
  {
    icon: Wallet,
    titulo: 'Dinero',
    texto: 'El gasto del mes por categorías, quién ha puesto cuánto y los presupuestos que os pasan de fuera.',
  },
  {
    icon: NotebookText,
    titulo: 'Notas',
    texto: 'Lo que hay que tener a mano en casa: el wifi, un teléfono, una dirección.',
  },
  {
    icon: FileText,
    titulo: 'Documentos',
    texto: 'Cartillas, informes, papeles importantes, en el mismo sitio y fáciles de encontrar.',
  },
]

const PREGUNTAS = [
  {
    pregunta: '¿Quién ve lo que apuntamos?',
    respuesta:
      'Solo las personas de tu familia. Cada cosa que se guarda queda atada a una familia, y el servidor no deja salir nada fuera de ella.',
  },
  {
    pregunta: '¿Cuántos podemos ser?',
    respuesta:
      'Los que hagáis falta. Se invita por correo, y quien entra ve y puede apuntar lo mismo que el resto.',
  },
  {
    pregunta: '¿Hay que instalar algo?',
    respuesta:
      'No. Farpi se abre en el navegador. En el móvil se puede añadir a la pantalla de inicio y entonces se comporta como una app más, con su icono y sin la barra del navegador.',
  },
  {
    pregunta: '¿Funciona sin internet?',
    respuesta:
      'No. Farpi necesita conexión para saber qué hay apuntado. Si te quedas sin ella te lo dice, en vez de enseñarte datos viejos como si fueran de hoy.',
  },
  {
    pregunta: '¿Me avisa de las cosas?',
    respuesta:
      'Sí, si lo activas desde Ajustes: un aviso al móvil con lo que toca ese día.',
  },
  {
    pregunta: '¿Dónde acaban mis documentos?',
    respuesta:
      'En tu propio Google Drive. Farpi solo guarda la ficha —qué es, de quién, cuándo caduca— y se la enseña a tu familia; el archivo nunca sale de tu cuenta. Los demás no tienen que conectar nada para verlo.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 py-1" aria-label="Farpi, inicio">
            <Image
              src="/app-icon.svg"
              width={32}
              height={32}
              alt=""
              aria-hidden
              priority
              className="h-8 w-8 rounded-xl shadow-sm"
            />
            <span className="text-base font-black tracking-tight">Farpi</span>
          </Link>

          {/* Las secciones solo en escritorio: en un móvil de 390 px la fila ya
              la llenan la marca y los dos botones, que son lo que no puede faltar. */}
          <nav className="ml-4 hidden gap-5 lg:flex">
            {SECCIONES.map(({ id, titulo }) => (
              <a
                key={id}
                href={`#${id}`}
                className="py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
              >
                {titulo}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/auth/login" className={BOTON_SECUNDARIO}>
              Entrar
            </Link>
            <Link href="/auth/login?modo=registro" className={BOTON_PRIMARIO}>
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <section className="pt-10 pb-12 sm:pt-14">
          <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
            Qué tenemos que saber hoy en casa.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            <Marca /> es un espacio privado para una familia: el calendario, las tareas, las listas,
            las comidas, el gasto de la casa, las notas y los documentos importantes, todo junto
            y a un vistazo.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/auth/login?modo=registro" className={BOTON_PRIMARIO}>
              Crear cuenta
            </Link>
            <Link href="/auth/login" className={BOTON_SECUNDARIO}>
              Ya tengo cuenta
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-soft">
            Se abre en el navegador. No hay que instalar nada.
          </p>
        </section>

        <section id="como-funciona" className="scroll-mt-20 border-t border-line py-10">
          <h2 className="text-lg font-bold">Cómo funciona</h2>
          <ol className="mt-6 flex flex-col gap-6">
            {PASOS.map(({ titulo, texto }, i) => (
              <li key={titulo} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-sm font-black text-primary-strong">
                  {i + 1}
                </span>
                <div>
                  <p className="font-bold">{titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="en-que-ayuda" className="scroll-mt-20 border-t border-line py-10">
          <h2 className="text-lg font-bold">En qué ayuda</h2>
          <div className="mt-6 flex flex-col gap-6">
            {FUNCIONES.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-strong">
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="font-bold">{titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="preguntas" className="scroll-mt-20 border-t border-line py-10">
          <h2 className="text-lg font-bold">Preguntas</h2>
          {/* `details` nativo: se pliega sin JavaScript, y el teclado y los
              lectores de pantalla ya saben qué es. */}
          <div className="mt-4 divide-y divide-hairline border-y border-hairline">
            {PREGUNTAS.map(({ pregunta, respuesta }) => (
              <details key={pregunta} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold marker:content-none">
                  {pregunta}
                  <span
                    aria-hidden
                    className="flex-shrink-0 text-lg font-normal leading-none text-muted-soft transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-xl pb-4 text-sm leading-relaxed text-muted">
                  {conMarca(respuesta)}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-10">
          <h2 className="text-lg font-bold">Por qué existe Farpi</h2>
          <div className="mt-4 max-w-xl space-y-4 text-sm leading-relaxed text-muted">
            <p>
              En julio nació mi hija. Y como me pasa con casi todo lo que me importa, necesitaba
              hacer algo con las manos mientras esperaba, mientras no dormía, mientras todo
              cambiaba. Así que en los ratos sueltos me puse a programar esto.
            </p>
            <p>
              Al principio se iba a llamar de otra forma, pero por un tema legal con el nombre
              tuve que cambiarlo. Al final se quedó en <Marca />, uno de los apellidos de mi hija. Me
              gustó que llevara su nombre, porque en cierto modo nació con ella.
            </p>
            <p>
              Le he dedicado bastantes horas, así que cuando la terminé no tenía sentido
              guardármela para mí. Aquí está, para quien le sirva.
            </p>
            <p>
              <Marca /> es gratuita: por ahora, y siempre que pueda mantenerse gratuitamente. Si
              algún día la usa mucha gente y sostener los servidores se me va de las manos,
              tendré que buscar la forma; eso ya lo iré viendo si llega el caso. De momento,
              disfrútala.
            </p>
          </div>
          <p className="mt-6 text-sm font-semibold text-ink">
            — Omar
            <span className="block font-normal text-muted">Septiembre de 2026</span>
          </p>
        </section>

        <section className="border-t border-line py-10">
          <h2 className="text-lg font-bold">¿Echas algo en falta?</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Esto lo llevo yo solo y lo sigo mejorando poco a poco. Si se te ocurre algo que
            debería tener, o algo que no acaba de funcionar, escríbeme a{' '}
            {/* En línea, pero con alto de dedo: el enlace suelto se quedaba en
                19 px y a 390 px es lo único que hay que tocar de esta sección. */}
            <a
              href={`mailto:${CONTACT}`}
              className="inline-block py-1 font-semibold text-primary-strong hover:underline"
            >
              {CONTACT}
            </a>.
          </p>
        </section>

        <section className="border-t border-line py-10">
          <h2 className="text-xl font-black tracking-tight">Empieza por tu casa.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Crea la familia, invita a los tuyos y mirad todos lo mismo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/auth/login?modo=registro" className={BOTON_PRIMARIO}>
              Crear cuenta
            </Link>
            <Link href="/auth/login" className={BOTON_SECUNDARIO}>
              Ya tengo cuenta
            </Link>
          </div>
        </section>

        <footer className="flex flex-wrap gap-x-5 border-t border-line pt-6 text-xs font-medium text-muted-soft">
          <Link href="/privacidad" className="py-2 hover:text-muted">Privacidad</Link>
          <Link href="/terminos" className="py-2 hover:text-muted">Términos</Link>
        </footer>
      </main>
    </div>
  )
}
