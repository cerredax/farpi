# Validación Supabase

Qué comprueba `scripts/validate-rls.mjs`, cómo lo comprueba y qué dio la última vez. El
relato de cada pasada —qué se rompió, qué se aprendió— está en el cuerpo del commit de ese
día; aquí queda el recuento y lo que sigue vigilándose.

## Última ejecución: 169/169 (05-09-2026, los ajustes de un fijo en un mes)

Con `fixed_entry_overrides` y el `coalesce` de `close_month_copy` aplicados en el proyecto
real. **169/169 comprobaciones correctas.**

Son las 165 anteriores más cuatro, todas de `fixed_entry_overrides`, la tabla que guarda lo
que un fijo costó en un mes suelto cuando no fue lo de siempre:

- **A crea un ajuste en su familia** y **B no lo ve**: la tabla entra en el barrido que
  recorre todas las tablas de contenido comprobando que nadie ve lo de otra casa. No es una
  tabla menor para esto — un ajuste dice cuánto se pagó de algo y en qué mes.
- **B no puede ajustar un fijo de la familia de A.** El equivalente al «B NO puede crear
  fijos en la familia de A» que ya había: la escritura, no solo la lectura.
- **Rechaza un ajuste sobre un fijo de otra familia.** Es la que había que escribir sí o sí:
  la fila lleva `family_id` propio —para que su policy sea
  `family_id in (select my_family_ids())` y no un `exists` contra `fixed_entries`—, y eso
  abre la puerta a insertar un `family_id` propio apuntando al fijo de otro. La RLS sola lo
  dejaría pasar: la fila **es** de tu familia. Lo para `trg_fixed_entry_override_family`,
  mismo patrón que los pares de asignación.

El `coalesce` de `close_month_copy` —que un mes se cierre con el importe ajustado y no con
la referencia— no lo cubre el arnés: es comportamiento, no permisos, y lo prueban los tests
unitarios de `plantillaDelMes` y del mock.

## Cómo se valida

Backend validado contra el proyecto real con cuatro usuarios y tres familias de prueba,
creados y eliminados durante la ejecución. **Los datos reales de la familia no se tocan.**

**Método.** En lugar de `set role` desde el SQL Editor, las pruebas se ejecutan con
**sesiones de usuario reales**: se autentican los usuarios, se obtiene su JWT y se ataca la
API REST con él. Es el mismo trayecto que recorre la app (JWT → PostgREST → RLS), así que
valida también que las policies se aplican con el token del usuario y no solo a nivel de rol
de base de datos.

**Cuatro usuarios, no dos.** A y B empiezan en familias distintas, pero en la sección de
invitaciones B acepta unirse a la familia de A y deja de ser ajeno. Por eso existe un tercer
usuario C que nunca entra en ninguna familia: es el que prueba el aislamiento a partir de ese
punto, y sin él media suite pasaría por el motivo equivocado. El cuarto, D, nace **después**
de escribirse una invitación: prueba que registrarse con el correo de otra persona al ver su
`invite_id` no abre ninguna puerta, y sirve además para lo contrario —borrar su cuenta
teniendo un papel suyo en una familia que sigue viva—, que es el caso que tiene que
**funcionar**.

**Y el orden de la limpieza importa.** Borra las familias **antes** que los usuarios, y con
la familia se van las fichas en cascada; así, cuando le toca el turno al usuario, ya no queda
nada apuntando a él. Eso es un orden que la app no recorre, y durante un tiempo escondió un
fallo real: las comprobaciones que tocan el borrado de cuenta usan a D y una ficha que se
queda en una familia viva, que es el orden de verdad.

Repetible con `node scripts/validate-rls.mjs`. Hay que ejecutarlo después de tocar una
migración, una policy o una RPC. No se incluyen aquí URLs privadas, claves ni datos
personales.

## Qué se comprueba

### RLS

- [x] Usuario A puede ver datos de familia A.
- [x] Usuario A no puede ver datos de familia B.
- [x] Usuario B puede ver datos de familia B.
- [x] Usuario B no puede ver datos de familia A.
- [x] Miembro no admin no puede gestionar miembros.
- [x] Miembro no admin no puede gestionar invitaciones.

Tablas cubiertas, comprobando que B recibe 0 filas de la familia de A:

- [x] `families` — B no la ve; su UPDATE afecta a 0 filas
- [x] `family_members` — **no inserta nadie**: ni B a sí mismo, ni un admin metiendo a un
      tercero a mano en su propia familia. La tabla se quedó solo con `select`; las altas de
      verdad las escriben `create_family_with_admin` y `accept_family_invite`, que son
      `security definer` y comprueban lo suyo antes
