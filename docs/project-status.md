# Estado del proyecto

Última revisión: 2026-08-31.

## Resumen

Farpi está conectado a Supabase de extremo a extremo: autenticación, repositorios reales, `StoreProvider` async, onboarding e invitaciones por magic link. Los archivos de los documentos ya no los guarda Farpi: viven en el Google Drive de quien los sube (27-08-2026), y la familia los ve igual sin conectar nada. La UI consume la frontera de repositorios y elige implementación real o mock según `IS_DEMO_MODE`. El modo demo/mock sigue funcionando como fallback y como entorno de pruebas (e2e).

La app está en producción, en uso diario por la familia y probada en un móvil real (05-08-2026). Las tres tablas de Finanzas (31-08-2026) se aplicaron en el proyecto real y se validaron el 01-09-2026 (99/99), así que la sección funciona también con datos reales. Lo que queda no es código de producto: funcionalidades que todavía no existen (ver "Siguiente paso recomendado").

## Implementado

### Pantallas / producto

- Inicio / Hoy, con "Esta semana" y lo que va atrasado arrastrado al día de hoy. La
  tarjeta del día abre con el saludo y la fecha —que estuvieron en la cabecera y ya no,
  para no decir la hora dos veces en la misma pantalla— y dentro lleva cumpleaños,
  planes, tareas de hoy y el menú (`TodayMealsRow`): todo lo que responde a "¿qué toca
  hoy?" en un sitio, en vez del menú suelto al final de la columna.
- Calendario (eventos, series semanales y anuales, vacaciones como franja). En la
  vista de semana salen también las tareas que vencen, y se pueden marcar allí. La
  agenda se agrupa por días o **por persona** (27-08-2026), con un interruptor que
  comparte línea con el buscador (28-08-2026: eran dos bandas apiladas encima de la
  lista para dos controles que caben en una). Debajo del mes van los dos bloques que
  dicen cómo es el mes y no qué hacer: "Vacaciones y descansos" y **"Cumpleaños"**
  (28-08-2026), los dos **plegados** por defecto y con cuántos hay en el título;
  los cumpleaños salen además en la franja de "todo el día" de las
  vistas Día y Semana, que no tienen bloque debajo al que mirar. En móvil se pasa
  de mes o de día **arrastrando el dedo**.
- **Elegir un día del mes enseña qué hay ese día** (28-08-2026), en los dos tamaños. Debajo
  de la rejilla: los planes con su hora, las tareas que vencen y las etiquetas de
  festivo, ausencia y cumpleaños; y si no hay nada, lo dice y ofrece apuntarlo
  ahí. Antes no contestaba nada —la agenda de abajo arranca en hoy y solo pinta
  días con algo, así que un día pasado o vacío no tenía a dónde llevarte—. Con
  hoy elegido no sale: la agenda ya empieza justo ahí. En escritorio, además, la
  agenda de la columna de al lado se desliza hasta el día elegido.
- **El selector de vista, en la fila del título** (28-08-2026). En móvil es un
  botón que dice cuál está puesta y despliega las cuatro; se fue la banda de
  pastillas, que ocupaba ~48 px de pantalla todo el rato. Con el selector en esa
  fila, el título va abreviado en móvil ("31 ago – 6 sep", "Jue, 27 ago"): escrito
  largo no cabía. En escritorio siguen las tres pastillas y el título largo.
- **La semana se recorre a lo ancho sin perder de vista la hora** (28-08-2026). A
  390 px las siete columnas no caben, así que el eje se desplaza; el canal de las
  horas se queda quieto a la izquierda y las columnas pasan por debajo. El mismo
  dedo hace las dos cosas según dónde esté: mientras quede semana, recorrerla; en
  el borde, pasar a la de al lado. Y al cambiar de semana el eje **vuelve al
  lunes** —o se coloca en hoy, si la semana lo tiene—, en vez de dejarte en el
  domingo de la nueva sin haber visto el principio.
- **Apuntar algo cuesta un gesto donde ya estás mirando** (28-08-2026). En Día y
  Semana, pulsar un hueco del eje abre el formulario con **esa hora** puesta (un
  botón por franja, no uno por columna: así no hay que medir la posición del dedo
  contra la caja). En la rejilla del mes y en la fecha de cada fila de la agenda,
  **doble clic** abre el alta de ese día; el clic simple sigue haciendo lo que hacía
  —elegir el día, o nada en la agenda—, así que no se pierde nada ni cambia lo que
  anuncia un lector de pantalla.
