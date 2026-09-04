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
  es del 04-09-2026: **165/165**, con la revisión de seguridad del día anterior dentro y
  el borrado de cuenta arreglado. El historial de cada pasada está en
  `docs/supabase-validation.md`, que es donde vive.
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
- `family_members` **solo tiene policy de `select`**: ni `insert`, ni `update`, ni `delete` (el `insert` se retiró el 03-09-2026). El perfil se edita con `update_family_member_profile` (RPC, `014`), que restringe los campos a `display_name` y `color`, y permite hacerlo a uno mismo o a un admin de esa familia. Sustituye a `update_my_family_profile`, que solo dejaba editarse a uno mismo.
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
- **Las rutas que escriben rechazan lo que venga de otra web** (03-09-2026,
  `deOtroSitio` en `src/lib/peticiones.ts`). Lo paraba el `SameSite=Lax` de las cookies
  de Supabase, que es una defensa prestada: el día que una cookie pase a `None`,
  `/api/account/delete` queda a un `fetch` ajeno. Se mira `Sec-Fetch-Site` y, si no
  viene, el `Origin` contra el `Host`; sin ninguna de las dos se deja pasar, porque eso
  no es un navegador y sin navegador no hay cookie que viaje sin querer. Un `GET` no
  entra: la vuelta de Google al conectar Drive es cruzada y tiene que pasar, y lo que la
  protege es el `state`. `requiereSesion` **exige** la petición como argumento para que
  la comprobación no se pueda olvidar en la ruta siguiente.
- El proxy (`src/proxy.ts`) manda al login todo lo que no sea público.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app.
  Sin eso, un enlace de correo legítimo podía acabar en otra web justo después
  de iniciar sesión. **No basta mirar el principio de la cadena** (03-09-2026): el
  navegador borra tabuladores y saltos de línea antes de interpretar una URL, así que
  se limpian esos tres caracteres y la ruta se resuelve con `new URL` contra un origen
  inventado — decide el navegador, que es quien va a interpretarla.
- `/api/invite` tiene **tope de diez invitaciones en 24 horas por quien invita**
  (03-09-2026). El registro está abierto y crear una familia te hace admin de ella, así
  que sin tope la ruta era un amplificador de correo abierto a internet: lo que se
  arriesga es la reputación del dominio, y con ella los correos que la familia sí espera.
  Se cuenta sobre `family_invites` —ahí queda el rastro— y por persona y no por familia,
  porque las familias se crean gratis.
- Seis cabeceras en `next.config.ts`, **CSP incluida** desde el 26-08-2026 y **HSTS**
  desde el 03-09-2026 (la ponía Vercel por su cuenta; era el único control que vivía en la
  plataforma y no aquí). La CSP estuvo
  meses aparcada por un motivo que sigue siendo cierto —Next inyecta scripts en línea y
  una CSP mal puesta rompe producción sin avisar en local—, y por eso lleva
  `'unsafe-inline'` en `script-src`: no para un XSS en línea, pero sí cargar scripts de
  otro dominio, `<object>`, el iframe, reescribir `base`, enviar un formulario fuera y
  hablar con cualquier servidor que no sea Supabase. `connect-src` se arma con la URL
  real del proyecto, no con un comodín. Se prueba contra el build servido, no contra
  `npm run dev`.

No hay `dangerouslySetInnerHTML` ni `eval` en todo el código.

Y **el build corta si producción arranca en modo demo** (03-09-2026, en `next.config.ts`).
El fallback sin credenciales es correcto en local y en un preview; en producción es la app
entera abierta sin sesión —el proxy deja pasar todo en modo demo— sirviendo datos de
mentira y aparentando funcionar, que es la clase de avería que nadie mira.

## Regla del último admin

**Decisión de producto:** Una familia debe tener siempre al menos un admin. Está prohibido eliminar o degradar al único admin de una familia.

**Implementación:** No se implementa con policies RLS (que no tienen acceso fácil a recuentos de roles). Se implementa mediante RPCs `security definer` en Supabase para la gestión de miembros, y el endpoint `/api/account/delete` bloquea borrar la cuenta si eso dejaría una familia compartida sin admin.

### RPCs implementadas (migración 008)

- `remove_family_member(p_member_id uuid)` — elimina un miembro; valida que el llamante es admin y que no es el único admin.
- `update_family_member_role(p_member_id uuid, p_role text)` — cambia el rol; mismas validaciones.

Ambas son `security definer` con `set search_path = public, auth`. Sobre `family_members` no queda **ninguna** policy de escritura: `Admin gestiona miembros` (`for all`) se sustituyó primero por `Admin inserta miembros` (`for insert`), y esa se retiró el 03-09-2026 porque dejaba a un admin meter en su familia una fila con el `user_id` que quisiera, sin invitación y sin que la otra persona se enterase. Entrar, cambiar de rol y salir van los tres por RPC.

### Invitaciones

La migración `009_accept_invite_rpc.sql` añade `accept_family_invite(p_invite_id uuid)`.

Esta RPC:

1. Verifica que el usuario está autenticado.
2. Busca la invitación y comprueba que es **para su email**.
3. Comprueba que no lleva más de **30 días** esperando (03-09-2026). Lo que abre la
   familia no es el enlace del correo —ese lo caduca Supabase en unas horas— sino el
   `invite_id` de la URL de vuelta, y esa URL se puede guardar.
4. Comprueba que la cuenta es **anterior a la invitación, o que nació de ella**
   (`invited_at`, 03-09-2026). Cotejar el correo da por hecho que tener la cuenta prueba
   tener el correo, y eso lo decide un interruptor del panel de Supabase: con «Confirm
   email» apagado, quien viera un `invite_id` podía registrarse con el correo ajeno.
5. Crea el `family_member`.
6. Marca la invitación como `accepted`.
7. Devuelve el `family_id`.

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
`family_members`, que desde el 03-09-2026 no tiene ninguna de escritura—: las dos
comprobaciones de arriba no caben en una policy. Lo demás se va solo, por el
`on delete cascade` de todas las tablas
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

