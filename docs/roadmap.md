# Roadmap

Este roadmap prioriza estabilidad y simplicidad. No busca convertir Farpi en SaaS.

## Fase 1 - Cierre pre-Supabase ✅

Objetivo: dejar el MVP mock y las migraciones listas para una primera subida segura.

- ✅ Corregir validación de documentos (MIME, tamaño, sin conversión silenciosa).
- ✅ Hacer idempotentes las policies de Storage.
- ✅ Añadir `with check` a update de Storage y `family_invites`.
- ✅ Alinear `Child.birth_date` con nullable.
- ✅ Mejorar RPC `create_family_with_admin` (nombre normalizado).
- ✅ Endurecer RLS de `family_members` (eliminar policy de update libre, añadir RPC segura).
- ✅ Añadir `set search_path = public` a `my_family_ids()`.
- ✅ `.gitignore` actualizado.
- ✅ Playwright eliminado (sin tests, sin config, sin binarios).
- ✅ Decidir y documentar la regla del último admin.
- ✅ `npm run lint` sin warnings.
- ✅ `npm run build` sin errores.

## Fase 2 - QA visual del MVP mock

Objetivo: detectar problemas baratos de corregir antes de depender de datos reales.

Hecha el 2026-08-05 a 390×844 (iPhone normal, más estrecho que el Pixel 7 con el
que corre el resto de la suite): capturas de las nueve pantallas revisadas una a
una, más comprobaciones automáticas que quedan fijas en `e2e/movil.spec.ts`.

- ✅ Ninguna pantalla desborda a lo ancho.
- ✅ Ningún control por debajo de 24×24 px (mínimo WCAG 2.5.8).
- ✅ Revisadas Inicio, Calendario (semana y mes), Tareas, sheet de tarea, Listas,
  detalle de lista, Comidas, Documentos, Ajustes y login.
- ✅ Flujos CRUD y persistencia en `localStorage`, cubiertos por la suite e2e.
- ✅ Bottom nav y navegación entre secciones.

Lo que salió y se arregló está en el commit correspondiente: el color repetido
entre un adulto y un hijo, títulos de tarea comidos por las etiquetas, "Sin
planes" en un día que sí tenía tareas y cinco controles demasiado pequeños.

**Probada en un móvil real el 2026-08-05, sin incidencias.** Es lo que ni
Playwright ni Chromium podían ver, porque la suite corre sobre un Pixel 7
*emulado*: emulación no tiene teclado que se abra ni inercia de scroll.

- [x] Teclado real abriéndose sobre un sheet: el footer fijo no lo tapa.
- [x] Scroll con inercia y toques accidentales al pasar el dedo por las filas.
- [ ] Safari de iOS, si la prueba fue en Android: es otro motor.
- [ ] PWA instalada: icono, splash, safe-area del notch y la barra inferior.

Documento guía: `docs/testing-checklist.md`

## Fase 3 - Validación Supabase ✅

Objetivo: validar base de datos, RLS, RPCs y Storage contra el proyecto real.

**Cerrada el 2026-08-03 con 47/47 comprobaciones correctas.** Se hizo con
sesiones de usuario reales (JWT → PostgREST → RLS), no con `set role` desde el
SQL Editor, así que valida el mismo trayecto que recorre la app. Resultados en
`docs/supabase-validation.md`.

- ✅ Crear proyecto Supabase y subir migraciones.
- ✅ Tablas, columnas, índices, triggers y policies revisados.
- ✅ RPCs probadas: `create_family_with_admin`, `update_family_member_profile`,
  `remove_family_member`, `update_family_member_role`, `accept_family_invite`.
- ✅ Aislamiento entre dos familias con dos usuarios reales.
- ✅ Bucket privado `documents` y signed URLs.
- ✅ Resultados documentados.

No es una fase que se cierre para siempre: se repite con
`node scripts/validate-rls.mjs` después de tocar una migración, una policy o una
RPC.

**Al día (21-08-2026)**: las 017 y 018 se aplicaron en Supabase y el script volvió a
dar 51/51 ese mismo día.

**Al día (24-08-2026)**: la 019 (franjas de comida) se aplicó en Supabase y el script pasó
a 58/58. Las siete comprobaciones nuevas son suyas: reutiliza la policy de update de la
002, así que lo que se comprueba es que esa policy sigue siendo solo de admin y que el
`check` de la columna aguanta. No queda nada pendiente hasta la próxima migración.

## Fase 4 - Repositorios Supabase ✅

Objetivo: implementar acceso a datos real sin reescribir pantallas.