- Tareas: recurrencia, prioridad, dueño (un adulto o un hijo) y quién la marcó.
- Listas e ítems: lo que falta arriba, lo que ya tenéis debajo como catálogo, abierto al entrar (se vuelve a pedir con un `+`, no con un tic), mover un ítem de una lista a otra.
- Búsqueda en listas, tareas, notas, documentos y calendario. La del calendario encuentra
  eventos pasados, no solo los del tramo pintado.
- Comidas (día/semana, copiar día). Las cuatro franjas se activan y desactivan por familia desde Ajustes; apagar una no borra lo apuntado en ella.
- Documentos: subir, abrir, editar, borrar y aviso de caducidad en la tarjeta. Los
  archivos están en el Google Drive de quien los sube y los sirve Farpi con el token
  del dueño; el resto de la familia no conecta nada ni se entera de que hay un Drive
  detrás.
- **Notas** (31-08-2026): lo que hay que tener apuntado en casa y no es una fecha, una
  tarea ni un papel —el teléfono del pediatra, la clave del wifi, dónde está el contador—.
  Título, texto libre, un emoji y la posibilidad de fijar una arriba. Sin categorías, sin
  campos y sin tipos de nota: con veinte notas manda el buscador. Se lee entera desde la
  tarjeta, sin abrir nada. Vive en "Más", delante de Documentos, y **no sale en Inicio**:
  la clave del wifi no es de hoy, es de siempre. Ojo con lo que se guarda ahí: es texto
  plano en la base, protegido por la RLS y por nada más, y el propio sheet lo dice.
- **Finanzas** (31-08-2026): el gasto de la casa, en `/finanzas`, con dos pestañas porque
  "presupuesto" en español son dos cosas. **«El mes»**: topes de gasto por categoría
  («Compra 300 €/mes»), los gastos que se van apuntando debajo —importe, fecha, qué fue,
  de qué presupuesto sale y **quién lo pagó**— y el reparto de quién ha puesto cuánto. Las
  barras dicen con palabras si te has pasado y por cuánto, no solo con el color. Se
  navega por meses. **«Presupuestos»**: los que te pasan de fuera (el fontanero, el
  dentista), agrupados por para qué son y ordenados de más barato a más caro, con el
  barato marcado mientras el trabajo siga sin decidir; se aceptan o se descartan desde la
  propia fila. Todo el dinero se guarda en **céntimos enteros**. No hay saldos entre
  adultos ni conexión con ningún banco, y **no sale en Inicio**: es del mes, no de hoy.
  Vive en "Más", con Notas y Documentos.
- Cumpleaños (27-08-2026): salen de la fecha de nacimiento que ya se guardaba en
  Ajustes, no se apuntan. El de hoy abre la tarjeta de Inicio y los de los próximos
  catorce días van en su bloque; el aviso de las siete felicita el mismo día.
- Deshacer una tarea marcada sin querer, desde el aviso de la barra de estado.
- Ajustes de familia: miembros, invitaciones, hijos, cambio de rol admin/miembro,
  y cerrar una familia entera (un admin, y nunca la última que le queda).
- Cuenta y Ajustes, por sitios distintos según el tamaño (28-08-2026). En escritorio, el
  pie de la barra lateral (`AccountFooter.tsx`): tu inicial y tu nombre como letrero, y
  debajo Ajustes y cerrar sesión, cada uno en su fila y a un clic. En móvil, **"Más"**, la
  sexta pastilla de la barra de abajo (`MoreMenu.tsx`), que lleva Finanzas, Notas y Documentos —que
  por eso no son pastillas—, Ajustes y cerrar sesión, y deja la cabecera sin ningún icono.
  Qué secciones caen ahí lo dice la bandera `enMas` de `secciones.ts`, que leen las dos
  barras: era un filtro escrito a mano y con dos secciones ya podía contradecirse.
  Ajustes abre en Familia; elegir pestaña es cosa de las pestañas. Cambiar contraseña
  (`AccountActions.tsx`) y borrar cuenta siguen dentro de Ajustes.
- Listas, Tareas, Comidas, Notas y Documentos abren con la misma fila (`ViewHeader.tsx`,
  28-08-2026): resumen, buscador y el `+` de alta, bajo el título de la cabecera. El `+`
  de Tareas estaba flotando abajo a la derecha y era el único fuera de sitio.
