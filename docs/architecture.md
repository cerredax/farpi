# Arquitectura

## Objetivo técnico

Mantener Nido simple: una app web privada, mobile-first, con Supabase como backend base y sin introducir backend complejo.

## Capas actuales

```text
UI / Pantallas
  -> StoreProvider (store-context.tsx)   [async: loading / error / reload]
    -> Repos (contrato src/lib/repos/types.ts)
       ├─ supabaseRepos (src/lib/supabase-repos/*)   ← IS_DEMO_MODE = false
       └─ mockRepos     (src/lib/mock-repos.ts)      ← IS_DEMO_MODE = true
            -> src/lib/store/* -> localStorage
```

La UI ya consume Supabase de forma general a través de la frontera de repositorios. `StoreProvider` selecciona `supabaseRepos` o `mockRepos` según `IS_DEMO_MODE` (definido en `src/lib/supabase/env.ts`), sin duplicar pantallas. El modo demo persiste en `localStorage` y sirve como fallback y como entorno de pruebas e2e.

## Modo demo

Archivos principales:

- `src/lib/store/` (módulos del mock, uno por dominio)
- `src/lib/store-context.tsx`
- `src/lib/family-config.ts`

Persistencia:

- Clave: `nido_store_v1`
- Ubicación: `localStorage`
- Versión interna: `SCHEMA_VER = 8`, en `src/lib/store/persist.ts` (la 8 entró con `families.meal_slots`)

El mock debe comportarse lo más parecido posible a Supabase:

- Datos siempre filtrados por `family_id`.
- Borrado de hijo con `child_id = null` en eventos/documentos.
- Comidas sin duplicados por familia, fecha y slot.
- Invitaciones separadas de miembros reales.

## Supabase

Usos:

- Auth.
- PostgreSQL.
- Row Level Security.
- Storage privado para documentos.

Estado:

- Proyecto Supabase creado y migraciones subidas.
- UI conectada mediante repositorios reales (`src/lib/supabase-repos/`, un módulo por dominio igual que el mock).
- Auth, invitaciones por magic link, roles y documentos en Storage operativos.
- Validación aislada completada (2026-08-03): 47/47 comprobaciones de RLS, RPCs, integridad y Storage. Ver `docs/supabase-validation.md`.
- Migraciones 001–018 aplicadas y revalidadas. Las 017 y 018 entraron el 2026-08-21 y `node scripts/validate-rls.mjs` volvió a dar 51/51 ese mismo día, el mismo recuento que tras las 015 y 016: ninguna de las dos toca policies ni aislamiento.
- Migración 019 (`families.meal_slots`) aplicada y validada el 2026-08-24: **58/58**, con
  siete comprobaciones nuevas. El repo sigue normalizando la columna ausente a "las cuatro
  franjas" (`mapFamily` en `src/lib/supabase-repos/family.ts`); ya no hace falta para
  producción, pero es lo que permite desplegar código antes que SQL, que es el orden en el
  que pasan las cosas aquí.

La detección de "modo demo" (sin credenciales reales) está centralizada en `src/lib/supabase/env.ts` y la comparten cliente, servidor, proxy (`middleware.ts`) y rutas API, para evitar divergencias entre capas.

Migraciones:

- `001_initial_schema.sql` — tablas, índices, triggers `updated_at`
- `002_rls_policies.sql` — RLS + función `my_family_ids()` (security definer, search_path fijo)
- `003_rpc.sql` — `create_family_with_admin`, `update_my_family_profile` (sustituida en `014`)
- `004_family_invites_storage.sql` — tabla `family_invites`, policies, bucket `documents`
- `005_task_recurrence.sql` — columnas `recurrence` y `recurrence_end` en `tasks`
- `006_event_recurrence.sql` — columna `recurrence_group_id` en `events`
- `007_cross_family_integrity.sql` — triggers que impiden que `list_items`, `events` y `documents` crucen familias
- `008_admin_rpcs.sql` — `remove_family_member`, `update_family_member_role` (security definer); reemplaza policy `Admin gestiona miembros` por `Admin inserta miembros`
- `009_accept_invite_rpc.sql` — `accept_family_invite(p_invite_id)` (security definer): crea `family_member` y marca la invitación como aceptada; devuelve el `family_id`
- `010_push_subscriptions.sql` — tabla `push_subscriptions` con RLS por usuario
- `011_account_deletion.sql` — `created_by` pasa a nullable (`on delete set null`)
- `012_member_assignment.sql` — `member_id` en `events` y `documents`, para asignar a adultos y no solo a hijos
- `013_event_kind.sql` — `kind` en `events` (`evento` | `vacaciones`), con `check` que obliga a las vacaciones a tener día final
- `014_member_profile.sql` — `color` en `family_members` y RPC `update_family_member_profile`, que sustituye a `update_my_family_profile`
- `015_task_assignment.sql` — `child_id`, `member_id` y `completed_by` en `tasks`, con el mismo `check` de exclusión que eventos y documentos, y los triggers cross-family correspondientes
- `016_document_expiry.sql` — `expires_on` en `documents` (nullable) e índice por `(family_id, expires_on)`
- `017_event_kind_descanso.sql` — amplía el `check` de `events.kind` a `descanso` y le exige día completo y fecha final, igual que a las vacaciones
- `018_person_kind.sql` — `kind` en `children` (`hijo` | `adulto`), para los adultos de la familia que no tienen cuenta
- `019_meal_slots.sql` — `meal_slots` en `families` (`text[]`, las cuatro por defecto): qué franjas de comida ve la familia. No necesita policy nueva, la de update de la 002 ya vale

Se aplican a mano por el SQL Editor: no hay CLI de Supabase enlazada, así que los
ficheros numerados son el único registro de qué se aplicó y en qué orden.
`all_in_one.sql` es la concatenación de todas para levantar un proyecto de cero, y
**está generado** por `scripts/gen-all-in-one.mjs` (con `--check` avisa si se ha
quedado atrás). Antes se mantenía a mano, con el riesgo evidente de que dejara de
coincidir en silencio.

Regla central de RLS:

> Un usuario solo puede ver, crear, editar o borrar datos de las familias a las que pertenece como miembro en `family_members`.

Detalles de seguridad:

- `my_family_ids()` es `security definer` con `set search_path = public`.
- No existe policy de UPDATE directo sobre `family_members`. El perfil se edita con `update_family_member_profile` (RPC, `014`), que restringe los campos a `display_name` y `color`, y permite hacerlo a uno mismo o a un admin de esa familia. Sustituye a `update_my_family_profile`, que solo dejaba editarse a uno mismo.
- Las policies de `family_invites` para UPDATE incluyen `using` y `with check`.

## Superficie de seguridad fuera de la base de datos