- ✅ Repos reales con interfaces de `src/lib/repos/types.ts` (`src/lib/supabase-repos/`).
- ✅ Familia, miembros, invitaciones.
- ✅ Hijos, eventos, tareas.
- ✅ Listas e ítems, comidas, documentos (metadata).
- ✅ RPC `remove_family_member` para borrar miembros.
- ✅ RPC `update_family_member_role` para cambiar roles.
- ✅ RPC `accept_family_invite` para aceptar invitaciones.
- ✅ `useFamily.ts` experimental eliminado; patrón de repositorios definitivo en uso.

## Fase 5 - StoreProvider async ✅

Objetivo: cambiar de mock síncrono a datos async.

- ✅ Estados loading y error.
- ✅ Cargar familia activa (resuelta en `AppShell`).
- ✅ Soportar usuario sin familia (onboarding real).
- ✅ Mantener modo demo como fallback.

## Fase 6 - Documentos reales ✅

Objetivo: conectar Supabase Storage.

- ✅ Upload real con validación MIME y tamaño.
- ✅ Metadata en tabla `documents`.
- ✅ Descargar o abrir documento (signed URLs, 60 s).
- ✅ Borrar archivo y metadata.

## Fase 6b - Los archivos, al Drive de quien los sube (27-08-2026)

Objetivo: que Farpi deje de guardar archivos. La ficha se queda en la base; el papel
vive en el Google Drive de quien lo sube, y la familia lo ve igual **sin conectar
nada ni saber que hay un Drive detrás**.

- ✅ Contrato `DocumentStorageProvider` (`src/lib/document-storage/types.ts`), con
  Google Drive como primera y única implementación. Dropbox ("App folder") y OneDrive
  (Microsoft Graph) caben sin rediseñar: una clase y un valor más en el `check`.
- ✅ Scope `drive.file` y nada más — no sensible, sin verificación ni CASA.
- ✅ Modelo proxy para leer: el archivo lo sirve Farpi con el token del dueño, con la
  RLS de siempre por delante. El proveedor es el disco, no decide permisos.
- ✅ Subida directa del navegador a Drive por sesión reanudable: por el servidor no
  caben 20 MB.
- ✅ Tokens cifrados (AES-256-GCM) en `storage_connections`, con RLS y **sin policies**.
- ✅ Conectar solo hace falta para subir, y se ofrece dentro del sheet de subir.
- ✅ Aviso con nombre cuando la conexión del dueño se cae, y al quitar a un miembro
  que tiene documentos subidos.
- ✅ Esquema aplicado en el SQL Editor y revalidado el 27-08-2026: **80/80**.
- ✅ Google Cloud: Drive API, cliente OAuth y consentimiento **"In production"** — en
  "Testing" los refresh tokens caducan a los 7 días.
- ✅ Las cuatro variables en Vercel y vuelto a desplegar.
- ✅ Bucket borrado (27-08-2026), con sus policies y las diez comprobaciones que tenía
  en el arnés de RLS. Los cuatro documentos que había dentro —dos DNI, un certificado
  de nacimiento y una tarjeta sanitaria— se descargaron y verificaron antes, junto con
  sus fichas, y ya están vueltos a subir con Drive.
- [ ] QA a mano del flujo entero con dos cuentas (`docs/testing-checklist.md` §8.1).

## Fase 7 - Invitaciones reales ✅

Objetivo: convertir invitaciones mock en flujo usable.

- ✅ Crear invitación por email (magic link vía `/api/invite`).
- ✅ Aceptar invitación en `/auth/callback` → `accept_family_invite` crea `family_member` y marca `accepted`.
- ✅ Cancelar invitación.

## Fase 8 - Pulido

Objetivo: preparar uso diario.

- ✅ PWA: iconos any + maskable + apple-touch, manifest con purposes y service worker offline (fallback `/offline`).
- ✅ Mejoras responsive (lo que salió de la Fase 2, arreglado el 05-08-2026).
- ✅ Tests: un solo runner, Playwright — los unitarios (`npm run test:unit`) y los de
  navegador entre `smoke`, `runtime` y `movil` (`npm run test:e2e`). El recuento
  exacto está en `docs/project-status.md`.
- ✅ Revisión de accesibilidad: BottomSheet como diálogo (role/aria/Escape/foco/inert), botones de icono etiquetados y label↔input asociados en los sheets.
- ✅ Descansos familiares en el calendario, con rango y lógica de disponibilidad para
  saber si puedes contar con alguien. El marcador circular por día con el que entraron se
  fue el 24-08-2026: ahora es un guion corto bajo el número y una fila con nombre en el
  bloque «Vacaciones y descansos».
- ✅ Adultos sin cuenta: los abuelos se dan de alta en Ajustes sin correo y se les
  puede asignar lo mismo que a cualquiera. `kind` en `children`, y tres grupos dentro del
  bloque «Personas» de Ajustes: «Adultos con cuenta», «Adultos sin cuenta» e «Hijos»
  (se llamaban «Adultos» y «Otros adultos» hasta el 24-08-2026).
