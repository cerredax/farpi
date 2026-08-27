# Estado del proyecto

Última revisión: 2026-08-27.

## Resumen

Nido está conectado a Supabase de extremo a extremo: autenticación, repositorios reales, `StoreProvider` async, onboarding e invitaciones por magic link. Los archivos de los documentos ya no los guarda Nido: viven en el Google Drive de quien los sube (27-08-2026), y la familia los ve igual sin conectar nada. La UI consume la frontera de repositorios y elige implementación real o mock según `IS_DEMO_MODE`. El modo demo/mock sigue funcionando como fallback y como entorno de pruebas (e2e).

La app está en producción, en uso diario por la familia y probada en un móvil real (05-08-2026). Lo que queda no es código de producto: dos comprobaciones baratas y funcionalidades que todavía no existen (ver "Siguiente paso recomendado").

## Implementado

### Pantallas / producto

- Inicio / Hoy, con "Esta semana" y lo que va atrasado arrastrado al día de hoy.
- Calendario (eventos, series semanales y anuales, vacaciones como franja). En la
  vista de semana salen también las tareas que vencen, y se pueden marcar allí. La
  agenda se agrupa por días o **por persona** (27-08-2026), con un interruptor sobre
  la lista.
- Tareas: recurrencia, prioridad, dueño (un adulto o un hijo) y quién la marcó.
- Listas e ítems: lo que falta arriba, lo que ya tenéis debajo como catálogo, abierto al entrar (se vuelve a pedir con un `+`, no con un tic), mover un ítem de una lista a otra.
- Búsqueda en listas, tareas, documentos y calendario. La del calendario encuentra
  eventos pasados, no solo los del tramo pintado.
- Comidas (día/semana, copiar día). Las cuatro franjas se activan y desactivan por familia desde Ajustes; apagar una no borra lo apuntado en ella.
- Documentos: subir, abrir, editar, borrar y aviso de caducidad en la tarjeta. Los
  archivos están en el Google Drive de quien los sube y los sirve Nido con el token
  del dueño; el resto de la familia no conecta nada ni se entera de que hay un Drive
  detrás.
- Cumpleaños (27-08-2026): salen de la fecha de nacimiento que ya se guardaba en
  Ajustes, no se apuntan. El de hoy abre la tarjeta de Inicio y los de los próximos
  catorce días van en su bloque; el aviso de las siete felicita el mismo día.
- Deshacer una tarea marcada sin querer, desde el aviso de la barra de estado.
- Ajustes de familia: miembros, invitaciones, hijos, cambio de rol admin/miembro,
  y cerrar una familia entera (un admin, y nunca la última que le queda).
- Cuenta: cambiar contraseña y borrar cuenta (`AccountActions.tsx`).
- Páginas legales públicas `/privacidad` y `/terminos`.
- Modo demo con persistencia en `localStorage`.

### Conexión Supabase (completada)

- Auth real (login/signup, recuperación de contraseña, logout).
- Repositorios reales en `src/lib/supabase-repos/` (un módulo por dominio) + mock en `src/lib/mock-repos.ts`, tras el contrato `src/lib/repos/types.ts`.
- `StoreProvider` async con estados loading/error y `reload()`.
- Onboarding real (`/onboarding` → `create_family_with_admin`) y resolución de familia activa en `AppShell`.
- Invitaciones por email vía magic link (`/api/invite` con service role) y aceptación automática en `/auth/callback` (`accept_family_invite`).
- Documentos en Google Drive (27-08-2026), tras el contrato `DocumentStorageProvider`
  de `src/lib/document-storage/`: subida directa del navegador a Drive por sesión
  reanudable (una función de Vercel no admite 20 MB de cuerpo), lectura por proxy desde
  `/api/documents/[id]/file` con el token del dueño, y tokens cifrados en
  `storage_connections`. Sustituye al bucket de Supabase Storage, que se borró el
  mismo día.
- Gestión de roles desde Ajustes (`update_family_member_role`) con bloqueo del último admin en la UI.
- Detección de modo demo unificada en `src/lib/supabase/env.ts` (cliente, servidor, proxy y API).

### Backend / migraciones

