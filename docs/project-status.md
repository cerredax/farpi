# Estado del proyecto

Última revisión: 2026-09-23.

## Resumen

Farpi está conectado a Supabase de extremo a extremo: autenticación, repositorios reales, `StoreProvider` async, onboarding e invitaciones por magic link. Los archivos de los documentos ya no los guarda Farpi: viven en el Google Drive de quien los sube (27-08-2026), y la familia los ve igual sin conectar nada. La UI consume la frontera de repositorios y elige implementación real o mock según `IS_DEMO_MODE`. El modo demo/mock sigue funcionando como fallback y como entorno de pruebas (e2e).

La app está en producción, en uso diario por la familia y probada en un móvil real (05-08-2026). Las tablas de Finanzas se aplicaron en el proyecto real y se validaron el 01-09-2026: primero las tres iniciales (99/99) y, con la reforma de los fijos de esa misma tarde, `fixed_entries` y `expenses.kind` (**106/106**). La sección funciona entera con datos reales. El 02-09-2026 se
aplicaron y validaron tres cambios más de esquema —la franja del comedor con los platos de
una comida, las once carpetas de documentos y **los meses cerrados de Finanzas**—, y el
03-09-2026 dos más: el cierre que ya no inventa meses, con `empty_month`, y la revisión de
seguridad de esa tarde. El 04-09-2026, el borrado de cuenta, que aquella revisión había
dejado roto sin verlo. **165/165**. Y el 05-09-2026, `fixed_entry_overrides` —el ajuste
de un fijo en un mes suelto—: tabla, índice,
policy, trigger de familia y el `coalesce` de `close_month_copy`. **169/169**. Y el
22-09-2026, `expenses.import_ref` con su restricción de unicidad —que un movimiento del
banco se apunte una vez—: **173/173**. Y el 23-09-2026, una revisión de seguridad a la
contra: que la ficha de un documento no pueda cambiar de familia y la cuenta nueva del tope de
invitaciones, `invite_sends`: **182/182**. **Lo que queda no es código de producto**: pruebas
que piden un aparato delante, una decisión sin tomar, tres funcionalidades que no existen y
tres acabados menores de Finanzas. La lista entera, en "Siguiente paso recomendado".

## Implementado

### Pantallas / producto

- Inicio / Hoy, con lo que viene en **tres cajas** —"Mañana" (en el amarillo de la
  sección, y sin repetir la palabra en cada fila: ahí solo va la hora), "Próximos días"
  (lo que queda de esta semana, en salmón) y "Próxima semana" (en gris)—, partidas por
  `partirPlanesProximos`. Fueron dos cajas del 08 al 09-09-2026, con mañana y pasado
  juntos; mañana se separó porque es la pregunta que se hace de verdad al acostarse. El
  segundo corte es el **domingo** y no "dentro de tres días": en casa se habla de esta
  semana y la que viene, así que un sábado la caja del medio no se pinta y el lunes sale
  ya en "próxima semana". El horizonte siguen siendo siete días. **En escritorio las
  tres van juntas en una misma columna** (14-09-2026): Inicio reparte sus secciones en
  dos, y sueltas "Mañana" caía a la izquierda y "Próximos días" a la derecha, a la misma
  altura y con el mismo aspecto; tres tramos de una misma cuesta leídos en paralelo
  dejan de ser una cuesta, y para saber qué va antes había que leer los rótulos.
  En móvil no cambia nada. En las dos cajas que
  llevan fecha, **cada día es un bloque con su rótulo encima** (12-09-2026): el día se
  escribe una vez, entero ("Miércoles 6"), en la misma franja gris con la que
  `PendingItems` encabeza cada cesta, y las filas se quedan con la hora, que es lo que
  las distingue. Fue una columna de ancho fijo en la primera fila hasta el 12-09-2026, y
  la segunda cosa del mismo día dejaba ese hueco en blanco: una fila descolgada con un
  agujero en medio. **La etiqueta de quien lo lleva tampoco se repite** si el plan de
  arriba es suyo — el punto de color sigue en todas. Lo que no se hace es reordenar por
  persona: dentro de un día se lee la hora, y ese eje ya vive donde tiene sentido, en la
  agenda del calendario. Y lo que va atrasado,
  arrastrado al día de hoy. La tarjeta del día abre con el saludo y la fecha —que estuvieron en la cabecera
  y ya no, para no decir la hora dos veces en la misma pantalla— y dentro lleva
  cumpleaños, planes, tareas de hoy y el menú (`TodayMealsRow`): todo lo que responde a
  "¿qué toca hoy?" en un sitio, en vez del menú suelto al final de la columna. **Los
  planes que ya han pasado se atenúan y el siguiente lleva su hora en verde**
  (05-09-2026): a media tarde la pregunta es qué queda, y hasta entonces el desayuno y la
  cena se leían igual a cualquier hora. Las tareas de hoy **tienen tope** —cuatro, y "Y N
  más" al pie— porque seis atrasadas echaban la compra y los planes fuera de la primera
  pantalla, y cada una dice **desde cuándo** ("Atrasada · 17 jun"): seis píldoras iguales
  no dejaban ver cuál llevaba un día y cuál un mes. Y debajo de la tarjeta, **el aviso de
  los papeles que caducan** (05-09-2026), que los días normales no está: el dato lo tenía
  el recordatorio diario, pero en pantalla había que entrar en Documentos para verlo. **Tocar un plan —de
  hoy o de esta semana— lo abre** (04-09-2026), con el mismo formulario del calendario y
  solo en edición: apuntar algo nuevo sigue siendo del calendario, que es donde se ve
  dónde cae. Y "Listas de casa", al desplegarse, **va por cestas**: el nombre de la lista
  se dice una vez como encabezado de su grupo, no debajo de cada ítem ni otra vez arriba
  —abierto, el botón de plegar se queda solo con la flecha—. La cabecera de la pantalla
  dice "Inicio", como las demás dicen la suya: decía "Farpi".
- Calendario (eventos, series semanales y anuales, vacaciones como franja). En la
  vista de semana salen también las tareas que vencen, y se pueden marcar allí. La
  agenda se agrupa por días o **por persona** (27-08-2026), con un interruptor que
  comparte línea con el buscador (28-08-2026: eran dos bandas apiladas encima de la
  lista para dos controles que caben en una). Debajo del mes van los dos bloques que
  dicen cómo es el mes y no qué hacer: "Vacaciones y descansos" y **"Cumpleaños"**
  (28-08-2026), los dos **plegados** por defecto. **Solo Cumpleaños lleva número en el
  título** (14-09-2026): en "Vacaciones y descansos" contaba apuntes y no cosas que
  preparar —tres turnos sueltos de la misma persona contaban tres y la respuesta seguía
  siendo "falta Carlos"—, mientras que cinco cumpleaños son cinco personas a las que
  felicitar;
  los cumpleaños salen además en la franja de "todo el día" de las
  vistas Día y Semana, que no tienen bloque debajo al que mirar. Un cumpleaños del
  mes en curso **que ya pasó se pliega aparte** (12-09-2026): arriba quedan los que
  vienen y al pie una línea —"2 que ya pasaron"— los despliega. **El título cuenta los que
  quedan** (14-09-2026): contó el mes entero del 05 al 14-09 para que no bajara solo
  según avanzan los días, y visto en pantalla ese argumento no se sostiene, porque el
  bloque va plegado y ese número es lo único que se lee de él. "5" el día 20 con dos por
  venir es avisar de tres cosas que ya no hay que preparar. En un mes sin corte —uno que
  ya terminó, o uno en el que no ha caído ninguno todavía— la lista sale entera y el
  número la cuenta entera: decir "0" sobre un bloque con cinco filas dentro sería
  mentir. Estuvieron atenuados al 55 % desde el 05-09-2026, y en un mes por
  la mitad eso dejaba dos de cada tres filas sin leerse y sin irse. En un mes que no es
  el de hoy no hay nada que separar y salen todos, atenuados si el mes ya terminó.
  **"Vacaciones y descansos" va por personas** y no por fechas (12-09-2026): el nombre
  se dice una vez y sus ausencias van detrás, **cada una en su pastilla y dicha entera**
  (14-09-2026): "Carlos — de vacaciones hasta el 11 sep · descansa el 15 sep · descansa
  el 22 sep". Del 12 al 14-09 la segunda del mismo tipo se quedaba sin verbo y sin
  icono, separada de la anterior por un punto volado, y "el 22 sep" a secas no dice si
  ese día esa persona está fuera o en casa; el punto, además, caía al principio del
  renglón cuando la fila se partía. Siete filas con "Carlos" en tres de ellas siguen
  siendo tres. Y **una ausencia que ya terminó dice su rango y no "hasta"**
  (14-09-2026): unas vacaciones del 8 al 12 vistas el día 17 salían como "de vacaciones
  hasta el 12 jun", una frase sobre alguien que sigue fuera cinco días después de haber
  vuelto, y en un mes ya pasado lo eran todas. Cada ausencia sigue
  siendo la suya y sigue abriéndose: agrupar mueve el rótulo, no fusiona eventos.
  **Quién lleva cada cosa se mira en la agenda**, con su eje "Por persona"
  (27-08-2026): el calendario no tiene filtro por personas. Lo tuvo del 12 al
  13-09-2026 —una fila de pastillas debajo de la cabecera que encendía y apagaba a
  cada uno— y se quitó: 60 px de pantalla fijos en el móvil, en la vista que menos
  sitio tiene, para algo que se toca una vez cada mucho, y la pregunta ya tenía
  dónde contestarse. En móvil se pasa de mes o de día **arrastrando el dedo**, y
  cuando lo que se mira no contiene hoy aparece un botón **«Hoy»** junto a las
  flechas (05-09-2026); mirando el presente no se pinta, porque no haría nada.
- **Hoy es un aro salmón y el día elegido es la celda entera** (12-09-2026, el aro
  desde el 13). Son
  dos señales de naturaleza distinta y no dos formas del mismo círculo, que es lo
  que fueron del 05 al 12-09-2026 —disco relleno el elegido, anillo hoy, los dos en
  `primary-strong`—. Dos cosas fallaban ahí: el mes era la única vista del
  calendario donde hoy no iba en `accent-strong`, el salmón que ya usan la agenda,
  el eje de horas y el panel del día; y hoy llevaba además la más débil de las dos
  formas, un anillo de 2 px, en la vista donde compite con treinta números. El día
  elegido pasa a la celda (fondo `primary-tint` y borde interior) porque de él
  cuelga un panel entero debajo de la rejilla, y la respuesta a "¿qué estoy
  mirando?" tiene que ser del tamaño de lo que se mira. Se conserva lo que sigue
  siendo verdad del 05-09-2026: el color no es la única diferencia —una es una marca
  en el número y la otra un fondo de celda, así que sobrevive a cualquier
  dicromacia—. **El disco macizo duró un día** (13-09-2026): en una rejilla clara
  era el elemento más oscuro y saturado de la pantalla, una mancha de 32 px en una
  celda de 51 para decir algo que ya se sabe, y encima `accent-strong` es un marrón
  rojizo de la familia de dos colores de persona, así que se leía como "algo de
  María" antes que como "hoy". Ahora es un **aro** de `accent-strong` sobre
  `accent-tint`, con el número en `accent-strong` (6,0:1): pesa lo justo para
  encontrarse y no tapa nada. El aro de 2 px pelado, sin tinte, es lo que no
  funcionaba en una pantalla grande del 05 al 12-09. **Y hoy se dice dos veces y en dos
  tallas** (14-09-2026): la letra de su columna va sobre una pastilla `accent-tint` en
  la cabecera —para llegar— y la celda lleva un filete salmón de 3 px al pie —para
  rematar—. El aro solo no se encontraba en una rejilla de treinta y tantos números, que
  era la queja. El filete va al pie y no arriba porque arriba vive el carril gris de las
  ausencias, que lo taparía justo los meses en los que hay alguien fuera; y sigue sin
  competir con el día elegido, que rodea la celda entera en verde: uno rodea y el otro
  subraya, así que cuando coinciden se ven los dos.
- **La celda del mes dice a qué hora es cada cosa** (12-09-2026), en escritorio:
  "9:00 Dentista" y no "Dentista". Sin el cero de delante, porque la celda mide ~81
  px cuando la agenda va al lado, y en `tabular-nums` para que las horas queden en
  columna. Los de todo el día no llevan ninguna. Y **los títulos van por hora**: se
  pintaban en el orden en que estuvieran, así que el "+n más" recortaba por posición
  y escondía lo que tocara, no lo último del día.
- **La celda del mes se reparte el alto de la ventana** en escritorio (12-09-2026),
  con 104 px de suelo: medía eso fijo, y en un monitor normal la rejilla acababa a
  media pantalla mientras un día con tres planes decía "+1 más". Con el alto
  repartido caben **tres títulos** en vez de dos.
- **Los días de una semana están a la misma altura** (12-09-2026). Las franjas de
  ausencia iban en el flujo y cada una empujaba el número 7 px: en la fila del 14 al
  20, con una ausencia el 15, ese número arrancaba 14 px más abajo que el del 14 y
  el del 18, y la franja quedaba tan pegada al borde de arriba que parecía del día
  anterior. Ahora el carril se **reserva por semana** (`carrilDeAusencias`): una
  semana sin ausencias no reserva nada y sigue midiendo lo que medía, y reservarlo
  en todas las celdas habría llevado la rejilla del móvil de 289 px a 414.
