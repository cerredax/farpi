import { test, expect } from '@playwright/test'
import { initDraft } from '@/components/calendar/useEventSheet'
import { daysBetween, eventCoversDay, eventTitleOr, familyAbsenceEdges, familyAbsenceKind, isAbsence, isHoliday, isPersonAvailableOnDay, isPersonOffOnDay, isPlan, isRangeKind, isRestDay, isVacation, partirPlanesProximos, planYaPasado, siguientePlan, vacationEdges, vacationLength } from '@/lib/events'
import type { FamilyMember } from '@/types'
import { event } from './fixtures'

// Antes de las vacaciones, el calendario daba por hecho que un evento vivía en
// un solo día. Estas reglas son las que permiten que ocupe un tramo.

test.describe('eventCoversDay', () => {
  test('un evento de un día solo cubre ese día', () => {
    const e = event({ start_at: '2026-08-10T10:00:00' })
    expect(eventCoversDay(e, '2026-08-10')).toBe(true)
    expect(eventCoversDay(e, '2026-08-09')).toBe(false)
    expect(eventCoversDay(e, '2026-08-11')).toBe(false)
  })

  test('un evento con hora de fin sigue siendo de un solo día', () => {
    const e = event({ start_at: '2026-08-10T10:00:00', end_at: '2026-08-10T12:00:00' })
    expect(eventCoversDay(e, '2026-08-10')).toBe(true)
    expect(eventCoversDay(e, '2026-08-11')).toBe(false)
  })

  test('unas vacaciones cubren todos los días del rango, extremos incluidos', () => {
    const v = event({ kind: 'vacaciones', all_day: true, start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
    for (const d of ['2026-08-10', '2026-08-13', '2026-08-16']) {
      expect(eventCoversDay(v, d), d).toBe(true)
    }
    expect(eventCoversDay(v, '2026-08-09')).toBe(false)
    expect(eventCoversDay(v, '2026-08-17')).toBe(false)
  })

  test('acepta tanto Date como cadena', () => {
    const v = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
    expect(eventCoversDay(v, new Date(2026, 7, 13))).toBe(true)
    expect(eventCoversDay(v, new Date(2026, 7, 20))).toBe(false)
  })

  test('cruza el cambio de mes', () => {
    const v = event({ kind: 'vacaciones', start_at: '2026-08-28T00:00:00', end_at: '2026-09-04T23:59:00' })
    expect(eventCoversDay(v, '2026-08-31')).toBe(true)
    expect(eventCoversDay(v, '2026-09-01')).toBe(true)
  })
})

test('daysBetween cuenta los dos extremos y protege el rango inválido', () => {
  expect(daysBetween('2026-08-10', '2026-08-16')).toBe(7)
  expect(daysBetween('2026-08-10', '2026-08-10')).toBe(1)
  // Rango al revés o incompleto: cero, para que el formulario no muestre basura.
  expect(daysBetween('2026-08-16', '2026-08-10')).toBe(0)
  expect(daysBetween('2026-08-10', '')).toBe(0)
  expect(daysBetween('', '2026-08-16')).toBe(0)
})

test('vacationLength cuenta el primer y el último día', () => {
  const v = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
  expect(vacationLength(v)).toBe(7)
  const uno = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-10T23:59:00' })
  expect(vacationLength(uno)).toBe(1)
})

test('vacationEdges distingue el primer y el último día del tramo', () => {
  const v = event({ kind: 'vacaciones', start_at: '2026-08-10T00:00:00', end_at: '2026-08-16T23:59:00' })
  expect(vacationEdges(v, '2026-08-10')).toEqual({ primero: true, ultimo: false })
  expect(vacationEdges(v, '2026-08-13')).toEqual({ primero: false, ultimo: false })
  expect(vacationEdges(v, '2026-08-16')).toEqual({ primero: false, ultimo: true })
})

test('isVacation distingue el tipo', () => {
  expect(isVacation(event({ kind: 'vacaciones' }))).toBe(true)
  expect(isVacation(event())).toBe(false)
})

test('un descanso cubre todos los días del rango y se reconoce por tipo', () => {
  const descanso = event({ kind: 'descanso', all_day: true, start_at: '2026-08-10T00:00:00', end_at: '2026-08-12T23:59:00' })
  expect(isRestDay(descanso)).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-10')).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-11')).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-12')).toBe(true)
  expect(eventCoversDay(descanso, '2026-08-13')).toBe(false)
})