- **La ficha no puede cambiar de disco, y la puede editar cualquiera de la casa**
  (03-09-2026). Son dos piezas y van juntas. `storage_owner` se comprueba en el `insert`
  —solo se presta la llave de uno— y su inmutabilidad, junto con la de `storage_path` y
  `storage_provider`, la sostiene el trigger `trg_document_storage_inmutable`, porque una
  policy no puede comparar con la fila anterior: `with check` solo ve la nueva. El hueco
  que cerraba era poder poner a nulo el dueño de un papel ajeno y dejarlo sin abrirse para
  toda la casa —no se lleva nada, con `drive.file` el token de quien mira no ve lo que
  subió otro, pero es sabotaje que la RLS no veía—.

  Estuvo todo en una sola policy `for all` con el `with check` del dueño, y **eso rompía el
  renombrado**: Postgres aplica el `with check` a la fila nueva de cualquier escritura, y
  la de un renombrado sigue llevando dentro el dueño de quien subió el papel, así que nadie
  podía editar la ficha de un documento ajeno. Ahora son cuatro policies. Si alguien quita
  el trigger, el `update` sin `with check` de dueño vuelve a dejar señalar el Drive de un
  tercero, esta vez editando en vez de insertando.

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
- `SettingsView`: las secciones se ponen de pie. En móvil son una fila de etiquetas
  encima del contenido; desde `lg` son una columna de 13 rem a la izquierda —con icono,
  y pegada con `lg:sticky` para que sigan a la vista al bajar— y el contenido ocupa el
  resto hasta `lg:max-w-5xl`. Es **el mismo `role="tablist"`**, no uno por tamaño:
  duplicarlo repetiría los `id` de cada pestaña y dejaría los `aria-controls` apuntando
  a dos sitios. Lo único que cambia es cómo se coloca.

Home sigue siendo la columna de móvil centrada.

Un detalle que se paga en cualquier `sticky` de la app: **quien hace scroll es el
`<main>` de `AppShell`** (`overflow-y-auto pt-14`), no la ventana. El desplazamiento se
mide contra ese contenedor, que ya empieza por debajo de `TopBar`, así que el `top` va
en el orden del padding de la vista (24 px) y no en el alto de la cabecera.

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

**Las franjas de comida se eligen, y son de la familia** (migración 019). Las de casa
—desayuno, comida, merienda y cena, más el comedor desde el 02-09-2026— están fijas en el
código, pero en una casa que no merienda esa fila es un hueco que la app pide llenar siete
veces por semana. En Ajustes se
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

**El comedor es una franja más, no una marca de la comida** (02-09-2026). En una casa
con niños en el comedor hay dos menús el mismo día y a la misma hora: lo que le ponen a
los niños en el colegio y lo que se come en casa. Se resolvió añadiendo `school` a las
franjas —`Comedor`, justo detrás de `Comida`— en vez de partir cada comida en dos
públicos, y por tres razones:

- **El `unique(family_id, date, slot)` sigue en pie.** Es lo que deja que la pantalla
  escriba un hueco sin preguntar antes si ya había algo. Un `audience` en la fila obligaba
  a ampliarlo y, con él, a que cada celda de la rejilla pasara de una comida a una lista.
- **La configuración ya existía.** Las franjas se eligen por familia desde la 019, así que
  el comedor se enciende una vez en Ajustes y no hay pantalla nueva. Entra **apagado**
  (`DEFAULT_MEAL_SLOTS`, que no es `ALL_MEAL_SLOTS`): en una casa donde nadie come fuera
  sería una fila vacía que la app pide llenar siete veces por semana, que es exactamente
  lo que la 019 vino a arreglar con la merienda.
- **Lo que no cabe se dice.** Dos hijos en dos comedores distintos no caben en una fila.
  Es el mismo límite que tiene el resto de Comidas —una casa, un menú— y se prefiere a
  meter personas en un modelo que hoy es de la familia entera.

**Una comida tiene hasta tres platos.** El menú del comedor viene en primero, segundo y
postre, y todo junto en `name` queda como una frase sin forma. De ahí `second_course` y
`dessert`, los dos opcionales y nulos en casi todas las comidas: una tostada no tiene
segundo. El formulario los enseña **solo** en las franjas de `MEAL_SLOTS_CON_PLATOS`
—comida y comedor—; en el desayuno o la merienda serían dos huecos más que llenar cada
día. Y al cambiar a una franja sin platos se **vacían**: dejarlos puestos guardaría un
segundo que ya no se ve en ninguna parte. Las pantallas no miran campo a campo, piden la
lista a `mealCourses()`: en la tarjeta de la semana y en la lista de hoy van en renglones;
en la semana de móvil y en Inicio, el primero en su línea y el resto debajo separados por
puntos —los tres seguidos cortaban el postre a 390 px, que es lo que se mira—; y en el
sheet de copiar, donde la fila es de una línea, los tres con puntos.

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

En la barra de arriba **no queda ningún enlace de cuenta**. Se probó a dejar un «Entrar»
que fuera un ancla a `#entrar`, para poder volver al formulario desde el final de la
página en móvil, y se quitó: seguía leyéndose como el botón de login de siempre, que es
justo lo que la portada ya no quiere ser. El precio es que en móvil, muy abajo, hay que
subir para volver al formulario; el `id` sigue ahí por si algún día se enlaza de otra
forma.

Efecto lateral que conviene saber: la portada dejó de ser una página inerte y carga el
cliente de Supabase. Y en **modo demo** enseña el aviso de «Modo local activo» en vez
del formulario, que es lo mismo que hace `/auth/login` y lo que ve la suite e2e.

### Finanzas: cuatro piezas y una sola palabra «presupuesto» (01-09-2026)

La sección nació el 31-08-2026 con **dos pestañas** —«El mes» y «Presupuestos»— porque
"presupuesto" en una casa española son dos cosas distintas: lo que te puedes gastar al mes
en la compra, y el papel que te pasa el fontanero. Iban juntas en `/finanzas` porque las dos
contestan a "¿qué pasa con el dinero de casa?", y separarlas en la navegación habría dejado
la app con nueve sitios a los que entrar.

El 01-09-2026 se rehízo, porque tenía dos problemas de fondo:

1. **La palabra seguía significando dos cosas dentro de la app.** Las categorías con
   límite mensual se llamaban «presupuestos» en la pestaña «El mes», y los papeles del
   fontanero también, en la otra pestaña. Un nombre que hay que desambiguar por contexto en
   la misma pantalla no es un nombre.
2. **No existían los ingresos.** Sin ellos, la sección contestaba "llevas 180 de 300 en la
   compra", que es una curiosidad de una categoría, y no "quedan 758 € este mes", que es la
   pregunta que se hace de verdad en una casa a mitad de mes.

Ahora son **cuatro piezas y tres pestañas**, y cada pieza contesta una pregunta distinta:

| Tabla | En pantalla | Dónde | Contesta |
|---|---|---|---|
| `fixed_entries` | **Fijos** | pestaña «Lo fijo» | ¿con cuánto contamos y qué está comprometido? |
| `budgets` | **Partidas** | pestaña «Lo fijo», se ven en «El mes» | ¿me estoy pasando en lo que sí controlo? |
| `expenses` | **El día a día** (una fila, un **apunte**) | pestaña «El mes» | ¿qué ha pasado este mes? |
| `quotes` | **Presupuestos** | pestaña «Presupuestos» | ¿cuánto va a costar esto que aún no hemos hecho? |

Con eso «presupuesto» pasa a significar **una sola cosa** en toda la app: lo que cuesta algo
que todavía no has hecho —los tres de la caldera, la reforma del baño—, que es además lo
genérico y de proyecto que la palabra pide. Y una entrada del día a día vuelve a llamarse
por su nombre: un gasto o un ingreso.

**Las tablas no se renombraron.** `budgets` sigue llamándose `budgets` aunque en pantalla
sean «partidas», y `expenses` sigue siendo `expenses` aunque sean «apuntes». Es el mismo
criterio que con Dinero → Finanzas: renombrar obliga a migrar la base real a cambio de una
palabra, y la base real está en producción con datos de una familia. Por lo mismo el `check`
`expenses_ingreso_sin_tope` conserva su nombre viejo.

#### «Topes» y «movimientos» duraron un día (02-09-2026)

El reparto de arriba se llamó **«Topes»** y la lista **«Movimientos»** entre el 01 y el
02-09-2026. Los dos se cayeron por lo mismo, y es una regla que vale para toda la app: **son
palabras de banco**. Una casa no tiene movimientos, tiene un día a día; y a la compra no se
le pone un tope, se le pone una partida.

No es solo estética. «Tope» nombra únicamente el techo —lo que **no** puedes pasar—, así que
la pantalla se leía como una advertencia incluso a primeros de mes, con las barras vacías.
«Partida» nombra la cosa entera: un apartado con dinero asignado, que es lo que la fila
enseña de verdad (178 de 250, y 72 por delante). Y «movimiento» arrastraba otro problema:
nadie llama «movimiento» a lo que acaba de apuntar.

Así que la lista se llama **«El día a día»** y una fila suya es un **apunte**, que encaja con
el verbo que la sección ya usaba en todas partes («apunta lo que se va gastando», «nada
apuntado este mes»). Sección, fila y acción dicen lo mismo sin enseñar vocabulario nuevo.

El cambio bajó hasta el código —`resumenPartidas`, `apuntesDelMes`, `gastosSinPartida`,
`abrirPartida`, `guardarApunte`— por el mismo motivo que bajó Dinero → Finanzas: para no
traducir mentalmente en cada archivo. Lo que **no** cambió: las tablas, el `check` y el tipo
`MovementKind`, que en inglés sigue siendo un nombre correcto para «gasto o ingreso».

La sección se llama **Finanzas** y no «Presupuestos» justo por eso: si el contenedor se
llamara igual que una de sus piezas, las otras parecerían estar de prestado.

Se llamó **Dinero** hasta el 01-09-2026. «Dinero» nombra la materia; «Finanzas» nombra lo
que la familia hace con ella, que es de lo que va la pantalla: mirar el mes, abrir una partida,
comparar tres presupuestos. El cambio bajó hasta el código —`/finanzas`, `src/lib/finanzas.ts`,
`FinanzasView`— para que no hubiera que traducir mentalmente en cada archivo. Las tablas
(`budgets`, `expenses`, `quotes`) no se tocaron: nunca llevaron ese nombre y renombrarlas
habría exigido migrar la base real a cambio de nada. En `docs/historial.md` sigue apareciendo
«Dinero» donde cuenta lo que pasó entonces, que es como debe ser.

**Cuatro tablas: `fixed_entries`, `budgets`, `expenses`, `quotes`.** No se tocan entre
ellas salvo `expenses.budget_id`, que es opcional. Comparten pantalla, no modelo.

**Todo el dinero va en céntimos, en `integer`.** Ni coma flotante —0,1 + 0,2 da
0,30000000000000004, y un céntimo de más convierte "llevas 300,01 de 300" en un
presupuesto incumplido— ni `numeric`, que llegaría a JavaScript como cadena. El texto que
se teclea lo convierte `parseAmountToCents` (`src/lib/finanzas.ts`) en **un solo sitio**, y
lo llaman los dos lados de la frontera: si el mock y Supabase convirtieran cada uno por su
cuenta, "12,50" acabaría valiendo distinto según el modo. El formato también se escribe a
mano en vez de con `Intl.NumberFormat`, que mete un espacio duro cuya forma cambia con la
versión de ICU: el mismo importe tiene que leerse igual en un test y en un móvil.

#### La plantilla («Lo fijo») y los meses cerrados (02-09-2026)

La decisión más grande de Finanzas, y la que se comió una de las de la víspera.

**El problema.** `fixed_entries` y `budgets` eran «una cifra que vale hasta que se
cambie». Eso contesta muy bien «¿cómo va este mes?» y no contesta en absoluto
«¿cómo fue enero?»: subir el alquiler de 800 a 850 en marzo hacía que enero
también dijera 850. El 01-09-2026 eso figuraba aquí como contrapartida asumida, a
cambio de no tener que «abrir septiembre» cada treinta días. Duró un día. En cuanto
la sección sirve para llevar el control de una casa, un pasado que se reescribe
solo no es un pasado, y la contrapartida deja de estar pagada.

**La regla, entera, en una línea:** si el mes tiene copia, manda la copia; si no y
el mes no ha terminado, refleja la plantilla.

El orden importa y no es el obvio. Se escribió al revés —preguntando primero «¿ha
terminado el mes?»— y entonces no había manera de cerrar un mes antes de tiempo: la
copia quedaba guardada y la pantalla seguía enseñando el espejo.

```
«Lo fijo» — LA PLANTILLA           «El mes» — UN MES CONCRETO
  ingresos fijos                      espejo, si es el mes en curso
  gastos fijos          ──copia──▶    copia congelada, si ya terminó
  partidas                            ──────────────────────────────
                                      el día a día (apuntes)
```

**Las partidas se fueron a la plantilla.** Una partida es exactamente lo mismo que
un fijo —una cifra de la plantilla— solo que en vez de gastarse sola se va llenando.
Tenerlas colgando de «El mes» obligaba a contestar qué significaba cambiar una a
mitad de mes; en la plantilla no hay nada que contestar. En «El mes» se siguen
viendo, con su barra, que es donde tienen sentido.