La validación 47/47 cubre RLS, RPCs y Storage: la base de datos. Lo que queda por
encima —las rutas API y el callback de correo— se revisó el 2026-08-05:

- `/api/invite` usa la service role **solo** para mandar el email; la invitación
  se inserta con el cliente del usuario (RLS) y antes comprueba que quien llama
  es admin de esa familia.
- `/api/account/delete` aplica la regla del último admin y borra los documentos
  de Storage antes que la familia.
- `/api/push` se apoya en la policy de `push_subscriptions`: un upsert con el
  endpoint de otra persona no puede robar su suscripción porque el `using` de la
  policy no deja tocar filas ajenas.
- `/api/cron/reminders` se protege con `CRON_SECRET`, y el proxy la deja pasar
  sin sesión a propósito.
- El proxy (`src/proxy.ts`) manda al login todo lo que no sea público.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app.
  Sin eso, un enlace de correo legítimo podía acabar en otra web justo después
  de iniciar sesión.
- Cabeceras en `next.config.ts`. Sin CSP a propósito: Next inyecta scripts en
  línea y una CSP mal puesta rompe producción sin avisar en local.

No hay `dangerouslySetInnerHTML` ni `eval` en todo el código.

## Regla del último admin

**Decisión de producto:** Una familia debe tener siempre al menos un admin. Está prohibido eliminar o degradar al único admin de una familia.

**Implementación:** No se implementa con policies RLS (que no tienen acceso fácil a recuentos de roles). Se implementa mediante RPCs `security definer` en Supabase para la gestión de miembros, y el endpoint `/api/account/delete` bloquea borrar la cuenta si eso dejaría una familia compartida sin admin.

### RPCs implementadas (migración 008)

- `remove_family_member(p_member_id uuid)` — elimina un miembro; valida que el llamante es admin y que no es el único admin.
- `update_family_member_role(p_member_id uuid, p_role text)` — cambia el rol; mismas validaciones.

Ambas son `security definer` con `set search_path = public, auth`. La policy `Admin gestiona miembros` (`for all`) queda reemplazada por `Admin inserta miembros` (`for insert`) — UPDATE y DELETE deben hacerse vía RPC.

### Invitaciones

La migración `009_accept_invite_rpc.sql` añade `accept_family_invite(p_invite_id uuid)`.

Esta RPC:

1. Verifica que el usuario está autenticado.
2. Busca una invitación pendiente para el email del usuario.
3. Crea el `family_member`.
4. Marca la invitación como `accepted`.
5. Devuelve el `family_id`.

Canal de entrega elegido: **magic link** vía `admin.auth.admin.inviteUserByEmail` en `/api/invite`, con `redirectTo` a `/auth/callback?invite_id=...`.

`/auth/callback` es una **página de cliente**, no un route handler, y no es un detalle
menor: los enlaces de invitación devuelven la sesión en el **fragmento** de la URL
(`#access_token=…`, flujo implícito), y el fragmento nunca llega al servidor. Resuelto
en servidor, la invitación se perdía en silencio y el usuario quedaba autenticado pero
fuera de la familia. La página atiende los dos flujos —fragmento y `?code=` de PKCE— y
muestra un mensaje claro cuando el enlace ha caducado o ya se usó.

## Asignación de eventos, tareas y documentos

Un evento, una tarea o un documento puede pertenecer a **toda la familia**, a **un miembro
adulto** o a **un hijo**, nunca a dos a la vez. Se modela con dos columnas nullables,
`child_id` y `member_id`, y un `check` que impide que ambas estén rellenas.

Las tareas llegaron las últimas (migración 015) y son donde más falta hacía: en una casa
compartida la pregunta de una tarea es "¿quién la hace?". Guardan además `completed_by`,
porque `completed_at` decía cuándo pero no quién.

Son conceptos distintos y por eso no se unificaron en una sola columna: un miembro tiene
cuenta y entra en la app; un hijo es alguien de quien la familia lleva registro. Los hijos
guardan su color en la base de datos; los miembros lo reciben por su posición, en
`src/lib/assignees.ts`, que es la única fuente de ese cálculo para que el color sea el
mismo en Ajustes, calendario y documentos.

Al eliminar a un miembro, sus asignaciones pasan a ser de toda la familia
(`on delete set null`); el mock lo imita en `store/family.ts`.

Los colores que se pueden elegir son `PERSON_COLORS`, en `src/lib/constants.ts`, y son
**catorce en dos bandas de claridad**: ocho de adulto y seis de niño. Ese archivo, junto a
la lista, es la fuente de verdad; lo que hay que saber aquí es cómo está construida:

- **Los grupos se separan por claridad, no por tono.** Adultos en L* 30-45, niños en
  L* 71-88, y la franja L* 52-62 se esquiva: ahí ni el blanco ni la tinta llegan a 4,5:1
  encima del color, así que no cabe un grupo entero. De ahí sale el reparto de texto: los
  ocho de adulto llevan blanco (el peor, Ladrillo, 5,42:1) y los seis de niño llevan tinta
  (el peor, Canela clara, 6,92:1).
- **Los adultos no se reparten por género** (24-08-2026). Estuvieron divididos en "cinco de
  hombre" y "tres de mujer", y esa cuota obligaba a elegir tonos para rellenarla en vez de
  por cómo se distinguen. La app no sabe de géneros —no hay campo para eso— así que la
  paleta tampoco: los ocho son sobrios y se ofrecen igual a cualquiera. Con ese cambio
  salieron Rosa fuerte y Mostaza oscura, y entraron Pizarra (`#536270`) y Ciruela
  (`#6B3F6D`).
- **No son todos cálidos, a propósito.** Azul (`#4A6C8C`), Verde bosque (`#3D5C42`),
  Pizarra y Ciruela rompen la regla de "solo tierras y ocres": con ella, quien busca "el
  azul" no lo encontraba. Respetan la banda de claridad de los adultos, así que no cuestan
  contraste. No es la versión intermedia que se descartó en su día: aquella era fría
  **entera**, porque el criterio era aguantar el daltonismo. Ese criterio sigue retirado.
- Ninguno es el `FAMILY_COLOR` ni el verde de la app, y ya **ninguno se le parece**: la que
  se confundía con el amarillo de familia era Mostaza oscura, y el adulto más cercano ahora
  es Cuero, a ΔE00 37. Queda un roce medido y de otra clase: Coral claro a ΔE00 8,3 de la
  terracota de marca. No compiten en pantalla —un punto de persona no se pone al lado de un
  botón—, pero está anotado.
- **Lo que cuesta**: once parejas de noventa y una quedan por debajo de ΔE00 15 (eran
  doce). La más cercana sigue siendo Calabaza clara con Canela clara, a 5,71, las dos de
  niño; entre adultos, Azul con Pizarra a 7,40 y Vino con Granate a 7,71.
