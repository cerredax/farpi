# Validación Supabase

Última ejecución: 2026-08-26. **63/63 comprobaciones correctas.**

Las 58 de la pasada del 24-08-2026 más las **cinco que trae la 020**, los festivos. Ya no
queda ninguna migración sin validar. La limpieza dejó en la base únicamente la familia
real; los tres usuarios y las dos familias de prueba se borraron.

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

## Validación Storage

- [x] Bucket `documents` existe.
- [x] Bucket `documents` es privado (`public = false`).
- [x] Path esperado: `{family_id}/{document_id}/{filename}` (lo impone `src/lib/supabase-repos/documents.ts`).
- [x] Un miembro de la familia sube, firma, descarga y borra su documento.
- [x] Un usuario ajeno **no** puede firmar el documento aunque conozca la ruta exacta.
- [x] Un usuario ajeno **no** puede descargarlo directamente.
- [x] Un usuario ajeno **no** ve nada al listar la carpeta de otra familia.
- [x] Un usuario ajeno **no** puede borrarlo.
- [x] Un miembro que se une por invitación **sí** pasa a poder firmarlo.

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

**Storage aísla igual que la base de datos.** Conocer la ruta exacta de un documento no sirve de nada desde fuera de la familia: no se puede firmar, ni descargar, ni listar, ni borrar. Y en cuanto alguien entra en la familia por invitación, pasa a tener acceso, que es el comportamiento esperado.

**No queda nada pendiente.** Las 20 migraciones están validadas y la pasada del
26-08-2026 no dejó ninguna comprobación en rojo: 63/63.

## Pendiente

Nada. Volver a ejecutar `node scripts/validate-rls.mjs` y actualizar este documento la
próxima vez que se toque una migración, una policy o una RPC.

### Notas de la ejecución (26-08-2026)

- **63/63.** La 020 se aplicó a mano en el SQL Editor y el arnés gana **cinco
  comprobaciones** en una sección nueva (§10). La 020 no trae policy propia —un festivo
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
