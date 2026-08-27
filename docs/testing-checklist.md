# Checklist de pruebas manuales

Ejecutar en modo demo, sin Supabase configurado, en móvil o DevTools con ancho aproximado de 390 px.

## 0. Validación técnica

- [ ] `npm run lint` termina sin errores y sin warnings relevantes.
- [ ] `npm run build` termina correctamente.
- [ ] `npm run test:unit` — los tests de lógica pura, sin servidor (~2 s).
- [ ] `npm run test:e2e` — la suite entera: los unitarios más los de navegador.
- [ ] No hay archivos temporales afectando a lint.

## 1. Login demo

- [ ] `/auth/login` muestra modo demo.
- [ ] Entrar en demo redirige a `/home`.
- [ ] Inicio carga sin errores.

## 2. Navegación

> Lo de esta lista que se puede comprobar sin teléfono ya está automatizado:
> `e2e/movil.spec.ts` corre las siete pantallas a 390×844 y falla si algo
> desborda a lo ancho o si aparece un control por debajo de 24×24 px. Lo que
> queda aquí es lo que hay que mirar con el móvil en la mano.

- [ ] La barra de abajo muestra las seis secciones: Inicio, Calendario, Listas, Tareas,
      Comidas y Docs. Documentos sale abreviado a «Docs» **solo aquí**: a 390 px no cabe
      entero. En la barra lateral de escritorio se lee «Documentos».
- [ ] La ruta activa se resalta correctamente.
- [ ] Ajustes **no** está en la barra de abajo ni en la rueda de la cabecera: vive al
      final de Inicio, después de todo lo demás (26-08-2026).
- [ ] La barra de abajo no tapa contenido.

## 3. Inicio

- [ ] Muestra fecha actual.
- [ ] Muestra eventos de hoy.
- [ ] Muestra comidas de hoy.
- [ ] Muestra tareas pendientes.
- [ ] Muestra listas pendientes.
- [ ] Permite marcar tareas desde Inicio.
- [ ] Permite marcar ítems de lista desde Inicio.
- [ ] Muestra próximos eventos ordenados.
- [ ] En "Esta semana", cada evento lleva el punto de color de quien lo tiene; los de toda la familia, el amarillo.
- [ ] Un ítem de lista con más de una unidad enseña «×3» detrás del nombre. Con una sola
      no se escribe nada, que «×1» es decir lo que ya dice la fila.
- [ ] **Ni las vacaciones, ni los descansos, ni los festivos salen aquí**, ni en "hoy" ni
      en "esta semana". No son planes: dicen quién no está o que el día no es de nadie, y
      su sitio es el calendario. Apunta un festivo para hoy y comprueba que no aparece.
- [ ] **Cumpleaños.** Ponle a un hijo la fecha de nacimiento de hoy (cambiando el año) en
      Ajustes: el cumpleaños abre la tarjeta de hoy, con la tarta y su color, y dice los
      años que cumple. Ponle a otra persona una fecha dentro de la semana que viene: sale
      en el bloque «Cumpleaños», y el de hoy **no** se repite ahí. Con una fecha a dos
      meses vista, el bloque no aparece (la ventana es de catorce días).
- [ ] Abajo del todo, el enlace a Ajustes (solo en móvil; en escritorio está en la barra
      lateral).

## 4. Calendario

> Rehecho entero el 25 y el 26 de agosto de 2026. Lo que había aquí antes describía la
> pantalla vieja —una tira de siete días, un selector `Agenda | Mes`, las puntas del mes
> en blanco— y mandaba comprobar justo lo contrario de lo que hay.
>
> Automatizado en `e2e/escritorio.spec.ts`: las tres vistas de escritorio, que un título
> escrito en la celda del mes abre su evento, la franja de una ausencia y el nombre de un
> festivo (con y sin nombre propio). Lo de aquí es lo que hay que mirar con los ojos.

### Las vistas

- [ ] En móvil hay cuatro pestañas: **Agenda, Día, Semana y Mes**. En escritorio, tres:
      **Día, Semana y Mes** (la agenda no está: para eso está el mes con sus títulos).
- [ ] **Las dos abren en Mes.**
- [ ] Cambiar de vista en el móvil no cambia la del escritorio, ni al revés: son dos
      estados separados. Se comprueba estrechando y ensanchando la ventana.
- [ ] La cabecera dice dónde estás según la vista: el mes en Mes, el día entero en Día
      («Miércoles, 26 de agosto») y el tramo en Semana («24 – 30 de agosto»; si
      el tramo cruza de mes, el extremo de la izquierda lleva también el suyo).
