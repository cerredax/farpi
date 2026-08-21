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

- [ ] Vista mensual carga.
- [ ] Días con eventos se distinguen.
- [ ] Se puede seleccionar un día.
- [ ] Se puede crear evento.
- [ ] Se puede editar evento.
- [ ] Se puede borrar evento con doble confirmación.
- [ ] Eventos de hijos usan color correcto.
- [ ] Eventos de todo el día no se desplazan de día.
- [ ] En la semana (móvil) salen también las tareas que vencen, y se pueden marcar allí.
- [ ] Una tarea vencida antes de hoy aparece en el día de hoy marcada como "Atrasada".
- [ ] El buscador del calendario encuentra eventos pasados, no solo los del tramo pintado.

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
- [ ] Marcar un ítem lo baja al catálogo ("Apuntar de lo de siempre"), plegado por defecto.
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

## 11. Ajustes - hijos

- [ ] Se puede añadir hijo.
- [ ] Fecha de nacimiento puede quedar vacía si el modelo lo permite.
- [ ] Se puede editar hijo.
- [ ] Se puede borrar hijo.
- [ ] Al borrar hijo, eventos relacionados pasan a sin hijo.
- [ ] Al borrar hijo, documentos relacionados pasan a sin hijo.

## 12. Reset demo

- [ ] Reset pide confirmación.
- [ ] Tras confirmar, vuelve estado inicial.
- [ ] No quedan sheets abiertos ni estados raros.

## 13. Responsive

- [ ] Sheets caben en móvil pequeño.
- [ ] Sheets tienen scroll interno.
- [ ] Botones principales son accesibles.
- [ ] El teclado no tapa campos críticos.

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

- [ ] Migraciones 001–017 aplicadas en orden.
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