- Páginas legales públicas `/privacidad` y `/terminos`.
- **Página de inicio pública** (`/`, `LandingPage.tsx`), en una sola página con la
  barra de arriba pegada y **"Entrar" y "Crear cuenta" siempre a la vista** —el segundo
  lleva a `/auth/login?modo=registro`, que abre ya en el formulario de registro—. Por
  orden: presentación, "Así se ve" con las capturas, "Cómo funciona" en tres pasos,
  "En qué ayuda", "Preguntas" (`details` nativos, plegados), "Por qué existe Farpi",
  contacto y un cierre. Las secciones se enlazan desde la barra **solo en `lg:`**: en
  un móvil de 390 px esa fila ya la llenan la marca y los dos botones.
- **Se entra desde la propia portada** (01-09-2026): no hay botones que lleven al
  login, está **el formulario de verdad**. `AuthCard` (`src/components/auth/`) tiene las
  dos pestañas, Google si el proveedor está activo, los campos y recuperar contraseña,
  y lo montan los dos sitios: `/auth/login` y la portada. No hay copia: un segundo
  formulario de autenticación diverge en cuanto alguien toca un mensaje de error.
- **Va pegado al titular en móvil y anclado en una columna a la derecha en escritorio**
  (`sticky top-20`, solo en `lg:`), y **se pinta una sola vez**: repetirlo arriba y
  abajo duplicaría los `id` de los campos, que es lo que ata cada etiqueta con el suyo.
  Por eso las tres piezas de la página (titular, acceso, resto) están colocadas a mano
  en la rejilla: el acceso se escribe en medio —tiene que ser el segundo en móvil— pero
  pertenece a la columna de al lado. Debajo, un **"Próximamente en Google Play"** sin
  insignia oficial ni enlace, porque todavía no hay ficha a la que ir.
- **La barra de arriba no tiene ningún enlace de cuenta**: solo la marca y las
  secciones (`lg:`). Ni botón al login ni ancla al formulario; el cierre de la página
  con los dos botones también se fue. Aquí ya no se navega a ninguna parte para entrar,
  se entra: el formulario es lo segundo que hay en móvil y va anclado en escritorio.
  `e2e/escritorio.spec.ts` vigila las dos mitades: que a 1440 px la tarjeta siga a la
  vista tras bajar 2500 px y mida menos de una columna, y que a 1023 px ocupe el ancho
  del texto y siga por encima de "Así se ve".
- **La portada tiene la cara de la app, no una plantilla** (01-09-2026). Estaba plana:
  un solo fondo crema de arriba abajo, seis `border-t` idénticos, todos los títulos del
  mismo tamaño y el único color un verde repetido. Cuatro cambios, todos tirando de lo
  que la app ya tenía:
  - **La casa de Inicio preside el titular** (`DayIllustration`), con su cielo cambiando
    según el tramo del día. Se pinta en el servidor, y por eso `getDayPeriodFromHour`:
    en Vercel el servidor va en UTC, así que la hora se pide en la de Madrid.
  - **El ritmo lo marca el fondo**: unas secciones en bloque de color (`bg-surface`,
    `rounded-[2rem]`) y otras al aire, alternando. Fuera las seis rayitas.
  - **"Por qué existe Farpi" se lee como una carta**: fondo cálido, cuerpo más grande y
    la frase del nombre de la hija sacada aparte en un `blockquote`. Era lo más personal
    de la página y estaba maquetado igual que las preguntas frecuentes.
  - **Las capturas, escalonadas y torcidas un pelín**, y se enderezan y levantan al pasar
    el ratón. Solo desde `lg:`, y anuladas con `motion-reduce`. Dos columnas en `lg` y
    tres en `xl`: a tres en un portátil de 1024 px los móviles no se leían.
- **El enlace se ve al compartirlo** (01-09-2026): `openGraph` y `twitter` en
  `src/app/layout.tsx`, con `metadataBase` sacado de `SITE_URL`, y `public/og.png`
  (1200×630) que compone el mismo `gen-capturas.mjs` con la captura de Inicio y la
  Nunito. Farpi se comparte por WhatsApp entre familias, no por un buscador, y hasta
  ahora el enlace viajaba pelado.