- [x] `family_invites` — B recibe 403 al intentar invitar en la familia de A
- [x] `children`
- [x] `events`
- [x] `tasks` — además, el DELETE de B sobre una tarea de A afecta a 0 filas
- [x] `lists`
- [x] `list_items`
- [x] `meal_plans`
- [x] `documents`
- [x] `notes`
- [x] `fixed_entries` — la tabla con lo que cobra cada uno, así que pesa más que las otras
- [x] `fixed_entry_overrides`
- [x] `budgets`
- [x] `expenses` — además, el POST de B en la familia de A se rechaza
- [x] `quotes`

Detalle importante: los intentos de lectura ajena **no dan error, devuelven lista vacía**,
que es el comportamiento correcto de RLS. Los de escritura sí devuelven 403.

### RPCs

- [x] `create_family_with_admin` — crea la familia y deja al llamante como `admin`
- [x] `update_family_member_profile` — A edita su nombre y color; el color queda guardado, un
      nombre vacío se rechaza y B (admin solo de su familia) no puede tocar el perfil de A
- [x] `remove_family_member`
- [x] `update_family_member_role`
- [x] `accept_family_invite`

Casos obligatorios:

- [x] No se puede borrar al último admin (400).
- [x] No se puede degradar al último admin (400).
- [x] Un usuario ajeno no puede eliminar ni cambiar el rol de miembros de otra familia.
- [x] Una invitación pendiente solo la puede aceptar el email invitado.
- [x] Una invitación de más de **30 días** ya no vale, aunque el correo cuadre.
- [x] Y una cuenta creada **después** de escribirse la invitación tampoco puede aceptarla,
      aunque el correo cuadre: es el registro oportunista de quien ve el `invite_id` en la
      URL de vuelta y se apunta con el correo ajeno.
- [x] Aceptar invitación crea `family_member` y marca la invitación como `accepted`.
- [x] Tras aceptar, el nuevo miembro **sí** ve los datos de la familia, y como no-admin no
      puede eliminar miembros ni invitar.

### Las conexiones de almacenamiento

La tabla `storage_connections` guarda los permisos de Google Drive de cada persona, con los
tokens cifrados. Tiene RLS activada y **ninguna policy**, a propósito: solo entra el service
role desde una ruta API. Es la comprobación que no puede fallar de todo el documento —dentro
hay refresh tokens, y la CSP de Farpi lleva `'unsafe-inline'` en los scripts, así que no para
un XSS en línea—.

- [x] El service role **sí** puede sembrar una conexión (201). Por ahí entran las rutas API.
- [x] A **no** puede leer **su propia** conexión. Es el caso que parece inofensivo y no lo es.
- [x] B, que está en la misma familia, **no** puede leer la conexión de A.
- [x] Un ajeno **no** ve nada al listar la tabla entera.
- [x] A **no** puede insertarse una conexión a mano.
- [x] A **no** puede borrar su conexión por PostgREST. Desconectar se hace por
      `DELETE /api/documents/providers`, que además revoca el permiso en Google.
- [x] El `check` de `provider` rechaza un proveedor que no existe (`dropbox`), que es lo que
      habrá que ampliar el día que se añada de verdad.

### Los documentos en Drive

- [x] Un miembro crea un documento con `storage_owner` (201).
- [x] `storage_provider` vale `google_drive` por defecto, sin que la app lo mande.
- [x] El `check` rechaza un proveedor inventado.
- [x] Un ajeno **no** ve el documento aunque conozca su identificador de archivo de Drive. Es
      lo que sostiene el modelo proxy: el identificador no es un secreto, el acceso lo decide
      la RLS.
- [x] Un miembro de la casa **no** puede crear una ficha que apunte al Drive de otro.
- [x] Ni cambiarle el dueño a una ficha que ya existe, ni ponérselo a nulo, ni reclamarla
      para sí, ni mover la ficha a otro archivo: las cuatro fallan contra el trigger
      `trg_document_storage_inmutable`, y al terminar el dueño y la ruta siguen siendo los de
      quien subió el papel.
- [x] **Pero renombrar la ficha lo sigue pudiendo cualquier miembro.** Es lo que hace la app,
      y es la comprobación que descubrió que la policy `for all` lo había roto.
- [x] Borrar la cuenta de quien subió un papel a una familia que le sobrevive **funciona**, y
      su ficha se queda en la casa sin dueño. Es la pareja de las cuatro de arriba por el otro
      lado: aquellas dicen qué no se puede tocar, y esta, qué no se puede romper por cerrarlo.

