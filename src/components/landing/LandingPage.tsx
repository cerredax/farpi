import Image from 'next/image'
import Link from 'next/link'
import { CalendarDays, FileText, ListChecks, NotebookText, UtensilsCrossed } from 'lucide-react'

const CONTACT = 'cerredax@gmail.com'

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

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Image
            src="/app-icon.svg"
            width={32}
            height={32}
            alt=""
            aria-hidden
            priority
            className="h-8 w-8 rounded-xl shadow-sm"
          />
          <p className="text-base font-black tracking-tight">Farpi</p>
        </div>
        <Link
          href="/auth/login"
          className="text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 sm:px-8">
        <section className="pt-6 pb-10 sm:pt-10">
          <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl">
            Qué tenemos que saber hoy en casa.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Farpi es un espacio privado para una familia: el calendario, las tareas, las listas,
            las comidas, las notas y los documentos importantes, todo junto y a un vistazo.
          </p>
        </section>

        <section className="border-t border-line py-10">
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

        <section className="border-t border-line py-10">
          <h2 className="text-lg font-bold">¿Echas algo en falta?</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Esto lo llevo yo solo y lo sigo mejorando poco a poco. Si se te ocurre algo que
            debería tener, o algo que no acaba de funcionar, escríbeme a{' '}
            <a href={`mailto:${CONTACT}`} className="font-semibold text-primary-strong hover:underline">
              {CONTACT}
            </a>.
          </p>
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
              tuve que cambiarlo. Al final se quedó en Farpi, uno de los apellidos de mi hija. Me
              gustó que llevara su nombre, porque en cierto modo nació con ella.
            </p>
            <p>
              Le he dedicado bastantes horas, así que cuando la terminé no tenía sentido
              guardármela para mí. Aquí está, para quien le sirva.
            </p>
            <p>
              Es gratuita, y me gustaría que lo siguiera siendo siempre. Si en algún momento la
              usa mucha gente, tendré que ver cómo sostener el coste de los servidores — eso ya lo
              iré resolviendo si llega el caso. De momento, disfrútala.
            </p>
          </div>
          <p className="mt-6 text-sm font-semibold text-ink">
            — Omar
            <span className="block font-normal text-muted">Septiembre de 2026</span>
          </p>
        </section>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-8 text-xs font-medium text-muted-soft">
          <Link href="/privacidad" className="hover:text-muted">Privacidad</Link>
          <Link href="/terminos" className="hover:text-muted">Términos</Link>
        </footer>
      </main>
    </div>
  )
}