- **La rejilla dice que se puede tocar** (12-09-2026): con hoy elegido —que es como
  abre la pantalla— debajo del mes sale "Elige un día para ver qué tiene", justo en
  el hueco que ocupará el panel, y desaparece al tocar un día. Más `active:` en la
  celda, que con el dedo no hay hover y tocar un día no acusaba recibo de nada.
- **Si no queda nadie, el día lleva una sola franja amarilla** (05-09-2026): todos
  los adultos con cuenta fuera y por lo mismo. Hacen falta dos como mínimo y el
  mismo tipo —unas vacaciones y un descanso no se resumen en una palabra—. Además
  de leerse mejor, arregla que la celda pinta dos franjas como mucho: con tres
  adultos de vacaciones el mismo día, la tercera no se pintaba. El bloque
  «Vacaciones y descansos» no cambia: la rejilla dice qué día es este y el bloque,
  quién está fuera y hasta cuándo. **Va la primera y acompañada, no en lugar de las
  demás** (12-09-2026): hasta entonces sustituía a todas, así que el día en que los
  dos adultos con cuenta descansaban, el descanso de la abuela —que va por
  `child_id` y nunca entró en esa cuenta— desaparecía del calendario y del nombre
  accesible del día. El amarillo habla por quien colapsa y por nadie más
  (`franjasDeAusencia`).
- **Elegir un día del mes enseña qué hay ese día** (28-08-2026), en los dos tamaños. Debajo
  de la rejilla: los planes con su hora, las tareas que vencen y las etiquetas de
  festivo, ausencia y cumpleaños; y si no hay nada, lo dice y ofrece apuntarlo
  ahí. Antes no contestaba nada —la agenda de abajo arranca en hoy y solo pinta
  días con algo, así que un día pasado o vacío no tenía a dónde llevarte—. Con
  hoy elegido no sale: la agenda ya empieza justo ahí. En escritorio, además, la
  agenda de la columna de al lado se desliza hasta el día elegido. **Y ofrece
  apuntar tenga o no tenga algo el día** (13-09-2026): el botón colgaba del día
  vacío, así que para añadir una segunda cosa a un día quedaba el doble toque en la
  celda —que no se ve— o el `+` de la cabecera, que apunta en el día elegido sin
  decirlo.
- **La lista que acompaña al mes habla del mes que se mira** (13-09-2026): arranca
  en hoy mientras se mire el mes de hoy, y en el día 1 de cualquier otro. Con la
  rejilla en agosto, debajo seguía encabezando "Hoy" con lo de junio; y en la
  pestaña Agenda de móvil, donde no hay rejilla, las flechas cambiaban el título y
  no movían nada. Elegir un día **dentro** del mes que ya se mira no mueve el
  ancla: sigue deslizando hasta él.
- **El mes se lleva el ancho de la pantalla en escritorio** (13-09-2026). La vista
  estaba topada a 1024 px, así que a 1440 la rejilla se quedaba en celdas de 81 px
  y 10 de los 11 títulos del mes salían truncados; a 1024, con la barra lateral y
  la lista de al lado, en 49 px. El tope se va en Mes —se queda en Día y Semana— y
  el mes y la agenda **van al lado a partir de 1400 px y apilados por debajo**, que
  es donde empiezan a caber los dos. Celdas: 107 px a 1024, 144 a 1280, 109 a 1440
  con la lista al lado, 177 a 1920.
- **El título del mes va abreviado en móvil** ("Ago 2026", 13-09-2026), como el de
  la semana: con el botón "Hoy" puesto le quedan 60 px y se recortaba a "Agosto …",
  perdiendo el año justo cuando te has ido lejos.
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
- Tareas: recurrencia, prioridad, dueño (un adulto o un hijo) y quién la marcó. Buscar
  enseña también las completadas —y mientras se busca no se pliegan—, y el vacío
  distingue «sin tareas todavía» de «todo al día». El vencimiento es **solo el campo de
  fecha** (14-09-2026): tuvo delante dos chips, «Hoy» y «Mañana», y se fueron porque el
  selector del móvil ya abre por hoy, así que ahorraban un toque a cambio de dos
  controles fijos y un estado —pulsado, sin pulsar, y qué pasa si la fecha del campo es
  justo esa— en la pregunta más sencilla del formulario.
- Listas e ítems: lo que falta arriba, lo que ya tenéis debajo como catálogo, abierto al entrar (se vuelve a pedir con un `+`, no con un tic), mover un ítem de una lista a otra.
- **Apuntar en una lista se hace escribiendo, al pie de la pantalla** (14-09-2026).
  Era un botón que abría un sheet: tocar, esperar la persiana, escribir, tocar «Añadir»
  y esperar a que se cierre. Cinco pasos por palabra, y una compra no se apunta de una
  en una —se abre la nevera y se cantan seis seguidas—, así que había que repetirlos
  seis veces. Ahora se escribe, se pulsa Intro y el campo se queda puesto y con el foco
  para la siguiente. Trae las **sugerencias del historial**, que son la otra mitad del
  ahorro, y solo mientras se escribe: la barra vive pegada al borde de abajo y cinco
  pastillas fijas ahí le comen sitio a la lista. No es un camino nuevo —apunta lo mismo
  que apuntaba el sheet—, y el sheet se queda para **editar** un ítem, que es cuando sí
  hay más de un campo que tocar, y para apuntar **desde Inicio**, donde no hay una lista
  abierta delante.
- Búsqueda en listas, tareas, notas, documentos y calendario. La del calendario encuentra
  eventos pasados, no solo los del tramo pintado.
- **Borrar desde una fila pide confirmación** (05-09-2026): la papelera de un ítem y la
  de una tarea eran un toque sin vuelta atrás. Mismo `DeleteButton` que los sheets, en
  variante `inline`, y se desarma sola a los 4 s (`MS_CONFIRMAR_BORRADO`).
- **Cuatro borrados preguntan en un diálogo** (08-09-2026): eliminar una lista, una
  partida, una persona y una familia no usan el doble toque, porque lo que se llevan no
  está en pantalla y cada uno se lleva algo distinto (la lista, sus ítems en cascada; la
  partida, solo el enlace de sus gastos). El sheet se convierte en la pregunta —no hay un
  segundo `BottomSheet` encima— con `ConfirmDeleteBody`/`ConfirmDeleteFooter` y
  `useSheetDeleteDialog`. El resto de los borrados siguen con el doble toque.
- **El rojo de `DeleteButton` es `danger-strong`** (08-09-2026): `danger` sobre blanco da
  3,33:1 y ahí todo es texto de 12 y 14 px, por debajo del 4,5:1 de AA. `danger-strong`
  da 5,17:1. `danger` se queda para bordes, fondos y gráficos, que solo piden 3:1.
- Comidas (día/semana, copiar día). Las **cinco** franjas se activan y desactivan por
  familia desde Ajustes; apagar una no borra lo apuntado en ella. `Comedor` (02-09-2026)
  es lo que le ponen a los niños fuera de casa: va detrás de `Comida` porque el mismo día
  hay dos menús a la misma hora, y entra **apagado** —una casa donde nadie come fuera
  tendría una fila vacía siete veces por semana—. Comida y comedor se apuntan por
  **primero, segundo y postre** (`second_course` y `dessert`, opcionales); desayuno,
  merienda y cena, con un plato solo.
- Documentos: subir, abrir, editar, borrar y aviso de caducidad en la tarjeta. Los
  archivos están en el Google Drive de quien los sube y los sirve Farpi con el token
  del dueño; el resto de la familia no conecta nada ni se entera de que hay un Drive
  detrás. **Al subir, el sheet espera a que el archivo haya subido** (08-09-2026):
  `createDocument` y `updateDocument` son las dos únicas escrituras del store que
  devuelven si salieron bien, el botón dice «Subiendo el archivo…» y, si falla, el
  borrador sigue en pantalla para reintentar. **El archivo sale con su extensión**
  (`nombreDeDescarga`): en la base está el nombre del documento, no el del archivo, y sin
  extensión el «guardar como» del visor dejaba algo que el móvil no abre. **Una ficha sin
  dueño lo dice** —causa `sin_dueno`, 08-09-2026—: quien la subió borró su cuenta
  (`storage_owner` a nulo) o es de antes de Drive, y en los dos casos solo queda la
  ficha; antes se resolvía el nulo con el Drive de quien mira y salía «conecta tu
  almacenamiento», que suena a que conectando se arregla. Y al editar, donde iba el
  nombre del archivo va su tipo («Documento PDF · 350 KB»): ese nombre se sacaba de
  `storage_path`, que ahora es el identificador que le pone Google. **Once categorías** (02-09-2026), en `DOC_CATEGORIES`: Salud, Colegio,
  Personal, Vivienda, Vehículo, Seguros, Finanzas, Facturas, Mascotas, Viajes y Otros.
  `personal` es identidad —DNI, pasaporte, libro de familia—, no el cajón de lo que no
  encaja; para eso está «Otros». **Cada una lleva su emoji** (11-09-2026, en el propio
  `DOC_CATEGORIES`), del mismo vocabulario que los sheets de listas, notas y partidas y
  ninguno posterior a Unicode 7 —en un catálogo fijo, un emoji reciente es un cuadrado
  vacío para quien tenga el móvil viejo, y por eso `personal` no lleva 🪪—. Lleva 👤 y no
  🆔, que se probó primero: el 🆔 es un bloque violeta macizo, el único color saturado de
  los once, y sobre salvia y arena se veía antes que el nombre del documento. Fueron
  iconos de lucide hasta esa fecha, por el tamaño del chip; el argumento se cayó cuando
  la palabra se fue de la tarjeta el 09-09-2026, y lo que quedaba era la única sección de
  la app que identificaba en otro idioma. En la tarjeta va el emoji solo (con el nombre en
  `aria-label` y `title`); en la pastilla, con la palabra al lado, porque un filtro tiene
  que decir qué filtra. La fila de filtros **envuelve en los dos tamaños**
  (02-09-2026): en móvil se arrastraba, y a 390 px entraban cuatro y las otras ocho
  quedaban fuera de pantalla. Y desde el 03-09-2026 **como filtro solo se ofrecen las
  categorías que tienen algún documento** (`selectDocCategoryFilters`), más la que estés
  mirando aunque te quedes sin papeles dentro: doce pastillas con un icono cada una eran
  un muro antes del primer documento —cuatro filas a 390 px, y en escritorio once en una
  fila con «Otros» colgando solo en la segunda— y la mitad llevaban a una pantalla vacía.
  Con una sola categoría con papeles no sale la tira: no filtraría nada, igual que el
  buscador por debajo de `MINIMO_PARA_BUSCAR`. Las once siguen estando al **guardar** un
  documento; esconder contenido en esta app ha salido mal cada vez, pero una categoría
  vacía no es contenido, es un filtro muerto. La categoría «Finanzas» va con el euro (💶)
  desde el 02-09-2026, el mismo que la sección: fue una tarjeta de crédito y luego una
  hucha, que de cerca es un cerdito y no dice «dinero» sino «ahorrar».
- **Notas** (31-08-2026): lo que hay que tener apuntado en casa y no es una fecha, una
  tarea ni un papel —el teléfono del pediatra, la clave del wifi, dónde está el contador—.
  Título, texto libre, un emoji y la posibilidad de fijar una arriba. Sin categorías, sin
  campos y sin tipos de nota: con veinte notas manda el buscador. Se lee entera desde la
  tarjeta, sin abrir nada. Vive en "Más", delante de Documentos, y **no sale en Inicio**:
  la clave del wifi no es de hoy, es de siempre. Ojo con lo que se guarda ahí: es texto
  plano en la base, protegido por la RLS y por nada más. **El sheet ya no lo avisa**
  (14-09-2026): el aviso —"Farpi no es un gestor de contraseñas"— estaba debajo del
  campo de texto, en la única pantalla donde se escribe justo eso, y a la tercera nota
  es un renglón que nadie lee y que le quita sitio al formulario. Lo sigue diciendo
  `/privacidad`, que es donde se cuenta qué se guarda y cómo.