**El mes en curso es espejo y no copia, y eso es deliberado.** Se valoró congelar
también el mes en curso el día 1 —lo más literal de «no se puede alterar»— y se
descartó por dos casos que pasan de verdad: quien monta la app a mitad de mes se
habría quedado con una foto vacía imposible de rellenar, y quien se equivoca al dar
de alta un fijo habría cargado con el error treinta días. Congelar sirve para que
el pasado no se mueva, no para que el presente no se pueda arreglar.

**Lo que se congela es el plan, no el día a día.** Es la distinción que se pasó por
alto la primera vez, y estuvo unas horas rota: al hacer «mes cerrado» se escondió
también el botón de apuntar, así que el 2 de octubre no había dónde meter los 40 €
del 29 de septiembre. La vida llega tarde y los apuntes tienen que caber en el mes
en que se gastaron. En un mes cerrado no se editan los fijos ni las partidas —eso es
el plan— y sí se apunta, siempre.

**El cierre a mano existe, y es un atajo, no una tarea.** Como el mes en curso es
espejo, no se puede dejar preparado un cambio «para el mes que viene»: subir el
alquiler el 20 de septiembre lo mete también en septiembre. Con «dar el mes por
cerrado» se congela septiembre el día que se dé por terminado y a partir de ahí la
plantilla solo mira a octubre. **Si nadie lo toca, el mes se cierra solo el día 1
igual**, así que no hay nada que recordar. Se descartó la versión obligatoria —el mes
no pasa hasta que alguien lo cierra— por lo de siempre: es la tarea administrativa
que esta app existe para no pedir, y además en una casa la haría quien llegara antes,
por los dos.

**Los tres botones van debajo de la tarjeta del mes** (03-09-2026), no al pie de la
pantalla. Estuvieron abajo desde el 02-09-2026 con un argumento razonable —después
del día a día se leen como «he terminado con este mes»— y al usarlo no se sostuvo:
había que recorrer las partidas y todos los apuntes del mes para llegar a ellos. Lo
que hay ahí no es un remate, es lo que se hace **con** el mes que la tarjeta acaba de
resumir. Siguen **fuera** de la tarjeta y separados por su línea, que es lo que la
salvó en su día de convertirse en un panel de mandos.

**Y se puede deshacer, pero solo mientras el mes siga siendo el de hoy.**
`reopen_month` es lo que permite ofrecer el cierre anticipado sin miedo a un toque
de más. Un mes terminado no se reabre jamás: si el pasado se pudiera reabrir, no
estaría cerrado, y todo lo demás sobra.

**Nadie cierra nada a mano.** Lo hace la RPC `close_previous_month`, y la llaman
dos sitios que no se coordinan: el cron diario (`/api/cron/reminders`, que ya
pasaba por ahí todos los días) y la propia app al arrancar, si ve que falta el mes
pasado. Las dos son idempotentes —`insert ... on conflict do nothing`— y la de la
app solo se intenta cuando falta, así que los otros treinta días del mes no cuesta
ni un viaje. Un botón de «cerrar el mes» sería exactamente la tarea administrativa
que esta app existe para no pedir, que es la misma razón por la que los fijos no se
marcan como pagados.

Son **dos** llamadas y no una porque cada una tapa el agujero de la otra: el cron
puede fallar o llegar tarde, y hay familias que abren la app el día 1 antes de que
el cron pase. Y se ejecuta **todos los días**, no solo el 1: la RPC solo mira el mes
anterior, así que el día 2 no hace nada. Un `if (día === 1)` haría que un cron caído
esa madrugada perdiera el mes entero sin que nadie se enterara.

**Solo se cierra el mes anterior, nunca más atrás.** Si el cron estuviera caído tres
meses, copiar la plantilla de hoy en enero escribiría en enero unos números que
puede que en enero no fueran esos. Un mes sin cerrar se ve —la tarjeta lo dice— y se
puede arreglar; un mes cerrado con datos inventados, no. Por eso el tercer estado
existe y se enseña: `sin-plan` no es un fallo, es la respuesta honesta.

**Y solo se copia lo que ya existía antes de que el mes acabara** (03-09-2026). La
regla de arriba dejaba un hueco de un mes por el que se colaba exactamente lo que
venía a evitar: agosto se cerró el 1 de septiembre —era «el mes anterior», todo
correcto— copiando unas nóminas y unos recibos creados ese mismo día 1. Agosto
acabó diciendo que entraron 3.130 € que nadie vio, y no había manera de quitarlo.
Ahora `close_month_copy` filtra por `created_at` contra el primer instante del mes
siguiente (`existiaEnElMes` en `budgets.ts` hace lo mismo en el mock), y **si había
plantilla pero nada de ella estuvo en ese mes, no cierra**: el mes se queda en
`sin-plan`, que suma cero y lo dice. El relleno del final de `schema.sql` ya llevaba
la cautela —solo tocó los meses con apuntes— y su propio comentario avisaba de que
hecho un mes más tarde «habría escrito números inventados». Lo estaba.

**Un mes pasado se puede poner a cero: `empty_month`** (03-09-2026). Lo anterior
evita el próximo mes inventado, no arregla el que ya se guardó, así que hace falta
una salida. **Vacía el plan y deja la cabecera**, y esa es toda la sutileza: si
borrara la cabecera —lo que hace `reopen_month`— la app vería «falta el mes pasado»
en la siguiente carga y lo cerraría otra vez con la plantilla de hoy. Se descubrió
en el test. Una cabecera sin líneas dice las dos cosas que hay que decir —ese mes
está cerrado, y de él no se guardó nada— y se queda quieta; la tarjeta lo lee como
«de este mes no se guardó ningún fijo ni ninguna partida». Los apuntes **no** se
tocan: lo que se vacía es el plan, no el día a día. Y sigue sin poderse *reabrir* un
mes terminado, que es lo que sostiene el resto: poner a cero no lo devuelve a
espejo de la plantilla, lo deja en cero.

Un mes puesto a cero **sí sale en la serie del resumen**, con su barra a cero, igual
que cualquier mes cerrado sin líneas. Se valoró tirarlo como se tira el que nunca se
cerró y se dejó estar: la regla escrita es que un mes cerrado cuenta y un mes sin
plan no, y cambiarla movía la media de los seis meses por un caso de borde.

**Y hay un cuarto estado: `por-venir`.** Hacia delante también se puede navegar, y
hasta que se separó, octubre se veía en septiembre **exactamente igual** que
septiembre: su «quedan 2.194 €», su botón de apuntar y ni una palabra que dijera que
ese mes no ha llegado. El 02-09-2026 se marcó aparte: aviso, condicional
(«quedaría ese mes») y **ni apuntar ni cerrar**. Un gasto con fecha del mes que
viene no es un gasto, es un recordatorio, y para eso están las tareas.