- **`supabase/schema.sql` es el esquema, y es lo único que hay que mirar.** Un archivo
  con la base como está, aplicado en el proyecto real y validado el 26-08-2026 con
  **80/80** (última pasada, 27-08-2026). Las 21 migraciones numeradas que lo precedieron se aplastaron ese mismo día
  y siguen en el historial de git, que es donde va la historia; este documento contaba
  hasta hace poco una lista de migraciones aplicadas que ya se había quedado corta dos
  veces. Cuando el esquema cambie se edita ese archivo, se aplica el `alter` suelto en el
  SQL Editor y se vuelve a pasar `node scripts/validate-rls.mjs`.
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_family_member_profile` (migración 014): nombre y color del miembro, editables por él mismo o por un admin de su familia. Sustituye a `update_my_family_profile`.
- Tabla de invitaciones con policies idempotentes y `with check`.
- ~~Bucket privado `documents`~~: **borrado el 27-08-2026**, con sus cuatro policies y
  las diez comprobaciones que tenía en el arnés de RLS. Nido ya no guarda archivos. La
  sección 5 de `supabase/schema.sql` se queda vacía y con nombre, para que el hueco se
  lea como una decisión y no como un descuido.
- Tabla `storage_connections` (27-08-2026): los permisos de Google Drive de cada persona,
  con los tokens cifrados (AES-256-GCM) y **RLS activada sin ninguna policy**, para que
  solo entre el service role desde una ruta API.
- Triggers de integridad cross-family (`family_id`, `list_id`, `child_id`), incluidos
  los de `tasks` que llegaron con la 015.
- RPCs admin `remove_family_member` y `update_family_member_role` con control de último admin.
- RPC `accept_family_invite(p_invite_id uuid)`.
- Asignación de eventos y documentos a cualquier miembro de la familia, no solo a hijos (migración 012).
- Vacaciones: eventos de varios días por persona, pintados como franja en el calendario (migración 013). Solo se ven en el calendario: fuera de la lista de eventos y de los planes de hoy.
- Perfil del miembro: nombre editable también por el admin, y color propio elegible como el de los hijos (migración 014).
- Tareas con dueño: se asignan a un adulto o a un hijo como los eventos y los documentos, y se guarda quién las marcó (migración 015).
- Caducidad de documentos: fecha opcional, aviso en la tarjeta a 30 días (`DIAS_AVISO_CADUCIDAD`) y en el recordatorio diario (migración 016).
- Adultos sin cuenta: un abuelo se da de alta con nombre y color, sin correo y sin acceso a la app, y se le asigna igual que a un hijo (migración 018). Viven en `children` con `kind = 'adulto'`; el porqué está en «Decisiones de producto» de `docs/architecture.md`.
- `supabase/schema.sql`, el esquema entero en un archivo para levantar un proyecto de cero. Sustituye desde el 26-08-2026 a las 21 migraciones numeradas y al `all_in_one.sql` generado.

### Calidad / infraestructura

- Refactor: constantes, validadores, fechas, selectores, contratos de repos.
- Los 5 sheets con overlay propio (Event, Doc, Task, Item, List) unificados en el `BottomSheet` compartido.
- Código muerto eliminado: stubs `src/lib/repos/*` (salvo `types.ts`), hook `useFamily.ts`, endpoints temporales `/api/check-config` y `/api/diag`.
- Lógica de recurrencia unificada en `src/lib/recurrence.ts` (la usaban por duplicado los repos Supabase, el store mock y `EventSheet`).
- Helpers compartidos: `parseLocalDate()` en `date-utils.ts` y `capitalize()` en `src/lib/text.ts` (antes repetido en 5 componentes).
- Los sheets validan con `src/lib/validators.ts` en lugar de comprobaciones ad-hoc; `EventSheet` ya bloquea hora de fin anterior a la de inicio.
- Métodos de repo sin uso retirados del contrato: `getTodayEvents`, `getUpcomingEvents`, `getPendingItems` (las pantallas derivan con `selectors.ts`).
- Paleta tokenizada: de 54 colores sueltos a 18, y de 109 apariciones a 36. Los tonos casi idénticos (seis verdes claros, cinco blancos cálidos) se unificaron en tokens de `globals.css`. Lo que queda literal son datos (paleta de hijos, prioridades), marca de terceros (logo de Google) y cuatro decorativos de un solo uso.
- PWA: iconos any + maskable + apple-touch, `manifest.json` con purposes (script `scripts/gen-icons.cjs`) y service worker con fallback `/offline`.
- Vistas grandes despiezadas: cada pantalla con estado propio tiene su hook (`useListsState`, `useMealsState`, `useDocsState`, `useEventSheet`) y los bloques de UI viven en su fichero (`WeekGrid`, `MealRow`, `DocCard`, `FileTypeIcon`, `OffDayConfirmDialog`, `LoginHero`, `EventRecurrenceFields`, `EventSeriesDelete`, `ListItemRow`). `EventSheet` fue el último: de 483 líneas a cuatro piezas.
- Andamiaje de sheets unificado: `useSheetForm`/`useSheetDelete` (`src/hooks/useSheetForm.ts`) y los componentes `Field`, `SheetFooter`, `SelectChip` y `DotOption` en `src/components/ui/`.
- **353 tests con el runner de Playwright**, sin dependencias nuevas. Este es el
  **único** sitio con el recuento exacto: el resto de documentos habla de "los
  unitarios" y "los de navegador", o los aproxima, para que no haya seis cifras que
  actualizar a la vez.
  - 277 unitarios de lógica pura en `e2e/unit/` (recurrencia, fechas, selectores, validadores, asignaciones, eventos, tramos y agrupación por persona de la agenda, eje de horas, franjas de comida, detección de modo demo y, desde el 27-08-2026, el almacenamiento de documentos: caducidad del token, URL de consentimiento, traducción de los errores de Google y cifrado de los tokens). No levantan servidor: `npm run test:unit`. Los 19 de `timeline.spec.ts` se fueron con el eje de horas del móvil el 24-08-2026 y **volvieron el 26-08-2026** con las vistas Día y Semana de escritorio, sin tocar una línea.
  - 85 de navegador: `smoke.spec.ts` (login demo → /home), `runtime.spec.ts` (apertura de sheets y flujos CRUD), `movil.spec.ts` (390×844: desbordes y tamaño mínimo de los controles) y `escritorio.spec.ts` (1440 px: barra lateral y rejilla de comidas; 1023 px: que por debajo del corte no cambie nada). `npm run test:e2e` los corre todos levantando el dev server en :3100.
- `scripts/validate-rls.mjs`: validación manual de RLS/RPCs/integridad contra el Supabase real, repetible tras cambios de esquema.

## Correcciones de seguridad

- `my_family_ids()` con `set search_path = public` (evita search path hijacking).
- Eliminada policy de update libre sobre `family_members`; reemplazada por RPC (hoy `update_family_member_profile`).
- `family_invites` update con `using` + `with check`.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app. Sin eso,
  un enlace de correo legítimo podía acabar en otra web justo después de iniciar sesión.
- Cinco cabeceras de seguridad en `next.config.ts`, **CSP incluida** desde el
  26-08-2026 (ver `architecture.md`: lleva `'unsafe-inline'` en los scripts porque Next
  los inyecta, y `connect-src` se arma con la URL real del proyecto).
- Rutas API: el motivo de un fallo va al log del servidor y la respuesta lleva un mensaje
  genérico, en las tres (`/api/push`, `/api/invite`, `/api/account/delete`). La excepción
  es el aviso del último administrador, que es una regla de negocio y hay que leerla.
- Sin `SUPABASE_SERVICE_ROLE_KEY`, las rutas que usan el cliente admin responden 503 en
  vez de reventar con el «supabaseKey is required» de la librería.

## Regla del último admin — DECISIÓN TOMADA

Una familia debe tener siempre al menos un admin. Están prohibidas cuando quedaría cero admins:

- Eliminar al único admin de una familia.
- Degradar al único admin de `admin` a `member`.

**Aplicación en Supabase:** validación mediante RPCs `security definer` (`remove_family_member`, `update_family_member_role`) y bloqueo en `/api/account/delete` cuando borrar una cuenta dejaría una familia compartida sin admin. No se implementa mediante policies RLS. Ver `architecture.md`.

**Aplicación en la UI:** `MemberSheet` bloquea degradar al único admin (calculado en `SettingsView`); el servidor es la validación autoritativa.

**Nota sobre policies:** `Admin gestiona miembros` queda sustituida por `Admin inserta miembros`; UPDATE y DELETE de miembros pasan por RPCs.

## Estado Supabase

- Proyecto Supabase creado, `supabase/schema.sql` aplicado y UI conectada. Comprobado
  contra la base real el 26-08-2026: el esquema responde y las dos últimas cosas que
  entraron —el festivo y las unidades de la lista— están vivas en producción.
- 014 (`update_family_member_profile` + `family_members.color`): la columna existe, la RPC responde y la antigua `update_my_family_profile` está borrada. Editar un miembro funciona en producción.
- App en producción (Vercel) contra el mismo proyecto Supabase que local.
- **Validación aislada completada el 2026-08-03: 47/47 comprobaciones correctas** (RLS por tabla con dos usuarios reales, RPCs, regla del último admin, invitaciones y triggers cross-family). Resultados en `docs/supabase-validation.md`.
- SMTP propio configurado, así que las invitaciones por magic link ya se envían.
- No documentar URLs privadas, anon keys ni secretos en el repositorio.

## Validación Supabase

Sin pendientes. La última pasada es del 27-08-2026, con `node scripts/validate-rls.mjs`
contra la base real y ya con `delete_family` aplicada: **79/79**. Son las 70 del esquema
con los documentos en Drive más las nueve de **cerrar una familia** (§13): que no la
cierra ni un miembro no admin, ni un ajeno, ni un `delete` saltándose la RPC, que nadie
se queda sin familia, y que la cascada se lleva lo que colgaba. Las once que trajo el
paso a Google Drive siguen ahí: siete de `storage_connections` —que **nadie la lee por PostgREST, ni su
propia fila**, que es lo que mantiene los refresh tokens fuera del alcance del
navegador— y cuatro de las columnas nuevas de `documents`, entre ellas que un ajeno no
ve el documento aunque conozca su identificador de archivo de Drive. La limpieza se llevó los tres usuarios y las dos familias
de prueba que quedaban en pie; los datos reales no se tocaron. Detalle en `docs/supabase-validation.md`, que es el sitio donde vive
esto; aquí solo el titular.

## Cerrado el 2026-08-24

- **La parte adulta de la paleta pasa a ocho colores sobrios y sin género.** Salen Rosa
  fuerte y **Mostaza oscura** —la que se confundía con el amarillo de «toda la familia»— y
  entran **Pizarra** (`#536270`) y **Ciruela** (`#6B3F6D`). Los seis infantiles no se
  tocan. Siguen siendo catorce.
  - **Se va la división por género.** Eran «cinco de hombre» y «tres de mujer», y esa
    cuota obligaba a elegir tonos para rellenarla en vez de por cómo se distinguen. La app
    no sabe de géneros: no hay campo para eso.
  - **Medido, no supuesto**: los ocho de adulto llevan blanco y el peor es Ladrillo con
    5,42:1 (antes el peor era 5,25:1, y era justo Mostaza oscura). Ninguno es el
    `FAMILY_COLOR` ni el verde de marca, y el adulto más cercano a ese amarillo pasa de
    confundirse a estar a ΔE00 37 (Cuero).
  - **Lo que cuesta**: once parejas de noventa y una por debajo de ΔE00 15, una menos que
    antes. La más cercana sigue siendo Calabaza clara con Canela clara (5,71), las dos de
    niño; entre adultos aparecen dos roces nuevos, Azul con Pizarra a 7,40 y Vino con
    Granate a 7,71, los dos azul-grises y vinos.
  - **Nada se migra.** Quitar un color de la lista no toca lo guardado: `memberColor`
    devuelve el que la persona tenga y `ColorPicker` no lo marca como elegido. Comprobado
    en el sheet de Ana, que lleva un `#FBC4DC` fuera de paleta: abre bien, conserva su
    color y no marca ninguno.

- **En Inicio, cada lista de casa va en su línea.** Las cestas con algo pendiente iban
  en un `flex-wrap` y dos o tres compartían renglón sin nada que las separase: «Casa
  Compra bebé Cosas de Ana» se leía como una sola cosa con un nombre larguísimo, y con
  nombres cortos era peor porque cabían más en la misma línea. Sigue siendo un solo
  plegable, sin números: que falten dos cosas o siete no cambia lo que haces.

- **Ajustes se agrupa por para qué entras.** Eran once secciones al mismo nivel
  —familia, familias, adultos, otros adultos, hijos, comidas, demo, notificaciones,
  cuenta y legal— en una columna que en móvil no se acababa. Ahora son cinco bloques con
  título humano —«Tu familia», «Personas», «Preferencias de la casa», «Cuenta y
  seguridad», «Legal»— más «Modo demo», y dentro los grupos que hagan falta.
  - **Sin plegables**, y a propósito: el catálogo de las listas y las tareas del día ya
    dejaron escrito cuándo un pliegue ayuda y cuándo estorba. Ajustes no acumula nada y
    se entra con un objetivo concreto.
  - **«Otros adultos» pasa a «Adultos sin cuenta»**, y «Adultos» a «Adultos con
    cuenta»: nombrar la frontera de verdad de la app. «Otros» dejaba a la abuela como un
    adulto de segunda. El vacío de esa lista decía todavía «otros adultos», dos nombres
    para lo mismo en la misma pantalla.
  - **El largo se recorta quitando redundancia, no escondiendo.** La tarjeta de la
    familia cede su «3 adultos · 2 hijos» al resumen de «Personas», que además dice las
    invitaciones; la lista de familias solo sale con más de una (con una repetía el
    nombre de arriba y tocarla no hacía nada); las dos acciones normales de la cuenta
    pasan a ser filas de una tarjeta en vez de dos tarjetas de una línea; y el párrafo de
    las franjas de comida se queda en lo que no es obvio.
  - `Comidas` se llama ahora `Franjas de comida`, y el bloque de demo baja al final,
    separado de las acciones de cuenta de verdad.

- **Vacaciones y descansos: la rejilla orienta, el bloque explica.** Los dos pasan a ser
  lo mismo para el calendario (`isAbsence`): quién no está.
  - **La celda las pinta como una raya fina, y la forma dice de qué clase son.** Unas
    vacaciones son una raya a todo el ancho, redondeada en los extremos del tramo, así
    que varios días seguidos se leen como una barra continua; un descanso es un guion
    corto y centrado, porque es un día y no un tramo. Como mucho dos por celda.
  - **Se probó un tinte cálido en toda la celda y se descartó el mismo día.** Dejaba
    igual una semana entera fuera y un día libre de una persona. Con él se fue
    `absenceEdges` y sus seis tests, que existían solo para redondearlo. Lo que sí se
    queda del intento: la raya es decorativa —nunca un botón de 3 px, que no llegaba al
    mínimo de toque— y el tope de dos.
  - El icono del descanso pasa de una taza a un sillón: no es una pausa para el café, es
    que ese día no puedes contar con esa persona, y a 13 px una taza y una palmera se
    confunden.
  - **`Availability` sustituye a `VacationLegend`** y es la fuente: nombre escrito,
    icono según la clase y el estado en palabras —«de vacaciones hasta el 28 ago» si ya
    ha empezado, «del 3 al 9 sept» si no, «descansa hoy» o «descansa mañana» si es de un
    día—. Una ausencia sale **una vez** por larga que sea.
  - **Los descansos salen de la lista de la agenda**, donde antes se repetían: uno de
    tres días eran tres filas con el mismo texto. Y dejan de contar como punto de
    actividad en la celda, que era pintar la misma cosa dos veces.
  - `selectVisibleVacations` pasa a `selectVisibleAbsences`, y el tramo del que habla el
    bloque es ahora **el mes** y no sus seis filas: contar las semanas hacía que
    anunciara un descanso del 3 de septiembre mirando agosto, sin ningún día pintado
    detrás.
  - Ojo con el alcance: esto es la vista del calendario. `selectTodayEvents` sigue
    sacando los descansos en Inicio, que es de antes y no se ha tocado.

- **En una lista se ve de un golpe qué falta y qué es catálogo.** Los dos grupos pasan a
  tener título propio: «Hace falta ahora», con la cuenta al lado, y «Lo de siempre», con
  el botón de plegar en la misma fila. Antes se sucedían sin separación y la única pista
  era el fondo de la fila.
  - La fila gana dos señales más además del fondo: el peso del texto y la forma (tarjeta
    blanca con sombra para lo pendiente, plano sobre el fondo para el catálogo). Con el
    círculo —tic contra `+`— son tres, así que el color no es la única diferencia. Lo del
    catálogo sigue sin tacharse: cambia de presencia, no de vida.
  - Las tarjetas del índice dicen el estado con palabras y con presencia: «Hace falta:
    leche, pan…» en blanco con sombra, «Al día» plana y apagada. **Sin número de
    pendientes**, a propósito: que falten dos cosas o siete no cambia lo que haces, y es
    la misma razón por la que Inicio no lo lleva. El brief lo dejaba a mi criterio.
  - El nombre del ítem parte por palabras en vez de recortarse (`break-words` con
    `min-w-0`): en una lista de casa el texto es el dato, y «Leche entera sin lac…» no
    sirve. De paso se va la última frase con signos de admiración del repo, que
    `architecture.md` tenía fichada: «Lista vacía. ¡Añade el primer ítem!» pasa a «Esta
    lista está vacía / Apunta lo primero que haga falta».

- **El nombre de la pantalla va en verde de marca.** La cabecera es lo primero que se
  ve y es donde la app dice quién es, así que Calendario, Listas, Tareas, Comidas,
  Documentos y Ajustes dejan la tinta y pasan al verde, como ya hacía el saludo de
  Inicio.
  - Se usa `primary-strong` (#5C7A59) y **no** `primary` (#8BA888), que es el que
    llevaba Inicio. A 18 px el título no llega al umbral de "texto grande" de WCAG, así
    que le toca el 4,5:1 de texto normal: el salvia claro se queda en **2,44** sobre el
    crema y el oscuro da **4,48**. Sigue siendo el mismo verde de la familia.
  - Inicio cambia también, y eso arregla algo de paso: su saludo era el título más flojo
    de la app. Ahora las siete pantallas usan el mismo verde y el mismo contraste. Es
    justo el reparto que `architecture.md` ya describía —el claro para rellenos, el
    fuerte para texto—, aplicado ahora también a los títulos.

- **Icono nuevo de la app.** Pasa de una casa de trazo sobre la tarjeta crema a una
  casa clara maciza sobre el salvia de marca, con dos figuras abstractas dentro (verde
  oscuro y amarillo de familia). Cambian `src/app/icon.svg`, `scripts/gen-icons.cjs` y
  los cinco PNG generados. El `theme_color` del manifest y el `themeColor` de
  `layout.tsx` ya eran ese salvia, así que no hacía falta tocarlos.
  - `CACHE` sube a `nido-v2` en `public/sw.js`. `icon-192.png` e `icon-512.png` están en
    `PRECACHE`: al cambiar su contenido sin subir la versión, un móvil con la app ya
    instalada seguiría sirviendo el icono viejo hasta que la revalidación en segundo
    plano lo pillase.
  - El **porqué** del diseño no está escrito aquí: la decisión no salió de esta sesión.

- **El calendario se rediseña: agenda primero, mes como mapa.** En móvil abre en
  `Agenda` —una tira de siete días para navegar y, debajo, lo que pasa el día elegido
  con su hora y de quién es— y detrás los próximos días con algo. `Mes` es la otra
  pestaña y sirve de mapa: ver dónde hay algo e ir allí. En escritorio no hay pestañas,
  el mes va a la izquierda y la agenda a la derecha. Nada de la lógica de datos cambia:
  ni el CRUD, ni las recurrencias, ni las vacaciones, ni las tareas arrastradas a hoy,
  ni la asignación a personas.
  - **La celda del día es una sola y la comparten la tira y el mes** (`DayCell`), así
    que las dos dicen lo mismo de la misma forma. Se le quitaron los títulos de eventos
    (a 50 px de ancho salían como "09:0…"), el tooltip (única vía de leer el día, y no
    existe con el dedo) y tres de sus cuatro botones. Ahora es un botón que selecciona
    el día y su nombre accesible dice lo que hay en palabras: "lunes, 24 de agosto,
    2 planes, 1 tarea, de vacaciones".
  - **De paso arregla dos incumplimientos del mínimo de toque** que estaban ahí desde
    siempre y que la suite no veía porque los datos de demo no los pintan: la franja de
    vacaciones de la celda (3 px de alto) y el punto de descanso (10×10) eran botones.
    Las vacaciones pasan a señal y se editan desde `VacationLegend`, que gana `min-h-6`;
    los descansos se editan desde la agenda, donde ya salían. *(Las dos cosas cambiaron
    ese mismo día, más abajo: `Availability` sustituyó a `VacationLegend` y los descansos
    salieron de la agenda.)*
  - **La rejilla es de un solo mes.** Se dibuja por semanas completas —si no, las
    columnas dejarían de ser días de la semana— pero los huecos de las puntas van en
    blanco en vez de prestar días de los meses vecinos: agosto pintaba once días de
    julio y septiembre en gris, con la misma forma que los suyos, y se leían como días
    sueltos que no decían de qué mes eran. Se pierde tocar el 1 de septiembre desde
    agosto; se llega con la flecha, que es un toque igual. Con eso, `DayCell` se queda
    sin `isCurrentMonth`: ya no llega ningún día que haya que atenuar por ser de fuera.
  - **La tira marca el mes cuando cruza.** Al ser siete días rodantes, un tramo puede
    caer en dos meses y "30, 31, 1, 2" no dice dónde acaba uno. Solo entonces, el día 1
    lleva el mes en pequeño bajo el número; las otras seis columnas reservan el hueco
    vacío para no quedar más bajas. Va en `aria-hidden`, porque la etiqueta del botón ya
    trae la fecha entera.
  - **"Próximos días" va agrupado por tramos**: "Esta semana", "La semana que viene" y
    después uno por mes. Cerca se piensa en semanas y lejos en meses, que es como se
    habla en casa. La lista era plana de aquí a 45 días y el jueves que viene se leía
    igual que un cumpleaños de octubre; el chip de la fila dice "19 VIE" y no el mes, así
    que ni eso los separaba. Los tramos van respecto al día elegido y no respecto a hoy,
    porque el panel entero arranca ahí, y solo se pintan los que tienen algo dentro. El
    bloque pierde su título visible y gana `aria-label="Próximos días"`, que es lo que
    lo nombra para el lector de pantalla y el asidero de los tests: buscar "Esta semana"
    los habría roto los domingos, cuando ese tramo está vacío.
  - **`movil.spec.ts` gana un test para el modo Mes.** El bucle recorre cada ruta como
    se abre, y el calendario abre en agenda: la rejilla del mes —42 celdas en 390 px, lo
    más denso de la app— no llegaba a pintarse nunca.
  - **Se retira el eje de horas** (`DayTimeline`, `src/lib/timeline.ts` y sus 19 tests
    unitarios). En la estructura nueva no hay sitio para una tercera vista y el detalle
    del día se lee en lista. Lo que se pierde está escrito en `architecture.md`, en la
    decisión derogada.
  - **Dos tests de runtime cambian de forma, no de cobertura.** Las vacaciones se
    contaban por el `title` de la franja y ahora se cuentan por el nombre accesible del
    día, que es la vía que funciona con el dedo. Y el de la tarea diaria: al marcarla ya
    no "desaparece" —la agenda enseña también los próximos días—, así que ahora se
    comprueba que se muda de hoy a mañana, que es lo que de verdad hace.

- **Segunda pasada al calendario móvil: menos ruido en la celda y hoy como titular.**
  El rediseño de esa misma mañana dejó la estructura bien y la densidad a medias: la
  celda podía apilar tres puntos y dos rayas, y el bloque del día elegido pesaba lo
  mismo que los rótulos de los tramos. No cambia ninguna lógica de datos: ni eventos, ni
  recurrencias, ni vacaciones, ni tareas arrastradas, ni asignaciones.
  - **"Mañana" es un tramo propio.** Era la pregunta más frecuente después de "¿qué hay
    hoy?" y se leía igual que el sábado, metida dentro de "Esta semana". Solo sale cuando
    la agenda arranca hoy, así que nunca desordena los rótulos. La función de tramos sale
    del componente a `src/lib/agenda.ts` (`tramoDeAgenda`) con `hoy` como parámetro, y
    con ella llegan 7 unitarios en `e2e/unit/agenda.spec.ts`: un rótulo de fecha falla
    por un día de diferencia y eso no se ve en una captura.
  - **Dos filas de señal por celda como máximo**: hasta dos puntos —o el número, si son
    más— y **una** raya de ausencia. Eran tres puntos y hasta dos rayas: con la madre de
    vacaciones y el padre de descanso, un día pedía tres colores y dos filas para no
    decir más que "hoy falta gente", que es el resumen del día que la agenda vino a
    quitarle a la celda.
  - **La raya de ausencia no se pinta en gris cuando falta más de uno.** Se probó —el
    color ya no es de nadie en concreto— y se vio enseguida que partía la banda de una
    semana de vacaciones con un trozo gris el día que alguien descansaba, que se lee como
    que las vacaciones acaban ahí. Manda la de vacaciones, y la banda sigue.
  - **Hoy es el titular**: rótulo más grande que las versalitas de los tramos y aro verde
    en la tarjeta cuando el día elegido es hoy, el mismo idioma con el que Comidas marca
    hoy entre los siete días.
  - **Cada evento dice de quién es, siempre.** Lo que no es de nadie pone "Familia" en
    gris; antes se quedaba sin texto y solo lo decía el punto amarillo, justo lo que la
    app no quiere: saberse la paleta para entender a quién afecta algo.

- **Limpieza: fuera el código muerto del eje de horas y dos duplicados.** No cambia nada
  de lo que se ve ni de lo que se guarda; es deuda que dejaron los dos rediseños del
  24-08-2026.
  - **Restos del eje de horas.** `extractMinutes` en `date-utils.ts` y la sección
    "Agenda por horas" de `constants.ts` (`DURACION_SIN_HORA_FIN`, `HORAS_MINIMAS_AGENDA`)
    se quedaron sin nadie al retirar `DayTimeline`. Cero usos en `src/`, `e2e/` y
    `scripts/`.
  - **`runMutation` aprende a devolver.** Crear un evento o una serie devuelve lo creado
    —la vista salta a esa fecha—, y por eso los tres tenían copiado a mano el mismo
    `try/catch/finally` que `runMutation` ya encapsulaba. Ahora el motor es
    `runMutationWith<T>(acción, respaldo, mensaje)` y `runMutation` es su caso sin
    retorno. `createFamily` se queda fuera a propósito, y escrito en el código: no puede
    recargar al terminar, porque `switchFamily` ya cambia la familia activa y recargar
    ahí sería hacerlo con el `familyId` de la familia que acabas de dejar.
  - **`AssigneePicker`.** El bloque "Asignar a" estaba copiado letra por letra en
    `EventSheet` y `TaskSheet`; una fila de opciones duplicada es una fila que se cambia
    en un sitio y se olvida en el otro. El de Documentos no entra: allí es una fila de
    `SelectChip` con otra etiqueta y otro orden, y unirlos con una bandera se leería
    peor que las dos versiones.
  - **`SectionLink`, y el pie de Inicio deja de tener cinco versiones.** El enlace del
    pie —"Ver calendario", "Ver todas las tareas"— estaba escrito cinco veces con las
    mismas clases, y una de las cinco se había desviado: "Lo demás por hacer" iba en
    `text-primary-strong` y las otras cuatro en `text-primary`. Cinco copias son justo
    las que hacen falta para que una se quede atrás sin que nadie lo vea. Gana el
    `text-primary` de la mayoría, que es el enlace de la app. **Es el único cambio
    visible de toda la limpieza**, y es un tono de verde en un enlace.
  - Con él, `UpcomingEvents` y `TodayMeals` pasan por `HomeSection`, que ya existía y
    hace justo eso: tarjeta, vacío opcional y pie. Lo reimplementaban a mano mientras
    `HomeTasks` y `PendingItems` sí lo usaban. `TodayEvents` se queda con tarjeta propia
    a propósito: vive dentro del bloque del saludo, con otro fondo y otro redondeo.

- **Un descanso se ve desde la rejilla: el número del día va con el color de quien
  descansa.** Sale de un uso concreto —las abuelas—: si una no está el jueves, eso hay
  que verlo mirando el mes, sin abrir el día. La raya no daba para eso, porque desde el
  cambio de esta mañana sólo se pinta una por celda y manda la de vacaciones: un
  descanso dentro de las vacaciones de otro se quedaba sin ninguna señal.
  - **Círculo y no letra de color, y al 50 %.** La paleta va en dos bandas de claridad y
    `ColorPicker` ofrece las dos a cualquiera, así que la abuela puede tener "Champán
    dorado": escrito sobre blanco da 1,36:1 y no se lee. A color pleno se probó y gritaba
    más que "hoy" —una semana de descansos era una fila de círculos oscuros—, así que se
    bajó al 50 % el mismo día. La rebaja decide el color del número: mezclado con el
    fondo ningún color admite blanco (el peor, 1,17:1) y todos admiten tinta (el peor,
    Vino sobre el crema del hover, 5,26:1).
  - **Manda el día elegido, luego hoy, luego el descanso.** Los dos primeros dicen dónde
    estás y eso pesa más que quién falta; cuando tapan el color, la raya y `Availability`
    lo siguen contando. Las vacaciones no tocan el número: ya tienen la banda.
  - Lo comprueba un test de navegador nuevo que crea un descanso de dos días y mira el
    color exacto del segundo (el primero queda seleccionado al guardar). Un color se
    rompe sin que salte ningún test de estructura.

## Cerrado el 2026-08-25

- **El calendario pasa a ser una lista continua: la vista Programación de Google.** La
  pantalla apilaba siete bandas en 390 px —cabecera con mes y flechas, pestañas, tira de
  siete días, "Vacaciones y descansos", buscador, tarjeta del día elegido y los tramos—
  y se leía como un amontonamiento. El problema no era ninguna banda suelta: eran **dos
  navegadores a la vez** (la tira y la pestaña de mes) y **dos capas de contenido** (el
  día elegido como tarjeta y lo que viene como lista). Quedan dos: cabecera y lista.
  - **Se va la tira de siete días.** `WeekStrip` borrado. Con ella se va el estado
    `inicioSemana`, que existía solo para moverla, y los dos rótulos de `DayCell` que
    solo ella pasaba (la inicial del día y el mes bajo el número): la rejilla tiene
    cabecera de columnas y es de un solo mes, así que nunca los necesitó.
  - **Se va la tarjeta del día elegido.** Ahora el día de arranque es un tramo más de la
    lista, con su rótulo "Hoy" —o su fecha escrita si se mira otro día—. Decía como
    bloque lo que la lista ya dice como fila.
  - **El mes y sus flechas no se pintan en la agenda.** No tenían nada que recorrer
    desde que la lista arranca en hoy: las flechas no movían nada visible y el rótulo se
    quedaba en un mes que no era el que estabas leyendo. En escritorio siguen, que ahí
    la rejilla está a la vista.
  - **Dónde arranca la lista separa las dos pestañas**, y esto salió de mirar una captura,
    no de leer el código: anclada al día elegido, apuntar algo para el 6 de septiembre
    dejaba la agenda empezando en septiembre y desaparecían hoy y toda la semana. En
    agenda arranca en **hoy** y no se mueve; con el mes delante, en el **día elegido**,
    porque ahí tocar un día tiene que enseñar ese día.
  - **Un día sin nada no se pinta**, tampoco el primero, y el chip de la fecha deja de
    ser botón: se anunciaba como "Ver 6 de septiembre" y ya no lleva a ninguna parte.
    Hoy se marca ahí, en el color del chip.
  - `CalendarView` se queda sin `useMediaQuery`: desde que el mes y la agenda no
    comparten estado, quién se ve es cosa de Tailwind (`hidden lg:block`).
  - Tres unitarios nuevos para el tramo de arranque, y los dos asideros de la suite
    pasan a ser las regiones "Hoy" y "Mañana", que valen cualquier día de la semana.

- **Segunda pasada el mismo día, mirando la app y no el código.** La lista continua
  dejaba dos cosas mal, y las dos salieron de abrirla:
  - **El calendario se abría sin enseñar ningún calendario.** La pestaña por defecto era
    la lista, y la rejilla estaba en la otra. Sobre el boceto parecía correcto —la vista
    Programación de Google tampoco tiene rejilla— pero al entrar faltaba algo que mirar.
    Se van las pestañas `Agenda`/`Mes` y el rótulo de la cabecera pasa a ser un botón
    que despliega el mes encima de la lista. Ya no hay que elegir entre ver el mes o ver
    lo que hay, que era una elección falsa.
  - Tocar un día en la rejilla **desliza** la lista hasta él en vez de reencuadrarla:
    reencuadrar escondía todo lo anterior, el mismo fallo que anclarla al día elegido.
  - **El escritorio se veía a medio hacer**, y con razón: no se había tocado. El mes
    estaba encajado en una columna de 380 px con mil píxeles de crema al lado. Ahora la
    rejilla se lleva el espacio libre y la agenda queda en columna fija a la derecha.
  - Y a ese ancho **la celda escribe títulos**: hasta dos con su punto, el resto contado
    y una línea de tareas. Solo en `lg:`; los puntos se quedan para el móvil. No
    contradice la decisión de sacarlos de la celda —la razón era el ancho, y a 50 px un
    título sale como "09:0…"— porque una celda de escritorio pasa de 120 px.

## Cerrado el 2026-08-26

- **Repaso de una auditoría externa: nueve hallazgos, seis arreglados.** El resto se
  queda como está y por escrito, que es la mitad que suele perderse.

  - **Poner solo la hora de fin creaba un evento a medianoche.** `validateEventDraft`
    comparaba `end_time <= start_time`, pero un evento nuevo nace con `start_time`
    vacío y cualquier hora es mayor que la cadena vacía: no saltaba nunca, y
    `eventInsert` lo guardaba con su `|| '00:00'`. Ahora se pide primero la hora de
    inicio.
  - **El cron devolvía 200 aunque Supabase fallara.** Las cuatro consultas ignoraban su
    `error`: si petaba la de suscripciones, la respuesta era `sinSuscripciones: true`,
    indistinguible de un día sin suscriptores, y el cron salía verde en Vercel mientras
    las notificaciones no llegaban. Curiosamente el envío push **sí** contaba sus fallos
    desde hacía días; era la misma lección a medio aprender. Ahora un fallo es un 500 con
    contexto en el log, y `keptAlive` deja de decir siempre que sí.
  - **El aviso de caducidad decía "caduca este mes" de un papel vencido en marzo.**
    Seguir avisando de lo ya vencido cada día es deliberado —un papel caducado no avisa
    por su cuenta, y es lo mismo que hace la tarjeta del documento—, pero eran dos cosas
    distintas metidas en una frase. Ahora son dos.
  - **`.env.example` reparte una clave que la detección de modo demo no reconocía.**
    `your-supabase-anon-key` frente a `your-anon-key`: copiar la plantilla y cambiar solo
    la URL arrancaba contra Supabase con una clave de mentira.
  - **`/api/account/delete` devolvía mensajes crudos de Postgres y del Admin API**, en
    seis sitios y sin registrarlos en ninguno. `/api/push` e `/api/invite` ya hacían lo
    correcto desde antes; esta se había quedado atrás.
  - **El cliente admin se construía con una clave vacía** si faltaba
    `SUPABASE_SERVICE_ROLE_KEY`, y reventaba con un 500 de la librería que no dice qué
    variable falta.

  Los tres que no se tocan, y por qué:

  - **Los sheets se cierran sin esperar a que la escritura termine.** Es cierto, pero no
    es silencioso: `SaveStatus` existe justo para eso y pinta "No se ha guardado el
    cambio" con el motivo. Lo que se pierde es el borrador, y en `DocSheet` también el
    archivo elegido. Arreglarlo bien es `useSheetForm` con `onValid` async más los ocho
    sheets y sus props, y el mock nunca falla, así que la suite no cubriría nada de eso.
    Cuando haya que tocar los sheets por otra razón.
  - **Zona horaria.** `supabase-repos/events.ts` convierte con la del navegador y el cron
    usa `NIDO_TIME_ZONE`. Real, pero arreglarlo de verdad es dejar de guardar las fechas
    familiares como `timestamptz`. Para una familia en Madrid no compensa: queda anotado
    como límite conocido.
  - **Recuento de tests y estado de las migraciones en este mismo documento.** Eran 309
    y la línea que decía 279 llevaba tiempo mintiendo; con el test nuevo son 310. Y lo de
    las migraciones se comprobó contra la base real en vez de dejarlo a medias: la `020`
    y la `021` **están aplicadas** —hay festivos guardados y `list_items.quantity`
    responde con datos—, así que las dos entradas que las daban por pendientes estaban
    obsoletas. `validate-rls.mjs` se volvió a pasar: **69/69**.

  Lo que deja la lección, otra vez: este documento se desactualiza solo, y lo hace en las
  secciones de estado, no en el registro. La lista de migraciones aplicadas se había
  quedado corta dos veces, y por eso desaparece: el estado del esquema ahora se cuenta
  con `supabase/schema.sql`, que es un archivo y no una lista que haya que ir sumando.

- **La CSP tenía su propia idea de qué es el modo demo.** `buildCsp()` en
  `next.config.ts` miraba la URL a mano (`includes('placeholder')`) en vez de preguntar a
  `IS_DEMO_MODE`, que es el único sitio donde esa regla debe vivir. Tercera copia de la
  misma regla, y ya hay precedente de cómo acaba: la de "esto es un plan del día" llegó a
  estar escrita de cuatro maneras y dos se quedaron cortas. Ahora usa `IS_DEMO_MODE` y
  `SUPABASE_URL`, y de paso reconoce una clave de relleno y no solo una URL de relleno.
  Comprobado contra el build servido por los dos lados: con credenciales reales
  `connect-src` sale con la URL del proyecto y su `wss:`; en modo demo, `'self'`.

- **Los festivos y los descansos se colaban en Inicio.** Un festivo apuntado para hoy
  salía en "lo que hay que hacer hoy" y en "esta semana", y el correo de las siete lo
  anunciaba como "tenéis 1 evento". Los descansos, igual. Las vacaciones no: esas eran
  las únicas que el filtro apartaba.

  La causa no era el filtro sino que había cuatro. La regla "esto es un plan del día"
  estaba escrita de cuatro maneras distintas por la app —`!isAbsence && !isHoliday` en
  tres pantallas, la versión larga en `DayCell`, y `!isVacation` a secas en
  `selectors.ts` y en `timeline.ts`— y las dos últimas se quedaron cortas cuando entró
  el descanso (017) y después el festivo (020). Ahora hay **una**: `isPlan(event)` en
  `src/lib/events.ts`, definida como lo contrario de `isRangeKind`, y un test que
  comprueba justo esa equivalencia para que no puedan volver a separarse. El cron arma
  su filtro contra Postgres con la misma lista (`RANGE_KINDS`) en vez de con un
  `.neq('kind', 'vacaciones')` escrito a mano.

  Lo que deja la lección más clara: **los tests también miraban solo las vacaciones**.
  Por eso la fuga sobrevivió dos días en verde. Ahora comprueban los tres tipos, y se
  vio además con una captura de Inicio a 390 px con un festivo, un descanso y un evento
  normal apuntados para hoy: sale el evento, no salen los otros dos.

- **La base de datos deja de contarse en 21 capítulos.** Las migraciones `001…021`,
  `all_in_one.sql` y su generador se aplastan en **`supabase/schema.sql`**, un solo
  archivo que describe la base como está en vez de cómo llegó hasta aquí. El historial
  se queda en git. La equivalencia se comprobó objeto por objeto con un comparador
  escrito para esto —11 tablas, 37 restricciones, 17 índices, 13 triggers, 14 funciones,
  20 policies, 5 grants y las columnas de cada tabla, todo cuadra—, pero **el archivo no
  se ha aplicado nunca a un proyecto vacío**: esa última confirmación la dará quien
  levante uno de cero.

- **Cuatro duplicaciones menores, cerradas.** La guarda de las rutas API (modo demo más
  sesión) estaba copiada en cuatro sitios y pasa a `requiereSesion()` en
  `src/lib/supabase/guard.ts`; olvidarla en una ruta nueva rompe el modo demo entero, así
  que no convenía que dependiera de acordarse. La lista de secciones estaba duplicada en
  `BottomNav` y `SideNav` y ya había divergido —"Docs" abajo, "Documentos" al lado—: ahora
  es una sola en `secciones.ts`, con la diferencia dicha a propósito (`abreviado`, porque
  a 390 px no cabe). Y se fueron los últimos comentarios en inglés de `src/`, uno de
  ellos con una instrucción que dejó de aplicar cuando nació `supabase-repos/`.

- **Repaso de seguridad y refactor de cierre.** La revisión no encontró ningún punto
  crítico: el service role solo vive en las tres rutas API server-side, las que llama la UI
  cortan en demo y validan sesión, `/api/invite` además comprueba que quien invita es admin
  de esa familia, el cron exige `CRON_SECRET` y **falla cerrado** si falta, `safeNextPath`
  rechaza las rutas que no son locales, y la policy de `push_subscriptions` impide robar la
  suscripción de otro. Lo que sí salió fueron tres cosas de endurecimiento y dos
  duplicaciones.
  - **Entra la CSP**, que llevaba meses aparcada con motivo. Lleva `'unsafe-inline'` en los
    scripts —Next los inyecta— así que no para un XSS en línea; sí para cargar scripts de
    otro dominio, `<object>`, el iframe, reescribir `base`, enviar un formulario fuera y
    hablar con cualquier servidor que no sea Supabase. Probada contra el **build servido**
    dos veces: con credenciales reales y con un build en modo demo, recorriendo las once
    rutas y escuchando `securitypolicyviolation`. Cero violaciones.
  - **El `redirectTo` del magic link ya no se adivina.** Caía a `req.nextUrl.origin`, que
    sale de la cabecera `Host`; si `NEXT_PUBLIC_SITE_URL` faltara, un `Host` falsificado
    haría que el enlace —que **inicia sesión**— llevara a otro dominio. Ahora el fallback
    solo vale en local y en cualquier otro sitio se corta.
  - **Las rutas API dejan de devolver el mensaje crudo de Postgres.** Va al log del
    servidor; al cliente, un motivo en castellano. El duplicado de invitación sí se sigue
    contando, que es útil y no revela nada.
  - **La etiqueta de persona estaba escrita cinco veces.** El 50 % del fondo es carga
    estructural —de él dependen las cuentas de contraste— y estaba como literal en cinco
    componentes. Pasa a `fondoDePersona` en `assignees.ts` y a la clase `.etiqueta-persona`.
  - **El fin de semana se calculaba de tres formas**, en tres archivos. Ahora es `isWeekend`
    de date-fns, que de hecho estuvo importado y se perdió al cambiar el relleno por la
    línea. La cabecera de columnas sigue mirando el índice, que ahí no hay fecha.



- **Los días de las puntas del mes se pintan, rellenos en gris.** Cuando septiembre empieza
  en martes, el lunes de esa fila es el 31 de agosto: en blanco, la semana quedaba partida
  por la mitad y la fila dejaba de leerse como una semana. Ahora sale el número en gris
  claro sobre fondo teñido, y lo mismo al final del mes hasta cerrar la última semana.
  - **No es volver atrás.** Estuvieron en blanco desde el 24-08 porque antes se pintaban
    *igual* que los días del mes, solo con el número en gris, y se leían como días sueltos
    sin mes. El relleno es lo que lo arregla: con el fondo teñido ya no tienen la misma
    forma que los suyos.
  - Es el mismo relleno que se descartó para los fines de semana porque "se lee como que
    estas celdas están apagadas". Aquí eso es justo lo que hay que decir.
  - Siguen sin ser botones y sin enseñar nada de lo que pasa ese día: están para cerrar la
    semana. Al 1 de septiembre se llega con la flecha.



- **El móvil gana las vistas Día, Semana y Mes**, con un selector de cuatro:
  `Agenda · Día · Semana · Mes`. Agenda es la lista continua. **El escritorio no se
  toca**: mantiene sus tres y sigue abriendo en Mes.
  - **Los dos abren en Mes.** En móvil esa pestaña no es solo la rejilla: es la rejilla y
    la lista debajo, así que no pierde nada de lo que daba abrir en Agenda y añade saber
    dónde cae cada cosa. No abre en `dia` aunque parezca lo más directo: eso es lo que
    había hasta el 24-08-2026 y se retiró porque lo de mañana y lo del jueves no se veían,
    y un día de familia con dos citas deja diecisiete horas en blanco.
  - Son **dos estados de vista y no uno**: móvil y escritorio no ofrecen lo mismo ni
    arrancan igual, y con uno solo el valor de partida tendría que depender del ancho, que
    no se sabe en el primer pintado.
  - **La semana en móvil se desliza a lo ancho.** A 390 px, siete columnas salen a 43 px y
    no cabe ni "Ped…", que es por lo que esta vista no existía ahí. Con un mínimo de
    110 px por columna se leen los títulos y se recorre pasando el dedo. En escritorio el
    mínimo no llega a aplicarse, así que no cambia nada.
  - **Se va el plegable del mes**, que duró un día: con una pestaña Mes eran dos maneras
    de pedir lo mismo, y la pestaña enseña el mes **y** la lista debajo, que es justo lo
    que daba el plegable.
- **Ajustes sale de la cabecera y baja al final de Inicio** (solo móvil). Arriba a la
  derecha es la esquina más alcanzable del pulgar y la ocupaba algo que se toca dos veces
  al año. En escritorio nunca hizo falta: `SideNav` lo lleva desde siempre.



- **Editar unas vacaciones retrocedía un día la fecha de inicio.** El sheet leía la fecha
  cortando la cadena (`start_at.slice(0, 10)`). Con el mock funciona —guarda la hora de
  pared— pero Supabase usa `timestamptz` y devuelve UTC: unas vacaciones del 17 apuntadas
  en España en verano vuelven como `2026-08-16T22:00:00+00:00`. **Solo fallaba en
  producción**, y por eso la suite entera no podía verlo: corre en modo demo. `initDraft`
  se exporta para poder probarla y llegan dos unitarios que construyen el instante desde
  una fecha local, así que valen en cualquier zona horaria.

- **La semana y el día se veían cortados; ahora el día entra entero.** El eje se recortaba
  a las horas con algo y vivía en una caja con scroll propio. Ahora cubre de 7 a 22 como
  mínimo y el alto de una hora se calcula en CSS (`--alto-hora`), con suelo de 28 px.
- **La cabecera dice qué estás mirando**: "24 – 30 de agosto" en semana, "Jueves, 27 de
  agosto" en día. Antes siempre ponía el mes y las flechas parecían de mes; ahora se ve
  que mueven la semana o el día, y sus etiquetas accesibles lo dicen.



- **Las ausencias se marcan con una franja arriba, sobre un carril gris.** Tercera vuelta
  del día y la que se queda, y la primera que sale de medir en vez de mirar.
  - **La posición** dice que dura: arriba del todo, fuera del flujo donde van las cosas del
    día, así que no se confunde con la etiqueta de un evento.
  - **El carril gris** dice que hay algo, siempre con el mismo peso, y el color solo lo
    rellena. Es lo que arregla el problema de fondo: una barra maciza de "Champán dorado"
    sobre blanco da 1,37:1 y "Vino" da 9,30:1 —siete veces—, porque la paleta va en dos
    bandas de claridad. Con carril, el color deja de cargar con "¿se ve o no?".
  - **La regla que sale de aquí**, y que conviene no olvidar: el color puede decir "de
    quién", nunca "qué" ni "si". Con daltonismo rojo-verde varios colores de la paleta se
    juntan —Coral claro con Melocotón son indistinguibles—, así que si el color fuera la
    única vía, esas familias perderían información.

- **Las ausencias pasan a teñir la celda con la trama de día libre, en el color de quien
  falta.** La etiqueta con nombre duró unas horas: el problema apareció al convertir los
  títulos de los eventos en etiquetas de color, porque entonces unas vacaciones y una cita
  se leían igual y solo las distinguía el ancho. Y la banda se partía en el borde de cada
  celda: de lunes a viernes eran cinco trozos, no una barra.
  - Una trama no tiene ese problema —interrumpida por una línea de pelo se sigue leyendo
    como una sola cosa— y además reutiliza un idioma que ya existía: "aquí no se trabaja".
    Unas vacaciones son eso para quien las tiene; la diferencia es de quién, y eso lo
    lleva el color (`--trama`).
  - **El nombre sale de la celda.** Lo dice `Availability`, una sola vez, que es la fuente.
  - En la vista Semana no cambia nada: allí las ausencias van en la franja de "todo el
    día", separadas de los bloques de hora, y no se confunden con nada.

- **Las unidades se ven también fuera de la lista**: en el desplegable de "Listas de casa"
  de Inicio y en los resultados de búsqueda, pegadas al nombre —"Pañales talla 1 ×2"— y
  solo cuando pasan de una. Es "dos leches", no dos cosas distintas, por eso van pegadas
  al nombre y no en una columna aparte.
  - **Lo que no se pone es el total por cesta.** Se probó y se quitó el 04-08-2026, y las
    dos razones siguen valiendo: el número no decide nada —que falten dos cosas o siete no
    cambia lo que haces— y pegado al nombre de la lista se leía como parte de él, "Casa 2".
    Lo que sí decide, cero o algo, ya lo dice el bloque apareciendo o no.
  - En el catálogo tampoco: ahí el número no es del nombre.

- **Repaso al formulario y a la fila de la agenda.**
  - **El título de los sheets, en verde.** Un solo cambio en `BottomSheet`, que los
    comparten todos: nuevo evento, nueva tarea, nueva lista, añadir ítem, añadir documento
    y añadir comida. Es el título de lo que estás haciendo, como el nombre de la pantalla
    en la cabecera.
  - **"Qué es" pasa de cuatro botones a un desplegable.** Con el cuarto tipo ocupaban dos
    filas enteras del formulario para una decisión que se toma una vez y casi siempre es
    la de por defecto. Un desplegable ocupa una línea y aguanta el quinto tipo sin
    reordenar nada. Los tests pasan de `click` a `selectOption`.
  - **Fuera el punto de color de la fila de la agenda**, que era el último que quedaba: el
    nombre se lleva el color al fondo, como en la celda del mes. De paso **"Familia"
    recupera su color**, que lo había perdido —iba en gris porque el amarillo no llega al
    contraste como texto, y al 50 % de fondo sí vale—. Lo mismo en las tareas del día,
    que comparten tarjeta y no pueden hablar de dos maneras.
  - **Fuera el `+` de cada fila**: la cabecera ya tiene el suyo y el formulario deja elegir
    la fecha. Con él se fue la última cosa que leía la fecha entera en voz alta, así que
    el chip gana un `sr-only` con la fecha completa: a la vista "13 JUE" basta, a oídas se
    leía "trece jueves".



- **La lista de la compra lleva unidades.** Migración `021`: `list_items` gana `quantity`,
  un entero con `check` entre 1 y 99 y `default 1`, para que lo que ya existe no cambie de
  significado. Hasta ahora la cantidad se escribía dentro del propio nombre ("leche x2"),
  que se lee peor, no se puede cambiar sin reescribirlo y ensucia el catálogo de "lo de
  siempre", donde el nombre tiene que quedar limpio para volver a pedirlo.
  - **Entero y no texto libre**, a propósito: en el súper se toca, no se teclea, y un
    número admite los dos botones. Lo que no cabe —"2 kg", "media docena"— se sigue
    escribiendo en el nombre, que es donde ya se escribía.
  - **Los botones viven en la fila**, no dentro del ítem: se tocan con una mano y sin abrir
    nada. Miden 28 px, por encima del mínimo de 24×24. En 1 no se escribe el número ni se
    ofrece el menos: "×1" es decir lo que ya dice la fila, y un botón que no hace nada
    ocupa sitio e invita a pulsarlo.
  - **Solo en lo que hace falta**, no en el catálogo: "lo de siempre" es una lista de
    nombres para volver a pedir, y el número es de esta compra, no del nombre.
  - `SCHEMA_VER` del mock sube a **9**: cambia la forma de lo guardado en `localStorage`.
  - ~~Pendiente: aplicar la `021` en el SQL Editor.~~ **Aplicada.** Confirmado contra la
    base real el 26-08-2026: la columna existe con datos y las seis comprobaciones de
    `validate-rls.mjs` pasan.



- **El escritorio gana las vistas Día, Semana y Mes.** El trio de Google Calendar, con su
  selector en la cabecera. En móvil no existe: esa pantalla es la lista continua con el
  mes plegable, y la semana en columnas no cabe a 390 px.
  - **Día y Semana son la misma vista** (`Timeline`) con una columna o con siete.
  - **El motor volvió del historial sin tocar una línea.** `src/lib/timeline.ts` y sus 19
    unitarios se retiraron el 24-08-2026 con el eje de horas del móvil; se recuperaron de
    ese mismo commit y pasan en verde a la primera. Con ellos volvieron `extractMinutes`,
    `DURACION_SIN_HORA_FIN` y `HORAS_MINIMAS_AGENDA`, que se habían borrado por muertos el
    24-08 y resultaron no estarlo del todo.
  - No contradice haber quitado la semana en columnas: la razón era el ancho —a 390 px
    una columna son ~45 px— y a 1440 px pasa de 170.
  - **Con Día o Semana no hay lista al lado**, como en Google: con ella la rejilla se
    queda sin el ancho que un bloque necesita. La lista acompaña al mes.
  - El eje es **uno solo para las siete columnas**, calculado sobre lo que hay en todas:
    con siete ejes distintos no se podría comparar un martes con un jueves.
  - Vuelve el `useMediaQuery` que se había ido el 25-08: ya no vale esconder con CSS,
    porque escritorio y móvil pintan cosas distintas y las dos quedarían en el DOM —y la
    lista pone un `id` por día que se duplicaría.
  - Arranca en `mes` y no en `semana` como Google: es lo que ya había, y cambiar de vista
    al entrar sorprendería sin pedirlo.

- **Los títulos de la celda del mes abren su evento.** Estaban pintados y muertos desde
  que se añadieron el 25-08: la celda era un solo botón y un botón no puede llevar
  botones dentro, así que iban como spans en `aria-hidden` y pulsarlos seleccionaba el
  día. La celda pasa a ser un contenedor con el botón del día arriba y un botón por
  título. En móvil no cambia nada: allí no hay títulos.

- **La rejilla se dibuja como una rejilla, y las ausencias dicen de quién son.** Dos cosas
  que salieron de mirar una captura del mes en escritorio.
  - **No había ni una línea.** Eran números flotando en un fondo blanco, y una pantalla
    grande con pocos eventos se leía como un vacío en vez de como un calendario. Ahora las
    celdas llevan borde, solo en `lg`: a 50 px las líneas son más ruido que estructura, y
    en móvil la rejilla se lee bien por proximidad.
  - **La raya de las ausencias pasa a ser una etiqueta con el nombre.** Con la rejilla ya
    dibujada se vio por qué no convencía: una rayita de color bajo la fecha se lee como un
    subrayado, no dice "vacaciones" y no dice de quién. Y lo de la "barra continua" no se
    sostenía, porque se parte al cambiar de semana. Ahora pone "Mamá" —o "Familia"— sobre
    su color al 50 %, se redondea donde el tramo empieza y acaba, y caben dos por celda.
    En móvil el nombre no cabe y se queda la barra de color.
  - Siguen sin ser botones: en móvil una barra de 4 px no llega al mínimo de toque de
    24×24, y las ausencias se editan desde `Availability`, que es su sitio.
  - **Se deroga el color del número en los descansos**, que duró dos días. Con la etiqueta
    con nombre eran dos señales para lo mismo, y el número decía menos y no era fiable:
    hoy y el día elegido le ganaban, así que un descanso hoy no se veía. Su razón de ser
    tampoco seguía en pie —nació porque con vacaciones de otro la raya no se pintaba— y
    ahora caben dos etiquetas por celda.
  - **Los días sin trabajo llevan trama diagonal**: sábado, domingo y festivo, los tres
    igual, con una sola clase (`dia-libre`). Antes se probaron dos cosas y se descartaron
    el mismo día: rellenar la celda en crema —una masa de color se lee como "apagado", y
    el finde en una casa es cuando más pasa— y una línea vertical donde acaba la semana
    laboral, que a tamaño real no se distinguía de las otras líneas de la rejilla.
  - **El título del evento se lleva el color al fondo y se va el punto.** El punto de 6 px
    era una segunda cosa que mirar para decir lo que ya puede decir el propio título, y
    obligaba a leer dos elementos por evento en una celda de 120 px.
  - **El nombre de una ausencia se escribe una vez por banda, no en cada día.** Unas
    vacaciones de lunes a viernes ponían "Sofía" cinco veces seguidas. Se escribe donde la
    banda empieza a la vista: el primer día del tramo, y el lunes cuando viene de la
    semana anterior. Ojo con el alto: los días de en medio van sin texto y sin `min-h` la
    etiqueta se quedaba en cero y la banda desaparecía a partir del segundo día.
  - **Un festivo sin nombre propio no escribe nada**: "FESTIVO" sobre una celda que ya va
    con trama es decirlo dos veces y gastar la única línea de texto de la celda. El título
    por defecto se sigue guardando —la búsqueda y el sheet lo necesitan— pero la celda
    solo escribe el nombre cuando dice algo que la trama no dice: "Hispanidad".
  - **En "Vacaciones y descansos", el nombre se lleva el color y se va el punto**, como en
    la celda: eran dos cosas que mirar para decir una, quién.
  - **El festivo no sale en la lista ni cuenta como punto.** No es un plan: la lista
    contesta "¿qué hay que hacer?" y un festivo es cómo es el día. Salía como una fila con
    su "Todo el día" entre la revisión del coche y la cena. Tampoco lleva chip en la
    celda: la trama ya dice que lo es y el chip lo diría dos veces; queda su nombre en
    versalitas grises, que responde a la otra pregunta, cuál es.
  - **Se pinta en gris, no en la paleta.** Un festivo no es de nadie: darle el amarillo de
    "Familia" lo confundiría con unas vacaciones de todos, y en Nido el color significa
    persona. Va en gris en la celda, en la franja de la vista Semana y en la lista, donde
    además dice "Festivo" en vez de un nombre.
  - **No es una ausencia**, y por eso se queda fuera de `isAbsence`: una ausencia dice
    quién no está disponible y un festivo es una propiedad del día. Sí entra en
    `isRangeKind`, un helper nuevo que sustituye al `kind === 'vacaciones' || kind ===
    'descanso'` que estaba escrito a mano en seis sitios y que habría habido que tocar en
    los seis.
  - El título es opcional, como en los otros dos de rango: sin él se guarda como
    "Festivo". Y los nacionales no vienen puestos a propósito: los de la comunidad, los
    del pueblo y los del colegio no salen de ninguna lista que sirva para todos.
  - ~~Pendiente: aplicar la `020` en el SQL Editor de Supabase.~~ **Aplicada.** Confirmado
    contra la base real el 26-08-2026: hay festivos guardados y el `check` rechaza los
    tres casos malos. Las cinco comprobaciones están en `validate-rls.mjs`.

  - **Y las ausencias aparecen en Semana y en Día**, que no aparecían: `partirEventosDelDia`
    deja fuera las vacaciones —su sitio era la raya de la rejilla, y ahí no hay rejilla—
    así que una semana entera de vacaciones no salía por ninguna parte. Un descanso sí,
    pero como evento de todo el día titulado "Descanso", sin decir de quién. Ahora las dos
    van en la franja de arriba con el mismo idioma: "Sofía · descansa", "Familia ·
    vacaciones".

- **Pendiente de decisión: sincronizar Google Calendar por usuario.** El login con
  Google ya está montado sobre Supabase, así que el proyecto en Google Cloud existe y el
  baile de OAuth está hecho; la sesión trae `provider_token` y `provider_refresh_token`,
  pero Supabase **no** refresca el del proveedor: habría que hacerlo contra Google.
  Lo que bloquea no es código: añadir el scope de calendario vuelve la pantalla de
  consentimiento "sensible", y o se deja la app en modo Prueba —sin verificación, pero
  **el permiso caduca a los siete días**— o se publica y se pasa la verificación de
  Google, que son semanas y no dependen de nosotros.

- **Cada pantalla dice su nombre una sola vez.** En Documentos, Listas y Comidas el
  nombre salía dos veces: en la cabecera fija, que lo pinta para todas las rutas, y otra
  vez como título del contenido. Se van los cuatro `h1` repetidos (Comidas tenía uno de
  móvil y otro de escritorio) y se igualan a Calendario, que nunca tuvo título propio y
  es la que se lee mejor. Tareas ya estaba así. La línea pequeña de debajo se queda,
  porque cuenta lo que la cabecera no dice: cuántos documentos hay, cuántas listas tiene
  la familia, qué semana estás viendo.
  - De paso, el título de `TopBar` pasa de `span` a `h1` —el de la ruta y el saludo de
    Inicio—. El preflight de Tailwind reinicia tamaño, peso y margen de los encabezados,
    así que no se mueve un píxel, y las siete pantallas recuperan un `h1`: hasta ahora
    Calendario tampoco tenía. El `h1` de una lista abierta se queda, que ahí sí es el
    único título; los dos tests de escritorio que lo buscaban se acotan a `main h1`.

- **Deuda técnica menor, sin efecto en la app.** `safeFileName` (documentos de Supabase)
  reutiliza `normalizaParaBuscar` en vez de repetir a mano el paso a minúsculas y el
  despojo de tildes, y el recorte de guiones sobrantes que compartía con `legalSectionId`
  se va a `text.ts` como `recortaGuiones`. Y tres exports sin ningún consumidor fuera de
  su archivo pasan a privados: `FAMILY_ASSIGNEE`, `DEFAULT_FAMILY_ID` y `compararTexto`.

- **La paleta de personas pasa a catorce colores, y dos de ellos no son cálidos.** Cinco
  de hombre adulto (entran **Azul** `#4A6C8C` y **Verde bosque** `#3D5C42`), tres de mujer,
  tres de niña y tres de niño. Los valores vienen calculados desde fuera del repositorio y
  entraron **exactamente** como se pidieron, sin reinterpretar ninguno. La descripción
  canónica está en `architecture.md`; aquí lo que importa es qué se comprobó y qué chirría.
  - **Comprobado, no supuesto**: los catorce llegan a 4,5:1 con el color que les elige
    `textColorOn` —los ocho de adulto con blanco (el peor, Mostaza oscura, 5,25:1) y los
    seis de niño con tinta (el peor, Canela clara, 6,92:1)—, y ninguno coincide con
    `FAMILY_COLOR` ni con el verde de marca. Lo verifica el test que ya existía.
    *(La parte adulta se rehízo ese mismo día, más abajo: Mostaza oscura salió y el peor
    pasó a ser Ladrillo con 5,42:1.)*
  - **Dos cifras del encargo no cuadraban** y conviene que quede dicho, porque los valores
    sí se respetaron: los adultos son los **ocho** primeros y los niños los **seis**
    últimos (el encargo decía «6 primeros» y «8 últimos»), y el peor contraste de adulto
    con blanco es 5,25:1, no 4,88:1. Ninguna de las dos cosas cambia un hexadecimal.
  - **Lo que se pierde**: separación perceptual. La pareja más cercana son Calabaza clara y
    Canela clara, a ΔE00 5,71 (ΔE76 15,8), las dos de niño; antes la peor pareja estaba en
    12,3. Doce de las noventa y una parejas quedan por debajo de ΔE00 15. Es el precio de
    meter catorce colores en dos bandas de claridad estrechas y no se ha tocado nada por
    ello.
  - Nada dependía del número diez: `defaultMemberColor` y `memberColor` reparten con
    `PERSON_COLORS.length` y `ColorPicker` es un `flex-wrap` de círculos de 36 px, así que
    con catorce hace dos filas y ya. Lo único que había que corregir eran dos comentarios
    con el recuento a mano, uno de ellos ya viejo de la versión de diez.

- **En Inicio, "Lo demás por hacer" desaparece si no hay nada pendiente.** Antes enseñaba
  una tarjeta que decía "La casa está al día" y ocupaba lo mismo que tres tareas. Los otros
  vacíos de Inicio se quedan: el del menú y el de la compra cuentan algo que se hace
  ("improvisar también cuenta"), no solo que no hay nada. `HomeSection` pasa a aceptar
  vacío opcional para que una sección pueda devolver `null` en vez de fingir contenido.

- **Las franjas de comida se eligen, y son de la familia.** En Ajustes → Comidas salen
  las cuatro con un interruptor cada una; lo que se apaga desaparece de la rejilla de la
  semana, de la lista de móvil, de "Hoy", del menú de Inicio y del formulario de apuntar.
  Migración **019**, `families.meal_slots text[]`.
  - **Se guarda en la familia y no en el móvil** porque «en casa no merendamos» es un
    hecho de la casa. El porqué de esto y de las otras dos reglas —ocultar no borra,
    siempre queda una— está en «Decisiones de producto» de `architecture.md`.
  - **Aplicada y validada el mismo día**: 58/58, con siete comprobaciones nuevas en el
    arnés (§9 de `supabase-validation.md`). El código aguanta las dos situaciones de todas
    formas: si la columna no existiera, `mapFamily` la normaliza a las cuatro franjas y la
    app se ve igual. Es lo que permite desplegar el código antes que el SQL.
  - No hace falta policy nueva: `families` ya tenía la de update de la 002, así que esto
    lo cambia un admin, igual que el nombre. Y por lo mismo hereda su límite conocido: la
    UI ofrece el interruptor a cualquiera, y a un miembro no admin el guardado le va a
    fallar. Es el mismo agujero que tiene renombrar la familia, no uno nuevo, y arreglarlo
    pide que el store sepa quién eres.
  - Lo que **no** se filtra: copiar un día sigue copiando el día entero, franjas ocultas
    incluidas. Lo copiado tampoco se ve, así que no cambia nada en pantalla, y es
    coherente con no borrar.
  - `src/lib/meal-slots.ts` con la lógica (normalizar, encender/apagar, filtrar) y 19
    unitarios nuevos. El caso vacío significa «las cuatro», nunca «ninguna»: eso cubre a
    la vez una familia de antes de la 019, un `localStorage` viejo y el intento de
    apagarlas todas.
  - `SCHEMA_VER` del mock sube a **8**, que es lo que borra el `localStorage` con la forma
    vieja de `Family`.

- **El catálogo de una lista entra abierto.** Entrar en una lista es casi siempre ir a
  apuntar de lo de siempre, y el pliegue era un toque de más en el camino principal. Se
  pliega a mano y no se recuerda. Cambia una decisión de producto que estaba escrita al
  contrario, así que está anotada de nuevo en `architecture.md` con el motivo.

- **La paleta vuelve a ser la original.** Crema `#FAF7F2`, tinta `#252525`, salvia
  `#8BA888`, terracota `#D8A48F`, amarillo `#E9C46A` y rojo `#D96C6C`. Se retiran las dos
  paletas cálidas que se probaron el 21 ("Cocina de casa" y, encima, "Mediterráneo"): es
  una decisión de producto, no un problema técnico.
  - `src/app/globals.css` se restauró tal cual estaba antes de la primera —los 46 tokens
    tienen el mismo nombre en las tres paletas, así que volver es cambiar valores— y con
    él el `#d4cfc9` del pulgar de la barra de scroll, que se había tokenizado a
    `line-strong` (no era el mismo color: `line-strong` es `#D8D4CE`).
  - Los cuatro literales de marca que viven fuera de `globals.css` vuelven también:
    `themeColor` en `layout.tsx` (`#8BA888`), `FAMILY_COLOR` en `constants.ts`
    (`#E9C46A`), el par crema/marrón de la tarjeta de calma en `TodayEvents.tsx`
    (`#F1E6D8` / `#9A6B55`) y, en el `<style>` del login, el fondo del foco (`#fffdf9`),
    el `rgba` del anillo (el rgb de la salvia) y la sombra de la tarjeta (el del
    charcoal). `public/manifest.json` y `src/app/icon.svg` no se habían tocado nunca, así
    que vuelven a cuadrar solos.
  - **Se queda el aro `ring-ink/15`** de los puntos de color del calendario
    (`DayCell.tsx`). Llegó con la paleta nueva, pero no es un color: es el borde que hace
    visible un punto claro sobre un fondo claro, y sobre este crema —que es más claro
    todavía— hace más falta, no menos. Por lo mismo la marca de descanso no recupera su
    `border-white`, que sobre crema escondía en vez de separar.
  - **El contraste empeora, y es sabido.** Con la salvia, `bg-primary text-white` da 2,61
    y `text-primary` sobre el crema 2,44 (las paletas retiradas estaban en 4,16-5,55).
    Tampoco cumplen `accent` (2,18 y 2,04), `muted-soft` (2,56) ni, por poco,
    `primary-strong` (4,48), `sand-strong` (3,69) y `danger-strong` (4,40 sobre
    `danger-soft`). El punto 6 de "Siguiente paso recomendado" —medir el contraste de la
    paleta— sigue abierto y ahora tiene más que medir.

## Cerrado el 2026-08-21

- **Páginas legales: quién responde, y más fáciles de recorrer.** Privacidad decía
  "Responsable de Nido" y ahora dice quién es; términos añade la misma
  identificación, que antes solo estaba en privacidad. Y las dos ganan un índice de
  secciones con anclas y una línea de separación entre secciones, que se leían como un
  bloque corrido.
  - El índice sale de inspeccionar los hijos en `LegalShell` (`Children.toArray` +
    `isValidElement`), no de una lista por props: así las páginas no repiten su propia
    tabla de contenidos, que es justo el dato que se queda viejo al añadir una sección.
  - Los `id` salen de `normalizaParaBuscar` (`src/lib/text.ts`), que ya bajaba a
    minúsculas y quitaba tildes, para no tener dos formas de normalizar texto.
  - La línea la lleva cada sección con `first-of-type:border-t-0`: el párrafo de entrada
    es un `<p>`, así que la primera `<section>` sigue siendo la primera de su tipo y la
    cuenta sale sin pasar índices.

- **Paleta nueva: "Cocina de casa".** *(Revertida el 2026-08-24, junto con
  "Mediterráneo" que la sustituyó ese mismo día. Se queda escrito por lo que se aprendió
  midiendo, que está resumido en `architecture.md`.)* Crema `#F2E6D8`, tinta `#4A3728`, terracota de
  marca, oliva de segundo acento y amarillo `#C9A227`. El rojo de peligro se queda.
  Estructura de tokens intacta: solo cambian los valores.
  - **La terracota de marca no pudo ser la pedida.** `#B5651D` no llega a 4,5:1 en
    ninguno de sus dos papeles: 4,34 con blanco encima (`bg-primary text-white`, 12
    sitios) y 3,53 como texto sobre el crema (`text-primary`, 57 usos y mucho de 9-12
    px). Se usa `#A15408`, el más claro de ese mismo tono que cumple los dos: 5,55 y
    4,51. Son 6,6 puntos de L* más oscuro y se nota.
  - Las variantes se derivaron por búsqueda, no a ojo: para cada una se buscó la más
    clara de su familia que cumple su restricción. Así salieron `muted` (4,53 sobre
    `surface`, que era lo justo), `sand-strong` (4,56 sobre `bg-sand/30`) y
    `danger-strong`, que **sí** se ajustó aunque el rojo no: es una variante derivada y
    con el crema más oscuro el `#B24D4D` de antes se quedaba en 4,21.
  - Los neutros salen de la tinta y del crema, no de un gris: un gris neutro sobre
    fondo cálido se ve azulado.
  - De paso, seis colores de marca que vivían fuera del sistema: el `themeColor` de la
    PWA, el par crema/marrón de la tarjeta de calma en Inicio, el sage oscuro de los
    chips del login, y en el `<style>` del login el fondo del foco, el `rgba` del anillo
    (era el rgb del sage viejo) y la sombra de la tarjeta (el charcoal viejo).
  - Dos efectos colaterales, ya corregidos. `FAMILY_COLOR` era **exactamente** el token
    `sand` y al cambiar la paleta dejó de coincidir sin que nada avisara: pasa a
    `#C9A227`, con lo que sube de 1,36:1 a 1,97:1 sobre el crema y se separa del verde
    manzana de los niños de 13,9 a 19,0.
  - Y los colores claros de persona se perdían sobre el crema (rosa chicle 1,22:1). Se
    arregló con un aro `ring-ink/15` en los puntos del calendario, **no repintando la
    paleta**: repintarla no se podía. Con la escala por claridad (mujer clara, niña más
    clara), todo cálido, y la banda de niña oscurecida para verse, el rosa de niña se
    queda literalmente sin hueco: cae encima del rosa fuerte de mujer. La búsqueda dio
    cero candidatos. Un punto claro sobre fondo claro es un problema de borde, no de
    color, y así queda resuelto para cualquier paleta futura.
  - **Queda pendiente**: siete colores de persona están a menos de ΔE 15 de algún color
    de marca nuevo —ladrillo 13,0 y cuero 9,5 del terracota, oliva 8,3 del oliva de
    marca, rosa fuerte 11,6 y coral 11,8 del rojo de error—, porque la paleta de marca
    se ha metido en la misma banda cálida que la de personas. No se ha tocado: son
    papeles distintos (un punto de persona no compite con un botón), pero conviene
    mirarlo si algún día se ven juntos. Y el logo `src/app/icon.svg` sigue con la paleta
    vieja.

- **Escritorio en Tareas, Listas y Documentos.** Segunda tanda, con el mismo criterio
  que el piloto: todo desde `lg`, nada por debajo. Tareas en dos columnas, Listas en
  rejilla (dos desde `lg`, tres desde `xl`) con la lista abierta hasta 768 px, y
  Documentos en rejilla con los filtros sin arrastre. Home y Ajustes se quedan.
  - El patrón que salió de aquí y que conviene repetir: la rejilla va en el contenedor
    que ya existe y la cabecera ocupa la fila con `lg:col-span-2`, para no meter un div
    nuevo. Y hay que apagar el `space-y-*` con `lg:space-y-0`, porque el margen entre
    hermanos se suma al `gap` de la rejilla.
  - Se descartó la vista de dos paneles en Listas (índice a la izquierda, lista abierta
    a la derecha). No es CSS: `ListsView` devuelve un árbol distinto cuando hay lista
    seleccionada, así que sería reestructurar el componente y cambiar qué significa
    abrir una lista.
  - Nueve tests más en `escritorio.spec.ts`, y la mitad son del lado de 1023 px. La
    regla "ni una clase por debajo de `lg`" se comprobó además leyendo el diff: de las
    16 líneas de clases tocadas, ninguna perdió una clase base.

- **Layout de escritorio: barra lateral desde `lg`.** `BottomNav` se va con `lg:hidden` y
  entra `SideNav`, una columna de 224 px a la izquierda con las seis secciones más
  Ajustes. Por debajo de `lg` no cambia nada: lo único que se tocó fuera de `lg:` fueron
  comentarios.
  - Comidas ya tenía el tratamiento de escritorio que se pedía —rejilla de siete días
    desde `md`, con `WeekList` para el teléfono—, así que el trabajo real fue otro: con
    `SideNav` quitando 224 px, el mínimo de 860 px de `WeekGrid` dejaba de caber y la
    rejilla pasaba a arrastrarse en horizontal justo donde sobra sitio. Las columnas se
    aprietan en `lg` a 112 + 7×84 = 700 px y entran enteras.
  - Para poder apretarlas hubo que sacar `gridTemplateColumns` de un `style` en línea:
    un estilo en línea gana a cualquier clase y no admite variantes por ancho. El valor
    base de la clase es idéntico al de antes, y el test de 1023 px lo comprueba leyendo
    la primera columna (132 px, sin apretar).
  - `e2e/escritorio.spec.ts` es nuevo y son doce tests: la suite entera corría en un
    Pixel 7, así que nada vigilaba el layout ancho.
  - Quedan sin tocar Home, Tareas, Listas y Documentos: siguen siendo la columna de móvil
    centrada en escritorio. Era el piloto.

- **Unas vacaciones y un descanso se apuntan sin escribir título.** El tipo ya dice lo
  que son, así que pedir un nombre era pedir que alguien se inventara un texto para
  poder pulsar el botón. El campo sigue estando —"Playa con los abuelos" o "Turno de
  noche" valen la pena— pero es opcional, y el placeholder enseña con qué nombre se
  guardará si se deja vacío. La descripción ya era opcional y ahora lo dice.
  - `title` no es nullable en la base y hay sitios que lo enseñan (la franja del
    calendario, la etiqueta accesible del botón, el recordatorio diario), así que
    `eventTitleOr` en `src/lib/events.ts` lo rellena al guardar. Se rellena ahí a
    propósito, y no se deja vacío para que cada pantalla se invente su texto de reserva:
    eso es lo que dejó a Inicio sin la marca de los eventos de familia en su día.
  - Un plan sí sigue exigiendo título: "una cita" sin más no dice qué hay que hacer el
    jueves a las cinco.

- **La paleta de personas: diez colores cálidos, agrupados por a quién representan.**
  *(Superada el 24-08-2026: ahora son catorce y dos no son cálidos. Se queda escrito por
  los números, que explican de dónde vienen las bandas de claridad.)*
  Tres de hombre adulto, tres de mujer adulta, dos de niña y dos de niño. Se llegó aquí
  en tres pasos el mismo día, y los dos primeros están anotados porque explican los
  números.
  - **El punto de partida**: doce pasteles que no servían para distinguir a nadie.
    Dieciséis parejas por debajo de ΔE 20 (CIEDE2000) y la peor —lavanda y lila— en 5,3,
    con el umbral de "se nota" en 2. Cuatro de los doce eran rosas.
  - **La versión intermedia** estaba elegida para aguantar el daltonismo rojo-verde, y
    llegó a 18,4 de separación. Se descartó **por fría**: ese criterio obliga a repartir
    los tonos por todo el círculo, así que salían azules, verdes fríos y violetas, y una
    app de casa no se ve como una casa con eso. Queda escrito porque es la explicación de
    por qué la paleta de ahora separa menos.
  - **La de ahora** está en ΔE 12,3 en la peor pareja (rosa chicle y lila, las dos de
    niña): más del doble que el punto de partida, pero por debajo de la intermedia. Con
    daltonismo baja a 3,6, y eso ya no es un criterio: se retiró a propósito.
  - Cinco de los diez tienen que leerse como femeninos, así que caen en la misma banda de
    rosas y la separación sale de la claridad, no del tono: las mujeres en L* 64-70 y las
    niñas en 78-84. Las franjas esquivan L* 52-62, donde ni el blanco ni la tinta llegan
    a 4,5:1 encima del color y no cabe un grupo entero.
  - Dos cosas que salieron al medir y no se ven a ojo: el mostaza era **exactamente**
    `FAMILY_COLOR` y el verde salvia **exactamente** `--color-primary`, así que se podía
    elegir a mano el color que significa "de toda la familia" o el verde de la app. Los
    dos fuera desde entonces.
  - Once de los doce originales no aguantaban las iniciales blancas que la app les pone
    encima. Ahora **los diez pasan 4,5:1** (el peor, 5,39:1) porque la inicial ya no va en
    blanco a pelo: `textColorOn()` elige blanco o tinta según el fondo. De paso arregló
    sitios que no eran de la paleta: la etiqueta de "toda la familia" en Inicio y en
    Documentos iba en blanco sobre amarillo, a 1,67:1.
  - Se midió también si el amarillo `#E9C46A` era el mejor color para "toda la familia",
    y sí, con diferencia: está a 13,9 del color de persona más cercano de la paleta actual
    (34,1 de la intermedia), y todos los neutros que parecerían más lógicos —piedra, lino,
    gris, pizarra— son peores. Un gris tiene poca saturación y converge con los colores de
    persona en cuanto se pierde el tono. Sin cambios ahí.
  - El orden es el de los grupos, que es como se eligen. Tiene una consecuencia conocida:
    `defaultMemberColor` reparte por posición cuando nadie ha elegido, así que a los dos
    primeros adultos les tocan dos colores de hombre. Es un valor por defecto que se
    cambia de un toque, y la app no sabe de géneros: no hay campo para eso ni se añadió.
  - Los colores viven en la base como texto, así que nadie pierde el suyo: los existentes
    se quedan como están hasta que se cambien a mano.

- **Adultos sin cuenta (los abuelos)**: en Ajustes hay tres bloques —Adultos, Otros
  adultos e Hijos— y el de en medio permite dar de alta a alguien con un nombre y un
  color, sin correo y sin acceso a la app, solo para poder asignarle eventos, tareas
  y documentos.
  - Van en `children` con `kind = 'adulto'` (migración 018), no en `family_members`:
    esa tabla cuelga de `auth.users` con `user_id not null` y de ella depende toda la
    seguridad. El razonamiento completo, en «Decisiones de producto».
  - En «asignar a» salen con los adultos, no al final con los hijos: `splitPeople`
    en `src/lib/assignees.ts`.
  - El sheet lo dice en una línea, para que nadie espere una invitación: «No entra en
    la app ni recibe invitación».

- **Descansos familiares en el calendario**: se añade un tipo de evento `descanso`
  para marcar días de baja de un miembro o hijo, con una marca circular en la
  celda del calendario y sin saturar la vista. Las vacaciones siguen siendo una
  franja de varios días, y los descansos quedan como señal clara de
  disponibilidad.
  - La lógica vive en `src/lib/events.ts` y comparte la misma semántica que el
    resto de eventos: una persona descansa si el evento cubre ese día y la
    asignación coincide.
  - El formulario de eventos deja crear un descanso con un rango de fechas y la
    asignación correspondiente.
  - La comprobación de disponibilidad ya existe para saber si "puedes contar con
    esa persona" ese día.

## Cerrado el 2026-08-06

- **La semana del calendario pasa a ser el día por horas.** *(Superada el 24-08-2026: el rediseño del calendario retiró el eje de horas entero. Se queda escrito porque explica por qué existía y qué se pierde al quitarlo.)* Antes era una lista de
  siete días; ahora, con la semana plegada, se ve el día elegido sobre un eje de
  horas, con cada cita en su hora y con el alto de lo que dura. Es la vista "Día" de
  un calendario al uso. La de siete columnas se descartó a propósito: a 390 px cada
  columna son ~45 px y los bloques se quedan sin texto, que es también por lo que
  Google no la pone por defecto en el móvil.
  - La aritmética (colocar, medir, repartir los solapados y recortar el eje) vive en
    `src/lib/timeline.ts`, sin React y con 19 tests en `e2e/unit/timeline.spec.ts`.
  - Dos decisiones que los datos no traían: un evento **sin hora de fin** se dibuja
    con 45 min (`DURACION_SIN_HORA_FIN`), y las **tareas**, que vencen pero no
    ocurren a una hora, van en la franja de "todo el día" junto a los eventos de todo
    el día. Las vacaciones siguen fuera, en la franja de la rejilla.
  - El eje **se recorta a las horas que tienen algo**, con una hora de margen y un
    suelo de seis (`HORAS_MINIMAS_AGENDA`): un día de dos citas no es medio metro de
    blanco. La raya de la hora actual va por debajo de los bloques, que si no tachaba
    los títulos.
  - `AgendaList` pierde el modo semana y se queda con lo suyo: **los próximos
    eventos** (con el mes desplegado) y **los resultados de una búsqueda**, que
    atraviesa el calendario entero y no cabe en un día. Las tareas de un día salieron
    a `DayTasks`, que usan las dos vistas.

- **La agenda del calendario, repasada en móvil.** Se revisó a 390 px con la app
  abierta, no leyendo el código, y salieron cuatro cosas:
  - **La tira y la lista enseñaban semanas distintas.** Arriba, la semana natural del
    día elegido (3→9); abajo, siete días desde hoy y en realidad ocho (6→13). Las
    flechas movían solo la de arriba. Ahora las dos comparten un único tramo rodante
    de siete días, `inicioSemana` en `CalendarView`, que empieza hoy porque es donde
    cae lo atrasado. La cabecera de la rejilla dejó de ser fija: si el tramo abre en
    jueves, la primera columna es J.
  - **El calendario abría enseñando tareas.** Ver "Lo atrasado se arrastra al día de
    hoy" en `architecture.md`: desde tres tareas en un día van plegadas bajo un
    resumen que dice cuántas hay y cuántas van tarde.
  - **El nombre de quien lleva la tarea se comía el título.** No cedía nunca y el
    título cedía siempre. Ahora tiene tope de ancho y se recorta él primero.
  - **Menos mueble antes del primer plan**: la cabecera de la agenda pasó de dos
    líneas a una, y un día sin nada ocupa menos alto que uno lleno.

  De paso, apuntar un evento fuera de la semana visible vuelve a llevar la vista a su
  día: al compartir tramo, `handleCreate` tenía que mover también la tira.

## Cerrado el 2026-08-05

- **Fase 2 del roadmap (QA visual) hecha** a 390×844, que es más estrecho que el
  Pixel 7 con el que corre el resto de la suite. Nueve pantallas revisadas una a
  una. Salieron y se arreglaron: un color repetido entre un adulto y un hijo,
  títulos de tarea comidos por las etiquetas, un "Sin planes" en un día que sí
  tenía tareas y cinco controles por debajo del mínimo de toque. Lo que se puede
  comprobar sin teléfono queda fijo en `e2e/movil.spec.ts`.
- **Probada en un móvil real, sin incidencias.** Es lo que la suite no puede ver: corre
  sobre un Pixel 7 *emulado*, y una emulación no tiene teclado que se abra encima de un
  sheet ni scroll con inercia.
- Migraciones 015 (tareas con dueño) y 016 (caducidad de documentos) aplicadas en producción.
- Búsqueda en tareas, documentos y calendario.
- Deshacer una tarea marcada sin querer, y lo atrasado arrastrado al día de hoy.
- `safeNextPath` cierra el salto a otra web desde el enlace del correo, y
  `next.config.ts` añade cabeceras de seguridad.
- `scripts/gen-vapid.cjs` para generar las claves de push sin tener que recordar el comando.
- Repaso del camino de las notificaciones, que nunca se había ejecutado: el emisor ya
  cuenta y registra los envíos fallidos en vez de tragárselos (un `sent: 0` significaba
  a la vez "día tranquilo" y "falló todo"), no cuenta las vacaciones como evento del
  día, y la tarjeta de Ajustes explica en iPhone que hay que instalar la app en vez de
  decir que el navegador no admite avisos.
- `EventSheet` despiezado en cuatro.
- `supabase/validate_rls.sql` borrado. Hacía lo mismo que `scripts/validate-rls.mjs`
  pero peor: simulaba a los usuarios con `SET LOCAL ROLE` y claims de JWT inventadas
  en vez de autenticarlos de verdad, y obligaba a sustituir placeholders a mano.
- `all_in_one.sql` pasa a generarse (`scripts/gen-all-in-one.mjs`). Se mantenía a
  mano, que es la manera de que un día deje de coincidir con las migraciones sin que
  nadie se entere. El fichero generado es SQL-idéntico al que había.

## Cerrado el 2026-08-04

- `CRON_SECRET` configurada en Vercel: `/api/cron/reminders` responde 200 con
  `keptAlive: true`, así que el keep-alive de Supabase ya funciona.
- Migraciones 012 y 013 confirmadas en la base de producción.
- Cambio de contraseña dentro de la app: existe en `AccountActions.tsx` (cerraba el
  hueco de las personas invitadas, que entran sin contraseña).
- Páginas `/privacidad` y `/terminos` con `cerredax@gmail.com` como contacto público.
- **Invitación de punta a punta probada con éxito** en producción: el correo llega, el
  enlace da de alta en la familia y la persona ve los datos.
- Migración 014 verificada en la base real (ver "Estado Supabase").
- Bug de zona horaria corregido, código y datos: los eventos se guardaban bien pero se
  leían en UTC, y el error se acumulaba en cada edición. Las horas que habían quedado
  desplazadas ya están corregidas en producción.

## Siguiente paso recomendado

La app está en producción y en uso diario por la familia, y probada en un móvil
real. Lo que queda son dos comprobaciones baratas y funcionalidades que no existen.

### Los cumpleaños (27-08-2026)

Una casa se acuerda de los cumpleaños o no se acuerda, y la app tenía la fecha de
nacimiento de cada uno guardada desde el principio sin hacer nada con ella. Ahora la usa.

**Lo que lo hizo pequeño**: un cumpleaños no se guarda, se deduce. Es lógica pura
(`src/lib/birthdays.ts`) sobre datos que el store ya tiene, así que no hay tabla, ni
migración, ni nada que mantener sincronizado cuando alguien corrige una fecha. El porqué
completo, y lo que se descartó —crearlos como eventos recurrentes—, está en «Decisiones de
producto» de `docs/architecture.md`.

Dónde sale:

- **En Inicio**, partido en dos porque no se leen igual: el de hoy abre la tarjeta de hoy
  con la tarta y el color de la persona, y los siguientes catorce días
  (`DIAS_AVISO_CUMPLE`) van en su bloque «Cumpleaños», que no se pinta si no hay ninguno.
- **En el aviso de las siete**, delante de las tareas y de los papeles que caducan, y solo
  el mismo día.

**Solo los hijos y los adultos sin cuenta**, que son los que llevan `birth_date`. Los
miembros con cuenta se quedan fuera: darles fecha de nacimiento obliga a un `alter` en la
base real y a cambiar la RPC del perfil, y esto no lo pedía.

**En el calendario no sale**, y no es olvido: la agenda contesta «qué hay que hacer» y un
cumpleaños no es un plan. Si se echa de menos ahí, se añade a propósito.

Los dos bordes del calendario que podían salir mal están probados en
`e2e/unit/birthdays.spec.ts`: el 29 de febrero se celebra el 1 de marzo en los años que no
lo tienen, y el cumpleaños que ya pasó salta al año siguiente en vez de desaparecer.

### Copia de seguridad de la familia (27-08-2026)

Un botón en Ajustes → "Tu familia" que descarga un `.json` con todo. La decisión que
lo hizo pequeño: **el store ya tiene en memoria todo lo de la familia activa, y ya
filtrado por RLS**, que es exactamente lo que significa "tus datos". Así que es
lógica pura sobre lo que la pantalla ya tenía: ninguna ruta API, ningún
`service_role`, ninguna tabla, ninguna dependencia. Y funciona en modo demo, que es
lo que permite que la suite lo pruebe descargando el archivo de verdad.

No nació de una idea, nació de una incoherencia: `/privacidad` ya prometía que
puedes "exportar tus datos" y `/terminos` recomienda **dos veces** "conservar copias
de la información importante", sin que la app diera manera de hacerlo. La promesa
existía y el mecanismo no.

**Qué no lleva, y no es olvido:** `storage_connections` (son tokens de Google Drive;
un refresh token no baja a la carpeta de Descargas ni por accidente) y
`push_subscriptions` (endpoints técnicos de cada navegador, que no son datos de la
familia). Hay un test unitario y otro de navegador que lo comprueban sobre el archivo
real, porque es lo que podría colarse en silencio.

Los **archivos** de los documentos tampoco: están en el Drive de quien los subió, que
es un disco de verdad con su propia papelera. Va la ficha, con `storage_path` y
`storage_owner`, que es el puntero para volver a encontrarlos.

#### El camino de vuelta

No hay pantalla de restauración a propósito: es bastante maquinaria para algo que
pasará cero o una vez, y con el archivo delante se resuelve con un script. Pero el
camino tiene que estar escrito **antes** del desastre, así que:

1. Las claves de `datos` son los nombres de las tablas tal cual. Se insertan en
   orden de dependencias: `families` → `family_members` → `children` → `lists` →
   `list_items`, `events`, `tasks`, `meal_plans`, `documents`, `family_invites`.
2. **El obstáculo real son los usuarios.** Si el proyecto Supabase desapareció,
   `auth.users` desapareció con él, así que `family_members.user_id`,
   `documents.created_by` y `documents.storage_owner` apuntan a identificadores que
   ya no existen. Hay que crear las cuentas primero y traducir esos ids. Todo lo
   demás entra tal cual.
3. Los documentos siguen en el Drive de su dueño y sus identificadores de archivo no
   cambian, así que las fichas restauradas vuelven a abrirlos en cuanto esa persona
   reconecte.

#### Lo que se dejó fuera

- **Copia automática semanal.** El cron ya corre a diario y con Drive conectado
  podría dejar el JSON en la carpeta Nido. Encaja, pero una copia manual de un toque
  cubre el caso; la automática se añade si se demuestra que nadie pulsa el botón.
- **Cifrar el archivo.** Lleva DNI, informes médicos y fechas de nacimiento de los
  niños, así que la tarjeta lo dice: *guárdalo donde guardarías los papeles*. Una
  contraseña que se olvida convierte la copia en nada.
- **CSV o PDF.** Un segundo formato es un segundo formato que mantener.

### El cambio a Google Drive, cerrado (27-08-2026)

**Desplegado y funcionando.** Esquema aplicado y validado (80/80), bucket borrado,
las cuatro variables en Vercel, consentimiento de Google en "In production", commit
`3fd216e` en producción y la CSP comprobada contra el dominio real: `connect-src`
incluye `www.googleapis.com`.

Quedan **dos comprobaciones sin hacer**, y se anotan en vez de darlas por buenas:

- **Abrir un documento desde una segunda cuenta de la familia** sin Drive conectado.
  Es el corazón del diseño —el proxy sirviendo con el token del dueño— y es lo único
  que de verdad lo prueba.
- **Subir un archivo de 10-15 MB.** Por debajo de ~4 MB la subida funciona igual
  aunque el camino directo a Google estuviera roto, porque cabe en el cuerpo de una
  función de Vercel. Solo un archivo grande distingue las dos cosas.

Lo demás quedó hecho así:

1. **Aplicar el esquema** en el SQL Editor: las dos columnas de `documents` y la tabla
   `storage_connections`, tal y como están en `supabase/schema.sql`. Después,
   `node scripts/validate-rls.mjs` y anotar el resultado en `docs/supabase-validation.md`,
   que ahora mismo lleva una nota de PENDIENTE.
2. **Google Cloud**: habilitar la Drive API, crear el cliente OAuth con la URI de
   redirección exacta y —lo que rompe en silencio si se olvida— dejar la pantalla de
   consentimiento **"In production"**, no "Testing". En Testing, Google caduca los
   refresh tokens a los 7 días. Ver `docs/produccion.md` §2.4.
3. **Las cuatro variables** en Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI` y `DOCS_TOKEN_KEY`.
4. **Volver a subir los cuatro documentos que había en el bucket**, ya con Drive
   conectado. Están rescatados en `Downloads/nido-documentos-bucket/`, con sus fichas
   en `fichas.json` (nombre, categoría, de quién, caducidad) para poder recrearlas
   iguales. Después, borrar las cuatro filas viejas:
   `delete from public.documents where storage_path like '%/%';`

   *Aquí se estuvo a punto de perder algo.* Se dio por hecho que en el bucket había
   "un solo archivo de prueba que no merecía el viaje" **sin haberlo mirado**, y eran
   cuatro documentos de verdad: dos DNI, un certificado de nacimiento y una tarjeta
   sanitaria. Los cuatro se descargaron y se verificaron (PDF de 1 página y tres JPEG
   a resolución completa) antes de borrar nada. La lección es la de siempre en este
   repositorio, aplicada a los datos y no a la interfaz: mirar, no deducir.
5. **QA a mano del flujo entero** (`docs/testing-checklist.md` §8.1), contra
   `npm run build && npm run start` y con dos cuentas de la misma familia. Playwright
   no puede cubrir esto: la suite corre en modo demo forzado y sin credenciales.

### Las comprobaciones que quedaban: ninguna

Las dos que había aquí se cerraron el 06-08-2026:

- **RLS revalidado** tras las migraciones 015 y 016: 51/51. Los triggers de `tasks`
  saltan de verdad, que era la duda — que estuvieran escritos no probaba que lo
  hicieran.
- **El cron corre solo** a las 07:00 UTC y devuelve `keptAlive: true`, comprobado en
  los logs de Vercel. Supabase no se va a pausar por inactividad.

### Funcionalidades que faltan, no riesgos

3. **Notificaciones push**: el código está completo y `CRON_SECRET` ya está puesta.
   Las claves VAPID se generan con `node scripts/gen-vapid.cjs`; falta ponerlas en
   Vercel y **volver a desplegar** (las `NEXT_PUBLIC_*` se hornean en el build). Sin
   ellas el botón de activarlas no aparece y el cron responde
   `skipped: 'VAPID no configurado'`. Ver `docs/notificaciones.md`.
4. ~~**Backup/export de datos de la familia.**~~ **Hecho el 27-08-2026** (ver
   "Copia de seguridad" más abajo). Lo que sigue siendo verdad, y por lo que era
   insustituible: con
   los documentos en Drive el riesgo cambia de forma más que de tamaño: los archivos
   están ahora en una cuenta de Google de verdad (con su propia papelera y su propio
   backup), pero a cambio dependen de que esa persona siga en la familia y con el
   permiso dado. El calendario y las fichas siguen en un único proyecto Supabase del
   plan gratuito, sin exportación.

### Decisión abierta

5. **Google Play (TWA)**: falta el package name definitivo,
   `public/.well-known/assetlinks.json` (necesita el SHA-256 de la firma) y la guía
   `docs/play-store.md`. La PWA y la política de privacidad ya están.

### Después

6. Medir el contraste de la paleta (el resto de la revisión de accesibilidad —roles,
   labels, foco, `inert` en los sheets— está hecha, Fase 8 del roadmap).