- **Finanzas** (31-08-2026, rehecha el 01-09-2026; vocabulario afinado el 02-09-2026; cerrada el 14-09-2026): el dinero de la casa, en `/finances`,
  con **cuatro pestañas** y cuatro piezas de vocabulario que no se pisan.
  **Las pestañas son una barra segmentada** (14-09-2026) que ocupa el ancho y se ve
  entera a 390 px: eran cuatro píldoras con `overflow-x-auto` y la cuarta se quedaba
  fuera del borde, así que «Presupuestos» solo aparecía si a alguien se le ocurría
  arrastrar. Cada una mide lo que mide su nombre y el hueco que sobra se reparte a
  prorrata (`flex-auto`), que es lo que deja tenerlas las cuatro **sin bajar la letra**
  —en cuartos iguales había que bajar a 11 px para que «Presupuestos» cupiera—. Lo
  vigila `e2e/movil.spec.ts`, que mide las cuatro: el bucle de rutas no lo habría visto
  nunca, porque un contenedor que se arrastra no desborda la página.
  **Y se lee como un menú** (14-09-2026, segunda vuelta del mismo día). Los cuatro
  rótulos tenían cuatro formas gramaticales distintas —artículo y nombre, pregunta,
  adjetivo sustantivado, nombre a secas— y se leían como cuatro ocurrencias: ahora son
  **«Este mes», «Estadísticas», «Fijos» y «Presupuestos»**, cuatro nombres con la misma
  forma. Y la barra es un **segmentado de verdad** —canal gris y la activa como tarjeta
  blanca con sombra— en vez de una caja blanca con la pestaña activa en verde macizo, que
  era el último verde relleno que quedaba en la app. Los cuatro rótulos van **en tinta**:
  `muted` sobre `surface` da 4,24:1 y no llega al 4,5 de un texto de 13 px, así que lo que
  marca el activo es la tarjeta y el peso de la letra, no el color.
  **«Estadísticas»** (02-09-2026 como «Resumen», podada el 03-09, replanteada el
  04-09-2026 y ampliada al año el 14-09-2026): **siete bloques**, elegidos por lo que se
  pregunta una casa y no por lo que se puede dibujar, cada uno con su cifra escrita y su
  dibujo detrás. Van **de lo ancho a lo estrecho** —el año, los meses, el mes que se
  mira— y no alternando escalas, que es como quedaron al entrar los del año.
  **Los tres del año son del 14-09-2026**, y entraron porque la pestaña solo hablaba del
  mes que estuvieras mirando: «¿cuánto llevamos en el dentista este año?» no la
  contestaba nadie. Son la **cabecera** —lo que ha entrado, lo que ha salido y lo que se
  ha quedado en el año natural, con la media mensual y **sobre cuántos meses** está
  hecha, que no es lo mismo sobre cuatro que sobre doce—, el **mismo desglose del mes
  pero sumando el año** (agrupado por nombre y no por clave: la de un fijo es la de su
  línea y cada mes cerrado guardó la suya) y **lo que más se repite**, que ordena los
  conceptos del día a día por lo que suman —«Compra semanal · 34 veces · 35,40 € de
  media»— y contesta en qué se va sin darse cuenta. Ese último **no se ve en el modo demo**,
  y es a propósito: sus siete apuntes son siete cosas distintas, y sembrar un par de
  repetidos movería las cifras de junio que media suite comprueba. Se cubre con unitarios y
  con un test que apunta dos veces lo mismo. Los meses de los que no consta nada
  no entran en ninguno de los tres: no se inventa un cero. **Ni tampoco un mes cerrado y
  vacío sin apuntes** (14-09-2026): la regla que ya tiraba los meses sin plan miraba cómo
  estaba guardado el mes y no lo que dice, y uno con la cabecera de `month_plans` pero sin
  una sola línea afirma lo mismo —de ese mes no se sabe nada—. Se colaba con `entra = 0` y
  `sale = 0`: una barra a cero en el gráfico y un mes de más en el divisor de la media, que
  decía «Sobre 5 meses» cuando fueron cuatro. Si ese mes **tiene apuntes** sí se queda, que
  es lo que impide que el arreglo esconda dinero de verdad, y el mes en curso vacío también:
  ahí no es que no se sepa, es que todavía no ha pasado nada.
  **¿Voy bien este mes?** — lo gastado acumulado día a día contra el ritmo de los meses
  cerrados, con las dos cifras escritas; solo en el mes en curso y habiendo con qué
  comparar.
  **¿Cómo van los meses?** — **dos barras por mes**, lo que entra y lo que sale, con lo
  que quedó escrito encima de cada par; y los tres números de cada mes en una tabla
  plegada.
  **¿En qué se va?** — un **anillo** y, debajo, una fila por concepto de mayor a menor,
  con **los gastos fijos dentro**: sin ellos el bloque decía «se han ido 291,45 €» en un
  mes en el que se fueron 1.162,35, y el alquiler no salía. El anillo pinta el mismo tono
  cada vez más claro según baja la lista, así que el color y el orden son el mismo dato y
  no hace falta leyenda. Cada fila dice **cuánto ha cambiado** desde el mes pasado, con
  palabras y en su renglón, y al pie salen las partidas que se pasan a menudo.
  **¿De cada 100 € que entran?** — una barra apilada con fijos, partidas, lo demás y lo
  que queda, con las cuatro cifras y sus porcentajes.
  Se descartaron el reparto por persona en el tiempo —sería una cuenta pendiente— y la
  estacionalidad, que con cuatro meses no es una tendencia. Todo SVG escrito a mano, sin
  librerías, y con los dos únicos colores de gráfico de la paleta.
  **«Fijos»**: la plantilla —lo que entra y lo que sale todos los meses sin apuntar
  nada: las nóminas, el alquiler, la luz, las suscripciones— y **las partidas** en las que
  se reparte lo que varía, en tres bloques con su total y la cifra de «para el mes». No
  genera apuntes ni hay nada que marcar como pagado, y por eso no hay que abrir septiembre.
  Se copia a cada mes que empieza.
  **Los iconos de gasto se rehicieron el 14-09-2026** (pedido) juntando los que nombraban
  una sola factura: 💡💧🔥 pasan a **🔌 suministros** —una casa no paga la luz, el agua y
  el gas por separado— y 📱🌐 a **📶**, que es la factura del teléfono y la fibra. 🧽 pasa
  a **🧹**, que a 20 px se lee (la esponja parecía una piedra), y 💳 a **🔁**: una tarjeta
  es cómo se paga, no qué se paga, y lo que define una suscripción es que se repite. La
  escoba cambia **también en las partidas**: mismo concepto, mismo dibujo. Entran 🏛️
  (IBI, basuras) y ⚽ (extraescolares, que caían en el 🎒 del material).
  Quedan **23 y no 24**, así que la última fila va con siete. Dos cosas abiertas a
  propósito, a la espera de decidirlas: el hueco vigesimocuarto —el mejor candidato es
  🦷, la ortodoncia, que hoy cae en el 🏥 del seguro médico— y que **🏛️ y 🏦 se parecen**
  en la tipografía de Android (los dos son un edificio con columnas). Están separados en
  la rejilla para que no se comparen de un vistazo; la alternativa sería 🧾 para impuestos.
  Quitar los seis **no toca nada de lo guardado**: un fijo que ya los lleve los sigue
  enseñando; lo que pasa es que al editarlo el selector no marca ninguno.
  **«Este mes»**: arriba **la cuenta** —ingresos fijos, gastos fijos, «para el mes», lo
  apuntado y **cuánto queda**—, que es el número que la sección existe para dar; los dos
  totales de fijos **se abren** (04-09-2026) y enseñan sus líneas, las de ese mes, y en un
  mes cuyo plan está vivo **cada línea se ajusta ahí mismo para ese mes** (05-09-2026):
  un sheet corto pregunta cuánto ha sido **este mes** y la referencia de «Fijos» no se
  mueve —«la limpieza son 120 € al mes, pero en septiembre fueron 150»—, con un «Volver a
  los 120 €» para deshacerlo y un enlace a «Fijos» para cuando lo que ha cambiado es lo
  de todos los meses. Un fijo ajustado lo dice en su fila: «suele ser 120 €». En un mes
  cerrado no se toca nada, que es una copia; debajo las
  **partidas** de ese mes con su barra —que **se abren** (03-09-2026) y enseñan sus
  líneas, con lo que hay dentro de cada una y quién lo puso—, y debajo **el día a día**: los
  **apuntes** que se van poniendo, un gasto o un **ingreso** —una devolución, un trabajo
  suelto—, con importe, fecha, qué fue, de qué partida sale y quién puso el dinero. Un
  ingreso no cuelga de ninguna partida y no entra en el reparto, que sigue siendo solo de
  gastos. Las barras dicen con
  palabras si te has pasado y por cuánto, no solo con el color. Sin ningún fijo puesto, la
  tarjeta enseña lo gastado, como antes, y ofrece ponerlos.
  **Las partidas salen plegadas** (14-09-2026), con su número en el título, y debajo
  queda el día a día: con cinco partidas las barras se comían media pantalla de móvil
  entre la cuenta del mes y lo que se entra a hacer aquí, que es apuntar y mirar lo
  apuntado. Se pliegan en vez de subir el día a día por encima porque el orden dice algo
  —la cuenta, cómo se reparte y luego el detalle— y subiendo el día a día las partidas se
  quedarían al fondo detrás de setenta filas. Abierto se queda al cambiar de mes, que es
  cuando se comparan; al salir de la pantalla vuelven a plegarse.
  **El día a día va por días** (14-09-2026), cada uno con su rótulo y la cifra de lo que
  se fue ese día —«Martes 16 · 74,70 €»—, y hoy y ayer se llaman por su nombre. Era una
  lista plana en la que setenta apuntes eran setenta renglones iguales y saber qué se fue
  el sábado obligaba a leer la columna de fechas uno a uno; es el mismo arreglo que se le
  hizo a los doce meses de Cumpleaños el día antes. La fila **ya no repite la fecha**
  que dice su rótulo. Lo entrado y lo salido van separados y no restados: un día con una
  devolución de 40 € y una compra de 40 € no es un día en el que no pasó nada.
  **Y se busca** (14-09-2026), en **todos los meses**: Finanzas era la única pantalla de
  contenido con el buscador apagado a mano, y preguntas que no son de un mes —«¿cuánto
  llevamos en el dentista?»— solo se contestaban yendo mes a mes con la tira. Mira lo
  escrito **y el nombre de la partida** (unos se acuerdan de «farmacia» y otros de
  «salud»), y la respuesta empieza por la cifra: «7 apuntes con «farmacia». Se han ido
  134,20 €», con los resultados agrupados por su mes. Mientras se busca, la cuenta del mes
  y las partidas no están: hablan de un mes y lo que hay debajo ya no es de ninguno.
  **Apuntar ya no se teclea entero** (14-09-2026): el formulario ofrece **lo que esta casa
  apunta una y otra vez** —solo lo que se repite dos veces o más, que si no es el historial
  y no una sugerencia— y cada sugerencia **trae su partida**, la de la última vez. Por lo
  mismo, los chips de partida salen **por uso** y no por el orden de «Fijos». Lo que no
  cambia es el valor por defecto, que sigue siendo «Sin partida»: adivinarla sería apuntar
  mal en nombre de la comodidad.
  **Cada mes enseña lo que valía entonces** (02-09-2026): el mes en curso refleja la
  plantilla —cambias un fijo y se ve al momento, con el ajuste de ese mes si lo tiene— y
  el mes que terminó enseña la copia congelada que se guardó al cerrarlo, con sus fijos
  —el importe que tuvieron, ajuste incluido— y los límites que tenían sus partidas.
  **Lo congelado es el plan, no el día a día**: en un mes cerrado no se editan los fijos ni
  las partidas, y sí se apunta —la vida llega tarde y los 40 € del 29 de septiembre tienen
  que caber en septiembre—. El cierre lo hacen solos el cron diario y la app al arrancar. Y
  se puede **adelantar a mano** («dar el mes por cerrado», con un diálogo que cuenta qué se
  guarda), que es la única forma de dejar
  preparado un cambio de plantilla para el mes que viene; mientras siga siendo el mes de hoy
  se puede deshacer, y un mes terminado no se reabre nunca. Un mes terminado que nunca llegó
  a cerrarse lo dice tal cual en vez de enseñar la plantilla de hoy, que es lo que hacía
  antes. Los tres botones —cerrar, deshacer, poner a cero— van **al pie de «Este mes»**, lo
  último de todo (04-09-2026; estuvieron debajo de la tarjeta desde el 03-09), y son
  **botones** y no texto verde: «Cerrar mes», «Reabrir mes» y «Poner el mes a cero».
  **El mes se elige con las flechas y con el nombre** (04-09-2026), como en el
  calendario: las flechas para el de al lado y la lista para saltar a junio de un toque,
  con el de hoy marcado. Qué meses ofrece **la lista** lo decide `mesesNavegables` —hasta
  el más viejo con algo por detrás, y tres por delante más los que hagan falta si hay un
  apunte más lejos—; las flechas no la miran y llegan a donde sea. **«Cerrar mes» va en
  ámbar**, y los dos totales de fijos nacen **plegados** (salieron abiertos unas horas el
  04-09-2026 y se volvió atrás: con los cuatro recibos y las dos nóminas desplegados, la
  tarjeta se come media pantalla antes de llegar a las partidas).
  **Un mes que aún no ha empezado sale en cero** (03-09-2026) **mientras esté vacío**
  (04-09-2026); las cuentas —lo que quedaría con lo fijo de hoy— se piden con un enlace, y
  entonces habla en condicional. **En él sí se apunta** (04-09-2026): lo que ya sabes que
  va a llegar —el IBI, la matrícula— para poder ver si ese mes cuadra contándolo, y en
  cuanto hay algo la tarjeta lo cuenta y dice «apuntado para ese mes». Lo que no se puede
  es cerrarlo: no ha pasado.
  **Y un mes pasado se puede poner a cero** (03-09-2026), que es la salida para un mes
  que el cierre automático guardó con una plantilla que entonces no existía: agosto se
  cerró el 1 de septiembre con las nóminas creadas ese mismo día. Vacía el plan y deja la
  cabecera —si la borrara, el cierre automático lo repetiría en la siguiente carga— y no
  toca los apuntes. Eso ya no vuelve a pasar: el cierre **solo copia lo que existía antes
  de que el mes acabara**, y si nada de la plantilla estuvo en ese mes no lo cierra.
  **«Presupuestos»**: ahora la palabra significa una sola cosa —lo que cuesta algo que aún
  no has hecho—: los que te pasan de fuera (el fontanero, el dentista), agrupados por para
  qué son y ordenados de más barato a más caro, con el barato marcado mientras el trabajo
  siga sin decidir; se aceptan o se descartan desde la propia fila.
  Todo el dinero se guarda en **céntimos enteros**, siempre positivos: lo que separa un
  gasto de un ingreso es la columna `kind`, no el signo. No hay saldos entre adultos ni
  conexión con ningún banco, y **no sale en Inicio**: es del mes, no de hoy. Vive en "Más",
  con Notas y Documentos.
  **Y desde el 21-09-2026 el día a día se puede traer del banco** sin teclearlo: en
  `/finances/importar` se suelta el fichero de la **Norma 43** que dan todas las entidades
  españolas, y cada movimiento llega marcado o sin marcar con el motivo escrito —ya
  apuntado, lo cubre un fijo, parece un traspaso entre cuentas tuyas—. **Nada entra sin
  confirmarlo**, porque la cuenta del mes ya suma los fijos y apuntar la nómina otra vez la
  contaría dos veces. El fichero se cuadra contra lo que él mismo dice de sí —cuántos
  apuntes, cuánto suman, qué saldo queda— y se lee **en el propio navegador**: no se sube a
  ningún sitio, y de la cuenta solo se guardan los cuatro últimos dígitos. Sigue sin haber
  conexión con ningún banco: el archivo lo descarga la familia. El porqué de no usar un
  agregador (Afterbanks, Enable Banking) está en `docs/architecture.md`.
  **Y el mes se puede vaciar de una vez** (22-09-2026): «Borrar los apuntes del mes», al pie
  de «El día a día», para deshacer un mes llenado mal sin borrar cuarenta filas a mano. Hace
  lo contrario que «Poner el mes a cero» —ese quita el plan y deja los apuntes— y su diálogo
  dice cuántos son y cuánto suman antes de borrar, porque no hay vuelta atrás. Vale en
  cualquier mes: un mes cerrado congela el plan, no el día a día.
