# Checklist de pruebas manuales

Ejecutar en modo demo, sin Supabase configurado, en móvil o DevTools con ancho aproximado de 390 px.

## 0. Validación técnica

- [ ] `npm run lint` termina sin errores y sin warnings relevantes.
- [ ] `npm run build` termina correctamente.
- [ ] `npm run test:unit` — los tests de lógica pura, sin servidor (~0,6 s).
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

- [ ] La bottom nav muestra Inicio, Calendario, Listas, Comidas y Docs.
- [ ] La ruta activa se resalta correctamente.
- [ ] `/tasks` sigue accesible desde Inicio o Listas.
- [ ] La bottom nav no tapa contenido.

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

## 4. Calendario

- [ ] En móvil abre en `Agenda`, con la tira de siete días y el detalle de hoy debajo.
- [ ] El selector `Agenda | Mes` cambia lo de arriba y deja el día elegido donde estaba.
- [ ] Vista mensual carga y las flechas recorren meses; en agenda recorren semanas.
- [ ] La rejilla del mes solo enseña días de ese mes: las puntas van en blanco.
- [ ] Si la tira de siete días cruza de mes, el día 1 lleva el mes debajo.
- [ ] Días con eventos se distinguen (puntos con el color de quien lo lleva, o el número
      si son más de tres), tanto en la tira como en el mes.
- [ ] Se puede seleccionar un día, y su detalle aparece debajo sin cambiar de pestaña.
- [ ] "Próximos días" enseña solo los días con algo, y tocar su fecha los selecciona.
- [ ] Un tramo de vacaciones se lee como una raya continua, sin cortes entre días, y
      redondeada solo en los extremos. Un descanso de un día es un guion corto.
- [ ] El bloque "Vacaciones y descansos" dice el nombre de la persona y el estado:
      «de vacaciones hasta el 28 ago», «descansa hoy», «descansa del 3 al 4 sep».
- [ ] Una ausencia de varios días sale **una vez** en el bloque, no una por día, y no
      aparece como fila en la agenda del día.
- [ ] Vacaciones y descansos se editan desde ese bloque (el único sitio).
- [ ] Se puede crear evento; el `+` de la cabecera lo crea para el día elegido.
- [ ] Se puede editar evento.
- [ ] Se puede borrar evento con doble confirmación.
- [ ] Eventos de hijos usan color correcto.
- [ ] Eventos de todo el día no se desplazan de día.
- [ ] En la agenda salen también las tareas que vencen, y se pueden marcar allí.
- [ ] Una tarea vencida antes de hoy aparece en el día de hoy marcada como "Atrasada".
- [ ] El buscador del calendario encuentra eventos pasados, no solo los del tramo pintado,
      y al vaciarlo se vuelve al día en el que estabas.

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

## 9. Ajustes - familias

- [ ] Se puede editar nombre de familia.
- [ ] Se puede crear nueva familia.
- [ ] Nueva familia crea adulto admin inicial.
- [ ] Se puede cambiar familia activa.
- [ ] Recargar conserva familia activa.
- [ ] Datos de una familia no aparecen en otra.

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
- [ ] Home y Ajustes siguen centradas: se ve raro pero no roto. Es lo que queda por
      hacer del layout de escritorio.

## 14. Persistencia

- [ ] Crear datos y recargar mantiene cambios.
- [ ] Cambiar de familia conserva datos por familia.
- [ ] Reset limpia `localStorage` correctamente.

## 15. Supabase aislado

> Esta lista está **automatizada** en `scripts/validate-rls.mjs`, que la recorre con
> sesiones de usuario reales y crea y borra sus propios usuarios y familias de
> prueba. Ejecutarlo (`node scripts/validate-rls.mjs`) es más fiable que ir a mano, y
> es lo que pide `CLAUDE.md` después de tocar una migración, una policy o una RPC.
> Lo de abajo queda como referencia de qué cubre.

- [ ] Migraciones 001–019 aplicadas en orden.
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
- [ ] Trigger rechaza `task` con `child_id` de otra familia (migración 015).
- [ ] Trigger rechaza `task` con `member_id` de otra familia (migración 015).
- [ ] Bucket `documents` es privado.
- [ ] Usuario de la familia puede leer su documento.
- [ ] Usuario de otra familia no puede leer el documento aunque conozca el path.
- [ ] Resultados documentados en `docs/supabase-validation.md`.
