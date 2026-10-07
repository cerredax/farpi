'use client'

import { useRef, useState } from 'react'
import { Plus, ArrowLeft, ChevronDown, Pencil, Share2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/SearchField'
import { BotonMicrofono, ErrorDeDictado } from '@/components/ui/BotonMicrofono'
import { Suggestions } from '@/components/ui/Suggestions'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { selectListItemGroups, selectSuggestions } from '@/lib/selectors'
import { listaParaCompartir, normalizaParaBuscar } from '@/lib/text'
import { useIsClient } from '@/hooks/useIsClient'
import { useT } from '@/lib/i18n/contexto'
import type { List, ListItem } from '@/types'
import { ListItemRow } from './ListItemRow'
import { PropuestaDeItems, useDictarItems } from './useDictarItems'

interface ListDetailViewProps {
  list: List
  items: ListItem[]
  /** Lo que la familia ha apuntado alguna vez; de aquí salen las sugerencias. */
  historial: string[]
  onBack: () => void
  onToggle: (id: string) => void
  onQuantity: (id: string, quantity: number) => void
  onOpenEdit: () => void
  /** Todas las listas de la casa: lo dictado puede decir a cuál va («…a la ferretería»). */
  listas: List[]
  /** Apuntar algo desde la barra de abajo. `listaId` solo llega si al dictar se dijo otra lista. */
  onQuickAdd: (text: string, listaId?: string) => void
  onOpenEditItem: (item: ListItem) => void
}

/**
 * El título de un grupo de la lista, con lo que le toque a la derecha: la cuenta
 * de lo que falta, o el botón de plegar el catálogo.
 *
 * La cuenta solo va en los pendientes. Cuántas cosas faltan **ahora** es la
 * pregunta de la pantalla; el tamaño del catálogo no se cuenta a propósito, que
 * eso sería medir lo hecho.
 *
 * El botón va en esta misma fila y no debajo: suelto entre el título y las filas
 * quedaba flotando, y "LO DE SIEMPRE" con "Ocultar lo de siempre" debajo decía
 * dos veces lo mismo en dos renglones.
 */
function GrupoTitulo({ titulo, cuenta, accion }: { titulo: string; cuenta?: number; accion?: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-2 px-1 pt-1">
      <h2 className="min-w-0 truncate text-xs font-bold uppercase tracking-widest text-muted">{titulo}</h2>
      {cuenta !== undefined && cuenta > 0 && (
        <span className="flex-shrink-0 rounded-full bg-line px-2 py-0.5 text-xs font-bold text-muted">{cuenta}</span>
      )}
      {accion}
    </div>
  )
}

export function ListDetailView({
  list, items, historial, listas, onBack, onToggle, onQuantity, onOpenEdit, onQuickAdd, onOpenEditItem,
}: ListDetailViewProps) {
  const t = useT().listas.detalle
  const [busqueda, setBusqueda] = useState('')
  /** Lo que se está apuntando en la barra de abajo. */
  const [nuevo, setNuevo] = useState('')
  const campoNuevo = useRef<HTMLInputElement>(null)
  // Apuntar hablando: se enseña lo entendido y se guarda al confirmar. Sin lista
  // dicha cae en esta, que es la que se está mirando.
  const { dictado, propuesta, confirmar, descartar } = useDictarItems(listas, (nuevos, listaId) => {
    nuevos.forEach(text => onQuickAdd(text, listaId && listaId !== list.id ? listaId : undefined))
  })

  /**
   * Si el navegador sabe compartir. **Se pregunta en el cliente y por eso hay
   * estado**: en el servidor no hay `navigator`, y pintar el botón siempre para
   * que no haga nada en un portátil sería peor que no tenerlo.
   *
   * `navigator.share` está en los móviles, que es donde importa: quien va al
   * súper sin cuenta —el abuelo, el amigo que pasa por allí— recibe la lista en
   * su chat y no hay nada que instalar.
   */
  const enElNavegador = useIsClient()
  const sePuedeCompartir = enElNavegador && typeof navigator !== 'undefined' && !!navigator.share
  // Una lista es lo que falta. Lo demás —lo de siempre, lo que ya tenéis— es el
  // catálogo del que se tira para apuntar, y **arranca abierto**: entrar en una
  // lista es casi siempre ir a apuntar de ahí, y plegado costaba un toque de más
  // cada vez. Sigue plegándose a mano cuando estorba, pero el estado no se
  // guarda: cada vez que se abre la lista vuelve a estar abierto.

  const [verHechos, setVerHechos] = useState(true)

  const puedeBuscar = items.length >= MINIMO_PARA_BUSCAR
  const consulta = normalizaParaBuscar(busqueda.trim())
  const buscando = consulta.length > 0
  const visibles = buscando
    ? items.filter(item => normalizaParaBuscar(item.text).includes(consulta))
    : items

  const { pending, completed } = selectListItemGroups(visibles)

  /**
   * Manda lo que falta al chat que elija quien pulsa.
   *
   * Se comparte **la lista entera y no lo que quede del filtro**: por eso sale de
   * `items` y no de `visibles`. Buscar "leche" y mandar la lista con una sola
   * cosa dentro sería mandar otra lista.
   *
   * Sin `catch` que avise: cancelar el diálogo del sistema **rechaza la promesa**
   * igual que un fallo de verdad, así que un aviso de error saltaría cada vez que
   * alguien se arrepiente. No hay nada que se haya quedado a medias.
   */
  async function compartir() {
    const texto = listaParaCompartir(list.name, list.emoji, selectListItemGroups(items).pending)
    if (!texto) return
    try {
      await navigator.share({ title: list.name, text: texto })
    } catch {
      // Cancelado, o el navegador no ha querido. No hay nada que contar.
    }
  }

  // Lo que la familia suele apuntar y encaja con lo que se está escribiendo.
  // Vacío el campo, no se sugiere nada: el porqué está en la barra de abajo.
  const sugerencias = nuevo.trim() ? selectSuggestions(historial, nuevo) : []

  // Buscando se enseña todo: si lo único que coincide está en el catálogo,
  // esconderlo detrás del plegado sería contestar "no hay nada" a una búsqueda
  // que sí encontró algo.
  const hechosVisibles = verHechos || buscando

  // Los dos grupos van siempre bajo su título, que es lo que hacía falta: antes
  // los pendientes y el catálogo se sucedían sin nada que dijera dónde acababa
  // uno, y se distinguían solo por el fondo de la fila. Buscando, el grupo sin
  // coincidencias se calla en vez de decir "no falta nada": no es que no falte,
  // es que no ha aparecido en esta búsqueda.
  const verPendientes = pending.length > 0 || !buscando
  const verCatalogo = completed.length > 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onBack} aria-label={t.volver} className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:bg-surface transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <span className="text-xl">{list.emoji ?? '📋'}</span>
        <h1 className="flex-1 font-extrabold text-ink text-lg leading-tight truncate">{list.name}</h1>
        {/* Mandar lo que falta a un chat. Solo si hay algo que mandar: una
            lista al día no es un encargo. */}
        {sePuedeCompartir && pending.length > 0 && (
          <button
            onClick={compartir}
            aria-label={t.compartir(list.name)}
            className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-surface transition-colors flex-shrink-0"
          >
            <Share2 size={16} />
          </button>
        )}
        {/* Con nombre: es un lápiz a secas, y sin él un lector de pantalla
            anuncia un botón sin decir de qué. */}
        <button onClick={onOpenEdit} aria-label={t.editarLista(list.name)} className="w-11 h-11 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-surface transition-colors flex-shrink-0">
          <Pencil size={15} />
        </button>
      </div>

      {puedeBuscar && (
        <div className="px-4 pb-2">
          <SearchField
            value={busqueda}
            onChange={setBusqueda}
            placeholder={t.buscarEn(items.length)}
            ariaLabel={t.buscarAria}
          />
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {items.length === 0 ? (
          <EmptyState
            emoji="📝"
            title={t.vacia}
          />
        ) : visibles.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title={t.sinCoincidencias}
            description={t.ningunItem(busqueda.trim())}
          />
        ) : (
          <>
            {verPendientes && (
              <section className="space-y-2">
                <GrupoTitulo titulo={t.haceFaltaAhora} cuenta={pending.length} />
                {pending.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted">{t.noFaltaNada}</p>
                ) : (
                  pending.map(item => (
                    <ListItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => onToggle(item.id)}
                      onQuantity={q => onQuantity(item.id, q)}
                      onEdit={() => onOpenEditItem(item)}
                    />
                  ))
                )}
              </section>
            )}

            {verCatalogo && (
              <section className="space-y-2">
                <GrupoTitulo
                  titulo={t.loDeSiempre}
                  /* Buscando no se ofrece plegar: lo que coincide se enseña. */
                  accion={!buscando && (
                    <button
                      type="button"
                      onClick={() => setVerHechos(v => !v)}
                      aria-expanded={verHechos}
                      className="flex min-h-8 flex-shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold text-muted transition-colors hover:bg-surface hover:text-ink"
                    >
                      {verHechos ? t.ocultarLoDeSiempre : t.verLoDeSiempre}
                      <ChevronDown
                        size={14}
                        strokeWidth={2.6}
                        className={`transition-transform ${verHechos ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                />
                {hechosVisibles && completed.map(item => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => onToggle(item.id)}
                    onQuantity={q => onQuantity(item.id, q)}
                    onEdit={() => onOpenEditItem(item)}
                  />
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {/**
        * **Apuntar se hace aquí mismo, escribiendo** (14-09-2026).
        *
        * Hasta hoy era un botón que abría un sheet: tocar, esperar la persiana,
        * escribir, tocar "Añadir", esperar a que se cierre. Cinco pasos para una
        * palabra, y una compra no se apunta de una en una —se apunta abriendo la
        * nevera y cantando seis cosas seguidas—, así que había que repetirlos
        * seis veces. Ahora se escribe y se pulsa Intro, y el campo se queda
        * puesto y con el foco para la siguiente.
        *
        * Es el mismo camino de siempre, no uno nuevo: lo que apunta es
        * `handleCreateItem`, el que usaba el sheet. El sheet se queda para editar
        * un ítem, que es cuando sí hay más de un campo que tocar —el nombre,
        * moverlo a otra lista, borrarlo—, y sigue siendo el formulario de apuntar
        * **desde Inicio**, donde no hay una lista abierta delante.
        *
        * Las sugerencias del historial vienen con él: son la otra mitad del
        * ahorro —"leche" sale sola en cuanto se escribe "le"— y sin ellas este
        * atajo sería más rápido pero más tonto que el sheet. Solo mientras se
        * escribe: la barra vive pegada al borde de abajo, y cinco pastillas fijas
        * ahí le comen sitio a la lista sin que nadie las haya pedido.
        */}
      <form
        onSubmit={e => {
          e.preventDefault()
          const texto = nuevo.trim()
          if (!texto) return
          onQuickAdd(texto)
          setNuevo('')
          // El foco se va al botón al pulsarlo, y lo siguiente que se quiere
          // hacer es escribir otra cosa. Se devuelve a mano.
          campoNuevo.current?.focus()
        }}
        className="space-y-2 border-t border-hairline px-4 pb-6 pt-2"
      >
        <Suggestions values={sugerencias} onPick={setNuevo} label={t.coincidencias} />
        <PropuestaDeItems propuesta={propuesta} listas={listas} onConfirmar={confirmar} onDescartar={descartar} />
        <ErrorDeDictado dictado={dictado} />
        <div className="flex items-center gap-2">
          <input
            ref={campoNuevo}
            type="text"
            value={nuevo}
            onChange={e => setNuevo(e.target.value)}
            placeholder={t.apuntarAlgo}
            aria-label={t.apuntarAlgoEn(list.name)}
            // `required` y no un botón apagado: pulsar con el campo vacío tiene
            // que decir qué falta, y un botón gris no dice nada.
            required
            className="field-input flex-1"
          />
          <BotonMicrofono dictado={dictado} variante="icono" />
          <button
            type="submit"
            aria-label={t.apuntarEn(list.name)}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-strong text-white transition-colors hover:bg-primary-strong/90"
          >
            <Plus size={18} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  )
}