- Cumpleaños (27-08-2026): salen de la fecha de nacimiento que ya se guardaba en
  Ajustes, no se apuntan. El de hoy abre la tarjeta de Inicio y los de los próximos
  catorce días van en su bloque; el aviso de las siete felicita el mismo día.
- **Cumpleaños tiene pantalla propia** (11-09-2026), en "Más" entre Notas y Documentos.
  Su ruta es `/birthdays` desde el 12-09-2026: nació como `/cumples` y era la única del
  grupo, junto a `/finanzas`, que no estaba en inglés como las demás. Aquella se renombró
  a `/finances` el 14-09-2026, con redirect 308 permanente en `next.config.ts` para no
  romper los marcadores de la familia; ya no queda ninguna ruta en español.
  Es la lista de los **doce meses** que vienen, de hoy al más lejano, y junta
  los dos orígenes sin distinguirlos: quien es de casa sale de su fecha de nacimiento y
  quien no, del cumpleaños apuntado. Existe porque esa era la pregunta que la app no
  contestaba: Inicio avisa con dos semanas y el calendario enseña el mes que se está
  mirando, así que en septiembre no había dónde ver que la abuela cumple en marzo. El `+`
  abre el mismo sheet del calendario con el tipo ya puesto —sin el selector de "Qué es",
  que ahí ya no hay nada que elegir— y por eso solo apunta a los de fuera: al de casa se
  le pone la fecha en su ficha.
  **Las filas se tocan** (11-09-2026) y llevan a donde se arregla cada cosa, que es donde
  la costura de los dos orígenes asoma: un cumpleaños apuntado abre ahí mismo el sheet del
  calendario en edición —nombre, día y año de nacimiento, y "Eliminar" preguntando por la
  serie entera— y el de quien es de la casa lleva a su ficha en Ajustes
  (`?seccion=familia`), que es donde vive la fecha de nacimiento de la que se deduce.
  De una serie anual se edita **el cumpleaños de este año**, igual que en el calendario:
  cada año es su propia fila.
  **Repartida por meses y con buscador** (13-09-2026). Doce meses seguidos eran treinta y
  tantas filas iguales, y para saber si en marzo había algo había que ir bajando y leyendo
  la columna de la izquierda renglón a renglón; ahora cada mes lleva su rótulo encima y eso
  se contesta de un vistazo. El reparto lo hace `agrupaCumplesPorMes`, en `birthdays.ts`,
  porque es una cuenta de calendario: **el mes de hoy aparece por los dos lados** —la
  ventana son doce meses, no un año natural—, así que son dos grupos y el título lleva el
  año cuando no es el de hoy («Septiembre» el de ahora, «Septiembre 2027» el de dentro de
  un año). El buscador es el de `ViewHeader`, con el umbral de siempre
  (`MINIMO_PARA_BUSCAR`); mira solo el nombre —es lo único que hay— y sin tildes, como en
  las listas. Buscando se siguen viendo los meses: de un nombre lo que se quiere saber es
  justo cuándo cae.
  **El nombre va en tinta y sin nada delante** (14-09-2026, en dos pasos el mismo día).
  Iba dentro de una pastilla de color, como en Inicio y en la agenda, y aquí no
  funcionaba: allí la pastilla nombra a quien lleva un plan entre cosas que no son
  personas, y esta pantalla es una columna en la que **todas** las filas son un nombre.
  El arreglo fue mover el color a un punto de 8 px delante, y el punto se fue después por
  lo mismo, visto ya en la lista entera: en doce meses de cumpleaños los de la casa son
  cuatro o cinco y el resto —la abuela, el amigo del cole— no tienen color, así que era
  una columna de treinta puntos grises con cuatro de color. Eso no dice de quién es cada
  fila, dice que hay una decoración. El color de una persona sigue donde sirve: los planes
  de Inicio y la agenda del calendario.
  En "Más" va **encima de Documentos** y no al final: entre las cuatro, Documentos es la
  que menos se abre y la última fila de una lista es el sitio de lo que menos se usa, no
  el de lo último que se añadió.
- **Se apunta en la cesta desde Inicio** (09-09-2026): «Listas de casa» lleva un `+` que
  abre el mismo `ItemSheet` con la cesta que más cosas tiene pendientes y lo dice en el
  título («Añadir a Compra»). Sin selector de listas delante a propósito: existe para que
  «se ha acabado el café» cueste dos toques y no cuatro. Sin ninguna lista creada no hay botón.
- **Ajustes solo ofrece lo que puedes hacer** (09-09-2026). El lápiz de la familia,
  «Invitar persona», cancelar una invitación, cambiar un rol, quitar a alguien y las
  franjas de comida son de un administrador —lo dicen las policies de `families` y
  `family_invites` y las tres RPC de miembros— y a quien no lo es no se le enseñan, con una
  línea que dice por qué. Tu nombre y tu color siguen siendo tuyos. **En duda se enseña**:
  solo se cierra cuando consta que eres `member`.
- **Guardar confirma** (09-09-2026): donde antes solo se decía «Guardando…», ahora se dice
  también «Guardado» durante segundo y medio. Sale de ver `isSaving` apagarse sin error, así
  que no hay que tocar ninguna de las cuarenta escrituras. Manda el error si lo hay, y el
  «Hecho · Deshacer» si la acción trae el suyo.
- **La fila de una lista se queda con lo que se hace en el súper** (09-09-2026): marcar y
  las unidades. Mover y borrar están en el sheet, que se abre tocando el nombre. Eran
  cuatro botones de 28 px a 2 px unos de otros en el borde por donde pasa el pulgar.
- **Lo que falta se manda a un chat** (09-09-2026): el detalle de una lista lleva un botón
  de compartir —solo si el navegador sabe y solo si falta algo— que abre el diálogo del
  sistema con la lista escrita (`listaParaCompartir`). Va **solo lo pendiente**, no el
  catálogo: es el encargo, no el inventario. La mitad de las veces quien va al súper no
  tiene cuenta.
- **Documentos enseña cuatro categorías y un «+N más»** (09-09-2026): con ocho, la tira
  envolvía en tres filas y se comía 230 px antes del primer papel. La que está puesta se
  enseña siempre, aunque caiga fuera de las cuatro.
- **Una semana de Comidas vacía ya no son 35 «Añadir» iguales** (09-09-2026): solo el día de
  hoy lo enseña y el resto aparece al pasar por encima. Solo en `lg:`, que es donde vive la
  rejilla.
- **Un hueco vacío ya no explica la pantalla** (09-09-2026). Los `EmptyState` eran doce
  párrafos de manual repartidos por la app —"Apunta lo que hay que hacer en casa: llamar
  al fontanero, renovar el DNI, sacar la basura los martes"—, leídos una vez y estorbando
  siempre. Queda el emoji y el título. La `description` sobrevive **solo para decir qué se
  ha buscado** ("Ninguna tarea pendiente con «pan»"), que informa en vez de explicar; donde
  el motivo del vacío era información y no manual, se subió al título (las tres ramas de
  "Sin partidas" en Finanzas: no es lo mismo un mes al que no se le puso ninguna que uno
  del que no se guardó el plan). La ayuda, cuando la haya, irá en su propia sección. De
  paso, Documentos y el "Sin menú para hoy" de Comidas dejaron de escribir su vacío a mano
  y usan el componente.
- **El `+` de Comidas es el mismo que el de las demás** (09-09-2026): era el único botón de
  alta de la app con la palabra escrita al lado (`＋ Añadir`), y solo en escritorio, porque
  esa cabecera lleva el paso de semana y no puede usar `ViewHeader` entero. El botón sí es
  el de `ViewHeader`.
- **De quién es algo se dice siempre igual** (10-09-2026): `.etiqueta-persona` +
  `fondoDePersona`, el color de la persona de fondo y el nombre en tinta. La última que
  quedaba en color macizo era la de los planes de hoy en Inicio, justo la tarjeta que más
  se mira. Medida sobre su fondo real —`bg-white/80` encima de la tarjeta cálida— da
  12,45:1 con el rosa de un hijo y 7,10:1 con el ladrillo de un adulto, mejor que el
  10,24 y 5,42 de antes. `textColorOn` sigue en pie para lo que **no** es una etiqueta de
  nombre: los avatares de Ajustes y del pie de la cuenta, y el icono de la tarta de un
  cumpleaños, que son una inicial o un icono sobre el color macizo.
- **Guardar un papel se hace con los controles de la app** (10-09-2026): el sheet de
  Documentos era el único sitio donde una categoría se elegía con una pastilla distinta de
  la de los filtros de su propia pantalla —30 px sobre fondo beige contra 44 sobre
  blanco— y el único donde de quién es algo se elegía sin color, con chips de texto.
  Ahora la categoría es `CategoryChip`, el mismo componente que la tira de filtros, y de
  quién es va con el `AssigneePicker` de Tareas, el calendario y Finanzas, con su rótulo
  propio («De quién es»): lo único que cambiaba de verdad era la pregunta, no el control.
  De paso, esos chips dejan de quedarse en 30 px, por debajo del mínimo de 44 de la casa
  que en un sheet no vigila `e2e/movil.spec.ts` porque mientras está cerrado es `inert`.
- **La tarjeta de un documento dice la categoría con el icono y ya** (09-09-2026): era una
  píldora gris con el nombre escrito, y en una fila donde ya compiten la caducidad, el
  tamaño y la fecha se llevaba el ancho para repetir la palabra por la que muchas veces se
  acaba de filtrar. Es lo que hacen la tarjeta de una nota y la de una lista con su emoji;
  el nombre sigue ahí para el lector de pantalla y al pasar el ratón. Y de quién es va con
  **la etiqueta de toda la app** —el color de la persona de fondo y el nombre en tinta—,
  que era la última que quedaba en color macizo con el texto calculado encima.
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
  **En móvil, Ajustes es un índice** (09-09-2026): `/settings` abre una lista de filas
  con icono y chevrón —Familia, Casa, Cuenta, Sincronización, Legal— y cada una entra en
  su sección, con un "‹ Ajustes" para volver. Son enlaces de verdad, así que el botón de
  atrás del teléfono también vuelve. Antes eran cinco pastillas de texto que a 390 px se
  partían en dos filas con el borde derecho a jirones, y obligaban a elegir sección antes
  de saber qué había en cada una. En escritorio no cambia nada: siguen siendo pestañas de
  pie desde el 02-09-2026 —columna de secciones con icono a la izquierda, pegada para que
  sigan a la vista, y contenido a la derecha hasta `lg:max-w-5xl`—, la activa marcada con
  el verde clarito de `SideNav` y las demás en texto. Sin `?seccion=`, escritorio abre
  Familia y móvil el índice: la diferencia la hace `esSeccionConocida`. Cambiar contraseña
  (`AccountActions.tsx`) y borrar cuenta siguen dentro de Ajustes. **Cerrar sesión
  deja en la portada** (02-09-2026), no en el login: quien sale de casa no está
  intentando entrar, y al login se llega desde un correo, no al terminar.
