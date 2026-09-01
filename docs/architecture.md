# Arquitectura

## Objetivo técnico

Mantener Farpi simple: una app web privada, mobile-first, con Supabase como backend base y sin introducir backend complejo.

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

- Clave: `farpi_store_v1`
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
- ~~Storage privado para documentos.~~ El bucket se borró el 27-08-2026: los archivos
  viven en el Google Drive de quien los sube (ver "Documentos en Google Drive" más
  abajo). Supabase se queda con la base y la autenticación, y ya no guarda archivos.

Estado:

- Proyecto Supabase creado y esquema aplicado.
- UI conectada mediante repositorios reales (`src/lib/supabase-repos/`, un módulo por dominio igual que el mock).
- Auth, invitaciones por magic link y roles operativos. Los documentos pasaron de
  Storage a Google Drive el 27-08-2026.
- Validación aislada completada (2026-08-03): 47/47 comprobaciones de RLS, RPCs, integridad y Storage. Ver `docs/supabase-validation.md`.
- Esquema al día y revalidado. La última pasada de `node scripts/validate-rls.mjs`
  es del 27-08-2026: **80/80**, con las conexiones de Google Drive dentro. El historial
  de cada pasada está en `docs/supabase-validation.md`, que es donde vive.
- `mapFamily` (`src/lib/supabase-repos/family.ts`) normaliza `meal_slots` ausente a "las
  cuatro franjas". Para producción ya no hace falta, pero es lo que permite desplegar
  código antes que SQL, que es el orden en el que pasan las cosas aquí.

La detección de "modo demo" (sin credenciales reales) está centralizada en `src/lib/supabase/env.ts` y la comparten cliente, servidor, proxy (`middleware.ts`) y rutas API, para evitar divergencias entre capas.

El esquema completo está en **`supabase/schema.sql`**: un solo archivo con las
tablas, las restricciones, los índices, los triggers, las funciones, la RLS, las
RPCs. Aplicado sobre un proyecto
Supabase vacío deja una base idéntica a la de producción.

Se aplica a mano por el SQL Editor. **No hay CLI de Supabase enlazada, y es a
propósito**: local y producción apuntan al mismo proyecto, así que un `db push`
distraído escribiría sobre los datos de una familia de verdad.

Hasta el 26-08-2026 esto eran 21 migraciones numeradas (`001…021`) más un
`all_in_one.sql` generado por concatenación. Se aplastaron al cerrar el proyecto,
porque el historial había dejado de ayudar: para saber qué valores admitía
`events.kind` había que abrir tres archivos y seguir dos `drop constraint`. Las
21 siguen en git —en el commit anterior al aplastado— para cuando haga falta el
porqué de una decisión concreta, que es lo único que aportaban ya.

El precio de aplastar, dicho claro: el archivo nuevo **no se ha aplicado nunca a
un proyecto vacío**, así que su equivalencia con la base real está comprobada
objeto por objeto (tablas, columnas, restricciones, índices, triggers, funciones,
policies y grants, todos cuadran) pero no ejecutada de punta a punta. Quien
levante un proyecto de cero es quien lo confirmará.

**Para cambiar algo**: se edita `schema.sql` *y* se aplica el `alter` suelto en el
SQL Editor. Las dos cosas, o el archivo miente. Después, `node
scripts/validate-rls.mjs` y se anota la pasada en `docs/supabase-validation.md`.

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
- `/api/account/delete` aplica la regla del último admin. **Ya no borra archivos**:
  desde que viven en el Drive de quien los subió son suyos y están en su disco, y
  usar el permiso que dio para guardar papeles de la familia para vaciarle el Drive
  no es lo que autorizó. Se va la ficha, con la familia; la conexión se va en
  cascada al borrar el usuario.
- `/api/documents/*` son las cuatro rutas nuevas de los documentos. La regla que
  las sostiene: **primero** se comprueba con el cliente del usuario (RLS) que puede
  ver la ficha, y **solo después** se usa el cliente de servicio para leer el token
  del dueño. Al revés serían una puerta a los documentos de cualquier familia.
- `/api/push` se apoya en la policy de `push_subscriptions`: un upsert con el
  endpoint de otra persona no puede robar su suscripción porque el `using` de la
  policy no deja tocar filas ajenas.
- `/api/cron/reminders` se protege con `CRON_SECRET`, y el proxy la deja pasar
  sin sesión a propósito.
- El proxy (`src/proxy.ts`) manda al login todo lo que no sea público.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app.
  Sin eso, un enlace de correo legítimo podía acabar en otra web justo después
  de iniciar sesión.
- Cinco cabeceras en `next.config.ts`, **CSP incluida** desde el 26-08-2026. Estuvo
  meses aparcada por un motivo que sigue siendo cierto —Next inyecta scripts en línea y
  una CSP mal puesta rompe producción sin avisar en local—, y por eso lleva
  `'unsafe-inline'` en `script-src`: no para un XSS en línea, pero sí cargar scripts de
  otro dominio, `<object>`, el iframe, reescribir `base`, enviar un formulario fuera y
  hablar con cualquier servidor que no sea Supabase. `connect-src` se arma con la URL
  real del proyecto, no con un comodín. Se prueba contra el build servido, no contra
  `npm run dev`.

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

## Cerrar una familia

**Decisión de producto (27-08-2026):** una familia se puede eliminar, y hasta ahora no.
Crear una era un toque y deshacerlo no existía: quien creaba una por probar se la
quedaba para siempre en la lista de Ajustes. Con dos reglas:

- **Solo un admin de esa familia.** Ser admin de otra no sirve, igual que en el resto
  de RPCs de miembros.
- **Nunca la última que te queda.** Farpi siempre trabaja *dentro* de una familia
  —`AppShell` resuelve una activa antes de pintar nada—, así que quedarse sin ninguna
  no es un estado del que la app sepa volver. Para dejarlo todo está borrar la cuenta,
  que sí se lleva las familias donde estabas solo. Cuando no se puede, el sheet lo dice:
  la ausencia del botón sin explicación era justo lo que no se entendía.