test('la disponibilidad dice si puedes contar con una persona ese día', () => {
  const descanso = event({
    kind: 'descanso',
    member_id: 'm1',
    child_id: null,
    start_at: '2026-08-10T00:00:00',
    end_at: '2026-08-12T23:59:00',
  })

  expect(isPersonOffOnDay([descanso], { child_id: null, member_id: 'm1' }, '2026-08-11')).toBe(true)
  expect(isPersonAvailableOnDay([descanso], { child_id: null, member_id: 'm1' }, '2026-08-13')).toBe(true)
  expect(isPersonAvailableOnDay([descanso], { child_id: null, member_id: 'm2' }, '2026-08-11')).toBe(true)
})

// El formulario no pide título en vacaciones ni en descansos, pero `title` no es
// nullable en la base y la franja del calendario lo enseña.
// Vacaciones y descansos son lo mismo para el calendario: quién no está. De ahí
// que compartan el tinte del día y el bloque de "Vacaciones y descansos".

test.describe('isAbsence', () => {
  test('vacaciones y descansos cuentan; un plan no', () => {
    expect(isAbsence(event({ kind: 'vacaciones' }))).toBe(true)
    expect(isAbsence(event({ kind: 'descanso' }))).toBe(true)
    expect(isAbsence(event({ kind: 'evento' }))).toBe(false)
  })
})

test.describe('eventTitleOr', () => {
  test('pone el nombre del tipo cuando no hay título', () => {
    expect(eventTitleOr('vacaciones', '')).toBe('Vacaciones')
    expect(eventTitleOr('descanso', '   ')).toBe('Descanso')
  })

  test('respeta el título que se haya escrito', () => {
    expect(eventTitleOr('vacaciones', 'Playa con los abuelos')).toBe('Playa con los abuelos')
    expect(eventTitleOr('descanso', 'Turno de noche')).toBe('Turno de noche')
  })

  test('recorta los espacios de los lados', () => {
    expect(eventTitleOr('vacaciones', '  Asturias  ')).toBe('Asturias')
  })

  // Un plan sí necesita nombre y el validador lo exige antes de llegar aquí:
  // esta función no se lo inventa.
  test('a un plan sin título no le pone nada', () => {
    expect(eventTitleOr('evento', '')).toBe('')
  })
})

// Un festivo es la cuarta cara de `kind`, y la que no es de nadie: dice que ese
// día no hay trabajo ni colegio, no quién falta. De ahí que se quede fuera de
// `isAbsence` —que responde "¿con quién no puedo contar?"— y dentro de
// `isRangeKind`, porque un puente son dos o tres días seguidos.
test('un festivo ocupa días completos pero no es una ausencia', () => {
  const festivo = event({ kind: 'festivo', all_day: true, start_at: '2026-12-06T00:00:00', end_at: '2026-12-08T23:59:00' })
  expect(isHoliday(festivo)).toBe(true)
  expect(isAbsence(festivo)).toBe(false)
  expect(isVacation(festivo)).toBe(false)
  expect(isRestDay(festivo)).toBe(false)
  expect(eventCoversDay(festivo, '2026-12-07')).toBe(true)
  expect(eventCoversDay(festivo, '2026-12-09')).toBe(false)
})

test('los tres tipos de rango piden día final; un plan no', () => {
  expect(isRangeKind('vacaciones')).toBe(true)
  expect(isRangeKind('descanso')).toBe(true)
  expect(isRangeKind('festivo')).toBe(true)
  expect(isRangeKind('evento')).toBe(false)
})