- **Quitar un color de la lista no toca lo guardado.** `memberColor` devuelve el que la
  persona tenga, sea de la paleta o no, y `ColorPicker` simplemente no lo marca como
  elegido. Ya pasa con el `#FBC4DC` de Ana en los datos de demo, que no está en la lista
  desde hace dos paletas.

`e2e/unit/assignees.spec.ts` vigila lo que se puede vigilar sin meter CIEDE2000 en el
repositorio: que no se repitan, que ninguno sea el `FAMILY_COLOR` ni el verde de la app, y
que la inicial de cada uno llegue a 4,5:1 con el color de texto que le toca. Los recuentos
—catorce, ocho y seis— viven en comentarios y no en `expect`: lo que hay que sostener es la
regla, no cuántos colores haya.

Ese color de texto lo decide `textColorOn()`, en `assignees.ts`: blanco o la tinta de
siempre, el que más contraste dé sobre el fondo. Antes iba en blanco a pelo y encima de
media paleta no se leía —sobre el amarillo de "toda la familia" daba 1,67:1—, y la paleta
no lo puede arreglar sola: la claridad varía por necesidad, así que hay colores oscuros y
claros en la misma lista. Lo usan los seis sitios donde hay texto encima de un color que viene
de los datos: las dos listas de Ajustes, la vista previa del sheet, las etiquetas de quien
lleva algo en Inicio y en Documentos, y la franja de vacaciones del calendario.

El color con el que se pinta un evento sale de `eventColor()`, en el mismo archivo: el
color propio del evento, si no el de quien lo lleve, y si no hay nadie el `FAMILY_COLOR`
amarillo. Está centralizado porque cuando el cálculo estaba copiado en cada pantalla,
Inicio se quedó sin el último escalón y los eventos de toda la familia salían sin marca.

## Vacaciones

Unas vacaciones **no son una entidad aparte**: son un evento de varios días
asignado a una persona. Reutilizan las policies, la asignación y la integridad
entre familias, así que la única diferencia es `kind = 'vacaciones'` y que
`end_at`, que en un evento normal marca la hora de fin, aquí marca el último día.

Eso obligó a cambiar una suposición que estaba repartida por el calendario: que
un evento vivía en un solo día. Los tres sitios que comparaban `start_at` con el
día usan ahora `eventCoversDay` (`src/lib/events.ts`), que pregunta si el evento
cubre esa fecha. Las comparaciones se hacen sobre cadenas `yyyy-MM-dd`, no sobre
`Date`, para no arrastrar líos de zona horaria.

En la rejilla del mes no se dibujan como un punto más, porque de unas vacaciones lo
que importa es el tramo: el día lleva una **raya fina** con el color de quien falta,
redondeada donde el tramo empieza y acaba. Ver "El calendario es agenda primero" para
la representación completa, que comparten con los descansos.

## Repositorios

Frontera de datos ya implementada:

```text
UI / Pantallas
  -> StoreProvider (async)
    -> Repos (contrato src/lib/repos/types.ts)
       ├─ supabaseRepos (src/lib/supabase-repos/*)
       └─ mockRepos     (src/lib/mock-repos.ts)
```

`StoreProvider` consume la frontera async de repositorios y elige implementación según `IS_DEMO_MODE`, manteniendo modo demo y Supabase sin duplicar la UI. El hook experimental `src/hooks/useFamily.ts` y los stubs sueltos de `src/lib/repos/*` (salvo `types.ts`) se eliminaron por quedar obsoletos.

## Fechas

Usar helpers de:

- `src/lib/date-utils.ts`

Regla:

- Para fechas familiares como comidas o "hoy", usar fecha local.
- Evitar `toISOString().split('T')[0]` para representar fechas locales.
- Los eventos con hora pueden usar datetime, pero hay que tratar con cuidado eventos de todo el día.

## Validaciones

Usar:

- `src/lib/validators.ts`
- `src/lib/constants.ts`

No añadir librerías pesadas de validación salvo que el proyecto crezca.

## UI compartida