Con más gente dentro **sí se puede**, y es deliberado: manda el admin, como en todo lo
demás. Lo que hace la interfaz es contar lo que se lleva por delante —"3 personas, 12
eventos y 4 documentos"— en el segundo paso del borrado, en vez de un genérico "se
borrará todo". El resumen lo arma `selectFamilySummary` en `src/lib/selectors.ts`.

**Implementación:** RPC `delete_family(p_family_id uuid)`, `security definer`. No es un
`delete` normal porque `families` **no tiene policy de `delete`** —igual que
`family_members` no tiene de `update` ni `delete`—: las dos comprobaciones de arriba no
caben en una policy. Lo demás se va solo, por el `on delete cascade` de todas las tablas
que cuelgan de `families`; el mock lo imita a mano en `store/family.ts`.

**Los archivos de los documentos no se tocan**, por lo mismo que en
`/api/account/delete`: están en el Google Drive de quien los subió y son suyos. Lo que
se va con la familia es la ficha. El sheet lo avisa antes de borrar.

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

## Documentos en Google Drive

Desde el 27-08-2026 los archivos de los documentos **no los guarda Farpi**: viven en
el Google Drive de quien los sube. La familia no se entera —los ve igual, en la
misma pantalla— y nadie más de la casa tiene que conectar nada.

### La segunda frontera

`src/lib/repos/types.ts` es la frontera de la interfaz. Esta es otra, distinta y
más abajo:

```text
                    Repos (frontera de la interfaz, navegador)
                      └─ documents → /api/documents/*
                                        ↓ (solo servidor)
              DocumentStorageProvider (src/lib/document-storage/types.ts)
                └─ googleDrive (google-drive.ts)
                   [futuro: dropbox (App folder), oneDrive (Microsoft Graph)]
```

La regla que la mantiene pequeña: **el proveedor es solo el disco**. No sabe qué es
una familia, no decide quién puede leer y no toca la base. Quien manda sigue siendo
la RLS. Añadir Dropbox u OneDrive es implementar la interfaz, registrarla en
`document-storage/index.ts` y añadir el valor al `check` de `documents.storage_provider`.
Esa columna existe con un solo valor a propósito: es la que hace que el contrato se
use de verdad (`getProvider(doc.storage_provider)`) en vez de quedar de adorno.

### Modelo de acceso: proxy para leer, directo para subir

- **Leer**: nadie habla con Drive salvo el servidor. Cuando otro miembro abre un
  documento, Farpi usa el token guardado del **dueño**, se trae el archivo y lo sirve
  él por `/api/documents/[id]/file`, aplicando el control de acceso de siempre.
- **Subir**: el navegador manda los bytes **directamente a Google**, a una dirección
  de un solo uso que abre el servidor (`/api/documents/upload-session`). No es una
  excepción caprichosa: una función de Vercel corta el cuerpo de la petición muy por
  debajo de los 20 MB que admite un documento, así que proxiar la subida sería bajar
  el tope del producto. Y quien sube es el dueño del Drive, que es el caso en el que
  el proxy no compra nada. Por eso `connect-src` de la CSP abre `www.googleapis.com`.

### El permiso prestado

- Scope **`drive.file`** y ninguno más: solo los archivos que crea esta app. Es un
  scope **no sensible**, así que Farpi no pasa por la verificación de Google ni por la
  auditoría CASA. Cambiarlo por `drive` o `drive.readonly` mete el proyecto en un
  proceso de semanas.
- Los tokens viven en `storage_connections`, **cifrados** (AES-256-GCM, `DOCS_TOKEN_KEY`
  en Vercel), en una tabla con RLS activada y **ninguna policy**: solo entra el service
  role desde una ruta API. Dar `select` al dueño parece inofensivo y no lo es — la CSP
  lleva `'unsafe-inline'` en los scripts y por tanto no para un XSS en línea, que con esa
  policy se llevaría un refresh token.
- Refresco perezoso, con un minuto de margen antes de caducar. Se hace por adelantado
  y no ante un 401 porque el 401 llega a mitad de una descarga ya empezada.

### Lo que pasa cuando se cae

`invalid_grant` no es un fallo pasajero: el permiso se revocó, o caducó. Se marca
`revoked_at` y **no se borra nada**, ni la conexión ni las fichas ni el archivo.

- A quien intenta abrir se le dice con nombre: «lo subió Marta y su almacenamiento ya
  no está conectado». Sin el nombre el aviso no se puede resolver, porque no dice a
  quién avisar.
- Al dueño le vuelve a salir el botón de conectar, y al reconectar todo revive: los
  identificadores de archivo no cambian.
- Es distinto de que el dueño borre el archivo en su Drive (`archivo_no_esta`), que no
  tiene arreglo desde la app. Los dos mensajes son distintos a propósito.
- Quitar a un miembro de la familia tiene el mismo efecto, y el sheet lo avisa antes
  con el recuento de documentos que se quedarán sin poder abrirse.

### Estado de publicación en Google

Con la pantalla de consentimiento en **"Testing"**, Google caduca los refresh tokens a
los **7 días** y solo dejan entrar las cuentas de la lista de usuarios de prueba. Las
dos cosas rompen el sistema en silencio y con retraso. Hay que dejarla **"In
production"**; con solo `drive.file` no hace falta verificación para hacerlo.

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
`SideNav` (`hidden lg:flex`, 224 px a la izquierda) toma su lugar. No enseñan lo mismo:
la columna lleva las **seis** secciones (`SECCIONES`), y la barra de abajo cinco más
"Más" (`SECCIONES_MOVIL`, que se deriva de la anterior quitando Documentos). Ajustes no
es una sección en ninguna de las dos: en escritorio se entra por el pie de `SideNav`
(`AccountFooter`) y en móvil por "Más" (`MoreMenu`); a 390 px no caben siete etiquetas. `AppShell` monta `SideNav` **después** de
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