- ✅ Paleta de personas medida y rehecha (21-08-2026): diez colores cálidos agrupados por
  a quién representan (3 hombre, 3 mujer, 2 niña, 2 niño). La peor pareja pasa de ΔE 5,3
  a 12,3, y los diez llegan a 4,5:1 con la inicial encima —blanca o en tinta, la que
  contraste— cuando antes once de los doce no llegaban ni a 3:1. Pasó por una versión
  intermedia optimizada para daltonismo (18,4 de separación) que se descartó por fría.
  - Revisada dos veces más el 24-08-2026: primero a **catorce** colores, y después la
    parte adulta a **ocho sobrios y sin división por género**. Salió Mostaza oscura, que
    era la que se confundía con el amarillo de familia, y entraron Pizarra y Ciruela. El
    peor contraste de adulto queda en 5,42:1 y once de las noventa y una parejas por
    debajo de ΔE00 15. La descripción canónica está en `architecture.md`.
- ✅ Rediseño de cuatro pantallas (24-08-2026), sin tocar lógica de datos:
  - **Calendario**: agenda primero y mes como mapa. Se retiró el eje de horas
    (`DayTimeline` y `src/lib/timeline.ts`), la rejilla dejó de prestar días de los meses
    vecinos y «próximos días» va en tramos («esta semana», «la que viene», los meses).
  - **Listas**: los dos grupos con título propio, «Hace falta ahora» con su cuenta y «Lo
    de siempre» con el plegable en la misma fila.
  - **Ajustes**: cinco bloques por intención en vez de once secciones al mismo nivel.
  - **Cabecera**: cada pantalla dice su nombre una sola vez, y en verde de marca.
- ✅ **El calendario, rehecho en dos días** (25 y 26-08-2026). El detalle está en
  `project-status.md`; en orden de trabajo:
  - La pantalla de móvil pasó a **lista continua** —la vista Programación de Google— y se
    fue la tira de siete días (`WeekStrip`, borrado).
  - **Escritorio ganó Día, Semana y Mes**, y con ellas volvió `src/lib/timeline.ts` con
    sus 19 unitarios, retirado el 24-08 y recuperado intacto.
  - **Móvil ganó las mismas** más Agenda: cuatro pestañas, con la semana deslizándose a
    lo ancho. Los dos abren en Mes.
  - La **rejilla se dibuja como una rejilla** (líneas en `lg:`), las puntas de los meses
    vecinos se rellenan para cerrar la semana, y el fin de semana y los festivos llevan
    **trama diagonal**.
  - Las **ausencias** pasaron por tres formas en un día —etiqueta con nombre, trama en el
    color de la persona, y por fin **franja sobre carril gris**—. La regla que salió de
    medirlo está en `architecture.md`: el color puede decir "de quién", nunca "qué" ni
    "si".
  - **Ajustes salió de la cabecera** y bajó al final de Inicio, solo en móvil.
- ✅ **Festivos** (26-08-2026): cuarto valor de `kind`, migración `020`, aplicada y
  validada. Se pintan en gris porque no son de nadie.
- ✅ **Unidades en la lista de la compra** (26-08-2026): `quantity` en `list_items`,
  migración `021`, aplicada y validada. Botones de más y menos en la propia fila.
- ✅ **Una sola regla para "esto es un plan del día"** (26-08-2026). Estaba escrita de
  cuatro maneras y dos se quedaron cortas: los festivos y los descansos salían en Inicio
  y en el aviso de las siete como si fueran planes. Ahora es `isPlan`, y sus tests miran
  los tres tipos y no solo las vacaciones, que es lo que dejó pasar la fuga.
- ✅ **Repaso de seguridad y CSP** (26-08-2026). La revisión no encontró nada crítico.
  Entra la **Content-Security-Policy**, que llevaba meses aparcada, probada contra el
  build servido y no contra `dev`; el `redirectTo` del magic link deja de adivinar el
  dominio desde la cabecera `Host`; y las rutas API dejan de devolver el mensaje crudo de
  Postgres.
- ✅ **Copia de seguridad de la familia** (27-08-2026): un botón en Ajustes descarga
  un `.json` con todo. Sin ruta API ni tabla nueva —el store ya lo tenía todo en
  memoria— y sin tokens dentro. Nació de una incoherencia: los papeles ya prometían
  la exportación y recomendaban guardar copias, sin dar manera de hacerlo.
- ✅ **Cerrar una familia** (27-08-2026): crear una era un toque y deshacerlo no
  existía. RPC `delete_family` —solo un admin, y nunca la última que te queda— más el
  aviso que cuenta lo que se lleva por delante. RPC aplicada y validada el mismo día.