- [ ] Las flechas recorren lo que se está viendo: meses en Mes, semanas en Semana y días
      en Día.
- [ ] El `+` de la cabecera crea un evento para el día elegido.

### La rejilla del mes

- [ ] **Las puntas se pintan, rellenas en gris y con el número tenue.** Si el mes empieza
      en martes, el lunes de esa fila es el 31 del anterior y se ve, para que la semana no
      quede cortada. No son botones y no enseñan nada de lo que pasa ese día.
- [ ] Los fines de semana y los festivos llevan **trama diagonal**, la misma para los dos:
      dicen lo mismo, que ese día no se trabaja.
- [ ] En escritorio la rejilla se ve como una rejilla, con sus líneas. En móvil no hay
      líneas: es la misma cuadrícula sin el dibujo.
- [ ] En escritorio, los títulos de los eventos se escriben dentro de la celda y **se
      pueden pulsar** para abrirlos. En móvil, en su lugar van las marcas de color.
- [ ] Un festivo escribe su nombre en la celda **solo si tiene uno propio** («Hispanidad»).
      Un festivo sin título no escribe «FESTIVO»: eso ya lo dice la trama.

### Vacaciones y descansos

- [ ] Se ven como una **franja sobre un carril gris**, redondeada solo en los extremos del
      tramo, sin cortes entre días. El color dice de quién es; nunca qué es ni si lo hay.
- [ ] Como mucho dos por celda.
- [ ] El bloque «Vacaciones y descansos» dice el nombre de la persona y su estado:
      «de vacaciones hasta el 28 ago», «descansa hoy», «descansa del 3 al 4 sep».
- [ ] Una ausencia de varios días sale **una vez** en el bloque, no una por día, y no
      aparece como fila en la agenda.
- [ ] Se editan desde ese bloque, que es el único sitio.
- [ ] El bloque solo anuncia ausencias del tramo que se está pintando: mirando agosto no
      aparece un descanso de septiembre.

### Día y Semana (el eje de horas)

- [ ] **El día entra entero sin cortarse**: el alto de la hora se calcula para que quepa.
- [ ] El eje cubre de siete de la mañana a diez de la noche como mínimo, y se estira si
      hay algo antes o después.
- [ ] Lo que se solapa se reparte en columnas, sin taparse.
- [ ] Cada bloque dice el título y, debajo, la hora y de quién es. **También cuando el
      evento no tiene hora de fin**, que es el caso más común.
- [ ] La raya de la hora actual cruza el eje sin tachar los títulos.
- [ ] Las ausencias y los festivos van arriba, fuera del eje: no ocupan horas.

### Lo de siempre

- [ ] Se puede crear, editar y borrar un evento; el borrado pide doble confirmación.
- [ ] Los eventos de los hijos usan su color.
- [ ] Un evento de todo el día no se desplaza de día.
- [ ] **Al editar unas vacaciones, la fecha de inicio no retrocede un día.** Falló solo
      contra Supabase, nunca en modo demo, así que esto hay que mirarlo con datos reales.
- [ ] En la agenda salen también las tareas que vencen, y se pueden marcar allí.
- [ ] Una tarea vencida antes de hoy aparece en el día de hoy marcada como «Atrasada».
- [ ] El buscador vive en la pestaña **Agenda** y solo aparece a partir de unos cuantos
      eventos (`MINIMO_PARA_BUSCAR`). Encuentra los pasados, no solo los del tramo
      pintado, y al vaciarlo se vuelve al día en el que estabas.
- [ ] Al apuntar un evento, el tipo se elige en un desplegable: Evento, Vacaciones,
      Descanso o Festivo. Los tres últimos ocupan días completos y piden fecha final; solo
      el evento exige título.

## 5. Tareas

- [ ] Se puede crear tarea.
- [ ] Se puede editar tarea.
- [ ] Se puede completar y descompletar.
- [ ] Se puede borrar con doble confirmación.
- [ ] Las prioridades se distinguen visualmente.
- [ ] Al marcar una tarea sale el aviso "Hecho · Deshacer" y se va solo a los 6 s.
- [ ] Deshacer devuelve la tarea: la normal se desmarca y la que se repite recupera su fecha.
- [ ] Se puede asignar una tarea a un adulto o a un hijo, y el nombre sale en la lista.
- [ ] El buscador de tareas aparece al pasar de 5 y filtra por título y notas.

## 6. Listas

