# Arquitectura

Qué hay montado y por qué está así. Todo lo de aquí habla **en presente**: es lo que vale
hoy. El relato de cómo se llegó a cada decisión —las vueltas, lo que duró un día, lo que se
deshizo al día siguiente— vive en el **cuerpo del commit** que la hizo (`git log`). De una
decisión vieja queda aquí la **regla** y, cuando se descartó algo que volvería a tentar, el
porqué del descarte.

## Objetivo técnico

Mantener Farpi simple: una app web privada, mobile-first, con Supabase como backend base y
sin introducir backend complejo.

## La frontera de datos: demo y Supabase

La decisión central del proyecto. La UI nunca habla con Supabase directamente:

```text
UI / Pantallas
  -> StoreProvider (src/lib/store-context.tsx)   [async: isLoading / error / reload()]
    -> Repos (contrato src/lib/repos/types.ts)
       ├─ supabaseRepos (src/lib/supabase-repos/*)   ← IS_DEMO_MODE = false
       └─ mockRepos     (src/lib/mock-repos.ts)      ← IS_DEMO_MODE = true
            -> src/lib/store/* -> localStorage
```

`StoreProvider` elige implementación según `IS_DEMO_MODE` sin duplicar pantallas. El modo
demo persiste en `localStorage` y sirve de fallback y de entorno de la suite e2e.

- **La detección de modo demo está en un solo sitio**, `src/lib/supabase/env.ts` (URL o anon
  key ausentes o placeholder), y la comparten cliente, servidor, proxy y rutas API. No
  reimplementarla en otra capa.
- **Cada escritura declara qué porciones recarga**: `runMutation(accion, ['tasks'])`. La
  lista de porciones y la regla —declarar también aquello a lo que llegue el esquema por
  `on delete cascade` o `set null`, y no declarar nada si hay duda— viven en el bloque de
  `Porcion` de `store-context.tsx`.
- Una operación nueva se añade **primero al contrato** `repos/types.ts` y después a las
  **dos** implementaciones.
- El deshacer lo sirve el store (`undoLabel` / `undo()` / `clearUndo()`). Devolver una tarea
  marcada no es solo desmarcarla: si se repite, marcarla no la completa sino que le empuja
  `due_date` a la siguiente vez. `restaurarTarea` compara con el estado anterior y revierte
  solo lo que cambió, para no repetir en la UI la bifurcación que ya vive en el repo.
- El hook experimental `src/hooks/useFamily.ts` y los stubs sueltos de `src/lib/repos/*`
  (salvo `types.ts`) se eliminaron por obsoletos.

### Modo demo

Archivos: `src/lib/store/` (un módulo por dominio), `src/lib/store-context.tsx` y
`src/lib/family-config.ts`.

Persistencia: clave `farpi_store_v1` en `localStorage`, con `SCHEMA_VER` en
`src/lib/store/persist.ts` (hoy **17**, la de los ajustes de un fijo en un mes). Si cambia
la forma de los datos, sube la versión y revisa la migración.

El mock debe comportarse lo más parecido posible a Supabase:

- Datos siempre filtrados por `family_id`.
- Borrado de hijo con `child_id = null` en eventos y documentos.
- Comidas sin duplicados por familia, fecha y slot.
- Invitaciones separadas de miembros reales.
- Lo que en la base hace una clave ajena, el mock lo imita a mano: el `on delete cascade` de
  una familia y el `on delete set null` de una partida o de una persona, en `store/family.ts`
  y en `budgets.ts`.

## Supabase

Usos: Auth, PostgreSQL y Row Level Security. **Ya no guarda archivos**: el bucket privado de
documentos se borró el 27-08-2026 y los archivos viven en el Google Drive de quien los sube
(ver "Documentos en Google Drive").

Estado: proyecto creado y esquema aplicado; UI conectada por `src/lib/supabase-repos/` (un
módulo por dominio, igual que el mock); auth, invitaciones por magic link y roles operativos.
La última pasada de `node scripts/validate-rls.mjs` dio **169/169**, con
`fixed_entry_overrides` dentro. El historial de cada validación está en
`docs/supabase-validation.md`, que es donde vive.

`mapFamily` (`src/lib/supabase-repos/family.ts`) normaliza un `meal_slots` ausente a "las
cuatro franjas". Para producción ya no hace falta, pero es lo que permite desplegar código
antes que SQL, que es el orden en el que pasan las cosas aquí.

### El esquema es un solo archivo

Todo está en **`supabase/schema.sql`**: tablas, restricciones, índices, triggers, funciones,
RLS y RPCs. Aplicado sobre un proyecto vacío deja una base idéntica a la de producción.

Se aplica a mano por el SQL Editor. **No hay CLI de Supabase enlazada, y es a propósito**:
local y producción apuntan al mismo proyecto, así que un `db push` distraído escribiría
sobre los datos de una familia de verdad.

Hasta el 26-08-2026 esto eran 21 migraciones numeradas (`001…021`) más un `all_in_one.sql`
generado por concatenación. Se aplastaron porque el historial había dejado de ayudar: para
saber qué valores admitía `events.kind` había que abrir tres archivos y seguir dos
`drop constraint`. Las 21 siguen en git, en el commit anterior al aplastado.

El precio del aplastado, dicho claro: el archivo nuevo **no se ha aplicado nunca a un
proyecto vacío**. Su equivalencia con la base real está comprobada objeto por objeto
—tablas, columnas, restricciones, índices, triggers, funciones, policies y grants, todos
cuadran— pero no ejecutada de punta a punta. Quien levante un proyecto de cero es quien lo
confirmará.

**Para cambiar algo**: se edita `schema.sql` *y* se aplica el `alter` suelto en el SQL
Editor. Las dos cosas, o el archivo miente. Después, `node scripts/validate-rls.mjs`, y se
anota la pasada en `docs/supabase-validation.md`. El trozo suelto sale de
`git diff supabase/schema.sql` y **no se guarda como un `.sql` aparte**: copiar en un segundo
archivo un `create or replace` que ya está en `schema.sql` es mantener dos veces lo mismo, y
las dos veces que se hizo se desincronizó. Lo único que `schema.sql` no sabe contar son los
backfills de datos; si aparece uno, va suelto a `supabase/datos/` con su fecha.

### La regla de RLS

> Un usuario solo puede ver, crear, editar o borrar datos de las familias a las que
> pertenece como miembro en `family_members`.

- `my_family_ids()` es `security definer` con `set search_path = public`.
- `family_members` **solo tiene policy de `select`**: ni insert, ni update, ni delete.
  `Admin gestiona miembros` (`for all`) se sustituyó primero por `Admin inserta miembros`
  (`for insert`), y esa se retiró porque dejaba a un admin meter en su familia una fila con el
  `user_id` que quisiera, sin invitación y sin que la otra persona se enterase. Entrar, cambiar
  de rol y salir van los tres por RPC.
- El perfil se edita con `update_family_member_profile` (RPC `security definer`), que
  restringe los campos a `display_name` y `color` y deja hacerlo a uno mismo o a un admin de
  esa familia. Sustituye a `update_my_family_profile`, que solo dejaba editarse a uno mismo.
- Las policies de `family_invites` para UPDATE incluyen `using` **y** `with check`.
- `families` **no tiene policy de `delete`**: cerrar una familia va por RPC.
- `month_plans` y `month_plan_lines` son las únicas tablas de contenido con policy de solo
  `select`, para nadie y en ningún caso (ver "Finanzas").
- `storage_connections` tiene RLS activada y **ninguna policy** (ver "Documentos").

Lo que no cabe en una policy va por RPC `security definer`: `create_family_with_admin`,
`update_family_member_profile`, `remove_family_member`, `update_family_member_role`,
`accept_family_invite`, `delete_family` y las cinco del cierre de mes.

### La regla del último admin

Una familia tiene siempre **al menos un admin**: está prohibido eliminar o degradar al único
que quede. No se implementa con policies —no tienen acceso fácil a recuentos de roles— sino
en las RPCs de gestión de miembros, y `/api/account/delete` bloquea borrar la cuenta si eso
dejaría una familia compartida sin admin. La UI solo lo refuerza.

- `remove_family_member(p_member_id uuid)` — elimina un miembro; valida que el llamante es
  admin y que el borrado no deja la familia sin ninguno.
- `update_family_member_role(p_member_id uuid, p_role text)` — cambia el rol; mismas
  validaciones.

Las dos son `security definer` con `set search_path = public, auth`.

### Invitaciones

Entrar en una familia va por `accept_family_invite(p_invite_id uuid)`, que:

1. Verifica que el usuario está autenticado.
2. Busca la invitación y comprueba que es **para su email**.
3. Comprueba que no lleva más de **30 días** esperando. Lo que abre la familia no es el
   enlace del correo —ese lo caduca Supabase en unas horas— sino el `invite_id` de la URL de
   vuelta, y esa URL se puede guardar.
4. Comprueba que la cuenta es **anterior a la invitación, o que nació de ella**
   (`invited_at`). Cotejar el correo da por hecho que tener la cuenta prueba tener el correo,
   y eso lo decide un interruptor del panel de Supabase: con «Confirm email» apagado, quien
   viera un `invite_id` podía registrarse con el correo ajeno.
5. Crea el `family_member`, marca la invitación como `accepted` y devuelve el `family_id`.

Canal de entrega: **magic link** vía `admin.auth.admin.inviteUserByEmail` en `/api/invite`,
con `redirectTo` a `/auth/callback?invite_id=...`.

`/auth/callback` es una **página de cliente**, no un route handler, y no es un detalle menor:
los enlaces de invitación devuelven la sesión en el **fragmento** de la URL
(`#access_token=…`, flujo implícito), y el fragmento nunca llega al servidor. Resuelto en
servidor, la invitación se perdía en silencio y el usuario quedaba autenticado pero fuera de
la familia. La página atiende los dos flujos —fragmento y `?code=` de PKCE— y avisa cuando el
enlace ha caducado o ya se usó.

### Cerrar una familia

Una familia se puede eliminar, con dos reglas:

- **Solo un admin de esa familia.** Ser admin de otra no sirve, igual que en el resto de RPCs
  de miembros.
- **Nunca la última que te queda.** Farpi siempre trabaja *dentro* de una familia —`AppShell`
  resuelve una activa antes de pintar nada—, así que quedarse sin ninguna no es un estado del
  que la app sepa volver. Para dejarlo todo está borrar la cuenta, que sí se lleva las
  familias donde estabas solo. Cuando no se puede, el sheet lo dice: la ausencia del botón
  sin explicación era justo lo que no se entendía.

Con más gente dentro **sí se puede**, y es deliberado: manda el admin, como en todo lo demás.
Lo que hace la interfaz es contar lo que se lleva por delante —"3 personas, 12 eventos y 4
documentos"— en el segundo paso del borrado, en vez de un genérico "se borrará todo". El
resumen lo arma `selectFamilySummary` en `src/lib/selectors.ts`.

Va por RPC `delete_family(p_family_id uuid)`, `security definer`, porque esas dos
comprobaciones no caben en una policy. Lo demás se va solo, por el `on delete cascade` de las
tablas que cuelgan de `families`; el mock lo imita a mano en `store/family.ts`. **Los
archivos de los documentos no se tocan**, por lo mismo que en `/api/account/delete`: están en
el Drive de quien los subió y son suyos. Lo que se va con la familia es la ficha, y el sheet
lo avisa antes.

## Superficie de seguridad fuera de la base de datos

El arnés de `scripts/validate-rls.mjs` cubre RLS, RPCs e integridad: la base de datos, y nada
más. Lo que queda por encima —las rutas API y el callback de correo— no lo ve, y se revisa a
mano.

- `/api/invite` usa la service role **solo** para mandar el email; la invitación se inserta
  con el cliente del usuario (RLS) y antes comprueba que quien llama es admin de esa familia.
  Tiene **tope de diez invitaciones en 24 horas por quien invita**: el registro está abierto y
  crear una familia te hace admin de ella, así que sin tope la ruta era un amplificador de
  correo abierto a internet, y lo que se arriesga es la reputación del dominio y con ella los
  correos que la familia sí espera. Se cuenta sobre `family_invites` —ahí queda el rastro— y
  por persona y no por familia, porque las familias se crean gratis.
- `/api/account/delete` aplica la regla del último admin. **Ya no borra archivos**: desde que
  viven en el Drive de quien los subió son suyos, y usar el permiso que dio para guardar
  papeles de la familia para vaciarle el Drive no es lo que autorizó. Se va la ficha, con la
  familia; la conexión se va en cascada al borrar el usuario.
- `/api/documents/*` son las rutas de los documentos. La regla que las sostiene: **primero**
  se comprueba con el cliente del usuario (RLS) que puede ver la ficha, y **solo después** se
  usa el cliente de servicio para leer el token del dueño. Al revés serían una puerta a los
  documentos de cualquier familia.
- `/api/push` se apoya en la policy de `push_subscriptions`: un upsert con el endpoint de
  otra persona no puede robar su suscripción porque el `using` de la policy no deja tocar
  filas ajenas.
- `/api/cron/reminders` se protege con `CRON_SECRET`, y el proxy la deja pasar sin sesión a
  propósito.
- `/api/salud` queda **fuera del `matcher` de `src/proxy.ts`**: lo que vigila a Supabase no
  puede pasar por la pieza que puede estar colgada.
- **Las rutas que escriben rechazan lo que venga de otra web** (`deOtroSitio` en
  `src/lib/peticiones.ts`). Lo paraba el `SameSite=Lax` de las cookies de Supabase, que es una
  defensa prestada: el día que una cookie pase a `None`, `/api/account/delete` queda a un
  `fetch` ajeno. Se mira `Sec-Fetch-Site` y, si no viene, el `Origin` contra el `Host`; sin
  ninguna de las dos se deja pasar, porque eso no es un navegador y sin navegador no hay
  cookie que viaje sin querer. Un `GET` no entra: la vuelta de Google al conectar Drive es
  cruzada y tiene que pasar, y lo que la protege es el `state`. `requiereSesion` **exige** la
  petición como argumento para que la comprobación no se pueda olvidar en la ruta siguiente.
- El proxy (`src/proxy.ts`, que en Next 16 exporta `proxy()`) manda al login todo lo que no
  sea público. Las rutas públicas son una **lista blanca a mano**, `PUBLIC_ROUTES` en
  `src/lib/supabase/middleware.ts`; `/api/cron/*` pasa por prefijo, no por la lista.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app. Sin eso, un
  enlace de correo legítimo podía acabar en otra web justo después de iniciar sesión. **No
  basta mirar el principio de la cadena**: el navegador borra tabuladores y saltos de línea
  antes de interpretar una URL, así que se limpian esos tres caracteres y la ruta se resuelve
  con `new URL` contra un origen inventado — decide el navegador, que es quien va a
  interpretarla.

**Un detalle que se paga caro:** sin sesión, el proxy contesta 307 a `/auth/login` antes de
que la ruta llegue a devolver su 401, y `fetch` sigue el redirect, así que lo que ve quien
llamó es un 200 con el HTML del login. Un `res.ok` no basta para dar por buena la respuesta;
hay que mirar `res.redirected`. Está resuelto en `src/lib/supabase-repos/api-farpi.ts`, por
donde pasan todas las llamadas de la UI a rutas propias.

Las rutas que llama la UI **cortan al principio si `IS_DEMO_MODE`**: sin esa guarda, el modo
demo intenta hablar con Supabase y la suite e2e se cae. La del cron no lo necesita porque solo
la invoca Vercel. Una ruta API nueva que la UI vaya a llamar tiene que hacer lo mismo.

### Cabeceras

Seis en `next.config.ts` para todas las rutas, **CSP** y **HSTS** incluidas (la de HSTS la
pone además Vercel por su cuenta; está escrita porque era el único control que vivía en la
plataforma y no aquí). La CSP estuvo meses aparcada por un motivo que sigue siendo cierto
—Next inyecta scripts en línea y una CSP mal puesta rompe producción sin avisar en local—, y
por eso lleva `'unsafe-inline'` en `script-src`: **no para un XSS en línea**, pero sí cargar
scripts de otro dominio, `<object>`, el iframe, reescribir `base`, enviar un formulario fuera
y hablar con cualquier servidor que no sea Supabase. `connect-src` se arma con la URL real del
proyecto, no con un comodín, y abre `www.googleapis.com` por la subida directa a Drive.

Se prueba **contra el build servido** (`npm run build && npm run start`), no contra
`npm run dev`, que no sirve lo mismo: recorriendo las rutas a la escucha de
`securitypolicyviolation`, y dos veces —con credenciales reales, que prueba el `connect-src`
de Supabase, y con un build en modo demo, que es el único que deja entrar en las pantallas con
sesión sin credenciales—.

No hay `dangerouslySetInnerHTML` ni `eval` en todo el código.

Y **el build corta si producción arranca en modo demo**. El fallback sin credenciales es
correcto en local y en un preview; en producción es la app entera abierta sin sesión —el proxy
deja pasar todo en modo demo— sirviendo datos de mentira y aparentando funcionar, que es la
clase de avería que nadie mira.

## Documentos en Google Drive

Los archivos de los documentos **no los guarda Farpi**: viven en el Google Drive de quien los
sube. La familia no se entera —los ve igual, en la misma pantalla— y **conectar hace falta
para subir, no para mirar**.

### La segunda frontera

`src/lib/repos/types.ts` es la frontera de la interfaz. Esta es otra, distinta y más abajo, y
**solo de servidor**:

```text
                    Repos (frontera de la interfaz, navegador)
                      └─ documents → /api/documents/*
                                        ↓ (solo servidor)
              DocumentStorageProvider (src/lib/document-storage/types.ts)
                └─ googleDrive (google-drive.ts)
                   [futuro: dropbox (App folder), oneDrive (Microsoft Graph)]
```

La regla que la mantiene pequeña: **el proveedor es solo el disco**. No sabe qué es una
familia, no decide quién puede leer y no toca la base. Quien manda sigue siendo la RLS. Añadir
Dropbox u OneDrive es implementar la interfaz, registrarla en `document-storage/index.ts` y
añadir el valor al `check` de `documents.storage_provider`. Esa columna existe con un solo
valor a propósito: es la que hace que el contrato se use de verdad
(`getProvider(doc.storage_provider)`) en vez de quedar de adorno.

### Proxy para leer, directo para subir

- **Leer**: nadie habla con Drive salvo el servidor. Cuando otro miembro abre un documento,
  Farpi usa el token guardado del **dueño**, se trae el archivo y lo sirve por
  `/api/documents/[id]/file`, aplicando el control de acceso de siempre.
- **Subir**: el navegador manda los bytes **directamente a Google**, a una dirección de un
  solo uso que abre el servidor (`/api/documents/upload-session`). No es una excepción
  caprichosa: una función de Vercel corta el cuerpo de la petición muy por debajo de los
  20 MB que admite un documento, así que proxiar la subida sería bajar el tope del producto. Y
  quien sube es el dueño del Drive, que es el caso en el que el proxy no compra nada.

**La ficha no puede cambiar de disco, y la puede editar cualquiera de la casa.** Son dos
piezas y van juntas. `storage_owner` se comprueba en el `insert` —solo se presta la llave de
uno— y su inmutabilidad, junto con la de `storage_path` y `storage_provider`, la sostiene el
trigger `trg_document_storage_inmutable`, porque una policy no puede comparar con la fila
anterior: `with check` solo ve la nueva. El hueco que cerraba era poder poner a nulo el dueño
de un papel ajeno y dejarlo sin abrirse para toda la casa —no se lleva nada, con `drive.file`
el token de quien mira no ve lo que subió otro, pero es sabotaje que la RLS no veía—.

**Y el trigger tiene una excepción, que no es un descuido.** `documents.storage_owner` es
`on delete set null` contra `auth.users`, y Postgres ejecuta esa acción referencial como un
**update** sobre `documents`: entra por el trigger. Sin la excepción, borrar la cuenta de
quien subió papeles a una familia que le sobrevive —dos adultos, los dos admin, uno ha
subido— se cae entero con un 500 permanente. El trigger deja pasar ese caso y **solo** ese,
y lo reconoce por de dónde sale y no por quién lo pide: que el dueño anterior ya no exista en
`auth.users`, un estado que nadie puede fabricar porque nadie puede borrarle la cuenta a
otro. El detalle está comentado en `schema.sql`, junto a la función.

