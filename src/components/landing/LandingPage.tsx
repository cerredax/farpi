import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  ListChecks,
  NotebookText,
  Smartphone,
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
  { id: 'asi-se-ve', titulo: 'Así se ve' },
  { id: 'como-funciona', titulo: 'Cómo funciona' },
  { id: 'en-que-ayuda', titulo: 'En qué ayuda' },
  { id: 'preguntas', titulo: 'Preguntas' },
]

/**
 * Las capturas las genera `node scripts/gen-capturas.mjs` contra la app de
 * verdad en modo demo, con el reloj congelado en el 17-06-2026 para que los
 * datos de ejemplo salgan como el día que valían. No son maquetas: si la
 * interfaz cambia, se vuelve a lanzar el script y esto se entera.
 */
const CAPTURAS = [
  { archivo: 'inicio',     titulo: 'Inicio',     texto: 'Lo de hoy: lo que hay, lo que falta y lo que se come.' },
  { archivo: 'calendario', titulo: 'Calendario', texto: 'El mes de un vistazo y el día abierto debajo.' },
  { archivo: 'tareas',     titulo: 'Tareas',     texto: 'Quién hace qué, y lo que se ha quedado atrás.' },
  { archivo: 'listas',     titulo: 'Listas',     texto: 'La compra y lo de casa, en marcha desde cualquier móvil.' },
  { archivo: 'comidas',    titulo: 'Comidas',    texto: 'El menú de la semana, sin decidirlo cada día a las dos.' },
  { archivo: 'finanzas',   titulo: 'Finanzas',   texto: 'El gasto del mes, los topes y quién ha puesto cuánto.' },
  { archivo: 'notas',      titulo: 'Notas',      texto: 'El wifi, los teléfonos y lo que siempre se pregunta.' },
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
    titulo: 'Finanzas',
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
      'No. Farpi se abre en el navegador y se usa entera desde ahí. En el móvil se puede añadir a la pantalla de inicio y entonces se comporta como una app más, con su icono y sin la barra del navegador. La app de Google Play llegará más adelante, y no cambiará nada de lo que ya tengáis apuntado.',
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

/**
 * Entrar y crear cuenta, que es a lo que se viene. Sale **dos veces** en la
 * misma página: pegada al texto en móvil y anclada en la columna de la derecha
 * en escritorio, donde acompaña todo el scroll. Es el mismo componente y no dos
 * bloques parecidos, porque si un día cambia el texto de un botón tiene que
 * cambiar en los dos sitios o la portada empieza a contradecirse.
 */
function TarjetaAcceso({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
      <p className="text-base font-black tracking-tight">Empieza por tu casa</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Crea la familia, invita a los tuyos y mirad todos lo mismo. Es gratis.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <Link href="/auth/login?modo=registro" className={`${BOTON_PRIMARIO} w-full py-3 text-base`}>
          Crear cuenta
        </Link>
        <Link href="/auth/login" className={`${BOTON_SECUNDARIO} w-full py-3`}>
          Ya tengo cuenta
        </Link>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-soft">
        Se abre en el navegador. No hay que instalar nada.
      </p>

      {/* Sin la insignia oficial de Google Play: enseñarla llevaría a pulsarla, y
          todavía no hay ficha a la que ir. Cuando la haya, este bloque se cambia
          por la insignia y su enlace. */}
      <div className="mt-4 flex items-center gap-2.5 border-t border-hairline pt-4">
        <Smartphone size={16} strokeWidth={2.2} className="flex-shrink-0 text-muted-soft" />
        <p className="text-xs font-semibold text-muted-soft">Próximamente en Google Play</p>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-8">
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

      {/* En escritorio la página se parte en dos: el texto a la izquierda y el
          acceso anclado a la derecha, que es lo único que no debe perderse de
          vista mientras se lee. Por debajo de `lg` no hay columna: la tarjeta cae
          dentro del texto, justo después del titular. */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main>
          <section className="pt-10 pb-10 sm:pt-14">
            <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
              Qué tenemos que saber hoy en casa.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              <Marca /> es un espacio privado para una familia: el calendario, las tareas, las listas,
              las comidas, el gasto de la casa, las notas y los documentos importantes, todo junto
              y a un vistazo.
            </p>

            <TarjetaAcceso className="mt-7 lg:hidden" />
          </section>

          <section id="asi-se-ve" className="scroll-mt-20 border-t border-line py-10">
            <h2 className="text-lg font-bold">Así se ve</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Estas siete pantallas son <Marca /> de verdad, con la familia de ejemplo que trae la
              app: un recién nacido, sus citas y la compra de la semana.
            </p>

            {/* En móvil se arrastran de lado con el dedo, encajando de una en una;
                en escritorio se abren en tres columnas y no hay nada que arrastrar.
                Tres y no dos: una pantalla de móvil entera mide más de dos veces lo
                que mide de ancho, y a dos columnas la sección se convertía en una
                cuesta de dos mil píxeles.
                El `-mx-5` deja que la tira toque los bordes de la pantalla, para
                que se vea que hay más a la derecha. */}
            <ul className="-mx-5 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-x-5 lg:gap-y-8 lg:overflow-visible lg:px-0">
              {CAPTURAS.map(({ archivo, titulo, texto }, i) => (
                <li key={archivo} className="w-[230px] flex-shrink-0 snap-start lg:w-auto">
                  <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                    <Image
                      src={`/capturas/${archivo}.png`}
                      width={390}
                      height={844}
                      sizes="(min-width: 1024px) 250px, 230px"
                      priority={i === 0}
                      alt={`Pantalla de ${titulo} en Farpi`}
                      className="h-auto w-full"
                    />
                  </div>
                  <p className="mt-2.5 text-sm font-bold">{titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{texto}</p>
                </li>
              ))}
            </ul>
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
                En junio nació mi hija. De un día para otro había el triple de cosas que recordar:
                la revisión del pediatra, si le tocaba la vitamina, qué faltaba comprar, dónde
                habíamos guardado el informe del hospital. Mi esposa y yo nos lo íbamos contando a
                trozos, por mensajes y de memoria, y se nos caían cosas.
              </p>
              <p>
                Así que me hice esto. No para entretenerme: lo necesitaba yo, para aclararme con
                ellas dos. <Marca /> es la herramienta con la que llevamos la casa todos los días.
              </p>
              <p>
                Al principio se iba a llamar de otra forma, pero por un tema legal con el nombre
                tuve que cambiarlo. Al final se quedó en <Marca />, uno de los apellidos de mi hija.
                Me gustó que llevara su nombre, porque en cierto modo nació con ella.
              </p>
              <p>
                Y si a mí me sirve, puede servirle a otra familia. Por eso no me la he guardado:
                aquí está, para quien le valga.
              </p>
              <p>
                <Marca /> es gratuita: por ahora, y siempre que pueda mantenerse gratuitamente. Si
                algún día la usa mucha gente y sostener los servidores se me va de las manos,
                tendré que buscar la forma; eso ya lo iré viendo si llega el caso. De momento,
                disfrútala.
              </p>
            </div>
            <p className="mt-6 text-sm font-semibold text-ink">
              — Omar García Carballo
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

          {/* El cierre, para quien ha bajado hasta el final leyendo. En escritorio
              sobra —la tarjeta de la derecha lleva ahí todo el rato— pero tampoco
              estorba, y quitarla dejaría la página terminando en el correo. */}
          <section className="border-t border-line py-10">
            <TarjetaAcceso />
          </section>

          <footer className="flex flex-wrap gap-x-5 border-t border-line pt-6 text-xs font-medium text-muted-soft">
            <Link href="/privacidad" className="py-2 hover:text-muted">Privacidad</Link>
            <Link href="/terminos" className="py-2 hover:text-muted">Términos</Link>
          </footer>
        </main>

        {/* `top-20` deja por debajo la cabecera pegajosa, que mide 4 rem. El
            `aria-label` no es decorado: es lo que hace que la columna se pueda
            nombrar —y comprobar en `e2e/escritorio.spec.ts`— sin agarrarse a una
            clase de Tailwind que cambia al primer retoque. */}
        <aside aria-label="Entrar en Farpi" className="hidden lg:block">
          <TarjetaAcceso className="sticky top-20 mt-14" />
        </aside>
      </div>
    </div>
  )
}