- [ ] Se muestran listas iniciales.
- [ ] Se puede crear lista.
- [ ] Se puede editar lista.
- [ ] Se puede borrar lista.
- [ ] Se puede abrir detalle.
- [ ] Se puede crear ítem.
- [ ] Se puede editar ítem.
- [ ] Marcar un ítem lo baja al catálogo ("Apuntar de lo de siempre"), que sale abierto al entrar en la lista y se puede plegar a mano.
- [ ] En el catálogo el botón es un `+`, no un tic: vuelve a apuntar que hace falta.
- [ ] Se puede mover un ítem a otra lista; la lista en la que ya está no se ofrece.
- [ ] **Las unidades se cambian desde la propia fila**, con los botones de más y de menos,
      sin abrir nada: en el súper se toca con una mano.
- [ ] Un ítem nuevo arranca en 1, y en 1 no se escribe el número ni se ofrece el menos.
- [ ] El tope es 99: el botón de más se desactiva ahí.
- [ ] Lo que no cabe en un número («2 kg», «media docena») se sigue escribiendo en el
      nombre, que es donde tiene sentido leerlo.
- [ ] Se puede borrar ítem.

## 7. Comidas

- [ ] Vista Hoy funciona.
- [ ] Vista Semana funciona.
- [ ] Se puede crear comida.
- [ ] Se puede editar comida.
- [ ] Se puede borrar comida.
- [ ] Fecha por defecto usa fecha local.
- [ ] No se crean duplicados por familia, fecha y slot.
- [ ] Si un slot ya existe, el comportamiento de actualización queda claro.
- [ ] Ajustes → Comidas: apagar una franja la quita de la semana, de "Hoy", del menú de
      Inicio y del formulario. Encenderla otra vez devuelve lo que hubiera apuntado en ella.
- [ ] La última franja encendida no se puede apagar y la fila lo explica.
- [ ] Con varios móviles: el cambio se ve en el otro al recargar (es de la familia, no del
      dispositivo).
- [ ] Con una cuenta que no es admin de la familia, el interruptor da error al guardar (el
      mismo límite que renombrar la familia).

## 8. Documentos

- [ ] Se muestran documentos mock.
- [ ] Se puede crear documento mock.
- [ ] Se puede editar documento.
- [ ] Se puede borrar documento.
- [ ] Se puede asociar documento a familia o hijo.
- [ ] Filtros por categoría funcionan.
- [ ] El buscador filtra por nombre y descripción, y manda sobre la categoría abierta.
- [ ] Un documento con caducidad la enseña en su tarjeta: ámbar dentro de 30 días, rojo si ya pasó.
- [ ] Solo se aceptan PDF, JPG y PNG.
- [ ] Archivo inválido muestra error.
- [ ] Archivo mayor de 20 MB muestra error.
- [ ] Queda claro que en demo no se sube contenido real.
- [ ] En demo, el sheet **no** ofrece "Conectar Google Drive" (no hay a qué conectarse).

### 8.1 Google Drive — solo con credenciales reales

> Estado (27-08-2026): desplegado y en uso. Conectar y subir funcionan. **Sin
> comprobar todavía**: abrir desde una segunda cuenta sin Drive conectado, y subir un
> archivo de 10-15 MB. Son los dos puntos marcados en negrita más abajo.

Esto no lo cubre Playwright y no puede: la suite corre en modo demo forzado y sin
credenciales, así que el viaje a Google no se puede automatizar. Es la parte que hay
que recorrer a mano, y **contra el build servido** (`npm run build && npm run start`),
no contra `npm run dev`: la CSP no sirve lo mismo en los dos.

Hace falta un segundo usuario en la misma familia para probar lo que importa de
verdad, que es que el otro vea el documento sin conectar nada.

- [ ] Sin Drive conectado, el sheet de crear enseña "Conectar Google Drive" en el
      hueco del selector de archivo, y el botón de guardar está apagado.
- [ ] Al conectar, Google pide permiso **solo** para "ver y gestionar los archivos
      de Drive que abras o crees con esta app" (eso es `drive.file`). Si pide más,
      parar: el scope está mal.
- [ ] Al volver, `/docs` dice que se conectó y el sheet ya deja elegir archivo.
- [ ] Subir un PDF pequeño: aparece en la lista y en el Drive del que sube, dentro
      de una carpeta llamada **Nido**.
- [ ] **Subir uno grande, de 10-15 MB.** Es la comprobación que justifica que la
      subida vaya directa del navegador a Google: por el servidor no cabría.
- [ ] Abrirlo desde **la otra cuenta** de la familia, que no tiene Drive conectado:
      se abre igual y en ningún momento se le pide nada.
- [ ] La otra cuenta borra el documento: desaparece de la lista y también del Drive
      del dueño.
