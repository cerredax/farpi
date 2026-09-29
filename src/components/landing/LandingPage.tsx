import Image, { type StaticImageData } from 'next/image'
import Link from 'next/link'
import { Fraunces } from 'next/font/google'
import { Smartphone } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Garantias } from '@/components/ui/Garantias'
import { DayIllustration } from '@/components/home/DayIllustration'
import { getDayPeriodEnMadrid } from '@/lib/date-utils'
import { PORTADA_ES, type TextosPortada } from './textos'
import capturaInicio from '../../../public/capturas/inicio.png'
import capturaListas from '../../../public/capturas/listas.png'
import capturaCalendario from '../../../public/capturas/calendario.png'

const CONTACT = 'cerredax@gmail.com'

/**
 * La letra de los titulares y del texto de Omar. **Solo en la portada**: la app
 * sigue en Nunito, y por eso se carga aquí y no en el layout raíz, que la
 * precargaría en todas las pantallas.
 *
 * Es la otra mitad de lo que la saca de plantilla (28-09-2026). Con una sola
 * letra redonda y todo en gris pequeño, nada de la página parecía decidido por
 * nadie. Una serifa con carácter para lo que se lee despacio y Nunito para lo
 * que se usa. `opsz` deja que el navegador afine el trazo según el tamaño: fino
 * y apretado en el titular, abierto en el cuerpo del texto.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
})

const SERIF = 'font-[family-name:var(--font-fraunces)]'

/** Los títulos de sección, la misma medida para los dos. */
const TITULO = `${SERIF} text-[2.375rem] font-medium leading-[1.05] tracking-[-0.02em] lg:text-[3.5rem]`

/**
 * El nombre de la app, dentro de un párrafo. Los textos van en gris (`muted`),
 * así que basta el peso y la tinta fuerte para que se reconozca. Es un `span` y
 * no un `strong` a propósito: no es una palabra importante de la frase, es un
 * nombre propio.
 */
function Marca() {
  return <span className="font-bold text-ink">Farpi</span>
}

/** Cualquier «Farpi» de los textos de `textos.ts` sale marcado. */
function conMarca(texto: string) {
  return texto.split(/(Farpi)/).map((trozo, i) =>
    trozo === 'Farpi' ? <Marca key={i} /> : trozo
  )
}

/**
 * Una captura de la app, con los bordes redondos de un móvil pero sin dibujar
 * el móvil: un marco de mentira con su barra de estado es lo primero que hace
 * que una captura parezca un render.
 *
 * Las genera `node scripts/gen-capturas.mjs` contra la app de verdad en modo
 * demo, con el reloj congelado en el 17-06-2026. Si la interfaz cambia, se
 * vuelve a lanzar y **se revisan las notas de `textos.ts`**, que citan lo que se
 * ve en ellas.
 *
 * **Se importan y no se piden por su ruta** (`/capturas/inicio.png`). Importadas,
 * su dirección lleva una huella del contenido: cuando el script las regenera,
 * cambia la dirección y nadie sirve la vieja. Por la ruta, la caché de imágenes
 * de Next no tiene forma de enterarse (lo dice su documentación: «there is no
 * mechanism to invalidate the cache»), y el 28-09-2026 la portada siguió
 * enseñando el mes antiguo con el archivo ya cambiado.
 *
 * `sizes` pide **el doble del hueco** a propósito: el texto de la app cae a unos
 * 9 px, con una imagen del tamaño justo se emborrona y con el doble de puntos el
 * navegador la reduce y se lee. El número tiene que seguir al ancho: si el hueco
 * crece y esto no, el navegador estira una imagen pequeña.
 */
function Captura({
  imagen,
  alt,
  sizes,
  className,
}: {
  imagen: StaticImageData
  alt: string
  sizes: string
  className: string
}) {
  return (
    <div
      className={`flex-shrink-0 overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_40px_90px_-45px_rgba(37,37,37,0.4)] ${className}`}
    >
      <Image
        src={imagen}
        sizes={sizes}
        quality={90}
        alt={alt}
        className="block h-auto w-full"
      />
    </div>
  )
}

/**
 * Dónde cae cada nota de Inicio en escritorio, para que quede a la altura de lo
 * que cuenta: las citas, las tareas y las comidas de la captura de 360 px. Se
 * miden sobre esa captura; si se regenera y las tarjetas cambian de alto, se
 * vuelven a medir. En móvil van debajo de la captura y no se alinean con nada.
 *
 * Enteros y no armados con plantillas porque Tailwind los busca leyendo el
 * archivo: un `lg:mt-[${n}px]` no existiría en el CSS.
 */
const ALTURA_NOTA = ['lg:mt-[110px]', 'lg:mt-[120px]', 'lg:mt-[110px]']

