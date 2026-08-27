# Validación Supabase

Última ejecución: 2026-08-27, ya con los cumpleaños apuntados. **86/86 comprobaciones
correctas.**

Son las 79 anteriores más las **siete de la §9 bis, cumpleaños de fuera de casa**: que el
quinto valor de `kind` (`cumple`) entra, con y sin `birth_year`; que la base rechaza un
cumpleaños con día final o con hora —es de día completo y de un solo día, al revés que un
festivo—; que un año de nacimiento colgado de algo que no es un cumpleaños no pasa; que un
año imposible tampoco; y que un ajeno no los ve.

Las 79 eran las 70 del esquema con los documentos en Drive más las **nueve de la §13,
cerrar una familia** (`delete_family`): que no la cierra ni un miembro no admin, ni un
ajeno, ni un `delete` directo saltándose la RPC; que nadie se queda sin ninguna familia; y
que el camino bueno se lleva en cascada lo que colgaba de ella.

> De 80 a 79 no es una regresión. La pasada del 26-08-2026 dio 69, y la primera del
> 27-08 dio 80 con las once del paso de los documentos a Google Drive (siete de
> `storage_connections` y cuatro de las columnas nuevas de `documents`). Después se
> borró el bucket `documents` y con él las **diez comprobaciones de Storage** del arnés,
> que ya no tenían nada que comprobar: 80 − 10 + 9 = 79. Las secciones se renumeraron
> entonces: lo que era §9…§13 pasó a §8…§12, y la §13 es ahora la del borrado.

La limpieza borró los tres usuarios y las dos familias de
prueba que quedaban en pie —la tercera, la que crea la §13, la cierra el propio arnés—;
los datos reales no se tocaron.

## Estado

Backend validado contra el proyecto real con tres usuarios y dos familias de prueba, creados y eliminados durante la ejecución. Los datos reales de la familia no se tocaron.

**Método.** En lugar de `set role` desde el SQL Editor, las pruebas se ejecutaron con **sesiones de usuario reales**: se autentican los usuarios, se obtiene su JWT y se ataca la API REST y la de Storage con él. Es el mismo trayecto que recorre la app (JWT → PostgREST → RLS), así que valida también que las policies se aplican con el token del usuario y no solo a nivel de rol de base de datos.

Repetible con `node scripts/validate-rls.mjs`. Conviene ejecutarlo después de tocar una migración, una policy o una RPC.

**Tres usuarios, no dos.** A y B empiezan en familias distintas, pero en la sección de invitaciones B acepta unirse a la familia de A y deja de ser ajeno. Por eso existe un tercer usuario C que nunca entra en ninguna familia: es el que prueba el aislamiento a partir de ese punto. Sin él, las comprobaciones de Storage pasaban por el motivo equivocado.

No se incluyen aquí URLs privadas, claves ni datos personales.

## Migraciones

Verificadas por la existencia de sus objetos (tablas, funciones, columnas y bucket) en el proyecto:

- [x] `001_initial_schema.sql` — las 10 tablas del MVP existen
- [x] `002_rls_policies.sql` — RLS activo; `my_family_ids()` expuesta
- [x] `003_rpc.sql` — `create_family_with_admin`, `update_my_family_profile`
- [x] `004_family_invites_storage.sql` — `family_invites` y bucket `documents` privado
- [x] `005_task_recurrence.sql` — columnas de recurrencia en `tasks`
- [x] `006_event_recurrence.sql` — `recurrence_group_id` en `events`
- [x] `007_cross_family_integrity.sql` — triggers verificados en caliente (ver Integridad)
- [x] `008_admin_rpcs.sql` — `remove_family_member`, `update_family_member_role`
- [x] `009_accept_invite_rpc.sql` — `accept_family_invite(p_invite_id uuid)`
- [x] `010_push_subscriptions.sql` — tabla `push_subscriptions`
- [x] `011_account_deletion.sql` — `created_by` es nullable en las tablas de contenido
- [x] `012_member_assignment.sql` — `member_id` en `events` y `documents` *(comprobado a mano el 04-08-2026, no por el arnés)*
- [x] `013_event_kind.sql` — `kind` en `events` *(comprobado a mano el 04-08-2026)*
- [x] `014_member_profile.sql` — `family_members.color` y `update_family_member_profile`; `update_my_family_profile` ya no existe *(comprobado a mano el 04-08-2026)*
- [x] `015_task_assignment.sql` — `child_id` y `member_id` en `tasks`; sus dos triggers cross-family rechazan identificadores de otra familia *(validado el 06-08-2026)*
- [x] `016_document_expiry.sql` — `documents.expires_on`; columna nullable que no altera el aislamiento: `documents` sigue pasando lectura, escritura y Storage *(validado el 06-08-2026)*
- [x] `017_event_kind_descanso.sql` — amplía el `check` de `events.kind` a `descanso` *(aplicada y revalidada el 21-08-2026)*
- [x] `018_person_kind.sql` — `kind` en `children` (`hijo` | `adulto`), los adultos sin cuenta *(aplicada y revalidada el 21-08-2026; la columna se comprobó además leyéndola contra la base real)*
- [x] `019_meal_slots.sql` — `meal_slots` en `families`, qué franjas de comida se ven *(aplicada y validada el 24-08-2026, con siete comprobaciones propias en el arnés)*
- [x] `020_event_kind_festivo.sql` — `kind` admite `festivo` y su restricción de rango *(aplicada y validada el 26-08-2026, con cinco comprobaciones propias en el arnés)*
- [x] `021_list_item_quantity.sql` — `quantity` en `list_items`, cuántas unidades hacen falta *(aplicada y validada el 26-08-2026, con seis comprobaciones propias en el arnés)*