- [ ] En Ajustes → Cuenta y seguridad, la tarjeta de Google Drive dice con qué correo
      está conectado. A la otra cuenta, que no ha conectado nada, **no le sale**.
- [ ] Desconectar desde Ajustes. Los archivos siguen en el Drive del dueño.
- [ ] Con la conexión deshecha, la otra cuenta intenta abrir un documento: el aviso
      **nombra al dueño** y dice que tiene que volver a conectar. Que no diga solo
      "no se pudo abrir": así no se sabe a quién avisar.
- [ ] Volver a conectar: los mismos documentos se abren otra vez, sin resubir nada.
- [ ] Borrar a mano el archivo desde el Drive del dueño: el aviso es **distinto**
      («ya no está en el Drive de…»), no el de reconectar.
- [ ] En Ajustes, al abrir a un miembro que ha subido documentos, sale el aviso con
      el recuento antes de poder quitarlo de la familia.
- [ ] Con `npm run start`, recorrer las rutas escuchando `securitypolicyviolation`:
      la subida a `www.googleapis.com` no debe disparar ninguna.

## 9. Ajustes - familias

- [ ] Se puede editar nombre de familia.
- [ ] Se puede crear nueva familia.
- [ ] Nueva familia crea adulto admin inicial.
- [ ] Se puede cambiar familia activa.
- [ ] Recargar conserva familia activa.
- [ ] Datos de una familia no aparecen en otra.
- [x] Se puede eliminar una familia creada de más (automatizado en `e2e/smoke.spec.ts`:
      se crea, se borra y la app salta sola a la que queda).
- [ ] Con una sola familia, el sheet no ofrece eliminar y explica por qué.
- [ ] Con credenciales reales: quien no es admin de esa familia no puede cerrarla.

## 10. Ajustes - miembros e invitaciones

- [ ] Miembros e invitaciones aparecen separados.
- [ ] Se puede invitar por email.
- [ ] Se puede cancelar invitación.
- [ ] Se puede editar miembro.
- [ ] Se puede quitar miembro.
- [ ] Revisar regla de último admin antes de producción.

## 11. Ajustes - hijos y otros adultos

Los dos bloques son la misma tabla (`children`, con `kind`), así que lo de abajo se
comprueba en los dos.

- [ ] Se puede añadir hijo.
- [ ] Fecha de nacimiento puede quedar vacía si el modelo lo permite.
- [ ] Se puede editar hijo.
- [ ] Se puede borrar hijo.
- [ ] Al borrar hijo, eventos relacionados pasan a sin hijo.
- [ ] Al borrar hijo, documentos relacionados pasan a sin hijo.

Y de los adultos sin cuenta, que es lo que la 018 añadió. El alta y que salgan en
«asignar a» están automatizados en `e2e/runtime.spec.ts` («un adulto sin cuenta se da
de alta en Ajustes y se puede asignar»); el resto, a mano:

- [ ] «Adultos sin cuenta» sale entre «Adultos con cuenta» e «Hijos», dentro del bloque
      «Personas» y con su propio botón. El vacío dice «Aún no hay adultos sin cuenta».
- [ ] Se puede añadir un adulto sin correo, con nombre y color.
- [ ] El sheet avisa de que no entra en la app ni recibe invitación.
- [ ] Sale en «asignar a» con los adultos, no al final con los hijos.
- [ ] No aparece en la lista de Hijos ni cuenta como hijo en la tarjeta de la familia.
- [ ] Se puede editar y borrar, y al borrarlo lo suyo queda sin asignar.
- [ ] Un adulto sin cuenta no recibe invitación ni puede iniciar sesión.

## 11.1 Copia de seguridad

Lo automatiza `e2e/runtime.spec.ts`, que descarga el archivo y lo lee. Lo que queda a
mano es el navegador de verdad, porque las descargas de un blob son de las cosas que
cada uno hace a su manera:

- [ ] En Ajustes → Tu familia, el botón descarga un `.json` con el nombre de la
      familia y la fecha de hoy.
- [ ] El recuento que sale bajo el botón cuadra con lo que hay en la app.
- [ ] **En el iPhone, con Nido instalado como PWA.** Es el caso que más falla: las
      descargas de blob dentro de una app instalada no se comportan como en Safari.
- [ ] Abrir el archivo y comprobar que **no** aparece `refresh_token`,
      `access_token` ni `storage_connections`.

## 12. Reset demo

- [ ] Reset pide confirmación.
- [ ] Tras confirmar, vuelve estado inicial.
- [ ] No quedan sheets abiertos ni estados raros.