**Las cuatro pantallas de lista abren igual** (`ViewHeader`, 28-08-2026): bajo el título
verde de `TopBar`, una fila con el resumen de lo que hay, el buscador y el `+` de alta.
Listas, Tareas, Comidas y Documentos la tenían escrita por separado y ya había
divergido: Tareas ponía el `+` flotando abajo a la derecha, Listas y Comidas lo ponían
arriba con el buscador debajo, y Documentos lo subía a la fila solo en escritorio. Eran
cuatro sitios distintos donde buscar lo mismo según en qué pantalla estuvieras.

En móvil, cuando hay buscador el resumen se calla: a 390 px no caben las tres cosas, y el
propio buscador ya dice cuántas hay ("Buscar en 19 ítems…"). En escritorio caben, así que
el resumen manda a la izquierda y el buscador se queda con tope de ancho (`lg:max-w-sm`),
que estirado a todo el contenedor era lo que hacía que la pantalla pareciese el móvil
ensanchado. Comidas no tiene buscador —el menú de la semana cabe entero— y enseña siempre
el resumen. El escritorio de Comidas es otra barra (navegación de semana y "Añadir"), y no
usa esta.

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

**La prioridad de una tarea no se dice con color** (27-08-2026). En el sheet eran tres
círculos de color con su etiqueta —el mismo `DotOption` de "Asignar a"—, y quedaban en el
`Field` inmediatamente siguiente: dos filas idénticas seguidas, dos significados. Peor
aún, el círculo de "Media" era `#E9C46A`, el `FAMILY_COLOR` **exacto** (ΔE00 0), con
Champán dorado a 9,4 y Canela clara a 12,1 por detrás, los dos por debajo del umbral 15
que se le exige a cualquier pareja de `PERSON_COLORS`.

No se retocaron los tonos porque el problema no era el tono, y por eso `TASK_PRIORITIES`
ya no tiene campo `color`: es la regla de más abajo aplicada del revés. **El color dice
"de quién"**, y la prioridad es un grado, no una identidad. Ahora son chips de texto, los
mismos que "Repetición", que está justo debajo: la palabra dice "Alta" sin que haya que
aprenderse qué significa un punto rojo. `DotOption` se queda para `AssigneePicker` y solo
para ella, que es donde el círculo de color sí es la identidad de alguien.

En la lista sí queda señal de color —la banda de 4 px al borde de la tarjeta, en
`PRIORITY_BORDER`—, y ahí no choca: una banda pegada al canto no se confunde con un punto
que además lleva el nombre al lado. Es la misma distinción de forma y sitio que separa la
franja de vacaciones de la etiqueta de un evento.

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

**La lista tiene dos ejes: por días y por persona** (27-08-2026). Una casa con varios se
hace dos preguntas —"¿qué hay el jueves?" y "¿qué lleva cada uno?"— y la agenda solo
contestaba la primera: de quién era cada cosa se decía fila a fila, en la etiqueta de la
derecha, así que verlo junto era ir sumando de memoria. Con el eje por persona el rótulo
pasa de ser el tramo ("Hoy", "Esta semana") a ser la persona, y debajo van sus días con
las filas de siempre.

**Es un eje, no una vista nueva.** La misma lista, los mismos cuarenta y cinco días, las
mismas filas; lo único que se mueve es el rótulo. Por eso el interruptor vive en la lista
y no en la cabecera del calendario —el mes y el eje de horas se agrupan por días y no
tienen otra forma de agruparse— y por eso tampoco se recuerda entre visitas, igual que la
vista: se entra por la pregunta de siempre.

Lo que se descartó fue **una columna por persona**, que era la idea de partida. Choca con
la razón por la que no hay siete columnas en el móvil: a 390 px, una casa de cinco deja
columnas de ~65 px y un bloque ahí no dice nada. Agrupar no necesita ancho.

Las reglas del reparto están en `agruparPorPersona` (`src/lib/agenda.ts`), con sus
unitarios:

- **El orden de las personas es el de siempre**, el de `buildAssignees`: familia, adultos,
  hijos. La agenda no inventa un orden propio. La familia va primera: no es de nadie en
  particular pero afecta a todos, y colgarla del final sería esconder la cena de los
  abuelos debajo del pequeño.
- **Quien no tiene nada no sale**, que es la misma regla que ya cumple un día vacío.
- Un evento de varios días **sale en cada día que ocupa**, igual que en el eje de días:
  cambiarlo en un eje y no en el otro sería que la misma fila se cuente de dos maneras
  según el rótulo que tenga encima.
- Dentro del grupo, las filas **dejan de decir el nombre**: ya está en el rótulo, y
  repetirlo era escribir tres veces "Marta" para tres citas de Marta. El título recupera
  ese ancho. Vale para el evento y para la tarea, que dentro de la misma tarjeta no
  pueden hablar de dos maneras.
- El salto desde el mes va por `id` y un mismo día sale bajo varias personas: **el ancla
  se la queda la primera aparición**. Dos elementos con el mismo `id` dejarían el salto a
  merced de cuál encuentre el navegador primero.

**Los cumpleaños tienen su propio bloque, y no salen ni en la rejilla ni en la agenda**
(28-08-2026). Un cumpleaños se apunta una vez y se repite veinte años, así que una casa
con cuatro abuelos y tres amigos del cole metía siete filas fijas al mes que no son nada
que hacer, entre la revisión del coche y la cena de los abuelos. Ahora `CalendarView`
los aparta **una sola vez** —`allEvents.filter(e => !isBirthday(e))`— y los pinta
`Birthdays`, debajo del mes y pegado a "Vacaciones y descansos".