/**
 * La portada, en cuatro piezas y en este orden en todos los tamaños: el titular
 * con el formulario, el texto de Omar, lo que se ve al abrir la app y las
 * preguntas.
 *
 * Así desde el 28-09-2026. Antes eran siete secciones —capturas, «Cómo
 * funciona» en tres pasos, las funciones con iconos, preguntas plegadas y una
 * carta al final—, cada título con su rayita verde, y el conjunto era la página
 * que sale al pedirle a cualquiera una landing. Se quedó lo que no tiene nadie
 * más: el texto de Omar, arriba, y la app enseñada con lo que se ve de verdad.
 *
 * Los textos llegan de fuera (`textos.ts`) y por defecto son los de castellano:
 * `/` no pasa nada, y la versión en inglés, cuando exista, será una ruta que
 * pase `PORTADA_EN`.
 */
export function LandingPage({ textos: t = PORTADA_ES }: { textos?: TextosPortada }) {
  /**
   * La casa del texto de Omar enseña el cielo que toca —sol, atardecer o luna—,
   * y es la misma ilustración que preside Inicio. Se resuelve en el servidor
   * para que no haya un parpadeo, y el apaño de la zona horaria —el servidor va
   * en UTC— vive en `getDayPeriodEnMadrid`, que comparte con el login.
   */
  const tramo = getDayPeriodEnMadrid()

  return (
    <div lang={t.idioma} className={`${fraunces.variable} min-h-dvh bg-canvas text-ink`}>
      {/* En la barra **no hay ningún enlace de cuenta**: aquí no se navega a
          ninguna parte para entrar, se entra. Y desde el 28-09-2026 tampoco las
          secciones: son cuatro y se leen bajando. */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-3 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label={t.irAlInicio}>
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
        </div>
      </header>

      <main>
        {/* El formulario se escribe **después** del titular: es lo segundo en
            móvil y la columna de la derecha en escritorio, sin colocar nada a
            mano. Y se pinta una sola vez, porque repetirlo duplicaría los `id`
            de los campos, que es lo que ata cada etiqueta con el suyo.

            **Ya no se ancla al bajar** (28-09-2026). Estuvo `sticky` en
            escritorio desde el 01-09-2026 para poder entrar desde cualquier
            punto, y obligaba a meter todo lo demás en una columna de 760 px.
            Omar prefirió que el resto ocupe el ancho entero: quien quiere
            entrar desde abajo sube, igual que en móvil. */}
        <section className="mx-auto flex max-w-6xl flex-col gap-10 px-5 pt-10 pb-16 sm:px-8 sm:pt-14 lg:flex-row lg:items-start lg:gap-24 lg:pt-24 lg:pb-28">
          <div className="lg:flex-1 lg:pt-3">
            <h1 className={`${SERIF} max-w-2xl text-[2.875rem] font-medium leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-[5.25rem] lg:leading-none`}>
              {t.titular}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mt-9 lg:text-[1.3125rem]">
              {conMarca(t.entradilla)}
            </p>
            <Garantias className="mt-6 lg:mt-9" />
          </div>

          <div id="entrar" className="w-full max-w-xl scroll-mt-6 lg:w-[24rem] lg:max-w-none lg:flex-shrink-0">
            <div>
              <AuthCard modoInicial="signin" conGarantias={false} />

              {/* Sin la insignia oficial de Google Play: enseñarla llevaría a
                  pulsarla, y todavía no hay ficha a la que ir. Cuando la haya,
                  este bloque se cambia por la insignia y su enlace. */}
              <div className="mt-5 flex items-center justify-center gap-2.5">
                <Smartphone size={16} strokeWidth={2.2} className="flex-shrink-0 text-muted" />
                <p className="text-xs font-semibold text-muted">{t.proximamentePlay}</p>
              </div>
            </div>
          </div>
        </section>

        {/* El texto de Omar, contado como un reportaje: su primera frase en
            grande y el resto en columna, sin caja, sin título y sin firma. Va
            justo después del titular porque es lo único de la página que no
            tiene ninguna otra app. El porqué de cada decisión sobre este texto,
            junto a él en `textos.ts`. */}
        <section id="por-que" className="mx-auto max-w-6xl scroll-mt-6 px-5 sm:px-8">
          <div className="border-t border-line pt-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-6 lg:pt-20">
            <div className="lg:col-span-5">
              <DayIllustration period={tramo} className="h-16 w-16 lg:h-[5.5rem] lg:w-[5.5rem]" />
              <h2 className={`${SERIF} mt-5 text-[2.125rem] font-normal leading-[1.12] tracking-[-0.02em] lg:mt-7 lg:text-[3.375rem] lg:leading-[1.08]`}>
                {t.historia.frase}
              </h2>
              <p className="mt-4 text-sm font-bold text-muted lg:mt-7 lg:text-[0.9375rem]">{t.historia.autor}</p>
            </div>

            {/* `pt-[7.25rem]`: el alto de la casa más su margen, para que el
                primer párrafo arranque a la altura de la frase grande. */}
            <div className={`${SERIF} mt-7 flex flex-col gap-[1.125rem] text-lg leading-[1.7] lg:col-span-6 lg:col-start-7 lg:mt-0 lg:gap-[1.375rem] lg:pt-[7.25rem] lg:text-xl`}>
              {t.historia.parrafos.map(parrafo => (
                <p key={parrafo}>{conMarca(parrafo)}</p>
              ))}
              {/* El correo va `inline` dentro de la frase: es la excepción que la
                  propia WCAG 2.5.8 reconoce para el mínimo de 24 px, y la única
                  de Farpi. Agrandarlo rompería el renglón. */}
              <p>
                {t.historia.sugerencias}{' '}
                <a
                  href={`mailto:${CONTACT}`}
                  className="font-semibold text-primary-strong underline underline-offset-[3px] hover:text-primary-deep"
                >
                  {CONTACT}
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Tres capturas y no seis. En rejilla, a 200 o 300 px, una pantalla de
            móvil no se distingue de otra y el pie de foto hacía todo el trabajo;
            aquí Inicio va grande, con una nota a la altura de cada cosa que
            enseña, y las otras dos al lado de lo que cuentan. Las demás que saca
            el script se quedan para la ficha de Google Play. */}
        <section id="asi-se-ve" className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-22 sm:px-8 lg:pt-36">
          <h2 className={TITULO}>{t.capturas.titulo}</h2>
          <p className="mt-3.5 max-w-xl text-[1.0625rem] leading-relaxed text-muted lg:mt-5 lg:text-[1.1875rem]">
            {t.capturas.entradilla}
          </p>

          <div className="mt-9 lg:mt-18 lg:flex lg:items-start lg:gap-18">
            <Captura
              imagen={capturaInicio}
              alt={t.capturas.inicio.alt}
              sizes="(min-width: 1024px) 720px, 560px"
              className="w-[280px] lg:w-[360px]"
            />
            <ul className="mt-7 flex flex-col gap-5.5 lg:mt-0 lg:flex-1 lg:gap-0">
              {t.capturas.inicio.notas.map(({ titulo, texto }, i) => (
                <li key={titulo} className={`flex items-start gap-3.5 lg:gap-5 ${ALTURA_NOTA[i]}`}>
                  <span aria-hidden className="mt-3 h-px w-7 flex-shrink-0 bg-accent-strong lg:w-14" />
                  <div className="max-w-md">
                    <h3 className="text-lg font-extrabold lg:text-xl">{titulo}</h3>
                    <p className="mt-1 text-base leading-relaxed text-muted lg:mt-1.5 lg:text-[1.0625rem]">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 flex flex-col gap-14 lg:mt-32 lg:grid lg:grid-cols-2 lg:gap-20">
            {([['listas', capturaListas], ['calendario', capturaCalendario]] as const).map(([clave, imagen]) => {
              const { titulo, texto, alt } = t.capturas[clave]
              return (
                <div key={clave} className="lg:flex lg:items-end lg:gap-8">
                  <Captura
                    imagen={imagen}
                    alt={alt}
                    sizes="(min-width: 1024px) 520px, 480px"
                    className="w-[240px] lg:w-[260px]"
                  />
                  <div className="mt-5 lg:mt-0 lg:pb-6">
                    <h3 className="text-lg font-extrabold lg:text-xl">{titulo}</h3>
                    <p className="mt-1 text-base leading-relaxed text-muted lg:mt-1.5 lg:text-[1.0625rem]">{texto}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="mt-14 border-t border-line pt-6 text-[1.0625rem] leading-relaxed text-muted lg:mt-24 lg:max-w-4xl lg:pt-8 lg:text-[1.1875rem]">
            {t.capturas.ademas}
          </p>
        </section>

        {/* Abiertas y no plegadas: son seis, y se leen en lo que se tarda en
            decidir si abrir cada una. */}
        <section id="preguntas" className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-22 pb-22 sm:px-8 lg:pt-36 lg:pb-30">
          <h2 className={TITULO}>{t.preguntas.titulo}</h2>
          <div className="mt-8 flex flex-col gap-7 lg:mt-14 lg:grid lg:grid-cols-2 lg:gap-x-20 lg:gap-y-12">
            {t.preguntas.lista.map(({ pregunta, respuesta }) => (
              <div key={pregunta} className="border-t border-line pt-5 lg:pt-6">
                <h3 className="text-lg font-extrabold lg:text-[1.1875rem]">{pregunta}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted lg:mt-2.5 lg:text-[1.0625rem]">
                  {conMarca(respuesta)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-14">
          <div className="flex items-center gap-2.5">
            <Image src="/app-icon.svg" width={24} height={24} alt="" aria-hidden className="h-6 w-6 rounded-lg" />
            <p className="text-sm font-semibold text-muted">{t.pie.autor}</p>
          </div>
          {/* `min-h-11`: se pulsan con el dedo como cualquier otra cosa.
              «Borrar la cuenta» lo pide Google Play, y es lo que busca quien ya
              no puede entrar, que es justo quien no va a ver Ajustes. */}
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 text-sm font-bold text-muted">
            <Link href="/privacidad" className="inline-flex min-h-11 items-center hover:text-ink">{t.pie.privacidad}</Link>
            <Link href="/terminos" className="inline-flex min-h-11 items-center hover:text-ink">{t.pie.terminos}</Link>
            <Link href="/borrar-cuenta" className="inline-flex min-h-11 items-center hover:text-ink">{t.pie.borrarCuenta}</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
