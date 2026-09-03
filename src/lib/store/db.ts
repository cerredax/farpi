import { ALL_MEAL_SLOTS } from '../meal-slots'
import type {
  Family, FamilyMember, FamilyInvite, Child, Event, Task,
  MealPlan, List, ListItem, Document, Note, Budget, Expense, FixedEntry, Quote,
  MonthPlan,
} from '@/types'

interface DB {
  families:  Family[]
  members:   FamilyMember[]
  invites:   FamilyInvite[]
  kids:      Child[]
  events:    Event[]
  tasks:     Task[]
  lists:     List[]
  listItems: ListItem[]
  mealPlans: MealPlan[]
  notes:     Note[]
  fixedEntries: FixedEntry[]
  budgets:   Budget[]
  expenses:  Expense[]
  quotes:    Quote[]
  monthPlans: MonthPlan[]
  documents: Document[]
}

export const db: DB = {
  families: [
    // La demo enseña las cinco franjas, comedor incluido: una familia nueva
    // arranca sin él (`DEFAULT_MEAL_SLOTS`), pero aquí hay una niña que come en
    // el colegio y la pantalla tiene que poder contarlo.
    { id: 'f1', name: 'Familia de Carlos, María y Cris', meal_slots: [...ALL_MEAL_SLOTS], created_at: '2026-06-01T00:00:00', updated_at: '2026-06-17T08:00:00' },
  ],

  members: [
    { id: 'm1', family_id: 'f1', user_id: 'u1', display_name: 'Carlos', avatar_url: null, color: null, role: 'admin',  created_at: '2026-06-01T00:00:00' },
    { id: 'm2', family_id: 'f1', user_id: 'u2', display_name: 'María', avatar_url: null, color: null, role: 'member', created_at: '2026-06-01T00:00:00' },
  ],

  invites: [],

  kids: [
    { id: '1', family_id: 'f1', name: 'Cris', birth_date: '2026-06-03', color: '#FBC4DC', kind: 'hijo', created_at: '2026-06-03T11:42:00' },
  ],

  events: [
    { id: 'e01', family_id: 'f1', child_id: '1', member_id: null,  title: 'Revisión de la caldera',         description: 'Mantenimiento anual, viene el técnico',       start_at: '2026-06-05T11:30:00', end_at: null, all_day: false, kind: 'evento' as const, color: null,      birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-04T18:00:00', updated_at: '2026-06-04T18:00:00' },
    { id: 'e02', family_id: 'f1', child_id: null, member_id: null, title: 'ITV del coche',                description: 'Llevar el permiso y el seguro',        start_at: '2026-06-08T09:15:00', end_at: null, all_day: false, kind: 'evento' as const, color: '#E9C46A', birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-05T13:00:00', updated_at: '2026-06-05T13:00:00' },
    { id: 'e03', family_id: 'f1', child_id: '1', member_id: null,  title: 'Dentista', description: 'Limpieza, la de todos los años',     start_at: '2026-06-10T12:00:00', end_at: null, all_day: false, kind: 'evento' as const, color: null,      birth_year: null, recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-07T09:00:00', updated_at: '2026-06-07T09:00:00' },
    { id: 'e04', family_id: 'f1', child_id: '1', member_id: null,  title: 'Pediatra de Cris',              description: 'Peso, ombligo y dudas de sueño',   start_at: '2026-06-17T10:30:00', end_at: null, all_day: false, kind: 'evento' as const, color: null,      birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-12T20:00:00', updated_at: '2026-06-12T20:00:00' },
    { id: 'e05', family_id: 'f1', child_id: null, member_id: null, title: 'Reunión de vecinos',            description: 'En el portal, lo del ascensor',               start_at: '2026-06-17T18:30:00', end_at: null, all_day: false, kind: 'evento' as const, color: '#8BA888', birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'e06', family_id: 'f1', child_id: null, member_id: null, title: 'Abuelos vienen a merendar',     description: 'Visita corta, traer bizcocho',     start_at: '2026-06-19T17:30:00', end_at: null, all_day: false, kind: 'evento' as const, color: '#D8A48F', birth_year: null, recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-15T11:00:00', updated_at: '2026-06-15T11:00:00' },
    { id: 'e07', family_id: 'f1', child_id: '1', member_id: null,  title: 'Cena con Marta y Javi',        description: 'En casa, traen ellos el postre',            start_at: '2026-06-20T09:30:00', end_at: null, all_day: false, kind: 'evento' as const, color: null,      birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-16T08:30:00', updated_at: '2026-06-16T08:30:00' },
    { id: 'e08', family_id: 'f1', child_id: null, member_id: null, title: 'Compra grande online',          description: 'La compra de la semana y cosas de casa', start_at: '2026-06-21T11:00:00', end_at: null, all_day: false, kind: 'evento' as const, color: '#E9C46A', birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-16T19:00:00', updated_at: '2026-06-16T19:00:00' },
    { id: 'e09', family_id: 'f1', child_id: '1', member_id: null,  title: 'Recoger el paquete',            description: 'En la oficina de correos, antes de las 14:00',       start_at: '2026-06-23T11:45:00', end_at: null, all_day: false, kind: 'evento' as const, color: null,      birth_year: null, recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'e10', family_id: 'f1', child_id: null, member_id: null, title: 'Renovar el seguro del coche',  description: 'Mirar si compensa cambiar de compañía',         start_at: '2026-06-25T09:00:00', end_at: null, all_day: false, kind: 'evento' as const, color: '#8BA888', birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-17T08:05:00', updated_at: '2026-06-17T08:05:00' },
    { id: 'e11', family_id: 'f1', child_id: '1', member_id: null,  title: 'Control de peso de Cris',              description: 'Consulta de enfermería pediátrica', start_at: '2026-06-30T10:15:00', end_at: null, all_day: false, kind: 'evento' as const, color: null,      birth_year: null, recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-17T08:10:00', updated_at: '2026-06-17T08:10:00' },
    { id: 'e13', family_id: 'f1', child_id: null, member_id: null, title: 'Cumpleaños de la abuela Marisa', description: 'Comemos en su casa',           start_at: '2026-06-22T00:00:00', end_at: null, all_day: true, kind: 'cumple' as const,   color: '#D8A48F', birth_year: 1958, recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-17T08:20:00', updated_at: '2026-06-17T08:20:00' },
    { id: 'e12', family_id: 'f1', child_id: null, member_id: null, title: 'Cumplemes de Cris',              description: 'Primer mes en casa',               start_at: '2026-07-03T00:00:00', end_at: null, all_day: true, kind: 'evento' as const,  color: '#D8A48F', birth_year: null, recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-17T08:15:00', updated_at: '2026-06-17T08:15:00' },
  ],

  tasks: [
    { id: 't1', family_id: 'f1', child_id: null, member_id: 'm2', title: 'Dar la vitamina a Cris',             notes: 'Después de la primera toma de la mañana',       priority: 'high',   due_date: '2026-06-17', recurrence: 'daily',  recurrence_end: null, completed: false, completed_at: null, completed_by: null,                  created_by: 'u2', created_at: '2026-06-16T08:00:00', updated_at: '2026-06-16T08:00:00' },
    { id: 't2', family_id: 'f1', child_id: null, member_id: 'm1', title: 'Escanear el contrato de la luz',   notes: 'Para tenerlo a mano cuando llamen'          , priority: 'high',   due_date: '2026-06-17', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null, completed_by: null,                  created_by: 'u1', created_at: '2026-06-16T09:00:00', updated_at: '2026-06-16T09:00:00' },
    { id: 't3', family_id: 'f1', child_id: null, member_id: 'm1', title: 'Llamar al seguro del coche',          notes: 'Preguntar por el descuento de renovación',                          priority: 'high',   due_date: '2026-06-18', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null, completed_by: null,                  created_by: 'u1', created_at: '2026-06-16T12:00:00', updated_at: '2026-06-16T12:00:00' },
    { id: 't4', family_id: 'f1', child_id: null, member_id: 'm2', title: 'Poner una lavadora',         notes: 'La de la ropa de color',                   priority: 'medium', due_date: '2026-06-18', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null, completed_by: null,                  created_by: 'u2', created_at: '2026-06-16T13:00:00', updated_at: '2026-06-16T13:00:00' },
    { id: 't5', family_id: 'f1', child_id: null, member_id: null, title: 'Sacar la basura',       notes: 'El amarillo y el marrón',               priority: 'medium', due_date: '2026-06-20', recurrence: 'weekly', recurrence_end: null, completed: false, completed_at: null, completed_by: null,                  created_by: 'u1', created_at: '2026-06-16T18:00:00', updated_at: '2026-06-16T18:00:00' },
    { id: 't6', family_id: 'f1', child_id: '1', member_id: null, title: 'Pedir cita en el dentista', notes: 'Para los dos, si puede ser el mismo día',    priority: 'medium', due_date: '2026-06-24', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null, completed_by: null,                  created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 't7', family_id: 'f1', child_id: null, member_id: 'm2', title: 'Enviar las fotos del finde a los abuelos', notes: null,                                            priority: 'low',    due_date: null,         recurrence: 'none',   recurrence_end: null, completed: true,  completed_at: '2026-06-15T19:30:00', completed_by: 'u2', created_by: 'u2', created_at: '2026-06-15T17:00:00', updated_at: '2026-06-15T19:30:00' },
    { id: 't8', family_id: 'f1', child_id: null, member_id: null, title: 'Cambiar las bombillas del pasillo',              notes: null,                                            priority: 'low',    due_date: null,         recurrence: 'none',   recurrence_end: null, completed: true,  completed_at: '2026-06-16T11:00:00', completed_by: 'u1', created_by: 'u1', created_at: '2026-06-15T10:00:00', updated_at: '2026-06-16T11:00:00' },
  ],

  lists: [
    { id: 'l1', family_id: 'f1', name: 'Compra',          emoji: '🛒', color: null, created_by: 'u1', created_at: '2026-06-05T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l2', family_id: 'f1', name: 'Farmacia',        emoji: '💊', color: null, created_by: 'u1', created_at: '2026-06-05T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l3', family_id: 'f1', name: 'Casa',            emoji: '🧺', color: null, created_by: 'u2', created_at: '2026-06-05T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l4', family_id: 'f1', name: 'Regalos',         emoji: '🎁', color: null, created_by: 'u1', created_at: '2026-06-08T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l5', family_id: 'f1', name: 'Limpieza',        emoji: '🧽', color: null, created_by: 'u2', created_at: '2026-06-09T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l6', family_id: 'f1', name: 'Bricolaje',       emoji: '🔧', color: null, created_by: 'u1', created_at: '2026-06-09T00:00:00', updated_at: '2026-06-17T08:00:00' },
  ],

  listItems: [
    { id: 'li1',  list_id: 'l1', family_id: 'f1', text: 'Fruta y verdura',              quantity: 2, completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li2',  list_id: 'l1', family_id: 'f1', text: 'Café y leche',                 quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u2', created_at: '2026-06-16T00:00:00' },
    { id: 'li3',  list_id: 'l1', family_id: 'f1', text: 'Detergente',                   quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 2, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li4',  list_id: 'l1', family_id: 'f1', text: 'Pan de molde',                 quantity: 1, completed: true,  completed_at: '2026-06-16T18:00:00', completed_by: 'u1', sort_order: 3, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li5',  list_id: 'l2', family_id: 'f1', text: 'Vitamina de Cris',             quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u2', created_at: '2026-06-16T00:00:00' },
    { id: 'li6',  list_id: 'l2', family_id: 'f1', text: 'Suero fisiológico monodosis',  quantity: 4, completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li7',  list_id: 'l2', family_id: 'f1', text: 'Gasas estériles',              quantity: 1, completed: true,  completed_at: '2026-06-15T12:00:00', completed_by: 'u1', sort_order: 2, created_by: 'u1', created_at: '2026-06-15T00:00:00' },
    { id: 'li8',  list_id: 'l3', family_id: 'f1', text: 'Bolsas de basura',             quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u2', created_at: '2026-06-16T00:00:00' },
    { id: 'li9',  list_id: 'l3', family_id: 'f1', text: 'Papel de cocina',              quantity: 2, completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li10', list_id: 'l3', family_id: 'f1', text: 'Pilas AA',                     quantity: 4, completed: true,  completed_at: '2026-06-17T07:30:00', completed_by: 'u1', sort_order: 2, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li11', list_id: 'l4', family_id: 'f1', text: 'Regalo del cumple de la abuela', quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li12', list_id: 'l4', family_id: 'f1', text: 'Papel de regalo',              quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li13', list_id: 'l4', family_id: 'f1', text: 'Velas de tarta',            quantity: 1, completed: true, completed_at: '2026-06-10T18:00:00', completed_by: 'u2', sort_order: 2, created_by: 'u2', created_at: '2026-06-09T00:00:00' },
    { id: 'li14', list_id: 'l5', family_id: 'f1', text: 'Recambios del aspirador',       quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u2', created_at: '2026-06-17T00:00:00' },
    { id: 'li15', list_id: 'l5', family_id: 'f1', text: 'Limpiacristales',              quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u2', created_at: '2026-06-17T00:00:00' },
    { id: 'li16', list_id: 'l5', family_id: 'f1', text: 'Bayetas de microfibra',        quantity: 1, completed: true,  completed_at: '2026-06-16T10:00:00', completed_by: 'u1', sort_order: 2, created_by: 'u1', created_at: '2026-06-15T00:00:00' },
    { id: 'li17', list_id: 'l6', family_id: 'f1', text: 'Tacos y tornillos',            quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li18', list_id: 'l6', family_id: 'f1', text: 'Silicona para el baño',        quantity: 1, completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li19', list_id: 'l6', family_id: 'f1', text: 'Bombillas del pasillo',        quantity: 4, completed: true,  completed_at: '2026-06-14T09:00:00', completed_by: 'u2', sort_order: 2, created_by: 'u2', created_at: '2026-06-13T00:00:00' },
  ],

  mealPlans: [
    { id: 'mp01', family_id: 'f1', date: '2026-06-16', slot: 'lunch',     name: 'Arroz con verduras',           second_course: null, dessert: null, notes: 'Dejar ración para mañana',      created_by: 'u1', created_at: '2026-06-15T21:00:00', updated_at: '2026-06-15T21:00:00' },
    { id: 'mp02', family_id: 'f1', date: '2026-06-16', slot: 'dinner',    name: 'Crema de calabacín',           second_course: null, dessert: null, notes: 'Algo rápido',                   created_by: 'u2', created_at: '2026-06-15T21:00:00', updated_at: '2026-06-15T21:00:00' },
    { id: 'mp03', family_id: 'f1', date: '2026-06-17', slot: 'breakfast', name: 'Tostadas y café',              second_course: null, dessert: null, notes: 'Turno corto antes del pediatra', created_by: 'u1', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp04', family_id: 'f1', date: '2026-06-17', slot: 'lunch',     name: 'Pollo al horno con patatas',   second_course: null, dessert: null, notes: 'Preparado por la abuela',       created_by: 'u2', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp05', family_id: 'f1', date: '2026-06-17', slot: 'dinner',    name: 'Tortilla francesa y sopa',     second_course: null, dessert: null, notes: null,                            created_by: 'u1', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp06', family_id: 'f1', date: '2026-06-18', slot: 'lunch',     name: 'Lentejas suaves',              second_course: null, dessert: null, notes: 'Congelar dos raciones',         created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp07', family_id: 'f1', date: '2026-06-18', slot: 'dinner',    name: 'Ensalada de tomate y atún',    second_course: null, dessert: null, notes: null,                            created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp08', family_id: 'f1', date: '2026-06-19', slot: 'lunch',     name: 'Pasta con pesto',              second_course: null, dessert: null, notes: 'Muy rápido',                    created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp09', family_id: 'f1', date: '2026-06-19', slot: 'dinner',    name: 'Sándwiches calientes',         second_course: null, dessert: null, notes: 'Noche tranquila',               created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp10', family_id: 'f1', date: '2026-06-20', slot: 'lunch',     name: 'Merluza con arroz',            second_course: null, dessert: null, notes: null,                            created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp11', family_id: 'f1', date: '2026-06-20', slot: 'dinner',    name: 'Gazpacho y empanada',          second_course: null, dessert: null, notes: 'Compra hecha',                  created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    // El comedor de Cris: los tres platos que trae el menú del colegio, y el
    // mismo día con comida en casa —mp04— para que se vea que son dos filas y
    // no una eligiendo entre dos sitios.
    { id: 'mp12', family_id: 'f1', date: '2026-06-17', slot: 'school',    name: 'Sopa de fideos',               second_course: 'Filete de pollo con ensalada', dessert: 'Fruta del tiempo', notes: null,                   created_by: 'u2', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp13', family_id: 'f1', date: '2026-06-18', slot: 'school',    name: 'Crema de calabaza',            second_course: 'Merluza al horno con arroz',    dessert: 'Yogur',            notes: 'Le toca turno pronto', created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp14', family_id: 'f1', date: '2026-06-19', slot: 'school',    name: 'Macarrones con tomate',        second_course: 'Tortilla de patata',            dessert: 'Fruta del tiempo', notes: null,                   created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
  ],

  notes: [
    { id: 'n1', family_id: 'f1', title: 'Wifi de casa', body: 'Red: FARPI_2G\nClave: casa-tranquila-2026', emoji: '📶', pinned: true,  created_by: 'u1', created_at: '2026-06-02T10:00:00', updated_at: '2026-06-02T10:00:00' },
    { id: 'n2', family_id: 'f1', title: 'Teléfonos útiles', body: 'Pediatra: 985 12 34 56\nCentro de salud: 985 65 43 21\nFarmacia de guardia: 985 11 22 33', emoji: '☎️', pinned: true, created_by: 'u2', created_at: '2026-06-04T09:00:00', updated_at: '2026-06-16T19:00:00' },
    { id: 'n3', family_id: 'f1', title: 'Medidas de casa', body: 'Colchón: 150 x 190. Ventana del salón: 140 de ancho. Filtro de la campana: 60.', emoji: '📏', pinned: false, created_by: 'u2', created_at: '2026-06-10T18:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'n4', family_id: 'f1', title: 'Contador de la luz', body: 'Está en el rellano, a la izquierda. La llave pequeña del llavero azul.', emoji: '💡', pinned: false, created_by: 'u1', created_at: '2026-06-12T20:00:00', updated_at: '2026-06-12T20:00:00' },
  ],

  // El dinero de la casa. Los importes van en céntimos, como en la base.
  //
  // La plantilla de una familia normal: dos nóminas y cuatro recibos. Está
  // sembrado porque la cuenta del mes —«para el mes 1.150 €»— no se entiende con
  // la pantalla vacía, y porque es lo primero que se ve al entrar en Finanzas.
  fixedEntries: [
    { id: 'fx1', family_id: 'f1', kind: 'ingreso' as const, name: 'Nómina de Carlos', emoji: '💼', amount_cents: 165000, child_id: null, member_id: 'm1',  sort_order: 0, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'fx2', family_id: 'f1', kind: 'ingreso' as const, name: 'Nómina de María',  emoji: '💼', amount_cents: 148000, child_id: null, member_id: 'm2',  sort_order: 1, created_by: 'u2', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'fx3', family_id: 'f1', kind: 'gasto'   as const, name: 'Alquiler',         emoji: '🏠', amount_cents: 78000,  child_id: null, member_id: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'fx4', family_id: 'f1', kind: 'gasto'   as const, name: 'Luz y gas',        emoji: '💡', amount_cents: 7400,   child_id: null, member_id: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'fx5', family_id: 'f1', kind: 'gasto'   as const, name: 'Internet y móvil', emoji: '📱', amount_cents: 4990,   child_id: null, member_id: null, sort_order: 2, created_by: 'u2', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'fx6', family_id: 'f1', kind: 'gasto'   as const, name: 'Seguro del coche', emoji: '🚗', amount_cents: 3200,   child_id: null, member_id: null, sort_order: 3, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
  ],

  budgets: [
    { id: 'b1', family_id: 'f1', name: 'Compra',     emoji: '🛒', monthly_limit_cents: 40000, sort_order: 0, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'b2', family_id: 'f1', name: 'Coche',       emoji: '🚗', monthly_limit_cents: 15000, sort_order: 1, created_by: 'u2', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    { id: 'b3', family_id: 'f1', name: 'Casa',       emoji: '🏠', monthly_limit_cents: 12000, sort_order: 2, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
  ],

  expenses: [
    { id: 'g1', family_id: 'f1', budget_id: 'b1', child_id: null, member_id: 'm1', kind: 'gasto' as const, amount_cents: 6240, date: '2026-06-16', description: 'Compra semanal',            created_by: 'u1', created_at: '2026-06-16T19:30:00', updated_at: '2026-06-16T19:30:00' },
    { id: 'g2', family_id: 'f1', budget_id: 'b1', child_id: null, member_id: 'm2', kind: 'gasto' as const, amount_cents: 1815, date: '2026-06-14', description: 'Fruta y verdura',           created_by: 'u2', created_at: '2026-06-14T11:00:00', updated_at: '2026-06-14T11:00:00' },
    { id: 'g3', family_id: 'f1', budget_id: 'b2', child_id: null, member_id: 'm1', kind: 'gasto' as const, amount_cents: 3450, date: '2026-06-15', description: 'Gasolina',       created_by: 'u1', created_at: '2026-06-15T18:00:00', updated_at: '2026-06-15T18:00:00' },
    { id: 'g4', family_id: 'f1', budget_id: 'b2', child_id: null, member_id: null, kind: 'gasto' as const, amount_cents: 2990, date: '2026-06-12', description: 'Taller: cambio de aceite',          created_by: 'u2', created_at: '2026-06-12T17:00:00', updated_at: '2026-06-12T17:00:00' },
    { id: 'g5', family_id: 'f1', budget_id: 'b3', child_id: null, member_id: 'm2', kind: 'gasto' as const, amount_cents: 8900, date: '2026-06-10', description: 'Estantería para el salón',   created_by: 'u2', created_at: '2026-06-10T12:00:00', updated_at: '2026-06-10T12:00:00' },
    { id: 'g6', family_id: 'f1', budget_id: 'b3', child_id: null, member_id: 'm1', kind: 'gasto' as const, amount_cents: 4520, date: '2026-06-17', description: 'Bombillas y pilas',         created_by: 'u1', created_at: '2026-06-17T09:00:00', updated_at: '2026-06-17T09:00:00' },
    // Sin partida: la farmacia no cae en ninguna y sale igual, bajo
    // "Sin partida". Es el caso que hay que poder ver en demo.
    { id: 'g7', family_id: 'f1', budget_id: null, child_id: null, member_id: 'm2', kind: 'gasto' as const, amount_cents: 1230, date: '2026-06-16', description: 'Farmacia',      created_by: 'u2', created_at: '2026-06-16T20:00:00', updated_at: '2026-06-16T20:00:00' },
    // Un ingreso apuntado, que no es la nómina: lo que entra de vez en cuando y
    // por eso no es un fijo. Nunca cuelga de una partida.
    { id: 'g8', family_id: 'f1', budget_id: null, child_id: null, member_id: 'm1', kind: 'ingreso' as const, amount_cents: 12000, date: '2026-06-13', description: 'Devolución de la compra online', created_by: 'u1', created_at: '2026-06-13T10:00:00', updated_at: '2026-06-13T10:00:00' },
  ],

  // Los meses ya cerrados, con la foto que tenían entonces.
  //
  // **Junio y julio llevan números distintos de los de hoy a propósito**: en junio
  // el alquiler eran 760 € y no había seguro del coche, y la partida de la compra
  // era de 350 y no de 400. Es lo único que enseña de verdad para qué sirve todo
  // esto — con las mismas cifras en todos los meses, un mes congelado y un mes
  // espejo se ven exactamente igual y no hay nada que entender.
  //
  // Agosto no está: lo cierra la propia app al arrancar (`closePreviousMonth`),
  // que es el camino normal y también conviene poder verlo funcionar.
  monthPlans: [
    {
      family_id: 'f1', month: '2026-06', closed_at: '2026-07-01T05:00:00',
      lines: [
        { id: 'mp1',  family_id: 'f1', month: '2026-06', line: 'ingreso' as const, budget_id: null, name: 'Nómina de Carlos', emoji: '💼', amount_cents: 165000, child_id: null, member_id: 'm1',  sort_order: 0, created_at: '2026-07-01T05:00:00' },
        { id: 'mp2',  family_id: 'f1', month: '2026-06', line: 'ingreso' as const, budget_id: null, name: 'Nómina de María',  emoji: '💼', amount_cents: 148000, child_id: null, member_id: 'm2',  sort_order: 1, created_at: '2026-07-01T05:00:00' },
        { id: 'mp3',  family_id: 'f1', month: '2026-06', line: 'gasto'   as const, budget_id: null, name: 'Alquiler',         emoji: '🏠', amount_cents: 76000,  child_id: null, member_id: null, sort_order: 0, created_at: '2026-07-01T05:00:00' },
        { id: 'mp4',  family_id: 'f1', month: '2026-06', line: 'gasto'   as const, budget_id: null, name: 'Luz y gas',        emoji: '💡', amount_cents: 6100,   child_id: null, member_id: null, sort_order: 1, created_at: '2026-07-01T05:00:00' },
        { id: 'mp5',  family_id: 'f1', month: '2026-06', line: 'gasto'   as const, budget_id: null, name: 'Internet y móvil', emoji: '📱', amount_cents: 4990,   child_id: null, member_id: null, sort_order: 2, created_at: '2026-07-01T05:00:00' },
        { id: 'mp6',  family_id: 'f1', month: '2026-06', line: 'partida' as const, budget_id: 'b1', name: 'Compra',           emoji: '🛒', amount_cents: 35000,  child_id: null, member_id: null, sort_order: 0, created_at: '2026-07-01T05:00:00' },
        { id: 'mp7',  family_id: 'f1', month: '2026-06', line: 'partida' as const, budget_id: 'b2', name: 'Coche',            emoji: '🚗', amount_cents: 15000,  child_id: null, member_id: null, sort_order: 1, created_at: '2026-07-01T05:00:00' },
        { id: 'mp8',  family_id: 'f1', month: '2026-06', line: 'partida' as const, budget_id: 'b3', name: 'Casa',             emoji: '🏠', amount_cents: 12000,  child_id: null, member_id: null, sort_order: 2, created_at: '2026-07-01T05:00:00' },
      ],
    },
    {
      family_id: 'f1', month: '2026-07', closed_at: '2026-08-01T05:00:00',
      lines: [
        { id: 'mp9',  family_id: 'f1', month: '2026-07', line: 'ingreso' as const, budget_id: null, name: 'Nómina de Carlos', emoji: '💼', amount_cents: 165000, child_id: null, member_id: 'm1',  sort_order: 0, created_at: '2026-08-01T05:00:00' },
        { id: 'mp10', family_id: 'f1', month: '2026-07', line: 'ingreso' as const, budget_id: null, name: 'Nómina de María',  emoji: '💼', amount_cents: 148000, child_id: null, member_id: 'm2',  sort_order: 1, created_at: '2026-08-01T05:00:00' },
        { id: 'mp11', family_id: 'f1', month: '2026-07', line: 'gasto'   as const, budget_id: null, name: 'Alquiler',         emoji: '🏠', amount_cents: 78000,  child_id: null, member_id: null, sort_order: 0, created_at: '2026-08-01T05:00:00' },
        { id: 'mp12', family_id: 'f1', month: '2026-07', line: 'gasto'   as const, budget_id: null, name: 'Luz y gas',        emoji: '💡', amount_cents: 9800,   child_id: null, member_id: null, sort_order: 1, created_at: '2026-08-01T05:00:00' },
        { id: 'mp13', family_id: 'f1', month: '2026-07', line: 'gasto'   as const, budget_id: null, name: 'Internet y móvil', emoji: '📱', amount_cents: 4990,   child_id: null, member_id: null, sort_order: 2, created_at: '2026-08-01T05:00:00' },
        { id: 'mp14', family_id: 'f1', month: '2026-07', line: 'partida' as const, budget_id: 'b1', name: 'Compra',           emoji: '🛒', amount_cents: 40000,  child_id: null, member_id: null, sort_order: 0, created_at: '2026-08-01T05:00:00' },
        { id: 'mp15', family_id: 'f1', month: '2026-07', line: 'partida' as const, budget_id: 'b2', name: 'Coche',            emoji: '🚗', amount_cents: 15000,  child_id: null, member_id: null, sort_order: 1, created_at: '2026-08-01T05:00:00' },
        { id: 'mp16', family_id: 'f1', month: '2026-07', line: 'partida' as const, budget_id: 'b3', name: 'Casa',             emoji: '🏠', amount_cents: 12000,  child_id: null, member_id: null, sort_order: 2, created_at: '2026-08-01T05:00:00' },
      ],
    },
  ],

  // Tres para lo mismo (la caldera) y uno ya aceptado: es justo la forma que
  // tiene que poder verse en la pantalla sin apuntar nada.
  quotes: [
    { id: 'p1', family_id: 'f1', title: 'Cambiar la caldera', provider: 'Fontanería López', amount_cents: 240000, status: 'pedido',    valid_until: '2026-09-15', notes: 'Incluye instalación y retirada de la vieja', created_by: 'u1', created_at: '2026-06-10T10:00:00', updated_at: '2026-06-10T10:00:00' },
    { id: 'p2', family_id: 'f1', title: 'Cambiar la caldera', provider: 'Clima Ruiz',       amount_cents: 215000, status: 'pedido',    valid_until: '2026-09-10', notes: null,                                        created_by: 'u1', created_at: '2026-06-11T10:00:00', updated_at: '2026-06-11T10:00:00' },
    { id: 'p3', family_id: 'f1', title: 'Cambiar la caldera', provider: 'Gas y Hogar',      amount_cents: 268000, status: 'descartado', valid_until: null,       notes: 'Tardaban un mes en venir',                   created_by: 'u2', created_at: '2026-06-12T10:00:00', updated_at: '2026-06-12T10:00:00' },
    { id: 'p4', family_id: 'f1', title: 'Pintar el salón',    provider: 'Pinturas Nieto',   amount_cents: 62000,  status: 'aceptado',  valid_until: null,        notes: 'Empiezan en septiembre',                     created_by: 'u1', created_at: '2026-06-05T10:00:00', updated_at: '2026-06-14T10:00:00' },
  ],

  documents: [
    { id: 'd1', family_id: 'f1', child_id: '1', member_id: null,  name: 'Informe del hospital',         description: 'Alta de Cris'                  , category: 'salud',    storage_path: 'mock/informe-hospital.pdf', storage_provider: 'google_drive', storage_owner: 'u1', mime_type: 'application/pdf', size_bytes: 358400, expires_on: null, created_by: 'u1', created_at: '2026-06-05T13:00:00', updated_at: '2026-06-05T13:00:00' },
    { id: 'd2', family_id: 'f1', child_id: '1', member_id: null,  name: 'Cartilla de salud de Cris',     description: 'Revisiones y vacunas',            category: 'salud',    storage_path: 'mock/cartilla-salud-cris.pdf', storage_provider: 'google_drive', storage_owner: 'u1',    mime_type: 'application/pdf', size_bytes: 245760, expires_on: null, created_by: 'u2', created_at: '2026-06-05T13:30:00', updated_at: '2026-06-05T13:30:00' },
    { id: 'd3', family_id: 'f1', child_id: null, member_id: null, name: 'Seguro del coche',              description: 'Póliza y recibo'    ,             category: 'vehiculo', storage_path: 'mock/seguro-coche.pdf', storage_provider: 'google_drive', storage_owner: 'u1',       mime_type: 'application/pdf', size_bytes: 286720, expires_on: null, created_by: 'u1', created_at: '2026-06-10T18:00:00', updated_at: '2026-06-10T18:00:00' },
    { id: 'd4', family_id: 'f1', child_id: null, member_id: null, name: 'Libro de familia',              description: null,                              category: 'personal', storage_path: 'mock/libro-familia.pdf', storage_provider: 'google_drive', storage_owner: 'u1',         mime_type: 'application/pdf', size_bytes: 512000, expires_on: null, created_by: 'u1', created_at: '2026-06-11T10:00:00', updated_at: '2026-06-11T10:00:00' },
    { id: 'd5', family_id: 'f1', child_id: null, member_id: null, name: 'DNI de Carlos',                 description: 'Caduca este verano',               category: 'personal', storage_path: 'mock/dni-carlos.jpg', storage_provider: 'google_drive', storage_owner: 'u1',              mime_type: 'image/jpeg',      size_bytes: 132096, expires_on: '2026-08-20', created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
    // Uno por carpeta nueva, para que la demo no las enseñe todas vacías: son
    // justo los papeles que antes caían en "Personal" u "Otros" por no tener
    // sitio. "Mascotas" se queda sin ejemplo a propósito, que esta familia no
    // tiene animales y un perro inventado no aclara nada.
    { id: 'd6', family_id: 'f1', child_id: null, member_id: null, name: 'Contrato de alquiler',          description: 'Firmado en 2024',                  category: 'vivienda', storage_path: 'mock/contrato-alquiler.pdf', storage_provider: 'google_drive', storage_owner: 'u1',  mime_type: 'application/pdf', size_bytes: 421888, expires_on: null, created_by: 'u1', created_at: '2026-06-12T09:00:00', updated_at: '2026-06-12T09:00:00' },
    { id: 'd7', family_id: 'f1', child_id: null, member_id: null, name: 'Seguro del hogar',              description: 'Póliza anual',                     category: 'seguros',  storage_path: 'mock/seguro-hogar.pdf', storage_provider: 'google_drive', storage_owner: 'u1',       mime_type: 'application/pdf', size_bytes: 199680, expires_on: '2027-01-31', created_by: 'u2', created_at: '2026-06-12T09:30:00', updated_at: '2026-06-12T09:30:00' },
    { id: 'd8', family_id: 'f1', child_id: null, member_id: 'm1', name: 'Nómina de mayo',                description: null,                               category: 'finanzas', storage_path: 'mock/nomina-mayo.pdf', storage_provider: 'google_drive', storage_owner: 'u1',        mime_type: 'application/pdf', size_bytes: 92160,  expires_on: null, created_by: 'u1', created_at: '2026-06-02T08:00:00', updated_at: '2026-06-02T08:00:00' },
    { id: 'd9', family_id: 'f1', child_id: null, member_id: null, name: 'Factura de la lavadora',        description: 'Garantía de tres años',            category: 'facturas', storage_path: 'mock/factura-lavadora.jpg', storage_provider: 'google_drive', storage_owner: 'u1',   mime_type: 'image/jpeg',      size_bytes: 148480, expires_on: '2028-03-04', created_by: 'u2', created_at: '2026-06-13T19:00:00', updated_at: '2026-06-13T19:00:00' },
    { id: 'd10', family_id: 'f1', child_id: null, member_id: 'm1', name: 'Tarjeta sanitaria europea',    description: null,                               category: 'viajes',   storage_path: 'mock/tse-carlos.jpg', storage_provider: 'google_drive', storage_owner: 'u1',         mime_type: 'image/jpeg',      size_bytes: 176128, expires_on: '2029-05-18', created_by: 'u1', created_at: '2026-06-14T11:00:00', updated_at: '2026-06-14T11:00:00' },
  ],
}