- ✅ **La agenda se agrupa por persona** (27-08-2026): un interruptor sobre la lista
  cambia el rótulo de tramo ("Hoy", "Esta semana") a persona, y debajo van sus días con
  las filas de siempre, ya sin repetir el nombre en cada línea. Contesta la otra mitad
  de la pregunta de una casa con varios: no "¿qué hay el jueves?" sino "¿qué lleva cada
  uno?". Se descartó la columna por persona, que no cabe en un móvil.

- ✅ **Cumpleaños** (27-08-2026): la fecha de nacimiento llevaba desde el principio
  guardada en Ajustes sin servir para nada. Ahora el cumpleaños de hoy abre la tarjeta de
  Inicio, los de los próximos catorce días van en su bloque y el aviso de las siete
  felicita el mismo día. Sin tabla ni migración: es dato derivado, no un evento. Se
  descartó crearlos como eventos recurrentes.

- ✅ **Cumpleaños de fuera de casa** (27-08-2026): la abuela y el amigo del cole no tienen
  ficha en Ajustes, y apuntar su cumpleaños obligaba a darles de alta como persona de la
  familia. Ahora son un tipo de evento (`cumple`) que se apunta en el calendario, se
  repite solo todos los años y sube a los mismos bloques de Inicio que los de casa. El año
  de nacimiento es opcional: solo cambia si se dice la edad. Se descartó una pestaña
  propia.
- ✅ **Apuntar algo, donde ya estás mirando** (28-08-2026). Cuatro retoques del
  calendario, todos de usabilidad y ninguno de datos:
  - En **Día y Semana**, pulsar un hueco del eje abre el formulario con **esa hora**
    puesta. Es un botón por franja y no uno por columna: así se sabe qué hora se
    pulsó sin medir la posición del dedo contra la caja.
  - En la **rejilla del mes** y en la **fecha de cada fila de la agenda**, el **doble
    clic** abre el alta de ese día. El clic simple sigue haciendo lo de siempre.
  - Los **cumpleaños** salen también en la franja de "todo el día" de Día y Semana:
    ahí no hay bloque debajo al que mirar, así que un cumpleaños no se veía por
    ninguna parte.
  - En la agenda, el **buscador y el interruptor del eje comparten línea**. Eran dos
    bandas a todo el ancho para dos controles que caben en una, y en el móvil se
    comían la primera fila de la lista.

## Fase 8b - Notas ✅ (31-08-2026)

- [x] Tabla `notes` con RLS por familia, índice y trigger de `updated_at`.
- [x] Contrato `NotesRepo` y las dos implementaciones (mock con `SCHEMA_VER` 12 y Supabase).
- [x] Pantalla `/notes`: buscador, rejilla de tarjetas, sheet de alta y edición.
- [x] En "Más" delante de Documentos, y en `SideNav` en escritorio.
- [x] En la copia de seguridad y en `/privacidad`, con el aviso de que no es un gestor de contraseñas.
- [x] Aplicado en el SQL Editor del proyecto real y validado: `node scripts/validate-rls.mjs` da **89/89** (31-08-2026).

## Fase 8d - Finanzas (31-08-2026)

La última idea de la lista: un apartado de presupuestos. En español eran dos, así que la
sección llevaba dos pestañas. El 01-09-2026 se rehízo entera (ver Fase 8f). El porqué de
cada decisión, la de entonces y la de ahora, está en `docs/architecture.md`, "Finanzas:
cuatro piezas y una sola palabra «presupuesto»".

- [x] Tres tablas (`budgets`, `expenses`, `quotes`) con RLS por familia, índices,
      triggers de `updated_at` y los tres de integridad entre familias de `expenses`.
- [x] Importes en **céntimos enteros**, con una sola conversión (`src/lib/finanzas.ts`)
      compartida por el mock y Supabase.
- [x] Contratos `BudgetsRepo`, `ExpensesRepo` y `QuotesRepo`, y las dos
      implementaciones (mock con `SCHEMA_VER` 13 y Supabase).
- [x] Pantalla `/finanzas`: el mes con sus partidas, sus gastos y el reparto por persona; y
      los presupuestos pedidos, agrupados y comparados.
- [x] En "Más" con Notas y Documentos, y en `SideNav` en escritorio.
- [x] En la copia de seguridad y en `/privacidad`, con el aviso de que Farpi no se
      conecta a ningún banco.
- [x] 73 unitarios nuevos (`finanzas.spec.ts`, `budgets.spec.ts`) y dos flujos de navegador.
- [x] Esquema aplicado en el SQL Editor del proyecto real y revalidado el 01-09-2026:
      **99/99**, con diez comprobaciones nuevas en el arnés para las tres tablas —incluidos
      los tres triggers que impiden que un gasto señale a un presupuesto, un hijo o un
      miembro de otra familia.