- Listas, Tareas, Comidas, Notas y Documentos abren con la misma fila (`ViewHeader.tsx`,
  28-08-2026): resumen, buscador y el `+` de alta, bajo el título de la cabecera. El `+`
  de Tareas estaba flotando abajo a la derecha y era el único fuera de sitio.
- **El enlace del pie de cada sección de Inicio se lee** (08-09-2026): «Ver calendario»,
  «Ver todas las listas» y los demás van en `primary-strong` (4,81:1) y con un chevron.
  Estaban en el verde de marca sobre blanco, 2,61:1 en el texto más pequeño de la
  pantalla, así que el único sitio pulsable de cada tarjeta era el que peor se leía. Es un
  solo `SectionLink` y arregla los seis pies de una vez.
- Páginas legales públicas `/privacidad` y `/terminos`.
- **Página de inicio pública** (`/`, `LandingPage.tsx`), en una sola página con la
  barra de arriba pegada y **"Entrar" y "Crear cuenta" siempre a la vista** —el segundo
  lleva a `/auth/login?modo=registro`, que abre ya en el formulario de registro—. Por
  orden: presentación, "Así se ve" con las capturas, "Cómo funciona" en tres pasos,
  "En qué ayuda", "Preguntas" (`details` nativos, plegados) y "Por qué existe Farpi",
  que cierra la página. Hubo una sección de contacto detrás de la carta y se quitó el
  01-09-2026: la carta ya pide las sugerencias y da el correo, y pedir lo mismo dos
  veces seguidas resta. Las secciones se enlazan desde la barra **solo en `lg:`**.
- **Se entra desde la propia portada** (01-09-2026): no hay botones que lleven al
  login, está **el formulario de verdad**. `AuthCard` (`src/components/auth/`) tiene las
  dos pestañas, Google si el proveedor está activo, los campos y recuperar contraseña,
  y lo montan los dos sitios: `/auth/login` y la portada. No hay copia: un segundo
  formulario de autenticación diverge en cuanto alguien toca un mensaje de error.
- **Y desde el 02-09-2026 dicen también lo mismo alrededor del formulario.** La
  columna de presentación del login (`LoginHero.tsx`) tenía titular propio, una
  insignia de corazón y una línea de escudo al pie; ahora lleva el titular de la
  portada, la casa de `DayIllustration` y `Garantias`, que es lo que ve quien llega
  desde una invitación por correo o un enlace de recuperación. El tramo del día lo
  calculan las dos con `getDayPeriodEnMadrid`: se pinta en el servidor, que va en
  UTC, y ese apaño estaba escrito solo en la portada.
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
  - **La casa de Inicio va al lado del titular** (`DayIllustration`), con su cielo
    cambiando según el tramo del día. Al lado y no encima: sola en su línea se quedaba
    en mitad de la nada. Es una sola, colocada en una rejilla de dos columnas: en móvil
    acompaña al titular y el párrafo pasa por debajo; en escritorio baja las dos filas y
    se pone junto al bloque entero, que es donde hay sitio para que sea grande. Se pinta en el servidor, y por eso `getDayPeriodFromHour`:
    en Vercel el servidor va en UTC, así que la hora se pide en la de Madrid.
  - **El ritmo lo marca el fondo**: van en bloque de color las **tres** que enseñan algo
    —las capturas, las secciones de la app y la carta— y el resto respira. Hubo un
    momento en que estaban todas en bloque y el problema volvió por el otro lado: cuando
    todo es un cuadro, ningún cuadro significa nada.
  - **Cada título lleva una rayita de color encima** (`TituloSeccion`). Hace el trabajo
    que hacía la caja —decir "aquí empieza algo"— sin encerrar la sección, y es el único
    color de marca de la página fuera de los botones.
  - **Bajo el titular, tres palabras**: privado para tu familia, gratis, sin anuncios.
    Quien llega de fuera pregunta eso antes que nada y estaba contestado en las
    Preguntas, a tres mil píxeles.
  - **"Por qué existe Farpi" se lee como una carta**: fondo cálido, cuerpo más grande y
    la frase del nombre de la hija sacada aparte en un `blockquote`. Era lo más personal
    de la página y estaba maquetado igual que las preguntas frecuentes.
  - **Las capturas, escalonadas y torcidas un pelín**, y se enderezan y levantan al pasar
    el ratón. Solo desde `lg:`, y anuladas con `motion-reduce`. Dos columnas en `lg` y
    tres en `xl`: a tres en un portátil de 1024 px los móviles no se leían.
- **Los datos de demo son los de una casa, no los de un bebé** (01-09-2026). Los adultos
  son **Carlos y María** y la hija se llama **Cris**; sigue estando (su pediatra, su vitamina, su cartilla, su cumplemes),
  pero alrededor hay lo que tiene cualquier casa: la ITV, el dentista, una cena con
  amigos, la lavadora, la basura, el seguro del coche, la gasolina, el bricolaje. Antes
  todo giraba alrededor del recién nacido y quien no tuviera hijos no se reconocía en
  las capturas de la portada, que es de donde salen. Cambiar esos textos obliga a tocar
  las comprobaciones de la suite que los buscan por su nombre y a regenerar las capturas.
  Dos reglas que salieron de ahí: **las listas son de cosas y no de tareas** (una lista
  con "sacar la basura" dentro es una lista de tareas mal puesta), y **lo que crea un
  test no puede llamarse como algo de la demo**, porque el filtro por texto engancha los
  dos y Playwright para por ambigüedad.
- **Hay un cumpleaños en la demo** desde el 01-09-2026 (la abuela Marisa, el 22 de
  junio): el bloque de cumpleaños de Inicio no tenía datos y no se pintaba nunca, así
  que esa parte de la app no se veía ni usando el modo demo. Queda a 1.800 px del alto
  de la pantalla, así que en la captura de la portada, que es de 844 px, no entra.
- **El texto no lleva ni un guion largo** (01-09-2026). Se usaban a puñados para meter
  incisos y son de las cosas que delatan un texto escrito por una máquina. Van con
  comas, con paréntesis o partiendo la frase. En los comentarios del código se quedan:
  ahí no lee nadie de fuera.
- **La carta la escribió Omar**, no se redactó a partir de lo que contó. Se intentó dos
  veces y las dos sonaron a folleto: la primera demasiado redonda, la segunda demasiado
  cortada. La buena salió cuando la dictó él y la edición se limitó a ortografía, dos
  concordancias y partir una frase. Queda avisado en el propio componente: ahí no se
  "mejora la redacción". Lo único que se le ha quitado, y lo pidió él (03-09-2026), es
  **Nido**: contaba el cambio de nombre dos veces y esa vuelta solo interesa a quien
  estuvo delante. De dónde sale "Farpi" se queda.
- **Los textos de la portada dicen qué se gana, no qué trae** (03-09-2026). El párrafo del
  titular era un inventario de siete secciones y ahora es una frase; los pies de las
  capturas, una frase corta cada uno en vez de dos líneas explicando la pantalla que se
  está viendo al lado. Dos preguntan, Comidas («¿Qué comemos esta semana?») y Finanzas
  («¿En qué se nos va el dinero?»): es la pregunta con la que se entra en esas dos
  pantallas. La de Finanzas dijo «Cuánto queda del mes» un día y se leía como cuántos
  **días** quedan. En "En qué ayuda", Comidas nombra el **comedor** (media sección se
  quedaba fuera) y Finanzas habla de controlar el dinero de la casa y no de "quién ha
  puesto qué", que puesto en la portada suena a llevarle la cuenta a la pareja. Las
  **Preguntas** son cinco y contestan como una persona; se fue la de la cobertura, que
  explicaba una limitación con cariño en un sitio donde nadie la había preguntado. El
  párrafo del titular se cambia **en los dos sitios**: portada y `LoginHero`.
- **El botón de "Continuar con Google" usa la paleta de Google** al pasar el ratón y al
  pulsarlo (03-09-2026): `#E8F0FE` con borde `#4285F4` para el hover, `#D2E3FC` con borde
  `#1A73E8` mientras está pulsado, más el hundido al 97 % de `Button`. Es **el único azul de
  la app**, y los valores van literales y no como token de `globals.css` a propósito: no son
  colores de Farpi, y un token invitaría a usarlos en otro sitio (igual que los cuatro
  `fill` del logo). Antes tenía solo `hover:bg-surface`, que en un móvil se queda pegado
  después del toque y encima está a un paso del blanco. **Ojo al verificarlo**: ese botón no
  se ve en modo demo, porque sin credenciales `AuthCard` pinta "Modo local activo" en lugar
  del formulario.
- **Se dice "casa" y no "hogar"**, y se preguntó (03-09-2026). "Hogar" es la palabra de los
  seguros y de los anuncios de sofás. Además "¿Qué tenemos que saber hoy en casa?" está en
  el titular, en las metaetiquetas, en el aviso de las notificaciones, en `gen-capturas.mjs`
  y en los papeles: cambiarla no es cambiar un texto, es cambiar la marca.
- **El enlace se ve al compartirlo** (01-09-2026): `openGraph` y `twitter` en
  `src/app/layout.tsx`, con `metadataBase` sacado de `SITE_URL`, y `public/og.png`
  (1200×630) que compone el mismo `gen-capturas.mjs` con la captura de Inicio y la
  Nunito. Farpi se comparte por WhatsApp entre familias, no por un buscador, y hasta
  ahora el enlace viajaba pelado.
- **Capturas de la app de verdad** en "Así se ve", que genera
  `node scripts/gen-capturas.mjs` contra la app en modo demo con el reloj congelado en
  el 17-06-2026, la fecha de los datos de ejemplo. No son maquetas y no envejecen a
  escondidas: si la interfaz cambia, se relanza el script. Cada pantalla puede llevar un
  paso `preparar` (la de la semana cambia de vista antes de la foto). El script saca
  **nueve**; la portada enseña **seis** (inicio, el mes, listas, comidas, finanzas,
  documentos) a dos columnas y 314 px cada una. Las nueve en 3×3 eran un muro: a 200 px
  una pantalla de móvil no se distingue de otra y el pie de foto hacía todo el trabajo.
  Lo que las hacía ilegibles era el **ancho**, no el número: a dos columnas da igual que
  haya cuatro o seis, solo alarga la sección. Están elegidas por forma distinta para que
  la rejilla no parezca una cosa repetida. Las otras tres se siguen generando para la
  ficha de Google Play. En móvil se arrastran de lado encajando de una en una.
- **Y se ven nítidas, que costó tres arreglos** (01-09-2026). Una captura de móvil se
  enseña a la mitad de tamaño, así que el texto de la app cae a unos 7 px y cualquier
  pérdida se nota:
  - El `sizes` decía 250 px fijos, pero en `lg` el hueco mide 291: el navegador bajaba
    una imagen de 256 px y la **estiraba**. Ahora va por tramos y pide el doble del
    hueco, para que el navegador reduzca en vez de ampliar.
  - `quality={90}`, porque a 75 el texto pequeño se empasta.
  - **`images.qualities: [75, 90]` en `next.config.ts`**: Next 16 cambió el valor por
    defecto a `[75]` y a secas —un `quality` no permitido no falla ni avisa, se redondea
    al más cercano—. Sin esa línea el `quality={90}` no hacía nada.
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
  **173/173** (22-09-2026, con la huella del movimiento del banco). Las 21 migraciones numeradas que lo precedieron se aplastaron el 26-08-2026
  y siguen en el historial de git, que es donde va la historia; este documento contaba
  hasta hace poco una lista de migraciones aplicadas que ya se había quedado corta dos
  veces. Cuando el esquema cambie se edita ese archivo, se aplica el trozo suelto en el
  SQL Editor y se vuelve a pasar `node scripts/validate-rls.mjs`.
- **Y es lo único que hay, literalmente: un solo `.sql` en la carpeta** (15-09-2026). El
  trozo suelto que se pega en el editor sale de `git diff supabase/schema.sql` y **no se
  guarda**. Entre el 02 y el 05-09-2026 llegó a haber cinco archivos más —tres
  `aplicar-*.sql` para reejecutar y dos `parche-*.sql` como registro del día— y eran una
  carpeta de migraciones rehaciéndose por la puerta de atrás. Se fueron porque la regla
  que los sostenía («se reescribe entero en cada cambio») se incumplió las dos veces que
  importaba: una dejó doce días la copia del cierre de mes sin el `coalesce` de los
  ajustes de un fijo, debajo de una cabecera que invitaba a reejecutarla. Si algún día hace falta un backfill de datos —lo único que un
  archivo de esquema no sabe contar— irá suelto a `supabase/datos/` con su fecha.
