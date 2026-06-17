import type {
  Family, FamilyMember, FamilyInvite, Child, Event, Task,
  MealPlan, List, ListItem, Document,
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
  documents: Document[]
}

export const db: DB = {
  families: [
    { id: 'f1', name: 'Familia de Omar, Sofía y Ana', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-17T08:00:00' },
  ],

  members: [
    { id: 'm1', family_id: 'f1', user_id: 'u1', display_name: 'Omar',  avatar_url: null, role: 'admin',  created_at: '2026-06-01T00:00:00' },
    { id: 'm2', family_id: 'f1', user_id: 'u2', display_name: 'Sofía', avatar_url: null, role: 'member', created_at: '2026-06-01T00:00:00' },
  ],

  invites: [],

  kids: [
    { id: '1', family_id: 'f1', name: 'Ana', birth_date: '2026-06-03', color: '#D8A48F', created_at: '2026-06-03T11:42:00' },
  ],

  events: [
    { id: 'e01', family_id: 'f1', child_id: '1',  title: 'Alta hospitalaria Ana',         description: 'Guardar informe y cartilla',       start_at: '2026-06-05T11:30:00', end_at: null, all_day: false, color: null,      recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-04T18:00:00', updated_at: '2026-06-04T18:00:00' },
    { id: 'e02', family_id: 'f1', child_id: null, title: 'Registro civil',                description: 'Inscripción de nacimiento',        start_at: '2026-06-08T09:15:00', end_at: null, all_day: false, color: '#E9C46A', recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-05T13:00:00', updated_at: '2026-06-05T13:00:00' },
    { id: 'e03', family_id: 'f1', child_id: '1',  title: 'Matrona: revisión Sofía y Ana', description: 'Centro de salud, consulta 4',     start_at: '2026-06-10T12:00:00', end_at: null, all_day: false, color: null,      recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-07T09:00:00', updated_at: '2026-06-07T09:00:00' },
    { id: 'e04', family_id: 'f1', child_id: '1',  title: 'Pediatra 14 días',              description: 'Peso, ombligo y dudas de sueño',   start_at: '2026-06-17T10:30:00', end_at: null, all_day: false, color: null,      recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-12T20:00:00', updated_at: '2026-06-12T20:00:00' },
    { id: 'e05', family_id: 'f1', child_id: null, title: 'Farmacia de guardia',           description: 'Recoger vitamina D',               start_at: '2026-06-17T18:30:00', end_at: null, all_day: false, color: '#8BA888', recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'e06', family_id: 'f1', child_id: null, title: 'Abuelos vienen a merendar',     description: 'Visita corta, traer bizcocho',     start_at: '2026-06-19T17:30:00', end_at: null, all_day: false, color: '#D8A48F', recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-15T11:00:00', updated_at: '2026-06-15T11:00:00' },
    { id: 'e07', family_id: 'f1', child_id: '1',  title: 'Paseo temprano con Ana',        description: 'Evitar horas de calor',            start_at: '2026-06-20T09:30:00', end_at: null, all_day: false, color: null,      recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-16T08:30:00', updated_at: '2026-06-16T08:30:00' },
    { id: 'e08', family_id: 'f1', child_id: null, title: 'Compra grande online',          description: 'Pañales, toallitas y comida casa', start_at: '2026-06-21T11:00:00', end_at: null, all_day: false, color: '#E9C46A', recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-16T19:00:00', updated_at: '2026-06-16T19:00:00' },
    { id: 'e09', family_id: 'f1', child_id: '1',  title: 'Revisión lactancia',            description: 'Llevar muselina y cartilla',       start_at: '2026-06-23T11:45:00', end_at: null, all_day: false, color: null,      recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'e10', family_id: 'f1', child_id: null, title: 'Pedir cita tarjeta sanitaria',  description: 'Trámite pendiente de Ana',         start_at: '2026-06-25T09:00:00', end_at: null, all_day: false, color: '#8BA888', recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-17T08:05:00', updated_at: '2026-06-17T08:05:00' },
    { id: 'e11', family_id: 'f1', child_id: '1',  title: 'Control peso Ana',              description: 'Consulta de enfermería pediátrica', start_at: '2026-06-30T10:15:00', end_at: null, all_day: false, color: null,      recurrence_group_id: null, created_by: 'u1', created_at: '2026-06-17T08:10:00', updated_at: '2026-06-17T08:10:00' },
    { id: 'e12', family_id: 'f1', child_id: null, title: 'Cumplemes de Ana',              description: 'Primer mes en casa',               start_at: '2026-07-03T00:00:00', end_at: null, all_day: true,  color: '#D8A48F', recurrence_group_id: null, created_by: 'u2', created_at: '2026-06-17T08:15:00', updated_at: '2026-06-17T08:15:00' },
  ],

  tasks: [
    { id: 't1', family_id: 'f1', title: 'Dar vitamina D a Ana',             notes: 'Después de la primera toma de la mañana',       priority: 'high',   due_date: '2026-06-17', recurrence: 'daily',  recurrence_end: null, completed: false, completed_at: null,                  created_by: 'u2', created_at: '2026-06-16T08:00:00', updated_at: '2026-06-16T08:00:00' },
    { id: 't2', family_id: 'f1', title: 'Subir informe de alta',            notes: 'Documento del hospital para tenerlo localizado', priority: 'high',   due_date: '2026-06-17', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-16T09:00:00', updated_at: '2026-06-16T09:00:00' },
    { id: 't3', family_id: 'f1', title: 'Comprar pañales talla 1',          notes: 'Quedan para dos días',                          priority: 'high',   due_date: '2026-06-18', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-16T12:00:00', updated_at: '2026-06-16T12:00:00' },
    { id: 't4', family_id: 'f1', title: 'Lavar muselinas y bodies',         notes: 'Programa corto, ropa de Ana',                   priority: 'medium', due_date: '2026-06-18', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null,                  created_by: 'u2', created_at: '2026-06-16T13:00:00', updated_at: '2026-06-16T13:00:00' },
    { id: 't5', family_id: 'f1', title: 'Preparar bolsa del carrito',       notes: 'Pañal, muselina, muda y chupete',               priority: 'medium', due_date: '2026-06-20', recurrence: 'weekly', recurrence_end: null, completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-16T18:00:00', updated_at: '2026-06-16T18:00:00' },
    { id: 't6', family_id: 'f1', title: 'Pedir cita tarjeta sanitaria Ana', notes: 'Confirmar si hace falta certificado literal',    priority: 'medium', due_date: '2026-06-24', recurrence: 'none',   recurrence_end: null, completed: false, completed_at: null,                  created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 't7', family_id: 'f1', title: 'Enviar foto de Ana a los abuelos', notes: null,                                            priority: 'low',    due_date: null,         recurrence: 'none',   recurrence_end: null, completed: true,  completed_at: '2026-06-15T19:30:00', created_by: 'u2', created_at: '2026-06-15T17:00:00', updated_at: '2026-06-15T19:30:00' },
    { id: 't8', family_id: 'f1', title: 'Comprar empapadores',              notes: null,                                            priority: 'low',    due_date: null,         recurrence: 'none',   recurrence_end: null, completed: true,  completed_at: '2026-06-16T11:00:00', created_by: 'u1', created_at: '2026-06-15T10:00:00', updated_at: '2026-06-16T11:00:00' },
  ],

  lists: [
    { id: 'l1', family_id: 'f1', name: 'Compra bebé',     emoji: '🍼', color: null, created_by: 'u1', created_at: '2026-06-05T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l2', family_id: 'f1', name: 'Farmacia',        emoji: '💊', color: null, created_by: 'u1', created_at: '2026-06-05T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l3', family_id: 'f1', name: 'Casa',            emoji: '🏠', color: null, created_by: 'u2', created_at: '2026-06-05T00:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'l4', family_id: 'f1', name: 'Trámites de Ana', emoji: '📄', color: null, created_by: 'u1', created_at: '2026-06-08T00:00:00', updated_at: '2026-06-17T08:00:00' },
  ],

  listItems: [
    { id: 'li1',  list_id: 'l1', family_id: 'f1', text: 'Pañales talla 1',              completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li2',  list_id: 'l1', family_id: 'f1', text: 'Toallitas sin perfume',        completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u2', created_at: '2026-06-16T00:00:00' },
    { id: 'li3',  list_id: 'l1', family_id: 'f1', text: 'Bolsas para pañales',          completed: false, completed_at: null,                  completed_by: null, sort_order: 2, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li4',  list_id: 'l1', family_id: 'f1', text: 'Agua y fruta para casa',       completed: true,  completed_at: '2026-06-16T18:00:00', completed_by: 'u1', sort_order: 3, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li5',  list_id: 'l2', family_id: 'f1', text: 'Vitamina D',                   completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u2', created_at: '2026-06-16T00:00:00' },
    { id: 'li6',  list_id: 'l2', family_id: 'f1', text: 'Suero fisiológico monodosis',  completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li7',  list_id: 'l2', family_id: 'f1', text: 'Gasas estériles',              completed: true,  completed_at: '2026-06-15T12:00:00', completed_by: 'u1', sort_order: 2, created_by: 'u1', created_at: '2026-06-15T00:00:00' },
    { id: 'li8',  list_id: 'l3', family_id: 'f1', text: 'Lavar muselinas',              completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u2', created_at: '2026-06-16T00:00:00' },
    { id: 'li9',  list_id: 'l3', family_id: 'f1', text: 'Preparar cambiador del salón', completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-16T00:00:00' },
    { id: 'li10', list_id: 'l3', family_id: 'f1', text: 'Sacar basura pañales',         completed: true,  completed_at: '2026-06-17T07:30:00', completed_by: 'u1', sort_order: 2, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li11', list_id: 'l4', family_id: 'f1', text: 'Escanear informe de alta',     completed: false, completed_at: null,                  completed_by: null, sort_order: 0, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li12', list_id: 'l4', family_id: 'f1', text: 'Solicitar tarjeta sanitaria',  completed: false, completed_at: null,                  completed_by: null, sort_order: 1, created_by: 'u1', created_at: '2026-06-17T00:00:00' },
    { id: 'li13', list_id: 'l4', family_id: 'f1', text: 'Guardar certificado nacimiento', completed: true, completed_at: '2026-06-10T18:00:00', completed_by: 'u2', sort_order: 2, created_by: 'u2', created_at: '2026-06-09T00:00:00' },
  ],

  mealPlans: [
    { id: 'mp01', family_id: 'f1', date: '2026-06-16', slot: 'lunch',     name: 'Arroz con verduras',           notes: 'Dejar ración para mañana',      created_by: 'u1', created_at: '2026-06-15T21:00:00', updated_at: '2026-06-15T21:00:00' },
    { id: 'mp02', family_id: 'f1', date: '2026-06-16', slot: 'dinner',    name: 'Crema de calabacín',           notes: 'Algo rápido',                   created_by: 'u2', created_at: '2026-06-15T21:00:00', updated_at: '2026-06-15T21:00:00' },
    { id: 'mp03', family_id: 'f1', date: '2026-06-17', slot: 'breakfast', name: 'Tostadas y café',              notes: 'Turno corto antes del pediatra', created_by: 'u1', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp04', family_id: 'f1', date: '2026-06-17', slot: 'lunch',     name: 'Pollo al horno con patatas',   notes: 'Preparado por la abuela',       created_by: 'u2', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp05', family_id: 'f1', date: '2026-06-17', slot: 'dinner',    name: 'Tortilla francesa y sopa',     notes: null,                            created_by: 'u1', created_at: '2026-06-16T21:00:00', updated_at: '2026-06-16T21:00:00' },
    { id: 'mp06', family_id: 'f1', date: '2026-06-18', slot: 'lunch',     name: 'Lentejas suaves',              notes: 'Congelar dos raciones',         created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp07', family_id: 'f1', date: '2026-06-18', slot: 'dinner',    name: 'Ensalada de tomate y atún',    notes: null,                            created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp08', family_id: 'f1', date: '2026-06-19', slot: 'lunch',     name: 'Pasta con pesto',              notes: 'Muy rápido',                    created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp09', family_id: 'f1', date: '2026-06-19', slot: 'dinner',    name: 'Sándwiches calientes',         notes: 'Noche tranquila',               created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp10', family_id: 'f1', date: '2026-06-20', slot: 'lunch',     name: 'Merluza con arroz',            notes: null,                            created_by: 'u2', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
    { id: 'mp11', family_id: 'f1', date: '2026-06-20', slot: 'dinner',    name: 'Gazpacho y empanada',          notes: 'Compra hecha',                  created_by: 'u1', created_at: '2026-06-17T08:00:00', updated_at: '2026-06-17T08:00:00' },
  ],

  documents: [
    { id: 'd1', family_id: 'f1', child_id: '1',  name: 'Informe alta hospitalaria Ana', description: 'Nacimiento y alta de maternidad', category: 'salud',    storage_path: 'mock/alta-hospitalaria-ana.pdf', mime_type: 'application/pdf', size_bytes: 358400, created_by: 'u1', created_at: '2026-06-05T13:00:00', updated_at: '2026-06-05T13:00:00' },
    { id: 'd2', family_id: 'f1', child_id: '1',  name: 'Cartilla de salud Ana',         description: 'Revisiones y vacunas',            category: 'salud',    storage_path: 'mock/cartilla-salud-ana.pdf',    mime_type: 'application/pdf', size_bytes: 245760, created_by: 'u2', created_at: '2026-06-05T13:30:00', updated_at: '2026-06-05T13:30:00' },
    { id: 'd3', family_id: 'f1', child_id: '1',  name: 'Certificado nacimiento Ana',    description: 'Copia para trámites',             category: 'personal', storage_path: 'mock/certificado-ana.pdf',       mime_type: 'application/pdf', size_bytes: 286720, created_by: 'u1', created_at: '2026-06-10T18:00:00', updated_at: '2026-06-10T18:00:00' },
    { id: 'd4', family_id: 'f1', child_id: null, name: 'Libro de familia',              description: null,                              category: 'personal', storage_path: 'mock/libro-familia.pdf',         mime_type: 'application/pdf', size_bytes: 512000, created_by: 'u1', created_at: '2026-06-11T10:00:00', updated_at: '2026-06-11T10:00:00' },
    { id: 'd5', family_id: 'f1', child_id: null, name: 'DNI Omar',                      description: 'Documento de Omar',               category: 'personal', storage_path: 'mock/dni-omar.jpg',              mime_type: 'image/jpeg',      size_bytes: 132096, created_by: 'u1', created_at: '2026-06-01T00:00:00', updated_at: '2026-06-01T00:00:00' },
  ],
}