**El 03-09-2026 dejó además de enseñar la previsión de entrada, y sale en cero.**
El aviso no bastaba: una cifra puesta donde el resto de los meses llevan un saldo
se lee como un saldo, por mucho que la letra pequeña de debajo diga que no lo es.
Ahora octubre está a cero —que es lo que hay en un mes en el que no ha pasado
nada, y también lo que se pidió al usarlo— y las partidas ni se pintan.

**La previsión se pide.** Un enlace en la tarjeta («ver qué quedaría con lo fijo de
hoy») abre las cifras de la plantilla, y entonces sí habla en condicional y vuelven
las partidas. Se valoró cerrar la puerta del todo —que la flecha no pasara del mes
en curso, o que no hubiera previsión ninguna— y se descartó por lo mismo de
siempre: mirar si el mes que viene cuadra es justamente para lo que sirve tener una
plantilla, y prohibirlo obligaría a hacer la cuenta de cabeza. Lo que cambia es
quién pregunta. Y la previsión **se cierra al cambiar de mes**: se abre para una
pregunta concreta, y dejarla abierta haría que noviembre saliera con cifras que
nadie pidió. Apuntar sigue sin ofrecerse, con la previsión abierta o cerrada.

En el código es un parámetro de `plantillaDelMes` (`conPrevision`, apagado por
defecto), no un quinto origen: lo que se está mirando sigue siendo un mes por
venir, con o sin cifras.

**El nombre de la pestaña, dos vueltas.** Fue «El mes tipo» hasta el 02-09-2026
—«tipo» es una palabra de formulario: hay que pararse a deducir que significa «un
mes cualquiera»— y «Cada mes» un solo día, hasta el 03-09-2026. El problema de
«Cada mes» no era lo que decía, era dónde estaba: pegado a «El mes» en la misma
fila de pestañas, dos etiquetas con la misma palabra y un determinante de
diferencia. Había que detenerse a mirar cuál era cuál, y una fila de pestañas es
exactamente el sitio donde no se puede pedir eso.

**«Lo fijo»** no repite «mes», así que se distingue de un vistazo, y nombra lo
único que tienen en común las tres listas de dentro: que no cambian de un mes a
otro. Se acepta a sabiendas que **una partida no es un fijo** —es justamente lo que
varía— y que ahí la etiqueta le queda ancha; cabe porque lo fijo de una partida es
lo que se le da al empezar el mes, que es la cifra que se pone en esta pestaña. Lo
que varía es cuánto llevas, y eso se ve en «El mes».

Dentro del código el concepto sigue llamándose **la plantilla**, que es lo que es;
la clave de la pestaña es `plantilla` y el panel conserva el nombre del rótulo de
ayer (`CadaMesPanel`).

**La copia guarda el nombre y el emoji, no solo el importe.** Borrar la partida
«Coche» en abril no puede dejar a enero con un hueco donde decía «Coche 150 €». Por
eso `month_plan_lines.budget_id` es `on delete set null` y no `cascade`: el enlace
sirve para casar los gastos con su barra mientras la partida exista, y la línea vive
sin él. Cuando se pierde, los gastos que colgaban de ella también perdieron el suyo,
así que pasan a «sin partida», que es donde de verdad están.

**Las dos tablas son de solo lectura, y es la mitad del diseño.** `month_plans` y
`month_plan_lines` son las únicas tablas de contenido con policy de solo `select`:
no hay insert, update ni delete para nadie, ni siquiera para el dueño. Lo que hace
que un mes cerrado se pueda dar por bueno es que la app no pueda reescribirlo.
Quien escribe es `close_month_copy`, y son **cinco funciones en escalera** porque
cada una responde a una pregunta distinta:

| Función | Qué decide | Quién la llama |
|---|---|---|
| `close_month_copy` | nada: copia y punto | nadie de fuera (`execute` revocado) |
| `close_month` | solo meses **terminados** | el cron (`service_role`) |
| `close_previous_month` | el mes anterior, y tu familia | la app al arrancar |
| `close_month_now` | no futuros, y tu familia | el botón de cerrar ya |
| `reopen_month` | solo el mes **en curso**, y tu familia | el botón de deshacer |

Las dos primeras llevan el `execute` **revocado** de `public`, `anon` y
`authenticated`: Postgres lo concede a `public` por defecto en cada función nueva, y
sin ese `revoke` cualquiera podría congelarle el mes a cualquier familia con la
plantilla equivocada. `close_month_copy` es la peligrosa de verdad, porque no tiene
ninguna guarda de fecha.

**Son dos tablas y no una** porque hace falta distinguir «este mes se cerró y no
había nada puesto» de «este mes no se ha cerrado». Con solo las líneas, las dos
cosas son cero filas y la pantalla tiene que decir cosas distintas.

**El relleno de los meses viejos se hizo una vez, el día que se aplicó.** Cerrar con
la plantilla de hoy todos los meses terminados que tuvieran algún apunte era
correcto **ese día y solo ese día**: la plantilla no había cambiado desde que se
puso, porque Finanzas nació el 31-08-2026 y los fijos el 01-09-2026. La misma
sentencia un mes más tarde habría escrito números inventados. Está en `schema.sql`
como un `do $$ ... $$` idempotente y ahí se queda, como registro de lo que se hizo.

**Los fijos son un dato, no una plantilla que genere apuntes.** La plantilla —dos
nóminas, alquiler, luz, suscripciones— se guarda como filas que **valen todos los meses**,
igual que la partida de un `budget`. Se valoraron las otras dos formas y se descartaron: que
cada fijo apareciera como pendiente y hubiera que marcarlo pagado, y que el día 1 se
crearan solos los apuntes del mes. Las dos son más fieles a la realidad —la luz varía—
y las dos piden abrir el mes y tachar seis cosas cada treinta días, que es exactamente el
trabajo administrativo que esta app existe para no pedir. Si un mes la luz sale distinta,
se cambia el fijo o se apunta la diferencia en el día a día.

**Un fijo sigue sin tener vigencias, y ya no hace falta que las tenga.** No hay una
fila por concepto y mes ni un formulario que pregunte "¿desde cuándo?": lo que hay
es la foto del mes al cerrarse, que da lo mismo con una tabla que se escribe sola.
Lo único que se pierde con eso es el tramo dentro de un mes —subir el alquiler el
día 15 cuenta como si valiera para todo el mes—, y eso sí es una contrapartida
asumida: una casa no lleva el alquiler prorrateado por días.