> **Aquí hubo diez comprobaciones del bucket privado `documents`** —que existía y no era
> público, que un miembro subía, firmaba, descargaba y borraba, y que un ajeno no podía
> firmar, descargar, listar ni borrar aunque conociera la ruta exacta—. Todas pasaron en la
> pasada del 27-08-2026 y después el bucket se borró. Se retiraron porque no quedaba nada que
> comprobar, no porque dejaran de importar: lo que probaban —conocer el identificador de un
> archivo no da acceso a él— se comprueba igual, con el `fileId` de Drive en vez de con la
> ruta del bucket.

### Integridad

- [x] No se puede crear `list_item` con `family_id` de una familia y `list_id` de otra.
- [x] No se puede crear `event` con `child_id` de otra familia.
- [x] No se puede crear `document` con `child_id` de otra familia.
- [x] No se puede crear `task` con `child_id` de otra familia.
- [x] No se puede crear `task` con `member_id` de otra familia.
- [x] No se puede crear `expense` con `budget_id` de otra familia.
- [x] No se puede crear `expense` con `child_id` de otra familia.
- [x] No se puede crear `expense` con `member_id` de otra familia.
- [x] No se puede crear `fixed_entry` con `child_id` de otra familia.
- [x] No se puede crear `fixed_entry` con `member_id` de otra familia.
- [x] No se puede crear `fixed_entry_override` sobre un fijo de otra familia.

Todos devuelven 400 desde el trigger. Son el mismo patrón repetido, que es justo lo que se
quería: **nada puede señalar a nada que no sea de su casa.**

## Resultado

**El aislamiento entre familias funciona.** Un usuario solo ve y escribe en las familias
donde figura en `family_members`; lo demás le resulta invisible en lectura y prohibido en
escritura. La regla del último admin la aplica el servidor, no solo la UI. Los triggers de
integridad impiden mezclar identificadores entre familias.

**Ya no hay Storage que aislar.** El bucket se borró el 27-08-2026 tras comprobar por última
vez que aislaba bien. Lo que hay que sostener ahora es lo mismo dicho de otra forma: conocer
el identificador de un archivo de Drive no da acceso al documento — lo decide la RLS, y el
proveedor solo es el disco.

**Los tokens de Google Drive no salen de la base.** `storage_connections` no se puede leer
por PostgREST con ninguna sesión de usuario, ni siquiera la del dueño de la fila. Solo entra
el service role, y solo desde una ruta API que antes comprueba con el cliente del usuario que
puede ver el documento del que cuelga el token.

## Las pasadas anteriores

El recuento sube con cada cambio de esquema, así que la cifra sola no dice nada: lo que dice
algo es que ninguna se quedó en rojo.

| Fecha | Recuento | Qué entró |
|---|---|---|
| 05-09-2026 | **169/169** | `fixed_entry_overrides`: el ajuste de un fijo en un mes suelto |
| 04-09-2026 | 165/165 | el borrado de cuenta, que el trigger del día anterior había roto |
| 03-09-2026 | 163/163 | la revisión de seguridad a la contra, en cuatro tandas (163, 154, 152 y 149) |
| 02-09-2026 | 139/139 | los meses cerrados de Finanzas |
| 02-09-2026 | 117/117 | la franja del comedor con sus platos, y las once carpetas de documentos |
| 01-09-2026 | 106/106 | la reforma de los fijos: `fixed_entries` y `expenses.kind` |
| 01-09-2026 | 99/99 | las tres tablas de Finanzas: `budgets`, `expenses`, `quotes` |
| 27-08-2026 | 80/80 | los documentos en Google Drive, y el bucket retirado |
| 26-08-2026 | 69/69 | el festivo y las unidades de la lista de la compra |
| 24-08-2026 | 58/58 | las franjas de comida por familia |
| 21-08-2026 | 51/51 | el descanso y los adultos sin cuenta (sin comprobación nueva) |
| 06-08-2026 | 51/51 | la asignación de tareas y la caducidad de los documentos |
| 03-08-2026 | 47/47 | la primera pasada completa |

Dos cosas que aquellas pasadas dejaron escritas y conviene no volver a aprender:

- **Una prueba que pasa no siempre prueba lo que dice.** Dos versiones intermedias del arnés
  daban falsos positivos —una por omitir el nombre del bucket en la ruta, con lo que fallaba
  todo, incluidas las operaciones legítimas; otra por usar como «ajeno» a un usuario que ya se
  había unido a la familia—.
- **Que un trigger esté escrito no prueba que salte.** Cada vez que una clave nueva apunta a
  otra tabla con `family_id`, la comprobación se escribe y se ve fallar el caso malo.

## Pendiente

Nada. Volver a ejecutar `node scripts/validate-rls.mjs` y actualizar este documento la
próxima vez que se toque una migración, una policy o una RPC.