## Validación RLS

- [x] Usuario A puede ver datos de familia A.
- [x] Usuario A no puede ver datos de familia B.
- [x] Usuario B puede ver datos de familia B.
- [x] Usuario B no puede ver datos de familia A.
- [x] Miembro no admin no puede gestionar miembros.
- [x] Miembro no admin no puede gestionar invitaciones.

Tablas cubiertas, comprobando que B recibe 0 filas de la familia de A:

- [x] `families` — B no la ve; su UPDATE afecta a 0 filas
- [x] `family_members` — B no puede auto-insertarse (error de la BD)
- [x] `family_invites` — B recibe 403 al intentar invitar en la familia de A
- [x] `children`
- [x] `events`
- [x] `tasks` — además, el DELETE de B sobre una tarea de A afecta a 0 filas
- [x] `lists`
- [x] `list_items`
- [x] `meal_plans`
- [x] `documents`

Detalle importante: los intentos de lectura ajena **no dan error, devuelven lista vacía**, que es el comportamiento correcto de RLS. Los de escritura sí devuelven 403.

## Validación RPCs

- [x] `create_family_with_admin` — crea la familia y deja al llamante como `admin`
- [x] `update_family_member_profile` — A edita su nombre y color; el color queda guardado, un nombre vacío se rechaza y B (admin solo de su familia) no puede tocar el perfil de A
  *(sustituyó el 04-08-2026 a `update_my_family_profile`, migración 014; validada con el arnés el 06-08-2026)*
- [x] `remove_family_member`
- [x] `update_family_member_role`
- [x] `accept_family_invite`

Casos obligatorios:

- [x] No se puede borrar al último admin (400).
- [x] No se puede degradar al último admin (400).
- [x] Un usuario ajeno no puede eliminar ni cambiar el rol de miembros de otra familia.
- [x] Una invitación pendiente solo la puede aceptar el email invitado.
- [x] Aceptar invitación crea `family_member` y marca la invitación como `accepted`.
- [x] Tras aceptar, el nuevo miembro **sí** ve los datos de la familia, y como no-admin no puede eliminar miembros ni invitar.

## Validación Storage — retirada (27-08-2026)

Aquí había **diez comprobaciones** del bucket privado `documents`: que existía y no era
público, que un miembro subía, firmaba, descargaba y borraba, y que un ajeno no podía
firmar, descargar, listar ni borrar aunque conociera la ruta exacta. Todas pasaron en la
pasada del 27-08-2026, y después el bucket se borró: los archivos viven en el Google Drive
de quien los sube y los sirve Nido.

Se retiran porque no quedaba nada que comprobar, no porque dejaran de importar. Lo que
cubre ahora ese terreno son las dos secciones siguientes, y el aislamiento que probaban
—conocer el identificador de un archivo no da acceso a él— se comprueba igual, con el
`fileId` de Drive en vez de con la ruta del bucket.

## Validación de las conexiones de almacenamiento

La tabla `storage_connections` guarda los permisos de Google Drive de cada persona, con
los tokens cifrados. Tiene RLS activada y **ninguna policy**, a propósito: solo entra el
service role desde una ruta API. Es la comprobación que no puede fallar de todo el
documento — dentro hay refresh tokens, y la CSP de Nido lleva `'unsafe-inline'` en los
scripts, así que no para un XSS en línea.

