import { CalendarDays, FileText, Heart, Home, ListChecks, ShieldCheck, Utensils } from 'lucide-react'

const benefits = [
  { icon: CalendarDays, title: 'Agenda', text: 'Citas, planes y recordatorios familiares.' },
  { icon: ListChecks, title: 'Pendientes', text: 'Tareas y listas compartidas sin ruido.' },
  { icon: Utensils, title: 'Comidas', text: 'Menús semanales y compras mejor ordenadas.' },
  { icon: FileText, title: 'Documentos', text: 'Papeles importantes siempre localizados.' },
]

const assurances = ['Gratis', 'Privado', 'Sin anuncios']

/** Columna de presentación del login: marca, propuesta de valor y ventajas. */
export function LoginHero() {
  return (
  <section className="flex min-h-[52dvh] flex-col justify-between px-6 py-7 sm:px-10 lg:min-h-dvh lg:px-14 lg:py-12 xl:px-20">
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-deepest text-white shadow-sm">
          <Home size={21} strokeWidth={2.4} />
        </div>
        <div>
          <p className="text-lg font-black leading-none tracking-tight">Nido</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Familia en calma</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        {assurances.map(item => (
          <span key={item} className="rounded-full border border-line bg-white/70 px-3 py-1 text-xs font-bold text-[#5C6854]">
            {item}
          </span>
        ))}
      </div>
    </header>

    <div className="py-12 lg:py-0">
      <div className="max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-line bg-primary-tint px-3 py-1.5 text-xs font-bold text-primary-deep">
          <Heart size={14} fill="currentColor" strokeWidth={2.2} />
          Un espacio privado para tu casa
        </div>
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
          Todo lo importante de tu familia, en un solo lugar.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Nido reúne comidas, tareas, citas y documentos para que la semana sea más clara y la casa se sienta un poco más ligera.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl border border-line bg-white/75 px-4 py-3 shadow-sm">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-strong">
                <Icon size={18} strokeWidth={2.25} />
              </span>
              <span>
                <span className="block text-sm font-black text-ink">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <footer className="hidden items-center gap-2 text-xs font-semibold text-muted lg:flex">
      <ShieldCheck size={15} strokeWidth={2.3} />
      Solo tu familia puede ver sus datos.
    </footer>
  </section>
  )
}