## Fase 8e - La portada y el nombre de Finanzas (01-09-2026)

La página pública contaba bien qué es Farpi y escondía lo único que se le pide: entrar.
Y la sección de gasto pasó a llamarse como lo que la familia hace con el dinero.

- [x] El acceso, pegado al titular en móvil y **anclado en una columna a la derecha en
      escritorio** (`sticky`, solo `lg:`).
- [x] **El formulario de verdad en la portada**, no un botón que lleve a él: `AuthCard`
      sale de `LoginForm` y lo comparten `/auth/login` y la portada. Fuera los botones
      de cuenta de la barra de arriba —queda un ancla— y el cierre de la página.
- [x] **`openGraph` y `twitter`** con `public/og.png` (1200×630), para que el enlace se
      vea al mandarlo por WhatsApp.
- [x] **"Próximamente en Google Play"**, sin insignia oficial ni enlace mientras no
      haya ficha. Cuando la haya se cambia ese bloque (ver Fase 9, TWA).
- [x] **"Así se ve"**: siete capturas de la app de verdad, generadas por
      `scripts/gen-capturas.mjs` con el reloj congelado en el 17-06-2026. Cierra el
      punto que estaba en "Después" de `project-status.md`.
- [x] "Por qué existe Farpi", contado como fue: junio, y por necesidad propia.
- [x] Tres tests nuevos (portada en `smoke.spec.ts`, columna anclada a 1440 y a 1023 px
      en `escritorio.spec.ts`) y un bloque de QA manual en el checklist.
- [x] **Dinero → Finanzas** en todo: etiquetas, `/finanzas`, `src/lib/finanzas.ts`,
      `FinanzasView`, `useFinanzasState`, tests y documentación. Las tablas no se tocan.

## Fase 8f - Finanzas: los fijos y el vocabulario (01-09-2026)

Finanzas tenía dos problemas de fondo: «presupuesto» seguía significando dos cosas dentro
de la propia sección, y **no existían los ingresos**, así que no podía contestar la única
pregunta que se hace en una casa a mitad de mes. El porqué entero está en
`docs/architecture.md`, "Finanzas: cuatro piezas y una sola palabra «presupuesto»".

- [x] Tabla nueva `fixed_entries` —el mes tipo: nóminas, alquiler, luz, suscripciones—
      con RLS por familia, índices, trigger de `updated_at` y los dos de integridad entre
      familias. **No genera apuntes**: es un dato que vale hasta que se cambie.
- [x] Columna `kind` en `expenses` (`default 'gasto'`, así que lo ya apuntado sigue
      valiendo) y el `check` `expenses_ingreso_sin_tope`, que impide en la base que un
      ingreso descuente de una partida.
- [x] Contrato `FixedEntriesRepo` y las dos implementaciones (mock con `SCHEMA_VER` 14 y
      Supabase), las dos forzando el `budget_id` a null en los ingresos.
- [x] `cuentaDelMes` en `src/lib/budgets.ts`: ingresos fijos, gastos fijos, «para el mes»,
      lo apuntado y **cuánto queda**. Las partidas y el reparto pasan a mirar solo los gastos.
- [x] Tercera pestaña **«Fijos»** (`FijosPanel`, `FixedEntrySheet`) y la tarjeta
      `CuentaDelMes` arriba de «El mes», con su caso aparte para cuando no hay ningún fijo.
- [x] **Vocabulario**: los `budgets` pasan a llamarse «topes» y los `expenses`
      «movimientos»; «presupuesto» queda para los `quotes` y nada más. Las tablas no se
      renombran, por lo mismo que en Dinero → Finanzas.
- [x] En la copia de seguridad (quince tablas) y en la semilla de la demo, con un mes tipo
      de una familia normal.
- [x] Catorce unitarios nuevos en `budgets.spec.ts` y `finanzas.spec.ts`, y dos flujos de
      navegador (la cuenta del mes con un ingreso que no toca las partidas; un gasto fijo que
      baja lo que queda).
- [x] Esquema aplicado en el SQL Editor del proyecto real y revalidado el 01-09-2026:
      **106/106**, con siete comprobaciones nuevas en el arnés —los tres de RLS sobre
      `fixed_entries`, los dos triggers de asignación entre familias y los dos `check` que
      impiden un tipo inventado y un ingreso colgado de una partida.

## Fase 8g - Finanzas: fuera las palabras de banco (02-09-2026)

Los nombres que puso la fase anterior duraron un día. El porqué está en
`docs/architecture.md`, en «"Topes" y "movimientos" duraron un día».

- [x] Los `budgets` dejan de ser «topes» y pasan a ser **partidas**: la palabra nombra el
      apartado con dinero asignado, no solo el techo que no se puede pasar.