Es el mismo razonamiento que sacó los festivos de la agenda y las ausencias de las filas
de cada día: **lo que _es_ el día se dice una vez y aparte**, y la lista se queda para lo
que hay que hacer. Por eso los dos bloques son vecinos y tienen la misma forma.

Por el camino se probó y se descartó un **interruptor "Ver cumpleaños"**, apagado por
defecto, que llegó a estar escrito el 27-08-2026: obligaba a elegir entre ver el mes o
ver los cumpleaños —la misma elección falsa de las pestañas Agenda/Mes— y encendido
devolvía el problema entero. Con él se fue el reparto por grupo "Cumpleaños" del eje por
persona de la agenda: si un cumpleaños no llega a la lista, no hay a quién repartírselo.

La etiqueta del bloque es **el nombre sobre el lila de `CUMPLE_COLOR`**, ni un color de
persona ni el amarillo de la familia. Antes decía "Familia", y eso metía a la abuela en
la familia por la puerta de atrás justo después de haber decidido no darla de alta.

**Las flechas no se mueven de sitio** (28-08-2026). El grupo del título ocupa el ancho
libre —topado a `lg:max-w-sm` en escritorio— y el título se estira dentro, así que la
flecha de anterior y la de siguiente caen siempre en el mismo píxel. Antes el grupo se
encogía a lo que midiera el texto, y el texto cambia en cada paso: "Lunes, 1 de
septiembre" y luego "Martes, 2 de septiembre", o el mes contra la semana, que no miden
igual. La flecha se desplazaba a cada toque y había que volver a buscarla para dar el
paso siguiente.

**Y se pasa de mes con el dedo** (28-08-2026, `src/hooks/useSwipe.ts`). Es el gesto que
ya tiene cualquier calendario del móvil, y sin él las flechas eran la única forma de
moverse. Lo que hay que cuidar es **no robarle el gesto al desplazamiento vertical**: se
mide al levantar el dedo —así no hace falta `preventDefault` en `touchmove`, que es lo
que congela el desplazamiento— y solo cuenta si el recorrido pasa de 50 px y es más del
doble de horizontal que de vertical. Cuelga de la rejilla y del eje de horas, que es lo
que se está pasando, y **no de la tarjeta entera**: debajo están las ausencias y los
cumpleaños del mes, y arrastrar el dedo por una lista para leerla no puede cambiar el mes
que tiene encima.

**En escritorio hay tres vistas: Día, Semana y Mes** (26-08-2026), el trio de Google
Calendar, con su selector en la cabecera. En móvil el selector también está, con una
cuarta —Agenda, la lista continua— y va debajo del título y a todo el ancho, porque
cuatro pestañas no caben al lado de "Agosto 2026" y ahí es donde acierta el pulgar. Con
él se fue el plegable del mes: eran dos maneras de pedir lo mismo.

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

**El día entra entero y sin cortarse** (26-08-2026). Dos cosas lo rompían. Una, que el eje
se recortaba solo a las horas con algo: en móvil tenía sentido —un día de dos citas no
tenía por qué enseñar la madrugada— pero en escritorio dejaba una semana con dos huecos
de tres horas. Ahora el eje cubre **de siete a diez de la noche como mínimo**, y se estira
si hay algo antes o después. Y dos, que vivía en una caja con `max-h` y scroll propio, que
es lo que se veía cortado: ahora el alto de una hora se calcula en CSS —`--alto-hora`, con
suelo de 28 px para que una cita corta siga siendo pulsable— y las posiciones de los
bloques van en `calc()` sobre esa variable.

**La cabecera dice qué estás mirando**: el mes, la semana como tramo ("24 – 30 de agosto")
o el día entero ("Jueves, 27 de agosto"). Antes siempre ponía el mes, también mirando una
semana, y entonces las flechas parecían de mes: no había forma de saber en qué semana
estabas ni de ver que se movían de siete en siete. Sus etiquetas accesibles acompañan
("Semana anterior", "Día siguiente"). En la vista de un día desaparece la cabecera de
columna, que repetía lo que el título acaba de decir.

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

**La rejilla del mes se dibuja como una rejilla, también en móvil** (31-08-2026). Las
líneas entraron el 26-08-2026 solo en escritorio, donde una pantalla grande con pocos
eventos se leía como un vacío; en móvil se dejaron fuera apostando a que a 52 px de celda
la proximidad bastaba para leer las columnas. No bastaba: con las celdas casi pegadas, un
número y sus puntos se confundían con los del día de al lado y seguir una semana en
horizontal costaba.

Van en `--color-line`, el borde normal de la app, y no en el `hairline` con el que
nacieron: a ese tamaño el hairline sobre blanco casi no existe, y una línea que no se ve
no separa nada. El mismo tono en las dos tallas, que es lo que hace que sea la misma
pantalla. Con las líneas se fue el relleno que la rejilla tenía alrededor en móvil
(`px-2 pb-1`): tienen que morir en el borde de la `Card`, o la última columna y la última
fila quedan flotando a dos píxeles del marco y se ve el remiendo. Y la celda gana un alto
mínimo de 52 px en móvil, para que un día sin nada no encoja su fila.

**La rejilla del mes es de un solo mes, y las puntas se rellenan** (26-08-2026). Se
dibuja por semanas completas —si no, las columnas dejarían de ser días de la semana— y
los días de los meses vecinos **sí se pintan**, con su número en gris claro y **el fondo
teñido**. Cuando septiembre empieza en martes, el lunes de esa fila es el 31 de agosto:
dejarlo en blanco parte la semana por la mitad y la fila deja de leerse como una semana.

