'use client'

import { useMemo, useState } from 'react'
import { useStore } from '@/lib/store-context'
import {
  agrupaApuntesPorDia, agrupaApuntesPorMes, apuntesDelMes, buscaApuntes, conVariacion,
  cuentaDelMes, fijosDe, gastoAcumulado, mesDe, mesVecino, mesesNavegables,
  partidasOrdenadas, partidasQueSePasan, plantillaDelMes, repartoDeLoQueEntra,
  repartoDelMes, repartoPorPartida, resumenPartidas, ritmoHabitual, serieDeMeses,
  soloGastos, soloIngresos, sumaDe, sumaDeFijos,
  type FijoDelMes,
} from '@/lib/budgets'
import { agruparPresupuestos, titulosDePresupuestos } from '@/lib/quotes'
import { MINIMO_PARA_BUSCAR } from '@/lib/constants'
import { getLocalDateString } from '@/lib/date-utils'
import { centsToInput } from '@/lib/finanzas'
import type {
  Budget, BudgetDraft, Expense, ExpenseDraft, FixedEntry, FixedEntryDraft,
  FixedOverrideDraft, MovementKind, Quote, QuoteDraft,
} from '@/types'

export type PestañaFinanzas = 'mes' | 'resumen' | 'plantilla' | 'presupuestos'

/**
 * El estado de la pantalla de Finanzas: qué pestaña se mira, qué mes y qué sheet
 * está abierto.
 *
 * El mes vive **aquí y no en la URL**, al revés que las pestañas de Ajustes.
 * Allí la URL importaba porque el menú de la cuenta entraba directo a una
 * sección; aquí nadie enlaza a "las finanzas de julio", y una URL que cambia cada
 * vez que se toca una flecha llena el historial de pasos atrás que no llevan a
 * ninguna parte.
 */