- **El archivo y la base de la familia divergen en una cosa, y solo en una** (15-09-2026):
  tres índices que sobraban —`tasks_family_idx`, `meal_plans_family_date_idx` e
  `idx_events_kind`— se quitaron del archivo y **no** de la base, porque tres índices de
  más en una app de veinte filas por tabla no justifican tocar producción. Los dos
  primeros eran prefijos exactos de índices que ya existen y el tercero no lo usaba
  ninguna consulta. Una base nueva nace ya sin ellos; el `drop` para alinear una vieja
  está al final del bloque de índices de `supabase/schema.sql`, y la cabecera lo declara.
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_family_member_profile`: nombre y color del miembro, editables por él mismo o por un admin de su familia. Sustituye a `update_my_family_profile`.
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
- Asignación de eventos y documentos a cualquier miembro de la familia, no solo a hijos.
- Vacaciones: eventos de varios días por persona, pintados como franja en el calendario. Solo se ven en el calendario: fuera de la lista de eventos y de los planes de hoy.
- Perfil del miembro: nombre editable también por el admin, y color propio elegible como el de los hijos.
- Tareas con dueño: se asignan a un adulto o a un hijo como los eventos y los documentos, y se guarda quién las marcó.
- Caducidad de documentos: fecha opcional, aviso en la tarjeta a 30 días (`DIAS_AVISO_CADUCIDAD`) y en el recordatorio diario.
- Adultos sin cuenta: un abuelo se da de alta con nombre y color, sin correo y sin acceso a la app, y se le asigna igual que a un hijo (21-08-2026). Viven en `children` con `kind = 'adulto'`; el porqué está en «Decisiones de producto» de `docs/architecture.md`.
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
- PWA: iconos any + maskable + apple-touch, `manifest.json` con purposes (script `scripts/gen-icons.cjs`) y service worker con fallback `/offline`. El service worker **solo cachea navegaciones que salieron bien** (28-08-2026): cacheaba cualquier respuesta, y con la pantalla de avería eso dejaba el error pegado a `/home`. Desde el 03-09-2026 son **dos cachés** (`farpi-paginas-v1` y `farpi-estaticos-v1`) y **cerrar sesión vacía la de páginas**: lo que se guardó de una navegación es una página que se vio con la sesión abierta. Hoy no filtra nada —las pantallas son cascarones de cliente— pero era una invariante que nadie había escrito, y el día que una página del grupo `(app)` renderice en servidor, un móvil compartido lo enseñaría después de salir. Están separadas para poder tirar las páginas sin llevarse `/offline`, que solo se repone en el `install` del worker siguiente. Comprobado en un navegador real contra `npm run start`, que es la única forma de verlo (en `npm run dev` no se sirve lo mismo).
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
  puede atravesar la pieza que puede estar colgada. **Dada de alta en UptimeRobot el
  15-09-2026**, cada cinco minutos y con aviso por correo, contra el `www` y no contra
  el ápice.
- Vistas grandes despiezadas: cada pantalla con estado propio tiene su hook (`useListsState`, `useMealsState`, `useDocsState`, `useEventSheet`) y los bloques de UI viven en su fichero (`WeekGrid`, `MealRow`, `DocCard`, `FileTypeIcon`, `OffDayConfirmDialog`, `LoginHero`, `EventRecurrenceFields`, `EventSeriesDelete`, `ListItemRow`). `EventSheet` fue el último: de 483 líneas a cuatro piezas.
- Andamiaje de sheets unificado: `useSheetForm`/`useSheetDelete` (`src/hooks/useSheetForm.ts`) y los componentes `Field`, `SheetFooter`, `SelectChip`, `DotOption` y `EmojiPicker` en `src/components/ui/`.
- **859 tests con el runner de Playwright**, sin dependencias nuevas. Este es el
  **único** sitio con el recuento exacto: el resto de documentos habla de "los
  unitarios" y "los de navegador", o los aproxima, para que no haya seis cifras que
  actualizar a la vez.
  - **660 unitarios de lógica pura** en `e2e/unit/`, contados en la pasada del
    21-09-2026. No levantan servidor: `npm run test:unit`.

    *Los últimos en entrar*, del más reciente al más antiguo:

    - Los **cincuenta y siete del extracto del banco** (21-09-2026, más el de navegador
      del 22-09 que vigila que vaciar un mes no se lleve ni los otros meses ni los fijos):
      veintisiete de
      `n43.ts` —cada campo en su posición de la norma, el cuadre contra lo que el
      propio fichero dice de sí mismo, y que la huella **no se lleva el número de
      cuenta** a la base— y veintiocho de `importacion.ts`, que son las tres formas de
      contar dos veces el mismo dinero: lo ya apuntado, lo que cubre un fijo y los
      traspasos entre cuentas propias —entre ellos, que **un apunte tapa a uno y no a
      los que se le parezcan**: con dos ingresos iguales el mismo día y uno ya apuntado
      en casa, el segundo tiene que llegar marcado—.

    - Los **seis del borrador que sobrevive al viaje a Google** (17-09-2026): que
      vuelve tal y como se dejó, que se recupera una sola vez, que lo guardado sin
      forma de borrador se descarta, que el archivo no viaja y que sin almacén no
      revienta nada.
    - Los **cinco de `selectVisibleDocuments`** (17-09-2026): la categoría acota y la
      búsqueda busca dentro de lo acotado. Vivía suelto dentro de `useDocsState`, que
      es un hook y no se prueba sin navegador.
    - Los **dos de cómo se llama un archivo en una frase** (17-09-2026): «Documento
      PDF», «Imagen JPG», y qué se dice de un tipo que hoy ya no se deja subir. La
      función vivía dentro de `FileTypeIcon.tsx`, así que no la probaba nadie.
    - Los **veintiuno del aviso de las nueve** (15-09-2026): qué dice la notificación de
      la mañana. Que el título es el día en el calendario de la familia y no en el del
      servidor, que la hora de un plan se traduce a la de Madrid y no a la de la función
      de Vercel que la envía, que un plan de todo el día no se inventa las 00:00, que del
      cuarto en adelante se cuentan en vez de nombrarse y que sin ningún plan las tareas
      necesitan el verbo delante.
    - Los de **Finanzas** (14-09-2026): agrupar los apuntes por días y por meses, con lo
      entrado y lo salido sin restarse; buscar cruzando los meses, sin tildes y también
      por el nombre de la partida, y que sin consulta no devuelve todo sino nada; qué se
      ofrece como «lo de siempre» —solo lo que se repite, con la partida y el texto de la
      última vez—; el orden de las partidas por uso; y si hay que cerrar el mes pasado,
      que es la regla que le da historia a la sección y vivía sin test dentro de
      `StoreProvider`.
    - El **reparto por meses de la lista de Cumpleaños**: que un mes que vuelve a
      aparecer es su propio grupo y que el año solo se escribe cuando no es el de hoy.
    - El **reparto de las franjas de ausencia** de un día del mes —que la franja de la
      casa solo se calla lo que ella misma dice, así que el descanso de quien no tiene
      cuenta se queda, y que el tope lo aplica quien pinta— y la agrupación por personas
      del bloque de vacaciones y descansos.

    *Qué cubren en total.* De siempre: recurrencia, fechas —incluido el tramo del día en
    la hora de Madrid, que deciden en el servidor la portada y el login—, selectores,
    validadores, asignaciones, eventos, tramos y agrupación por persona de la agenda, eje
    de horas, franjas de comida —con el comedor y los platos de una comida desde el
    02-09-2026—, detección de modo demo y el almacenamiento de documentos —caducidad del
    token, URL de consentimiento, traducción de los errores de Google y cifrado—. Y por
    fechas:

    - **31-08-2026**, el dinero: la conversión de lo tecleado a céntimos en las dos
      direcciones, el formato en euros, las partidas —cuánto llevas, cuánto te has
      pasado, quién ha puesto qué—, la agrupación de los presupuestos pedidos desde el
      01-09-2026, los fijos y la cuenta del mes —qué entra, qué sale, qué queda, y que un
      ingreso ni toca las partidas ni entra en el reparto—.
    - **02-09-2026**, los meses cerrados: qué plantilla valía en cada mes, que la copia
      manda sobre el espejo aunque el mes no haya terminado, y que un mes sin plan no se
      inventa uno.
    - **03-09-2026**: qué categorías se ofrecen como filtro en Documentos; qué direcciones
      acepta `/api/push` —la lista blanca de los cuatro servidores de push, que es lo que
      evita que el cron visite cualquier URL—; las líneas que enseña cada partida al
      abrirse, que tienen que sumar exactamente su cifra; qué `?next=` se acepta al volver
      de un enlace de correo —incluidos los caracteres que el navegador borra de una URL
      antes de interpretarla, que se colaban por el filtro—; y qué peticiones se dan por
      venidas de otra web, que es lo que sostiene la guarda de CSRF de las rutas que
      escriben.
    - **04-09-2026**: qué meses ofrece la tira de Finanzas —que llega hasta el más viejo
      con algo y no más, y que ningún mes con un apunte se queda fuera por lejos que
      esté— y que los doce meses abreviados miden lo mismo. Y, desde «Estadísticas», el
      ritmo de gasto acumulado día a día (que nunca baja, que ignora los ingresos y que
      estira el último día de un mes corto en vez de hundirlo a cero), la variación de
      cada partida frente al mes anterior (casada por nombre, y `null` cuando no hay con
      qué comparar, que no es lo mismo que cero), las partidas que se pasan a menudo y el
      reparto de lo que entra, cuyas cuatro partes tienen que sumar exactamente lo que
      entra.
    - **05-09-2026**, los ajustes de un fijo en un mes: que el mes ajustado vale el ajuste
      y guarda la referencia al lado, que no se contagia al mes siguiente ni a los demás
      fijos, y que un mes cerrado no los mira.
    - Sin fecha propia: qué plan de hoy ha pasado ya y cuál es el siguiente, qué papeles
      caducan o han caducado, y cuándo un día es de ausencia de la familia entera —quién
      cuenta, cuántos hacen falta y dónde empieza y acaba el tramo—.
    - **08-09-2026**: con qué nombre sale un documento de Farpi —la extensión no está en
      el nombre guardado y sin ella no abre nada— y qué mensaje lee la familia cuando la
      ficha no tiene dueño.

    Los 19 de `timeline.spec.ts` se fueron con el eje de horas del móvil el 24-08-2026 y
    **volvieron el 26-08-2026** con las vistas Día y Semana de escritorio, sin tocar una
    línea.
  - 199 de navegador. La cifra sale de la pasada completa del 22-09-2026 (859 en total,
    660 unitarios; los últimos, el **del extracto del banco** del 21-09-2026 —que el
    fichero sube, que lo que ya cubre un fijo llega desmarcado y con su motivo escrito,
    que lo confirmado aparece en el mes y que **el mismo fichero dos veces no apunta
    nada la segunda**, que es lo que paga el `import_ref` de la base—, más los cinco que
    añade la ruta nueva por serlo; antes, los **nueve de los 44 px por dentro** del 17-09-2026 —los
    siete sheets de alta abiertos uno a uno, los días de una repetición semanal y la ficha
    de una persona, que no se abre desde ningún `+`—, antes los **seis de Documentos** —que el sheet
    dice qué falta en vez de apagar el botón de guardar, que el archivo elegido no se
    queda puesto para el siguiente documento, que lo escrito antes de ir a conectar Drive
    sigue ahí al volver y se gasta al recuperarlo, que llegan a 44 px los controles del
    sheet de edición y los del aviso de vuelta de Drive —los dos sitios que el bucle de
    rutas no podía ver— y que la tira de categorías dice cuál está puesta y se vuelve a
    plegar—, y antes los cinco de Finanzas del
    14-09-2026 —que el buscador cruza los meses y dice cuánto suma lo encontrado, que
    «El día a día» va por días con la cifra de cada uno, que lo apuntado dos veces se
    ofrece con su partida, que un presupuesto aceptado se apunta y lleva al mes en el
    que cae, y que las cuatro
    pestañas caben enteras a 390 px sin arrastrar— y antes la pantalla de Cumpleaños: que junta los dos orígenes sin
    distinguirlos, que su `+` abre el sheet del calendario sin el selector de «Qué es» y
    —desde el 13-09-2026, dentro de ese mismo recorrido— que la lista sale repartida por
    meses y que el buscador filtra por nombre, y que la lista de debajo del mes del
    calendario se va con el mes que se mira, más los que cada recorrido de rutas añade
    solo por tener una ruta más):
    `smoke.spec.ts` (login demo → /home), `runtime.spec.ts` (apertura de sheets y flujos CRUD), `movil.spec.ts` (390×844: desbordes, tamaño mínimo de los controles y que ningún sheet cerrado asome por abajo) y `escritorio.spec.ts` (1440 px: barra lateral, rejilla de comidas, la columna de acceso anclada de la portada y la de secciones de Ajustes, que se queda pegada al bajar; 1023 px: que por debajo del corte no cambie nada, Ajustes incluido). `npm run test:e2e` los corre todos levantando el dev server en :3100.
- **El contraste está medido y cumple AA, con dos excepciones escritas** (09-09-2026).
  Medido en el navegador, nodo de texto a nodo de texto contra su fondo real, en las diez
  rutas a 390 px: quedan **6** avisos y los 6 son deliberados —los días fuera de mes de la
  rejilla del calendario, apagados a propósito desde el 31-08, y el `·` separador de
  `Garantias`, que es `aria-hidden`—. Las reglas que lo sostienen:
  - **El verde de marca no es color de texto.** `primary` (#8BA888) da 2,61:1 sobre
    blanco. Todo texto e icono pulsable va en `primary-strong`, y también el estado
    elegido que antes era blanco sobre `primary`. Un botón primario se hace con `Button`,
    que ya lo lleva; los que se escriban a mano se quedan atrás, que es lo que pasó con
    once de ellos.
  - **`faint` y `muted-soft` tampoco.** Son para lo desactivado y para separadores
    `aria-hidden`. Lo que hay que leer va en `muted` o en `ink`. Está escrito en su token.
  - **El color de una persona va de fondo, nunca de texto.** Los seis de hijo viven en
    L\* 71-88 para llevar tinta encima. La pieza es `.etiqueta-persona` con
    `fondoDePersona`, y la usan el calendario, la fila de una tarea y los planes de Inicio.
  - `accent-strong` (#9B5A45) es el salmón legible: el color de «hoy» en la agenda, en el
    panel del día y en la cabecera de la vista de día.
  - **El rojo relleno con texto blanco es `danger-strong`.** `danger` se queda para
    bordes, fondos y gráficos, que solo piden 3:1.
- **Foco de teclado propio** (09-09-2026): `:focus-visible` global en `globals.css`, en
  `primary-strong` y con 2 px de separación. Antes era el anillo que pusiera cada
  navegador.
- **Ningún control baja de 44×44 px** (09-09-2026), que es lo que recomiendan Apple y
  Material y lo que mide un dedo. Lo vigila un segundo bucle de `e2e/movil.spec.ts`,
  aparte del de 24 px de la WCAG 2.5.8, que sigue siendo el suelo duro. Pasaron por ahí
  las pestañas de Ajustes y Finanzas, los chips de Documentos, las flechas de mes, los
  desplegables de la cuenta del mes, los campos de formulario, el enlace del pie de cada
  sección de Inicio, las seis pastillas de la barra de abajo y la papelera de una tarea.
  Una sola excepción, la que recoge la propia 2.5.8: un enlace `display: inline` dentro
  de una frase —el correo de la carta de la portada—, que no se agranda sin romper el
  renglón. Queda `.area-de-toque` en globals.css para los iconos que no pueden crecer a
  lo ancho; hoy no lo usa nadie de forma crítica.
  **Y dentro de los sheets también** (17-09-2026). Hasta ese día el bucle medía las
  pantallas y no los formularios —salta lo que cuelga de un `[inert]`, y un sheet cerrado
  lo es—, así que ahí dentro habían quedado chips de 30 a 34, las rejillas de emoji de 36,
  los catorce círculos de color de 36, las sugerencias de plato de 28 y el «Eliminar» de
  la cabecera de 28. Se subieron los siete controles que lo provocaban —`SelectChip`,
  `EmojiPicker`, `Suggestions`, `ColorPicker`, `DeleteButton` en su variante de cabecera,
  los chips de prioridad y repetición de una tarea y los del calendario— y ahora los
  sheets se abren uno a uno en `e2e/movil.spec.ts` y se miden por dentro. Dos con
  historia: la rejilla de emoji pasa a **seis columnas en móvil** porque ocho de 44 no
  caben en 350 px, y el interruptor de «todo el día» se queda igual de grande pero el
  botón que lo envuelve mide 44×44, que es lo que ya hacía la lista de franjas de
  Ajustes.
- **Los sheets atrapan el foco y lo devuelven** (`BottomSheet`, 09-09-2026): el panel dice
  `aria-modal` pero el `Tab` se escapaba a la pantalla de detrás, y al cerrar el foco se
  iba al `body` en vez de al botón desde el que se entró.
- **Las dos regiones que avisan están siempre en el DOM** (`SaveStatus`, 09-09-2026), una
  `polite` y otra `assertive`, y **son los mismos nodos que se ven**: una región viva
  insertada de golpe no se anuncia de forma fiable, y dos nodos con el mismo texto lo
  dirían dos veces.
- **Los errores de escritura se cuentan en castellano** (09-09-2026): `src/lib/errores.ts`,
  aplicado en `assertNoError`, que es por donde entra el único mensaje crudo de Postgres
  que hay. Las excepciones de las RPC ya vienen en castellano y pasan tal cual; las guardas
  internas del esquema no, porque son un fallo nuestro. Diez tests en `e2e/unit/errores.spec.ts`.
- **Ningún botón de guardar nace apagado por un campo vacío** (09-09-2026). Lo estaban en
  trece sheets, sin decir qué faltaba, y el mensaje de `validators.ts` era inalcanzable
  porque el submit no llegaba a dispararse. El `required` de los campos hace que el
  navegador pare el envío y lleve el foco al que falta; `formError` se queda para las
  reglas que cruzan campos. Sigue apagado lo que significa «hay algo en curso».
- **La carga inicial enseña la app apagada, no un texto** (`CargandoFarpi.tsx`,
  09-09-2026): detrás se están resolviendo diecinueve consultas y una frase centrada en una
  pantalla vacía se lee como un cuelgue.
- `scripts/validate-rls.mjs`: validación manual de RLS/RPCs/integridad contra el Supabase real, repetible tras cambios de esquema.

## Rendimiento

- **Invalidación por porción en el store** (03-09-2026). Cada escritura declara qué datos
  toca y solo se recargan esos. Antes toda escritura pasaba por un `Promise.all` de 18
  consultas con el dataset completo de la familia: marcar un ítem de la compra volvía a
  descargar eventos, comidas, gastos, notas y documentos. Ahora casi todas piden una sola
  porción; tres piden dos o tres (el nombre de la familia sale también en el selector;
  borrar una cesta se lleva sus ítems; borrar una partida toca gastos **y** las líneas de
  los meses cerrados) y **dos recargan todo a propósito** —borrar un hijo y echar a un
  miembro ponen su asignación a `null` en seis tablas—. Sin declarar nada se recarga todo,
  así que una escritura nueva que se olvide de declarar cuesta consultas, no corrección.
  El mapeo lo cubre `runtime.spec.ts`: recorre los CRUD de cada pantalla, y una porción mal
  declarada deja el dato viejo en la interfaz y tumba el test.
- Lo que **no** se ha tocado y sigue pendiente: los getters no tienen ventana temporal
  (`getEvents`, `getMeals`, `getExpenses` traen todas las filas de la familia desde
  siempre), y no hay actualización optimista en los dos gestos de más frecuencia. Las dos
  cosas son decisiones de semántica —hasta dónde puede navegar el calendario— y merecen su
  propia vuelta.
  **Y se decidió no tocarlo todavía** (14-09-2026, mirándolo para cerrar Finanzas).
  `expenses` es la tabla que más crece —unas mil filas al año en una casa que apunta— y
  además la miran cosas que **necesitan la historia entera**: `mesesNavegables` llega
  hasta el mes más viejo con algo, `serieDeMeses` y `ritmoHabitual` leen seis meses, y el
  buscador cruza todos por definición. Una ventana ciega (`gte` de fecha) rompe las cuatro,
  así que esto no es «añadir un filtro» sino decidir hasta dónde se puede mirar y traer
  los agregados por otro lado. Con el tamaño de hoy no se nota y el índice
  `expenses_family_date_idx` ya está, así que queda **el umbral escrito en vez del
  trabajo hecho: revisarlo al pasar de ~3.000 apuntes**, que son unos tres años de uso.

## Correcciones de seguridad

- `my_family_ids()` con `set search_path = public` (evita search path hijacking).
- Eliminada policy de update libre sobre `family_members`; reemplazada por RPC (hoy `update_family_member_profile`).
- `family_invites` update con `using` + `with check`.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app. Sin eso,
  un enlace de correo legítimo podía acabar en otra web justo después de iniciar sesión.
- Seis cabeceras de seguridad en `next.config.ts`, **CSP incluida** desde el
  26-08-2026 (ver `architecture.md`: lleva `'unsafe-inline'` en los scripts porque Next
  los inyecta, y `connect-src` se arma con la URL real del proyecto).
- Rutas API: el motivo de un fallo va al log del servidor y la respuesta lleva un mensaje
  genérico, en las tres (`/api/push`, `/api/invite`, `/api/account/delete`). La excepción
  es el aviso del último administrador, que es una regla de negocio y hay que leerla.
- Sin `SUPABASE_SERVICE_ROLE_KEY`, las rutas que usan el cliente admin responden 503 en
  vez de reventar con el «supabaseKey is required» de la librería.
- Una invitación caduca a los 30 días (03-09-2026). El enlace del correo lo caduca Supabase
  a las pocas horas, pero lo que mete en la familia es el `invite_id` de la URL de vuelta, y
  esa URL se puede guardar: quien la tuviera apuntada entraba en casa un año después. La
  comprobación va después de la del email, para que solo se entere de la caducidad quien de
  verdad estaba invitado. Validado con la fila envejecida 40 días. Ajustes la
  etiqueta «Caducada» desde el mismo día: la decisión la toma la RPC, y
  `invitacionCaducada` (en `selectors.ts`) es solo lo que evita que la pantalla siga
  diciendo «Pendiente» de algo que ya no vale. Los 30 días están en los dos sitios
  —`DIAS_VALIDEZ_INVITACION` y el `interval` de la RPC— porque una función de Postgres no
  se importa desde TypeScript; si cambia uno, cambia el otro.
- `/api/push` solo acepta las direcciones de los cuatro servidores de push que existen
  (03-09-2026). Lo que se guardaba ahí no es un dato: es una URL que el cron **visita** todos
  los días, así que cualquier miembro podía dejar apuntado un destino cualquiera y usar el
  cron de mensajero. Detalle en `endpointDePushValido` (`src/lib/push.ts`) y en
  `docs/notificaciones.md`. Darse de baja no comprueba el host a propósito, para que una
  suscripción vieja siempre se pueda quitar.
- `documents` tiene `with check` propio sobre `storage_owner` (03-09-2026): esa columna es
  la que `/api/documents/[id]/file` usa para pedir prestado el token del dueño, y con la
  policy `for all using` a secas cualquier miembro podía escribir ahí el id de otro por
  PostgREST. Solo se presta la llave de uno mismo. Tres comprobaciones nuevas en
  `validate-rls.mjs`, en rojo antes de aplicarlo y en verde después.

- **Revisión de seguridad completa del 03-09-2026** (a la contra, buscando el hueco). No
  apareció ninguna vía para leer datos de otra familia: la RLS, las RPCs y el orden
  «cliente del usuario antes que service role» de las rutas de documentos aguantaron. Lo
  que salió y ya está arreglado:
  - **`/api/invite` era un amplificador de correo abierto a internet.** El registro está
    abierto, crear una familia te hace admin de ella y admin era lo único que pedía la
    ruta: cualquiera podía pedirle a Farpi que mandara correos con pinta de invitación a
    las direcciones que quisiera, desde el SMTP y el dominio de la app. Ahora hay tope de
    **diez invitaciones en 24 horas por persona que invita** (contado sobre
    `family_invites`, que es donde queda el rastro; por familia se saltaría creando otra)
    y el correo se valida también en el servidor, con el mismo `isValidEmail` que el sheet.
  - **Aceptar una invitación ya no se cree que tener la cuenta prueba tener el correo.**
    Eso lo decidía el ajuste «Confirm email» del panel de Supabase, y se apaga en un click:
    apagado, quien tuviera a la vista un `invite_id` podía registrarse con el correo de la
    persona invitada —sin leerlo— y entrar en su casa. `email_confirmed_at` no sirve de
    nada aquí, porque con el ajuste apagado Supabase da la cuenta por confirmada de
    fábrica; lo que distingue a quien de verdad estaba invitado es de dónde sale su cuenta,
    así que la RPC exige que la creara el propio correo de invitación (`invited_at`) o que
    ya existiera antes de escribirse la invitación.
  - **El dueño y la ruta del archivo de un documento no se reescriben** (trigger
    `trg_document_storage_inmutable`). El `with check` de la policy admite
    `storage_owner is null` —está ahí por las fichas de antes de Drive— y eso dejaba a
    cualquier miembro poner a nulo el dueño de un papel ajeno: no se lleva nada, pero deja
    el documento sin poder abrirse para toda la casa. Va en un trigger porque una policy
    no puede comparar con la fila anterior.
  - **Y de paso apareció un fallo que no era de seguridad sino de uso**, y que llevaba
    unas horas en producción: con la policy de `documents` en un solo `for all`, el
    `with check` de `storage_owner` se aplicaba también a los `update` —Postgres lo
    aplica a la fila nueva de cualquier escritura— y **nadie podía editar la ficha de un
    documento que hubiera subido otra persona**: ni el nombre, ni la carpeta, ni la
    caducidad. Lo encontró la comprobación que se había añadido para vigilar lo
    contrario, que el trigger nuevo no rompiera el renombrado. Ahora son cuatro policies:
    la regla del dueño vive solo en el `insert` y la inmutabilidad la sostiene el trigger,
    y las dos piezas van juntas.
  - **`safeNextPath` ya no mira solo el principio de la cadena.** El navegador borra
    tabuladores y saltos de línea de una URL antes de interpretarla, así que un
    `/