Estuvieron en blanco entre el 24 y el 26-08-2026, y con motivo: antes se pintaban
**igual que los días del mes**, solo con el número en gris, y así se leían como días
sueltos que no decían de qué mes eran —era el mayor foco de ruido de la pantalla—. El
relleno es lo que lo arregla: con el fondo teñido ya no tienen la misma forma que los
suyos. Es, por cierto, el mismo relleno que se descartó para los fines de semana porque
"se lee como que estas celdas están apagadas"; aquí eso es exactamente lo que hay que
decir.

Siguen sin ser botones y sin enseñar nada de lo que pasa ese día: están para cerrar la
semana, no para consultarlos. Al 1 de septiembre se llega con la flecha, que es un toque
igual.

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
    Además en Farpi **el color significa persona**, y un fondo que no es de nadie va contra
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

**Cerrado el 26-08-2026, y era una fuga.** Este párrafo decía que el alcance era solo
la vista del calendario y que `selectTodayEvents` seguía sacando los descansos en
Inicio. Lo seguía haciendo, y los festivos también en cuanto entraron: los dos salían
en "lo que hay que hacer hoy", en "esta semana" y en el correo de las siete de la
mañana, donde un festivo se anunciaba como "tenéis 1 evento".

La causa era que la regla estaba escrita de cuatro maneras por la app y dos de ellas
solo apartaban las vacaciones, así que al entrar el descanso (017) y el festivo (020)
nadie volvió a mirarlas. Ahora es **una sola**: `isPlan(event)` en `src/lib/events.ts`,
lo contrario de `isRangeKind`, y el cron arma su filtro contra Postgres con la misma
lista (`RANGE_KINDS`). Los tests que la cubrían también miraban solo las vacaciones,
que es por lo que la fuga sobrevivió en verde; ahora comprueban los tres.

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

**Un cumpleaños no es un evento** (27-08-2026). Se pensó en crearlos como eventos
recurrentes al guardar la fecha de nacimiento, y se descartó: habría que darlos de alta,
borrarlos al borrar a la persona, arrastrarlos al cambiar la fecha y decidir qué se hace
con los años ya pasados. Un cumpleaños **se deduce** de un dato que ya estaba guardado en
Ajustes, así que es dato derivado (`src/lib/birthdays.ts`), como "lo que falta en cada
lista": nada que mantener y nada que se desincronice. La consecuencia, y es a propósito:
no se puede editar, ni asignar, ni tiene hora, ni sale en el calendario. Se cambia donde
se cambia la persona.

Solo lo tienen los **hijos y los adultos sin cuenta**, que son los que llevan
`birth_date`. Los miembros con cuenta no lo tienen: añadirlo obliga a tocar el esquema en
producción y la RPC del perfil, y no se hizo con esto.

**Y el de la abuela sí es un evento** (27-08-2026). La regla de arriba vale para quien
está en la casa. Para la abuela, un primo o el amigo del cole no hay ninguna ficha de la
que deducir nada, y la única forma de apuntar su cumpleaños era **darle de alta como
persona**: con su color, asignable, y saliendo en todos los selectores de "de quién es
esto". Eso es meter en la familia a quien solo queremos felicitar.

La salida es un tipo de evento, `kind = 'cumple'`: se apunta en el calendario, que es
donde ya vive todo lo que tiene fecha. Reglas, y por qué:

- **El tipo manda sobre la recurrencia.** Un cumpleaños es anual por definición, así que
  el sheet no enseña el selector de repetición: guarda la serie de veinte años
  (`ANOS_DE_CUMPLE`) con la misma maquinaria que los festivos. Preguntar "¿hasta qué año?"
  al apuntar el cumpleaños de la abuela es trabajo administrativo.
- **Día completo, un solo día, de nadie.** Ni hora ni asignación: el color significa "de
  quién es esto" en el resto de la app, y un cumpleaños de fuera no le toca a nadie en
  particular. Lo fija la base con `events_cumple_de_un_dia`.
- **El año de nacimiento es opcional** (`events.birth_year`). De la abuela se sabe; del
  amigo del cole, casi nunca. Lo único que cambia es si Inicio dice "cumple 77 años" o
  "hoy es el cumple de X". Va en la fila y no se deduce de `start_at` porque la serie
  arranca en el año en curso: la fecha dice el día que se celebra, no el día que nació.
- **En Inicio se juntan los dos orígenes** (`cumplesDeLaCasa`), porque en la tarjeta de hoy
  son lo mismo. Pero un cumpleaños **no cuenta como plan del día** (`isDigestPlan`): sin
  esa distinción salía dos veces en la misma pantalla, arriba como celebración y debajo
  como una cita más.

La asimetría que esto deja, asumida a propósito: **el cumpleaños de fuera se ve en el
calendario y el de casa no.** Es explicable —en el calendario está lo que se apunta, y el
de casa no está apuntado en ninguna parte— y la alternativa era peor: si el apuntado
tampoco se viera ahí, no habría dónde corregirlo ni borrarlo. Desde el 28-08-2026 se ve
**solo en su bloque**, debajo del mes, y no en la rejilla ni en la agenda. Por eso el pie del bloque de
Inicio lleva al calendario cuando todo lo que enseña son cumpleaños apuntados, y a Ajustes
cuando hay alguno de la casa.

**El de hoy y los que vienen se leen distinto.** El de hoy abre la tarjeta de hoy, con la
tarta y el color de la persona; los siguientes van en su bloque, con catorce días de
ventana (`DIAS_AVISO_CUMPLE`). Es lo único de Inicio que **caduca el mismo día** —una cita
se recupera por la tarde, un cumpleaños visto a las once de la noche ya no se felicita— y
por eso el aviso de las siete lo pone delante de las tareas y de los papeles que caducan.
Ese aviso solo felicita **el mismo día**: avisar con antelación no es recordar un
cumpleaños, es adelantarlo.

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

