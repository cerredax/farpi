import Image from 'next/image'
import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  ListChecks,
  NotebookText,
  ShieldCheck,
  Smartphone,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { DayIllustration } from '@/components/home/DayIllustration'
import { getDayPeriodFromHour } from '@/lib/date-utils'

const CONTACT = 'cerredax@gmail.com'

/**
 * Las secciones no se separan con una rayita: se separan con el fondo, y **solo
 * algunas lo llevan**.
 *
 * Primero fueron seis `border-t` idénticos sobre el mismo crema y la página
 * pesaba lo mismo de arriba abajo. Al meterlas todas en bloque el problema
 * volvió por el otro lado: cuando todo es un cuadro, ningún cuadro significa
 * nada. Van en bloque las tres que enseñan algo —las capturas, las secciones de
 * la app y la carta— y el resto respira. El aire es la mitad del ritmo.
 */
const BLOQUE = 'rounded-[2rem] px-6 py-9 sm:px-8 sm:py-10'

/** El titular de una sección. Antes medía lo mismo que un texto en negrita. */
const TITULO = 'text-xl font-black tracking-tight sm:text-2xl'

/**
 * Las capturas, escalonadas y torcidas un pelín, como fotos dejadas encima de
 * la mesa. Solo en escritorio: en la tira de móvil, que se arrastra y encaja de
 * una en una, torcerlas se lee como un fallo de maquetación.
 *
 * Los nombres de clase van enteros y no armados con plantillas porque Tailwind
 * los busca leyendo el archivo: un `lg:${variable}` no existiría en el CSS.
 */
const ESCALON = ['lg:mt-0', 'lg:mt-10', 'lg:mt-6', 'lg:mt-0']
const INCLINACION = ['lg:-rotate-[1.1deg]', 'lg:rotate-[0.9deg]', 'lg:rotate-[0.6deg]', 'lg:-rotate-[0.8deg]']

/**
 * El título de una sección con su rayita de color encima.
 *
 * La rayita hace el trabajo que antes hacía meterlo todo en una caja: dice
 * "aquí empieza algo" sin encerrarlo, y de paso mete el único color de marca que
 * hay en la página fuera de los botones. Va en las siete por igual —dentro y
 * fuera de bloque—, que es lo que las hace parecer hermanas.
 */
function TituloSeccion({ id, encima, children }: { id?: string; encima?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <span aria-hidden className="mb-3 block h-1 w-9 rounded-full bg-primary" />
      {encima && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-soft">{encima}</p>
      )}
      <h2 id={id} className={TITULO}>{children}</h2>
    </div>
  )
}

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
 *
 * **Cuatro, no las nueve que hay.** Llegaron a estar las nueve en una rejilla de
 * 3×3 y era un muro: a 200 px de ancho una pantalla de móvil no se distingue de
 * otra —todas son una superficie clara con rayas— y el pie de foto acababa
 * haciendo todo el trabajo. Con cuatro caben al doble de tamaño y se leen. Están
 * elegidas por **forma distinta**, que es lo que impide que la fila parezca una
 * sola cosa repetida: tarjetas con dibujo, una rejilla, una lista y barras con
 * números. Lo que se cae de aquí sigue contado en "En qué ayuda".
 *
 * El script sigue sacando las nueve a propósito: las otras cinco hacen falta
 * para la ficha de Google Play cuando toque.
 */