- [x] Los `expenses` dejan de ser «movimientos»: la lista se llama **«El día a día»** y una
      fila suya es un **apunte**, que es el verbo que la sección ya usaba.
- [x] El cambio baja al código (`resumenPartidas`, `apuntesDelMes`, `gastosSinPartida`,
      `abrirPartida`, `guardarApunte`). Las tablas, el `check`
      `expenses_ingreso_sin_tope` y el tipo `MovementKind` **no** se tocan.

## Fase 8h - Finanzas con historia: la plantilla y los meses cerrados (02-09-2026)

Lo que pedía el uso real: que la cuenta de un mes se cargue de los fijos y **quede
guardada aunque luego los cambies**. El porqué y las alternativas descartadas, en
`docs/architecture.md`, «La plantilla («Lo fijo») y los meses cerrados».

- [x] La plantilla es cómo suele ser un mes; el mes en curso la refleja; el mes que
      termina se queda con una copia congelada. Sin ningún botón de cerrar nada.
- [x] Tablas `month_plans` y `month_plan_lines`, las dos primeras de contenido con
      policy de **solo lectura**: no hay insert, update ni delete para nadie.
- [x] RPC `close_month` (`security definer`, con el `execute` revocado de `public`,
      `anon` y `authenticated`, y concedido a `service_role`) y
      `close_previous_month`, que sí comprueba la familia y es la que llama la app.
- [x] El cierre lo intentan dos sitios idempotentes: el cron diario y la app al
      arrancar cuando ve que falta el mes pasado.
- [x] Las **partidas se mudan a la plantilla**: son una cifra de la plantilla, igual
      que un fijo. En «El mes» se siguen viendo con su barra.
- [x] `plantillaDelMes` en `src/lib/budgets.ts` resuelve qué valía en cada mes;
      `cuentaDelMes` y `resumenPartidas` cuelgan de ella.
- [x] Relleno de una sola vez de los meses terminados que ya tenían apuntes, con la
      plantilla del día en que se aplicó.
- [x] `SCHEMA_VER` 16 en el mock, con junio y julio sembrados con otras cifras para
      que la demo enseñe la diferencia.
- [x] **Lo congelado es el plan, no el día a día**: en un mes cerrado no se editan
      los fijos ni las partidas, y sí se apunta. Se rompió al principio, por
      confundir las dos cosas, y lo cazó la pregunta de cómo se generaba octubre.
- [x] **Cerrar el mes a mano**, opcional, para poder preparar la plantilla del mes
      siguiente. Con vuelta atrás (`reopen_month`) mientras siga siendo el mes en
      curso; un mes terminado no se reabre nunca. Se descartó la versión
      obligatoria: es la tarea administrativa que la app existe para no pedir.
- [x] La regla del código pasa a ser «si hay copia, manda la copia», y no «¿ha
      terminado el mes?»: escrita al revés, el cierre anticipado no hacía nada.
- [x] 15 unitarios nuevos y 7 flujos de navegador; 22 comprobaciones nuevas en el
      arnés de RLS, en una §4 bis propia.
- [x] Aplicado en el SQL Editor del proyecto real y revalidado el 02-09-2026:
      **139/139**. El delta, idempotente y reescrito entero en cada cambio, queda en
      `supabase/aplicar-meses-cerrados.sql`.

## Fase 8i - Finanzas: el resumen, y el `+` de vuelta arriba (02-09-2026)

- [x] Cuarta pestaña **«Resumen»** con tres gráficos en SVG a mano, sin librerías:
      barras divergentes de los últimos seis meses, el desglose de fijos contra
      apuntado del mes que se mire, y un anillo de en qué se va.
- [x] **El `+` vuelve arriba** (`ViewHeader`). Finanzas era la única pantalla con
      botón flotante, que es la divergencia que `ViewHeader` vino a cerrar.
- [x] **Cerrar el mes se va al pie de «El mes»**: en la tarjeta del resumen
      quedaba mal y la convertía en un panel de mandos.
- [x] En las partidas, 🍺 en lugar de 💡. La luz es un fijo y no se le pone
      partida, así que ofrecer la bombilla ahí invitaba a lo que no hay que hacer.
- [x] Tokens de gráfico en `globals.css`, **con el color validado y no elegido a
      ojo**: el verde y el salmón de marca están a ΔE 2,3 en protanopía.
- [x] 12 unitarios nuevos y 2 flujos de navegador.

## Fase 8j - Finanzas: los gráficos otra vez, «Cada mes» y el mes que no ha llegado (02-09-2026)

Tres cosas que se vieron al usar la pantalla, no al escribirla. El porqué de cada
una, en `docs/architecture.md`: «La segunda vuelta de los gráficos» y el cuarto
estado, `por-venir`.