Estuvo todo en una sola policy `for all` con el `with check` del dueño, y **eso rompía el
renombrado**: Postgres aplica el `with check` a la fila nueva de cualquier escritura, y la de
un renombrado sigue llevando dentro el dueño de quien subió el papel, así que nadie podía
editar la ficha de un documento ajeno. Ahora son cuatro policies. Si alguien quita el trigger,
el `update` sin `with check` de dueño vuelve a dejar señalar el Drive de un tercero, esta vez
editando en vez de insertando.

### El permiso prestado

- Scope **`drive.file`** y ninguno más: solo los archivos que crea esta app. Es un scope **no
  sensible**, así que Farpi no pasa por la verificación de Google ni por la auditoría CASA.
  Cambiarlo por `drive` o `drive.readonly` mete el proyecto en un proceso de semanas.
- Los tokens viven en `storage_connections`, **cifrados** (AES-256-GCM, `DOCS_TOKEN_KEY` en
  Vercel), en una tabla con RLS activada y **ninguna policy**: solo entra el service role desde
  una ruta API. Dar `select` al dueño parece inofensivo y no lo es — la CSP lleva
  `'unsafe-inline'` en los scripts y por tanto no para un XSS en línea, que con esa policy se
  llevaría un refresh token. Para saber si hay conexión está `/api/documents/providers`.
- Refresco perezoso, con un minuto de margen antes de caducar. Se hace por adelantado y no
  ante un 401 porque el 401 llega a mitad de una descarga ya empezada.

### Cuando se cae

`invalid_grant` no es un fallo pasajero: el permiso se revocó, o caducó. Se marca `revoked_at`
y **no se borra nada**, ni la conexión ni las fichas ni el archivo.

- A quien intenta abrir se le dice con nombre: «lo subió Marta y su almacenamiento ya no está
  conectado». Sin el nombre el aviso no se puede resolver, porque no dice a quién avisar.
- Al dueño le vuelve a salir el botón de conectar, y al reconectar todo revive: los
  identificadores de archivo no cambian.
- Es distinto de que el dueño borre el archivo en su Drive (`archivo_no_esta`), que no tiene
  arreglo desde la app. Los dos mensajes son distintos a propósito.
- Quitar a un miembro de la familia tiene el mismo efecto, y el sheet lo avisa antes con el
  recuento de documentos que se quedarán sin poder abrirse.

### Publicación en Google

La pantalla de consentimiento tiene que estar **"In production"**. En **"Testing"**, Google
caduca los refresh tokens a los **7 días** y solo deja entrar a las cuentas de la lista de
prueba: las dos cosas rompen el sistema en silencio y con retraso. Con solo `drive.file` no
hace falta verificación para publicarla.

## Las personas: quién hay en la casa y de quién es cada cosa

### Con cuenta y sin cuenta

La frontera de la app no es adulto/niño, es **con cuenta / sin cuenta**. `family_members`
cuelga de `auth.users` con `user_id not null`: para estar ahí hace falta correo, cuenta y
sesión, y de esa tabla dependen `my_family_ids()`, las policies y la regla del último admin.
Una abuela que recoge a los niños los martes no tiene nada de eso y sin embargo hay que poder
asignarle cosas.

Por eso **los adultos sin cuenta van en `children`** con `kind = 'adulto'`. `children` es ya
la tabla de las personas de las que la familia lleva registro: nombre, color, asignación por
`child_id` en eventos, tareas y documentos, y sus triggers de integridad entre familias. Se
descartó tocar `family_members` —habría metido mano en la tabla de la que cuelga toda la
seguridad para no ganar nada— y se descartó una tabla nueva, que duplicaría policies, triggers
e integridad para lo mismo.

El precio es que la tabla se llama `children` y guarda abuelos. Se paga a gusto: renombrarla
arrastraría claves ajenas, policies y triggers de media base.

En Ajustes son tres grupos dentro de "Personas" —**Adultos con cuenta** (se invitan por
correo), **Adultos sin cuenta** (se añaden con un nombre y un color) e **Hijos**—, y en
"asignar a" los adultos van juntos, con cuenta o sin ella: a la hora de asignar algo da igual
quién entra en la app. Los dos primeros se llamaron "Adultos" y "Otros adultos": nombrar la
frontera es más largo y dice lo que hay, mientras que "otros" dejaba a la abuela como un
adulto de segunda sin explicar por qué está en otra lista.

Quién eres se sabe por `currentMember` del store, que compara los miembros con
`members.getCurrentUserId()` del contrato de repos (en demo, siempre `u1`). Es para reconocer
tu fila, no para decidir permisos: eso lo sigue haciendo la RLS.

### Asignación de eventos, tareas y documentos

Un evento, una tarea o un documento puede pertenecer a **toda la familia**, a **un miembro
adulto** o a **un hijo**, nunca a dos a la vez. Se modela con dos columnas nullables,
`child_id` y `member_id`, y un `check` que impide que ambas estén rellenas. Lo mismo vale para
quién pagó un gasto en Finanzas, que reutiliza ese par: así valen el mismo `AssigneePicker`,
los mismos triggers de integridad entre familias y la misma lectura —los dos a null es "de la
casa", que es el caso normal y no un hueco sin rellenar—.

No se unificaron en una sola columna porque son conceptos distintos: un miembro tiene cuenta y
entra en la app; un hijo es alguien de quien la familia lleva registro. Los hijos guardan su
color en la base; los miembros lo reciben por su posición, en `src/lib/assignees.ts`, que es
la única fuente de ese cálculo para que el color sea el mismo en Ajustes, calendario y
documentos.

Las tareas llegaron las últimas y son donde más falta hacía: en una casa compartida la
pregunta de una tarea es "¿quién la hace?". Guardan además `completed_by`, porque
`completed_at` decía cuándo pero no quién.

Al eliminar a un miembro, sus asignaciones pasan a ser de toda la familia
(`on delete set null`); el mock lo imita en `store/family.ts`. Una persona borrada suelta su
`child_id` o su `member_id` en **seis tablas**, y si es un miembro con documentos, los papeles
que están en **su** Drive dejan de abrirse, porque el permiso prestado se va con ella.

### Los colores de persona

`PERSON_COLORS` (`src/lib/constants.ts`) son **catorce en dos bandas de claridad**: ocho de
adulto y seis de niño. Ese archivo es la fuente de verdad; lo que hay que saber aquí es cómo
está construida:

- **Los grupos se separan por claridad, no por tono.** Adultos en L\* 30-45, niños en L\* 71-88,
  y la franja L\* 52-62 se esquiva: ahí ni el blanco ni la tinta llegan a 4,5:1 encima del
  color, así que no cabe un grupo entero. De ahí sale el reparto de texto: los ocho de adulto
  llevan blanco (el peor, Ladrillo, 5,42:1) y los seis de niño llevan tinta (el peor, Canela
  clara, 6,92:1).
- **Los adultos no se reparten por género.** Estuvieron divididos en "cinco de hombre" y "tres
  de mujer", y esa cuota obligaba a elegir tonos para rellenarla en vez de por cómo se
  distinguen. La app no sabe de géneros —no hay campo para eso— así que la paleta tampoco: los
  ocho son sobrios y se ofrecen igual a cualquiera. Con ese cambio salieron Rosa fuerte y
  Mostaza oscura, y entraron Pizarra (`#536270`) y Ciruela (`#6B3F6D`).
- **No son todos cálidos, a propósito.** Azul (`#4A6C8C`), Verde bosque (`#3D5C42`), Pizarra y
  Ciruela rompen la regla de "solo tierras y ocres": con ella, quien busca "el azul" no lo
  encontraba. Respetan la banda de claridad de los adultos, así que no cuestan contraste. No
  es la versión intermedia que se descartó en su día: aquella era fría **entera**, porque el
  criterio era aguantar el daltonismo. Ese criterio sigue retirado.
- Ninguno es el `FAMILY_COLOR` ni el verde de la app, y ya **ninguno se le parece**: la que se
  confundía con el amarillo de familia era Mostaza oscura, y el adulto más cercano ahora es
  Cuero, a ΔE00 37. Queda un roce medido y de otra clase: Coral claro a ΔE00 8,3 de la
  terracota de marca. No compiten en pantalla —un punto de persona no se pone al lado de un
  botón—, pero está anotado.
- **Lo que cuesta**: once parejas de noventa y una quedan por debajo de ΔE00 15 (eran doce).
  La más cercana es Calabaza clara con Canela clara, a 5,71, las dos de niño; entre adultos,
  Azul con Pizarra a 7,40 y Vino con Granate a 7,71.
- **Quitar un color de la lista no toca lo guardado.** `memberColor` devuelve el que la persona
  tenga, sea de la paleta o no, y `ColorPicker` simplemente no lo marca como elegido. Ya pasa
  con el `#FBC4DC` de Ana en los datos de demo, que no está en la lista desde hace dos paletas.

`e2e/unit/assignees.spec.ts` vigila lo que se puede vigilar sin meter CIEDE2000 en el
repositorio: que no se repitan, que ninguno sea el `FAMILY_COLOR` ni el verde de la app, y que
la inicial de cada uno llegue a 4,5:1 con el color de texto que le toca. Los recuentos
—catorce, ocho y seis— viven en comentarios y no en `expect`: lo que hay que sostener es la
regla, no cuántos colores haya.

Dos funciones que centralizan el resto, las dos en `assignees.ts`:

- **`textColorOn()`** decide el color del texto encima de un color de dato: blanco o la tinta
  de siempre, el que más contraste dé. Antes iba en blanco a pelo y encima de media paleta no
  se leía —sobre el amarillo de "toda la familia" daba 1,67:1—, y la paleta no lo puede
  arreglar sola: la claridad varía por necesidad, así que hay colores oscuros y claros en la
  misma lista.
- **`eventColor()`** da el color con el que se pinta un evento: el propio del evento, si no el
  de quien lo lleve, y si no hay nadie el `FAMILY_COLOR` amarillo. Está centralizado porque
  cuando el cálculo estaba copiado en cada pantalla, Inicio se quedó sin el último escalón y
  los eventos de toda la familia salían sin marca.

El patrón visual de una etiqueta de persona es `.etiqueta-persona` + `fondoDePersona`: **el
color va de fondo y el nombre en tinta**, que es para lo que los seis colores de hijo están en
L\* 71-88.

### Ausencias: vacaciones y descansos

Unas vacaciones **no son una entidad aparte**: son un evento de varios días asignado a una
persona. Reutilizan las policies, la asignación y la integridad entre familias, así que la
única diferencia es `kind = 'vacaciones'` y que `end_at`, que en un evento normal marca la
hora de fin, aquí marca el último día.

Eso obligó a cambiar una suposición repartida por el calendario: que un evento vivía en un
solo día. Los sitios que comparaban `start_at` con el día usan ahora `eventCoversDay`
(`src/lib/events.ts`), que pregunta si el evento cubre esa fecha. Las comparaciones se hacen
sobre cadenas `yyyy-MM-dd`, no sobre `Date`, para no arrastrar líos de zona horaria.

**Vacaciones y descansos son lo mismo para el calendario: quién no está.** Los dos son
`isAbsence`, y ninguno de los dos **sale en la lista de la agenda**: ocupan días seguidos y se
repetían en todos, así que un descanso de tres días eran tres filas con el mismo texto.

Tampoco son un plan de hoy. Un evento de rango queda **fuera** de la lista de eventos, de los
planes de hoy (`selectTodayEvents`) y del recordatorio diario: estar de vacaciones no es un
plan que haya que recordarle a nadie a las siete de la mañana. Esa regla estuvo escrita de
cuatro maneras por la app y dos de ellas solo apartaban las vacaciones, así que al entrar el
descanso y el festivo nadie volvió a mirarlas y los dos se colaban en Inicio y en el correo de
las siete, donde un festivo se anunciaba como "tenéis 1 evento". Ahora es **una sola**:
`isPlan(event)` en `src/lib/events.ts`, lo contrario de `isRangeKind`, y el cron arma su
filtro contra Postgres con la misma lista (`RANGE_KINDS`).

Y no se les pide título, ni a ellas ni a los descansos: el tipo ya dice lo que son, y exigir un
nombre era exigir que alguien se inventara un texto para poder guardar. El campo sigue ahí
porque "Playa con los abuelos" vale la pena, pero es opcional y `eventTitleOr` pone el nombre
del tipo al guardar. Un plan sí lo exige.

**Cuando no queda nadie se dice una vez y en amarillo.** Un día en el que **todos los adultos
con cuenta** están fuera y por lo mismo lleva una sola franja en `FAMILY_COLOR`, no una por
persona. La lógica está en `familyAbsenceKind` (`src/lib/events.ts`) y sus tres reglas son
deliberadas:

- **Solo `members`**, los adultos con cuenta. No los adultos sin ella ni los hijos: es quien
  tiene un trabajo del que librar, y es la lista que la familia mantiene al día porque da
  acceso a la app. Contando a los hijos, el día dejaría de ser de la familia en cuanto uno
  tuviera colegio, que es casi siempre.
- **Dos como mínimo.** Con un solo adulto, «todos los adultos» es él y cada vacación suya se
  volvería amarilla: el color pasaría a decir «de la casa» cuando sigue siendo de una persona.
- **Del mismo tipo.** Uno de vacaciones y otro descansando no se resumen en una palabra; ese
  día se queda con sus franjas de siempre.

No nace de una idea estética sino de un fallo: la celda pinta dos franjas como mucho, así que
con tres adultos de vacaciones el mismo día la tercera no se pintaba. El día cuya respuesta es
la más simple —«aquí no hay nadie»— era el que peor se leía. Los extremos del tramo no salen de
`vacationEdges`, que mira los de **un evento**: aquí el tramo lo forman las vacaciones de
varias personas, que empiezan y acaban cada una por su lado, así que hay que preguntar si el
día de al lado también es de la casa (`familyAbsenceEdges`). Por eso se calcula en `MonthGrid`,
que tiene el calendario entero, y no en la celda, que solo conoce su día.

**`Availability` es la fuente de los nombres**, y sustituye a `VacationLegend`. Una ausencia
sale **una vez**, con nombre escrito, icono según la clase (palmera o taza) y su estado en
palabras: "de vacaciones hasta el 28 ago" si ya ha empezado, "del 3 al 9 sept" si no, "descansa
hoy" o "descansa mañana" si es de un día. Es también el único sitio desde el que se editan, y
por eso sus filas llevan `min-h-8`. El bloque **no colapsa** con la rejilla aunque se planteó:
la rejilla contesta «¿qué día es este?» y el bloque «¿quién y hasta cuándo?».

El tramo del que habla el bloque es **exactamente** el que se pinta: el mes en modo mes —no sus
seis filas, desde que la rejilla no presta días de fuera—. Contar las seis filas hacía que el
bloque anunciara un descanso del 3 de septiembre mirando agosto, sin ningún día pintado que lo
respaldara.

### Cumpleaños

**Un cumpleaños de la casa no es un evento.** Se pensó en crearlos como eventos recurrentes al
guardar la fecha de nacimiento, y se descartó: habría que darlos de alta, borrarlos al borrar a
la persona, arrastrarlos al cambiar la fecha y decidir qué se hace con los años ya pasados. Un
cumpleaños **se deduce** de un dato que ya estaba guardado en Ajustes, así que es dato derivado
(`src/lib/birthdays.ts`), como "lo que falta en cada lista": nada que mantener y nada que se
desincronice. La consecuencia, y es a propósito: no se puede editar, ni asignar, ni tiene hora,
ni sale en el calendario. Se cambia donde se cambia la persona.

Solo lo tienen los **hijos y los adultos sin cuenta**, que son los que llevan `birth_date`. Los
miembros con cuenta no: añadirlo obliga a tocar el esquema en producción y la RPC del perfil.

**Y el de la abuela sí es un evento.** Para la abuela, un primo o el amigo del cole no hay
ninguna ficha de la que deducir nada, y la única alternativa era darles de alta como persona
—con su color, asignables y saliendo en todos los selectores de "de quién es esto"—, que es
meter en la familia a quien solo queremos felicitar. La salida es `kind = 'cumple'`:

- **El tipo manda sobre la recurrencia.** Un cumpleaños es anual por definición, así que el
  sheet no enseña el selector de repetición: guarda la serie de veinte años (`ANOS_DE_CUMPLE`)
  con la misma maquinaria que los festivos. Preguntar "¿hasta qué año?" al apuntar el
  cumpleaños de la abuela es trabajo administrativo.
- **Día completo, un solo día, de nadie.** Ni hora ni asignación: el color significa "de quién
  es esto" en el resto de la app, y un cumpleaños de fuera no le toca a nadie en particular. Lo
  fija la base con `events_cumple_de_un_dia`.
- **El año de nacimiento es opcional** (`events.birth_year`). De la abuela se sabe; del amigo
  del cole, casi nunca. Lo único que cambia es si Inicio dice "cumple 77 años" o "hoy es el
  cumple de X". Va en la fila y no se deduce de `start_at` porque la serie arranca en el año en
  curso: la fecha dice el día que se celebra, no el día que nació.

**Los dos orígenes se juntan donde se leen y se separan donde se corrigen.** En Inicio son lo
mismo (`cumplesDeLaCasa`), y en la pantalla de Cumpleaños también —para quien mira son un
nombre y un día—, pero cada fila lleva a su origen: la del apuntado abre ahí mismo el sheet del
calendario en edición y la del de casa lleva a su ficha en Ajustes (`?seccion=familia`). Se
dejó sin tocar cuando nació la pantalla, con el argumento de que corregir era cosa del
calendario; no aguantó, porque ir al calendario obliga a acertar el mes en el que cae el
cumpleaños, que es justo el problema por el que existe la lista. Lo que se edita de una serie
anual es **el cumpleaños de este año**, igual que en el calendario; borrar sí pregunta por la
serie entera.

Un cumpleaños **no cuenta como plan del día** (`isDigestPlan`): sin esa distinción salía dos
veces en la misma pantalla de Inicio, arriba como celebración y debajo como una cita más.

**En la lista de Cumpleaños no hay punto de color.** Es la única pantalla donde se quitó, y por
lo que se ve mirándola entera: en doce meses de cumpleaños los de la casa son cuatro o cinco, y
el resto —la abuela, el amigo del cole— no tienen color y llevaban el punto en gris. Una
columna de treinta puntos grises con cuatro de color no dice de quién es cada fila: dice que hay
una decoración. El color de una persona sigue donde sirve, que es donde hay que distinguirla de
cosas que no son personas: los planes de Inicio y la agenda del calendario.

**El de hoy y los que vienen se leen distinto.** El de hoy abre la tarjeta de hoy, con la tarta
y el color de la persona; los siguientes van en su bloque, con catorce días de ventana
(`DIAS_AVISO_CUMPLE`). Es lo único de Inicio que **caduca el mismo día** —una cita se recupera
por la tarde, un cumpleaños visto a las once de la noche ya no se felicita— y por eso el aviso
de las siete lo pone delante de las tareas y de los papeles que caducan, y solo felicita **el
mismo día**: avisar con antelación no es recordar un cumpleaños, es adelantarlo.

**La asimetría, asumida a propósito**: el cumpleaños de fuera se ve en el calendario y el de
casa no. Es explicable —en el calendario está lo que se apunta, y el de casa no está apuntado en
ninguna parte— y la alternativa era peor: si el apuntado tampoco se viera ahí, no habría dónde
corregirlo ni borrarlo.

## Finanzas: el modelo del mes

La sección tiene más esquema que ninguna otra, y casi todo lo que parece una decisión de
pantalla está sostenido por la base. Va aparte por eso.

### Cuatro piezas y una sola palabra «presupuesto»

"Presupuesto" en una casa española son dos cosas: lo que te puedes gastar al mes en la compra y
el papel que te pasa el fontanero. Cada pieza contesta una pregunta distinta:

| Tabla | En pantalla | Dónde | Contesta |
|---|---|---|---|
| `fixed_entries` | **Fijos** | pestaña «Fijos» | ¿con cuánto contamos y qué está comprometido? |
| `fixed_entry_overrides` | El importe de un fijo **en un mes** | pestaña «Este mes» | ¿y el mes que salió distinto? |
| `budgets` | **Partidas** | «Fijos», y plegadas en «Este mes» | ¿me estoy pasando en lo que sí controlo? |
| `expenses` | **El día a día** (una fila, un **apunte**) | pestaña «Este mes» | ¿qué ha pasado este mes? |
| `quotes` | **Presupuestos** | pestaña «Presupuestos» | ¿cuánto va a costar esto que aún no hemos hecho? |