- [x] El service role **sí** puede sembrar una conexión (201). Por ahí entran las rutas API.
- [x] A **no** puede leer **su propia** conexión. Es el caso que parece inofensivo y no lo es.
- [x] B, que está en la misma familia, **no** puede leer la conexión de A.
- [x] Un ajeno **no** ve nada al listar la tabla entera.
- [x] A **no** puede insertarse una conexión a mano.
- [x] A **no** puede borrar su conexión por PostgREST. Desconectar se hace por
      `DELETE /api/documents/providers`, que además revoca el permiso en Google.
- [x] El `check` de `provider` rechaza un proveedor que no existe (`dropbox`), que es lo
      que habrá que ampliar el día que se añada de verdad.

## Validación de los documentos en Drive

- [x] Un miembro crea un documento con `storage_owner` (201).
- [x] `storage_provider` vale `google_drive` por defecto, sin que la app lo mande.
- [x] El `check` rechaza un proveedor inventado.
- [x] Un ajeno **no** ve el documento aunque conozca su identificador de archivo de Drive.
      Es lo que sostiene el modelo proxy: el identificador no es un secreto, el acceso lo
      decide la RLS.

## Validación Integridad

- [x] No se puede crear `list_item` con `family_id` de una familia y `list_id` de otra.
- [x] No se puede crear `event` con `child_id` de otra familia.
- [x] No se puede crear `document` con `child_id` de otra familia.
- [x] No se puede crear `task` con `child_id` de otra familia.
- [x] No se puede crear `task` con `member_id` de otra familia.

Los cinco devuelven 400 desde el trigger. Los tres primeros vienen de
`007_cross_family_integrity.sql`; los dos de `tasks`, de `015_task_assignment.sql`.

## Resultado

**El aislamiento entre familias funciona.** Un usuario solo ve y escribe en las familias donde figura en `family_members`; lo demás le resulta invisible en lectura y prohibido en escritura. La regla del último admin la aplica el servidor, no solo la UI. Los triggers de integridad impiden mezclar identificadores entre familias.

**Ya no hay Storage que aislar.** El bucket se borró el 27-08-2026 tras comprobar por
última vez que aislaba bien. Lo que hay que sostener ahora es lo mismo dicho de otra
forma: conocer el identificador de un archivo de Drive no da acceso al documento — lo
decide la RLS, y el proveedor solo es el disco.

**Los tokens de Google Drive no salen de la base.** `storage_connections` no se puede leer
por PostgREST con ninguna sesión de usuario, ni siquiera la del dueño de la fila. Solo entra
el service role, y solo desde una ruta API que antes comprueba con el cliente del usuario
que puede ver el documento del que cuelga el token.

**No queda nada pendiente.** El esquema está validado y la pasada del 27-08-2026 no dejó
ninguna comprobación en rojo: 80/80.

## Pendiente

Nada. Volver a ejecutar `node scripts/validate-rls.mjs` y actualizar este documento la
próxima vez que se toque una migración, una policy o una RPC.

### Notas de la ejecución (27-08-2026)

- **80/80.** El esquema de los documentos en Google Drive se aplicó a mano en el SQL
  Editor ese día (las dos columnas de `documents` y la tabla `storage_connections`), y el
  arnés gana **dos secciones y once comprobaciones**.
- La **§11** (§12 en la pasada del 27) es la que justifica el cambio. `storage_connections` es la primera tabla del
  proyecto con RLS activada y **cero policies**, y eso es exactamente lo que hay que
  verificar: que no es un olvido que deje la puerta abierta, sino la puerta cerrada. Se
  prueba con A sobre **su propia fila** —el caso que parece inofensivo— y también con B,
  que está en su misma familia, y con C, que es ajeno. Los tres reciben cero filas.
  También se comprueba que A no puede insertar ni borrar por ahí: desconectar pasa por la
  ruta API, que además revoca el permiso del lado de Google.
- La fila de prueba se siembra con el service role, porque por el otro camino no hay forma
  de meterla — que es justo lo que se está comprobando.
- La **§12** cubre las dos columnas nuevas de `documents`. La que importa es la última: un
  ajeno **no** ve el documento aunque conozca su identificador de archivo de Drive. Es lo
  que sostiene el modelo proxy — el identificador viaja en la ficha y no es un secreto; lo
  que decide el acceso es la RLS, y el proveedor solo es el disco.
- El `check` de `storage_provider` rechaza un valor inventado y por defecto pone
  `google_drive`, así que las filas que ya existían quedan bien sin tocarlas.