**Los fijos viven en Finanzas, no en Ajustes.** Se tocan dos veces al año, así que parecían
configuración; no lo son. En Farpi, Ajustes guarda **cómo se comporta la app** —miembros,
franjas de comida, notificaciones, sincronización—, y una nómina de 1.650 € es un **dato de
la familia**, más parecido a un hijo o a una lista que a "activar push". Y la cuenta del mes
necesita leerlos al lado del día a día: con los fijos en otra sección, el resumen
enseñaría un número cuyo origen está en otra pantalla.

**Un fijo no cuelga de una partida.** Son para cosas distintas: un fijo es exacto y una
partida es para lo que varía. Colgar el alquiler de una partida la llenaría sola, sin que
nadie haya apuntado nada, y la barra dejaría de medir lo único que sabe medir. Por eso
`fixed_entries` no tiene `budget_id`, y por eso «lo que varía» es lo que dice el formulario
de una partida.

**Un apunte es un gasto o un ingreso, y el importe es siempre positivo.** Lo que los
separa es la columna `kind`, no el signo. Un ingreso guardado como gasto negativo haría que
cada suma dependiera del signo de cada fila y que "llevas 180 de 300" dejara de poder leerse
de un vistazo; una casa no lleva libros de contabilidad. En pantalla, el ingreso lleva un `+` delante
**y** el verde de la marca: el color acompaña pero nunca lleva el mensaje solo, que es la
regla de siempre y aquí importa doble porque un ingreso y un gasto de 120 € serían la misma
fila para quien no distingue el verde.

**Un ingreso no puede colgar de una partida, y lo impide la base.** Lo garantiza el `check`
`expenses_ingreso_sin_tope`, no la pantalla: si un ingreso descontara de una partida, una
devolución de 40 € "liberaría" 40 € de la compra sin que nadie haya dejado de comprar. El
formulario ni pregunta —el campo desaparece al elegir «Un ingreso», en vez de quedarse
apagado obligando a preguntarse por qué— y las dos implementaciones del repo fuerzan el
`null` en vez de confiar en que el formulario lo haya hecho.

**El reparto de quién pagó sigue siendo solo de gastos.** Con los ingresos dentro, la línea
diría "Carlos 1.710 €" mezclando la nómina con la compra, y dejaría de significar lo único
que significa: quién ha ido poniendo el dinero del día a día. Lo que entra se lee en Fijos,
que es donde tiene sentido ver "yo 1.650 / tú 1.480".

**Sin ningún fijo, la tarjeta del mes enseña otra cosa.** "Queda" sería el gasto del mes en
negativo, que no significa nada y asusta a quien acaba de entrar. En ese caso el número
grande sigue siendo lo gastado —como antes de que existieran los fijos— y debajo se ofrece
ponerlos, que es además la única pista de que la cuenta existe.