Así «presupuesto» significa **una sola cosa** en toda la app: lo que cuesta algo que todavía no
has hecho. Las cuatro primeras no se tocan entre ellas salvo `expenses.budget_id`, que es
opcional; `fixed_entry_overrides` no es una pieza más, cuelga de `fixed_entries`.

**Las palabras son de casa y no de banco.** La lista se llama «El día a día» y su fila es un
**apunte**; no «movimientos», que nadie llama así a lo que acaba de apuntar. Y a la compra no se
le pone un «tope» sino una **partida**: «tope» nombra solo el techo —lo que **no** puedes
pasar— y hacía que la pantalla se leyera como una advertencia incluso a primeros de mes, con las
barras vacías, mientras que «partida» nombra la cosa entera, que es lo que la fila enseña (178
de 250, y 72 por delante). La sección se llama **Finanzas** y no «Presupuestos» por lo mismo: si
el contenedor se llamara igual que una de sus piezas, las otras parecerían estar de prestado.

Las cuatro pestañas son **«Este mes», «Estadísticas», «Fijos» y «Presupuestos»**: cuatro
nombres con la misma forma gramatical, que es lo que hace que una barra se lea como las partes
de una cosa y no como cuatro ocurrencias. «Estadísticas» y no «Evolución» porque *evolución*
promete una **tendencia**, y con cuatro meses de datos no hay ninguna que enseñar sin mentir
—que es la misma razón por la que dentro se descartó la estacionalidad—. Se pierde algo y
consta: «Este mes» se queda corto en cuanto se navega a agosto, y lo cubre la tarjeta de debajo,
que dice el mes con su nombre grande.