- La sección de Storage (§8) se queda, con el título cambiado: el bucket ya no se usa pero
  sigue existiendo, y mientras exista se comprueba.

### Notas de la ejecución (26-08-2026)

- **69/69.** Se aplicaron a mano dos migraciones ese día y el arnés gana dos secciones.
- La **021** trae **seis comprobaciones** (§11). Tampoco tiene policy propia —una unidad
  es una columna más de `list_items`—, así que lo que se comprueba es el `default` y el
  `check`: que un ítem nace en 1 (lo que ya existía no cambia de significado), que se
  puede cambiar y queda guardado, que **el cero se rechaza** y que **pasarse del tope
  también**, y que tras los dos rechazos el valor sigue siendo el bueno. El tope lo acotan
  además los dos repositorios, para que el botón deje de subir en vez de rebotar aquí.
- La **020** trae **cinco comprobaciones** (§10). La 020 no trae policy propia —un festivo
  es una fila de `events` como las demás—, así que lo que hay que comprobar es que los
  dos `check` hacen su trabajo.
- Las cinco: que un festivo con rango se guarda, que un `kind` inventado se rechaza, que
  un festivo **sin día final** se rechaza y que uno **que no sea de día completo** también
  —las dos condiciones de `events_festivo_con_rango`, que es la red bajo lo que
  `validateEventDraft` ya exige en la app—, y que un ajeno no ve el festivo de otra
  familia, o sea que la RLS de siempre sigue cubriendo al tipo nuevo sin tocar nada.

### Notas de la ejecución (24-08-2026)

- **58/58.** La 019 se aplicó a mano en el SQL Editor ese día y el arnés gana **siete
  comprobaciones**, en una sección nueva (§9). Aquí sí valía la pena: la 019 no trae
  policy propia —reutiliza la de update de la 002— y eso es exactamente lo que hay que
  comprobar, que esa policy sigue diciendo «solo admin» ahora que hay una columna más que
  tocar.
- Las siete: que una familia nueva nace con las cuatro franjas (el `default` de la
  columna), que un admin las cambia y quedan guardadas, que el `check` rechaza una franja
  inventada y también quedarse sin ninguna, que **un miembro no admin no las puede
  cambiar** —B ya es miembro de la familia de A a esas alturas, así que es el caso real y
  no un ajeno— y que después de los dos rechazos el valor sigue siendo el bueno.
- El caso del array vacío es el que justificó usar `cardinality` en vez de
  `array_length` en el `check`: con el array vacío `array_length` devuelve null, un `check`
  que sale null se considera cumplido y `{}` se habría colado. Se ve rechazado en la
  ejecución, no solo en el razonamiento.

### Notas de la ejecución (21-08-2026)

- **51/51, el mismo recuento que el 06-08-2026**, y era lo esperado: la 017 y la 018 no
  tocan policies ni aislamiento. La 017 son dos `check` de `events` y la 018 una columna
  de `children`, tabla que ya se valida por las vías de siempre. `kind` no cambia quién
  ve qué, así que el arnés no gana comprobaciones.
- Que las dos migraciones estuvieran aplicadas se comprobó **leyendo la base real**:
  `children.kind` y `events.kind` responden 200 y devuelven `hijo` y `evento`. Los dos
  `check` (que `events.kind` acepte `descanso` y `children.kind` acepte `adulto`) no se
  pueden verificar sin escribir, así que ahí no hay comprobación automática: se ven al
  crear un descanso o un adulto desde la app.

### Notas de la ejecución (06-08-2026)

- Las cuatro comprobaciones nuevas pasaron a la primera. Las de los triggers de `tasks`
  eran las que más se querían ver: la 015 metió en `tasks` dos columnas que apuntan a
  otra tabla con `family_id`, y que el trigger estuviera escrito no probaba que saltara.
- La 016 no añade comprobación propia: `expires_on` es una columna nullable y el
  aislamiento de `documents` se sigue validando por las vías de siempre (RLS de lectura,
  403 en escritura ajena y las nueve de Storage).

### Notas de la ejecución (03-08-2026)

- Se detectó que `architecture.md` y `project-status.md` documentaban la RPC como `accept_family_invite(invite_id)`, cuando la migración y el código usan `p_invite_id`. Corregido.
- Dos versiones intermedias del arnés daban falsos positivos en Storage: primero por omitir el nombre del bucket en la ruta (todo fallaba, incluidas las operaciones legítimas) y después por usar como "ajeno" a un usuario que ya se había unido a la familia. Ambos casos servían de recordatorio de que una prueba que pasa no siempre prueba lo que dice.