**En escritorio, el pie de la columna dice quién eres y lleva a Ajustes y a la salida**
(28-08-2026). Son tres filas (`AccountFooter`): el nombre con su inicial, que es un
letrero y no abre nada; Ajustes, que va a `/settings`; y cerrar sesión, bajo una línea.
Arregla dos cosas que tenía el enlace "Ajustes" suelto que había antes: la app no decía en
ninguna pantalla con qué cuenta estabas —en una casa con dos adultos y un móvil compartido
eso importa— y cerrar sesión vivía a cuatro toques, dentro de la pestaña Cuenta de la
pantalla a la que menos se entra. Ese mismo día la fila de la cuenta llegó a ser un botón
que abría un sheet con las secciones de Ajustes dentro; duró lo que el equivalente de
móvil, porque en una columna con sitio de sobra el menú solo añadía un clic y un armario
que abrir delante de las dos únicas cosas que se buscan.

**En móvil se navega por un solo borde: el de abajo** (28-08-2026). Lo anterior estuvo
también arriba a la derecha de `TopBar`, un círculo con la inicial, y duró un día: eran
dos sitios donde tocar para salir de las cinco pantallas de siempre, y el de arriba no
decía a dónde llevaba. Ahora la cabecera de móvil es solo el título, y la sexta pastilla
de la barra es **"Más"** (`MoreMenu`): Documentos, Ajustes y cerrar sesión.

Documentos baja ahí porque es la sección a la que menos se entra —el DNI y el libro de
familia se miran dos veces al año— y era la única cuya etiqueta no cabía a 390 px: se
escribía "Docs" abajo y "Documentos" al lado. Dentro de "Más" se lee entero y las dos
navegaciones lo llaman igual. Esa esquina de la cabecera se había liberado el 26-08-2026
al quitar la rueda de Ajustes, y vuelve a estar libre.

El menú llevó un rato las **cinco secciones** de Ajustes sueltas —Familia, Casa, Cuenta,
Sincronización, Legal—, cada una directa a su pestaña. No funcionó: mezcladas con
Documentos y con cerrar sesión hacían un menú largo donde no se distinguía a simple vista
"una pantalla de la app" de "una pestaña dentro de otra pantalla". Ajustes es una fila
más, como Documentos, y elegir pestaña es cosa de las pestañas. Cerrar sesión sí se mudó
de verdad, y va aparte: no es un ajuste de la casa, es salir de la app.

La lista de secciones vive en `src/components/settings/pestanas.ts` y la comparten
`pestañaDesdeUrl` y las pestañas de `SettingsView`, que ya no guardan cuál está activa:
**la dice la URL** y solo la URL, porque se puede entrar por `?seccion=` sin desmontar la
pantalla y con dos fuentes de verdad había que sincronizarlas a mano. Las pestañas escriben la suya con
`replace`, para no llenar el historial de pasos atrás dentro de la misma pantalla.

Nombrar las secciones obligó a arreglar dos. **Sincronización** estaba vacía para quien no
tuviera Drive conectado: la tarjeta solo se pintaba si había algo que contar, porque
conectar se ofrece donde hace falta —al ir a subir— y no en una lista de ajustes. Eso valía
cuando a la pestaña se llegaba de paso; anunciada en el menú, una sección vacía es peor que
la tarjeta que se ahorraba, así que ahora dice siempre qué es Drive y ofrece conectarlo. Y
**borrar cuenta vuelve de Legal a Cuenta**: se había ido a Legal para que no se confundiera
con cerrar sesión, que era la fila de justo encima, y cerrar sesión ya no vive ahí. Sigue
siendo una tarjeta aparte, en rojo y con confirmación.

El nombre de la casa no sale en la fila. Estuvo un rato bajo el de la persona y confundía
las dos cosas —quién eres y en qué casa estás—; se dice en Ajustes → Familia, que es donde
se cambia.

Un detalle de apilamiento que costó una vuelta: en móvil el menú cuelga de `TopBar`, que es
`fixed z-50` y **crea contexto de apilamiento**, así que el `z-[60]` del sheet no competía
con el `z-50` de la barra de abajo y esta le tapaba la última sección. El sheet de la
cabecera se pinta con `createPortal` en el `body` —donde vuelve a estar a la altura de los
sheets del resto de la app, que cuelgan de `main`— envuelto en un `lg:hidden`, porque
sacarlo del botón lo saca también de su `lg:hidden` y en escritorio habría dos menús.

Quién eres se sabe por `currentMember` del store, que compara los miembros con
`members.getCurrentUserId()` del contrato de repos (en demo, siempre `u1`). Es para
reconocer tu fila, no para decidir permisos: eso lo sigue haciendo la RLS.

### Notas: texto libre y nada más (31-08-2026)

Lo que hay que tener apuntado en una casa y no es una fecha, una tarea ni un papel: el
teléfono del pediatra, la clave del wifi, la talla de las botas, dónde está el contador
de la luz. Es la sección más pequeña de la app y se queda así.

**Una nota es un título, un texto libre y un emoji.** Sin categorías, sin campos y sin
tipos de nota. Se consideró la variante con tipos —"teléfono" con botón de llamar,
"contraseña" con botón de copiar— y se descartó por dos cosas: obliga a elegir tipo antes
de escribir, y no hay respuesta para el código de la alarma, que es teléfono y contraseña
a la vez. Lo que hace falta apuntar en una casa —"el contador está en el rellano, la llave
pequeña del llavero azul"— no cabe en un campo. También se descartaron carpetas: una
familia tiene veinte notas, y para veinte manda el buscador.

**La nota se lee desde el índice**, con sus saltos de línea, hasta seis líneas. Es la
diferencia con `DocCard`, a la que se parece: un documento es un archivo que hay que
abrir, una nota **es** su contenido, y obligar a tocar para ver el teléfono del pediatra
convierte en dos gestos lo que tiene que ser cero.