- **Capturas de la app de verdad** en "Así se ve": siete pantallas (inicio, calendario,
  tareas, listas, comidas, finanzas, notas) que genera `node scripts/gen-capturas.mjs`
  contra la app en modo demo con el reloj congelado en el 17-06-2026, la fecha de los
  datos de ejemplo. No son maquetas y no envejecen a escondidas: si la interfaz cambia,
  se relanza el script. En móvil se arrastran de lado encajando de una en una; en
  escritorio son tres columnas.
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
  con la base como está, aplicado en el proyecto real y validado. Última pasada:
  **99/99** (01-09-2026, con las tres tablas de Finanzas). Las 21 migraciones numeradas que lo precedieron se aplastaron el 26-08-2026
  y siguen en el historial de git, que es donde va la historia; este documento contaba
  hasta hace poco una lista de migraciones aplicadas que ya se había quedado corta dos
  veces. Cuando el esquema cambie se edita ese archivo, se aplica el `alter` suelto en el
  SQL Editor y se vuelve a pasar `node scripts/validate-rls.mjs`.
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_family_member_profile` (migración 014): nombre y color del miembro, editables por él mismo o por un admin de su familia. Sustituye a `update_my_family_profile`.
- Tabla de invitaciones con policies idempotentes y `with check`.
- ~~Bucket privado `documents`~~: **borrado el 27-08-2026**, con sus cuatro policies y
  las diez comprobaciones que tenía en el arnés de RLS. Farpi ya no guarda archivos. La
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
- PWA: iconos any + maskable + apple-touch, `manifest.json` con purposes (script `scripts/gen-icons.cjs`) y service worker con fallback `/offline`. El service worker **solo cachea navegaciones que salieron bien** (28-08-2026): cacheaba cualquier respuesta, y con la pantalla de avería eso dejaba el error pegado a `/home`.
- **Cuando Supabase no contesta, la app lo dice** (28-08-2026). `getUser()` tiene cinco
  segundos y un `catch` en `src/lib/supabase/middleware.ts`, que distingue "no hay nadie"
  —normal— de "no contesta". Con Supabase caído: las páginas públicas se sirven igual, las
  rutas API dan 503 con JSON y el resto enseña `/no-disponible`, un 503 por `rewrite` que
  no cambia la URL, así que recargar reintenta donde estabas. No se manda al login a
  propósito. Antes, una caída dejaba el logo de "Cargando Farpi" para siempre.
- **`/api/salud`** (28-08-2026), para que un vigía externo se entere antes que la
  familia. Mide las dos mitades de Supabase por separado —`/auth/v1/health` y una
  consulta anónima que la RLS deja siempre en cero filas— y contesta **200 si las dos
  van, 503 si alguna falla**, con los milisegundos de cada una y sin un dato de nadie
  dentro. Va **fuera del `matcher` del proxy** a propósito: lo que vigila a Supabase no
  puede atravesar la pieza que puede estar colgada. Falta darla de alta en un vigía.
- Vistas grandes despiezadas: cada pantalla con estado propio tiene su hook (`useListsState`, `useMealsState`, `useDocsState`, `useEventSheet`) y los bloques de UI viven en su fichero (`WeekGrid`, `MealRow`, `DocCard`, `FileTypeIcon`, `OffDayConfirmDialog`, `LoginHero`, `EventRecurrenceFields`, `EventSeriesDelete`, `ListItemRow`). `EventSheet` fue el último: de 483 líneas a cuatro piezas.
- Andamiaje de sheets unificado: `useSheetForm`/`useSheetDelete` (`src/hooks/useSheetForm.ts`) y los componentes `Field`, `SheetFooter`, `SelectChip` y `DotOption` en `src/components/ui/`.
- **449 tests con el runner de Playwright**, sin dependencias nuevas. Este es el
  **único** sitio con el recuento exacto: el resto de documentos habla de "los
  unitarios" y "los de navegador", o los aproxima, para que no haya seis cifras que
  actualizar a la vez.
  - 343 unitarios de lógica pura en `e2e/unit/`, contados en la pasada del 31-08-2026 (recurrencia, fechas, selectores, validadores, asignaciones, eventos, tramos y agrupación por persona de la agenda, eje de horas, franjas de comida, detección de modo demo, el almacenamiento de documentos —caducidad del token, URL de consentimiento, traducción de los errores de Google y cifrado— y, desde el 31-08-2026, el dinero: la conversión de lo tecleado a céntimos en las dos direcciones, el formato en euros, y los presupuestos —cuánto llevas, cuánto te has pasado, quién ha puesto qué y la agrupación de los presupuestos pedidos—). No levantan servidor: `npm run test:unit`. Los 19 de `timeline.spec.ts` se fueron con el eje de horas del móvil el 24-08-2026 y **volvieron el 26-08-2026** con las vistas Día y Semana de escritorio, sin tocar una línea.
  - 106 de navegador. La cifra sale de la pasada completa del 31-08-2026 (449 en total,
    343 unitarios):
    `smoke.spec.ts` (login demo → /home), `runtime.spec.ts` (apertura de sheets y flujos CRUD), `movil.spec.ts` (390×844: desbordes y tamaño mínimo de los controles) y `escritorio.spec.ts` (1440 px: barra lateral, rejilla de comidas y la columna de acceso anclada de la portada; 1023 px: que por debajo del corte no cambie nada). `npm run test:e2e` los corre todos levantando el dev server en :3100.
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

Sin pendientes. La última pasada es del **01-09-2026**, con `node scripts/validate-rls.mjs`
contra la base real y ya con las tres tablas de Finanzas aplicadas: **99/99**. Las diez
últimas son suyas: seis de las de siempre en `budgets`, `expenses` y `quotes` —A crea, B
no ve—, una de que B tampoco puede escribir un gasto en la familia de A, y las tres de
los triggers de `expenses`, que rechazan un gasto cuyo presupuesto, hijo o miembro sea de
otra casa. La de `budget_id` es la que había que ver fallar: apunta a una tabla nueva y
su trigger se escribió con la sección.

Antes de eso, la pasada del **31-08-2026** dio **89/89** con la tabla `notes`. Sus tres
comprobaciones —A la crea, B no la ve, B no puede escribir una en la familia de A— son todo lo
que hay que comprobar en una tabla cuya única defensa es la policy por `family_id`, y
que importa porque es donde la familia escribe la clave del wifi. Antes fueron las 70 del esquema
con los documentos en Drive más las nueve de **cerrar una familia** (§13): que no la
cierra ni un miembro no admin, ni un ajeno, ni un `delete` saltándose la RPC, que nadie
se queda sin familia, y que la cascada se lleva lo que colgaba. Las once que trajo el
paso a Google Drive siguen ahí: siete de `storage_connections` —que **nadie la lee por PostgREST, ni su
propia fila**, que es lo que mantiene los refresh tokens fuera del alcance del
navegador— y cuatro de las columnas nuevas de `documents`, entre ellas que un ajeno no
ve el documento aunque conozca su identificador de archivo de Drive. La limpieza se llevó los tres usuarios y las dos familias
de prueba que quedaban en pie; los datos reales no se tocaron. Detalle en `docs/supabase-validation.md`, que es el sitio donde vive
esto; aquí solo el titular.

## Siguiente paso recomendado

La app está en producción y en uso diario por la familia, y probada en un móvil
real. Lo que queda son dos comprobaciones baratas y funcionalidades que no existen.

### Las comprobaciones que quedaban: ninguna

Las dos que había aquí se cerraron el 06-08-2026:

- **RLS revalidado** tras las migraciones 015 y 016: 51/51. Los triggers de `tasks`
  saltan de verdad, que era la duda — que estuvieran escritos no probaba que lo
  hicieran.
- **El cron corre solo** a las 07:00 UTC y devuelve `keptAlive: true`, comprobado en
  los logs de Vercel. Supabase no se va a pausar por inactividad.

### Funcionalidades que faltan, no riesgos

1. ~~**Notificaciones push.**~~ **Hecho.** Probadas de punta a punta el 28-08-2026
   con una cuenta real (`sent: 1, fallidos: 0`), con las claves VAPID ya en Vercel.
   El `CRON_SECRET` de Vercel, desalineado con el local, ya está igualado y
   comprobado. El arreglo del service worker (revertido por error en `652ce96`,
   creyendo que había roto el arranque) volvió en `ced89ed` el mismo día: la causa
   real fue una caída de Supabase, no el código. Ver `docs/notificaciones.md`.
2. ~~**Backup/export de datos de la familia.**~~ **Hecho el 27-08-2026** (ver
   "Copia de seguridad" en `docs/historial.md`). Lo que sigue siendo verdad, y por lo
   que era insustituible: con
   los documentos en Drive el riesgo cambia de forma más que de tamaño: los archivos
   están ahora en una cuenta de Google de verdad (con su propia papelera y su propio
   backup), pero a cambio dependen de que esa persona siga en la familia y con el
   permiso dado. El calendario y las fichas siguen en un único proyecto Supabase del
   plan gratuito, sin exportación.

### Decisión abierta

3. **Google Play (TWA)**: falta el package name definitivo,
   `public/.well-known/assetlinks.json` (necesita el SHA-256 de la firma) y la guía
   `docs/play-store.md`. La PWA y la política de privacidad ya están.

### Después

4. Medir el contraste de la paleta (el resto de la revisión de accesibilidad —roles,
   labels, foco, `inert` en los sheets— está hecha, Fase 8 del roadmap).

## Historial

Los trabajos ya cerrados, con su porqué, están en `docs/historial.md`.
