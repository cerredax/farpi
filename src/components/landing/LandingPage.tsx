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
 * **Seis de las nueve que hay, y a dos columnas.** Llegaron a estar las nueve en
 * una rejilla de 3×3 y era un muro: a 200 px de ancho una pantalla de móvil no se
 * distingue de otra, todas son una superficie clara con rayas, y el pie de foto
 * acababa haciendo todo el trabajo. Lo que las hacía ilegibles era el **ancho**,
 * no el número: a dos columnas cada una mide 314 px y da igual que haya cuatro o
 * seis, porque añadir más no las encoge, solo alarga la sección.
 *
 * Las seis están elegidas por forma distinta, que es lo que impide que la rejilla
 * parezca una cosa repetida: tarjetas con dibujo, una rejilla de mes, una lista,
 * la parrilla de la semana, barras con números y fichas. Se quedan fuera Tareas
 * (se parece demasiado a Listas), Semana (rejilla medio vacía) y Notas.
 *
 * El script sigue sacando las nueve a propósito: las otras tres hacen falta para
 * la ficha de Google Play cuando toque.
 */
const CAPTURAS = [
  { archivo: 'inicio',     titulo: 'Inicio',      texto: 'Lo de hoy: lo que hay, lo que falta y lo que se come.' },
  { archivo: 'calendario', titulo: 'El mes',      texto: 'Los días con algo apuntado, y el de hoy abierto debajo.' },
  { archivo: 'listas',     titulo: 'Listas',      texto: 'La compra y lo de casa, en marcha desde cualquier móvil.' },
  { archivo: 'comidas',    titulo: 'Comidas',     texto: 'El menú de la semana, sin decidirlo cada día a las dos.' },
  { archivo: 'finanzas',   titulo: 'Finanzas',    texto: 'El gasto del mes, los topes y quién ha puesto cuánto.' },
  { archivo: 'documentos', titulo: 'Documentos',  texto: 'El seguro, la cartilla, el libro de familia. Y qué caduca.' },
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
      'No hace falta. Farpi se abre en el navegador y funciona igual en el móvil, en la tablet y en el ordenador, con la misma cuenta y con lo mismo apuntado en los tres. En el móvil puedes añadirla a la pantalla de inicio y se comporta como una app más, con su icono y sin la barra del navegador. La de Google Play llegará más adelante y no cambiará nada de lo que ya tengáis.',
  },
  {
    pregunta: '¿Y si me quedo sin cobertura?',
    respuesta:
      'Farpi necesita conexión, como el correo o la app del banco. Si te quedas sin ella, te lo dice claramente en vez de enseñarte lo de ayer como si fuera de hoy, que es peor que no enseñar nada. En cuanto vuelve, sigues donde estabas.',
  },
  {
    pregunta: '¿Me avisa de las cosas?',
    respuesta:
      'Sí, si lo activas desde Ajustes: un aviso al móvil con lo que toca ese día.',
  },
  {
    pregunta: '¿Dónde acaban mis documentos?',
    respuesta:
      'En tu propio Google Drive. Farpi solo guarda la ficha (qué es, de quién, cuándo caduca) y se la enseña a tu familia. El archivo nunca sale de tu cuenta, y los demás no tienen que conectar nada para verlo.',
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
              ejemplo que trae la app.
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

          {/* La carta, y el único sitio de la página donde no habla la app: habla
              Omar de su casa.

              **Este texto lo escribió él.** Las dos versiones anteriores las
              redacté yo a partir de lo que me contó y las dos sonaban a folleto,
              cada una a su manera: la primera demasiado redonda —todos los
              párrafos con la misma forma y cada uno acabando en su golpecito—, la
              segunda demasiado cortada, a frases de tres palabras que piden
              aplauso. La buena salió cuando la dictó él y yo me limité a la
              ortografía, dos concordancias y partir una frase que se trababa.

              Así que aquí no se "mejora la redacción". Si algún día hay que
              cambiar algo, se le pregunta a él y se vuelve a tocar lo mínimo: lo
              que hace que esto no parezca escrito por una máquina es justo lo que
              un corrector querría arreglar. */}
          <section className={`border border-line bg-warm ${BLOQUE}`}>
            <TituloSeccion encima="Una nota de quien la hizo">Por qué existe Farpi</TituloSeccion>

            <div className="max-w-xl space-y-4 text-[0.9375rem] leading-[1.75] text-muted">
              <p>
                Desde que nació mi hija creo que perdí memoria. Eso, unido a la cantidad de cosas
                pequeñas que hay que tener presentes cada día y al cambio que supone un hijo en tu
                vida, me hizo sentir que necesitaba un poco de organización: que ya no valía lo de
                antes.
              </p>
              <p>
                Lo que pretendía con Nido, que así iba a llamarse, era tener un sitio de familia donde
                los dos viéramos lo mismo sin tener que preguntárnoslo. Así surgió este proyecto
                personal. Como ves, al final no se llama Nido sino <Marca />, en honor a un juego de
                palabras con los apellidos de mi hija.
              </p>
            </div>

            <blockquote className="my-7 max-w-xl border-l-[3px] border-primary pl-5 text-lg font-bold leading-snug tracking-tight text-ink sm:text-xl">
              Esta aplicación está hecha para que no se nos pase nada, y también para evitar
              discusiones de pareja por los despistes de no acordarse de las cosas.
            </blockquote>

            <div className="max-w-xl space-y-4 text-[0.9375rem] leading-[1.75] text-muted">
              <p>
                La publico porque considero que, si a mí me es útil, puede serlo para los demás. Si
                es de vuestro agrado, bienvenidos sois a uniros. Se trata de hacer el día un poco
                más fácil, no tiene más.
              </p>
              <p>
                Cualquier sugerencia es bienvenida:{' '}
                <a
                  href={`mailto:${CONTACT}`}
                  className="inline-block py-0.5 font-semibold text-primary-strong hover:underline"
                >
                  {CONTACT}
                </a>
                .
              </p>
            </div>

            <div className="mt-8 border-t border-line pt-6">
              <p className="text-lg font-black tracking-tight text-ink">Omar García Carballo</p>
              <p className="mt-0.5 text-sm text-muted">Septiembre de 2026</p>
            </div>
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