**Fijar es lo único que ordena por encima del tiempo.** Ordenar solo por `updated_at` no
vale: la clave del wifi se consulta todo el año y no se edita nunca, así que cualquier
nota escrita ayer la hundiría. Se marca en el sheet y no en la tarjeta, porque un botón no
puede llevar botones dentro —la misma piedra con la que tropezó `DayCell` al empezar a
escribir títulos— y partir la tarjeta en dos zonas pulsables por un gesto que se hace una
vez no sale a cuenta.

**No sale en Inicio.** Inicio contesta "¿qué tenemos que saber hoy?" y la clave del wifi no
es de hoy: es de siempre, que es justo lo contrario.

**Va en "Más", delante de Documentos**, y no en la barra de abajo. Las cinco pastillas son
las cinco pantallas de todos los días, y una nota se consulta cuando viene alguien o
cuando se estropea algo. Con dos secciones ahí, el filtro de la barra dejó de escribirse a
mano: `secciones.ts` marca cuáles con `enMas` y lo leen las dos barras.

**Lo que se escribe se guarda en texto plano**, protegido por la RLS y por nada más. Es
una decisión consciente y tiene su letra pequeña: la CSP lleva `'unsafe-inline'` en los
scripts (ver "Superficie de seguridad"), así que un XSS en línea llegaría a la sesión y
con ella a las notas, y quien tenga el panel de Supabase o la clave de servicio las lee.
Se valoró cifrarlas con una clave derivada de una frase familiar y se descartó: hay que
resolver cómo la comparten cinco personas, qué pasa al entrar desde otro móvil y qué pasa
cuando alguien la olvida —se pierde todo—, y eso es un proyecto, no una sección. Lo que sí
se hace es decirlo donde se lee: el sheet lo avisa bajo el campo de contenido y
`/privacidad` lo repite. Sirve para la clave del wifi de casa; no es un gestor de
contraseñas.

### La portada entra sin salir de la portada (01-09-2026)

La página pública **no tiene botones que lleven al login**: tiene el formulario. Quien
llega puede entrar sin cambiar de página, que es donde se pierde la gente.

Eso obligó a que hubiera **un solo formulario de autenticación** en todo el proyecto:
`src/components/auth/AuthCard.tsx`, que montan `/auth/login` y `LandingPage`. Copiarlo
era la opción rápida y la peor: dos formularios divergen en cuanto alguien toca un
mensaje de error, y a partir de ahí uno de los dos miente. `/auth/login` sigue
existiendo aunque la portada ya no lo enlace —es donde aterrizan las invitaciones, la
confirmación de cuenta y los enlaces de recuperar contraseña— pero ya solo aporta su
maqueta.

**Y se pinta una sola vez en la página.** No es una preferencia: la tarjeta anterior,
que solo tenía botones, salía dos veces —una para móvil, otra para escritorio— y con un
formulario dentro eso duplica los `id` de los campos, que es lo que ata cada `label` con
el suyo. Dos «Correo electrónico» con el mismo `id` y quien navega con lector de
pantalla acaba escribiendo en el que no ve. Por eso las tres piezas de la portada
—titular, acceso y resto— van colocadas a mano en la rejilla (`col-start` / `row-start`)
en vez de por orden natural: el acceso se escribe en medio, porque tiene que ser el
segundo en móvil, pero pertenece a la columna de al lado.

De la barra de arriba queda un enlace «Entrar» que **no lleva a ninguna parte**: es un
ancla a `#entrar`. En escritorio no hace falta —la columna va anclada— pero en móvil el
formulario está arriba del todo, y sin él, tres mil píxeles más abajo, no habría forma
de volver sin subir a mano.

Efecto lateral que conviene saber: la portada dejó de ser una página inerte y carga el
cliente de Supabase. Y en **modo demo** enseña el aviso de «Modo local activo» en vez
del formulario, que es lo mismo que hace `/auth/login` y lo que ve la suite e2e.

### Finanzas: dos cosas que en español se llaman igual (31-08-2026)

"Presupuesto" en una casa española son dos cosas distintas: lo que te puedes gastar al mes
en la compra, y el papel que te pasa el fontanero. No se parecen en nada por dentro —una
es una cuenta que corre todo el mes, la otra una decisión que se toma una vez— pero las
dos contestan a "¿qué pasa con el dinero de casa?". Van en la misma sección, `/finanzas`, con
**dos pestañas**: «El mes» y «Presupuestos». Separarlas en dos entradas de la navegación
habría dejado la app con nueve sitios a los que entrar; mezclarlas en una lista habría
hecho ilegibles las dos.

La sección se llama **Finanzas** y no «Presupuestos» justo por eso: si el contenedor se
llamara igual que una de las dos mitades, la otra parecería estar de prestado.

Se llamó **Dinero** hasta el 01-09-2026. «Dinero» nombra la materia; «Finanzas» nombra lo
que la familia hace con ella, que es de lo que va la pantalla: mirar el mes, poner un tope,
comparar tres presupuestos. El cambio bajó hasta el código —`/finanzas`, `src/lib/finanzas.ts`,
`FinanzasView`— para que no hubiera que traducir mentalmente en cada archivo. Las tablas
(`budgets`, `expenses`, `quotes`) no se tocaron: nunca llevaron ese nombre y renombrarlas
habría exigido migrar la base real a cambio de nada. En `docs/historial.md` sigue apareciendo
«Dinero» donde cuenta lo que pasó entonces, que es como debe ser.

**Tres tablas: `budgets`, `expenses`, `quotes`.** No se tocan entre ellas salvo
`expenses.budget_id`, que es opcional. Comparten pantalla, no modelo.