**La partida se pone una vez, no una por mes.** Se valoró una fila por categoría y
mes —permitiría "en diciembre gastamos más"— y se descartó: obliga a "abrir
septiembre" cada treinta días, que es el trabajo administrativo que esta app existe
para no pedir. Cambiarla vale desde ya para el mes en curso y no toca lo apuntado ni
los meses cerrados, que se quedaron con el límite que tenían (ver "La plantilla
(«Lo fijo») y los meses cerrados").

**Una partida no tiene color, tiene emoji.** En Farpi el color dice **de quién** es algo
(ver "Asignación de eventos, tareas y documentos"), y una partida no es de nadie:
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

**Borrar una partida no borra sus apuntes.** Se quedan, con `budget_id` a null, bajo
«Sin partida». Lo hace la clave ajena (`on delete set null`) y el mock lo imita a mano.
Perder el histórico de agosto por reorganizar las categorías en septiembre sería el peor
modo posible de fallar, y "sin partida" es además un estado legítimo: la mitad de los
gastos de una casa no caen en ninguna categoría, y obligar a elegir una hace que se
apunten mal o que no se apunten.

**"Te has pasado" se dice con palabras.** La barra se pone roja, pero lo que lleva el
mensaje es el texto: "te has pasado por 40 €". Es la misma regla que ordena el color en
todo el proyecto —el color acompaña, nunca es lo único—, y aquí importa dos veces porque
una barra llena de rojo y una llena de verde son la misma barra para quien no distingue
los dos. La barra además se recorta al 100 %: pasarse un 300 % no dibuja una barra que se
sale de la tarjeta; cuánto es exactamente lo dice el texto.

#### Los gráficos del «Resumen» (02-09-2026)

Una cuarta pestaña con lo mismo de «El mes», dibujado. Es pestaña y no un trozo de
«El mes» por dos razones: la serie de varios meses no cabe dentro de un mes concreto
sin quedar rara, y «El mes» es la pantalla del uso diario —apuntar y mirar cuánto
queda— así que meterle dos gráficos delante pone medio scroll entre quien entra y lo
que venía a hacer.

**Nada de librerías de gráficos.** SVG escritos a mano. Una librería de
visualización pesa más que toda la app y trae su propio sistema de temas, que habría
que pelear con el de Tailwind.

Un detalle que cuesta una tarde si no se sabe: **los `var(--color-…)` de un SVG se
escriben enteros y nunca se arman con una plantilla**. Tailwind v4 solo emite las
variables del tema que encuentra literales en el código, así que un
`` fill={`var(--color-chart-${x})`} `` las deja fuera del CSS y el `fill` cae en negro,
sin error de ninguna clase. Pasó el 03-09-2026 y solo se vio abriendo la pantalla.

**El color se calcula, no se elige, y esa fue la lección.** Se iba a usar el verde y
el salmón de marca como par de series, y medidos están a **ΔE 2,3 en protanopía** y a
11,3 con visión normal, por debajo del suelo de 15: para mucha gente serían el mismo
color. El verde de marca además es de baja saturación por diseño, así que suspende el
suelo de croma en cualquier pareja que se le ponga.

De ahí salen las dos decisiones de forma:

- **«Cómo van los meses» es una barra por mes**: lo que quedó, hacia arriba si
  sobró y hacia abajo si no. Con una sola serie no hay dos cosas que distinguir, así
  que no hay leyenda; lo que lleva el mensaje es la posición respecto al cero y el
  color solo acompaña. Cada lado se lleva alto **solo si hay algo que pintar ahí**:
  con todos los meses en positivo, reservar los dos dejaba media tarjeta en blanco.
- **«En qué se va» son barras de un solo color**, no una paleta de categorías. Dar
  un color a cada partida rompería la regla central —el color dice de quién es algo,
  y una partida no es de nadie— y las haría indistinguibles de una persona en la
  misma pantalla donde sí hay personas. La identidad la llevan el emoji y el nombre,
  pegados a su barra.

**La serie va siempre hasta hoy**, mires el mes que mires: la tendencia es de la casa
y no del mes. Se hizo al revés primero —cortándola en el mes seleccionado— y mirando
junio quedaba una sola barra, que no es una tendencia.

**Un mes sin plan se cae de la serie, no sale a cero.** Una barra a cero dice «ese
mes no gastasteis nada», que es distinto de «de ese mes no sabemos». El hueco es lo
honesto, y es la misma decisión que la del estado `sin-plan` de la tarjeta.

**Debajo de las barras están los números, en una tabla plegada.** Es la regla de
siempre del proyecto —el dibujo acompaña, nunca lleva el mensaje solo— y aquí además
resuelve que un importe no cabe bajo la columna de un mes sin partirse en dos líneas.

##### La segunda vuelta de los gráficos (02-09-2026)

Los tres se rehicieron el mismo día que nacieron, porque dibujaban bien y no decían
nada. Lo que se cambió, y por qué:

- **La serie de meses medía 46 px por lado y no llevaba una sola cifra.** Dos meses
  parecidos salían idénticos y no había contra qué medir una barra. Ahora es el doble
  de alta, las columnas se estiran hasta llenar la tarjeta —seis barras estrechas en
  medio de un blanco enorme era la mitad del problema—, **la barra más grande de cada
  lado lleva su importe escrito** (solo esas dos: un número sobre cada barra es ruido)
  y el mes que se está mirando va sobre un fondo crema, porque encontrarlo en una fila
  de seis barras iguales era una búsqueda.
- **Cada bloque empieza por una frase.** Un gráfico contesta «¿cómo de distinto?» y no
  contesta «¿cuánto?». Encima de la serie va la media de lo que queda al mes, y encima
  del desglose, el total que se ha ido. Es lo primero que se quiere saber y no estaba
  escrito en ninguna parte.
- **El anillo pasó a barras ordenadas.** Un donut contesta bien «¿esto es la mitad o
  una esquina?» y mal todo lo demás: dos partidas parecidas eran dos arcos parecidos,
  la leyenda iba aparte —había que ir y venir entre el color y el nombre— y en un
  móvil se comía un cuarto de la tarjeta. Con las barras se cayó también la rampa de
  seis verdes, que era decir dos veces lo mismo: el tamaño ya ordenaba y el tono
  repetía ese orden gastando el único canal libre. La barra se mide contra la partida
  más grande y no contra el total —contra el total, seis partidas son seis rayas
  cortas iguales— y el peso sobre el mes lo dice el porcentaje, escrito.
- **«De dónde sale» dice qué es el trozo pálido y cierra con la resta.** La leyenda de
  «de fijos» y «apuntado a mano» iba repetida en el pie de cada barra, y la conclusión
  —lo que queda— la dibujaban las dos barras sin escribirla ninguna. De paso se
  arregló un pie que decía «0 € apuntado nada» cuando no había nada apuntado. (Ese
  bloque se fue entero el 03-09-2026: ver más abajo.)

##### La tercera vuelta: menos (03-09-2026)

La pestaña tenía tres gráficos, tres pies explicativos, dos leyendas y una tabla, y
el texto ocupaba más alto que los dibujos. Se podó:

- **«De dónde sale» se fue entero.** Decía exactamente lo mismo que el desglose de la
  tarjeta de «El mes» —ingresos fijos, gastos fijos, apuntados, queda— pero dibujado
  y con su propia leyenda. Un gráfico que repite una tabla que está dos toques más
  allá no está contestando nada.
- **Los pies de cada bloque se fueron con él.** Explicaban por qué el gráfico era como
  es («todas las barras son del mismo color a propósito…»): eso es de esta
  documentación, no de la pantalla.
- **La serie pasó de dos series a una.** Entra y sale, dos barras por mes, para
  contestar una pregunta de una sola cifra: seis meses en los 318 px que caben a
  390 px daban doce barras, y comparar agosto con junio obligaba a mirar cuatro y
  restar de cabeza. Ahora es lo que quedó cada mes, y entra y sale siguen enteros y
  exactos en la tabla plegada, que es donde se leían de verdad.

##### El cierre pide confirmación en un diálogo (03-09-2026)

Cerrar el mes y ponerlo a cero dejan de usar el doble toque de `useConfirmAction`,
que es el patrón del resto de la app, y abren un `BottomSheet` de confirmación —el
mismo componente que todo lo demás; no hay overlays propios—.

Es la excepción y tiene motivo: **el doble toque vale para lo que se ve**. Borrar una
fila que sigue delante se entiende sin explicación y se nota al momento. Aquí lo que
cambia es el mes entero, fuera de la vista, y no hay nada en pantalla que enseñe qué
acaba de pasar; un renglón que se pone en rojo un segundo no es sitio para contar que
se van a congelar los fijos de hoy.

Y con el diálogo **se fue la letra pequeña de debajo**, que decía eso mismo a 10 px,
todo el rato, a alguien que casi nunca va a pulsar ese botón. Ahora lo cuenta el
diálogo, que es exactamente cuando hace falta saberlo. La única que se queda es la de
«volver a seguir la plantilla», que no tiene diálogo —no pierde nada— y cuya pega es
de plazo y no de consecuencia.

##### «Nueva partida» abre el sheet, y no lleva a «Lo fijo» (03-09-2026)

El enlace de «El mes» saltaba a la pestaña de la plantilla, por una razón de
vocabulario: una partida es de la plantilla y no de un mes, y crearla desde enero
haría creer que se está creando en enero. La razón sigue siendo verdad, pero ya no
hace falta defenderla mandando a nadie a otra pantalla: de eso se encarga `planVivo`,
que es lo que impide que ese botón exista en enero. Lo que quedaba era sacar de sus
partidas a quien estaba mirándolas y quería una más.

La partida sigue naciendo en la plantilla, así que se ve en el mes en curso al momento
—es su espejo— y también el mes que viene. Una partida que existiera **solo** en un
mes sería otro concepto y otra columna, y no lo vale.

##### El atajo de vuelta al mes de hoy se fue (03-09-2026)

Había un «Volver a este mes» bajo el nombre del mes cuando se miraba otro, y no se
entendía: puesto sobre «Junio 2026» parece que va a hacerle algo a junio, y «este»
señala a la vez al mes que se mira y al de hoy. Se vuelve con la flecha, que es por
donde se vino.

##### Los fijos de la cuenta se abren, y el enlace de la partida pierde el artículo (04-09-2026)

Lo mismo que les pasó a las partidas el día anterior, un nivel más arriba. El desglose de
la tarjeta contesta «¿cuánto?» —«Gastos fijos −935,90 €»— y deja detrás «¿de qué?»; la
única forma de contestarlo era irse a «Lo fijo», que enseña la plantilla de **hoy**, así
que mirando junio la respuesta que se encontraba allí era la de otro mes. Ahora los dos
totales de fijos se abren y enseñan sus líneas, que salen de la misma plantilla resuelta
que los suma: un mes cerrado enseña los recibos que tuvo, con el alquiler de entonces.

**Los apuntados no se abren**, y no es un olvido: sus líneas son «El día a día», que está
entero y con todas las letras un poco más abajo en la misma pantalla. Abrirlos aquí sería
enseñar dos veces lo mismo en un mismo scroll.

**Dentro no se edita nada.** Un fijo de un mes cerrado es una copia que no se toca, y el
del mes en curso es el espejo de la plantilla, que se edita en «Lo fijo»: poner ahí un
enlace de editar habría creado un segundo camino a lo mismo, y en el mes cerrado uno que
no puede llevar a ningún sitio. Es la misma regla que hace que una partida de un mes
pasado se abra pero no ofrezca editarse.

Con esto la tarjeta dejó de ser una `dl`: desde que la fila entera es el botón que abre,
un `button` no cabe entre un `dt` y un `dd` sin romper el modelo de contenido de una lista
de definiciones, y la alternativa —hacer botón solo la etiqueta— dejaba media fila muerta
para el dedo.

Y de paso, el enlace de dentro de una partida pasó de «Editar la partida» a **«Editar
partida»**, que es como se llama el sheet que abre. Dos nombres para la misma cosa a un
toque de distancia.

##### Las partidas se abren (03-09-2026)

«Llevas 412 de 350» deja siempre la misma pregunta detrás —«¿en qué?»— y contestarla
obligaba a bajar a «El día a día» y leer treinta filas mezcladas buscando cuáles eran
de la compra. Tocar una partida la **abre** y enseña sus líneas, con su fecha, quién
lo puso y su importe; tocar una línea abre ese apunte.

Las líneas salen de `resumenPartidas`, en el mismo recorrido que suma `gastado`, y no
se filtran en la pantalla: si la fila dice «412 de 350», las líneas de debajo suman
412 y no hay dos maneras de contarlo.

Tocar la fila ya **no edita la partida** —eso pasa a un enlace dentro del
desplegable—. Una fila que se despliega y además hace otra cosa al tocarla no se
puede aprender, y lo que se quiere hacer aquí casi siempre es mirar. En un mes que ya
pasó la partida se abre igual, pero dentro no hay enlace: mirar sí, tocar no.

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

### Documentos: once carpetas, y «Personal» significa identidad (02-09-2026)

Las categorías eran cuatro —Salud, Colegio, Personal y Otros— y el problema no era que
fueran pocas, sino que dos de ellas no querían decir nada. El seguro del coche estaba en
«Personal». La factura de la lavadora habría acabado en «Otros». Con eso el filtro no
filtra: si medio cajón cae en la misma carpeta por descarte, abrirla es como no abrir
ninguna.

Así que hay once, y la regla que las sostiene es que **cada papel que hay de verdad en una
casa tenga una carpeta que no sea «Otros»**: Salud, Colegio, Personal, Vivienda, Vehículo,
Seguros, Finanzas, Facturas, Mascotas, Viajes y Otros. La lista viva está en
`DOC_CATEGORIES` (`src/lib/constants.ts`) y el `check` de `documents.category` en
`supabase/schema.sql` la copia: si una crece, la otra crece con ella.

**`personal` es identidad**, no el cajón de lo que sobra: DNI, pasaporte, libro de familia,
títulos. Es lo que la palabra ya significaba en la cabeza de quien la eligió, y lo que no
podía significar mientras fuera el único sitio donde meter una póliza. La clave no se
renombró aunque «Identidad» sea más exacto: hay documentos reales en producción con ese
valor y cambiarlo obligaría a migrar filas para ganar precisión de vocabulario.

**El icono es de lucide y no un emoji** (`src/components/docs/CategoryIcon.tsx`). El chip de
la tarjeta tiene el texto a 10 px; a ese tamaño un emoji de color es una mancha, y encima
Android, iOS y Windows dibujan cada uno el suyo. Los iconos son monocromos, heredan el color
del chip y son los mismos que el resto de la app. `constants.ts` se queda sin el campo
`emoji` y **sin icono**: ese archivo lo importa también el servidor y no puede arrastrar
`lucide-react`.

**Como filtro solo salen las carpetas que tienen algo dentro** (03-09-2026,
`selectDocCategoryFilters`). Que haya once carpetas es bueno para guardar y era malo para
mirar: doce pastillas con un icono cada una se leían como un muro antes del primer
documento —cuatro filas a 390 px, y en escritorio once en una fila con «Otros» colgando
solo en la segunda— y la mitad llevaban a una pantalla vacía. Ahora la tira crece sola con
lo que la familia guarda.

Esto **no contradice** la regla de no esconder contenido, que en esta app ha salido mal cada
vez (el catálogo de las listas, las tareas del día, esta misma tira arrastrándose): una
carpeta vacía no es contenido, es un filtro muerto. Las once siguen enteras donde hacen
falta, que es **al guardar** un papel, en el sheet.

Dos detalles que salieron al escribirlo:

- **La categoría que estás mirando no desaparece**, aunque te quedes sin papeles dentro. Si
  borras el último documento de Viajes con Viajes abierto, quitarle la pastilla dejaría la
  pantalla vacía sin decir por qué.
- **Con una sola carpeta con papeles no sale la tira.** «Todos» y esa carpeta enseñan lo
  mismo: no filtraría nada. Es la misma idea que el buscador por debajo de
  `MINIMO_PARA_BUSCAR`.

Y una incoherencia que se arregló de paso: un documento sin categoría se pintaba como
«Otros» en su tarjeta pero el filtro «Otros» no lo encontraba (`d.category === activeFilter`
contra `null`). Ahora las dos preguntas pasan por `docCategoryOf`, o la pastilla llevaría a
una pantalla vacía. Las descartadas fueron el desplegable —esconde y cuesta dos toques— y
agrupar las once en cuatro grupos grandes, que obliga a inventar y explicar una jerarquía
nueva. Envueltas y no arrastrables sigue igual desde el 02-09-2026; lo que cambió es cuántas
hay que ver. `e2e/escritorio.spec.ts` comprueba que no se arrastren y `e2e/runtime.spec.ts`
que Colegio y Mascotas —sin papeles en la demo— no estén en la tira y sí en el sheet.

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