- [x] **«El mes tipo» pasa a llamarse «Cada mes».** «Tipo» es una palabra de
      formulario. Dentro del código el concepto sigue siendo **la plantilla**, y el
      panel se renombró a `CadaMesPanel`.
- [x] **Los tres gráficos, rehechos**: la serie de meses el doble de alta, estirada
      a lo ancho de la tarjeta, con el mes que se mira señalado y la barra más alta
      de cada lado etiquetada; cada bloque abriendo por una frase (la media de lo que
      queda, el total que se ha ido); el anillo convertido en barras ordenadas de un
      solo color; y «de dónde sale» con la leyenda una sola vez y la resta al pie.
- [x] Fuera la rampa de seis verdes de `globals.css`: con las barras ordenadas, el
      tono repetía lo que ya decía el tamaño.
- [x] Arreglado un pie que decía «0 € apuntado nada» cuando no había nada apuntado.
- [x] **Cuarto origen `por-venir`**: un mes que no ha empezado lo avisa, habla en
      condicional y no ofrece apuntar ni cerrar. `onAdd` de `ViewHeader` pasa a ser
      opcional, que es lo que permite que no haya `+`.
- [x] 3 unitarios nuevos (`mediaQueQueda`, la serie sin futuro, el origen nuevo) y
      1 flujo de navegador.

## Fase 8k - Finanzas: «Lo fijo», los meses que no se vivieron y el mes en cero (03-09-2026)

Todo salió de usar la pantalla un día. El porqué de cada cosa, en
`docs/architecture.md`: «La plantilla («Lo fijo») y los meses cerrados».

- [x] **«Cada mes» pasa a llamarse «Lo fijo».** El problema no era lo que decía, era
      estar pegado a «El mes» en la misma fila de pestañas: dos etiquetas con la
      misma palabra y un determinante de diferencia. Dentro del código el concepto
      sigue siendo **la plantilla**.
- [x] **El cierre automático ya no inventa meses.** Solo copia lo que existía antes
      de que el mes acabara, y si nada de la plantilla estuvo en ese mes no lo
      cierra. Agosto se había cerrado el 1 de septiembre con las nóminas creadas
      ese mismo día.
- [x] **Un mes pasado se puede poner a cero** (`empty_month`): vacía el plan y deja
      la cabecera, porque borrarla hacía que el cierre automático lo repitiera en la
      siguiente carga. Los apuntes no se tocan. `reopen_month` vuelve a ser solo
      del mes en curso.
- [x] **Cerrar, deshacer y poner a cero suben** a debajo de la tarjeta del mes.
      Estaban al pie y había que pasar por las partidas y todos los apuntes.
- [x] **Un mes que no ha llegado sale en cero** y la previsión se pide con un
      enlace. El aviso del 02-09-2026 no bastaba: una cifra donde los demás meses
      llevan un saldo se lee como un saldo.
- [x] 5 unitarios nuevos y 2 flujos de navegador; 6 comprobaciones nuevas en
      `scripts/validate-rls.mjs`.
- [ ] **Aplicar en el SQL Editor** la parte nueva de `supabase/schema.sql`
      (`close_month_copy`, `reopen_month`, `empty_month`) y ejecutar
      `node scripts/validate-rls.mjs`.

## Fase 8c - Cambio de nombre a Farpi (31-08-2026)

Lo del repositorio está hecho y desplegado. Lo que queda **no es código**: son paneles
ajenos, y el detalle de cada uno —con su riesgo y su orden— vive en `docs/produccion.md`
§0, que es donde hay que mirar antes de tocar nada.

- [x] Código, documentación, claves internas y tests.
- [x] Proyecto de Vercel, proyecto de Supabase, carpeta de Google Drive (renombrada, no
      borrada) y repositorio de GitHub (`cerredax/farpi`).
- [x] Pantalla de consentimiento de Google, con la redirect URI de `www.farpi.app`
      **añadida** por adelantado al cliente OAuth.
- [ ] **Apuntar `www.farpi.app`.** Dominio ya registrado. Es lo que más ata: Vercel,
      dos valores de Supabase y una variable de entorno tienen que decir lo mismo, y
      todo con `www` porque la cookie del OAuth de Drive es *host-only*. Google ya está
      preparado, así que en el corte solo hay que retirar lo viejo al final.
- [ ] **Pegar las plantillas de correo en el panel de Supabase.** Las de
      `supabase/email-templates/` ya dicen Farpi, pero se aplican a mano: hasta que se
      peguen, las invitaciones y los magic links siguen firmando como Nido. Es lo más
      visible de lo que queda y no depende del dominio, así que se puede hacer ya.
- [ ] **Branding de Google**: App Domain y Authorized Domains. Solo cuando el dominio
      esté vivo, y puede pedir verificarlo en Search Console.