## 13. Responsive

- [ ] Sheets caben en móvil pequeño.
- [ ] Sheets tienen scroll interno.
- [ ] Botones principales son accesibles.
- [ ] El teclado no tapa campos críticos.

### Escritorio, desde 1024 px

> Automatizado en `e2e/escritorio.spec.ts`: la barra lateral a 1440 px, los siete días de
> Comidas sin arrastrar la rejilla, y que a 1023 px siga mandando la barra de abajo. Lo de
> aquí necesita un monitor de verdad.

- [ ] La barra lateral se ve entera sin scroll propio en una pantalla de portátil.
- [ ] La sección donde estás se distingue de un vistazo en la barra lateral.
- [ ] Al abrir un sheet, el velo cubre también la barra lateral.
- [ ] La cabecera de arriba no se solapa con la barra lateral.
- [ ] En Comidas, las siete columnas se leen sin apretarse demasiado a 1024 px justos.
- [ ] En un monitor grande (2560 px) la rejilla de Comidas no queda desproporcionada.
- [ ] En Tareas, dos columnas de pendientes y el recuento arriba ocupando el ancho.
- [ ] En Listas, el índice en rejilla; al abrir una lista, más ancha pero aún en columna.
- [ ] En Documentos, la rejilla de tarjetas y los cinco filtros sin arrastrar.
- [ ] En el calendario, las vistas Día y Semana enseñan el día entero sin cortarlo, y la
      rejilla del mes se ve con sus líneas.
- [ ] Ajustes sigue con el ancho de móvil centrado (`SettingsView` no tiene ni una
      variante `lg:`): se ve raro pero no roto. Es lo que queda del layout de escritorio.

## 14. Persistencia

- [ ] Crear datos y recargar mantiene cambios.
- [ ] Cambiar de familia conserva datos por familia.
- [ ] Reset limpia `localStorage` correctamente.

## 15. Supabase aislado

> Esta lista está **automatizada** en `scripts/validate-rls.mjs`, que la recorre con
> sesiones de usuario reales y crea y borra sus propios usuarios y familias de
> prueba. Ejecutarlo (`node scripts/validate-rls.mjs`) es más fiable que ir a mano, y
> es lo que pide `CLAUDE.md` después de tocar el esquema, una policy o una RPC. La
> última pasada fue de **80/80** (27-08-2026).
> Lo de abajo queda como referencia de qué cubre.

- [ ] `supabase/schema.sql` aplicado (sustituye a las 21 migraciones desde el 26-08-2026).
- [ ] Tablas, índices y triggers existen.
- [ ] RLS está activado en tablas privadas.
- [ ] RPC `create_family_with_admin` crea familia y miembro admin.
- [ ] RPC `update_family_member_profile`: uno mismo edita su nombre y color; un admin edita a otro de su familia; alguien de fuera no puede.
- [ ] RPC `remove_family_member` no permite borrar al último admin.
- [ ] RPC `update_family_member_role` no permite degradar al último admin.
- [ ] RPC `accept_family_invite` acepta una invitación pendiente del email autenticado.
- [ ] Usuario A no puede leer datos de familia B.
- [ ] Usuario B no puede leer datos de familia A.
- [ ] Miembro no admin no puede gestionar miembros ni invitaciones.
- [ ] Trigger rechaza `list_item` con `family_id` y `list_id` de familias distintas.
- [ ] Trigger rechaza `event` con `child_id` de otra familia.
- [ ] Trigger rechaza `document` con `child_id` de otra familia.
- [ ] Trigger rechaza `task` con `child_id` de otra familia.
- [ ] Trigger rechaza `task` con `member_id` de otra familia.
- [ ] `events.kind` solo acepta `evento`, `vacaciones`, `descanso` y `festivo`, y los tres
      últimos exigen día completo y fecha final.
- [ ] `list_items.quantity` solo acepta de 1 a 99.
- [x] ~~Bucket `documents`~~: **borrado el 27-08-2026**. No hay Storage que comprobar;
      los archivos viven en el Google Drive de quien los sube y los sirve Nido por
      `/api/documents/[id]/file`. Lo que lo cubre ahora son las dos comprobaciones de
      aquí abajo.
- [ ] **`storage_connections`: nadie la lee por PostgREST, ni su propia fila.** Es la
      comprobación que no puede fallar: dentro hay tokens de Google Drive, y la CSP
      no para un XSS en línea.
- [ ] `documents.storage_provider` solo acepta `google_drive`, y por defecto es eso.
- [ ] Resultados documentados en `docs/supabase-validation.md`.
