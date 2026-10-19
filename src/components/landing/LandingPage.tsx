import Image, { type StaticImageData } from 'next/image'
import Link from 'next/link'
import { Fraunces } from 'next/font/google'
import { ArrowDown, ArrowRight, Smartphone } from 'lucide-react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Garantias } from '@/components/ui/Garantias'
import { DayIllustration } from '@/components/home/DayIllustration'
import { getDayPeriodEnMadrid } from '@/lib/date-utils'
import { PLAY_STORE_PUBLICADA, PLAY_STORE_URL } from '@/lib/constants'
import { PORTADA_ES, type TextosPortada } from './textos'
import capturaInicio from '../../../public/capturas/inicio.png'
import capturaListas from '../../../public/capturas/listas.png'
import capturaCalendario from '../../../public/capturas/calendario.png'

const CONTACT = 'cerredax@gmail.com'
// La serifa pertenece a la portada; la app sigue usando Nunito.
const fraunces = Fraunces({ subsets: ['latin'], axes: ['opsz'], variable: '--font-fraunces' })
const SERIF = 'font-[family-name:var(--font-fraunces)]'
const TITULO = `${SERIF} text-[2.125rem] font-medium leading-[1.1] tracking-[-0.02em] lg:text-[3rem]`
const BOTON = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-colors'

function conMarca(texto: string) {
  return texto.split(/(Farpi)/).map((trozo, i) =>
    trozo === 'Farpi' ? <span key={i} className="font-bold text-ink">Farpi</span> : trozo
  )
}

/** Importar las imágenes conserva la huella de contenido al regenerarlas. */
function Captura({ imagen, alt, sizes, className, principal = false }: {
  imagen: StaticImageData
  alt: string
  sizes: string
  className: string
  principal?: boolean
}) {
  return (
    <div className={`flex-shrink-0 overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[0_24px_64px_-28px_rgba(37,37,37,0.3)] ${className}`}>
      <Image src={imagen} sizes={sizes} quality={90} alt={alt}
        loading={principal ? 'eager' : 'lazy'} fetchPriority={principal ? 'high' : 'auto'}
        className="block h-auto w-full" />
    </div>
  )
}