// Sin título escrito, cada tipo se guarda con el suyo. Un plan no: ahí el título
// es obligatorio y lo exige el validador.
test('un festivo sin título se guarda como "Festivo"', () => {
  expect(eventTitleOr('festivo', '   ')).toBe('Festivo')
  expect(eventTitleOr('festivo', 'Hispanidad')).toBe('Hispanidad')
  expect(eventTitleOr('evento', '   ')).toBe('')
})

// El borrador con el que abre el sheet al editar. Aquí vivió un fallo que la
// suite de navegador no podía ver: el mock guarda la hora de pared tal cual
// ("2026-08-17T00:00:00") y Supabase, que usa timestamptz, devuelve el instante
// en UTC ("2026-08-16T22:00:00+00:00"). Cortando la cadena por el día, lo primero
// funciona y lo segundo devuelve el día anterior en cualquier zona al este de
// Greenwich. Editar unas vacaciones del 17 abría el formulario en el 16.
test.describe('initDraft: la fecha de un evento guardado', () => {
  // Se construye el instante desde una fecha local, así la comprobación vale en
  // cualquier zona horaria y no solo en la de quien la escribió.
  function comoLoGuardaSupabase(anio: number, mes: number, dia: number): string {
    return new Date(anio, mes - 1, dia, 0, 0, 0).toISOString()
  }

  test('un evento de todo el día vuelve a su día, no al anterior', () => {
    const guardado = event({
      kind: 'vacaciones',
      all_day: true,
      start_at: comoLoGuardaSupabase(2026, 8, 17),
      end_at: comoLoGuardaSupabase(2026, 8, 21),
    })
    const draft = initDraft('edit', guardado, undefined)
    expect(draft.date).toBe('2026-08-17')
    expect(draft.end_date).toBe('2026-08-21')
  })

  test('un plan con hora también conserva su día', () => {
    const guardado = event({
      kind: 'evento',
      all_day: false,
      start_at: new Date(2026, 0, 1, 9, 30).toISOString(),
      end_at: null,
    })
    expect(initDraft('edit', guardado, undefined).date).toBe('2026-01-01')
  })
})

// Pulsar un hueco del eje de horas abre el formulario con esa hora puesta: el
// hueco ya dice cuál es y volver a pedirla era el paso que sobraba de crear algo
// desde la vista Día o Semana. Desde el resto de sitios —el `+` de la cabecera,
// la agenda, la rejilla del mes— no hay franja que leer y la hora sigue vacía.
test.describe('initDraft: la hora de la franja pulsada', () => {
  test('la franja pulsada llega al formulario como hora de inicio', () => {
    const draft = initDraft('create', null, new Date(2026, 7, 28), '17:00')
    expect(draft.date).toBe('2026-08-28')
    expect(draft.start_time).toBe('17:00')
    expect(draft.all_day).toBe(false)
    // La de fin se deja en blanco: la franja dice cuándo empieza, no cuánto dura.
    expect(draft.end_time).toBe('')
  })

  test('sin franja pulsada la hora se queda vacía', () => {
    expect(initDraft('create', null, new Date(2026, 7, 28)).start_time).toBe('')
  })
})

// `isPlan` es la regla única de "esto es un plan del día". Estuvo escrita de
// cuatro maneras por la app y dos de ellas solo apartaban las vacaciones, así
// que el descanso y el festivo se colaban en Inicio y en el aviso de las siete.
// Este test es el que hace que no puedan volver a separarse.
test.describe('isPlan', () => {
  test('un evento es un plan', () => {
    expect(isPlan(event({ kind: 'evento' }))).toBe(true)
  })

  test('lo que ocupa un rango no lo es: no dice qué hay que hacer hoy', () => {
    expect(isPlan(event({ kind: 'vacaciones' }))).toBe(false)
    expect(isPlan(event({ kind: 'descanso' }))).toBe(false)
    expect(isPlan(event({ kind: 'festivo' }))).toBe(false)
  })

  test('es exactamente lo contrario de `isRangeKind`, para que no se separen', () => {
    for (const kind of ['evento', 'vacaciones', 'descanso', 'festivo'] as const) {
      expect(isPlan(event({ kind }))).toBe(!isRangeKind(kind))
    }
  })
})