Componentes clave:

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/BottomSheet.tsx`
- `src/components/ui/Field.tsx` — etiqueta + control con el espaciado estándar
- `src/components/ui/SheetFooter.tsx` — pie con error, acción principal y borrado
- `src/components/ui/SelectChip.tsx` y `src/components/ui/DotOption.tsx` — opciones seleccionables
- `src/components/ui/CircleCheck.tsx` y `src/components/ui/CirclePlus.tsx` — el círculo de marcar y su hermano de sumar, con las mismas medidas y área de toque. El `+` es para lo que no está pendiente sino esperando a volver a hacer falta (el catálogo de las listas), donde un tic diría "hecho"
- `src/hooks/useSheetForm.ts` — `useSheetForm` (draft, error, foco, submit validado) y `useSheetDelete`
- `src/hooks/useConfirmAction.ts`
- `src/components/layout/SaveStatus.tsx` — el único sitio que cuenta qué pasa con los datos: si algo se está guardando, si ha fallado y si lo último se puede deshacer. Vive en el armazón, así que cubre todas las pantallas

El deshacer lo sirve el store (`undoLabel` / `undo()` / `clearUndo()`). Devolver una tarea marcada no es solo desmarcarla: si se repite, marcarla no la completa sino que le empuja `due_date` a la siguiente vez. `restaurarTarea` compara con el estado anterior y revierte solo lo que cambió, para no repetir en la UI la bifurcación que ya vive en el repo.

Un sheet con formulario se monta así: `useSheetForm` para el estado, `Field` para cada campo,
`SheetFooter` para el pie y `useSheetDelete` cuando hay borrado. Las vistas remontan los sheets
con `key` al abrirlos, por eso el draft inicial se evalúa una sola vez.

### Móvil y escritorio

La app se diseña para el teléfono y crece hacia el escritorio en `lg` (1024 px), nunca al
revés. El corte está solo ahí, y lo que hay por debajo no se toca al añadir escritorio.

La navegación es lo único que cambia de sitio: `BottomNav` desaparece con `lg:hidden` y
`SideNav` (`hidden lg:flex`, 224 px a la izquierda) toma su lugar, con las mismas seis
secciones más Ajustes, que en móvil vive en la rueda de `TopBar` porque en la barra de
abajo no caben siete etiquetas a 390 px. `AppShell` monta `SideNav` **después** de
`TopBar` —con el mismo `z-50`, lo último se pinta encima y la columna tiene que tapar la
esquina de la cabecera— y **antes** de `main`, para que el velo de un sheet la cubra al
abrirse.

Cada vista aprovecha el ancho como le conviene, no todas con la misma plantilla:

- `CalendarView`: dos columnas desde `lg`.
- `MealsView`: rejilla semanal de siete días desde `md` (`WeekGrid`), con la lista
  vertical (`WeekList`) para el teléfono.
- `TasksView`: las pendientes en dos columnas desde `lg`, y las completadas igual al
  desplegarse.
- `ListsView`: el índice en rejilla (dos desde `lg`, tres desde `xl`) y la lista abierta
  hasta `lg:max-w-3xl`, porque una lista de la compra sigue siendo una columna.
- `DocsView`: rejilla de tarjetas (dos y tres) y los filtros sin arrastre, que en
  escritorio caben los cinco.

Home y Ajustes siguen siendo la columna de móvil centrada.

El truco que se repite en las tres últimas: la rejilla se pone en el contenedor que ya
existía y la cabecera de la sección ocupa la fila con `lg:col-span-2`. Así no hace falta
envolver la lista en un div nuevo y por debajo de `lg` el DOM es idéntico. Lo que sí hay
que apagar es el `space-y-*` de móvil con `lg:space-y-0`: los márgenes entre hermanos y
el `gap` de la rejilla se suman y descuadran las filas.

Una trampa que ya costó una vez: un `style` en línea gana a cualquier clase, así que no
se puede sobreescribir por ancho de pantalla. Las columnas de `WeekGrid` estaban ahí y
hubo que moverlas a clases —con el valor base idéntico— para poder apretarlas en `lg`,
donde `SideNav` se lleva 224 px del ancho.

Todos los sheets usan el `BottomSheet` compartido (patrón `form` + `footer`), que ya resuelve el comportamiento en móvil pequeño y aporta modal centrado en escritorio:

- Altura máxima con `max-h-[92dvh]`.
- Scroll interno con `flex-1 overflow-y-auto min-h-0`.
- Botón principal en el `footer` fijo, siempre visible aunque el teclado esté abierto.

## Decisiones de producto

Estas decisiones se tomaron con motivo y costaron varias vueltas cada una. Vistas desde
fuera parecen incoherencias que hay que arreglar, y no lo son: si algo aquí va a
cambiar, que sea a propósito.

**Una lista de casa no es una lista de tareas.** "Leche" no se completa: se acaba,
se compra y se vuelve a acabar. Por eso las listas marcan **lo que falta**, no lo
que se ha hecho. Arriba lo pendiente; debajo, "Apuntar de lo de siempre", que es el
catálogo de lo que compráis siempre y del que se tira con un toque. Lo
del catálogo no sale tachado ni atenuado: no está muerto, está a un toque de volver
a hacer falta. Nada de barras de progreso ni de "2/5" — a nadie le importa haber
comprado el 40% de la compra. En la base de datos no cambia nada: un ítem que hace
falta es el que antes estaba pendiente. Cambia lo que significa en pantalla.

**El catálogo entra abierto** (24-08-2026). Arrancaba plegado, con el argumento de que
crece para siempre y taparía lo que de verdad hace falta. En uso resultó que entrar en una
lista es casi siempre ir a apuntar de ahí, así que el pliegue era un toque de más en el
camino principal. Se puede plegar a mano y no se recuerda: cada vez que se abre la lista
vuelve a estar abierto, porque el estado de un pliegue no es un ajuste.

**Los dos grupos van bajo su título** (24-08-2026): «Hace falta ahora», con la cuenta de
lo que falta al lado, y «Lo de siempre», con el botón de plegar en la misma fila. Antes se
sucedían sin nada que dijera dónde acababa uno, y la única diferencia era el fondo de la
fila: al entrar en una lista no se veía qué estaba pendiente. La cuenta va solo en los
pendientes —cuántas cosas faltan **ahora** es la pregunta de la pantalla— y no en el
catálogo, que sería medir lo hecho.

Entre las dos filas hay tres diferencias y no una: la forma (tarjeta blanca con sombra
contra plano sobre el fondo), el peso del texto y el círculo (tic contra `+`). Quien no
distinga un gris de un blanco tiene las otras dos. Lo del catálogo sigue **sin tacharse**:
cambia de presencia, no de vida.

**El catálogo se pide con un `+`, no con un tic.** Un tic ahí diría "hecho", que en
este modelo no significa nada. De ahí que `CircleCheck` y `CirclePlus` sean dos
componentes hermanos con las mismas medidas.

**Las franjas de comida se eligen, y son de la familia** (migración 019). Las cuatro
—desayuno, comida, merienda y cena— están fijas en el código, pero en una casa que no
merienda esa fila es un hueco que la app pide llenar siete veces por semana. En Ajustes se
apagan las que no se usan. Tres cosas se decidieron a propósito:

- **Se guarda en `families`, no por dispositivo.** "En casa no merendamos" es un hecho de
  la casa, no la preferencia de un teléfono: configurado una vez, vale para todos los
  móviles. Como el nombre de la familia, lo cambia un admin (policy de update de la 002).
- **Ocultar no borra.** `meal_plans` no se toca: lo apuntado en una franja oculta sigue en
  la base y vuelve a verse si se reactiva. Es la misma idea que el catálogo plegado de las
  listas: dejar de ver no es dejar de tener.
- **Siempre queda al menos una**, igual que siempre queda un admin. Con cero franjas la
  pantalla de comidas se queda sin filas y sin manera de volver a activarlas desde ella. Se
  comprueba en los tres sitios: el `check` de la 019, `toggleMealSlot` y la propia fila de
  Ajustes, que lo dice en vez de ofrecer un botón que no hace nada.

**Lo atrasado se arrastra al día de hoy.** El tramo del calendario empieza hoy, así
que todo lo vencido caía fuera: lo que más urge era lo único invisible. Una tarea
vencida aparece en el día de hoy marcada como atrasada — con la palabra en Inicio y
con un icono etiquetado en el calendario, donde a 390 px no cabe. Desaparecer no es
lo que le pasa a una tarea sin hacer.

El efecto de esa regla es que hoy acumula todo el atraso, y en la agenda eso se
notaba demasiado: seis tareas hacían la fila de hoy seis veces más alta que las
demás, con seis triángulos rojos seguidos, y el calendario abría enseñando la lista
de tareas en vez de los planes. Desde `TAREAS_PARA_PLEGAR` (3) van plegadas bajo una
línea que dice cuántas hay y cuántas van tarde, y se abre de un toque. **Resumir no
es esconder**: el recuento está a la vista, que es lo que la regla pedía. Los eventos
no se pliegan nunca — esto es el calendario, y lo que pasa manda sobre lo que hay que
hacer.

**Las vacaciones son del calendario, no un plan de hoy.** Un evento con
`kind = 'vacation'` se pinta como franja en el calendario y queda **fuera** de la
lista de eventos, de los planes de hoy (`selectTodayEvents`) y del recordatorio
diario. Estar de vacaciones no es un plan que haya que recordarle a nadie a las
siete de la mañana.

Y no se les pide título, ni a ellas ni a los descansos: el tipo ya dice lo que son, y
exigir un nombre era exigir que alguien se inventara un texto para poder guardar. El
campo sigue ahí porque "Playa con los abuelos" vale la pena, pero es opcional y
`eventTitleOr` pone el nombre del tipo al guardar. Un plan sí lo exige.

**El calendario es una lista continua, y el mes un mapa que se despliega** (25-08-2026).
En móvil la pantalla es la vista Programación de Google Calendar: cabecera y **una sola
lista** que arranca en hoy y se desliza. El mes **no es otra pestaña**: el rótulo de la
cabecera es un botón y la rejilla se despliega encima de la lista, como en Google.

Hubo pestañas `Agenda` / `Mes` durante unas horas de ese mismo día, y se fueron al abrir
la app: la pestaña por defecto era la lista, así que **el calendario se abría sin
enseñar ningún calendario**. Sobre el boceto parecía correcto —la vista Programación de
Google tampoco tiene rejilla— pero al entrar faltaba algo que mirar, y obligar a elegir
entre ver el mes o ver lo que hay era una elección falsa. Plegable, no hay que elegir.

Elegir un día en la rejilla **no reencuadra la lista: la desliza** hasta él
(`scrollIntoView` sobre el `id` de la fila). Reencuadrarla escondía todo lo anterior al
día tocado, que es el mismo fallo que tenía anclarla al día elegido.

**En escritorio hay tres vistas: Día, Semana y Mes** (26-08-2026), el trio de Google
Calendar, con su selector en la cabecera. En móvil no existe ese selector: la pantalla
es la lista continua con el mes plegable, y ahí sigue mandando `mes`.

Día y Semana son **la misma vista** (`Timeline`) con una columna o con siete. La
aritmética es `src/lib/timeline.ts`: dónde cae cada bloque, cómo se reparten en columnas
los que se pisan y qué horas se pintan. Ese archivo **se retiró con el eje de horas del
móvil el 24-08-2026 y volvió intacto**, con sus 19 unitarios, sin tocar una línea; con
él volvieron `extractMinutes`, `DURACION_SIN_HORA_FIN` y `HORAS_MINIMAS_AGENDA`, que se
habían borrado por muertos. La decisión de quitar la semana en columnas **no se
contradice**: su razón era el ancho —a 390 px una columna son ~45 px y los bloques se
quedan sin texto— y a 1440 px una columna pasa de 170.

El eje es uno solo para las siete columnas y se calcula sobre lo que hay en todas: con
siete ejes distintos no se podría comparar un martes con un jueves, que es para lo que
sirve mirar la semana.

Con Día o Semana delante **no hay lista al lado**. Google tampoco la pone, y con ella la
rejilla se queda sin el ancho que un bloque necesita para decir algo. La lista contesta
"¿qué viene después?" y esa pregunta la acompaña el mes, que sí la lleva.

Con el mes, la rejilla se lleva el espacio libre
—de 380 px a más de 900 en una pantalla de 1440— y la agenda se queda en una columna
fija de 380 a la derecha. Estaba al revés, con el mes encajado en 380 px y mil píxeles
de crema al lado, y la pantalla se veía a medio hacer.

Y a ese ancho **la celda sí escribe títulos**: hasta dos, con su punto de color, más el
resto contado y una línea con las tareas del día si las hay. Los puntos se quedan para
el móvil (`lg:hidden`). No contradice la decisión de quitar los títulos de la celda: la
razón de aquello era el ancho —a 50 px un título sale como "09:0…"— y una celda de
escritorio pasa de 120 px.

**De dónde viene, y qué se quitó.** Hasta el 25-08-2026 la agenda apilaba siete bandas
en una pantalla de 390 px: cabecera con mes y flechas, pestañas, tira de siete días,
"Vacaciones y descansos", buscador, tarjeta del día elegido y los tramos. El problema
no era ninguna de ellas: era tener **dos navegadores a la vez** (la tira y la pestaña
de mes) y **dos capas de contenido** (el día elegido como tarjeta y lo que viene como
lista). Se fueron la tira (`WeekStrip`, borrado), la tarjeta del día elegido, y el mes
con sus flechas dejó de pintarse en la agenda. Quedan dos bandas: cabecera y lista.

**Dónde arranca la lista es lo que separa las dos pestañas.** En agenda, **hoy**, y no
se mueve. Estuvo anclada al día elegido y con la lista continua resultó ser un fallo:
apuntar algo para el 6 de septiembre movía el ancla allí y la agenda se quedaba
empezando en septiembre, sin hoy ni el resto de la semana a la vista. Con la tira y la
tarjeta del día encima se disimulaba; sin ellas, la pantalla perdía lo que tenías
delante. Con el mes delante arranca en el **día elegido**, porque ahí tocar un día
tiene que enseñar ese día o la rejilla es un adorno. Es el reparto de Google.

La lista va **agrupada por tramos** (`tramoDeAgenda`, en `src/lib/agenda.ts`): "Hoy",
"Mañana", "Esta semana", "La semana que viene" y después uno por mes. El día de arranque
es su propio tramo —"Hoy", o su fecha escrita si se está mirando otro— y es lo que
sustituye a la tarjeta que tenía: lo nombra sin repetirlo como bloque aparte. Los demás
se miden desde ese día, y solo se pinta el que tiene algo. Sin tramos la lista era
plana de aquí a 45 días: el jueves que viene y un cumpleaños de octubre se leían igual,
y el chip de la fila da el día y el día de la semana pero no el mes.

Un día sin nada **no se pinta**, tampoco el primero. En una lista continua un hueco
vacío es ruido, y para añadir están el botón de la cabecera y el `+` de cada fila. Solo
hay un vacío, el de verdad: cuarenta y cinco días por delante sin nada.

Y el chip de la fecha **no es un botón**. Lo fue, y se anunciaba como "Ver 6 de
septiembre"; en una lista continua no lleva a ninguna parte, así que prometía un salto
que ya no ocurre. Hoy se marca ahí, en el color del chip, que es donde lo marca Google
y donde lo busca el ojo cuando la lista lleva rato deslizándose.

La excepción es **"Mañana"**, que sí mira el calendario de verdad y solo sale cuando la
agenda arranca hoy. Es la pregunta que más se hace después de "¿qué hay hoy?", y dentro
de "Esta semana" se leía igual que el sábado. Atado a hoy nunca desordena los rótulos:
cae siempre justo detrás del día elegido y delante del resto de la semana. Es la razón
de que la función reciba `hoy` como parámetro en vez de mirar el reloj por dentro — así
se puede probar sin depender del día en que corran los tests.

El bloque del día elegido es el **titular** de la pantalla: rótulo más grande que las
versalitas de los tramos y, cuando ese día es hoy, un aro verde en la tarjeta — el mismo
idioma con el que `WeekList` marca hoy en Comidas. Antes pesaban igual "Hoy, lunes 24 de
agosto" y "Esta semana", así que la pregunta de la pantalla se contestaba con la misma
letra que "¿y el jueves que viene?".

Cada línea de evento dice hora (o "Todo el día"), título y **de quién es, siempre**: lo
que no es de nadie pone "Familia" en gris. Antes se quedaba sin texto y solo lo decía el
punto amarillo, que es exactamente lo que la app no quiere — saberse la paleta de memoria
para entender a quién afecta algo. En gris y no en el amarillo de la familia porque ese
color no tiene contraste como texto; para eso existe `sand-strong`, y aquí basta con que
la palabra esté.

**La rejilla del mes es de un solo mes.** Se sigue dibujando por semanas completas
—si no, las columnas dejarían de ser días de la semana— pero los huecos de las puntas
van en blanco en vez de prestar días de los meses vecinos. Antes agosto pintaba once
días de julio y septiembre en gris: con la misma forma que los suyos, se leían como
días sueltos que no decían de qué mes eran, y era el mayor foco de ruido de la
pantalla. Lo que se pierde es tocar el 1 de septiembre desde agosto; se llega con la
flecha, que es un toque igual.

Con la tira se fueron sus dos rótulos de `DayCell`, que solo ella pasaba: la inicial
del día de la semana encima del número —la rejilla ya tiene cabecera de columnas— y el
mes debajo, que existía porque un tramo de siete días rodantes podía cruzar de mes.
La rejilla es de un solo mes, así que nunca lo necesitó.

La celda, ya solo la de `MonthGrid`, dice: número, **hasta dos puntos** con
el color de quien lleva cada cosa —o el número si son más de dos— y **una** raya si
alguien está fuera. Dos filas de señal y nada más: eran tres puntos y hasta dos rayas
(24-08-2026), y con eso la celda volvía a ser el resumen del día que la agenda vino a
quitarle. Lo que la celda **no** hace, y antes sí, es escribir títulos de
eventos, llevar tooltip y ser cuatro botones. Los títulos a 50 px de ancho salían como
"09:0…"; el tooltip era la única vía de leer el día y no existe con el dedo; y de los
cuatro botones, la franja de vacaciones (3 px de alto) y el punto de descanso (10×10)
estaban por debajo del mínimo de toque. Ahora la celda es un botón que selecciona el
día, su nombre accesible dice lo que hay en palabras ("lunes, 24 de agosto, 2 planes,
1 tarea, 1 de vacaciones") y el color es apoyo y nunca la única información.

**Vacaciones y descansos son lo mismo para el calendario: quién no está**
(24-08-2026). Los dos son `isAbsence` y comparten las tres reglas:

- **La celda las pinta como una franja pegada al borde de arriba, sobre un carril gris**
  (26-08-2026, tercera vuelta y la que se queda). Dos piezas, cada una resolviendo un
  problema distinto:
  - **La posición** —arriba del todo, fuera del flujo donde van las cosas del día— dice
    que **dura**, y por eso no se confunde con la etiqueta de un evento. Esa confusión
    apareció al convertir los títulos en etiquetas de color: dos rectángulos de color con
    texto, distinguidos solo por el ancho.
  - **El carril gris** dice que **hay algo**, siempre con el mismo peso, y el color solo lo
    rellena. Sin él, el color carga con dos trabajos y falla en uno: una barra maciza de
    "Champán dorado" sobre blanco da 1,37:1 y no se ve, mientras que "Vino" da 9,30:1.
    Siete veces de diferencia, porque la paleta va en dos bandas de claridad a propósito.

  Detrás hay una regla general que conviene no olvidar: **el color puede decir "de quién",
  pero nunca "qué" ni "si"**. Lo que significa una marca va en su forma y su sitio, que se
  leen igual en blanco y negro; el color añade el matiz. Con daltonismo rojo-verde —en
  torno al 8 % de los hombres— varios colores de la paleta se juntan: Coral claro con
  Melocotón son indistinguibles, y Cuero con Granate y con Vino, casi. Si el color fuera
  la única vía, esas familias perderían información; siendo el matiz, solo pierden el
  matiz.

  Se redondea donde el tramo empieza y acaba de verdad, para que los días de en medio
  encadenen. Caben dos por celda, y son decorativas: a 7 px nunca llegarían al mínimo de
  toque, y las ausencias se editan desde `Availability`, que es quien las nombra.

- **~~La celda las tiñe con la trama de día libre, en el color de quien falta.~~**
  *(Derogada el 26-08-2026, el mismo día: la paleta va en dos bandas de claridad, así que
  la misma opacidad daba pesos incompatibles —las vacaciones de un adulto pesaban cuatro
  veces más que el fin de semana y las de un hijo se veían menos—, y bajarla no arregla
  nada porque los tonos claros no llegan al peso del gris ni al 100 %. Un fondo no puede
  decir "día libre" y "de quién" a la vez.)*

- **~~La celda las pinta como una etiqueta con el nombre de quien falta.~~** *(Derogada el
  26-08-2026, unas horas después de nacer; ver arriba. Se queda escrito porque explica por
  qué la raya de 3 px no valía:*
  el idioma con el que Google marca lo que dura varios días. Fue una raya de 3 px bajo el
  número hasta que la rejilla se dibujó de verdad y se vio el problema: una rayita de
  color flotando bajo la fecha se lee como un subrayado, no dice "vacaciones" y no dice de
  quién. El argumento de que varios días seguidos formaban "una barra continua" tampoco se
  sostenía —la banda se parte al cambiar de semana, y ahora también en cada línea de la
  rejilla—.
  - La etiqueta lleva el nombre sobre el color de esa persona **al 50 %**, la misma rebaja
    que el número de un descanso y por la misma razón: mezclado con el fondo ningún
    color de la paleta admite texto blanco y todos admiten tinta.
  - En móvil el nombre no cabe —la celda son 50 px— así que allí la etiqueta se queda en
    la barra de color, igual que la celda hace con los títulos de los eventos.
  - Se redondea donde el tramo empieza y acaba de verdad, para que los días de en medio
    encadenen. **Hasta dos por celda** y el resto contado: eran una sola desde el
    24-08-2026, cuando la señal no llevaba nombre y apilar dos solo decía "falta gente";
    con el nombre escrito, la segunda sí añade.
  - Con más de una ausencia el mismo día manda la primera, y si hay vacaciones manda la
    de vacaciones, que es la que tiene tramo. **Se probó pintar la raya en gris** cuando
    falta más de uno —el color ya no es de nadie en concreto— y se descartó al verlo: un
    martes de descanso en medio de una semana de vacaciones partía la banda amarilla con
    un trozo gris, que se lee como que las vacaciones se acaban ahí. La banda continua
    dice la verdad más importante.
- **Los días en los que no se trabaja llevan trama diagonal**: sábado, domingo y festivo,
  los tres igual (26-08-2026). Es un solo concepto y por eso una sola clase, `dia-libre` en
  `globals.css`: lo que tienen en común un sábado y el 12 de octubre es que no hay trabajo
  ni colegio. Va en la rejilla, en la cabecera de columnas y en la vista Semana.
  - **Se probó rellenar la celda en crema y se descartó el mismo día.** Una masa de color
    se lee como "esto está apagado", y en una casa el fin de semana es cuando más pasa.
    Además en Nido **el color significa persona**, y un fondo que no es de nadie va contra
    esa regla —la trama no es un color, es una textura, y por eso no choca—.
  - **Y se probó una línea vertical** donde acaba la semana laboral, que sobre el papel
    era lo más fino. A tamaño real no se distinguía de las otras líneas de la rejilla:
    era una raya más.
  - La trama va **muy separada** —1 px cada 7— porque la celda de escritorio escribe
    títulos a 10 px encima y una trama apretada se los come.

- **~~Un descanso pinta el número del día con el color de quien descansa.~~** *(Derogada el
  26-08-2026: duró dos días. Al llegar las etiquetas con nombre eran dos señales para lo
  mismo, y de las dos el número decía menos —"aquí pasa algo", y para saber quién había
  que saberse la paleta— y además no era fiable, porque hoy y el día elegido le ganaban y
  un descanso hoy no se veía. Su razón de ser tampoco seguía en pie: nació porque con
  vacaciones de otro el mismo día la raya no se pintaba, y ahora caben dos etiquetas por
  celda. El número vuelve a decir solo dónde estás.)* Nació de las
  abuelas: el día que una no está hay que verlo desde la rejilla, sin abrir nada. La raya
  sola no daba para eso, porque cuando ese día cae dentro de las vacaciones de otro ni
  siquiera se pinta —manda la banda— y el descanso se quedaba sin ninguna señal.
  - Va como **círculo y no como letra de color**, y no es una preferencia: la paleta
    tiene seis tonos claros, y "Champán dorado" escrito sobre blanco da 1,36:1 cuando el
    mínimo es 4,5:1.
  - Y el círculo va **al 50 %**. A color pleno gritaba más que "hoy" y una semana de
    descansos seguidos era una fila de círculos oscuros; rebajado se lee como un fondo y
    no como una chapa. La rebaja decide además el color del número: mezclado con el
    fondo, ningún color admite ya blanco —el peor cae a 1,17:1— y todos admiten tinta,
    con Vino sobre el crema del hover como peor caso a 5,26:1. Por eso el número es
    `text-ink` fijo y no hace falta `textColorOn`, que sí haría falta a color pleno.
  - **El día elegido y hoy mandan sobre él**, en ese orden: son dónde estás, y eso pesa
    más que quién falta. Cuando lo tapan, la raya de debajo y `Availability` lo siguen
    contando.
  - Con más de un descanso manda el primero, la misma regla que la raya, y cuántos son lo
    dice el nombre accesible del día ("2 descansando"): el color no es la única vía.
  - Las **vacaciones no lo hacen**: ya tienen la banda a todo el ancho, que es la señal
    más visible de la celda. Dos señales para lo mismo sería el ruido que la celda vino
    a quitarse.
  - **Se probó un tinte cálido en toda la celda y se descartó el mismo día**
    (24-08-2026). Dejaba igual una semana entera de vacaciones y un día libre de una
    persona, que son cosas distintas, y la raya se lee mejor. Con él se fue
    `absenceEdges`, que existía solo para redondear el tinte. Lo que sí se queda del
    intento: la raya es **decorativa**, nunca un botón de 3 px, que no llegaba al mínimo
    de toque.
- **No salen en la lista de la agenda.** Ocupan días seguidos y se repetían en todos:
  un descanso de tres días eran tres filas con el mismo texto. Las vacaciones ya
  estaban fuera; los descansos entraron con ellas.
- **`Availability` es la fuente**, y sustituye a `VacationLegend`. Una ausencia sale
  **una vez**, con nombre escrito, icono según la clase (palmera o taza) y su estado en
  palabras: "de vacaciones hasta el 28 ago" si ya ha empezado, "del 3 al 9 sept" si no,
  "descansa hoy" o "descansa mañana" si es de un día. Es también el único sitio desde el
  que se editan, y por eso sus filas llevan `min-h-8`.

El tramo del que habla el bloque es **exactamente** el que se pinta: el mes en modo
mes —no sus seis filas, desde que la rejilla no presta días de fuera— y los siete días
de la tira en modo agenda. Contar las seis filas hacía que el bloque anunciara un
descanso del 3 de septiembre mirando agosto, sin ningún día pintado que lo respaldara.

Ojo con el alcance: esto es la **vista del calendario**. `selectTodayEvents` sigue
sacando los descansos en Inicio, que es de antes y no se ha tocado.

**Nunca siete columnas en el móvil.** Sigue en pie, y es la razón de que la tira sea
navegación y no una semana en columnas: a 390 px cada columna son ~50 px, y un bloque
de color sin texto hay que tocarlo para saber qué es. Es también por lo que Google
Calendar no pone esa vista por defecto en el teléfono.

**Derogado el 24-08-2026: el día sobre un eje de horas.** Hasta ese día el móvil abría
en `DayTimeline`, con cada cita en su hora y el alto de lo que duraba, y el mes se
desplegaba con una manija. Se retiró entero con el rediseño —el componente,
`src/lib/timeline.ts` y sus 19 tests unitarios— porque en la estructura nueva no queda
sitio para una tercera vista y el detalle del día ya se lee en lista. Lo que se perdió,
por si algún día se vuelve: la posición como forma de decir la hora, el alto como forma
de decir la duración y el reparto en columnas de lo que se solapa. Dos decisiones que
vivían ahí y ya no aplican: un evento sin hora de fin se dibujaba con 45 minutos, y el
eje se recortaba a las horas con algo porque de 00:00 a 24:00 era casi todo blanco.

**Un abuelo es un adulto sin cuenta, y vive en `children`.** La frontera de la app
no es adulto/niño, es **con cuenta / sin cuenta**. `family_members` cuelga de
`auth.users` con `user_id not null`: para estar ahí hace falta correo, cuenta y
sesión, y de esa tabla dependen `my_family_ids()`, las policies y la regla del
último admin. Una abuela que recoge a los niños los martes no tiene nada de eso y
sin embargo hay que poder asignarle cosas.

Por eso los adultos sin cuenta van en `children` con `kind = 'adulto'` (migración
018) y no en `family_members` con el usuario a null. `children` es ya la tabla de
las personas de las que la familia lleva registro: nombre, color, asignación por
`child_id` en eventos, tareas y documentos, y sus triggers de integridad entre
familias. Se descartó tocar `family_members` porque habría metido mano en la tabla
de la que cuelga toda la seguridad para no ganar nada, y se descartó una tabla nueva
por lo mismo que lo descartó la 012: duplicar policies, triggers e integridad para
lo mismo.

El precio es que la tabla se llama `children` y guarda abuelos. Se paga a gusto:
renombrarla arrastraría claves ajenas, policies y triggers de media base. En Ajustes
son tres grupos dentro de "Personas" —**Adultos con cuenta** (se invitan por correo),
**Adultos sin cuenta** (se añaden con un nombre y un color) e **Hijos**—, y en "asignar
a" los adultos van juntos, con cuenta o sin ella: a la hora de asignar algo da igual
quién entra en la app.

Los dos primeros se llamaban "Adultos" y "Otros adultos" hasta el 24-08-2026. Nombrar
la frontera —con cuenta / sin cuenta— es más largo y dice lo que hay; "otros" dejaba a
la abuela como un adulto de segunda y no explicaba por qué está en otra lista.

Y una regla que las cruza todas: **buscando sí se enseña todo**, incluido el
catálogo y el pasado del calendario. Esconder algo que sí coincide sería contestar
"no hay nada" a una búsqueda que encontró algo. En el calendario eso significa que
buscar cambia lo que se lee: el detalle del día y los próximos días dejan paso a los
resultados, porque una búsqueda atraviesa el calendario entero y no cabe en un día. La
tira y el mes se quedan donde están: son navegación, y al vaciar el campo vuelves justo
al día en el que estabas.

**Ajustes se agrupa por para qué entras** (24-08-2026): "Tu familia", "Personas",
"Preferencias de la casa", "Cuenta y seguridad" y "Legal", más "Modo demo" cuando toca.
Eran once secciones al mismo nivel en una columna que en móvil no se acababa nunca.

**Sin plegables, y a propósito.** El repositorio ya se dio ese golpe dos veces: el
catálogo de las listas arrancaba plegado y se abrió porque "el pliegue era un toque de
más en el camino principal", y las tareas del día solo se plegan porque hoy acumula todo
lo atrasado y el recuento se queda a la vista. Ajustes no acumula nada —la lista es de
largo fijo— y se entra con un objetivo concreto, así que un pliegue esconde justo lo que
se viene a buscar. El largo se recortó quitando redundancia: la tarjeta de la familia
cede el recuento a "Personas" (donde además dice las invitaciones), la lista de familias
solo sale si hay más de una, y las dos acciones normales de la cuenta pasan a ser filas
de una tarjeta en vez de dos tarjetas de una línea.

## Tono de la interfaz

La app habla como se habla en una casa, y desafina en cuanto se cuela el registro
de una herramienta de trabajo. Al escribir textos nuevos:

- **Vosotros, no el usuario.** "Ya tenéis leche", "no lo habíais apuntado nunca".
- **Los vacíos dicen qué pasa, no que no hay datos.** "Sin planes", "No falta nada",
  "Sin menú para hoy" — nunca "No se han encontrado elementos".
- **Las etiquetas dicen lo que hace el toque**, con el nombre de la cosa dentro:
  "Apuntar que hace falta Leche", "Ya tenéis Leche, quitar de lo que falta". No
  "marcar como hecho".
- **Nada de jerga de gestor de proyectos**: ni completado, ni progreso, ni
  porcentajes. Salvo en Tareas, que sí son tareas.
- **Los ejemplos son de esta casa**: "Ej: Cartilla vacunas Ana", "Ej: Leche entera".
- Frases cortas y sin signos de admiración. Ya no hay excepciones: la última era
  «Lista vacía. ¡Añade el primer ítem!» (`ListDetailView.tsx`), que se quedó de antes y
  desafinaba; el 24-08-2026 pasó a «Esta lista está vacía / Apunta lo primero que haga
  falta».

## Decisiones técnicas

- Invitaciones: **magic link** (`inviteUserByEmail` + `/auth/callback?invite_id`).
- Familia activa: sesión Supabase + tabla `family_members`, resuelta en `AppShell` y persistida con `family-config`.
- `StoreProvider` migrado a acciones async (Fase 5, hecho).
- Tests con `@playwright/test`, un solo runner para dos cosas: los unitarios de
  lógica pura en `e2e/unit/` (sin servidor, ~0,6 s) y los de navegador. Se eligió así
  para no añadir una dependencia más solo por los unitarios.
- Migración a tokens de color completada (2026-08-03): de 109 apariciones a 36. Lo
  que queda literal son datos, marca de terceros y decorativos de un solo uso.
- **La paleta es la original y se vuelve a ella.** Crema `#FAF7F2`, tinta `#252525`,
  salvia `#8BA888`, terracota `#D8A48F`, amarillo `#E9C46A` y rojo `#D96C6C`. El
  2026-08-21 se probaron dos alternativas cálidas —"Cocina de casa" y "Mediterráneo"— y
  el 2026-08-24 se revirtieron las dos por decisión de producto. Si se vuelve a intentar,
  esto es lo que se aprendió:
  - **Los nombres de token no se tocan, solo los valores.** Así se hizo las dos veces:
    `--nido-sage` acabó siendo una terracota y `--nido-terracota` un turquesa. Suena
    raro y aun así es lo correcto: renombrarlos arrastra el bloque `@theme inline` y las
    utilidades `*-nido-*` que salen de él.
  - **El acento de marca tiene dos papeles**: relleno con blanco encima
    (`bg-primary text-white`, 12 sitios) y texto sobre el crema (`text-primary`, 57 usos
    y mucho de 9-12 px). Un acento cálido y bonito rara vez cumple 4,5:1 en los dos, así
    que o se oscurece el token —y se nota— o se acepta AA solo para texto grande y el
    texto pequeño tira de `primary-strong`. La salvia original no cumple en ninguno de
    los dos (2,61 y 2,44), que es el precio conocido de tener esta paleta.
  - **`FAMILY_COLOR` (`src/lib/constants.ts`) es el token `sand` copiado a mano**, porque
    viaja en `style` y no en clases. Cambiar la paleta y olvidarlo no rompe nada: los dos
    amarillos simplemente dejan de ser el mismo y nadie avisa. Igual que el `themeColor`
    de `layout.tsx`, el `theme_color` de `public/manifest.json` y `src/app/icon.svg`.

## Decisiones pendientes

- Si el modo demo será permanente o solo de desarrollo/pruebas.
- Si se publica en Google Play como TWA. Afecta poco al código (assetlinks y package
  name), pero fija el dominio para siempre.