/** Primero el producto; después el registro, la historia personal y las dudas. */
export function LandingPage({ textos: t = PORTADA_ES }: { textos?: TextosPortada }) {
  const tramo = getDayPeriodEnMadrid()

  return (
    <div lang={t.idioma} className={`${fraunces.variable} min-h-dvh bg-canvas text-ink`}>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex min-h-11 items-center gap-2.5" aria-label={t.irAlInicio}>
            <Image src="/app-icon.svg" width={32} height={32} alt="" aria-hidden className="h-8 w-8 rounded-xl shadow-sm" />
            <span className="text-base font-black tracking-tight">Farpi</span>
          </Link>
          <Link href="/auth/login" className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-primary-strong hover:text-primary-deep">
            {t.acciones.entrar}
          </Link>
        </div>
      </header>

      <main>
        <section aria-labelledby="presentacion" className="mx-auto grid max-w-6xl gap-8 px-5 pt-8 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center lg:gap-16 lg:pt-12 lg:pb-14">
          <div>
            <h1 id="presentacion" className={`${SERIF} max-w-2xl text-[2.75rem] font-medium leading-[1.04] tracking-[-0.025em] sm:text-6xl lg:text-[4.75rem]`}>
              {t.titular}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted lg:mt-6 lg:text-xl">{t.entradilla}</p>
            <div className="mt-6 flex flex-wrap gap-3 lg:mt-8">
              <a href="#entrar" className={`${BOTON} bg-primary-strong text-white hover:bg-primary-deep`}>
                {t.acciones.crear}<ArrowRight size={17} aria-hidden />
              </a>
              <a href="#asi-se-ve" className={`${BOTON} border border-line bg-white hover:bg-surface`}>
                {t.acciones.ver}<ArrowDown size={16} aria-hidden />
              </a>
            </div>
            <Garantias className="mt-5" />
            {PLAY_STORE_PUBLICADA && (
              <a href={PLAY_STORE_URL} rel="noopener" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-strong hover:text-primary-deep">
                <Smartphone size={17} aria-hidden />{t.disponiblePlay}
              </a>
            )}
          </div>
          <figure className="m-0 flex flex-col items-center gap-4 rounded-[2.5rem] bg-warm px-5 pt-5 pb-4 lg:pt-6">
            <Captura imagen={capturaInicio} alt={t.capturas.inicio.alt} sizes="(min-width: 640px) 600px, 480px" className="w-[232px] sm:w-[280px] lg:w-[292px]" principal />
            <figcaption className="max-w-xs text-center text-xs leading-relaxed text-muted">{t.capturas.entradilla}</figcaption>
          </figure>
        </section>

        <section id="asi-se-ve" aria-labelledby="titulo-capturas" className="mx-auto max-w-6xl scroll-mt-6 px-5 pt-6 pb-12 sm:px-8 lg:pt-8 lg:pb-20">
          <h2 id="titulo-capturas" className={TITULO}>{t.capturas.titulo}</h2>
          <ul className="mt-6 grid gap-5 lg:mt-8 lg:grid-cols-3 lg:gap-8">
            {t.capturas.inicio.notas.map(({ titulo, texto }) => (
              <li key={titulo} className="border-t border-line pt-4">
                <h3 className="text-base font-extrabold lg:text-lg">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted lg:text-base">{texto}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 grid gap-10 lg:mt-12 lg:grid-cols-2 lg:gap-10">
            {([['listas', capturaListas], ['calendario', capturaCalendario]] as const).map(([clave, imagen]) => {
              const { titulo, texto, alt } = t.capturas[clave]
              return (
                <article key={clave} className="flex flex-col items-center gap-5 rounded-[2rem] border border-line bg-white px-5 pt-6 pb-5 sm:flex-row sm:items-center sm:gap-6 lg:flex-col lg:items-start xl:flex-row xl:items-center">
                  <Captura imagen={imagen} alt={alt} sizes="480px" className="w-[224px]" />
                  <div className="w-full min-w-0">
                    <h3 className="text-lg font-extrabold">{titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{texto}</p>
                  </div>
                </article>
              )
            })}
          </div>
          <p className="mt-7 max-w-3xl text-base leading-relaxed text-muted">{t.capturas.ademas}</p>
        </section>

        {/* Una sola instancia de AuthCard: no se duplican formularios ni IDs.
            El registro abre por defecto; el acceso habitual conserva /auth/login. */}
        <section id="entrar" aria-labelledby="titulo-registro" className="scroll-mt-6 border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_384px] lg:items-start lg:gap-24 lg:py-16">
            <div>
              <h2 id="titulo-registro" className={TITULO}>{t.registro.titulo}</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted lg:text-lg">{t.registro.texto}</p>
              <Garantias className="mt-5" />
              <Link href="/auth/login" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-strong hover:text-primary-deep">
                {t.acciones.entrar}<ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="w-full max-w-xl"><AuthCard modoInicial="signup" conGarantias={false} /></div>
          </div>
        </section>

        {/* El texto personal se conserva íntegro, después de enseñar la app. */}
        <section id="por-que" className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:py-20">
          <div className="grid gap-7 lg:grid-cols-2 lg:gap-20">
            <div>
              <DayIllustration period={tramo} className="h-16 w-16" />
              <h2 className={`${SERIF} mt-5 text-[2.125rem] font-normal leading-[1.12] tracking-[-0.02em] lg:text-[3rem]`}>{t.historia.frase}</h2>
              <p className="mt-4 text-sm font-bold text-muted">{t.historia.autor}</p>
            </div>
            <div className={`${SERIF} flex flex-col gap-4 text-lg leading-[1.7] lg:text-xl`}>
              {t.historia.parrafos.map(parrafo => <p key={parrafo}>{conMarca(parrafo)}</p>)}
              <p>
                {t.historia.sugerencias}{' '}
                <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong underline underline-offset-[3px] hover:text-primary-deep">{CONTACT}</a>.
              </p>
            </div>
          </div>
        </section>

        <section id="preguntas" className="mx-auto max-w-6xl px-5 pt-4 pb-12 sm:px-8 lg:pt-4 lg:pb-20">
          <h2 className={TITULO}>{t.preguntas.titulo}</h2>
          <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-x-20 lg:gap-y-8">
            {t.preguntas.lista.map(({ pregunta, respuesta }) => (
              <div key={pregunta} className="border-t border-line pt-5">
                <h3 className="text-lg font-extrabold">{pregunta}</h3>
                <p className="mt-2 text-base leading-relaxed text-muted">{conMarca(respuesta)}</p>
              </div>
            ))}
          </div>
          <a href="#entrar" className={`${BOTON} mt-8 bg-primary-strong text-white hover:bg-primary-deep`}>
            {t.acciones.crear}<ArrowRight size={17} aria-hidden />
          </a>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/app-icon.svg" width={24} height={24} alt="" aria-hidden className="h-6 w-6 rounded-lg" />
            <p className="text-sm font-semibold text-muted">{t.pie.autor}</p>
          </div>
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