//otra-cosa.example` pasaba el filtro y se leía después como `///otra-cosa.example`.
    Ahora se limpian esos tres caracteres y la ruta se resuelve con `new URL` contra un
    origen inventado: decide el navegador, que es quien va a interpretarla.
  - **HSTS escrita en el repositorio.** La ponía Vercel por su cuenta, y era el único de
    los controles que vivía en la plataforma en vez de aquí.
  - **El build falla si producción arranca en modo demo.** El fallback sin credenciales es
    correcto en local y en un preview; en producción es la app entera abierta sin sesión
    —el proxy deja pasar todo en modo demo— sirviendo datos de mentira y aparentando
    funcionar, que es la avería que nadie mira.

  Lo que de esto era SQL —el trigger de inmutabilidad y las cuatro policies de
  `documents`— se aplicó en el proyecto real el mismo día, junto con la RPC de la
  invitación y la retirada del `insert` de `family_members` que sale en la lista de abajo:
  son las cuatro piezas de SQL de aquel día. Lo demás (`safeNextPath`,
  HSTS, el corte del build) es código y viaja con el despliegue. Validado después:
  **163/163**.

  Y los seis endurecimientos menores del informe, hechos en la misma sesión:

  - **Origen propio en las rutas que escriben** (`deOtroSitio`, en `src/lib/peticiones.ts`,
    llamado desde `requiereSesion`, que ahora **exige** la petición para que no se pueda
    olvidar). Lo paraba el `SameSite=Lax` de las cookies de Supabase, que es una defensa
    prestada. Un `GET` no entra: la vuelta de Google es cruzada y tiene que pasar.
  - **El `ref` de una subida tiene que ser de esa familia.** `POST /api/documents` daba de
    alta la ficha de cualquier archivo que alcanzara el token de quien llama; ahora se
    compara con la etiqueta `farpi_family` que el proveedor le puso al abrir la subida
    (`ArchivoGuardado.familia`).
  - **`family_members` se queda solo con `select`.** El `insert` dejaba a un admin meter
    en su familia el `user_id` que quisiera, sin invitación. Quien crea miembros son las
    dos RPCs `security definer`.
  - **`/api/salud` guarda la medida diez segundos.** Es pública por diseño y hacía dos
    peticiones a Supabase por llamada: un botón gratis para hacer ruido desde fuera. Un
    vigía pregunta cada minutos, así que nunca ve una guardada.
  - **El `Origin` de la subida a Drive sale de `SITE_URL`**, no de la cabecera `Host`, con
    respaldo solo en localhost. Mismo cambio que ya se hizo con el dominio del magic link.
    **Ojo**: si `SITE_URL` faltara en Vercel, subir un documento pasa a fallar igual que
    ya falla invitar.
  - **El `CRON_SECRET` se compara en tiempo constante.**
  Lo que la revisión dejó **abierto a propósito**, por ser decisión de producto: el
  registro sigue abierto a cualquiera, y `/api/invite` sigue distinguiendo con su código de
  respuesta si un correo ya tiene cuenta en Farpi (cerrarlo pide decidir antes qué pasa al
  invitar a alguien que ya está registrado, que hoy simplemente falla).