**Todo el dinero va en céntimos, en `integer`.** Ni coma flotante —0,1 + 0,2 da
0,30000000000000004, y un céntimo de más convierte "llevas 300,01 de 300" en un
presupuesto incumplido— ni `numeric`, que llegaría a JavaScript como cadena. El texto que
se teclea lo convierte `parseAmountToCents` (`src/lib/finanzas.ts`) en **un solo sitio**, y
lo llaman los dos lados de la frontera: si el mock y Supabase convirtieran cada uno por su
cuenta, "12,50" acabaría valiendo distinto según el modo. El formato también se escribe a
mano en vez de con `Intl.NumberFormat`, que mete un espacio duro cuya forma cambia con la
versión de ICU: el mismo importe tiene que leerse igual en un test y en un móvil.

**El tope de un presupuesto no es por mes.** Una fila por categoría, no una por categoría y
mes. Se valoró lo segundo —permitiría "en diciembre gastamos más"— y se descartó: obliga a
"abrir septiembre" cada treinta días, que es el trabajo administrativo que esta app existe
para no pedir. Cambiar el tope vale desde ya y no toca lo apuntado.

**Un presupuesto no tiene color, tiene emoji.** En Farpi el color dice **de quién** es algo
(ver "Asignación de eventos, tareas y documentos"), y un presupuesto no es de nadie:
dárselo lo haría indistinguible de una persona en la misma pantalla donde sí hay personas.
Lo que sí lleva color es quién pagó cada gasto, que es exactamente el significado de
siempre.

**Quién pagó reutiliza `child_id` + `member_id`**, el mismo par excluyente de eventos,
tareas y documentos. Así vale el mismo `AssigneePicker`, los mismos triggers de integridad
entre familias y la misma lectura: los dos a null es "de la casa", el caso normal de la
cuenta común, no un hueco sin rellenar.

**Se ve el reparto, nunca un saldo.** La pantalla dice "Omar 60 €, Sofía 20 €" y ahí se
para. Nada de "Sofía te debe 40 €": en cuanto una app de casa lleva la cuenta de quién
debe a quién deja de ser una app de casa y pasa a ser un árbitro. Con el reparto delante
ya se sabe a quién le toca la próxima compra grande.

**Borrar un presupuesto no borra sus gastos.** Se quedan, con `budget_id` a null, bajo
«Sin presupuesto». Lo hace la clave ajena (`on delete set null`) y el mock lo imita a mano.
Perder el histórico de agosto por reorganizar las categorías en septiembre sería el peor
modo posible de fallar, y "sin presupuesto" es además un estado legítimo: la mitad de los
gastos de una casa no caen en ninguna categoría, y obligar a elegir una hace que se
apunten mal o que no se apunten.

**"Te has pasado" se dice con palabras.** La barra se pone roja, pero lo que lleva el
mensaje es el texto: "te has pasado por 40 €". Es la misma regla que ordena el color en
todo el proyecto —el color acompaña, nunca es lo único—, y aquí importa dos veces porque
una barra llena de rojo y una llena de verde son la misma barra para quien no distingue
los dos. La barra además se recorta al 100 %: pasarse un 300 % no dibuja una barra que se
sale de la tarjeta; cuánto es exactamente lo dice el texto.

**Los presupuestos pedidos se agrupan por para qué son.** `title` es el trabajo ("Cambiar
la caldera") y `provider` quién lo da ("Fontanería López"): la pantalla agrupa por el
primero y así los tres de la caldera salen juntos, ordenados de más barato a más caro, que
es como se leen tres precios que se comparan. Se descartó una tabla de trabajos y otra de
proveedores —dos tablas más para que una casa apunte tres presupuestos al año— y en su
lugar el formulario ofrece los títulos ya usados; aun así la agrupación no depende de
escribirlo clavado, porque compara sin tildes, sin mayúsculas y sin espacios de más.

**El más barato se marca solo mientras el trabajo sigue abierto.** Marcarlo en uno ya
decidido sería un reproche —"el que aceptaste no era el barato"— y esa decisión ya está
tomada, a veces por razones que la app no sabe: que vinieran antes, que los conozcas. Un
descartado tampoco puede ser el más barato, y con un solo presupuesto no se marca nada
porque no hay comparación.

**Un precio caducado se dice, no se esconde ni se tacha.** Sigue sirviendo para comparar
—el fontanero suele repetirlo— y ocultarlo dejaría un hueco sin explicar en una comparación
de tres. «Caducado» no es un estado que nadie marque a mano: sale de comparar `valid_until`
con hoy, igual que se hace con los documentos.

**No sale en Inicio**, por lo mismo que las notas: Inicio contesta "¿qué tenemos que saber
hoy?", y "llevas 180 de 300 en la compra" es del mes, no de hoy. Meterlo ahí convertiría la
primera pantalla en un cuadro de mandos.

**Va en "Más"**, con Notas y Documentos. Las cinco pastillas de abajo son las cinco
pantallas de todos los días.

**Farpi no se conecta a ningún banco** y no lo va a hacer: nada de números de cuenta, de
tarjeta ni credenciales. Todo lo de esta sección lo escribe la familia a mano, y así lo
dice `/privacidad`.

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
- **En el calendario no se nombra la cosa, se dice qué haces** (27-08-2026). La
  palabra "evento" desapareció de la interfaz: el sheet se titula «Apuntar en el
  calendario», el `+` es «Apuntar algo» y el vacío de la agenda, «Toca para
  apuntar algo». La razón es que no hay un sustantivo que valga a la vez para el
  dentista y para la barbacoa: "plan" suena a ocio, "cita" a médico, "aviso" a
  que alguien tiene que enterarse y "recordatorio" ya está cogido por las
  notificaciones diarias. *Apuntar* vale para los cuatro tipos, vacaciones
  incluidas, y ya era el verbo del botón de guardar de las ausencias. En base el
  tipo se sigue llamando `kind: 'evento'`: es un valor guardado, no un texto.
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
    `--farpi-sage` acabó siendo una terracota y `--farpi-terracota` un turquesa. Suena
    raro y aun así es lo correcto: renombrarlos arrastra el bloque `@theme inline` y las
    utilidades `*-farpi-*` que salen de él.
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