- [ ] Comprobar que Vercel sigue viendo el repositorio tras el renombrado
      (Settings → Git), en el próximo despliegue.

## Fase 9 - Uso diario

Objetivo: que la app funcione sola, sin nadie mirándola.

- [ ] **Un teléfono de verdad.** Los cuatro puntos abiertos de la Fase 2. Es lo
  primero, porque es lo que puede sacar un fallo que no ve ninguna herramienta.
- ✅ **Notificaciones push, probadas de punta a punta** el 28-08-2026: activar desde
  Ajustes con una cuenta real, suscripción guardada y cron devolviendo
  `sent: 1, fallidos: 0`. Las claves VAPID estaban ya en Vercel. Por el camino salió
  el fallo que lo tenía parado —el service worker podía no registrarse, y
  `serviceWorker.ready` no rechaza nunca— contado en `docs/notificaciones.md`.
  El cabo que quedaba —el `CRON_SECRET` de Vercel desalineado con el local— ya
  está resuelto (ver más abajo).
- [ ] **Enterarse cuando la casa se cae.** El 28-08-2026 Supabase tuvo una caída de
  latencia (incidencia abierta a las 01:38 UTC, "additional latency and error rates")
  y Farpi se quedó **inservible durante horas sin que nada lo dijera**: el middleware
  tardaba entre 150 y 224 segundos en cada ruta con sesión —contra 3 ms sin ella—
  porque `supabase.auth.getUser()` no volvía. Quien entraba veía el logo de "Cargando
  Farpi" para siempre. Nadie se enteró hasta que una persona se quejó, y averiguar la
  causa costó una mañana entera y un despliegue revertido para nada.

  Cuatro cosas, de más barata a menos, y las dos primeras valen por sí solas:

  1. ✅ **Suscribirse al estado de Supabase** (status.supabase.com, botón *Subscribe*).
     Coste cero y habría contestado la pregunta en un minuto.
  2. ✅ **Que la app lo diga** (28-08-2026). `getUser()` tiene cinco segundos y un
     `catch` en `src/lib/supabase/middleware.ts`; si se pasa, las páginas públicas se
     sirven igual, las rutas API dan un 503 con JSON y el resto enseña
     `/no-disponible` —503 por `rewrite`, sin cambiar la URL, para que recargar
     reintente donde estabas—. **No se manda al login**: parecería que se ha caído tu
     sesión. La RLS no se toca: el middleware es experiencia de uso, no seguridad. El
     relato, en `docs/historial.md`.
  3. ✅ **Ruta `/api/salud`** (28-08-2026). Mide las dos mitades de Supabase por
     separado —`/auth/v1/health` y una consulta anónima que la RLS deja en cero
     filas— y devuelve **200 si las dos van, 503 si alguna falla**, con los
     milisegundos de cada una. No lleva dentro un dato de nadie, que es lo que la
     hace publicable. **Queda fuera del `matcher` del proxy** a propósito: lo que
     vigila a Supabase no puede atravesar la pieza que puede estar colgada.
  4. **Un vigía externo gratuito** (UptimeRobot o similar) apuntando a esa ruta cada
     pocos minutos, con aviso por correo. Tiene que ser externo: si el que vigila se
     cae con la app, no vigila nada. **Es lo único que falta**: la ruta ya está y
     contesta lo que esos servicios entienden.

  Lo que **no** hay que hacer: montar telemetría de errores del cliente. Es una app
  familiar con datos médicos y DNI dentro; mandar trazas a un tercero cuesta más de lo
  que resuelve.
- ✅ **`CRON_SECRET` alineado.** El de Vercel no coincidía con el de `.env.local`
  (comprobado el 28-08-2026, la llamada de prueba devolvía 401); igualado y
  comprobado con una llamada a mano.
- ✅ **Cron automático confirmado** en los logs de Vercel el 06-08-2026: la ejecución
  de las 07:00 UTC dispara sola y devuelve `keptAlive: true`.
- ✅ **RLS revalidado** por última vez el 27-08-2026: **79/79**, con el esquema
  entero validado, incluidas las conexiones de Google Drive (Fase 3) y el cierre de
  una familia.
- ✅ **Las 21 migraciones, aplastadas en `supabase/schema.sql`** (26-08-2026). Un
  solo archivo que describe la base como está, en vez de veintiuno que cuentan
  cómo llegó hasta aquí. El historial se queda en git. Falta el único aval que no
  se puede dar desde aquí: aplicarlo a un proyecto vacío y comprobarlo.
- [ ] **Google Play (TWA)**, si se decide publicar: package name, SHA-256 de la
  firma, `public/.well-known/assetlinks.json` y la guía `docs/play-store.md`. La PWA
  y la política de privacidad ya están.