**La barra es un segmentado, y los cuatro rótulos van en tinta.** Fue una caja blanca con borde
y la pestaña activa en `primary-strong` maciza —el último verde relleno que quedaba en la app—;
hoy es **canal gris (`surface`) y la activa como una tarjeta blanca con sombra**, que dice «estás
aquí» sin pintar nada de color. Y los cuatro en tinta, no el activo en tinta y los demás en gris,
que es lo que haría cualquier barra de pestañas: no llega, porque `muted` (#6E6861) sobre
`surface` (#F0EDE8) da **4,24:1**, por debajo del 4,5 que pide un texto de 13 px, y con
`hairline` de canal tampoco (4,40:1). Lo que separa al activo del resto es la tarjeta y el peso
de la letra — que además es exactamente lo que hace un segmentado de iOS.

**Lo que se renombra es lo de fuera, nunca lo guardado.** `budgets` sigue llamándose `budgets`
aunque en pantalla sean «partidas», `expenses` sigue siendo `expenses` aunque sean «apuntes», el
`check` `expenses_ingreso_sin_tope` conserva su nombre viejo y las claves internas de las
pestañas siguen siendo `resumen` y `plantilla`. Renombrar obliga a migrar una base en
producción con datos de una familia a cambio de una palabra. Lo que sí bajó al código fueron los
conceptos —`resumenPartidas`, `apuntesDelMes`, `abrirPartida`, `guardarApunte`— para no traducir
mentalmente en cada archivo. `MovementKind` se queda en inglés, que es un nombre correcto para
«gasto o ingreso».

La ruta fue `/finanzas` hasta que pasó a **`/finances`** con un **308 permanente** en
`next.config.ts` —permanente porque no se va a deshacer, y para siempre porque no hay forma de
saber qué marcadores siguen ahí—. El redirect salta **antes** del control de sesión del proxy.
Lo que sigue en español es la lógica: `src/lib/finanzas.ts`, `useFinanzasState`, `CuentaDelMes`,
`CadaMesPanel`, el rótulo «Finanzas» y la categoría de documentos `'finanzas'`, que es un valor
guardado en la base.

### El dinero va en céntimos

**Todo en `integer`.** Ni coma flotante —0,1 + 0,2 da 0,30000000000000004, y un céntimo de más
convierte "llevas 300,01 de 300" en un presupuesto incumplido— ni `numeric`, que llegaría a
JavaScript como cadena. El texto tecleado lo convierte `parseAmountToCents`
(`src/lib/finanzas.ts`) en **un solo sitio**, y lo llaman los dos lados de la frontera: si el
mock y Supabase convirtieran cada uno por su cuenta, "12,50" acabaría valiendo distinto según el
modo. El formato se escribe a mano en vez de con `Intl.NumberFormat`, que mete un espacio duro
cuya forma cambia con la versión de ICU: el mismo importe tiene que leerse igual en un test y en
un móvil.

**Los importes llevan siempre sus dos decimales** (`formatCents`). El formato corto se comía el
`,00` y de uno en uno era mejor —una partida se pone en euros enteros y «400,00 €» hace leer dos
ceros que no dicen nada—, pero en una columna donde conviven «400 €», «74,70 €» y «1.234,56 €»
la coma cae en sitios distintos en cada renglón y las cifras dejan de compararse de un vistazo,
que es para lo que están puestas una debajo de otra. `formatCentsCorto` se queda para los dos
sitios donde el importe no es una cifra que se compare: los rótulos de dentro de los gráficos,
redondeados al euro porque a 9 px «1.234,56 €» mide más que la columna de un mes, y el tope del
validador («Como mucho 1.000.000 €»), que es un techo y no dinero de nadie.

### La plantilla y los meses cerrados

El problema que resuelve: `fixed_entries` y `budgets` eran «una cifra que vale hasta que se
cambie», lo que contesta muy bien «¿cómo va este mes?» y no contesta en absoluto «¿cómo fue
enero?» — subir el alquiler de 800 a 850 en marzo hacía que enero también dijera 850. En cuanto
la sección sirve para llevar el control de una casa, un pasado que se reescribe solo no es un
pasado.

**La regla, entera, en una línea:** si el mes tiene copia, manda la copia; si no y el mes no ha
terminado, refleja la plantilla.

El orden importa y no es el obvio. Escrito al revés —preguntando primero «¿ha terminado el
mes?»— no había manera de cerrar un mes antes de tiempo: la copia quedaba guardada y la pantalla
seguía enseñando el espejo.

```
«Fijos» — LA PLANTILLA             «Este mes» — UN MES CONCRETO
  ingresos fijos                      espejo, si es el mes en curso
  gastos fijos          ──copia──▶    copia congelada, si ya terminó
  partidas                            ──────────────────────────────
                                      el día a día (apuntes)
```

- **Las partidas viven en la plantilla.** Una partida es exactamente lo mismo que un fijo —una
  cifra de la plantilla— solo que en vez de gastarse sola se va llenando. Colgando de «Este mes»
  obligaba a contestar qué significaba cambiar una a mitad de mes; en la plantilla no hay nada
  que contestar. En «Este mes» se siguen viendo, con su barra, que es donde tienen sentido.
- **El mes en curso es espejo y no copia, y eso es deliberado.** Se valoró congelarlo también el
  día 1 —lo más literal de «no se puede alterar»— y se descartó por dos casos que pasan de
  verdad: quien monta la app a mitad de mes se habría quedado con una foto vacía imposible de
  rellenar, y quien se equivoca al dar de alta un fijo habría cargado con el error treinta días.
  Congelar sirve para que el pasado no se mueva, no para que el presente no se pueda arreglar.
- **Lo que se congela es el plan, no el día a día.** En un mes cerrado no se editan los fijos ni
  las partidas —eso es el plan— y **sí se apunta, siempre**: la vida llega tarde y los 40 € del
  29 de septiembre tienen que caber en septiembre aunque se apunten el 2 de octubre.
- **La partida se pone una vez, no una por mes.** Se valoró una fila por categoría y mes
  —permitiría "en diciembre gastamos más"— y se descartó: obliga a "abrir septiembre" cada
  treinta días, que es el trabajo administrativo que esta app existe para no pedir. Cambiarla
  vale desde ya para el mes en curso y no toca lo apuntado ni los meses cerrados.

### Un fijo puede valer otra cosa en un mes suelto

La limpieza son 120 € al mes, pero hay meses de 150 y meses de 90, y ninguna de las dos salidas
que había servía: cambiar el fijo sube la referencia y con ella **todos** los meses abiertos, así
que la casa pierde el «esto suele costar 120», que es el dato entero por el que se pone un fijo;
y apuntar la diferencia en el día a día mezcla un recibo con la compra y deja «Gastos fijos»
diciendo lo que no fue.

Son dos cifras y dos sitios: **la referencia vive en `fixed_entries` y se toca en «Fijos»; el
mes vive en `fixed_entry_overrides` y se toca en «Este mes»**. La tabla guarda **solo lo que se
sale de lo normal** —un mes sin fila vale lo que diga la plantilla—, que es la misma forma que
tienen las excepciones de una recurrencia, y por eso no hace falta «abrir septiembre»:
septiembre existe cuando alguien lo ajusta y no antes.

```
fixed_entries          Limpieza · 120 €/mes          ← la referencia, no se mueve
fixed_entry_overrides  Limpieza · 2026-09 · 150 €    ← solo los meses que se salen
                       Limpieza · 2026-11 ·  90 €
```

**Es un ajuste de un mes y no una vigencia.** Poner 150 en septiembre no toca octubre: octubre
vuelve solo a los 120. Se valoró el «de aquí en adelante» —que además arreglaría de otra manera
lo de que subir el alquiler reescriba los meses abiertos— y se descartó por dos cosas: el caso
de la casa es justo el que le da nombre a esto (un mes sale más y el siguiente menos, sin que la
referencia cambie nunca), y una vigencia obliga a decidir qué pasa hacia atrás, que es una
pregunta que aquí no hay que contestar.

**Se aplica en un solo sitio**, `plantillaDelMes`, que es por donde pasan todas las cifras de un
mes: la cuenta, el desglose, la serie y el reparto lo heredan sin saber que existe. Un mes
cerrado **no lo mira** —su copia ya guardó el importe que tuvo, ajuste incluido, porque
`close_month_copy` copia el `coalesce`— y ahí está la razón de que un ajuste puesto hoy no pueda
mover un mes que ya terminó. Cuando un mes lleva ajuste, `FijoDelMes.referenciaCents` trae la
cifra de la plantilla y la pantalla escribe «suele ser 120 €» debajo del nombre; el resto de las
veces va a `null`, porque sin ajuste no hay dos cifras que contar.

El sheet que lo edita es `AjusteDelMesSheet`, de un solo campo, que pregunta por **este** mes,
ofrece volver a la referencia si ya hay ajuste y lleva a «Fijos» de un toque para cuando lo que
ha cambiado es lo de todos los meses. Se descartó un selector de «solo este mes / siempre»
dentro del sheet del fijo: convierte un formulario en dos, y quien se equivoca de opción no se
entera hasta un mes después.

### El cierre

**Nadie cierra nada a mano.** Lo hace la RPC `close_previous_month`, y la llaman dos sitios que
no se coordinan: el cron diario (`/api/cron/reminders`, que ya pasaba por ahí todos los días) y
la propia app al arrancar, si ve que falta el mes pasado. Las dos son idempotentes
(`insert ... on conflict do nothing`) y la de la app solo se intenta cuando falta, así que los
otros treinta días del mes no cuesta ni un viaje. Son **dos** llamadas y no una porque cada una
tapa el agujero de la otra: el cron puede fallar o llegar tarde, y hay familias que abren la app
el día 1 antes de que el cron pase. Y se ejecuta **todos los días**, no solo el 1: la RPC solo
mira el mes anterior, así que el día 2 no hace nada; un `if (día === 1)` haría que un cron caído
esa madrugada perdiera el mes entero sin que nadie se enterase.

Son **cinco funciones en escalera**, porque cada una responde a una pregunta distinta:

| Función | Qué decide | Quién la llama |
|---|---|---|
| `close_month_copy` | nada: copia y punto | nadie de fuera (`execute` revocado) |
| `close_month` | solo meses **terminados** | el cron (`service_role`) |
| `close_previous_month` | el mes anterior, y tu familia | la app al arrancar |
| `close_month_now` | no futuros, y tu familia | el botón de cerrar ya |
| `reopen_month` | solo el mes **en curso**, y tu familia | el botón de deshacer |

Las dos primeras llevan el `execute` **revocado** de `public`, `anon` y `authenticated`:
Postgres lo concede a `public` por defecto en cada función nueva, y sin ese `revoke` cualquiera
podría congelarle el mes a cualquier familia con la plantilla equivocada. `close_month_copy` es
la peligrosa de verdad, porque no tiene ninguna guarda de fecha.

- **Solo se cierra el mes anterior, nunca más atrás.** Si el cron estuviera caído tres meses,
  copiar la plantilla de hoy en enero escribiría unos números que puede que en enero no fueran
  esos. Un mes sin cerrar se ve —la tarjeta lo dice— y se puede arreglar; un mes cerrado con
  datos inventados, no.
- **Y solo se copia lo que ya existía antes de que el mes acabara.** La regla anterior dejaba un
  hueco de un mes por el que se colaba justo lo que venía a evitar: agosto se cerró el 1 de
  septiembre copiando unas nóminas y unos recibos creados ese mismo día 1, y acabó diciendo que
  entraron 3.130 € que nadie vio. `close_month_copy` filtra por `created_at` contra el primer
  instante del mes siguiente (`existiaEnElMes` en `budgets.ts` hace lo mismo en el mock), y **si
  había plantilla pero nada de ella estuvo en ese mes, no cierra**: el mes se queda en
  `sin-plan`, que suma cero y lo dice.
- **El cierre a mano existe, y es un atajo, no una tarea.** Como el mes en curso es espejo, no se
  puede dejar preparado un cambio «para el mes que viene»: subir el alquiler el 20 de septiembre
  lo mete también en septiembre. Con «Cerrar mes» se congela el día que se dé por terminado y a
  partir de ahí la plantilla solo mira al siguiente. **Si nadie lo toca, el mes se cierra solo
  igual.** Se descartó la versión obligatoria —el mes no pasa hasta que alguien lo cierra— por lo
  de siempre: es la tarea administrativa que esta app existe para no pedir, y en una casa la haría
  quien llegara antes, por los dos.
- **Deshacer, solo mientras el mes siga siendo el de hoy.** `reopen_month` es lo que permite
  ofrecer el cierre anticipado sin miedo a un toque de más. Un mes terminado no se reabre jamás:
  si el pasado se pudiera reabrir, no estaría cerrado, y todo lo demás sobra.

**El relleno de los meses viejos se hizo una vez, el día que se aplicó.** Cerrar con la plantilla
de hoy todos los meses terminados que tuvieran algún apunte era correcto **ese día y solo ese
día**, porque la plantilla no había cambiado desde que se puso. La misma sentencia un mes más
tarde habría escrito números inventados. Está en `schema.sql` como un `do $$ ... $$` idempotente
y ahí se queda, como registro de lo que se hizo.

### Poner un mes a cero, y lo que no tiene vuelta

`empty_month` existe porque la regla del `created_at` evita el próximo mes inventado pero no
arregla el que ya se guardó. **Vacía el plan y deja la cabecera**, y esa es toda la sutileza: si
borrara la cabecera —lo que hace `reopen_month`— la app vería «falta el mes pasado» en la
siguiente carga y lo cerraría otra vez con la plantilla de hoy. Una cabecera sin líneas dice las
dos cosas que hay que decir —ese mes está cerrado, y de él no se guardó nada— y se queda quieta.
Los apuntes **no** se tocan: lo que se vacía es el plan.

**No tiene vuelta atrás desde la app, y el esquema decía que sí.** Con la cabecera puesta,
`close_month_copy` se sale por su `insert … on conflict do nothing` seguido de
`if v_filas = 0 then return false`, sin escribir nada; y la UI no ofrece nada, porque un mes
pasado con copia vacía falla las tres condiciones de `CierreDelMes`. Recuperarlo es cosa del SQL
Editor, por dos caminos según lo que haya pasado: borrar la cabecera y llamar a
`close_month_now`, que recopia **solo lo que existía antes de que el mes acabara**, o escribir
las líneas a mano, que es lo único que sirve cuando la plantilla es posterior a ese mes. Darle
salida por la app es una RPC nueva —borrar la cabecera y recopiar en una sola operación— y por
tanto `scripts/validate-rls.mjs` y `docs/supabase-validation.md` detrás.

### Vaciar el día a día de un mes

El otro botón que borra, y **hace lo contrario que el de arriba**: «Poner el mes a cero» quita
el plan y no toca los apuntes; «Borrar los apuntes del mes» (22-09-2026) quita los apuntes y no
toca el plan. Los nombres se parecen lo justo para confundirse, así que cada diálogo dice qué
**no** se lleva.

Nace de que no había salida para un mes llenado mal —una importación del banco que no era— y
borrar cuarenta apuntes de uno en uno no es una alternativa. Va al pie de «El día a día», debajo
de la lista que vacía y junto al enlace que la llena; en `ViewHeader` habría quedado pegado al
`+`, que es el peor sitio para un botón de borrar.

**Vale en cualquier mes, no solo en el de hoy.** Apuntar en un mes cerrado siempre se ha podido
—un mes cerrado congela el plan, no el día a día—, así que corregirlo también. Y **el mes en
curso no se puede «poner a cero»** por el otro camino, porque no tiene copia que borrar: es el
espejo de la plantilla.

Pide confirmación con diálogo, como el cierre, y por el mismo motivo: el doble toque de
`useConfirmAction` vale para deshacer algo que sigue a la vista, y aquí desaparece la lista
entera. El diálogo dice **cuántos son y cuánto suman**, que es lo único que deja darse cuenta a
tiempo de que el mes abierto no era el que uno creía. No hay vuelta atrás y lo dice.

Por debajo es `deleteExpenses(ids)`, una sola escritura con `in` y no una por fila: cuarenta
borrados sueltos pueden quedarse a medias y dejar el mes en un estado que nadie pidió.

### Las dos tablas de la copia

`month_plans` y `month_plan_lines` son las únicas tablas de contenido con policy de solo
`select`: no hay insert, update ni delete para nadie, ni siquiera para el dueño. **Lo que hace
que un mes cerrado se pueda dar por bueno es que la app no pueda reescribirlo.** Quien escribe
es `close_month_copy`.

**Son dos tablas y no una** porque hace falta distinguir «este mes se cerró y no había nada
puesto» de «este mes no se ha cerrado»: con solo las líneas, las dos cosas son cero filas y la
pantalla tiene que decir cosas distintas.

**La copia guarda el nombre y el emoji, no solo el importe.** Borrar la partida «Coche» en abril
no puede dejar a enero con un hueco donde decía «Coche 150 €». Por eso
`month_plan_lines.budget_id` es `on delete set null` y no `cascade`: el enlace sirve para casar
los gastos con su barra mientras la partida exista, y la línea vive sin él.

**Qué se puede tocar lo dice el dato y no un `if` de la vista**: `FijoDelMes.fixedId` lleva el id
del fijo vivo cuando la línea es el espejo y `null` cuando viene de la copia, igual que
`budgetId` en `PartidaDelMes`. Por eso una partida de un mes pasado se abre pero no ofrece
editarse, y una línea de fijo de un mes cerrado tampoco: la línea de la copia **no sabe de qué
fijo salió**.

### Los cuatro estados de un mes

`en curso` (espejo), `cerrado` (copia), `sin-plan` y `por-venir`.

**`sin-plan` no es un fallo, es la respuesta honesta**: de ese mes no se guardó el plan.

**`por-venir`**: hacia delante también se navega, y hasta que se separó, octubre se veía en
septiembre exactamente igual que septiembre, con su «quedan 2.194 €» y ni una palabra que dijera
que ese mes no ha llegado. Ahora sale **a cero mientras esté vacío** —una cifra puesta donde el
resto de los meses llevan un saldo se lee como un saldo, por mucho que la letra pequeña diga que
no lo es— y con aviso y condicional. **En un mes que no ha llegado sí se puede apuntar**: sabes
que en octubre llega el IBI y lo que quieres saber es si octubre cuadra **contándolo**; una tarea
no suma en la cuenta del mes, así que no contestaba la pregunta, y además la puerta ya estaba
abierta y solo escondida, porque el campo de fecha es un `<input type="date">` sin tope. En
cuanto tiene algo dentro, la cifra grande lo cuenta y dice **«apuntado para ese mes»** —ni
«gastado», que hablaría de un mes que no ha llegado, ni un cero con trescientos euros listados
debajo—. Lo que **sigue sin poderse** es cerrarlo: no ha pasado.

**La previsión se pide.** Un enlace en la tarjeta («ver qué quedaría con lo fijo de hoy») abre
las cifras de la plantilla, y entonces sí habla en condicional y vuelven las partidas —sin
previsión no hay plantilla resuelta contra la que medir una barra—. Se valoró cerrar la puerta
del todo, que la flecha no pasara del mes en curso, y se descartó: mirar si el mes que viene
cuadra es justamente para lo que sirve tener una plantilla. **Se cierra al cambiar de mes**: se
abre para una pregunta concreta, y dejarla abierta haría que noviembre saliera con cifras que
nadie pidió. En el código es un parámetro de `plantillaDelMes` (`conPrevision`, apagado por
defecto), no un quinto origen.

**Un mes cerrado y vacío no cuenta como un mes.** La serie ya tiraba los meses sin plan, pero
miraba cómo está **guardado** el mes y no lo que **dice**: un mes sin cabecera y un mes con
cabecera y sin una sola línea afirman lo mismo —de ese mes no se sabe nada—, y el segundo se
colaba con `entra = 0` y `sale = 0`, poniendo una barra a cero (la mentira que la regla existía
para evitar) y **un mes más en el divisor de la media** de `cuentasDelAño`. Se pide que esté
vacío **y que no tenga apuntes**, y lo segundo no sobra: un mes que se cerró sin plantilla pero
en el que se apuntaron 200 € sí tiene algo que contar, y saltárselo escondería dinero de verdad.
Solo se aplica a los cerrados: el mes en curso vacío se queda, porque ahí no es que no se sepa,
es que todavía no ha pasado nada. Lo que **no** cambia es lo que dice la tarjeta al navegar a ese
mes, que sigue distinguiendo «no se guardó ningún fijo ni ninguna partida» de «no se guardó el
plan»; lo que se iguala es cuánto cuentan, que es nada.

### Los fijos

- **Son un dato, no una plantilla que genere apuntes.** La plantilla —dos nóminas, alquiler,
  luz, suscripciones— se guarda como filas que **valen todos los meses**. Se valoraron las otras
  dos formas y se descartaron: que cada fijo apareciera como pendiente y hubiera que marcarlo
  pagado, y que el día 1 se crearan solos los apuntes del mes. Las dos son más fieles a la
  realidad —la luz varía— y las dos piden abrir el mes y tachar seis cosas cada treinta días.
- **Sin vigencias, y ya no hace falta que las tengan.** Lo que hay es la foto del mes al
  cerrarse. Lo único que se pierde es el tramo dentro de un mes —subir el alquiler el día 15
  cuenta como si valiera para todo el mes—, y eso sí es una contrapartida asumida: una casa no
  lleva el alquiler prorrateado por días.
- **Viven en Finanzas, no en Ajustes.** Se tocan dos veces al año, así que parecían
  configuración; no lo son. Ajustes guarda **cómo se comporta la app**, y una nómina de 1.650 €
  es un **dato de la familia**, más parecido a un hijo o a una lista que a "activar push". Y la
  cuenta del mes necesita leerlos al lado del día a día.
- **Un fijo no cuelga de una partida.** Un fijo es exacto y una partida es para lo que varía.
  Colgar el alquiler de una partida la llenaría sola, sin que nadie haya apuntado nada, y la
  barra dejaría de medir lo único que sabe medir. Por eso `fixed_entries` no tiene `budget_id`.
- **Sin ningún fijo, la tarjeta del mes enseña otra cosa**: "Queda" sería el gasto del mes en
  negativo, que no significa nada y asusta a quien acaba de entrar. El número grande vuelve a ser
  lo gastado y debajo se ofrece ponerlos, que es además la única pista de que la cuenta existe.
- **Los dos totales de fijos se abren** y enseñan sus líneas, porque el desglose contesta
  «¿cuánto?» y dejaba detrás «¿de qué?»; un mes cerrado enseña los recibos que tuvo, con el
  alquiler de entonces, que es lo que «Fijos» no puede dar porque enseña la plantilla de hoy. **Y
  dentro se edita**, porque el desglose es **donde se descubre** que el alquiler está mal. Los
  apuntados **no se abren**: sus líneas son «El día a día», que está entero un poco más abajo en
  la misma pantalla.

### Los apuntes y las partidas

- **Un apunte es un gasto o un ingreso, y el importe es siempre positivo.** Lo que los separa es
  la columna `kind`, no el signo: un ingreso guardado como gasto negativo haría que cada suma
  dependiera del signo de cada fila. En pantalla el ingreso lleva un `+` delante **y** el verde de
  la marca, porque un ingreso y un gasto de 120 € serían la misma fila para quien no distingue el
  verde.
- **Un ingreso no puede colgar de una partida, y lo impide la base** (`check`
  `expenses_ingreso_sin_tope`): si un ingreso descontara de una partida, una devolución de 40 €
  "liberaría" 40 € de la compra sin que nadie haya dejado de comprar. El formulario ni pregunta
  —el campo desaparece al elegir «Un ingreso»— y las dos implementaciones del repo fuerzan el
  `null` en vez de confiar en el formulario.
- **El reparto de quién pagó es solo de gastos.** Con los ingresos dentro diría "Carlos 1.710 €"
  mezclando la nómina con la compra. Lo que entra se lee en «Fijos».
- **Se ve el reparto, nunca un saldo.** La pantalla dice "Omar 60 €, Sofía 20 €" y ahí se para.
  Nada de "Sofía te debe 40 €": en cuanto una app de casa lleva la cuenta de quién debe a quién
  deja de ser una app de casa y pasa a ser un árbitro.
- **Una partida no tiene color, tiene emoji.** El color dice **de quién** es algo, y una partida
  no es de nadie: dárselo la haría indistinguible de una persona en la misma pantalla donde sí
  hay personas.
- **Borrar una partida no borra sus apuntes.** Se quedan, con `budget_id` a null, bajo «Sin
  partida». Perder el histórico de agosto por reorganizar las categorías en septiembre sería el
  peor modo posible de fallar, y "sin partida" es además un estado legítimo: la mitad de los
  gastos de una casa no caen en ninguna categoría, y obligar a elegir una hace que se apunten mal
  o que no se apunten. Por eso es también **el valor por defecto de un apunte nuevo**.
- **"Te has pasado" se dice con palabras.** La barra se pone roja, pero lo que lleva el mensaje
  es el texto: "te has pasado por 40 €". La barra además se recorta al 100 %: pasarse un 300 % no
  dibuja una barra que se sale de la tarjeta.
- **Las partidas se abren** y enseñan sus líneas, con su fecha, quién lo puso y su importe;
  tocar una línea abre ese apunte. Las líneas salen de `resumenPartidas`, en el mismo recorrido
  que suma `gastado`, y no se filtran en la pantalla: si la fila dice «412 de 350», las de debajo
  suman 412 y no hay dos maneras de contarlo. Tocar la fila **no edita** la partida —eso es un
  enlace dentro del desplegable—, porque una fila que se despliega y además hace otra cosa al
  tocarla no se puede aprender.
- **Salen plegadas, con su número en el título**, y debajo está el día a día. Con cinco partidas
  las barras se comían media pantalla de móvil entre la cuenta del mes y lo último, que es a lo
  que se entra: apuntar y mirar lo apuntado. Se plegó esto en vez de subir el día a día por
  encima, que habría dejado las partidas al fondo detrás de setenta filas. Abierto se queda **al
  cambiar de mes** —quien las abre suele estar comparando, «¿en junio también nos pasamos con la
  compra?»— y vuelve a plegarse al salir de la pantalla, que es como se quieren al entrar; mismo
  criterio que `SeccionPlegable` en el calendario.
- **«Nueva partida» abre el sheet ahí mismo**, y no lleva a «Fijos». El enlace saltaba a la
  pestaña de la plantilla por una razón de vocabulario —una partida es de la plantilla y no de un
  mes, y crearla desde enero haría creer que se está creando en enero—, y la razón sigue siendo
  verdad pero ya no hace falta defenderla mandando a nadie a otra pantalla: de eso se encarga
  `planVivo`, que es lo que impide que ese botón exista en enero. La partida sigue naciendo en la
  plantilla, así que se ve en el mes en curso al momento —es su espejo— y también el mes que
  viene; una partida que existiera **solo** en un mes sería otro concepto y otra columna.
- **No hay nota de los gastos sin partida.** «Hay 3 gastos sin partida: no cuentan para ninguna»
  contaba una consecuencia del sistema en vez de algo que pase en la casa, y estaba todo el rato
  aunque no hubiera nada que hacer con ella. Lo que decía sigue donde importa: en «en qué se va»,
  «Sin partida» sale como un trozo más, con su importe y su porcentaje. Con la nota se fue
  `gastosSinPartida`, que se quedaba sin ningún consumidor.
- **Lo que ya se apuntó se ofrece, pero no se adivina.** Las sugerencias de «Lo de siempre»
  salen del historial con dos límites: **solo lo que se repite** (dos veces o más), porque
  sugerir algo escrito una sola vez es el historial y no una sugerencia; y **traen su partida**,
  la de la última vez, porque quien apunta «Gasolina» la carga siempre al coche. La partida solo
  la trae quien elige una sugerencia, que es alguien diciendo «esto otra vez».

### Buscar, y los presupuestos que te pasan de fuera

**Buscar en Finanzas es buscar en todos los meses.** Lo que lleva a buscar aquí no es una
pregunta de septiembre: es «¿cuánto llevamos en el dentista?», «¿cuándo pagamos la ITV?». Un
buscador que solo mirase el mes abierto obligaría a repetirlo mes a mes. **Mientras se busca, la
cuenta del mes y las partidas no están**: las dos hablan de un mes concreto y lo que hay debajo
ya no es de ninguno. Y **la respuesta empieza por la cifra**: «7 apuntes con «farmacia». Se han
ido 134,20 €».

Los **presupuestos pedidos** se agrupan por para qué son: `title` es el trabajo ("Cambiar la
caldera") y `provider` quién lo da ("Fontanería López"), así que los tres de la caldera salen
juntos, ordenados de más barato a más caro. Se descartó una tabla de trabajos y otra de
proveedores —dos tablas más para que una casa apunte tres presupuestos al año—; el formulario
ofrece los títulos ya usados, y aun así la agrupación no depende de escribirlo clavado, porque
compara sin tildes, sin mayúsculas y sin espacios de más.

- **El más barato se marca solo mientras el trabajo sigue abierto.** Marcarlo en uno ya decidido
  sería un reproche —"el que aceptaste no era el barato"— y esa decisión ya está tomada, a veces
  por razones que la app no sabe. Un descartado tampoco puede serlo, y con uno solo no se marca
  nada porque no hay comparación.
- **Un precio caducado se dice, no se esconde ni se tacha.** Sigue sirviendo para comparar y
  ocultarlo dejaría un hueco sin explicar. Sale de comparar `valid_until` con hoy, igual que en
  los documentos.
- **Aceptar un presupuesto no es pagarlo.** Un aceptado ofrece **apuntarse** como gasto del mes
  en que se pague, y hasta ahí llega el puente entre las dos mitades de Finanzas. **No se crea
  nada solo**: aceptar es decir «con este me quedo», y puede pasar un mes hasta que el pintor
  cobre. El enlace abre el formulario de siempre con lo que consta —el importe y para qué era—;
  la fecha no viaja, porque un presupuesto no sabe cuándo se paga, y la partida tampoco, porque
  no es algo que un presupuesto tenga. Tampoco queda vínculo en la base: son dos cosas distintas
  y unirlas obligaría a decidir qué pasa al borrar una. Al guardar, la pantalla se va **al mes en
  el que ha caído**, con la previsión abierta si ese mes aún no ha llegado.

### «Estadísticas»

El criterio de los bloques **no fue «qué se puede dibujar» sino «qué se pregunta una casa y hoy
no contesta nadie»**. Del mes son cuatro: si vamos bien este mes, si estamos ahorrando más que
antes, en qué se va y qué ha cambiado, y cómo está montada la casa. Del **año natural** —el
periodo que la gente ya tiene en la cabeza, frente a una ventana móvil de doce meses que nadie
usa para hablar— son tres: la cabecera de lo que ha entrado, salido y quedado con su media
mensual; el mismo desglose de «en qué se va» sumando el año; y «lo que más se repite».

**El orden es de lo ancho a lo estrecho**: el año, los meses, el mes que se mira. Con los
bloques metidos donde cayeron, la pestaña alternaba escalas en cada tarjeta —año, mes, meses,
mes, año, mes, año—, que es lo que hace que un cuadro de mandos se lea como un montón de
tarjetas sueltas. Se paga un precio y consta: «Cómo va el mes», el único bloque **accionable**
—vas rápido, frena—, baja del primer sitio al quinto.

**La cabecera va primero porque la pestaña abría con un gráfico**: un dibujo contesta «¿cómo de
distinto?» y no contesta «¿cuánto?», y lo primero que se quiere de unas cuentas es el cuánto. No
es un gráfico ni debería serlo: el dibujo de tres números son tres números.

Reglas de dentro:

- **Dice sobre cuántos meses está hecha la media**: «de media quedan 2.169 € al mes» sobre
  cuatro meses y sobre doce no son la misma frase. Los meses de los que no consta nada no entran.
- **El desglose del año se agrupa por el nombre y no por la clave.** La clave de un fijo es el id
  de su línea y cada mes cerrado guardó la suya, así que agrupar por clave daría el mismo
  alquiler repetido una vez por mes.
- **La variación se casa también por nombre**, y por lo mismo: la clave de un mes en curso es el
  id de la partida y la de uno cerrado es el id de su línea del plan. Renombrar una partida
  cuesta perder una variación, y es honesto: durante ese mes, «Comida» y «Compra» no son lo mismo
  para nadie que mire la pantalla. **«Otras» nunca la lleva**, porque agrupa lo que sobra y lo
  que sobra no es lo mismo cada mes. Y **`null` no es cero**: un trozo que no existía el mes
  pasado no ha subido un 100 %, así que no se escribe nada.
- **Los gastos fijos entran en «en qué se va».** Es lo que arregla que el bloque dijera «se han
  ido 291,45 €» en un mes en el que se fueron 1.162,35: el alquiler, el mayor gasto de la casa
  con diferencia, no aparecía. Lo que se pide de un trozo aquí es que tenga nombre y que haya
  salido este mes. El tope de trozos es **7** y no 5: con los recibos dentro, cinco dejaba fuera
  media casa.
- **Las partidas que se pasan** son lo único de la pestaña que señala algo que se puede
  arreglar, y lo que se arregla está en «Fijos». Hace falta **más de la mitad de los meses y
  nunca con uno solo**: pasarse una vez de dos es un mes raro, no una costumbre. Se escribe «3 de
  los últimos 4» y no «casi siempre», para que quien lo lee juzgue por su cuenta.
- **«De cada 100 € que entran» es la única que cambia el denominador**, y en eso está su valor:
  el resto dice cuánto sale y en qué, y ninguna contesta «¿cuánto de lo que ganamos se lo lleva
  el alquiler?». Sus **cuatro segmentos se pintan con dos colores**: los tres de gasto son el
  mismo `sale` con la opacidad bajando y lo que queda es `entra`. Un mes que se fue de las manos
  **no se dibuja partido**: con lo que queda en negativo no hay proporción que repartir, así que
  la barra se llena de gasto y el exceso se dice con palabras.
- **«Cómo va el mes» solo sale en el mes en curso** y habiendo meses cerrados con los que
  compararse: en un mes que ya pasó la pregunta no tiene respuesta útil, y sin referencia una
  línea sola no dice si vas rápido. **Lleva leyenda, y es la única de la pantalla**: el resto no
  tiene porque no hay dos cosas que separar. La línea de lo habitual va en **gris punteado**
  —es una referencia, no un dato del mes, y con los dos trazos del mismo peso el ojo no sabe cuál
  mirar—, la de este mes **se corta en hoy** —seguir hasta fin de mes la dejaría plana y
  parecería que se ha dejado de gastar— y **la escala la manda el mayor de los dos al acabar el
  mes**: reescalando cada día, la línea de este mes tocaría siempre el techo.
- **«Lo que más se repite» ordena por dinero, no por veces**, y ahí está lo que lo separa de las
  sugerencias de apuntar, que son la misma materia ordenada al revés: un café de 1,20 € tomado
  ochenta veces encabeza aquella lista y casi cierra esta. Allí la pregunta es «¿qué escribo?» y
  aquí «¿dónde se va?». Solo cuenta lo que se repite dos veces o más: un gasto único no es un
  hábito, es una compra, y ya sale en el desglose.

### Los gráficos

**Nada de librerías de visualización**: SVG escritos a mano. Una librería pesa más que toda la
app y trae su propio sistema de temas, que habría que pelear con el de Tailwind. Los tokens y el
porqué del color están en `globals.css`, bloque «Gráficos de Finanzas».

**Un detalle que cuesta una tarde si no se sabe:** los `var(--color-…)` de un SVG **se escriben
enteros y nunca se arman con una plantilla**. Tailwind v4 solo emite las variables del tema que
encuentra literales en el código, así que un `` fill={`var(--color-chart-${x})`} `` las deja
fuera del CSS y el `fill` cae en negro, sin error de ninguna clase.

**El color se calcula, no se elige, y esa fue la lección.** Se iba a usar el verde y el salmón de
marca como par de series, y medidos están a **ΔE 2,3 en protanopía** y a 11,3 con visión normal,
por debajo del suelo de 15: para mucha gente serían el mismo color. El verde de marca además es
de baja saturación por diseño, así que suspende el suelo de croma en cualquier pareja.

- **La serie de meses** es entra y sale, dos barras por mes, y **lo que quedó va como línea con
  un punto por mes** encima de las barras, con la cifra escrita. Lo que aporta la línea es la
  **forma**: tres meses cuesta abajo se ven de un vistazo, leyendo cuatro cifras no. Va **en
  tinta y no en un tercer color de gráfico, y eso se midió**: `chart-entra` (#5C7A59) y
  `chart-sale` (#B26A3C) están a **ΔE 3,8 en protanopía y 13,6 con visión normal**, por debajo
  del suelo de 15 —por eso los tokens los declaran **divergentes**, donde el trabajo lo hace la
  posición respecto al cero—, y meter un tercer tono entre esos dos sería añadir otra confusión.
  La tinta separa de las dos por encima de ΔE 28 y además **no es el mismo tipo de marca**: una
  línea con puntos entre rectángulos rellenos se distingue sin mirar el color. Cada punto lleva
  un aro del color de la tarjeta para no leerse como una muesca de la barra de debajo.
- Si algún mes se fue en rojo, el dibujo abre **sótano** por debajo del cero y aparece la línea
  del cero; sin ningún mes negativo eso vale cero y no se pinta una raya que no diría nada.
- **La serie va siempre hasta hoy**, mires el mes que mires: la tendencia es de la casa y no del
  mes. Cortándola en el mes seleccionado, mirando junio quedaba una sola barra.
- **Un mes sin plan se cae de la serie, no sale a cero.** Una barra a cero dice «ese mes no
  gastasteis nada», que es distinto de «de ese mes no sabemos».
- **«En qué se va» es un anillo, y el color va ordenado, no repartido.** Dar un color a cada
  partida rompería la regla central —el color dice de quién es algo, y una partida no es de
  nadie—, así que los trozos vienen de mayor a menor y el anillo los pinta con el mismo tono cada
  vez más claro: la posición en la lista y el tono son el mismo dato dicho dos veces. Eso respeta
  además la paleta —dos colores de gráfico y no seis— porque **la claridad se distingue en
  protanopía y el tono no**. **Y no hay leyenda**: la lista de debajo lleva su cuadradito al lado
  del nombre y **es** la leyenda, con el importe y el porcentaje puestos. Estuvo un tiempo como
  barras ordenadas, por dos pegas que hoy están resueltas de otra manera: dos partidas parecidas
  eran dos arcos parecidos (lo arregla el tono ordenado) y la leyenda iba aparte, obligando a ir y
  venir entre el color y el nombre (lo arregla la lista). La identidad de cada trozo la llevan el
  emoji y el nombre.
- **Debajo de las barras están los números, en una tabla plegada.** El dibujo acompaña, nunca
  lleva el mensaje solo; y además un importe no cabe bajo la columna de un mes sin partirse en
  dos líneas.
- **Lo que no se ha arreglado, y consta:** las dos barras de la serie siguen siendo verde y
  naranja, una al lado de otra, distinguidas solo por el tono, y siguen fallando el suelo de
  contraste. La salida limpia es cambiar uno de los dos colores, y el único candidato de la
  familia que pasa la separación CVD es un azul (ΔE 12,8 en protanopía) — verde contra cualquier
  naranja o rojo no pasa nunca. Cambiar el verde de «entra» es tocar el color de marca, así que
  no se hace sin decidirlo aparte.

### Navegar los meses, y los botones del cierre

**El mes se elige con las flechas y con el nombre**, como en el calendario y por lo mismo: una
flecha contesta «uno más» y deja sin contestar «¿cuál?». Se copian dos cosas de
`CalendarHeader`: **las flechas no se mueven** —el grupo ocupa el ancho libre y el nombre se
estira dentro, porque «Septiembre 2026» y «Junio 2026» no miden igual— y **el menú se cierra con
`pointerdown` y no con `click`**, porque esperando al clic, tocar una flecha con el menú abierto
la activaría con el menú todavía encima.

Qué meses ofrece **la lista** lo decide `mesesNavegables`: por detrás, hasta el mes más viejo
con algo y nunca más allá; por delante, **tres fijos** —el horizonte real de «lo que sé que me va
a llegar»— y los que hagan falta si alguien apuntó más lejos. La regla que sostiene las dos
mitades es una: **un mes que tiene algo siempre está en la lista**. **Las flechas no miran esa
lista**, y ahí está el reparto: ellas siguen siendo «el de al lado» y llegan a donde haga falta.
El mes de hoy va marcado con un «hoy» escrito —no con un color—, y eso es lo que hace innecesario
un «volver a este mes», que se quitó porque puesto sobre «Junio 2026» parece que va a hacerle
algo a junio.

**Los tres botones del cierre van al pie de «Este mes»** y son `Button variant="secondary"`:
**Cerrar mes**, **Reabrir mes** y **Poner el mes a cero**. Al pie porque cerrar es lo que se hace
**cuando has terminado de mirar el mes**, no de camino a mirarlo; debajo de la tarjeta se cruzaba
en el camino cada vez que se entraba. No son `fullWidth`: una barra a todo lo ancho devolvería a
la tarjeta el panel de mandos que se le quitó. Con el cierre al pie, la tarjeta **dejó de ser una
`dl`**: desde que la fila entera es el botón que abre, un `button` no cabe entre un `dt` y un `dd`
sin romper el modelo de contenido de una lista de definiciones, y la alternativa —hacer botón solo
la etiqueta— dejaba media fila muerta para el dedo.

**«Cerrar mes» va en ámbar y no en rojo**, con el token `sand` que `globals.css` ya reservaba
para «avisos suaves» y que entró en `Button` como variante `warn`: cerrar el mes **no destruye
nada** y se deshace mientras siga siendo el mes en curso. El rojo se queda para «Poner el mes a
cero», que sí borra; si lo llevaran los dos, el que de verdad hay que pensarse dos veces dejaría
de distinguirse.

**Los dos destructivos piden confirmación en un diálogo** y no con el doble toque de
`useConfirmAction`, que es el patrón del resto de la app. Es la excepción y tiene motivo: **el
doble toque vale para lo que se ve**. Aquí lo que cambia es el mes entero, fuera de la vista, y
un renglón que se pone en rojo un segundo no es sitio para contar que se van a congelar los fijos
de hoy. Con el diálogo **se fue la letra pequeña** que lo contaba a 10 px todo el rato a alguien
que casi nunca va a pulsar ese botón.

**Farpi no se conecta a ningún banco** y no lo va a hacer: nada de números de cuenta, de
tarjeta ni credenciales. Lo que sí se puede es **traer el extracto que descargas tú**, que es
otra cosa y se cuenta justo aquí debajo.

### El extracto del banco

Desde el 21-09-2026 se puede soltar en Finanzas el fichero de la **Norma 43** que dan todos los
bancos españoles, y convertir en apuntes lo que uno elija de él. Vive en `/finances/importar`,
se entra desde el pie de «El día a día» y son dos piezas de `src/lib`: `n43.ts` lee el fichero
e `importacion.ts` decide qué se propone apuntar.

**El problema no es leer el fichero, es qué dejar entrar.** La cuenta del mes es
`(ingresos fijos − gastos fijos) + ingresos apuntados − gastos apuntados`, y un extracto trae
las dos mitades revueltas: la nómina y el alquiler, que **ya** están en la plantilla, y la
compra del martes, que no. Importarlo entero cuenta dos veces lo que ya estaba y deja «queda» a
miles de euros de la verdad. Por eso **no entra nada sin que alguien lo confirme**, y las tres
razones para llegar sin marcar son las tres formas de contar dos veces el mismo dinero:

| No entra porque… | Cómo se sabe |
|---|---|
| **ya está apuntado** | su huella ya está en la base, o hay un apunte de ese día por ese importe |
| **lo cubre un fijo** | es un concepto que se domicilia (03, 04, 05, 15 de la AEB) y encaja con un fijo del mes, con un 10 % de margen o cinco euros |
| **es un traspaso** | tiene su espejo del mismo importe en **otra cuenta del mismo fichero**, con tres días de tolerancia |

Las tres **se ven igual, con el motivo escrito**: repasar que la luz de este mes fueron 34,12 €
es la mitad de para qué se abre esa pantalla. Lo que no hacen es entrar solas. Y el margen del
fijo no se aplica a cualquier cosa, solo a los conceptos que se domicilian: sin esa lista, una
compra de 120 € en el súper se confundiría con la limpieza de 120 €.

**El fichero se cuadra consigo mismo antes de enseñar nada.** El registro final de cada cuenta
dice cuántos apuntes hay de cada signo, cuánto suman y el saldo final; se comprueban los cuatro
y lo que no cuadre sale escrito arriba. En un lector de campos en posiciones fijas eso no es
lujo: un campo leído una posición más allá no da error, da cifras creíbles y equivocadas.

**Qué se guarda de todo esto: `expenses.import_ref`**, una huella por movimiento, con una
restricción `unique (family_id, import_ref)` detrás. Es lo que hace que importar dos rangos de
fechas solapados —«del 1 al 30» y luego «del 25 al 25»— no apunte los días de en medio dos
veces, y se decide en la base porque lo que revisa una persona a las once de la noche no es una
garantía. De la cuenta, la huella se queda **solo con los cuatro últimos dígitos**: lo demás
sería guardar un número de cuenta, que es justo lo que la línea de arriba promete que no se
hace. Y el fichero **no se sube a ningún sitio**: se lee en el propio navegador y lo único que
viaja son los apuntes confirmados.

**Por qué un fichero y no un agregador bancario** (21-09-2026). Se valoró conectar con un
agregador PSD2 —Afterbanks, que hoy es Minsait Payments, y Enable Banking— y se descartó para
esta vuelta: el primero es venta B2B con contrato y comercial de por medio, y el segundo, que sí
tiene alta de autoservicio, obliga a guardar credenciales de acceso a cuentas bancarias en el
mismo Supabase de producción y a reconectar cada 180 días. Un fichero que descarga la familia no
cuesta nada, no caduca y no guarda ninguna llave de nadie. Si algún día el cuello de botella es
bajar el archivo, el agregador se enchufa detrás de la misma pantalla de revisión, que es la
parte que vale.

## Lógica en `src/lib`

La regla que las junta a todas: **si se puede probar sin navegador, vive en `src/lib/` y no
dentro de un componente ni de una ruta**. Y si se toca, su test en `e2e/unit/` con ella.

- **Fechas** (`date-utils.ts`): para fechas familiares como comidas o "hoy", **fecha local**.
  Evitar `toISOString().split('T')[0]` para representar una fecha local. Los eventos con hora
  pueden usar datetime, pero hay que tratar con cuidado los de todo el día.
- **Validaciones** (`validators.ts`) y constantes compartidas (`constants.ts`). Sin librerías
  pesadas de validación salvo que el proyecto crezca.
- Y el resto, cada una con su significado y su archivo: `selectors.ts` (datos derivados),
  `recurrence.ts`, `assignees.ts` (a quién se asigna algo), `events.ts` (qué días ocupa un
  evento y quién no está), `meal-slots.ts`, `agenda.ts` (los tramos de la agenda),
  `timeline.ts` (dónde cae cada evento en el eje de horas y cómo se reparten los que
  coinciden), `budgets.ts`, `quotes.ts` —aparte de `budgets.ts` para que un archivo no tenga
  dentro los dos significados de «presupuesto»—, `finanzas.ts` (el dinero en céntimos y cómo se
  escribe), `birthdays.ts`, `reminders.ts`, `errores.ts` (el fallo de Postgres dicho en
  castellano), `export.ts`, `peticiones.ts`, `push.ts`, `family-config.ts` y `text.ts`.

## UI compartida

Antes de escribir un componente, mirar `src/components/ui/`. Los que resuelven algo que ya se
decidió:

- `Button`, `Card`, `Field` (etiqueta + control con el espaciado estándar), `EmptyState`,
  `SearchField`, `SectionLink`, `Suggestions`.
- `BottomSheet` — **todos** los sheets salen de aquí (patrón `form` + `footer` fijo). No crear
  overlays propios.
- `SheetFooter` — pie con error, acción principal y borrado.
- `SelectChip` y `DotOption` — opciones seleccionables. `DotOption` es para `AssigneePicker` y
  solo para ella, que es donde el círculo de color sí es la identidad de alguien.
- `EmojiPicker` y `ColorPicker` — las dos rejillas de «con qué se reconoce esto». **El
  vocabulario no vive en el componente**: cada pantalla trae su juego de emoji y lo razona en su
  archivo, porque una lista se nombra con el súper y una nota con lo que se consulta (📶, 🔐).
  Lo que se comparte es el control, que estaba copiado en los cuatro sheets.
- `CircleCheck` y `CirclePlus` — el círculo de marcar y su hermano de sumar, con las mismas
  medidas y área de toque.
- `DeleteButton` — el borrado de la app, por doble toque.
- `src/components/layout/SaveStatus.tsx` — el único sitio que cuenta qué pasa con los datos: si
  algo se está guardando, si ha fallado y si lo último se puede deshacer. Vive en el armazón,
  así que cubre todas las pantallas.

Hooks compartidos en `src/hooks/`: `useSheetForm`, `useSheetDelete` y `useSheetDeleteDialog`
(los tres en `useSheetForm.ts`), `useConfirmAction`, `useIsClient`, `useMediaQuery` y `useSwipe`.

Un sheet con formulario se monta así: `useSheetForm` para el estado, `Field` para cada campo,
`SheetFooter` para el pie y `useSheetDelete` cuando hay borrado. Las vistas remontan los sheets
con `key` al abrirlos, por eso el draft inicial se evalúa una sola vez. El `BottomSheet` ya
resuelve el móvil pequeño y da modal centrado en escritorio: `max-h-[92dvh]`, scroll interno con
`flex-1 overflow-y-auto min-h-0` y botón principal en el `footer` fijo, visible aunque el teclado
esté abierto.

### Reglas que no se negocian

**Un sheet no va dentro de un contenedor con `space-y-*`**: va fuera, como hermano suyo, con la
pantalla envuelta en un fragmento. Un `BottomSheet` cerrado es `fixed bottom-0` con
`translate-y-full`, y el margen que `space-y` mete entre hermanos entra en la cuenta del `bottom`
de una caja fija: corre el ancla hacia arriba, el desplazamiento —el 100 % de su propia altura—
ya no basta y el sheet asoma tapando las etiquetas de `BottomNav`. Cuadra exactamente: panel de
651 px en un viewport de 839, `839 − 651 − 24 = 164`, `164 + 651 = 815`. Lo vigila
`e2e/movil.spec.ts`, que en cada ruta comprueba que ningún `[role="dialog"][inert]` invade el
viewport. No lo veía nada de lo que ya había: ni desborda a lo ancho ni es un control pequeño,
simplemente está encima.

**El color de marca no es color de texto.** `primary` (#8BA888) da 2,61:1 sobre blanco, y
`faint`/`muted-soft` menos todavía: los tres son para fondos, decoración y lo que está apagado a
propósito. Todo lo que hay que leer o pulsar va en su versión `-strong` (`primary-strong` da
4,81:1, `danger-strong`, `accent-strong`, `sand-strong`) o en `muted`/`ink`.

**El rojo de borrar es `danger-strong` (#B24D4D), no `danger` (#D96C6C).** Todo lo que hay en
`DeleteButton` es texto pequeño —12 y 14 px, que no entra en la excepción de «texto grande» de
WCAG, que empieza en 18,66 px en negrita— y `danger` sobre blanco da **3,33:1**, por debajo del
4,5:1 de AA; sobre el fondo del hover, 2,83:1. Falla justo donde más importa: en el «Borrar»
blanco sobre rojo relleno, que es el rótulo que hay que leer **antes** de tocar.
`danger-strong` da 5,17:1 en las dos direcciones. La paleta no crece: ya existía. `danger` se
queda para lo que **no** es texto, donde 3,33:1 cumple el 3:1 de la 1.4.11 — bordes
(`danger-line`), fondos suaves (`danger-soft`, `danger-tint`), la barra de una partida pasada y
el punto y la línea del `Timeline`.

**Un botón primario se hace con `Button`.** Once estaban escritos a mano con
`bg-primary text-white` y por eso se quedaron atrás cuando la paleta cambió.

**El botón de alta va arriba, en `ViewHeader`**, nunca flotando sobre el contenido, y es el mismo
círculo de 44 px en todas partes. Cuando una pantalla no pueda usar `ViewHeader` —la cabecera de
Comidas en escritorio, que lleva además el paso de semana—, que use su botón: el suyo había
derivado a una pastilla verde con la palabra al lado, el único botón de alta de la app con texto.

**Un botón de guardar no se deshabilita porque falte un campo**: se deja pulsable y que hable el
`required` del campo o `formError`. Apagado sin explicación no dice qué falta, y el mensaje del
validador no llega a verse nunca. `disabled` es para «hay algo en curso».

**Si una acción la limita la RLS o una RPC, la interfaz no la ofrece a quien no puede.** Ajustes
lo hace con `currentMember.role`, y dice por qué en una línea en vez de dejar un hueco. En duda
se enseña: solo se cierra cuando consta que no.

**Lo que hace una fila se decide por lo que se hace en ella**, no por lo que cabe. La de una
lista llevaba cuatro botones de 28 px pegados en el borde por donde pasa el pulgar —`−`, `+`,
mover y borrar— para algo que el 95 % de las veces es marcar. Mover y borrar viven en el sheet,
que se abre tocando el nombre y donde caben con su nombre escrito.

**El orden de los campos de un sheet lo manda lo que más se contesta**, no el orden en que se
pensaron. En una nota, «Fijar» va por delante del icono: fijar decide **dónde se lee** la nota y
el icono solo la nombra, y al fondo —detrás de un textarea de seis filas, del aviso de las
contraseñas y de tres filas de emoji— un chip de un toque quedaba fuera de la pantalla a 390 px.
En una tarea, la fecha va segunda y las notas últimas: «¿cuándo?» es lo segundo que se contesta y
estaba al final, detrás de dos rejillas de chips, ocupando el sitio unas notas que casi nunca se
escriben. Lo que cuesta el cambio, y se acepta: la etiqueta pasa a «Empieza el» cuando la tarea
se repite, y eso queda dos campos por encima de donde se toca la repetición.

**El borrado normal es el doble toque de `DeleteButton`**, también en una fila: la papelera de un
ítem de la lista y la de una tarea eran las dos únicas puertas por las que se perdía algo de
golpe, sin confirmación y sin deshacer, y están en los peores sitios posibles —pegada al `+` de
las unidades, que es el botón que se pulsa a una mano en el súper, y en el borde derecho de la
tarjeta, donde aterriza el pulgar—. En la variante `inline` **crece** al pedir confirmación hasta
llevar la palabra «Borrar» dentro, en rojo relleno: que cambie de forma es lo que avisa, porque
un icono que solo se pone rojo sin moverse se confunde con el estado normal de una papelera. Y
**se desarma sola** a los `MS_CONFIRMAR_BORRADO` (4 s), para lo que `useConfirmAction` acepta un
`resetMs` que los sheets no pasan: en un sheet no hace falta —al cerrarlo se lleva el estado—,
pero una papelera armada para siempre borraría con el toque de dentro de un rato.

**Cuatro borrados se salen de ahí y preguntan en el sheet**: eliminar una lista, una partida, una
persona y una familia. El criterio es el mismo —*el doble toque vale para lo que se ve*—: estos
cuatro no tocan lo que hay en pantalla, tocan lo que hay detrás, y cada uno de una forma distinta
que **solo se puede decir con palabras**.

- Una **lista** se lleva sus ítems (`list_items` cuelga con `on delete cascade`), y desde el
  sheet no se ve ni uno. Es el único de los cuatro que destruye algo, y por eso el único que
  cuenta cuántos: aquí el número es la consecuencia, no adorno.
- Una **partida** no borra nada: suelta sus gastos, que se quedan en «Sin partida», y los meses
  cerrados siguen enseñándola tal cual.
- Una **persona** suelta su `child_id` o su `member_id` en seis tablas; lo que llevaba se queda
  sin dueño, y si es un miembro con documentos, los papeles de **su** Drive dejan de abrirse.
- Una **familia** sí se lo lleva todo, en cascada, y es lo único de Ajustes sin vuelta atrás.

**Es el mismo sheet y no uno encima.** Dos `BottomSheet` a la vez no se sostienen: el overlay del
segundo va a `z-50` y el panel del primero a `z-[60]`, así que el de debajo se quedaría a la
vista y pulsable alrededor de la pregunta, con dos `aria-modal` abiertos y, en escritorio, dos
modales centrados en el mismo punto. El sheet **se convierte** en la pregunta: cambia el título,
el formulario deja el sitio a lo que se va a perder y el pie pasa a «Sí, eliminar…» y «Cancelar»,
que —como la X, Escape y el overlay— devuelve el formulario con lo escrito donde estaba. Las
piezas son `ConfirmDeleteBody` / `ConfirmDeleteFooter` y `useSheetDeleteDialog`. Con la pregunta
se fue la letra pequeña que contaba todo el rato, a 10 y 11 px, algo que solo importa al pulsar;
el único aviso que se queda en el formulario es el de «esta es tu única familia, no se puede
eliminar», que explica por qué **no hay** botón, y sin botón no hay pregunta donde contarlo. Lo
que no se hizo: llevarlos a un diálogo genérico de «¿Seguro?», que se pulsa igual de rápido y
solo añade un toque — lo que justifica sacarlos del doble toque es que **hay algo que contar**.

**Los gráficos se dibujan a mano, con SVG en línea**, y el color se calcula, no se elige. El
detalle, en «Finanzas».

## Móvil y escritorio

La app se diseña para el teléfono y crece hacia el escritorio en **`lg` (1024 px)**, nunca al
revés. El corte está solo ahí, y **lo que hay por debajo no se toca al añadir escritorio**. Si un
cambio de escritorio necesita tocar un valor que ya se usa en móvil, se mueve a una clase con el
mismo valor base y se le añade la variante `lg:`. Tres límites que `e2e/movil.spec.ts` comprueba:
nada desborda a lo ancho a **390 px**, ningún control baja de **24×24 px** (mínimo WCAG 2.5.8) y
ninguno baja de **44×44** (Apple y Material). La única excepción es la que recoge la propia
2.5.8: un enlace `display: inline` dentro de una frase, que en Farpi es uno, el correo de la
carta de la portada. `e2e/escritorio.spec.ts` vigila desde los dos lados: a 1440 px y a **1023
px**, un píxel por debajo del corte, donde todo tiene que seguir igual.

### La navegación

Es lo único que cambia de sitio: `BottomNav` desaparece con `lg:hidden` y `SideNav`
(`hidden lg:flex`, 224 px a la izquierda) toma su lugar. **No enseñan lo mismo**: la columna
lleva las **seis** secciones (`SECCIONES`) y la barra de abajo cinco más "Más"
(`SECCIONES_MOVIL`, que se deriva de la anterior quitando Documentos). Ajustes no es una sección
en ninguna de las dos: en escritorio se entra por el pie de `SideNav` (`AccountFooter`) y en
móvil por "Más" (`MoreMenu`); a 390 px no caben siete etiquetas.

`AppShell` monta `SideNav` **después** de `TopBar` —con el mismo `z-50`, lo último se pinta
encima y la columna tiene que tapar la esquina de la cabecera— y **antes** de `main`, para que el
velo de un sheet la cubra al abrirse.

Un detalle que se paga en cualquier `sticky` de la app: **quien hace scroll es el `<main>` de
`AppShell`** (`overflow-y-auto pt-14`), no la ventana. El desplazamiento se mide contra ese
contenedor, que ya empieza por debajo de `TopBar`, así que el `top` va en el orden del padding de
la vista (24 px) y no en el alto de la cabecera.

### Cómo aprovecha el ancho cada vista

- `CalendarView`: dos columnas desde `lg`.
- `MealsView`: rejilla semanal de siete días desde `lg` (`WeekGrid`), con la lista vertical
  (`WeekList`) por debajo. Cambiaba en `md` y era la única pantalla que se adelantaba al corte.
- `TasksView`: las pendientes en dos columnas desde `lg`, y las completadas igual al desplegarse.
- `ListsView`: el índice en rejilla (dos desde `lg`, tres desde `xl`) y la lista abierta hasta
  `lg:max-w-3xl`, porque una lista de la compra sigue siendo una columna.
- `DocsView`: rejilla de tarjetas (dos y tres) y los filtros sin arrastre.
- `SettingsView`: las secciones se ponen de pie. Desde `lg` son una columna de 13 rem a la
  izquierda —con icono, y pegada con `lg:sticky`— y el contenido ocupa el resto hasta
  `lg:max-w-5xl`. Esa columna es el `role="tablist"`, y **hay uno solo**: duplicarlo repetiría los
  `id` de cada pestaña y dejaría los `aria-controls` apuntando a dos sitios.
- Home sigue siendo la columna de móvil centrada.

El truco que se repite: la rejilla se pone en el contenedor que ya existía y la cabecera de la
sección ocupa la fila con `lg:col-span-2`. Así no hace falta envolver la lista en un div nuevo y
por debajo de `lg` el DOM es idéntico. Lo que sí hay que apagar es el `space-y-*` de móvil con
`lg:space-y-0`: los márgenes entre hermanos y el `gap` de la rejilla se suman y descuadran las
filas.

**Una trampa que ya costó una vez**: un `style` en línea gana a cualquier clase, así que no se
puede sobreescribir por ancho de pantalla. Las columnas de `WeekGrid` estaban ahí y hubo que
moverlas a clases —con el valor base idéntico— para poder apretarlas en `lg`, donde `SideNav` se
lleva 224 px. Hoy son **un solo juego de valores** (112 + 7×84 = 700) y sin variante: la rejilla
solo se pinta desde `lg`, y allí `SideNav` está siempre.

### `ViewHeader`: las pantallas de lista abren igual

Bajo el título de `TopBar`, una fila con el resumen de lo que hay, el buscador y el `+` de alta.
Lo tenían escrito por separado y ya había divergido: Tareas ponía el `+` flotando abajo a la
derecha, Listas y Comidas lo ponían arriba con el buscador debajo, y Documentos lo subía a la
fila solo en escritorio. Eran cuatro sitios distintos donde buscar lo mismo según en qué pantalla
estuvieras.

En **móvil, cuando hay buscador el resumen se calla**: a 390 px no caben las tres cosas, y el
propio buscador ya dice cuántas hay ("Buscar en 19 ítems…"). En escritorio caben, así que el
resumen manda a la izquierda y el buscador se queda con tope de ancho (`lg:max-w-sm`), que
estirado a todo el contenedor era lo que hacía que la pantalla pareciese el móvil ensanchado.
Comidas no tiene buscador —el menú de la semana cabe entero— y enseña siempre el resumen.

## Decisiones de producto

Estas decisiones se tomaron con motivo y costaron varias vueltas cada una. Vistas desde fuera
parecen incoherencias que hay que arreglar, y no lo son: si algo de aquí va a cambiar, que sea a
propósito.

### Reglas que cruzan toda la app

**El color puede decir "de quién", pero nunca "qué" ni "si".** Lo que significa una marca va en
su forma y su sitio, que se leen igual en blanco y negro; el color añade el matiz. Con
daltonismo rojo-verde —en torno al 8 % de los hombres— varios colores de la paleta se juntan:
Coral claro con Melocotón son indistinguibles, y Cuero con Granate y con Vino, casi. Si el color
fuera la única vía, esas familias perderían información; siendo el matiz, solo pierden el matiz.

**Buscando se enseña todo**, incluido el catálogo de una lista, las tareas ya completadas y el
pasado del calendario. Con una excepción, la carpeta puesta en Documentos, que sí acota: el porqué
está en «Documentos». Esconder algo que sí coincide sería contestar "no hay nada" a una búsqueda
que encontró algo. Y **buscando no se ofrece plegar**, que importa tanto como lo primero: sin
ello el pliegue vuelve a esconder lo que la búsqueda acaba de encontrar. En el calendario eso
significa que buscar cambia lo que se lee —el detalle del día y los próximos días dejan paso a
los resultados, porque una búsqueda atraviesa el calendario entero y no cabe en un día—; el mes se
queda donde está, que es navegación, y al vaciar el campo vuelves justo al día en el que estabas.

**Un vacío dice cuál de los tres vacíos es.** «No hay nada que hacer» y «aquí no ha habido nunca
nada» no son el mismo mensaje: con cero tareas, una familia que estrenaba la app se encontraba un
«✅ Todo al día» felicitándola por lo que no había hecho. Son tres estados —sin coincidencias, sin
tareas todavía, todo al día— y el de estreno pone ejemplos.

**Pero un hueco vacío no explica la pantalla.** Los `EmptyState` habían acabado siendo el manual
de la app: doce párrafos explicando para qué sirve cada pantalla, que se leen una vez, en el
estreno, y estorban el resto de la vida de la app — que es casi toda, porque una casa en marcha ve
esos huecos cuando acaba de vaciar una lista, no cuando la estrena. Queda **el emoji y el
título**; la `description` sobrevive con un único uso, decir qué se ha buscado («Ninguna tarea
pendiente con «pan»»), que no explica, informa. Donde el motivo del vacío **sí** era información
se subió al título. Una excepción, de forma: el vacío de la agenda de 45 días conserva su llamada
(«Apuntar algo») como `action` y no como descripción, porque esa tarjeta entera es un botón y sin
nada escrito dentro se lee como un agujero.

**Lo que hay que leer no se apaga con color** (ver «UI compartida»).

### Listas

**Una lista de casa no es una lista de tareas.** "Leche" no se completa: se acaba, se compra y se
vuelve a acabar. Por eso las listas marcan **lo que falta**, no lo que se ha hecho. Arriba lo
pendiente, bajo «Hace falta ahora» con la cuenta al lado; debajo «Lo de siempre», que es el
catálogo de lo que compráis siempre y del que se tira con un toque. Nada de barras de progreso ni
de "2/5" — a nadie le importa haber comprado el 40 % de la compra. En la base no cambia nada: un
ítem que hace falta es el que antes estaba pendiente; cambia lo que significa en pantalla.

- **La cuenta va solo en los pendientes** —cuántas cosas faltan **ahora** es la pregunta de la
  pantalla— y no en el catálogo, que sería medir lo hecho.
- **Lo del catálogo no se tacha ni se atenúa**: no está muerto, está a un toque de volver a hacer
  falta. Entre las dos filas hay **tres diferencias y no una**: la forma (tarjeta blanca con
  sombra contra plano sobre el fondo), el peso del texto y el círculo. Quien no distinga un gris
  de un blanco tiene las otras dos.
- **El catálogo se pide con un `+`, no con un tic.** Un tic ahí diría "hecho", que en este modelo
  no significa nada. De ahí que `CircleCheck` y `CirclePlus` sean hermanos con las mismas medidas.
- **El catálogo entra abierto.** Arrancaba plegado, con el argumento de que crece para siempre y
  taparía lo que de verdad hace falta; en uso resultó que entrar en una lista es casi siempre ir
  a apuntar de ahí, así que el pliegue era un toque de más en el camino principal. Se puede
  plegar a mano y **no se recuerda**: el estado de un pliegue no es un ajuste.

### Tareas

**Lo atrasado se arrastra al día de hoy.** El tramo del calendario empieza hoy, así que todo lo
vencido caía fuera: lo que más urge era lo único invisible. Una tarea vencida aparece hoy marcada
como atrasada —con la palabra en Inicio y con un icono etiquetado en el calendario, donde a 390 px
no cabe—. Desaparecer no es lo que le pasa a una tarea sin hacer.

El efecto es que hoy acumula todo el atraso, y en la agenda eso se notaba demasiado: seis tareas
hacían la fila de hoy seis veces más alta, con seis triángulos rojos seguidos, y el calendario
abría enseñando la lista de tareas en vez de los planes. Desde `TAREAS_PARA_PLEGAR` (3) van
plegadas bajo una línea que dice cuántas hay y cuántas van tarde. **Resumir no es esconder**: el
recuento está a la vista. Los eventos no se pliegan nunca — esto es el calendario, y lo que pasa
manda sobre lo que hay que hacer.

**La prioridad no se dice con color.** En el sheet eran tres círculos de color con su etiqueta
—el mismo `DotOption` de "Asignar a"— en el `Field` inmediatamente siguiente: dos filas idénticas
seguidas, dos significados. Y el círculo de "Media" era `#E9C46A`, el `FAMILY_COLOR` **exacto**
(ΔE00 0), con Champán dorado a 9,4 y Canela clara a 12,1 por detrás, los dos por debajo del
umbral 15 que se le exige a cualquier pareja de `PERSON_COLORS`. No se retocaron los tonos porque
el problema no era el tono: **el color dice "de quién"**, y la prioridad es un grado, no una
identidad. Por eso `TASK_PRIORITIES` ya no tiene campo `color` y ahora son chips de texto, los
mismos que "Repetición". En la lista sí queda señal de color —la banda de 4 px al borde de la
tarjeta, en `PRIORITY_BORDER`—, y ahí no choca: una banda pegada al canto no se confunde con un
punto que además lleva el nombre al lado.

### Comidas

**Las franjas se eligen, y son de la familia.** Las de casa —desayuno, comida, merienda y cena,
más el comedor— están fijas en el código, pero en una casa que no merienda esa fila es un hueco
que la app pide llenar siete veces por semana. En Ajustes se apagan las que no se usan, con tres
cosas decididas a propósito:

- **Se guarda en `families`, no por dispositivo.** "En casa no merendamos" es un hecho de la
  casa, no la preferencia de un teléfono. Como el nombre de la familia, lo cambia un admin.
- **Ocultar no borra.** `meal_plans` no se toca: lo apuntado en una franja oculta sigue en la
  base y vuelve a verse si se reactiva.
- **Siempre queda al menos una**, igual que siempre queda un admin: con cero franjas la pantalla
  se queda sin filas y sin manera de reactivarlas desde ella. Se comprueba en los tres sitios: el
  `check` del esquema, `toggleMealSlot` y la propia fila de Ajustes, que lo dice en vez de ofrecer
  un botón que no hace nada.

**El comedor es una franja más, no una marca de la comida.** En una casa con niños en el comedor
hay dos menús el mismo día y a la misma hora. Se resolvió añadiendo `school` —justo detrás de
`Comida`— en vez de partir cada comida en dos públicos, por tres razones: el
`unique(family_id, date, slot)` **sigue en pie**, que es lo que deja que la pantalla escriba un
hueco sin preguntar antes si ya había algo (un `audience` en la fila obligaba a ampliarlo y a que
cada celda pasara de una comida a una lista); la configuración por familia **ya existía**, así que
no hay pantalla nueva; y **lo que no cabe se dice** — dos hijos en dos comedores distintos no caben
en una fila, que es el mismo límite del resto de Comidas, una casa y un menú. Entra **apagado**
(`DEFAULT_MEAL_SLOTS`, que no es `ALL_MEAL_SLOTS`): en una casa donde nadie come fuera sería una
fila vacía que la app pide llenar siete veces por semana.

**Una comida tiene hasta tres platos.** El menú del comedor viene en primero, segundo y postre, y
todo junto en `name` queda como una frase sin forma. De ahí `second_course` y `dessert`, los dos
opcionales y nulos en casi todas: una tostada no tiene segundo. El formulario los enseña **solo**
en `MEAL_SLOTS_CON_PLATOS` —comida y comedor—, y al cambiar a una franja sin platos se **vacían**:
dejarlos puestos guardaría un segundo que ya no se ve en ninguna parte. Las pantallas no miran
campo a campo, piden la lista a `mealCourses()`: en la tarjeta de la semana y en la lista de hoy
van en renglones; en la semana de móvil y en Inicio, el primero en su línea y el resto debajo
separados por puntos —los tres seguidos cortaban el postre a 390 px—; y en el sheet de copiar, los
tres con puntos.

### Calendario

**Es una lista continua, y el mes un mapa que se despliega.** En móvil la pantalla es la vista
Programación de Google Calendar: cabecera y **una sola lista** que arranca en hoy. Hubo pestañas
`Agenda` / `Mes` y se fueron al abrir la app: la pestaña por defecto era la lista, así que **el
calendario se abría sin enseñar ningún calendario**, y obligar a elegir entre ver el mes o ver lo
que hay era una elección falsa.

De dónde viene: la agenda apilaba **siete bandas** en una pantalla de 390 px —cabecera con mes y
flechas, pestañas, tira de siete días, "Vacaciones y descansos", buscador, tarjeta del día elegido
y los tramos—. El problema no era ninguna de ellas: era tener **dos navegadores a la vez** (la
tira y la pestaña de mes) y **dos capas de contenido** (el día elegido como tarjeta y lo que viene
como lista). Se fueron la tira (`WeekStrip`, borrado, y con ella sus dos rótulos de `DayCell`: la
inicial del día de la semana encima del número, que la rejilla ya tiene en su cabecera, y el mes
debajo, que existía porque un tramo de siete días rodantes podía cruzar de mes) y la tarjeta del
día elegido. Quedan dos bandas: cabecera y lista.

**Dónde arranca la lista es lo que separa las dos vistas.** En agenda, **hoy**, y no se mueve:
estuvo anclada al día elegido y apuntar algo para el 6 de septiembre movía el ancla allí, así que
la agenda se quedaba empezando en septiembre, sin hoy ni el resto de la semana a la vista. Con el
mes delante arranca en el **día elegido**, porque ahí tocar un día tiene que enseñar ese día o la
rejilla es un adorno. Y elegir un día **no reencuadra la lista: la desliza** hasta él
(`scrollIntoView` sobre el `id` de la fila); reencuadrarla escondía todo lo anterior al día
tocado.

**La lista va agrupada por tramos** (`tramoDeAgenda`, en `src/lib/agenda.ts`): "Hoy", "Mañana",
"Esta semana", "La semana que viene" y después uno por mes. El día de arranque es su propio tramo
y es lo que sustituye a la tarjeta que tenía. Sin tramos la lista era plana de aquí a 45 días: el
jueves que viene y un cumpleaños de octubre se leían igual. **"Mañana"** solo sale cuando la
agenda arranca hoy: es la pregunta que más se hace después de "¿qué hay hoy?" y dentro de "Esta
semana" se leía igual que el sábado; atado a hoy nunca desordena los rótulos. La función recibe
`hoy` como parámetro en vez de mirar el reloj por dentro, para poder probarla sin depender del día
en que corran los tests.

- Un día sin nada **no se pinta**, tampoco el primero: en una lista continua un hueco vacío es
  ruido. Solo hay un vacío, el de verdad: cuarenta y cinco días por delante sin nada.
- El chip de la fecha **no es un botón**. Lo fue, y se anunciaba como "Ver 6 de septiembre"; en
  una lista continua no lleva a ninguna parte. Hoy se marca ahí, en el color del chip, que es
  donde lo marca Google y donde lo busca el ojo.
- El bloque del día elegido es el **titular**: rótulo más grande que las versalitas de los tramos
  y, cuando es hoy, un aro verde en la tarjeta — el mismo idioma con el que `WeekList` marca hoy
  en Comidas.
- Cada línea dice hora (o "Todo el día"), título y **de quién es, siempre**: lo que no es de nadie
  pone "Familia" en gris. Antes se quedaba sin texto y solo lo decía el punto amarillo, que es
  exactamente lo que la app no quiere — saberse la paleta de memoria para entender a quién afecta
  algo. En gris y no en el amarillo de familia porque ese color no tiene contraste como texto.

**La lista tiene dos ejes: por días y por persona.** Una casa con varios se hace dos preguntas
—"¿qué hay el jueves?" y "¿qué lleva cada uno?"— y la agenda solo contestaba la primera. **Es un
eje, no una vista nueva**: la misma lista, los mismos cuarenta y cinco días, las mismas filas; lo
único que se mueve es el rótulo. Por eso el interruptor vive en la lista y no en la cabecera, y
por eso tampoco se recuerda entre visitas. Se descartó **una columna por persona**, que choca con
la razón por la que no hay siete columnas en el móvil: a 390 px, una casa de cinco deja columnas
de ~65 px y un bloque ahí no dice nada. Agrupar no necesita ancho. Las reglas del reparto están en
`agruparPorPersona` (`agenda.ts`), con sus unitarios:

- **El orden de las personas es el de siempre**, el de `buildAssignees`: familia, adultos, hijos.
  La familia va primera: no es de nadie en particular pero afecta a todos, y colgarla del final
  sería esconder la cena de los abuelos debajo del pequeño.
- **Quien no tiene nada no sale**, la misma regla que ya cumple un día vacío.
- Un evento de varios días **sale en cada día que ocupa**, igual que en el eje de días.
- Dentro del grupo las filas **dejan de decir el nombre**: ya está en el rótulo, y repetirlo era
  escribir tres veces "Marta" para tres citas de Marta.
- El salto desde el mes va por `id` y un mismo día sale bajo varias personas: **el ancla se la
  queda la primera aparición**, porque dos elementos con el mismo `id` dejarían el salto a merced
  de cuál encuentre el navegador primero.

**La rejilla del mes es de un solo mes, y las puntas se rellenan.** Se dibuja por semanas
completas —si no, las columnas dejarían de ser días de la semana— y los días de los meses vecinos
**sí se pintan**, con su número en gris claro y **el fondo teñido**: cuando septiembre empieza en
martes, dejar el 31 de agosto en blanco parte la semana por la mitad. Estuvieron en blanco y antes
se pintaban igual que los días del mes, y así se leían como días sueltos que no decían de qué mes
eran —era el mayor foco de ruido de la pantalla—; el relleno es lo que lo arregla. Siguen sin ser
botones y sin enseñar nada: están para cerrar la semana, no para consultarlos.

**Se dibuja como una rejilla, también en móvil.** Las líneas entraron solo en escritorio,
apostando a que a 52 px de celda la proximidad bastaba en móvil. No bastaba: un número y sus
puntos se confundían con los del día de al lado. Van en `--color-line`, el borde normal de la app,
y no en el `hairline` con el que nacieron: a ese tamaño el hairline sobre blanco casi no existe.
Tienen que morir en el borde de la `Card`, o la última columna y la última fila quedan flotando a
dos píxeles del marco. La celda gana un alto mínimo de **52 px** en móvil, para que un día sin
nada no encoja su fila.

**La celda dice tres cosas y nada más**: número, **hasta dos puntos** con el color de quien lleva
cada cosa —o el número si son más de dos— y **una** raya si alguien está fuera. Eran tres puntos y
hasta dos rayas, y con eso la celda volvía a ser el resumen del día que la agenda vino a quitarle.
Lo que la celda **no** hace, y antes sí: escribir títulos de eventos (a 50 px salían como
"09:0…"), llevar tooltip (la única vía de leer el día, y no existe con el dedo) y ser cuatro
botones (la franja de vacaciones, de 3 px, y el punto de descanso, de 10×10, estaban por debajo
del mínimo de toque). Ahora la celda es **un** botón que selecciona el día y su nombre accesible
dice lo que hay en palabras: "lunes, 24 de agosto, 2 planes, 1 tarea, 1 de vacaciones".

**Las ausencias son una franja pegada al borde de arriba, sobre un carril gris.** Dos piezas, cada
una resolviendo un problema distinto: **la posición** —arriba del todo, fuera del flujo donde van
las cosas del día— dice que **dura**, y por eso no se confunde con la etiqueta de un evento; y **el
carril gris** dice que **hay algo**, siempre con el mismo peso, y el color solo lo rellena. Sin él,
el color carga con dos trabajos y falla en uno: una barra maciza de "Champán dorado" sobre blanco
da 1,37:1 y no se ve, mientras que "Vino" da 9,30:1 — siete veces de diferencia, porque la paleta
va en dos bandas de claridad a propósito. Se redondea donde el tramo empieza y acaba de verdad,
para que los días de en medio encadenen; caben dos por celda, y son **decorativas**: a 7 px nunca
llegarían al mínimo de toque, y las ausencias se editan desde `Availability`.

Por el camino se derogaron tres formas, y se dejan escritas porque volverían a tentar:

- **Teñir la celda con la trama de día libre en el color de quien falta.** La paleta va en dos
  bandas de claridad, así que la misma opacidad daba pesos incompatibles —las vacaciones de un
  adulto pesaban cuatro veces más que el fin de semana y las de un hijo se veían menos— y bajarla
  no arregla nada. Un fondo no puede decir "día libre" y "de quién" a la vez.
- **Una etiqueta con el nombre de quien falta.** En móvil el nombre no cabe —la celda son 50 px—
  así que allí se quedaba en la barra de color, que es lo que ya hace la franja.
- **Pintar el número del día con el color de quien descansa.** Eran dos señales para lo mismo, y
  de las dos el número decía menos ("aquí pasa algo", y para saber quién había que saberse la
  paleta); además no era fiable, porque hoy y el día elegido le ganaban y un descanso hoy no se
  veía.

Con más de una ausencia el mismo día manda la primera, y si hay vacaciones manda la de vacaciones,
que es la que tiene tramo. **Se probó pintar la raya en gris** cuando falta más de uno y se
descartó al verlo: un martes de descanso en medio de una semana de vacaciones partía la banda
amarilla con un trozo gris, que se lee como que las vacaciones se acaban ahí. Cuántos son lo dice
el nombre accesible del día ("2 descansando"): el color no es la única vía.

**Los días en los que no se trabaja llevan trama diagonal**: sábado, domingo y festivo, los tres
igual. Es un solo concepto y por eso una sola clase, `dia-libre` en `globals.css`: lo que tienen en
común un sábado y el 12 de octubre es que no hay trabajo ni colegio. Va en la rejilla, en la
cabecera de columnas y en la vista Semana. Se probó **rellenar la celda en crema** y se descartó
—una masa de color se lee como "esto está apagado", y en una casa el fin de semana es cuando más
pasa; además el color significa persona, y un fondo que no es de nadie va contra esa regla, cosa
que una textura no hace—, y se probó **una línea vertical** donde acaba la semana laboral, que a
tamaño real era una raya más entre las de la rejilla. La trama va **muy separada** —1 px cada 7—
porque la celda de escritorio escribe títulos a 10 px encima.

**Hoy y el día elegido se distinguen por la forma, no por el tono.** Fueron un disco relleno y un
anillo, los dos en `primary-strong`: dos discos macizos que solo cambiaban de tono, y los tonos
eran el verde y el salmón de marca, a **ΔE 2,3 en protanopía**. Para quien no distingue rojos de
verdes eran el mismo círculo. El texto blanco encima tampoco salía: 2,61:1 sobre `primary` y
2,18:1 sobre `accent`. Hoy es el número y el día elegido la celda entera; hoy va en salmón
(`accent-strong`) como un **aro sobre un tinte claro** y no un disco macizo —el disco era la
mancha más oscura de la rejilla y, siendo un marrón rojizo, se confundía con los colores de
persona—, con la letra de su columna marcada en la cabecera y un filete salmón al pie de la celda,
porque un aro de 32 px entre treinta y tantos números costaba de encontrar. Se descartó teñir la
celda de hoy en salmón claro, que era la opción con más presencia, justamente por esto: habría
dejado hoy y el día elegido distinguidos solo por el tono.

**Las flechas no se mueven de sitio.** El grupo del título ocupa el ancho libre —topado a
`lg:max-w-sm` en escritorio— y el título se estira dentro, así que anterior y siguiente caen
siempre en el mismo píxel. Encogiéndose al texto, "Lunes, 1 de septiembre" y "Martes, 2 de
septiembre" no miden igual y la flecha se desplazaba a cada toque.

**Y se pasa de mes con el dedo** (`src/hooks/useSwipe.ts`), que es el gesto que ya tiene cualquier
calendario del móvil. Lo que hay que cuidar es **no robarle el gesto al desplazamiento vertical**:
se mide al levantar el dedo —así no hace falta `preventDefault` en `touchmove`, que es lo que
congela el desplazamiento— y solo cuenta si el recorrido pasa de 50 px y es más del doble de
horizontal que de vertical. Cuelga de la rejilla y del eje de horas, **no de la tarjeta entera**:
debajo están las ausencias y los cumpleaños del mes, y arrastrar el dedo por una lista para leerla
no puede cambiar el mes que tiene encima.

**En escritorio hay tres vistas: Día, Semana y Mes**, el trío de Google Calendar, con su selector
en la cabecera. En móvil el selector también está, con una cuarta —Agenda— y va debajo del título
y a todo el ancho, porque cuatro pestañas no caben al lado de "Agosto 2026" y ahí es donde acierta
el pulgar.

- Día y Semana son **la misma vista** (`Timeline`) con una columna o con siete. La aritmética es
  `src/lib/timeline.ts`: dónde cae cada bloque, cómo se reparten en columnas los que se pisan y
  qué horas se pintan.
- **El eje es uno solo para las siete columnas** y se calcula sobre lo que hay en todas: con siete
  ejes distintos no se podría comparar un martes con un jueves, que es para lo que sirve mirar la
  semana. Cubre **de siete a diez de la noche como mínimo** y se estira si hay algo antes o
  después; recortarlo a las horas con algo dejaba una semana con dos huecos de tres horas. El alto
  de una hora se calcula en CSS (`--alto-hora`, con suelo de 28 px para que una cita corta siga
  siendo pulsable) y las posiciones van en `calc()` sobre esa variable, en vez de vivir en una
  caja con `max-h` y scroll propio, que es lo que se veía cortado.
- **La cabecera dice qué estás mirando**: el mes, la semana como tramo ("24 – 30 de agosto") o el
  día entero ("Jueves, 27 de agosto"). Antes siempre ponía el mes, también mirando una semana, y
  entonces las flechas parecían de mes. Sus etiquetas accesibles acompañan ("Semana anterior",
  "Día siguiente"), y en la vista de un día desaparece la cabecera de columna, que repetía lo que
  el título acaba de decir.
- **Con Día o Semana delante no hay lista al lado.** Google tampoco la pone, y con ella la rejilla
  se queda sin el ancho que un bloque necesita. La lista contesta "¿qué viene después?" y esa
  pregunta la acompaña el mes, que sí la lleva.
- **Con el mes, la rejilla se lleva el espacio libre** —de 380 px a más de 900 en una pantalla de
  1440— y la agenda se queda en una columna fija de 380 a la derecha. Estaba al revés, con el mes
  encajado en 380 px y mil píxeles de crema al lado. A ese ancho **la celda sí escribe títulos**:
  hasta dos, con su punto de color, más el resto contado y una línea con las tareas del día. Los
  puntos se quedan para el móvil (`lg:hidden`). No contradice lo de arriba: aquello era por el
  ancho, y una celda de escritorio pasa de 120 px.

**Nunca siete columnas en el móvil.** Es la razón de que no haya semana en columnas ahí: a 390 px
cada columna son ~50 px y un bloque de color sin texto hay que tocarlo para saber qué es. Es
también por lo que Google Calendar no pone esa vista por defecto en el teléfono. La decisión no se
contradice con la vista Semana de escritorio: a 1440 px una columna pasa de 170 px.

**Derogado: el día sobre un eje de horas en el móvil.** Hasta el 24-08-2026 el móvil abría en
`DayTimeline`, y se retiró entero con el rediseño —componente, `timeline.ts` y sus 19 unitarios—
porque en la estructura nueva no queda sitio para una tercera vista y el detalle del día ya se lee
en lista. `timeline.ts` volvió intacto con el escritorio, con sus 19 tests, sin tocar una línea, y
con él `extractMinutes`, `DURACION_SIN_HORA_FIN` y `HORAS_MINIMAS_AGENDA`. Lo que se perdió en
móvil, por si algún día se vuelve: la posición como forma de decir la hora, el alto como forma de
decir la duración y el reparto en columnas de lo que se solapa. Dos decisiones que vivían ahí y ya
no aplican: un evento sin hora de fin se dibujaba con 45 minutos, y el eje se recortaba a las
horas con algo porque de 00:00 a 24:00 era casi todo blanco.

**Los cumpleaños tienen su propio bloque, y no salen ni en la rejilla ni en la agenda.** Uno se
apunta una vez y se repite veinte años, así que una casa con cuatro abuelos y tres amigos del cole
metía siete filas fijas al mes que no son nada que hacer. `CalendarView` los aparta **una sola
vez** (`allEvents.filter(e => !isBirthday(e))`) y los pinta `Birthdays`, debajo del mes y pegado a
"Vacaciones y descansos". Es el mismo razonamiento que sacó los festivos de la agenda y las
ausencias de las filas de cada día: **lo que _es_ el día se dice una vez y aparte**, y la lista se
queda para lo que hay que hacer; por eso los dos bloques son vecinos y tienen la misma forma. Se
descartó un interruptor "Ver cumpleaños": obligaba a la misma elección falsa de las pestañas
Agenda/Mes, y encendido devolvía el problema entero. La etiqueta del bloque es **el nombre sobre
el lila de `CUMPLE_COLOR`**, ni un color de persona ni el amarillo de familia — decía "Familia", y
eso metía a la abuela en la familia por la puerta de atrás justo después de haber decidido no
darla de alta.

**Los dos bloques del mes nacen plegados, y van en su propia tarjeta.** «Vacaciones y
descansos» y «Cumpleaños» cuentan **cómo es el mes**, no lo que hay que hacer hoy, y
desplegados empujaban la agenda fuera de la pantalla: en agosto, con unas vacaciones y un par
de cumpleaños apuntados, entre la rejilla y la primera fila de la lista había media pantalla de
móvil que casi nunca se estaba leyendo. Cada uno se anuncia en una línea —el título es el
botón, con cuántos hay al lado— y se abre quien quiera verlos (`SeccionPlegable`). Cuatro cosas
decididas ahí:

- **Son dos y no uno.** Juntarlos bajo un mismo título obligaba a abrir los cumpleaños para
  saber si alguien está fuera, y plegados ocupan una línea cada uno, que es justo lo que se
  quería ahorrar.
- **No es el interruptor «Ver cumpleaños» que se descartó**: aquel escondía los cumpleaños del
  mes entero y obligaba a elegir entre ver el mes o verlos; esto solo pliega una lista que sigue
  ahí, contada y a un toque.
- **Van en su propia tarjeta**, no dentro de la del calendario: colgando de la rejilla se leían
  como una parte más de ella, y no lo son — el calendario dice qué días son y esto dice cómo es
  el mes. La separación es la mínima que se nota: el hueco de `mt-2` y el borde de la tarjeta.
- **Si no hay ni ausencias ni cumpleaños, la tarjeta no se pinta**, que si no queda una caja
  blanca vacía debajo del mes.

Lo que dice la rejilla no cambia: la raya bajo el día sigue avisando de que alguien no está.

### Inicio

Inicio contesta **"¿qué tenemos que saber hoy?"**, y de ahí salen casi todas sus reglas: **no
salen** ni las notas (la clave del wifi es de siempre, que es lo contrario de hoy) ni Finanzas
("llevas 180 de 300 en la compra" es del mes), porque meterlo ahí convertiría la primera pantalla
en un cuadro de mandos.

**Contesta "qué queda", no "qué había".** Los planes que ya han pasado se atenúan y el siguiente
lleva la hora en verde: el desayuno de las 8:00 y la cena de las 21:00 se leían igual a las 20:00.
Manda la **hora de fin** cuando la hay, así que una comida de 14:00 a 16:00 no se apaga a las
15:00: apagar lo que está pasando es lo contrario de lo que se busca. Lo de todo el día no se
atenúa nunca —no tiene hora— y tampoco puede ser "el siguiente". Y **no se marca nada antes de
hidratar**: `/home` se prerenderiza y el HTML servido llevaría la hora del build. Se descartó una
etiqueta "Ahora" en la fila: puede faltar hora y media para el dentista, y además añade un
elemento a una tarjeta que ya lleva cuatro bloques.

**Las tareas de hoy tienen tope, y la píldora dice desde cuándo.** Seis atrasadas —que no es un
caso raro, es lo que pasa en cuanto una semana se tuerce— empujaban la compra y los planes fuera de
la primera pantalla: lo urgente tapaba lo de hoy. Cuatro y "Y N más". Como `selectTodayTasks`
respeta el orden de `selectTasks` —primero lo atrasado, después por fecha y por prioridad—, cortar
por arriba deja fuera lo menos urgente. Y "Atrasada · 17 jun" en vez de seis "Atrasada" idénticas,
que no dejaban ver cuál llevaba un día y cuál un mes.

**Lo que viene son tres cajas: «Mañana», «Próximos días» y «Próxima semana».** El bloque son los
siete días siguientes (`selectUpcomingEvents`), y en una sola lista "Mañana a las nueve" y
"Sáb 12" se leían con el mismo peso pese a no pedir lo mismo: lo de mañana se prepara esta noche y
lo del sábado solo hay que saberlo.

- El reparto lo hace `partirPlanesProximos`. **El primer corte es mañana**, porque la pregunta
  que se hace al acostarse —«¿qué hay
  mañana?»— seguía teniendo que leerse dentro de una lista de dos días. En esa caja las filas **se
  callan el día**: escribir «Mañana» delante de cada línea de una caja titulada «Mañana» es decir
  lo mismo dos veces y gastar el ancho que necesita la hora.
- **El segundo corte es el domingo, no «dentro de tres días».** En casa se habla de esta semana y
  la que viene, no de distancias en días. La consecuencia es deliberada: un sábado la caja del
  medio no se pinta y el lunes sale ya en «próxima semana». Y **mañana manda sobre el
  calendario**: un domingo, el lunes va en «Mañana» y no en «Próxima semana», porque nadie llama
  «la semana que viene» a mañana.
- **El color va de cerca a lejos** —el amarillo de la sección, el salmón y el gris—, todos tokens
  que ya existían, y no dice de quién es el plan: eso lo sigue diciendo el punto de cada fila.
  Cada caja desaparece si no tiene nada.
- El bloque se llamó "Esta semana" y el nombre mentía dos veces: `selectUpcomingEvents` es una
  **ventana móvil** de mañana a hoy + 7 días —un sábado, "esta semana" llegaba hasta el sábado
  siguiente— y además "Esta semana" ya es un tramo de la agenda del calendario, donde sí es la
  semana natural con `endOfWeek`. La misma etiqueta decía dos cosas distintas en dos pantallas.

**Cada día es un bloque, no una columna.** El día era una columna de ancho fijo en la primera
fila, y la segunda cosa del mismo día dejaba ese hueco en blanco: la cuenta salía con una fila por
día y se rompía justo cuando había dos, que es cuando el agrupado tenía que servir de algo. El día
pasa a ser un **rótulo encima de lo suyo**, entero ("Miércoles 6"). No es un rótulo inventado: es
el mismo de las cestas de `PendingItems` —`bg-surface`, `text-[11px]`, `uppercase`— y va en `h3` y
no en una `section` con nombre, porque tres días serían tres landmarks anidados dentro del de la
caja. **La etiqueta de quien lo lleva tampoco se repite** si el plan de arriba es suyo; el punto de
color sigue en todas y quien escucha la fila lo sigue oyendo (`sr-only`). Lo que **no** se hace es
reordenar por persona dentro del día: dentro de un día lo que se lee es la hora, y con cinco
planes un grupo de persona casi siempre tendría una sola fila. El eje de persona existe y vive
donde sí contesta algo, que es la agenda del calendario.

**El aviso de los papeles que caducan** es lo único de la casa que se estropea solo y sin avisar:
el DNI vale hasta que un día no vale. El dato estaba (`selectExpiryState`) y el recordatorio diario
ya lo mandaba por push, pero en pantalla había que entrar en Documentos. **No usa `HomeSection`** y
es a propósito: las secciones son el ritmo de lo que se mira a diario, y esto no está casi nunca
—los días normales devuelve `null` y no ocupa nada—; cuando está no se navega, se atiende. Una
tarjeta con rótulo en mayúsculas y "ver todos" al pie prometería una lista que se consulta, y
habría gastado además el quinto color de acento en una paleta de marca que solo tiene cuatro. Con
un solo papel se dice **cuál** y **cuándo** —«"DNI de Carlos" caducó el 20 de agosto»—, que es la
diferencia entre un aviso que se atiende desde la cama y uno que obliga a entrar a ver de qué
habla; con varios ya no cabe y se cuentan. Dos tonos: lo vencido en rojo porque ya está mal, lo que
va a vencer en el amarillo de los avisos, que dice "hay tiempo, pero ponte".

**Se descartó el saludo con el nombre de la familia.** El saludo contextual ya estaba
(`getGreeting`); lo nuevo habría sido el nombre, y hay una familia por sesión, no se confunde con
ninguna y el dato ya vive en el selector de familia. Un nombre que nunca cambia, en el renglón más
caro de la pantalla, deja de leerse a la semana.

**El enlace del pie de cada sección** («Ver calendario», «Ver todas las listas») va en
`primary-strong` y con un chevron: era el único sitio pulsable de la tarjeta y el que peor se leía
—verde de marca sobre blanco, 2,61:1, y encima el texto más pequeño de la pantalla, 12 px—, y en
una tarjeta sin bordes ni fondo propio un texto suelto al pie no se distingue de un rótulo.

### Notas

Lo que hay que tener apuntado en una casa y no es una fecha, una tarea ni un papel: el teléfono del
pediatra, la clave del wifi, la talla de las botas, dónde está el contador de la luz. Es la sección
más pequeña de la app y se queda así.

**Una nota es un título, un texto libre y un emoji.** Sin categorías, sin campos y sin tipos de
nota. Se consideró la variante con tipos —"teléfono" con botón de llamar, "contraseña" con botón
de copiar— y se descartó por dos cosas: obliga a elegir tipo antes de escribir, y no hay respuesta
para el código de la alarma, que es teléfono y contraseña a la vez. Lo que hace falta apuntar en
una casa —"el contador está en el rellano, la llave pequeña del llavero azul"— no cabe en un campo.
También se descartaron carpetas: una familia tiene veinte notas, y para veinte manda el buscador.

**La nota se lee desde el índice**, con sus saltos de línea, hasta seis líneas. Es la diferencia
con `DocCard`, a la que se parece: un documento es un archivo que hay que abrir, una nota **es** su
contenido, y obligar a tocar para ver el teléfono del pediatra convierte en dos gestos lo que tiene
que ser cero.

**La tarjeta no lleva fecha.** Llevaba el `updated_at` al pie y no contestaba nada: una nota no
vence ni llega tarde. Si algún día hace falta decir que una nota está vieja, se dirá cuando lo esté
—«sin tocar desde junio»— y no en todas.

**Fijar es lo único que ordena por encima del tiempo.** Ordenar solo por `updated_at` no vale: la
clave del wifi se consulta todo el año y no se edita nunca, así que cualquier nota escrita ayer la
hundiría. Se marca en el sheet y no en la tarjeta, porque un botón no puede llevar botones dentro
—la misma piedra con la que tropezó `DayCell` al empezar a escribir títulos— y partir la tarjeta
en dos zonas pulsables por un gesto que se hace una vez no sale a cuenta.

**Lo que se escribe se guarda en texto plano**, protegido por la RLS y por nada más. Es una
decisión consciente y tiene su letra pequeña: la CSP lleva `'unsafe-inline'` en los scripts, así
que un XSS en línea llegaría a la sesión y con ella a las notas, y quien tenga el panel de Supabase
o la clave de servicio las lee. Se valoró cifrarlas con una clave derivada de una frase familiar y
se descartó: hay que resolver cómo la comparten cinco personas, qué pasa al entrar desde otro móvil
y qué pasa cuando alguien la olvida —se pierde todo—, y eso es un proyecto, no una sección. Lo que
sí se hace es decirlo donde se lee: el sheet lo avisa bajo el campo de contenido y `/privacidad` lo
repite. **Sirve para la clave del wifi de casa; no es un gestor de contraseñas.**

### Documentos

**Once carpetas, y la regla que las sostiene es que cada papel que hay de verdad en una casa tenga
una que no sea «Otros»**: Salud, Colegio, Personal, Vivienda, Vehículo, Seguros, Finanzas,
Facturas, Mascotas, Viajes y Otros. Eran cuatro y el problema no era que fueran pocas, sino que dos
no querían decir nada —el seguro del coche estaba en «Personal» y la factura de la lavadora habría
acabado en «Otros»—: si medio cajón cae en la misma carpeta por descarte, abrirla es como no abrir
ninguna. La lista viva está en `DOC_CATEGORIES` (`src/lib/constants.ts`) y el `check` de
`documents.category` en `supabase/schema.sql` la copia: si una crece, la otra crece con ella.

**`personal` es identidad**, no el cajón de lo que sobra: DNI, pasaporte, libro de familia,
títulos. La clave no se renombró aunque «Identidad» sea más exacto: hay documentos reales en
producción con ese valor.

**El icono es un emoji, como en toda la app.** Fueron iconos de línea de `lucide`, con un argumento
de tamaño —el chip de la tarjeta llevaba el texto a 10 px, y a esa altura un emoji de color es una
mancha que Android, iOS y Windows dibujan a su manera—, pero eso no explicaba por qué Documentos
tenía que ser la única sección con otro idioma de iconos, y la palabra se fue de la tarjeta, que es
lo que dejaba sin sostén la razón original. Los once salen del **mismo vocabulario que ya ofrecen
los sheets** de listas, notas y partidas (🏥, 🎒, 🏠, 🚗, 🐾, ✈️, 🧾), y **ninguno es posterior a
Unicode 7**: en una lista los elige la familia de un juego curado, pero aquí el catálogo es fijo,
así que un emoji reciente no sale como un icono raro que alguien escogió, sale como un cuadrado
vacío para todo el que tenga el móvil viejo. Por eso `personal` no lleva 🪪, que es más literal y es
de Unicode 14; y lleva 👤 y no 🆔 porque el juego tiene que **caber en la paleta**: el 🆔 se dibuja
como un bloque violeta macizo —el único color saturado de los once— y en una pantalla de salvia y
arena se veía antes que el nombre del documento. El campo vive en `constants.ts` y no en un
componente aparte —`CategoryIcon.tsx` se borró— porque un emoji es texto, y ese archivo lo importa
también el servidor y no podía arrastrar `lucide-react`. Para pintar una categoría suelta está
`DOC_CATEGORY`, la misma lista indexada por clave.

**En la tarjeta va el emoji solo; en la pastilla, con la palabra.** No es una incoherencia: la
tarjeta repetía un nombre que muchas veces se acaba de leer en el filtro de arriba, mientras que un
filtro tiene que decir qué filtra —once carpetas sin nombre obligan a adivinar cuál es Personal y
cuál Seguros—. En la tarjeta el emoji es `role="img"` con el nombre en `aria-label` y en `title`;
en la pastilla es `aria-hidden`, porque el nombre ya está escrito al lado. Y de quién es el
documento pasa por `.etiqueta-persona` + `fondoDePersona`, como en toda la app.

**La carpeta puesta acota, y el buscador busca dentro** (`selectVisibleDocuments`, 17-09-2026).
Con «Personal» puesto, buscar «seguro» no saca los papeles de Seguros: dice «Sin coincidencias».
Es la **excepción** a «buscando se enseña todo», y se decidió a propósito después de encontrarla:
el código hacía esto y un comentario al lado prometía lo contrario. Lo que la separa del pasado del
calendario o de los meses de Finanzas —donde la búsqueda sí atraviesa— es que aquí **el alcance
está en pantalla**: la pastilla puesta se ve justo encima de los resultados, en verde y con
`aria-pressed`, y soltarla es un toque. Al pasado del calendario no se llega con ningún control, así
que esconderlo sería esconder sin decirlo. Si algún día se cambia, hay que cambiar también lo que
se lee: como hace Finanzas, el resultado tendría que decir dónde ha mirado.

**Como filtro solo salen las carpetas que tienen algo dentro** (`selectDocCategoryFilters`). Que
haya once es bueno para guardar y era malo para mirar: doce pastillas se leían como un muro antes
del primer documento —cuatro filas a 390 px— y la mitad llevaban a una pantalla vacía. Esto **no
contradice** la regla de no esconder contenido: una carpeta vacía no es contenido, es un filtro
muerto, y las once siguen enteras donde hacen falta, que es **al guardar**. Dos detalles que
salieron al escribirlo: **la categoría que estás mirando no desaparece** aunque te quedes sin
papeles dentro, porque quitarle la pastilla dejaría la pantalla vacía sin decir por qué; y **con una
sola carpeta con papeles no sale la tira**, porque «Todos» y esa carpeta enseñan lo mismo — la misma
idea que el buscador por debajo de `MINIMO_PARA_BUSCAR`. Las descartadas fueron el desplegable
—esconde y cuesta dos toques— y agrupar las once en cuatro grupos grandes, que obliga a inventar y
explicar una jerarquía nueva. Un documento sin categoría se pintaba como «Otros» en su tarjeta pero
el filtro «Otros» no lo encontraba (`d.category === activeFilter` contra `null`): ahora las dos
preguntas pasan por `docCategoryOf`. `e2e/escritorio.spec.ts` comprueba que las pastillas no se
arrastren y `e2e/runtime.spec.ts` que Colegio y Mascotas —sin papeles en la demo— no estén en la
tira y sí en el sheet.

### Ajustes y navegación

**Ajustes se agrupa por para qué entras**: "Tu familia", "Personas", "Preferencias de la casa",
"Cuenta y seguridad" y "Legal", más "Modo demo" cuando toca. Eran once secciones al mismo nivel en
una columna que en móvil no se acababa nunca.

**Sin plegables, y a propósito.** El repositorio ya se dio ese golpe dos veces: el catálogo de las
listas arrancaba plegado y se abrió, y las tareas del día solo se pliegan porque hoy acumula todo
lo atrasado y el recuento se queda a la vista. Ajustes no acumula nada —la lista es de largo fijo—
y se entra con un objetivo concreto, así que un pliegue esconde justo lo que se viene a buscar. El
largo se recortó quitando redundancia: la tarjeta de la familia cede el recuento a "Personas", la
lista de familias solo sale si hay más de una, y las dos acciones normales de la cuenta pasan a ser
filas de una tarjeta en vez de dos tarjetas de una línea.

**En el móvil, Ajustes es un índice.** En escritorio las cinco secciones son pestañas de pie; en
móvil eran esas mismas pestañas en horizontal, cinco pastillas que a 390 px se partían en dos filas
y obligaban a elegir sección antes de saber qué hay dentro. Ahora `/settings` abre un índice de
cinco filas con icono y chevrón, la misma fila que `MoreMenu`, que es de donde se llega — entrar en
Ajustes no cambia de forma a mitad de camino. Son **enlaces de verdad** a `?seccion=…`, así que
entran en el historial y el botón de atrás vuelve al índice. Es una excepción consciente a la regla
de no esconder contenido: no es «lo que se viene a buscar» escondido dentro de un bloque que ya se
está mirando, son cinco sitios distintos con cinco propósitos distintos, y el índice los nombra
todos a la vez antes de entrar en ninguno. La diferencia la hace `esSeccionConocida`: sin
`?seccion=`, escritorio abre Familia —una columna de secciones al lado de un panel vacío no diría
nada— y móvil abre el índice. El `role="tablist"` sigue existiendo **una sola vez**, en la columna
de escritorio; el índice es un `<nav>` de enlaces.

La lista de secciones vive en `src/components/settings/pestanas.ts` y la comparten `pestañaDesdeUrl`
y las pestañas de `SettingsView`, que **no guardan cuál está activa: la dice la URL** y solo la URL,
porque se puede entrar por `?seccion=` sin desmontar la pantalla y con dos fuentes de verdad había
que sincronizarlas a mano. Las pestañas escriben la suya con `replace`, para no llenar el historial
de pasos atrás dentro de la misma pantalla.

Nombrar las secciones obligó a arreglar dos. **Sincronización** estaba vacía para quien no tuviera
Drive conectado, porque conectar se ofrece donde hace falta —al ir a subir— y no en una lista de
ajustes; eso valía cuando a la pestaña se llegaba de paso, y anunciada en el menú una sección vacía
es peor que la tarjeta que se ahorraba, así que ahora dice siempre qué es Drive y ofrece
conectarlo. Y **borrar cuenta vuelve de Legal a Cuenta**: se había ido a Legal para que no se
confundiera con cerrar sesión, que era la fila de justo encima, y cerrar sesión ya no vive ahí.
Sigue siendo una tarjeta aparte, en rojo y con confirmación.

**En móvil se navega por un solo borde: el de abajo.** Hubo también un círculo con la inicial
arriba a la derecha de `TopBar`, y eran dos sitios donde tocar para salir de las cinco pantallas de
siempre, y el de arriba no decía a dónde llevaba. La cabecera de móvil es solo el título, y la
sexta pastilla de la barra es **"Más"** (`MoreMenu`): Notas, Documentos, Ajustes y cerrar sesión.
El menú llevó un rato las cinco secciones de Ajustes sueltas, cada una directa a su pestaña, y no
funcionó: mezcladas con Documentos y con cerrar sesión hacían un menú largo donde no se distinguía
a simple vista "una pantalla de la app" de "una pestaña dentro de otra pantalla". Ajustes es una
fila más; cerrar sesión sí se mudó de verdad y va aparte, porque no es un ajuste de la casa, es
salir de la app.

**Documentos y Notas van en "Más"** porque las cinco pastillas de abajo son las cinco pantallas de
todos los días. Documentos es la sección a la que menos se entra —el DNI y el libro de familia se
miran dos veces al año— y era la única cuya etiqueta no cabía a 390 px: se escribía "Docs" abajo y
"Documentos" al lado, y dentro de "Más" se lee entera y las dos navegaciones lo llaman igual. Una
nota se consulta cuando viene alguien o cuando se estropea algo. Con dos secciones ahí, el filtro
de la barra dejó de escribirse a mano: `secciones.ts` marca cuáles con `enMas` y lo leen las dos
barras.

**El título de `TopBar` es el de la pantalla en todas, Inicio incluida.** Inicio decía "Farpi": era
la única donde la barra de arriba hablaba de otra cosa que de dónde estás. El nombre de la app lo
dice la columna de escritorio, y en móvil no hace falta que lo diga nada —quien abre la app sabe
cuál ha abierto—; lo que falta al llegar a una pantalla es saber en cuál estás. "Farpi" se queda
como respaldo de una ruta sin nombre en `titles`.

**En escritorio, el pie de la columna dice quién eres** y lleva a Ajustes y a la salida. Son tres
filas (`AccountFooter`): el nombre con su inicial, que es un letrero y no abre nada; Ajustes; y
cerrar sesión, bajo una línea. Arregla dos cosas del enlace "Ajustes" suelto que había antes: la
app no decía en ninguna pantalla con qué cuenta estabas —en una casa con dos adultos y un móvil
compartido eso importa— y cerrar sesión vivía a cuatro toques, dentro de la pestaña Cuenta de la
pantalla a la que menos se entra. El nombre de la casa **no** sale en la fila: estuvo bajo el de la
persona y confundía las dos cosas —quién eres y en qué casa estás—; se dice en Ajustes → Familia,
que es donde se cambia.

**Un detalle de apilamiento que costó una vuelta**: en móvil el menú cuelga de `TopBar`, que es
`fixed z-50` y **crea contexto de apilamiento**, así que el `z-[60]` del sheet no competía con el
`z-50` de la barra de abajo y esta le tapaba la última sección. El sheet de la cabecera se pinta
con `createPortal` en el `body` —donde vuelve a estar a la altura de los sheets del resto de la
app, que cuelgan de `main`— envuelto en un `lg:hidden`, porque sacarlo del botón lo saca también de
su `lg:hidden` y en escritorio habría dos menús.

**Las rutas de la app van en inglés**: `home`, `calendar`, `tasks`, `lists`, `meals`, `notes`,
`docs`, `birthdays`, `finances`, `settings`. Lo que **no** se toca es el código de dentro
—`cumplesDeLaCasa`, `DIAS_LISTA_CUMPLES`, `useFinanzasState` y los rótulos siguen en español, que
es la convención del proyecto—: lo que está en inglés es el nombre de la ruta y el del componente
de pantalla, no la lógica.

### La portada

**No tiene botones que lleven al login: tiene el formulario.** Quien llega puede entrar sin cambiar
de página, que es donde se pierde la gente.

Eso obligó a que hubiera **un solo formulario de autenticación** en todo el proyecto,
`src/components/auth/AuthCard.tsx`, que montan `/auth/login` y `LandingPage`. Copiarlo era la
opción rápida y la peor: dos formularios divergen en cuanto alguien toca un mensaje de error, y a
partir de ahí uno de los dos miente. `/auth/login` sigue existiendo aunque la portada ya no lo
enlace —es donde aterrizan las invitaciones, la confirmación de cuenta y los enlaces de recuperar
contraseña— pero ya solo aporta su maqueta.

**Y se pinta una sola vez en la página.** No es una preferencia: la tarjeta anterior, que solo
tenía botones, salía dos veces —una para móvil, otra para escritorio— y con un formulario dentro
eso duplica los `id` de los campos, que es lo que ata cada `label` con el suyo. Dos «Correo
electrónico» con el mismo `id` y quien navega con lector de pantalla acaba escribiendo en el que no
ve. Por eso las tres piezas de la portada —titular, acceso y resto— van colocadas a mano en la
rejilla (`col-start` / `row-start`) en vez de por orden natural: el acceso se escribe en medio,
porque tiene que ser el segundo en móvil, pero pertenece a la columna de al lado.

En la barra de arriba **no queda ningún enlace de cuenta**. Se probó dejar un «Entrar» que fuera un
ancla a `#entrar`, para poder volver al formulario desde el final de la página en móvil, y se
quitó: seguía leyéndose como el botón de login de siempre, que es justo lo que la portada ya no
quiere ser. El precio es que en móvil, muy abajo, hay que subir para volver al formulario; el `id`
sigue ahí por si algún día se enlaza de otra forma.

Efecto lateral que conviene saber: la portada dejó de ser una página inerte y carga el cliente de
Supabase. Y en **modo demo** enseña el aviso de «Modo local activo» en vez del formulario, que es
lo mismo que hace `/auth/login` y lo que ve la suite e2e.

## Tono de la interfaz

La app habla como se habla en una casa, y desafina en cuanto se cuela el registro de una
herramienta de trabajo. Al escribir textos nuevos:

- **Vosotros, no el usuario.** "Ya tenéis leche", "no lo habíais apuntado nunca".
- **Los vacíos dicen qué pasa, no que no hay datos.** "Sin planes", "No falta nada", "Sin menú
  para hoy" — nunca "No se han encontrado elementos".
- **Y no explican la pantalla.** Un hueco vacío se cuenta con dos palabras o no se cuenta: nada de
  "Apunta lo que hay que hacer en casa: llamar al fontanero…". Lo único que va debajo del título es
  qué se ha buscado.
- **Las etiquetas dicen lo que hace el toque**, con el nombre de la cosa dentro: "Apuntar que hace
  falta Leche", "Ya tenéis Leche, quitar de lo que falta". No "marcar como hecho".
- **Nada de jerga de gestor de proyectos**: ni completado, ni progreso, ni porcentajes. Salvo en
  Tareas, que sí son tareas.
- **Ni de banco**: ni movimientos ni topes. Una casa tiene un día a día y partidas.
- **En el calendario no se nombra la cosa, se dice qué haces.** La palabra "evento" desapareció de
  la interfaz: el sheet se titula «Apuntar en el calendario», el `+` es «Apuntar algo» y el vacío
  de la agenda, «Toca para apuntar algo». La razón es que no hay un sustantivo que valga a la vez
  para el dentista y para la barbacoa: "plan" suena a ocio, "cita" a médico, "aviso" a que alguien
  tiene que enterarse y "recordatorio" ya está cogido por las notificaciones diarias. *Apuntar*
  vale para los cuatro tipos, vacaciones incluidas, y ya era el verbo del botón de guardar de las
  ausencias. En base el tipo se sigue llamando `kind: 'evento'`: es un valor guardado, no un texto.
- **Los ejemplos son de esta casa**: "Ej: Cartilla vacunas Ana", "Ej: Leche entera".
- **Frases cortas y sin signos de admiración**, y ya no hay excepciones: la última era «Lista
  vacía. ¡Añade el primer ítem!», que hoy es «Esta lista está vacía» a secas.

## Decisiones técnicas

- Invitaciones: **magic link** (`inviteUserByEmail` + `/auth/callback?invite_id`).
- Familia activa: sesión Supabase + tabla `family_members`, resuelta en `AppShell` y persistida con
  `family-config`.
- `StoreProvider` migrado a acciones async.
- Tests con `@playwright/test`, **un solo runner** para dos cosas: los unitarios de lógica pura en
  `e2e/unit/` (sin servidor) y los de navegador. Se eligió así para no añadir una dependencia más
  solo por los unitarios. No añadir Jest ni Vitest.
- Tailwind v4, sin `tailwind.config`: los tokens viven en `src/app/globals.css`. Migración a tokens
  de color completada: de 109 apariciones literales a 36, y lo que queda son datos, marca de
  terceros y decorativos de un solo uso.
- **La paleta es la original y se vuelve a ella.** Crema `#FAF7F2`, tinta `#252525`, salvia
  `#8BA888`, terracota `#D8A48F`, amarillo `#E9C46A` y rojo `#D96C6C`. Se probaron dos alternativas
  cálidas —"Cocina de casa" y "Mediterráneo"— y las dos se revirtieron por decisión de producto. Si
  se vuelve a intentar, esto es lo que se aprendió:
  - **Los nombres de token no se tocan, solo los valores.** Así se hizo las dos veces:
    `--farpi-sage` acabó siendo una terracota y `--farpi-terracota` un turquesa. Suena raro y aun
    así es lo correcto: renombrarlos arrastra el bloque `@theme inline` y las utilidades
    `*-farpi-*` que salen de él.
  - **El acento de marca tiene dos papeles**: relleno con blanco encima (`bg-primary text-white`,
    12 sitios) y texto sobre el crema (`text-primary`, 57 usos y mucho de 9-12 px). Un acento
    cálido y bonito rara vez cumple 4,5:1 en los dos, así que o se oscurece el token —y se nota— o
    se acepta AA solo para texto grande y el texto pequeño tira de `primary-strong`. La salvia
    original no cumple en ninguno de los dos (2,61 y 2,44), que es el precio conocido de tener esta
    paleta.
  - **`FAMILY_COLOR` (`src/lib/constants.ts`) es el token `sand` copiado a mano**, porque viaja en
    `style` y no en clases. Cambiar la paleta y olvidarlo no rompe nada: los dos amarillos
    simplemente dejan de ser el mismo y nadie avisa. Igual que el `themeColor` de `layout.tsx`, el
    `theme_color` de `public/manifest.json` y `src/app/icon.svg`.

## Decisiones pendientes

- Si el modo demo será permanente o solo de desarrollo/pruebas.
- Si se publica en Google Play como TWA. Afecta poco al código (assetlinks y package name), pero
  fija el dominio para siempre.
- **Si se sincroniza Google Calendar por usuario.** Lo que hay montado juega a favor: el login con
  Google ya existe sobre Supabase, así que el proyecto en Google Cloud está creado y el baile de
  OAuth hecho, y la sesión trae `provider_token` y `provider_refresh_token`. Dos cosas lo frenan, y
  ninguna es escribir código. Una, que **Supabase no refresca el token del proveedor**: habría que
  hacerlo contra Google, como ya se hace con el de Drive. Y la otra es la que decide: el scope de
  calendario es **sensible**, así que mete la pantalla de consentimiento en la verificación de
  Google —semanas, y no dependen de nosotros—, que es exactamente el proceso que el scope
  `drive.file` de los documentos se eligió para no pisar.