const CAPTURAS = [
  { archivo: 'inicio',     titulo: 'Inicio',    texto: 'Lo de hoy: lo que hay, lo que falta y lo que se come.' },
  { archivo: 'calendario', titulo: 'El mes',    texto: 'Los días con algo apuntado, y el de hoy abierto debajo.' },
  { archivo: 'listas',     titulo: 'Listas',    texto: 'La compra y lo de casa, en marcha desde cualquier móvil.' },
  { archivo: 'finanzas',   titulo: 'Finanzas',  texto: 'El gasto del mes, los topes y quién ha puesto cuánto.' },
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

export function LandingPage() {
  /**
   * La casa del titular enseña el cielo que toca —sol, atardecer o luna—, así
   * que la portada no se ve igual a las nueve de la mañana que a las once de la
   * noche. Es la misma ilustración que preside Inicio, y esa es la gracia: quien
   * entra ya ha visto la app.
   *
   * Se pinta **en el servidor**, que en Vercel va en UTC, así que la hora se
   * pide en la de Madrid: si no, media España vería el cielo de una hora antes.
   * Y se resuelve aquí y no en el navegador para que no haya un parpadeo entre
   * lo que llega pintado y lo que decide el reloj de quien mira.
   */
  const horaMadrid = Number(
    new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date())
  )
  const tramo = getDayPeriodFromHour(horaMadrid)

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

          {/* En la barra **no hay ningún enlace de cuenta**, ni un botón que
              lleve al login ni un ancla que baje al formulario. Se pidió así, y
              lo que queda es coherente: aquí ya no se navega a ninguna parte
              para entrar, se entra. El formulario es lo segundo de la página en
              móvil y va anclado a la derecha en escritorio.

              Las secciones, solo en escritorio: en un móvil de 390 px caben,
              pero apretarían la fila para llevar a sitios que están a un
              desplazamiento de distancia. */}
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
        </div>
      </header>

      {/* Tres piezas en una rejilla: el titular, el acceso y el resto de la
          página. En escritorio el acceso se va a una segunda columna que ocupa
          las dos filas, y así puede quedarse anclado mientras se lee todo lo
          demás. Por debajo de `lg` no hay columnas y caen en el orden en que
          están escritas, que es justo el que hace falta: de qué va esto, cómo
          entrar, y lo demás para quien quiera seguir leyendo.

          Van colocadas a mano (`col-start` / `row-start`) y no por orden
          natural porque el acceso se escribe en medio —tiene que ser el segundo
          en móvil— pero pertenece a la columna de al lado.

          Y se pinta **una sola vez**. Repetirlo arriba y abajo, como hacía la
          tarjeta de botones que hubo aquí, duplicaría los `id` de los campos del
          formulario, que es lo que ata cada etiqueta con el suyo: dos «Correo
          electrónico» con el mismo `id` y quien navega con lector de pantalla
          acaba escribiendo en el que no ve. */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="pt-8 pb-8 sm:pt-12 lg:col-start-1 lg:row-start-1">
          {/* La casa va **al lado del titular**, no encima: suelta en su propia
              línea se quedaba sola en mitad de la nada. Y es una sola, colocada
              en una rejilla de dos columnas en vez de repetida, porque lo que
              cambia entre móvil y escritorio no es cuál se ve sino hasta dónde
              llega: en móvil acompaña al titular y el párrafo pasa por debajo de
              ella (`col-span-2`); en escritorio baja las dos filas y se pone al
              lado del bloque entero, que es donde hay sitio para que sea grande. */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 lg:gap-x-6">
            <h1 className="text-[1.9rem] font-black leading-[1.08] tracking-tight sm:text-4xl">
              Qué tenemos que saber hoy en casa.
            </h1>

            <DayIllustration
              period={tramo}
              className="col-start-2 row-start-1 h-20 w-20 flex-shrink-0 self-center sm:h-28 sm:w-28 lg:row-span-2 lg:h-44 lg:w-44"
            />

            <div className="col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-2">
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
                <Marca /> es un espacio privado para una familia: el calendario, las tareas, las
                listas, las comidas, el gasto de la casa, las notas y los documentos importantes,
                todo junto y a un vistazo.
              </p>

              {/* Quien llega de fuera tiene una pregunta antes que ninguna otra
                  —quién ve mis cosas— y estaba contestada en las Preguntas, a
                  tres mil píxeles de aquí. Tres palabras arriba valen más que un
                  párrafo abajo. Los puntos son `span` aparte y no parte del
                  texto: así el lector de pantalla lee tres cosas y no una frase
                  con puntos en medio. */}
              <ul className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-ink">
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={15} strokeWidth={2.4} className="text-primary-strong" />
                  Privado para tu familia
                </li>
                <li aria-hidden className="text-muted-soft">·</li>
                <li>Gratis</li>
                <li aria-hidden className="text-muted-soft">·</li>
                <li>Sin anuncios</li>
              </ul>
            </div>
          </div>
        </section>

        <div
          id="entrar"
          className="scroll-mt-20 pb-10 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:pt-14"
        >
          {/* `top-20` deja por debajo la cabecera pegajosa, que mide 4 rem. */}
          <div className="lg:sticky lg:top-20">
            <AuthCard modoInicial="signin" />

            {/* Sin la insignia oficial de Google Play: enseñarla llevaría a
                pulsarla, y todavía no hay ficha a la que ir. Cuando la haya,
                este bloque se cambia por la insignia y su enlace. */}
            <div className="mt-5 flex items-center justify-center gap-2.5 border-t border-hairline pt-5">
              <Smartphone size={16} strokeWidth={2.2} className="flex-shrink-0 text-muted-soft" />
              <p className="text-xs font-semibold text-muted-soft">Próximamente en Google Play</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2">
          <section id="asi-se-ve" className={`scroll-mt-20 bg-surface ${BLOQUE}`}>
            <TituloSeccion>Así se ve</TituloSeccion>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              No son maquetas: son cuatro pantallas de <Marca /> tal cual se ven, con la familia de
              ejemplo que trae la app —un recién nacido, sus citas y la compra de la semana—.
            </p>

            {/* En móvil se arrastran de lado con el dedo, encajando de una en una;
                en escritorio se abren en rejilla y no hay nada que arrastrar. Dos
                columnas a partir de `lg` y tres desde `xl`: a tres en un portátil
                de 1024 px los móviles se quedaban en 170 px y no se leía nada de
                lo que enseñan, que es justo para lo que están.

                El `-mx-5` deja que la tira toque los bordes de la pantalla, para
                que se vea que hay más a la derecha. */}
            <ul className="-mx-6 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-8 lg:overflow-visible lg:px-0">
              {CAPTURAS.map(({ archivo, titulo, texto }, i) => (
                <li
                  key={archivo}
                  className={`group w-[230px] flex-shrink-0 snap-start lg:w-auto ${ESCALON[i % 3]}`}
                >
                  {/* Al pasar por encima se endereza y se levanta. Quien tenga
                      pedido menos movimiento en su sistema no ve ni lo uno ni
                      lo otro: se queda la foto quieta y derecha. */}
                  <div
                    className={`overflow-hidden rounded-2xl border border-line bg-canvas shadow-sm
                      transition-transform duration-300 ease-out
                      lg:group-hover:-translate-y-2 lg:group-hover:rotate-0 lg:group-hover:shadow-lg
                      motion-reduce:transform-none motion-reduce:transition-none ${INCLINACION[i % 3]}`}
                  >
                    <Image
                      src={`/capturas/${archivo}.png`}
                      width={390}
                      height={844}
                      /* Se pide **el doble del hueco** a propósito. Una captura de
                         móvil se enseña reducida, así que el texto de la app cae a
                         unos 9 px: con una imagen del tamaño justo se emborrona, y
                         con el doble de puntos el navegador la reduce y se lee. Y
                         ojo, el número tiene que seguir al hueco: cuando la rejilla
                         pasó a dos columnas y esto se quedó como estaba, el
                         navegador estuvo **estirando** una imagen pequeña. */
                      sizes="(min-width: 1024px) 620px, 520px"
                      quality={90}
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

          <section id="como-funciona" className="scroll-mt-20 px-1 py-4">
            <TituloSeccion>Cómo funciona</TituloSeccion>
            <ol className="flex flex-col gap-6">
              {PASOS.map(({ titulo, texto }, i) => (
                <li key={titulo} className="flex items-start gap-4">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-tint text-lg font-black text-primary-strong">
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

          <section id="en-que-ayuda" className={`scroll-mt-20 bg-surface ${BLOQUE}`}>
            <TituloSeccion>En qué ayuda</TituloSeccion>
            <div className="flex flex-col gap-6">
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

          <section id="preguntas" className="scroll-mt-20 px-1 py-4">
            <TituloSeccion>Preguntas</TituloSeccion>
            {/* `details` nativo: se pliega sin JavaScript, y el teclado y los
                lectores de pantalla ya saben qué es. */}
            <div className="divide-y divide-hairline border-y border-hairline">
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

          {/* La carta, y con la carta el único sitio de la página donde no
              hablo yo de la app sino Omar de su casa.

              La primera versión estaba escrita "bien" y por eso sonaba a
              folleto: todos los párrafos con la misma forma, las cosas en listas
              de tres y cada frase acabando en su golpecito. Esta está a
              propósito más suelta —frases que se cortan, un párrafo de una
              línea, cosas que se admiten sin resolver— porque así es como
              escribe una persona cansada contando algo suyo. Si alguien la
              vuelve a "mejorar", volverá a sonar a máquina. */}
          <section className={`border border-line bg-warm ${BLOQUE}`}>
            <TituloSeccion encima="Una nota de quien la hizo">Por qué existe Farpi</TituloSeccion>

            <div className="max-w-xl space-y-4 text-[0.9375rem] leading-[1.75] text-muted">
              <p>Hola.</p>
              <p>Mi hija nació en junio.</p>
              <p>
                No sé cómo lo hace todo el mundo, pero a nosotros se nos empezó a olvidar todo. La
                cita del pediatra. Si le tocaba la vitamina o ya se la habíamos dado. Yo creía que
                lo llevaba en la cabeza y resulta que no.
              </p>
              <p>
                Mi mujer y yo nos lo íbamos diciendo por mensajes, entre una cosa y otra, y al final
                ninguno de los dos sabía del todo qué estaba hecho.
              </p>
              <p>
                Así que me puse a hacer esto. No porque me sobrara el tiempo, que era justo lo que no
                había. Empezó siendo bastante menos de lo que es ahora.
              </p>
              <p>
                Iba a llamarse <strong className="font-bold text-ink">Nido</strong>. Me gustaba, era
                lo que quería que fuese. Pero había un problema legal con ese nombre y tocó buscar
                otro.
              </p>
            </div>

            <blockquote className="my-7 max-w-xl border-l-[3px] border-primary pl-5 text-lg font-bold leading-snug tracking-tight text-ink sm:text-xl">
              <Marca /> sale del apellido de mi hija. No es su apellido, son unas letras suyas. Nació
              más o menos a la vez que ella.
            </blockquote>

            <div className="max-w-xl space-y-4 text-[0.9375rem] leading-[1.75] text-muted">
              <p>
                Le voy añadiendo cosas según nos van haciendo falta en casa. Ahora son las de un
                bebé. Dentro de unos años supongo que serán otras y ya iremos viendo. Si a ti se te
                ocurre alguna antes que a mí, dímelo:{' '}
                <a
                  href={`mailto:${CONTACT}`}
                  className="inline-block py-0.5 font-semibold text-primary-strong hover:underline"
                >
                  {CONTACT}
                </a>
                . No te prometo hacerlo todo, pero lo miro.
              </p>
              <p>
                La he dejado abierta porque no tiene sentido guardármela. Si a tu casa le sirve, me
                alegro.
              </p>
              <p>Es gratis, y mientras la pueda pagar yo va a seguir siéndolo.</p>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <p className="text-lg font-black tracking-tight text-ink">Omar García Carballo</p>
              <p className="mt-0.5 text-sm text-muted">Septiembre de 2026</p>
            </div>
          </section>

          <section className="px-1 py-4">
            <TituloSeccion>¿Echas algo en falta?</TituloSeccion>
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

          <footer className="flex flex-wrap gap-x-5 border-t border-line px-1 pt-6 text-xs font-medium text-muted-soft">
            <Link href="/privacidad" className="py-2 hover:text-muted">Privacidad</Link>
            <Link href="/terminos" className="py-2 hover:text-muted">Términos</Link>
          </footer>
        </div>
      </main>
    </div>
  )
}