- **La ficha de un documento no cambia de familia** (23-09-2026). La policy de `update`
  solo pide que la familia **nueva** sea tuya, así que quien estaba en dos —la de la casa y
  una suya, gratis— podía llevarse un papel ajeno a la segunda, y el proxy lo seguía
  sirviendo allí con el token del dueño, también después de que lo echaran de la casa. Dos
  piezas: `trg_document_storage_inmutable` rechaza cambiar `family_id`, y
  `/api/documents/[id]/file` no sirve un archivo cuya etiqueta `farpi_family` no sea la de
  la ficha. Aplicado en el proyecto real y validado: **175/175**, con las dos comprobaciones
  nuevas en rojo antes de aplicarlo.
- **El enlace de invitación ya no abre una sesión sin preguntar** (23-09-2026). El callback
  abría en cuanto llegaba la sesión escrita en el fragmento de la URL, y esos tokens los puede
  poner cualquiera: un enlace preparado dejaba a quien lo abría dentro de la cuenta de otro, y
  lo que subiera después, en la familia de ese otro. Ahora el fragmento solo vale en un enlace
  de invitación, la pantalla enseña con qué correo se entra y hay que pulsar «Entrar»
  (`sesionDeInvitacion`, en `src/lib/peticiones.ts`, con sus unitarios). El alta, la
  contraseña olvidada y Google no pasan por ahí: van por PKCE.
- **El tope de invitaciones se cuenta donde quien invita no llega** (23-09-2026). Se contaba
  sobre `family_invites`, y un admin podía ponerlo a cero borrando sus invitaciones,
  cambiándoles la fecha o cerrando la familia con `delete_family`. Ahora cada envío es una
  fila de `invite_sends`, con RLS y sin policies, que solo lee y escribe `/api/invite` con la
  service role. Validado: **182/182**.

## Regla del último admin — DECISIÓN TOMADA

Una familia debe tener siempre al menos un admin. Están prohibidas cuando quedaría cero admins:

- Eliminar al único admin de una familia.
- Degradar al único admin de `admin` a `member`.

**Aplicación en Supabase:** validación mediante RPCs `security definer` (`remove_family_member`, `update_family_member_role`) y bloqueo en `/api/account/delete` cuando borrar una cuenta dejaría una familia compartida sin admin. No se implementa mediante policies RLS. Ver `architecture.md`.

**Aplicación en la UI:** `MemberSheet` bloquea degradar al único admin (calculado en `SettingsView`); el servidor es la validación autoritativa.

**Nota sobre policies:** `family_members` se quedó **solo con `select`** el 03-09-2026. No hay policy de `insert`, ni de `update`, ni de `delete`: entrar en una familia, cambiar un rol y echar a alguien pasan los tres por RPC.

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

Sin pendientes. La última pasada es del **23-09-2026**: **182/182**, con `invite_sends`, la
cuenta del tope de invitaciones, y siete comprobaciones de que nadie más que el servidor la
lee ni la toca —ni para borrar sus envíos ni para cambiarles la fecha, que eran las dos
formas de empezar de cero—.

Esa misma mañana, **175/175**, con el trigger de
`documents` que ya no deja cambiar `family_id`. Las dos comprobaciones nuevas —B no se lleva
un papel de A a su propia familia, y el papel sigue en la de A— salieron en rojo contra la
base antes de aplicar el SQL, que es lo que prueba que el hueco existía.

Antes de esa, la del **22-09-2026**: **173/173**, con
`expenses.import_ref` aplicada —la huella del movimiento del banco— y cuatro comprobaciones
nuevas. La que había que escribir sí o sí no es la del duplicado sino su contraria: que dos
apuntes escritos a mano, **sin** huella, siguen conviviendo. La restricción se apoya en que
en Postgres dos nulos no chocan, así que declarada con `nulls not distinct` habría roto lo
más común de la app y las demás comprobaciones habrían pasado igual.

Antes de esa, la del **04-09-2026**: **165/165**, con el arreglo del trigger
aplicado —el `on delete set null` de
`documents.storage_owner` se pisaba con el trigger de inmutabilidad del día anterior y
dejaba un 500 sin salida a quien hubiera subido un papel a una familia que le sobrevive— y
las dos comprobaciones nuevas, que son de las que dicen qué tiene que **seguir
funcionando**.

Antes de esa, la del **03-09-2026**, con
`node scripts/validate-rls.mjs` contra la base real y ya con las cuatro secciones de
la revisión de seguridad aplicadas: **163/163**. El detalle
—y por qué las que más importan son que nadie pueda llamar a `close_month_copy`
directamente, que un mes terminado no se pueda reabrir, que poner un mes a cero deje la
cabecera del plan, que nadie pueda apuntar una ficha al Drive de otro y que ni un admin
pueda meter a nadie en su familia a mano— está en
`docs/supabase-validation.md`. El delta que se aplicó a mano no se guardó: lo que vale es
`supabase/schema.sql`, y el trozo suelto de cada cambio sale de su `git diff`.

Entre aquella y esta hubo cinco pasadas más —117/117 y 139/139 el 02-09-2026, y 149/149, 152/152 y 154/154 el 03-09-2026—, contadas una a una en `docs/supabase-validation.md`. Antes de todas ellas, la pasada del **01-09-2026 (tarde)** dio **106/106**. Las siete últimas son de la reforma de los fijos:
tres de las de siempre sobre la tabla nueva —A crea, B no ve, B no puede escribir—, que
pesan más que en otras porque ahí está lo que más dice de una casa, cuánto cobra cada uno;
dos de los triggers de asignación entre familias, que un fijo tiene por llevar el mismo par
`child_id`/`member_id`; y dos de los `check` que sostienen el vocabulario en la base y no en
la pantalla: un apunte con un tipo que no existe, y **un ingreso colgado de una partida**.
Ese último es el que había que ver fallar de verdad.

Esa misma mañana, con las tres primeras tablas de Finanzas, fueron **99/99**: seis de las
de siempre en `budgets`, `expenses` y `quotes` —A crea, B no ve—, una de que B tampoco
puede escribir un gasto en la familia de A, y las tres de los triggers de `expenses`, que
rechazan un gasto cuya partida, hijo o miembro sea de otra casa. La de `budget_id` era la que
había que ver fallar: apunta a una tabla nueva y su trigger se escribió con la sección.

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

La app está en producción y en uso diario por la familia. **No queda código de producto
pendiente.** Lo que sigue son cuatro clases de cosa distintas, y conviene no mezclarlas:
pruebas que exigen un aparato en la mano, una decisión sin tomar, tres funcionalidades que
no existen y tres acabados menores. **Esta es la lista entera y no hay otra**: lo que
falta vive aquí, y el porqué de cada decisión, en `docs/architecture.md`.

Lo que **ya no está** en esta lista, porque se cerró: los 44 px dentro de los sheets
(17-09-2026), las notificaciones push (28-08-2026),
la copia de seguridad (27-08-2026), el contraste de la paleta (09 y 10-09-2026), enterarse
de que Supabase se cae (28-08-2026, y el vigía externo el 15-09) y la revalidación de RLS
(169/169 el 05-09-2026) y **el esquema del extracto del banco**, aplicado y validado el
22-09-2026 (173/173), y **los tres huecos de la revisión de seguridad del 23-09-2026**
(182/182). El relato de cada una, en el cuerpo de su commit.

### 1. Hay que tener un aparato delante

Es lo único que no ve ninguna herramienta, y por eso va primero.

- **Safari de iOS.** El móvil de verdad del 05-08-2026 era Android, y Safari es
  otro motor: el teclado, el `100vh` y la safe-area se comportan distinto.
- **La PWA instalada**: icono, splash, el notch y la barra de abajo. Instalada no
  es lo mismo que abierta en el navegador, y el service worker solo se prueba de verdad
  contra `npm run start`, nunca contra `npm run dev`.
- **El flujo de documentos con dos cuentas** (`docs/testing-checklist.md` §8.1):
  que A suba un papel a su Drive y B lo abra sin conectar nada. Es la mitad de la
  decisión del 27-08-2026 que no prueba ningún test.

### 2. Decisión sin tomar

- **Google Play (TWA)**: falta el package name definitivo —es irreversible—, el SHA-256 de
  la firma, `public/.well-known/assetlinks.json` y la guía `docs/play-store.md`. La PWA y
  la política de privacidad, que es lo que Google exige, ya están.

### 3. Funcionalidad que no existe

- **Reglas por comercio al importar el extracto.** Hoy la partida se propone solo si el
  concepto del banco nombra a la partida («Farmacia»), que no acierta con «MERCADONA» para
  «Compra». Sin reglas que se aprendan, la segunda importación cuesta lo mismo que la
  primera, y ahí es donde se decide si la pantalla ahorra trabajo de verdad. Pide una tabla
  nueva, así que se decide aparte.
- **Una sección de ayuda.** Es la contrapartida de haber vaciado los estados
  vacíos de manual de estreno. No urge: lo que se quitó se leía una vez.
- **Dar salida por la app a un mes fantasma.** Hoy un mes cerrado y vacío solo
  se recupera por el SQL Editor. Sería una RPC nueva —borrar la cabecera y recopiar en una
  sola operación— y, detrás, `scripts/validate-rls.mjs` y `docs/supabase-validation.md`.

### 4. Acabados de Finanzas

Los tres salieron medidos el día que se hicieron y se dejaron escritos en vez de arreglados,
porque ninguno se arregla sin tocar algo que no es suyo:

- **Las barras de «entra» y «sale» no se separan**: ΔE 3,8 en protanopía y 13,6
  con visión normal, por debajo del suelo de 15. El único candidato que pasa es un **azul**
  (ΔE 12,8), y verde contra cualquier naranja o rojo no pasa nunca. Cambiar el verde es
  tocar el color de marca, así que se decide aparte.
- **La rejilla de iconos de un fijo va con un hueco**: son 23 y la última fila
  lleva siete. Mejor candidato, 🦷.
- **🏛️ y 🏦 se parecen** en la tipografía de Android. Están separados en la
  rejilla para que no se comparen de un vistazo, pero el problema sigue ahí.

### Lo que no hay que hacer

- **Telemetría de errores del cliente.** Es una app familiar con DNI e informes médicos
  dentro; mandar trazas a un tercero cuesta más de lo que resuelve.
- **Volver a numerar migraciones.** Sin un runner que apunte cuáles se aplicaron es una
  lista que hay que creerse, y aquí el SQL se pega a mano. La regla está en `CLAUDE.md`.

## Historial

Los trabajos ya cerrados, con su porqué, están en los cuerpos de los commits
(`git log`). No hay un documento de historial: tenerlo era contar dos veces lo mismo,
y la copia era la que se quedaba vieja.