export function useFinanzasState() {
  const {
    fixedEntries, fixedOverrides, budgets, expenses, quotes, monthPlans, members, kids,
    closeMonthNow, reopenMonth, emptyMonth,
    createFixedEntry, updateFixedEntry, deleteFixedEntry,
    setFixedOverride, clearFixedOverride,
    createBudget, updateBudget, deleteBudget,
    createExpense, updateExpense, deleteExpense,
    createQuote, updateQuote, deleteQuote, setQuoteStatus,
  } = useStore()

  const hoy = getLocalDateString(new Date())

  const [pestaña, setPestaña] = useState<PestañaFinanzas>('mes')
  const [mes, setMes] = useState(() => mesDe(hoy))
  /**
   * Si en un mes que aún no ha llegado se ha pedido ver la previsión. Cerrada al
   * entrar y **cerrada otra vez al cambiar de mes**: se abre para una pregunta
   * concreta —«¿cuadra octubre?»— y dejarla abierta haría que noviembre saliera
   * con cifras sin que nadie las hubiera pedido.
   */
  const [previsionAbierta, setPrevisionAbierta] = useState(false)
  /**
   * Lo que se está buscando. **No se borra al cambiar de mes ni de pestaña**, al
   * revés que la previsión: una búsqueda cruza los meses por definición, así que
   * no es de ninguno.
   */
  const [busqueda, setBusqueda] = useState('')

  const [fixedSheetOpen, setFixedSheetOpen] = useState(false)
  const [editingFixed, setEditingFixed] = useState<FixedEntry | null>(null)
  const [kindNuevoFijo, setKindNuevoFijo] = useState<MovementKind>('ingreso')
  /**
   * El fijo que se está ajustando **en el mes que se mira**, ya resuelto: lleva
   * el importe de ese mes y la referencia si difiere. Es una foto y no un id
   * porque el sheet necesita las dos cifras, y la de referencia no está en el mes
   * sino en la plantilla.
   */
  const [ajustando, setAjustando] = useState<FijoDelMes | null>(null)
  const [ajusteSheetOpen, setAjusteSheetOpen] = useState(false)
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  /**
   * Un apunte nuevo que nace con algo escrito: el que sale de aceptar un
   * presupuesto. Es lo único que rellena un apunte sin que nadie lo teclee, y por
   * eso es un estado aparte y no un `editingExpense` a medias: lo que hay aquí no
   * es un apunte que exista, es lo que se sabe de él.
   */
  const [apunteDeUnPresupuesto, setApunteDeUnPresupuesto] = useState<
    { quoteId: string; amount: string; description: string } | null
  >(null)
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [quoteSheetOpen, setQuoteSheetOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)

  const mesActual = mesDe(hoy)

  // Qué valía en el mes que se está mirando: la plantilla viva si no ha
  // terminado, la copia congelada si terminó. Todo lo de «El mes» cuelga de aquí,
  // y por eso se calcula una sola vez y no en cada selector.
  const plantilla = useMemo(
    () => plantillaDelMes(mes, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans, previsionAbierta),
    [mes, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans, previsionAbierta],
  )

  const resumen = useMemo(() => resumenPartidas(plantilla, expenses, mes), [plantilla, expenses, mes])
  const delMes = useMemo(() => apuntesDelMes(expenses, mes), [expenses, mes])
  const cuenta = useMemo(() => cuentaDelMes(plantilla, expenses, mes), [plantilla, expenses, mes])
  const ingresosFijos = useMemo(() => fijosDe(fixedEntries, 'ingreso'), [fixedEntries])
  const gastosFijos = useMemo(() => fijosDe(fixedEntries, 'gasto'), [fixedEntries])
  const partidasPlantilla = useMemo(() => partidasOrdenadas(budgets), [budgets])
  /**
   * «El día a día», por días. Setenta filas seguidas con la fecha en gris no se
   * leen: lo que se busca ahí es «¿qué se fue el sábado?», y eso se contesta con
   * un rótulo por día, no bajando renglón a renglón.
   */
  const porDias = useMemo(() => agrupaApuntesPorDia(delMes), [delMes])
  const totalPartidas = useMemo(
    () => budgets.reduce((total, b) => total + b.monthly_limit_cents, 0),
    [budgets],
  )
  const repartoPorPersona = useMemo(() => repartoDelMes(expenses, mes, members, kids), [expenses, mes, members, kids])
  // Seis meses **hasta hoy**, no hasta el mes que se esté mirando. La tendencia
  // es de la casa, no del mes: mirando junio, cortarla en junio escondía julio,
  // agosto y septiembre y dejaba una sola barra, que no es una tendencia.
  const serie = useMemo(
    () => serieDeMeses(mesActual, 6, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans, expenses),
    [mesActual, fixedEntries, fixedOverrides, budgets, monthPlans, expenses],
  )
  // El reparto del mes, con **cuánto ha cambiado cada trozo** frente al anterior.
  // El mes de al lado se resuelve con su propia plantilla —la que valía entonces—
  // porque compararse con los límites de hoy sería comparar dos cosas distintas.
  const reparto = useMemo(() => {
    const anterior = mesVecino(mes, -1)
    return conVariacion(
      repartoPorPartida(plantilla, expenses, mes),
      repartoPorPartida(
        plantillaDelMes(anterior, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans),
        expenses,
        anterior,
      ),
    )
  }, [plantilla, expenses, mes, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans])

  // Los tres datos de «Cómo vamos» que no salen de la serie ni del reparto.
  const acumulado = useMemo(() => gastoAcumulado(expenses, mes), [expenses, mes])
  const ritmo = useMemo(
    () => ritmoHabitual(monthPlans, expenses, mesActual),
    [monthPlans, expenses, mesActual],
  )
  const sePasan = useMemo(
    () => partidasQueSePasan(mesActual, 6, mesActual, fixedEntries, fixedOverrides, budgets, monthPlans, expenses),
    [mesActual, fixedEntries, fixedOverrides, budgets, monthPlans, expenses],
  )
  const entrada = useMemo(
    () => repartoDeLoQueEntra(plantilla, expenses, mes),
    [plantilla, expenses, mes],
  )
  const grupos = useMemo(() => agruparPresupuestos(quotes), [quotes])
  const titulos = useMemo(() => titulosDePresupuestos(quotes), [quotes])

  const copiaVacia = plantilla.origen === 'copia'
    && plantilla.fijos.length === 0
    && plantilla.partidas.length === 0

  // Los meses que ofrece el desplegable del selector. Las flechas no los miran:
  // ellas son «el de al lado» y llegan a donde haga falta, que es lo que deja que
  // esta lista pueda ser finita sin encerrar a nadie.
  const meses = useMemo(
    () => mesesNavegables(mesActual, monthPlans, expenses, mes),
    [mesActual, monthPlans, expenses, mes],
  )

  // ─── Buscar ────────────────────────────────────────────────────────────────
  //
  // Lo encontrado **manda sobre el mes**: mientras haya algo escrito, «El mes»
  // enseña los resultados y no la cuenta. Es lo mismo que hace Documentos con sus
  // categorías —«la búsqueda manda sobre el filtro»— y aquí el mes es el filtro:
  // encontrar los dos recibos del dentista no puede depender de en qué mes
  // estuvieras cuando se te ocurrió buscarlos.
  const buscando = busqueda.trim().length > 0
  const encontrados = useMemo(
    () => buscaApuntes(expenses, budgets, busqueda),
    [expenses, budgets, busqueda],
  )
  /** Agrupados por mes: lo primero que hace falta saber de un resultado es de cuándo es. */
  const porMeses = useMemo(() => agrupaApuntesPorMes(encontrados), [encontrados])
  /**
   * Y lo que suman, que es la mitad de la razón para buscar: «¿cuánto llevamos en
   * el dentista?» no se contesta con una lista, se contesta con una cifra.
   */
  const encontrado = useMemo(() => ({
    gastado: sumaDe(soloGastos(encontrados)),
    ingresado: sumaDe(soloIngresos(encontrados)),
  }), [encontrados])

  // Los sheets se remontan al cambiar de cosa editada, como en el resto de la
  // app: sin esto, editar un apunte justo después de otro deja los valores del
  // primero escritos en los campos.
  //
  // Cada clave lleva delante de qué sheet es, y no es adorno: **los cuatro
  // cuelgan del mismo padre**, así que el `create` pelado que usan las demás
  // pantallas —donde solo hay un sheet— daba dos hermanos con la misma clave y
  // React lo cantaba por consola. Lo pilló `runtime.spec.ts`, que tumba la suite
  // ante cualquier `console.error`.
  const fixedKey = editingFixed ? `fijo-${editingFixed.id}` : `fijo-nuevo-${kindNuevoFijo}`
  // El mes entra en la clave: el mismo fijo ajustado en septiembre y en octubre
  // son dos formularios distintos, y sin esto el segundo abriría con el importe
  // del primero escrito.
  const ajusteKey = ajustando ? `ajuste-${ajustando.fixedId}-${mes}` : 'ajuste-ninguno'
  // El que nace de un presupuesto lleva su id: abrir el de la caldera y luego el
  // del dentista son dos formularios distintos, y sin esto el segundo se abriría
  // con el importe del primero escrito.
  const expenseKey = editingExpense
    ? `apunte-${editingExpense.id}`
    : apunteDeUnPresupuesto
      ? `apunte-presupuesto-${apunteDeUnPresupuesto.quoteId}`
      : `apunte-nuevo-${mes}`
  const budgetKey = editingBudget ? `partida-${editingBudget.id}` : 'partida-nueva'
  const quoteKey = editingQuote ? `pedido-${editingQuote.id}` : 'pedido-nuevo'

  return {
    hoy, mes, mesActual, meses,
    /**
     * Ir a un mes, con las flechas o con la lista. **Cierra la previsión**: se pidió
     * para el mes que se estaba mirando, y dejarla abierta haría que el siguiente
     * saliera con cifras que nadie ha pedido.
     */
    elegirMes: (destino: string) => {
      setMes(destino)
      setPrevisionAbierta(false)
    },
    esMesActual: mes === mesActual,
    /**
     * Si el plan de este mes está congelado: sus partidas no se editan desde aquí
     * y no se ofrece crear ninguna, porque una partida es de la plantilla.
     *
     * **No tiene nada que ver con apuntar.** Lo que se congela es el plan —los
     * fijos y los límites—, no el día a día: el 2 de octubre te acuerdas de los
     * 40 € del 29 de septiembre y tienen que caber. Estuvieron sin caber unas
     * horas el 02-09-2026, por confundir las dos cosas.
     */
    planCongelado: plantilla.origen === 'copia',
    /**
     * Al revés: si las partidas que se están viendo son las **vivas** de la
     * plantilla. Solo entonces se ofrece crear una o tocar la que hay.
     *
     * No es `!planCongelado` (03-09-2026): un mes pasado que nunca llegó a
     * cerrarse no tiene copia, así que no estaba «congelado», y sin embargo
     * seguía enseñando «+ Nueva partida». Crear una desde ahí no le pone nada a
     * ese mes —la partida nace en la plantilla de hoy— y deja al que la pulsa
     * creyendo que ha arreglado julio. Un mes por venir sí cuenta: lo que enseña
     * con la previsión abierta es la plantilla de hoy tal cual.
     */
    planVivo: plantilla.origen === 'plantilla' || plantilla.origen === 'por-venir',
    /**
     * Si el mes que se mira aún no ha empezado. Sale en cero **mientras no tenga
     * nada dentro**, y sí se puede apuntar (04-09-2026).
     *
     * Hasta ese día no se podía: «un gasto con fecha de octubre no es un gasto, es
     * un recordatorio, y para eso están las tareas». La regla se cayó con el caso
     * que no cubría, que es el normal: sabes que en octubre llega el IBI y lo que
     * quieres es ver si octubre cuadra **contándolo**. Una tarea no suma en la
     * cuenta del mes, así que no contestaba la pregunta. Además la puerta ya estaba
     * abierta y solo escondida: el campo de fecha del apunte no tiene tope, así que
     * bastaba con editar la fecha desde septiembre.
     *
     * Lo que sigue sin poderse en un mes por venir es **cerrarlo**: no ha pasado.
     */
    esPorVenir: plantilla.origen === 'por-venir',
    previsionAbierta,
    alternarPrevision: () => setPrevisionAbierta(v => !v),
    /**
     * Se puede cerrar a mano lo que aún no está cerrado y ya ha empezado, que
     * desde que existe `por-venir` es exactamente lo que dice `origen`: un mes
     * sin copia y que no está en el futuro solo puede ser el de hoy.
     */
    sePuedeCerrarYa: plantilla.origen === 'plantilla',
    /** Y deshacerlo, mientras el mes siga siendo el de hoy. */
    sePuedeReabrir: plantilla.origen === 'copia' && mes === mesActual,
    /**
     * Un mes pasado con algo guardado se puede **poner a cero** (03-09-2026): es
     * la salida para un mes que se cerró de oficio con una plantilla que entonces
     * no existía —agosto, con unas nóminas creadas el 1 de septiembre—. Si ya
     * está vacío no se ofrece: no hay nada que quitar.
     */
    sePuedePonerACero: plantilla.origen === 'copia' && mes < mesActual && !copiaVacia,
    /**
     * Un mes cerrado del que no se guardó nada. Puede ser porque se puso a cero o
     * porque cuando terminó no había plantilla que copiar; para quien lo mira es
     * lo mismo —de ese mes no hay cuenta— y la tarjeta lo dice así.
     */
    copiaVacia,
    cerrarMesYa: () => closeMonthNow(mes),
    reabrirMes: () => reopenMonth(mes),
    ponerMesACero: () => emptyMonth(mes),
    plantilla,

    pestaña, setPestaña,

    budgets, members, kids,
    resumen, delMes, porDias, cuenta, grupos, titulos,
    /**
     * El buscador aparece a partir de tres apuntes, como en Listas y en
     * Documentos: esconder una herramienta hasta que hace falta solo funciona si
     * quien la usa sabe que existe.
     */
    puedeBuscar: expenses.length >= MINIMO_PARA_BUSCAR,
    /** Cuántos hay en total, para el «Buscar en 128 apuntes…» del campo. */
    totalApuntes: expenses.length,
    busqueda, setBusqueda, buscando, encontrados, porMeses, encontrado,
    repartoPorPersona, serie, reparto, acumulado, ritmo, sePasan, entrada,
    /** Qué día es hoy, para saber hasta dónde llega la línea del ritmo. */
    diaDeHoy: Number(hoy.slice(8, 10)),
    ingresosFijos, gastosFijos, partidasPlantilla, totalPartidas,
    totalIngresosFijos: sumaDeFijos(fixedEntries, 'ingreso'),
    totalGastosFijos: sumaDeFijos(fixedEntries, 'gasto'),

    fixedSheetOpen, setFixedSheetOpen, editingFixed, kindNuevoFijo, fixedKey,
    ajusteSheetOpen, setAjusteSheetOpen, ajustando, ajusteKey,
    expenseSheetOpen, setExpenseSheetOpen, editingExpense, expenseKey, apunteDeUnPresupuesto,
    budgetSheetOpen, setBudgetSheetOpen, editingBudget, budgetKey,
    quoteSheetOpen, setQuoteSheetOpen, editingQuote, quoteKey,

    abrirFijoNuevo(kind: MovementKind) {
      setEditingFixed(null)
      setKindNuevoFijo(kind)
      setFixedSheetOpen(true)
    },
    abrirFijo(fijo: FixedEntry) {
      setEditingFixed(fijo)
      setFixedSheetOpen(true)
    },
    /**
     * Tocar un fijo en el desglose de «El mes» **ajusta ese mes**, no la
     * referencia (05-09-2026).
     *
     * Del 04 al 05-09 abría el fijo entero, y estaba mal: la limpieza son 120 € al
     * mes y en septiembre fueron 150, así que corregir el mes desde aquí subía la
     * referencia a 150 y con ella todos los meses abiertos —la casa perdía el
     * «esto suele costar 120», que es justo el dato por el que se pone un fijo—.
     * Ahora el sheet corto pregunta por el mes y la referencia se sigue tocando en
     * «Lo fijo», a donde ese mismo sheet lleva de un toque.
     */
    abrirAjusteDelMes(fijo: FijoDelMes) {
      if (!fijo.fixedId) return
      setAjustando(fijo)
      setAjusteSheetOpen(true)
    },
    /**
     * Y de ahí a la referencia: el sheet del ajuste ofrece «Editar el fijo». La
     * línea solo lleva el id del fijo vivo, así que hay que ir a buscarlo; si no
     * está, no se abre nada, que es la misma cautela que `abrirPartidaPorId`.
     */
    abrirFijoPorId(id: string) {
      const fijo = fixedEntries.find(f => f.id === id)
      if (!fijo) return
      setAjusteSheetOpen(false)
      setEditingFixed(fijo)
      setFixedSheetOpen(true)
    },
    abrirApunte(expense: Expense | null) {
      setEditingExpense(expense)
      setApunteDeUnPresupuesto(null)
      setExpenseSheetOpen(true)
    },
    /**
     * Apuntar el gasto de un presupuesto aceptado (14-09-2026).
     *
     * Era el único cabo suelto de la sección: aceptabas los 1.200 € de la caldera
     * y ahí se quedaban, marcados «Aceptado», sin aparecer en la cuenta de ningún
     * mes. Las dos mitades de Finanzas compartían pantalla y no se hablaban.
     *
     * Lo que viaja es **lo que consta**: el importe y para qué era. Ni la partida
     * —un presupuesto no sabe de qué partida sale— ni quién lo paga. Y no se crea
     * nada solo: esto abre el formulario de siempre con dos campos escritos, que
     * es un atajo y no un automatismo. Aceptar un presupuesto no es pagarlo.
     */
    abrirApunteDeUnPresupuesto(quote: Quote) {
      setEditingExpense(null)
      setApunteDeUnPresupuesto({
        quoteId: quote.id,
        amount: centsToInput(quote.amount_cents),
        description: quote.title.trim(),
      })
      setExpenseSheetOpen(true)
    },
    abrirPartida(budget: Budget | null) {
      setEditingBudget(budget)
      setBudgetSheetOpen(true)
    },
    /**
     * Editar una partida desde su barra en «El mes». La barra solo lleva el id
     * —lo demás lo tiene copiado, para poder pintar una partida ya borrada—, así
     * que hay que ir a buscar la viva. Si no está, no se abre nada.
     */
    abrirPartidaPorId(id: string) {
      const budget = budgets.find(b => b.id === id)
      if (!budget) return
      setEditingBudget(budget)
      setBudgetSheetOpen(true)
    },
    abrirPedido(quote: Quote | null) {
      setEditingQuote(quote)
      setQuoteSheetOpen(true)
    },

    guardarFijo(draft: FixedEntryDraft) {
      if (editingFixed) updateFixedEntry(editingFixed.id, draft)
      else createFixedEntry(draft)
    },
    /**
     * Guardar el ajuste del mes que se está mirando. Si lo tecleado coincide con
     * la referencia se guarda igual: `plantillaDelMes` ya se encarga de no
     * contarlo como ajuste, y borrarlo aquí en silencio haría que el sheet
     * volviera a abrirse sin lo que se acaba de escribir.
     */
    guardarAjuste(draft: FixedOverrideDraft) {
      if (!ajustando?.fixedId) return
      setFixedOverride(ajustando.fixedId, mes, draft)
    },
    /** Quitar el ajuste: ese mes vuelve a valer lo que diga la plantilla. */
    quitarAjuste() {
      if (!ajustando?.fixedId) return
      clearFixedOverride(ajustando.fixedId, mes)
    },
    guardarApunte(draft: ExpenseDraft) {
      if (editingExpense) updateExpense(editingExpense.id, draft)
      else createExpense(draft)
      // El que viene de un presupuesto se apunta desde otra pestaña, así que sin
      // esto se guarda y no se ve nada: ni la pestaña de «Presupuestos» lo enseña
      // ni tiene por qué caer en el mes que estuviera abierto. Se va a verlo donde
      // ha caído, que además es lo que contesta la pregunta por la que se apunta
      // —«¿cuadra el mes con esto dentro?»—.
      if (apunteDeUnPresupuesto) {
        setMes(mesDe(draft.date))
        setPrevisionAbierta(true)
        setPestaña('mes')
      }
    },
    guardarPartida(draft: BudgetDraft) {
      if (editingBudget) updateBudget(editingBudget.id, draft)
      else createBudget(draft)
    },
    guardarPedido(draft: QuoteDraft) {
      if (editingQuote) updateQuote(editingQuote.id, draft)
      else createQuote(draft)
    },

    deleteFixedEntry, deleteExpense, deleteBudget, deleteQuote, setQuoteStatus,
  }
}