// Lo que permite que la tarjeta de Inicio distinga lo que ya pasó de lo que
// queda del día. Antes todo se leía igual a cualquier hora.
test.describe('planYaPasado', () => {
  const ahora = new Date('2026-08-10T15:00:00')

  test('lo de esta mañana ha pasado y lo de esta noche no', () => {
    expect(planYaPasado(event({ start_at: '2026-08-10T09:00:00' }), ahora)).toBe(true)
    expect(planYaPasado(event({ start_at: '2026-08-10T21:00:00' }), ahora)).toBe(false)
  })

  test('lo que está ocurriendo no ha pasado: manda la hora de fin', () => {
    const comida = event({ start_at: '2026-08-10T14:00:00', end_at: '2026-08-10T16:00:00' })
    expect(planYaPasado(comida, ahora)).toBe(false)
  })

  test('lo de todo el día nunca ha pasado: no tiene hora que comparar', () => {
    const e = event({ all_day: true, start_at: '2026-08-10T00:00:00' })
    expect(planYaPasado(e, ahora)).toBe(false)
  })
})

test.describe('siguientePlan', () => {
  const ahora = new Date('2026-08-10T15:00:00')

  test('el más cercano de los que quedan, venga como venga la lista', () => {
    const planes = [
      event({ title: 'cena',     start_at: '2026-08-10T21:00:00' }),
      event({ title: 'desayuno', start_at: '2026-08-10T09:00:00' }),
      event({ title: 'dentista', start_at: '2026-08-10T17:00:00' }),
    ]
    expect(siguientePlan(planes, ahora)?.title).toBe('dentista')
  })

  test('a última hora ya no queda ninguno, y eso también se dice', () => {
    const planes = [event({ start_at: '2026-08-10T09:00:00' })]
    expect(siguientePlan(planes, ahora)).toBeNull()
  })

  test('lo de todo el día no es el siguiente de nada', () => {
    const planes = [
      event({ title: 'huelga', all_day: true, start_at: '2026-08-10T00:00:00' }),
      event({ title: 'cena',   start_at: '2026-08-10T21:00:00' }),
    ]
    expect(siguientePlan(planes, ahora)?.title).toBe('cena')
  })

  test('sin planes, nada', () => {
    expect(siguientePlan([], ahora)).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cuando no queda nadie: la celda del mes deja de pintar una franja por persona
// y pinta una sola en el amarillo de la casa. Estas son las reglas que deciden
// cuándo, y son de las que más fácil se rompen al tocar la pantalla.
// ─────────────────────────────────────────────────────────────────────────────

function miembro(id: string): FamilyMember {
  return { id, family_id: 'f1', user_id: id, display_name: id, avatar_url: null, color: null, role: 'member', created_at: '' }
}

const DOS = [miembro('m1'), miembro('m2')]
const TRES = [...DOS, miembro('m3')]

function ausencia(member_id: string, desde: string, hasta: string, kind: 'vacaciones' | 'descanso' = 'vacaciones') {
  return event({ kind, all_day: true, member_id, start_at: `${desde}T00:00:00`, end_at: `${hasta}T23:59:00` })
}

test.describe('familyAbsenceKind', () => {
  test('con todos los adultos fuera por lo mismo, el día es de la familia', () => {
    const events = [ausencia('m1', '2026-08-10', '2026-08-14'), ausencia('m2', '2026-08-10', '2026-08-14')]
    expect(familyAbsenceKind(events, DOS, '2026-08-12')).toBe('vacaciones')
  })

  test('con uno solo fuera, no', () => {
    const events = [ausencia('m1', '2026-08-10', '2026-08-14')]
    expect(familyAbsenceKind(events, DOS, '2026-08-12')).toBeNull()
  })

  // El caso que motivó todo esto: con tres adultos la celda solo pinta dos
  // franjas, así que la tercera persona no se veía. Ahora es una sola.
  test('con tres adultos también, que es donde la celda se quedaba corta', () => {
    const events = TRES.map(m => ausencia(m.id, '2026-08-10', '2026-08-14'))
    expect(familyAbsenceKind(events, TRES, '2026-08-12')).toBe('vacaciones')
  })

  test('mezclar vacaciones y descanso no es una ausencia de la familia', () => {
    const events = [
      ausencia('m1', '2026-08-10', '2026-08-14', 'vacaciones'),
      ausencia('m2', '2026-08-10', '2026-08-14', 'descanso'),
    ]
    expect(familyAbsenceKind(events, DOS, '2026-08-12')).toBeNull()
  })

  test('un descanso de todos sí lo es, y se dice que es descanso', () => {
    const events = DOS.map(m => ausencia(m.id, '2026-08-12', '2026-08-12', 'descanso'))
    expect(familyAbsenceKind(events, DOS, '2026-08-12')).toBe('descanso')
  })

  // Con un solo adulto, "todos los adultos" es él: el amarillo diría "de la
  // casa" cuando sigue siendo de una persona.
  test('una familia de un solo adulto nunca tiene ausencia familiar', () => {
    const uno = [miembro('m1')]
    expect(familyAbsenceKind([ausencia('m1', '2026-08-10', '2026-08-14')], uno, '2026-08-12')).toBeNull()
  })

  // Los adultos sin cuenta y los hijos no entran en la cuenta: la regla mira
  // `members`, que es la lista de quien tiene acceso a la app.
  test('las vacaciones de un hijo no cuentan ni estorban', () => {
    const events = [
      ...DOS.map(m => ausencia(m.id, '2026-08-10', '2026-08-14')),
      event({ kind: 'vacaciones', all_day: true, child_id: 'c1', start_at: '2026-08-12T00:00:00', end_at: '2026-08-12T23:59:00' }),
    ]
    expect(familyAbsenceKind(events, DOS, '2026-08-12')).toBe('vacaciones')
  })

  test('fuera del solape de los dos tramos, no', () => {
    const events = [ausencia('m1', '2026-08-10', '2026-08-14'), ausencia('m2', '2026-08-12', '2026-08-20')]
    expect(familyAbsenceKind(events, DOS, '2026-08-11')).toBeNull()
    expect(familyAbsenceKind(events, DOS, '2026-08-13')).toBe('vacaciones')
    expect(familyAbsenceKind(events, DOS, '2026-08-15')).toBeNull()
  })
})

test.describe('familyAbsenceEdges', () => {
  // El tramo lo forman las vacaciones de varias personas, que empiezan y acaban
  // cada una por su lado: los extremos son los del solape, no los de un evento.
  test('redondea solo donde el solape empieza y acaba', () => {
    const events = [ausencia('m1', '2026-08-10', '2026-08-14'), ausencia('m2', '2026-08-12', '2026-08-20')]
    expect(familyAbsenceEdges(events, DOS, '2026-08-12')).toEqual({ primero: true, ultimo: false })
    expect(familyAbsenceEdges(events, DOS, '2026-08-13')).toEqual({ primero: false, ultimo: false })
    expect(familyAbsenceEdges(events, DOS, '2026-08-14')).toEqual({ primero: false, ultimo: true })
  })

  test('un solo día se cierra por los dos lados', () => {
    const events = DOS.map(m => ausencia(m.id, '2026-08-12', '2026-08-12'))
    expect(familyAbsenceEdges(events, DOS, '2026-08-12')).toEqual({ primero: true, ultimo: true })
  })

  // La razón por la que los huecos de fuera de mes también colapsan: si el 31 y
  // el 1 son los dos de la casa, el tramo no se puede partir en la frontera.
  test('el tramo cruza el cambio de mes sin partirse', () => {
    const events = DOS.map(m => ausencia(m.id, '2026-08-28', '2026-09-04'))
    expect(familyAbsenceEdges(events, DOS, '2026-08-31')).toEqual({ primero: false, ultimo: false })
    expect(familyAbsenceEdges(events, DOS, '2026-09-01')).toEqual({ primero: false, ultimo: false })
  })
})

// Inicio parte lo que viene en tres cajas: mañana, lo que queda de semana y la
// que viene. Los cortes son por día natural y por domingo, no por horas.
test.describe('partirPlanesProximos', () => {
  const HOY = new Date(2026, 8, 8, 18, 0) // martes 8 de septiembre de 2026, por la tarde

  test('mañana va sola, el resto de la semana aparte y el lunes ya es la semana que viene', () => {
    const { manana, proximos, proximaSemana } = partirPlanesProximos([
      event({ title: 'manana', start_at: '2026-09-09T09:00:00' }),
      event({ title: 'pasado', start_at: '2026-09-10T21:00:00' }),
      event({ title: 'domingo', start_at: '2026-09-13T09:00:00' }),
      event({ title: 'lunes', start_at: '2026-09-14T09:00:00' }),
    ], HOY)
    expect(manana.map(e => e.title)).toEqual(['manana'])
    expect(proximos.map(e => e.title)).toEqual(['pasado', 'domingo'])
    expect(proximaSemana.map(e => e.title)).toEqual(['lunes'])
  })

  test('un plan de mañana a última hora sigue siendo de mañana', () => {
    const { manana, proximos } = partirPlanesProximos(
      [event({ start_at: '2026-09-09T23:30:00' })], HOY,
    )
    expect(manana).toHaveLength(1)
    expect(proximos).toHaveLength(0)
  })

  test('el límite de mañana cruza el cambio de mes', () => {
    const finDeMes = new Date(2026, 8, 30, 10, 0) // miércoles 30 de septiembre
    const { manana, proximos, proximaSemana } = partirPlanesProximos([
      event({ title: 'uno-de-octubre', start_at: '2026-10-01T09:00:00' }),
      event({ title: 'dos-de-octubre', start_at: '2026-10-02T09:00:00' }),
      event({ title: 'cinco-de-octubre', start_at: '2026-10-05T09:00:00' }),
    ], finDeMes)
    expect(manana.map(e => e.title)).toEqual(['uno-de-octubre'])
    expect(proximos.map(e => e.title)).toEqual(['dos-de-octubre'])
    expect(proximaSemana.map(e => e.title)).toEqual(['cinco-de-octubre'])
  })

  // En sábado y en domingo no queda semana en medio: lo de pasado mañana ya es de
  // la que viene, que es como se dice en casa. La caja del medio no se pinta.
  test('un sábado, la caja del medio se queda vacía', () => {
    const sabado = new Date(2026, 8, 12, 10, 0)
    const { manana, proximos, proximaSemana } = partirPlanesProximos([
      event({ title: 'domingo', start_at: '2026-09-13T09:00:00' }),
      event({ title: 'lunes', start_at: '2026-09-14T09:00:00' }),
    ], sabado)
    expect(manana.map(e => e.title)).toEqual(['domingo'])
    expect(proximos).toEqual([])
    expect(proximaSemana.map(e => e.title)).toEqual(['lunes'])
  })

  // El domingo es el último día de la semana, así que mañana ya cae fuera. Manda
  // "mañana": el lunes no se lee como "la semana que viene" cuando es mañana.
  test('un domingo, mañana gana al calendario', () => {
    const domingo = new Date(2026, 8, 13, 10, 0)
    const { manana, proximos, proximaSemana } = partirPlanesProximos([
      event({ title: 'lunes', start_at: '2026-09-14T09:00:00' }),
      event({ title: 'martes', start_at: '2026-09-15T09:00:00' }),
    ], domingo)
    expect(manana.map(e => e.title)).toEqual(['lunes'])
    expect(proximos).toEqual([])
    expect(proximaSemana.map(e => e.title)).toEqual(['martes'])
  })

  test('una semana entera en mañana deja las otras dos cajas vacías', () => {
    const { manana, proximos, proximaSemana } = partirPlanesProximos([
      event({ start_at: '2026-09-09T09:00:00' }),
      event({ start_at: '2026-09-09T18:00:00' }),
    ], HOY)
    expect(manana).toHaveLength(2)
    expect(proximos).toEqual([])
    expect(proximaSemana).toEqual([])
  })
})
