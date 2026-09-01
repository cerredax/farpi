# Historial de trabajo

Lo ya terminado, de lo más reciente a lo más antiguo. Vive aparte de
`project-status.md` desde el 28-08-2026: aquel documento dice **cómo está** el
proyecto y este cuenta **cómo se llegó**. Mezclados, el historial se comía al
estado (1030 de 1488 líneas) y dejaba de leerse justo lo que había que leer.

El porqué de cada decisión de producto está en `docs/architecture.md`; aquí
queda el relato de cada cierre, y en los cuerpos de los commits, el detalle.

> **La app se llamó Nido hasta el 31-08-2026.** Este documento **no se reescribe**:
> cuenta lo que pasó, y lo que pasó pasó con ese nombre. Si lees «Nido» más abajo,
> es Farpi antes de llamarse así. Lo que sí se actualizó es todo lo que habla en
> presente: `CLAUDE.md`, `project-status.md`, `architecture.md` y los papeles.

## Cerrado el 2026-09-01

### La portada empieza por lo que importa, y Dinero pasa a ser Finanzas (01-09-2026)

La portada contaba bien qué es Farpi, pero enterraba lo único que se le pide: que
quien llega pueda entrar. Los botones vivían en la barra de arriba y en un cierre
al final, y en medio había mil píxeles de texto sin una sola llamada.

Ahora el acceso es un componente, `TarjetaAcceso`, y sale dos veces: pegado al
titular en móvil —lo primero después de leer de qué va— y **anclado en una columna
a la derecha en escritorio**, donde acompaña todo el scroll. Es el mismo componente
en los dos sitios a propósito: dos bloques parecidos se contradicen al primer
cambio de texto. La tarjeta lleva además un **"Próximamente en Google Play"** sin
insignia oficial ni enlace, porque todavía no hay ficha a la que ir y una insignia
se pulsa.

Y entró lo que llevaba desde el 01-09-2026 aparcado en "Después": **las capturas**.
Se descartó dibujar maquetas —envejecen a escondidas— y se descartó tirar de
capturas hechas a mano, que llevan datos de una familia real y no se regeneran.
En su lugar, `scripts/gen-capturas.mjs`: levanta la app en modo demo, **congela el
reloj en el 17-06-2026** —la fecha de los datos de ejemplo, cuando Ana acababa de
nacer, para que nada salga marcado como atrasado— y fotografía siete pantallas a
390 px. Si la interfaz cambia, se relanza y la portada se entera. Es la misma idea
que el resto de la suite: que no haya nada que mantener a mano.

El texto de "Por qué existe Farpi" estaba mal contado. Decía que la hija nació en
julio (fue en junio) y que el autor programó esto por tener las manos ocupadas
mientras esperaba. No fue así: se hizo por necesidad propia, para aclararse con su
esposa y su hija cuando de un día para otro había el triple de cosas que recordar.
Es una utilidad de casa que se comparte porque sirve, no un pasatiempo que se
publica. Firma, ya entero: Omar García Carballo.

En el mismo viaje, **Dinero pasó a llamarse Finanzas** y el cambio bajó hasta el
código: `/finanzas`, `src/lib/finanzas.ts`, `FinanzasView`, `useFinanzasState`. Las
tablas no se tocaron —`budgets`, `expenses` y `quotes` nunca se llamaron así, y
renombrarlas habría exigido migrar la base real a cambio de nada—. El porqué del
nombre está en `architecture.md`. Este documento sigue diciendo «Dinero» donde
cuenta lo que pasó entonces, igual que sigue diciendo «Nido».

De paso, una incoherencia en `project-status.md`: seguía diciendo que las tres
tablas de Finanzas estaban sin aplicar en Supabase, cuando se aplicaron y validaron
(99/99) ese mismo día.


### Repaso a los iconos de Notas y al menú de "Más" (01-09-2026)

Dos retoques de un día después, mirando la app ya hecha.

**Los veinticuatro iconos de una nota no tenían orden.** Se eligieron rápido, y con la
sección en la mano se veía: la primera fila mezclaba datos (📶 ☎️ 🔑) con suministros
(💡 🔌 🚿), la segunda banco, coche, salud y colegio a la vez, y la tercera era un cajón
de sastre. `ListSheet` sí tenía una regla —«cada línea de aquí abajo es una fila»: súper,
casa, ocio— y por eso se lee. Notas ahora tiene la suya: **un dato que se consulta / algo
de esta casa / algo de fuera**, que son las tres formas en las que se busca una nota.

Con el orden se fueron siete iconos: los que repetían a otro (🔌 era la misma luz que 💡,
🎒 el mismo colegio que 🏫, 👕 la misma talla que 📏, 🔢 lo que dice mejor 🔐) y los que
tienen su propia sección (🍽️ es Comidas; 🏦 es *ir* al banco, que es una tarea, y el dato
está en 💳). Y uno que se contradecía con la primera frase de la sección: **📅**, cuando
una nota es justo lo que **no** es una fecha. Entraron 🔐 claves y códigos, 📱 el móvil,
🧾 contratos y garantías, 📏 medidas y tallas, 🌡️ la caldera, 🪴 las plantas y 🚌 horarios.
El 📶 abre —la clave del wifi es la nota que más se mira— y el 📝 cierra, como el 📋 de
Listas y el 💶 de Dinero.

**Y Ajustes bajó a su propia tarjeta en "Más".** Iba pegado a Documentos, dentro de la
misma tarjeta que las secciones de la casa, y se leía como una más. No lo es: las de
arriba son sitios donde está lo que se busca, Ajustes es cómo se configura la app. Ahora
el menú son tres tarjetas —secciones, Ajustes, cerrar sesión— y cada una dice de qué va
sin leer la etiqueta. Se quedó fuera de la tarjeta de Cerrar sesión a propósito, por lo
que ya decía el comentario que había: uno es un sitio al que ir y el otro es salir.

## Cerrado el 2026-08-31

### Dinero, la última idea de la lista (31-08-2026)

Quedaba una sola cosa por hacer en el roadmap: «un apartado de presupuestos». Y la
primera media hora se fue en algo que no era código: **en español eso son dos cosas**.
Está el presupuesto de la compra —cuánto nos podemos gastar este mes— y está el
presupuesto del fontanero —el papel con un precio y una fecha de validez—. Son la misma
palabra y no se parecen en nada: una es una cuenta que corre treinta días, la otra una
decisión que se toma una vez. Preguntado, salieron las dos.

Podían haber sido dos secciones. No lo son porque la barra de navegación ya tiene ocho
sitios y una novena entrada por algo que se usa tres veces al año no se sostiene; y
tampoco una lista mezclada, donde un tope mensual y un precio de caldera se leen fatal
juntos. La salida fue **una sección con dos pestañas**, y llamarla **Dinero** en vez de
«Presupuestos»: si el contenedor se llama igual que una de sus dos mitades, la otra
parece estar de prestado.

**Lo que costó decidir, no escribir.** Tres cosas:

- **El tope no es por mes.** La tentación era una fila por categoría y mes, que permite
  «en diciembre gastamos más». Se descartó: obliga a abrir septiembre cada treinta días,
  y ese trabajo administrativo es justo lo que esta app existe para no pedir. El tope
  vale hasta que se cambie.
- **Se ve el reparto, nunca un saldo.** El gasto lleva quién lo pagó, y la pantalla suma
  «Omar 60 €, Sofía 20 €». Ahí se para. En cuanto una app de casa escribe «Sofía te debe
  40 €» deja de ser una app de casa y pasa a ser un árbitro, y eso no lo pidió nadie.
- **Borrar un presupuesto no borra sus gastos.** Pasan a «Sin presupuesto». Lo hace el
  `on delete set null` de la clave ajena y el mock lo imita a mano. Perder el histórico
  de agosto por reordenar las categorías en septiembre habría sido el peor modo posible
  de fallar.

**Los céntimos.** Todo el dinero se guarda en `integer`, y la conversión de lo que se
teclea vive en un solo archivo (`src/lib/money.ts`) que llaman las dos implementaciones
del contrato. Es la clase de cosa que, escrita dos veces, hace que «12,50» valga 1250 en
modo demo y 12,5 contra Supabase y nadie se entere hasta que las cuentas no cuadran. El
formato también se escribe a mano en vez de con `Intl.NumberFormat`, que mete un espacio
duro cuya forma depende de la versión de ICU del navegador: el mismo importe tiene que
leerse igual en una aserción y en un móvil. El parser acepta coma y punto porque el
teclado de cada móvil ofrece uno u otro, y distingue `1.234` (miles) de `1,50`
(decimales) por cuántas cifras van detrás.

**Lo que encontró la suite y no habría encontrado nadie mirando.** Dos cosas, y las dos
en la primera pasada completa:

- Los **tres sheets** de la pantalla cuelgan del mismo padre, y las demás pantallas usan
  `key="create"` para el suyo porque solo tienen uno. Aquí eso daba dos hermanos con la
  misma clave, que React canta por consola y que `runtime.spec.ts` convierte en suite
  caída. Ahora cada clave lleva delante de qué sheet es.
- El enlace «Nuevo presupuesto» medía 126×16 px y el mínimo de `movil.spec.ts` son 24
  (WCAG 2.5.8). Se arregló con relleno y un margen negativo, que agranda la zona de toque
  sin mover el texto de su línea.

**Lo que la máquina puso de su parte.** A mitad de sesión los tests dejaron de arrancar
con «out of memory»: había **1900 procesos `node` huérfanos** (26 GB) que había dejado un
`npm run test:e2e` anterior, todos workers de dev de este proyecto. Se cerraron uno a uno
filtrando por línea de comandos, y con la carpeta `.next` corrupta por medio hubo que
borrarla entera. No es un problema del código, pero conviene tenerlo apuntado: si el dev
server no levanta, mirar cuántos `node` hay vivos antes de buscar la causa en otro sitio.

Queda un paso que no se puede dar desde aquí: **aplicar las tres tablas en el SQL Editor**
del proyecto real y revalidar la RLS. Hasta entonces la sección funciona en modo demo y
no contra Supabase.

### De Nido a Farpi (31-08-2026)

Cambio de nombre, y solo de nombre: ni una pantalla, ni un flujo, ni el icono. Lo que
tenía miga no era el texto —quince cadenas— sino las cinco cosas que llevaban «nido»
dentro sin que se vean.

La primera trampa fue el propio reemplazo: **«contenido» contiene «nido»**, y hay 30 y
pico en el repositorio entre comentarios, `ContenidoArchivo` y la etiqueta del campo de
las notas. Todo fue con límites de palabra y con una lista explícita para las claves en
`snake_case`.

Las claves de `localStorage` (`nido_store_v1`, `nido_active_family`) se renombran **con
migración**: se lee la vieja una vez, se copia y se retira. Sin eso, desplegar el cambio
de nombre vaciaba el modo demo de todo el que lo tuviera abierto, y el modo demo es el
fallback sin credenciales.

`CACHE` en `public/sw.js` pasa a `farpi-v1` y la numeración arranca de cero. Tenía que
cambiar de todas formas: el manifiesto está en `PRECACHE` y ahora dice otro nombre.

Y la que no tiene arreglo: cada archivo subido a Google Drive lleva dentro la etiqueta
`appProperties.nido_family`, en el disco de su dueño. No se puede reescribir sin recorrer
uno a uno los papeles de todas las familias, así que `listar` pregunta por las dos claves.
Abrir un documento nunca dependió de ella —eso va por el id del archivo—, pero `listar` sí.

Fuera del repositorio, el mismo día se renombraron el proyecto de Vercel, el de Supabase
y la carpeta de Google Drive. La carpeta se **renombró**, que no es lo mismo que borrarla:
los documentos de Farpi son los archivos que hay dentro —en la base solo está la ficha— y
Drive identifica por id y no por nombre, así que renombrar no mueve nada. Borrarla se
habría llevado los papeles a la papelera y habría dejado las fichas apuntando al vacío.

Queda pendiente lo que no se puede hacer en una tarde: el dominio, que será `farpi.app`
cuando se compre y que hay que cambiar en cuatro sitios a la vez; el repositorio de
GitHub; la pantalla de consentimiento de Google, y las plantillas de correo, que se pegan
a mano en el panel de Supabase. La lista, con el riesgo de cada línea, está en
`docs/produccion.md` §0.

### Notas, la sección para lo que hay que tener apuntado (31-08-2026)

Faltaba un sitio para lo que no es una fecha, una tarea ni un papel: el teléfono del
pediatra, la clave del wifi, dónde está el contador. Se hizo entera —tabla `notes` con su
policy, contrato de repos, mock, pantalla, sheet y navegación— con la forma más pequeña
que sirve: título, texto libre, emoji y fijar. Sin categorías y sin tipos de nota; el
porqué está en `architecture.md`.

Antes de escribir nada se puso encima de la mesa lo de las contraseñas, que es lo único
que tenía decisión de verdad. Se descartó cifrarlas —hay que resolver cómo se comparte la
clave, qué pasa desde otro móvil y qué pasa si se olvida— y también el campo oculto que
se propuso como intermedio. Van en texto plano, y lo que se hace es decirlo: el sheet lo
avisa bajo el campo y `/privacidad` lo repite.

De paso, la lista de secciones deja de filtrar Documentos a mano: con dos secciones
dentro de "Más", la barra de abajo y el menú decían lo mismo desde dos archivos. Ahora lo
dice `enMas` en `secciones.ts`.

Comprobado con capturas a 390 px y a 1440 px, además de la suite. La tabla se aplicó el
mismo día en el proyecto real y `scripts/validate-rls.mjs` volvió a pasar entera: 89/89.

### La rejilla del mes se ve como una rejilla en el móvil (31-08-2026)

Las líneas de la cuadrícula existían solo desde `lg:`. En móvil los días eran números
flotando en blanco, casi pegados: seguir una semana en horizontal costaba y un número con
sus puntos se confundía con los del día de al lado. Se extienden a las dos tallas, se
suben de `hairline` a `--color-line` —a 52 px de celda el hairline no existía—, se quita
el relleno que separaba la rejilla del borde de la `Card` para que las líneas mueran en el
marco, y la celda de móvil gana un alto mínimo de 52 px. Comprobado con capturas a 390 px
y a 1440 px, no solo con la suite.

## Cerrado el 2026-08-28

### El panel del día también en escritorio (28-08-2026)

`DayPanel` nació con `lg:hidden` unas horas antes, dando por hecho que en escritorio no
hacía falta: allí la celda escribe títulos y la agenda vive en la columna de al lado. Era
falso por exactamente la misma razón por la que se escribió el panel para móvil: la agenda
**arranca en hoy** y solo pinta días con algo, así que elegir el 18 mirando el 28 pintaba
el número de verde y no pasaba nada más. Comprobado a 1440 px antes de tocar nada.

Y la celda no tapa el hueco: cuando el día está vacío no hay título que escribir, que es
justo cuando hace falta que la app conteste algo ("Nada apuntado", con el botón de apuntar
ahí).

Lo que sigue siendo solo de escritorio es el salto de la agenda hasta el día (`focusDay`):
allí la lista está al lado y a la vista. `e2e/escritorio.spec.ts` cubre ahora los dos
casos, día con plan y día vacío.

### En móvil se navega por un solo borde: "Más" en la barra de abajo (28-08-2026)

El círculo de la cuenta que había subido esa misma mañana a la esquina de `TopBar` duró un
día. Con él, en móvil había **dos** sitios donde tocar para salir de las cinco pantallas
de siempre —la barra de abajo y esa esquina—, y el de arriba no decía a dónde llevaba: un
círculo con una inicial no anuncia que dentro estén Ajustes y cerrar sesión.

Ahora la cabecera de móvil es solo el título, y la sexta pastilla de la barra es **"Más"**
(`MoreMenu`): Documentos, las cinco secciones de Ajustes —cada una a su pestaña, leídas de
`PESTAÑAS_VISIBLES` y no copiadas a mano— y, en tarjeta aparte, cerrar sesión. Misma forma
que el menú de escritorio, que no se toca.

**Documentos deja la barra** y baja al menú. Es la sección a la que menos se entra —el DNI
y el libro de familia se miran dos veces al año— y era además la única cuya etiqueta no
cabía a 390 px: se escribía "Docs" abajo y "Documentos" al lado, con un campo `abreviado`
en `secciones.ts` para justificarlo. Ese campo se ha ido: dentro de "Más" se lee entero y
las dos navegaciones lo llaman igual. La lista de móvil se **deriva** de la de escritorio
(`SECCIONES_MOVIL`), no se escribe aparte, que es como divergieron la primera vez.

Detalles que costaron algo:

- El sheet se pinta en el `body` por portal. `BottomNav` es `fixed z-50` y crea contexto
  de apilamiento: dentro de ella, el `z-[60]` del sheet no gana a la propia barra y la
  última fila del menú quedaba tapada. Es el mismo motivo por el que el menú de la cuenta
  salía en portal desde `TopBar`.
- La pastilla la pinta `BottomNav` y el comportamiento lo pone `MoreMenu` (`children`):
  la sexta no puede *parecerse* a las cinco de al lado, tiene que ser igual, y así sus
  clases no viven en dos archivos.
- "Más" no se marca activa en `/docs` ni en `/settings`: no es una pantalla, es por dónde
  se llega, y marcarla haría creer que hay una sección llamada así.
- `AccountMenu` pierde la variante `icono` y su portal, que solo usaba la cabecera. En
  escritorio se queda exactamente igual.

Comprobado en el navegador: barra de seis con la cabecera limpia, y el menú abierto por
encima de la barra.

### Los dos bloques del mes nacen plegados (28-08-2026)

"Vacaciones y descansos" y "Cumpleaños" cuentan **cómo es el mes**, no lo que hay que
hacer hoy, y desplegados empujaban la agenda fuera de la pantalla: en agosto, con unas
vacaciones y un par de cumpleaños apuntados, entre la rejilla y la primera fila de la
lista había media pantalla de móvil que casi nunca se estaba leyendo.

Ahora cada uno se anuncia en una línea —el título es el botón, con cuántos hay al lado— y
se abre quien quiera verlos (`SeccionPlegable`). Siguen siendo **dos y no uno**, que era
la otra opción sobre la mesa: juntarlos bajo un mismo título obligaba a abrir los
cumpleaños para saber si alguien está fuera, y plegados ocupan una línea cada uno, que es
justo lo que se quería ahorrar.

Tampoco es el interruptor "Ver cumpleaños" que se descartó el 28-08-2026: aquel escondía
los cumpleaños del mes entero y obligaba a elegir entre ver el mes o verlos; esto solo
pliega una lista que sigue ahí, contada y a un toque. Y lo que dice la rejilla no cambia:
la raya bajo el día sigue avisando de que alguien no está.

Y van en **su propia tarjeta**, no dentro de la del calendario: colgando de la rejilla se
leían como una parte más de ella, y no lo son —el calendario dice qué días son y esto dice
cómo es el mes—. La separación es la mínima que se nota: el hueco de `mt-2` y el borde de
la tarjeta. Si no hay ni ausencias ni cumpleaños la tarjeta no se pinta, que si no queda
una caja blanca vacía debajo del mes.

Comprobado en el navegador, plegado y abierto, con una captura de cada estado. Tres tests
daban por visible el contenido del bloque y ahora lo abren antes (`abrirBloque`, en
`e2e/vistas.ts`).

### Elegir un día contesta, y el selector deja de ocupar una banda (28-08-2026)

Dos cosas del calendario en móvil, pensadas antes de tocar nada.

**Elegir un día no hacía nada.** Se comprobó en el navegador tocando el 18 de agosto
mirando el 28: el número se ponía verde y ahí se acababa todo. La idea era que la agenda
de abajo se deslizara hasta él, pero esa lista **arranca siempre en hoy** y solo pinta
días con algo, así que un día pasado no tenía fila a la que ir y uno futuro vacío tampoco.
Y cuando sí la había, el salto ocurría por debajo del pliegue, donde no se ve. La
documentación de `DayCell` prometía por escrito que "tocar el día enseña su detalle
debajo", y no era verdad.

Ahora hay un `DayPanel` pegado a la rejilla: los planes con su hora, las tareas que vencen
y, antes que todo eso, las etiquetas que dicen **cómo es el día** —festivo, quién falta,
de quién es el cumpleaños—, en el mismo orden que ya tienen la celda del mes y la franja
de "todo el día" del eje. Si no hay nada, lo dice y ofrece apuntarlo ahí, que es la
respuesta que faltaba: un día vacío se leía igual que un fallo. Reutiliza el `EventRow` de
la agenda —que por eso se exporta— para que el mismo evento no se pinte de dos maneras a
dos dedos de distancia.

Con hoy elegido no sale, que es como abre la pantalla: la agenda de debajo empieza justo
ahí. Y el salto de la lista hasta el día elegido pasa a ser **de escritorio**: en móvil,
mover la página entera hasta una fila de la agenda se llevaba de delante justo el panel
que se acababa de abrir.

Se descartaron las otras dos salidas. El **tooltip** ya se probó y se retiró en su día
—"era la única vía de leer el día y no existe con el dedo"—, y esta es una app
mobile-first. Y **saltar a la vista Día** al tocar chocaba con dos decisiones que costaron
vueltas: que elegir un día no cambie de vista a tus espaldas, y el doble clic en la celda
que abre el alta, que se quedaba sin gesto. Google tampoco lo hace: en Mes enseña el día
debajo.

**El selector de vista se comía una banda.** Cuatro pastillas a todo el ancho, ~48 px de
una pantalla de 390, todo el rato, para un control que se toca una vez cada mucho. La idea
de partida era subirlas a la fila del título **con iconos**, y no salía por dos sitios: los
cuatro iconos serían "un calendario con algo dentro" y no se distinguen, y además no caben
—dejarían al título unos 110 px, la mitad de lo que necesita "31 de ago – 6 de
septiembre"—, así que las flechas volverían a bailar a cada paso, que es lo que se arregló
esa misma semana.

Lo que sí cabe es **un solo botón** que dice la vista puesta y despliega las cuatro, como
hace Google Calendar en el móvil. Se cierra al tocar fuera —con `pointerdown` y no `click`,
o el toque activaría el botón de debajo con el menú todavía encima— y con Escape. En
escritorio no cambia nada: allí las tres pastillas caben de sobra.

De rebote, el título va **abreviado en móvil** ("31 ago – 6 sep", "Jue, 27 ago"): con el
selector en esa fila, escrito largo se cortaba en "31 de ago – 6 de …", que no dice dónde
estás. En escritorio sobra el sitio y sigue largo.

Los tests de móvil que cambiaban de vista pulsaban la pastilla; ahora pasan por
`e2e/vistas.ts`, que abre el menú primero. Y `smoke.spec.ts` estrena dos: que elegir un día
enseña algo y deja apuntar ahí, y que el selector abre, cambia y se cierra con Escape.

### La semana ya se puede recorrer (28-08-2026)

La vista Semana llegó al móvil el 26-08-2026 con un mínimo de 110 px por columna, de
modo que a 390 px no caben las siete y el eje se desplaza a lo ancho. Faltaba lo que
hace que eso sirva de algo, y eran dos cosas.

**Las horas se iban con el desplazamiento.** El canal de la izquierda es lo único que
dice a qué hora es un bloque, y al llegar al viernes ya no estaba. La primera idea
—`sticky left-0` en la celda del canal— no funciona, y se midió: el bloque contenedor
de un hijo de una rejilla es **su propia área**, esos 56 px, así que el elemento no
puede salir de ella. Se arregló por dos sitios a la vez: el canal ocupa ahora la
rejilla entera (`grid-column: 1 / -1`) manteniendo sus 56 px de ancho, y la rejilla
lleva el ancho escrito (`minWidth`), porque una rejilla es un bloque y por defecto mide
lo que la pantalla mientras sus columnas se le salen por la derecha —con 410 px de área,
el canal se quedaba clavado a mitad de camino—. A cambio, las columnas de los días ya no
se colocan solas y van con su fila y su columna escritas.

**Y pasar de semana dejaba al final de la siguiente.** El dedo hacía dos cosas de una
pasada: desplazaba el eje hasta el domingo y además cambiaba de semana, y como la barra
de desplazamiento se quedaba donde estaba, aparecías en la semana nueva mirando su
domingo. De ahí que el cambio "no se notara": lo que había delante seguía siendo el
final de una semana.

Ahora `useSwipe` admite un tercer argumento, `permite`, que se pregunta **al empezar** el
gesto y no al acabarlo —al levantar el dedo el contenido ya está en el borde, así que
preguntar entonces volvería a hacer las dos cosas—. El eje cede el gesto mientras quede
semana que recorrer y solo pasa de semana desde el borde, como cualquier carrusel dentro
de otro. Por eso el desliz se mudó de `CalendarView` a `Timeline`: la decisión necesita
saber dónde está esa barra, y eso solo se sabe ahí. Al cambiar de tramo, el eje vuelve al
lunes, o se coloca en hoy si la semana lo tiene.

De propina, el canal estrena raya a la derecha: la que separaba el canal del lunes era la
del propio lunes y se iba con él, así que ahora la lleva el canal y la primera columna se
queda sin la suya para no pintar dos pegadas.

Lo vigila `e2e/smoke.spec.ts`: que el canal siga pegado al borde con el eje al final, y
que pasar de semana devuelva el desplazamiento al principio.

### Cuando Supabase no contesta, Nido lo dice (28-08-2026)

Esa misma mañana una incidencia de Supabase dejó la app inservible durante horas sin
que nada lo dijera: `supabase.auth.getUser()` no volvía y con él se colgaba toda ruta
con sesión —de 150 a 224 segundos, contra 3 ms sin ella—, así que quien entraba veía el
logo de "Cargando Nido" para siempre. Era el punto 2 de los cuatro que quedaron
apuntados en la Fase 9, y el único que cambia lo que ve la familia.

Ahora esa llamada tiene **cinco segundos** (`LIMITE_AUTH_MS`) y un `catch`. Si se pasa o
revienta, el proxy no adivina: distingue **"no hay nadie"** —que es una respuesta
perfectamente normal, la de quien no ha entrado— de **"no contesta"**, que es la caída.
De ahí que sea un `Sesion` de dos estados y no un `user | null`.

Con Supabase caído, cada ruta hace lo suyo:

- Las **páginas públicas** se sirven igual: `/privacidad` y `/terminos` no dependen de
  Supabase, y son requisito para publicar en Google Play.
- Las **rutas API** contestan **503** con un JSON, para que quien llamó lo distinga de
  un fallo propio.
- **Todo lo demás** enseña `/no-disponible`, un **503 por `rewrite`**: la URL no cambia,
  así que recargar reintenta donde estabas.

Lo que se decidió **no** hacer: mandar al login. Es lo que sale solo del código de
antes —sin usuario, al login—, y es justo lo peor: parecería que se te ha caído la
sesión y acabarías escribiendo la contraseña contra un servidor que no responde. Dejar
pasar no abre ningún hueco, porque quien manda sobre los datos es la RLS y no este
proxy; el middleware es experiencia de uso.

De propina, el **service worker deja de cachear lo que no salió bien**. Cacheaba
cualquier respuesta de navegación, y con la pantalla nueva eso significaba dejar la
avería pegada a `/home` hasta la siguiente visita buena.

Verificado contra el build servido, no contra `dev`, y con la caída **simulada de
verdad** (una promesa que no vuelve nunca en lugar de `getUser`), porque el primer
intento no probaba nada: sin cookies, `getUser()` resuelve sin tocar la red y el
temporizador nunca ganaba la carrera. Con la caída puesta: `/home` y `/calendar` dan 503
con la pantalla y sin redirigir, `/privacidad` y `/terminos` siguen en 200, y
`/api/documents/providers` devuelve el 503 con su JSON. Sin la caída, todo se comporta
como antes. La pantalla, además, revisada en captura a 390 px.

Quedan los otros tres puntos de la Fase 9: suscribirse al estado de Supabase, la ruta
`/api/salud` y un vigía externo que la mire.

### Una ruta que dice si Nido puede funcionar (28-08-2026)

El punto 3 de la Fase 9, y el que permite el 4. `/api/salud` contesta **200 si Supabase
va y 503 si no**, que es lo único que entienden los vigías externos, con los
milisegundos de cada mitad.

**Dos mitades, medidas por separado, porque no se caen juntas**: esa misma mañana fue
la de sesión la que dejó de contestar mientras los datos respondían. Una llamada a
`/auth/v1/health` de GoTrue aísla el servicio de sesión sin tocar la base; la otra va a
PostgREST y recorre Postgres y la RLS hasta el final.

**Es publicable porque no lleva nada dentro.** La consulta de datos va con la clave
anónima, así que la RLS la deja siempre en cero filas —comprobado a mano: `[]` y
`Content-Range: */0`—. Se mide el viaje, no lo que se trae. Del error solo sale el
nombre (`HTTP 404`, `TimeoutError`): un mensaje de red puede llevar dentro el host y el
trayecto.

**Fuera del `matcher` del proxy**, que es la decisión que importa: lo que vigila a
Supabase no puede atravesar la pieza que puede estar colgada. Pasando por el proxy
esperaría los cinco segundos de la sesión antes de empezar a medir, y mediría tarde
justo el día que hace falta. Es la misma clase de excepción que ya tenían `sw.js` y
`manifest.json`, por un motivo distinto.

Comprobada contra el build servido y contra el Supabase real: `{"estado":"ok",...}` con
auth en 440 ms y datos en 656 ms, cabecera `no-store`, y sin sesión no redirige al login
—mientras `/home` sigue dando su 307—. El camino de fallo se forzó apuntando la medida
de datos a una tabla que no existe: **503** con `{"estado":"caido","auth":{"ok":true},
"datos":{"ok":false,"detalle":"HTTP 404"}}`, que es exactamente lo que se quiere leer un
día malo. En la suite queda un test del contrato en modo demo (395 en total).

Falta lo último de la Fase 9: dar la ruta de alta en un vigía externo.

### El calendario se ordena: cumpleaños aparte, flechas quietas y desliz (28-08-2026)

Cuatro cosas del calendario, todas de uso y ninguna de datos.

- **Los cumpleaños salen de la rejilla y de la agenda** y pasan a un bloque propio,
  `Birthdays`, pegado a "Vacaciones y descansos". Se apuntan una vez y se repiten veinte
  años, así que como fila del día eran ruido fijo. Con ellos se va el interruptor "Ver
  cumpleaños" del día anterior —obligaba a elegir entre ver el mes o verlos— y el grupo
  "Cumpleaños" del eje por persona de la agenda, que ya no tiene a quién repartir. La
  etiqueta del bloque es el nombre sobre el lila de `CUMPLE_COLOR`, que es lo que faltaba:
  ni una persona ni "Familia". Lo elige `selectVisibleBirthdays`, con cuatro unitarios.
- **Las flechas de la cabecera dejan de bailar.** El grupo del título ocupa el ancho libre
  y el título se estira dentro, así que las dos flechas caen siempre en el mismo píxel se
  mire el día, la semana o el mes. Antes el grupo se encogía al texto, y el texto cambia en
  cada paso.
- **Se pasa de mes o de día arrastrando el dedo** (`src/hooks/useSwipe.ts`). Se mide al
  levantar el dedo para no tocar el desplazamiento vertical, y solo cuenta un gesto
  claramente horizontal. Cuelga de la rejilla y del eje de horas, no de la tarjeta entera.
- **La franja de una ausencia entra en el mes vecino a la misma altura.** Los huecos de
  fuera de mes llevaban `py-1` en el contenedor y las celdas no, así que la raya de un
  tramo que cruzaba la frontera se veía escalonada. De paso ordenan las ausencias como
  `DayCell` —vacaciones y luego descansos—, que con dos el mismo día también las
  descolocaba.

**Sin verificar en el navegador.** Ese día había un dev server ocupando la carpeta y Next
16 no deja levantar un segundo, así que la suite de navegador y las capturas se quedaron
sin correr. Lo que sí está en verde: `npx tsc --noEmit`, `npm run lint` y los 304
unitarios.

### La cuenta tiene cara, y Ajustes se entra por ella (28-08-2026)

Había un enlace "Ajustes" con su rueda en el pie de `SideNav` y al final de Inicio. Ahora
es `AccountMenu`: en escritorio, una fila al pie de la barra lateral con la inicial y el
nombre; en móvil, el círculo con la inicial arriba a la derecha de la cabecera. Su menú
lleva las cinco secciones de Ajustes, cada una a su pestaña, y cerrar sesión al final.

- **Qué arregla.** La app no decía en ninguna pantalla con qué cuenta estabas, y cerrar
  sesión estaba a cuatro toques dentro de la pestaña Cuenta de la pantalla a la que menos
  se entra. En móvil, además, Ajustes solo se alcanzaba desde Inicio: ahora está en las
  siete pantallas.
- **La esquina vuelve a ocuparse, y a propósito.** Se liberó el 26-08-2026 por ser
  demasiado buena para algo que se toca dos veces al año. Lo que vuelve no es la rueda: es
  la cuenta, que es lo que se busca ahí en cualquier app, y Ajustes va dentro.
- **Lo que no se hizo.** Meter los ajustes dentro del desplegable. En Nido, Ajustes es la
  casa y no la cuenta —cinco pestañas que no caben en un menú— y esconder contenido ya
  salió mal aquí dos veces. El menú es un índice, no un armario.
- **La pestaña activa la dice la URL** (`?seccion=casa`), no un `useState`: el menú entra
  sin desmontar la pantalla, y con dos fuentes de verdad había que sincronizarlas en un
  efecto. La lista de secciones se comparte en `settings/pestanas.ts`.
- **Quién eres.** `currentMember` en el store, contra `members.getCurrentUserId()` del
  contrato de repos (mock: `u1`; Supabase: `auth.getUser()`, y `null` si falla, que no
  rompe ninguna pantalla). Es para reconocer tu fila, no para decidir permisos.
- **El sheet de la cabecera va en un portal.** `TopBar` es `fixed z-50` y crea contexto de
  apilamiento: dentro de él, el `z-[60]` del sheet no competía con la barra de abajo, que
  le tapaba la última sección. Va al `body` envuelto en un `lg:hidden`, porque al salir
  del botón sale también de su `lg:hidden` y en escritorio aparecían dos menús. Las dos
  cosas se vieron en pantalla, no en la suite: en verde estaba.
- **El nombre accesible del botón es "Cuenta de …" y no su texto**, que llevaba dentro el
  de la casa —"Familia de Omar, Sofía y Ana"— y hacía que un
  `getByRole('button', { name: 'Sofía' })` de la suite encontrara dos cosas.
- **Dos secciones se recolocan al nombrarlas el menú.** "Sincronización" estaba vacía para
  quien no tuviera Drive conectado —la tarjeta solo se pintaba si había algo que contar—, y
  eso valía cuando se llegaba de paso, no cuando el menú la anuncia: ahora dice siempre qué
  es y ofrece conectar. Y **borrar cuenta vuelve de Legal a Cuenta**: estaba en Legal para
  no confundirla con cerrar sesión, que era la fila de encima, y cerrar sesión ya no vive
  ahí. Sigue aparte, en rojo y con confirmación.
- **Verificado en el navegador** con el build servido en el 3100 en modo demo, no con
  `npm run dev`: sigue habiendo un dev server ocupando la carpeta y Next 16 no deja
  levantar otro. `npm run build && npx next start -p 3100` con los placeholders de demo
  esquiva el problema, y ahí corren la suite y las capturas.

## Cerrado el 2026-08-27

### Los cumpleaños (27-08-2026)

Una casa se acuerda de los cumpleaños o no se acuerda, y la app tenía la fecha de
nacimiento de cada uno guardada desde el principio sin hacer nada con ella. Ahora la usa.

**Lo que lo hizo pequeño**: un cumpleaños no se guarda, se deduce. Es lógica pura
(`src/lib/birthdays.ts`) sobre datos que el store ya tiene, así que no hay tabla, ni
migración, ni nada que mantener sincronizado cuando alguien corrige una fecha. El porqué
completo, y lo que se descartó —crearlos como eventos recurrentes—, está en «Decisiones de
producto» de `docs/architecture.md`.

Dónde sale:

- **En Inicio**, partido en dos porque no se leen igual: el de hoy abre la tarjeta de hoy
  con la tarta y el color de la persona, y los siguientes catorce días
  (`DIAS_AVISO_CUMPLE`) van en su bloque «Cumpleaños», que no se pinta si no hay ninguno.
- **En el aviso de las siete**, delante de las tareas y de los papeles que caducan, y solo
  el mismo día.

**Solo los hijos y los adultos sin cuenta**, que son los que llevan `birth_date`. Los
miembros con cuenta se quedan fuera: darles fecha de nacimiento obliga a un `alter` en la
base real y a cambiar la RPC del perfil, y esto no lo pedía.

**En el calendario no sale**, y no es olvido: la agenda contesta «qué hay que hacer» y un
cumpleaños no es un plan.

Los dos bordes del calendario que podían salir mal están probados en
`e2e/unit/birthdays.spec.ts`: el 29 de febrero se celebra el 1 de marzo en los años que no
lo tienen, y el cumpleaños que ya pasó salta al año siguiente en vez de desaparecer.

### Los cumpleaños de fuera de casa (27-08-2026)

Lo de arriba deja fuera a la abuela, al primo y al amigo del cole: no tienen ficha en
Ajustes, así que no había de dónde deducir su cumpleaños. La única forma de apuntarlo era
darles de alta **como persona de la familia**, con color y apareciendo en todos los
selectores de "de quién es esto". Eso no se quería.

**Lo que se hizo**: un tipo de evento, `kind = 'cumple'`. Se apunta en el calendario como
cualquier otra cosa con fecha, y el tipo manda sobre todo lo demás: día completo, un solo
día, sin asignar y con la serie anual ya montada para veinte años (`ANOS_DE_CUMPLE`), sin
preguntar hasta cuándo. Hay un campo nuevo, **`events.birth_year`** (int, nullable), que
solo sirve para decir la edad y es opcional: de la abuela se sabe, del amigo del cole no.

Dónde sale:

- **En Inicio, en los bloques de cumpleaños que ya existían**, junto a los de casa:
  `cumplesDeLaCasa` junta los dos orígenes y las pantallas no saben de dónde viene cada
  uno. Sin año de nacimiento la frase se queda en «Hoy es el cumple de Nico del cole».
- **En el calendario**, porque es donde se apunta y donde hay que poder corregirlo o
  borrarlo. Desde el 28-08-2026, **solo en su bloque** de debajo del mes: ni en la
  rejilla ni en la agenda. Esto deja una asimetría a la vista —el de la abuela se ve en
  el calendario y el de la hija no— que está asumida y explicada en
  `docs/architecture.md`.
- **En el aviso de las siete**, en la misma frase que los de casa. Ojo: el cron cuenta los
  eventos del día y un cumpleaños **no** cuenta como evento, o diría "tenéis 1 evento" el
  día del cumpleaños de la abuela.

**La regla que evita verlo dos veces** es `isDigestPlan` (`src/lib/events.ts`): un
cumpleaños sí es plan para el calendario y no lo es para el resumen del día. Sin ella
salía arriba como celebración y debajo como una cita más de las siete de la mañana.

Probado en `e2e/unit/birthdays.spec.ts` (la mezcla de los dos orígenes, la edad, y que las
otras diecinueve filas de la serie no se cuelen en el bloque), en
`e2e/unit/validators.spec.ts` (el año imposible) y en `e2e/smoke.spec.ts` (el recorrido
entero, con y sin año de nacimiento).

**Pendiente de aplicar en la base real**: el `alter` de `birth_year` y las dos
restricciones nuevas. Están en `supabase/schema.sql`; el SQL Editor no se ha tocado.

### Copia de seguridad de la familia (27-08-2026)

Un botón en Ajustes → "Tu familia" que descarga un `.json` con todo. La decisión que
lo hizo pequeño: **el store ya tiene en memoria todo lo de la familia activa, y ya
filtrado por RLS**, que es exactamente lo que significa "tus datos". Así que es
lógica pura sobre lo que la pantalla ya tenía: ninguna ruta API, ningún
`service_role`, ninguna tabla, ninguna dependencia. Y funciona en modo demo, que es
lo que permite que la suite lo pruebe descargando el archivo de verdad.

No nació de una idea, nació de una incoherencia: `/privacidad` ya prometía que
puedes "exportar tus datos" y `/terminos` recomienda **dos veces** "conservar copias
de la información importante", sin que la app diera manera de hacerlo. La promesa
existía y el mecanismo no.

**Qué no lleva, y no es olvido:** `storage_connections` (son tokens de Google Drive;
un refresh token no baja a la carpeta de Descargas ni por accidente) y
`push_subscriptions` (endpoints técnicos de cada navegador, que no son datos de la
familia). Hay un test unitario y otro de navegador que lo comprueban sobre el archivo
real, porque es lo que podría colarse en silencio.

Los **archivos** de los documentos tampoco: están en el Drive de quien los subió, que
es un disco de verdad con su propia papelera. Va la ficha, con `storage_path` y
`storage_owner`, que es el puntero para volver a encontrarlos.

#### El camino de vuelta

No hay pantalla de restauración a propósito: es bastante maquinaria para algo que
pasará cero o una vez, y con el archivo delante se resuelve con un script. Pero el
camino tiene que estar escrito **antes** del desastre, así que:

1. Las claves de `datos` son los nombres de las tablas tal cual. Se insertan en
   orden de dependencias: `families` → `family_members` → `children` → `lists` →
   `list_items`, `events`, `tasks`, `meal_plans`, `documents`, `family_invites`.
2. **El obstáculo real son los usuarios.** Si el proyecto Supabase desapareció,
   `auth.users` desapareció con él, así que `family_members.user_id`,
   `documents.created_by` y `documents.storage_owner` apuntan a identificadores que
   ya no existen. Hay que crear las cuentas primero y traducir esos ids. Todo lo
   demás entra tal cual.
3. Los documentos siguen en el Drive de su dueño y sus identificadores de archivo no
   cambian, así que las fichas restauradas vuelven a abrirlos en cuanto esa persona
   reconecte.

#### Lo que se dejó fuera

- **Copia automática semanal.** El cron ya corre a diario y con Drive conectado
  podría dejar el JSON en la carpeta Nido. Encaja, pero una copia manual de un toque
  cubre el caso; la automática se añade si se demuestra que nadie pulsa el botón.
- **Cifrar el archivo.** Lleva DNI, informes médicos y fechas de nacimiento de los
  niños, así que la tarjeta lo dice: *guárdalo donde guardarías los papeles*. Una
  contraseña que se olvida convierte la copia en nada.
- **CSV o PDF.** Un segundo formato es un segundo formato que mantener.

### El cambio a Google Drive, cerrado (27-08-2026)

**Desplegado y funcionando.** Esquema aplicado y validado (80/80), bucket borrado,
las cuatro variables en Vercel, consentimiento de Google en "In production", commit
`3fd216e` en producción y la CSP comprobada contra el dominio real: `connect-src`
incluye `www.googleapis.com`.

Quedan **dos comprobaciones sin hacer**, y se anotan en vez de darlas por buenas:

- **Abrir un documento desde una segunda cuenta de la familia** sin Drive conectado.
  Es el corazón del diseño —el proxy sirviendo con el token del dueño— y es lo único
  que de verdad lo prueba.
- **Subir un archivo de 10-15 MB.** Por debajo de ~4 MB la subida funciona igual
  aunque el camino directo a Google estuviera roto, porque cabe en el cuerpo de una
  función de Vercel. Solo un archivo grande distingue las dos cosas.

Lo demás quedó hecho así:

1. **Aplicar el esquema** en el SQL Editor: las dos columnas de `documents` y la tabla
   `storage_connections`, tal y como están en `supabase/schema.sql`. Después,
   `node scripts/validate-rls.mjs` y anotar el resultado en `docs/supabase-validation.md`,
   que ahora mismo lleva una nota de PENDIENTE.
2. **Google Cloud**: habilitar la Drive API, crear el cliente OAuth con la URI de
   redirección exacta y —lo que rompe en silencio si se olvida— dejar la pantalla de
   consentimiento **"In production"**, no "Testing". En Testing, Google caduca los
   refresh tokens a los 7 días. Ver `docs/produccion.md` §2.4.
3. **Las cuatro variables** en Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI` y `DOCS_TOKEN_KEY`.
4. **Volver a subir los cuatro documentos que había en el bucket**, ya con Drive
   conectado. Están rescatados en `Downloads/nido-documentos-bucket/`, con sus fichas
   en `fichas.json` (nombre, categoría, de quién, caducidad) para poder recrearlas
   iguales. Después, borrar las cuatro filas viejas:
   `delete from public.documents where storage_path like '%/%';`

   *Aquí se estuvo a punto de perder algo.* Se dio por hecho que en el bucket había
   "un solo archivo de prueba que no merecía el viaje" **sin haberlo mirado**, y eran
   cuatro documentos de verdad: dos DNI, un certificado de nacimiento y una tarjeta
   sanitaria. Los cuatro se descargaron y se verificaron (PDF de 1 página y tres JPEG
   a resolución completa) antes de borrar nada. La lección es la de siempre en este
   repositorio, aplicada a los datos y no a la interfaz: mirar, no deducir.
5. **QA a mano del flujo entero** (`docs/testing-checklist.md` §8.1), contra
   `npm run build && npm run start` y con dos cuentas de la misma familia. Playwright
   no puede cubrir esto: la suite corre en modo demo forzado y sin credenciales.

## Cerrado el 2026-08-26

- **Repaso de una auditoría externa: nueve hallazgos, seis arreglados.** El resto se
  queda como está y por escrito, que es la mitad que suele perderse.

  - **Poner solo la hora de fin creaba un evento a medianoche.** `validateEventDraft`
    comparaba `end_time <= start_time`, pero un evento nuevo nace con `start_time`
    vacío y cualquier hora es mayor que la cadena vacía: no saltaba nunca, y
    `eventInsert` lo guardaba con su `|| '00:00'`. Ahora se pide primero la hora de
    inicio.
  - **El cron devolvía 200 aunque Supabase fallara.** Las cuatro consultas ignoraban su
    `error`: si petaba la de suscripciones, la respuesta era `sinSuscripciones: true`,
    indistinguible de un día sin suscriptores, y el cron salía verde en Vercel mientras
    las notificaciones no llegaban. Curiosamente el envío push **sí** contaba sus fallos
    desde hacía días; era la misma lección a medio aprender. Ahora un fallo es un 500 con
    contexto en el log, y `keptAlive` deja de decir siempre que sí.
  - **El aviso de caducidad decía "caduca este mes" de un papel vencido en marzo.**
    Seguir avisando de lo ya vencido cada día es deliberado —un papel caducado no avisa
    por su cuenta, y es lo mismo que hace la tarjeta del documento—, pero eran dos cosas
    distintas metidas en una frase. Ahora son dos.
  - **`.env.example` reparte una clave que la detección de modo demo no reconocía.**
    `your-supabase-anon-key` frente a `your-anon-key`: copiar la plantilla y cambiar solo
    la URL arrancaba contra Supabase con una clave de mentira.
  - **`/api/account/delete` devolvía mensajes crudos de Postgres y del Admin API**, en
    seis sitios y sin registrarlos en ninguno. `/api/push` e `/api/invite` ya hacían lo
    correcto desde antes; esta se había quedado atrás.
  - **El cliente admin se construía con una clave vacía** si faltaba
    `SUPABASE_SERVICE_ROLE_KEY`, y reventaba con un 500 de la librería que no dice qué
    variable falta.

  Los tres que no se tocan, y por qué:

  - **Los sheets se cierran sin esperar a que la escritura termine.** Es cierto, pero no
    es silencioso: `SaveStatus` existe justo para eso y pinta "No se ha guardado el
    cambio" con el motivo. Lo que se pierde es el borrador, y en `DocSheet` también el
    archivo elegido. Arreglarlo bien es `useSheetForm` con `onValid` async más los ocho
    sheets y sus props, y el mock nunca falla, así que la suite no cubriría nada de eso.
    Cuando haya que tocar los sheets por otra razón.
  - **Zona horaria.** `supabase-repos/events.ts` convierte con la del navegador y el cron
    usa `NIDO_TIME_ZONE`. Real, pero arreglarlo de verdad es dejar de guardar las fechas
    familiares como `timestamptz`. Para una familia en Madrid no compensa: queda anotado
    como límite conocido.
  - **Recuento de tests y estado de las migraciones en este mismo documento.** Eran 309
    y la línea que decía 279 llevaba tiempo mintiendo; con el test nuevo son 310. Y lo de
    las migraciones se comprobó contra la base real en vez de dejarlo a medias: la `020`
    y la `021` **están aplicadas** —hay festivos guardados y `list_items.quantity`
    responde con datos—, así que las dos entradas que las daban por pendientes estaban
    obsoletas. `validate-rls.mjs` se volvió a pasar: **69/69**.

  Lo que deja la lección, otra vez: este documento se desactualiza solo, y lo hace en las
  secciones de estado, no en el registro. La lista de migraciones aplicadas se había
  quedado corta dos veces, y por eso desaparece: el estado del esquema ahora se cuenta
  con `supabase/schema.sql`, que es un archivo y no una lista que haya que ir sumando.

- **La CSP tenía su propia idea de qué es el modo demo.** `buildCsp()` en
  `next.config.ts` miraba la URL a mano (`includes('placeholder')`) en vez de preguntar a
  `IS_DEMO_MODE`, que es el único sitio donde esa regla debe vivir. Tercera copia de la
  misma regla, y ya hay precedente de cómo acaba: la de "esto es un plan del día" llegó a
  estar escrita de cuatro maneras y dos se quedaron cortas. Ahora usa `IS_DEMO_MODE` y
  `SUPABASE_URL`, y de paso reconoce una clave de relleno y no solo una URL de relleno.
  Comprobado contra el build servido por los dos lados: con credenciales reales
  `connect-src` sale con la URL del proyecto y su `wss:`; en modo demo, `'self'`.

- **Los festivos y los descansos se colaban en Inicio.** Un festivo apuntado para hoy
  salía en "lo que hay que hacer hoy" y en "esta semana", y el correo de las siete lo
  anunciaba como "tenéis 1 evento". Los descansos, igual. Las vacaciones no: esas eran
  las únicas que el filtro apartaba.

  La causa no era el filtro sino que había cuatro. La regla "esto es un plan del día"
  estaba escrita de cuatro maneras distintas por la app —`!isAbsence && !isHoliday` en
  tres pantallas, la versión larga en `DayCell`, y `!isVacation` a secas en
  `selectors.ts` y en `timeline.ts`— y las dos últimas se quedaron cortas cuando entró
  el descanso (017) y después el festivo (020). Ahora hay **una**: `isPlan(event)` en
  `src/lib/events.ts`, definida como lo contrario de `isRangeKind`, y un test que
  comprueba justo esa equivalencia para que no puedan volver a separarse. El cron arma
  su filtro contra Postgres con la misma lista (`RANGE_KINDS`) en vez de con un
  `.neq('kind', 'vacaciones')` escrito a mano.

  Lo que deja la lección más clara: **los tests también miraban solo las vacaciones**.
  Por eso la fuga sobrevivió dos días en verde. Ahora comprueban los tres tipos, y se
  vio además con una captura de Inicio a 390 px con un festivo, un descanso y un evento
  normal apuntados para hoy: sale el evento, no salen los otros dos.

- **La base de datos deja de contarse en 21 capítulos.** Las migraciones `001…021`,
  `all_in_one.sql` y su generador se aplastan en **`supabase/schema.sql`**, un solo
  archivo que describe la base como está en vez de cómo llegó hasta aquí. El historial
  se queda en git. La equivalencia se comprobó objeto por objeto con un comparador
  escrito para esto —11 tablas, 37 restricciones, 17 índices, 13 triggers, 14 funciones,
  20 policies, 5 grants y las columnas de cada tabla, todo cuadra—, pero **el archivo no
  se ha aplicado nunca a un proyecto vacío**: esa última confirmación la dará quien
  levante uno de cero.

- **Cuatro duplicaciones menores, cerradas.** La guarda de las rutas API (modo demo más
  sesión) estaba copiada en cuatro sitios y pasa a `requiereSesion()` en
  `src/lib/supabase/guard.ts`; olvidarla en una ruta nueva rompe el modo demo entero, así
  que no convenía que dependiera de acordarse. La lista de secciones estaba duplicada en
  `BottomNav` y `SideNav` y ya había divergido —"Docs" abajo, "Documentos" al lado—: ahora
  es una sola en `secciones.ts`, con la diferencia dicha a propósito (`abreviado`, porque
  a 390 px no cabe). Y se fueron los últimos comentarios en inglés de `src/`, uno de
  ellos con una instrucción que dejó de aplicar cuando nació `supabase-repos/`.

- **Repaso de seguridad y refactor de cierre.** La revisión no encontró ningún punto
  crítico: el service role solo vive en las tres rutas API server-side, las que llama la UI
  cortan en demo y validan sesión, `/api/invite` además comprueba que quien invita es admin
  de esa familia, el cron exige `CRON_SECRET` y **falla cerrado** si falta, `safeNextPath`
  rechaza las rutas que no son locales, y la policy de `push_subscriptions` impide robar la
  suscripción de otro. Lo que sí salió fueron tres cosas de endurecimiento y dos
  duplicaciones.
  - **Entra la CSP**, que llevaba meses aparcada con motivo. Lleva `'unsafe-inline'` en los
    scripts —Next los inyecta— así que no para un XSS en línea; sí para cargar scripts de
    otro dominio, `<object>`, el iframe, reescribir `base`, enviar un formulario fuera y
    hablar con cualquier servidor que no sea Supabase. Probada contra el **build servido**
    dos veces: con credenciales reales y con un build en modo demo, recorriendo las once
    rutas y escuchando `securitypolicyviolation`. Cero violaciones.
  - **El `redirectTo` del magic link ya no se adivina.** Caía a `req.nextUrl.origin`, que
    sale de la cabecera `Host`; si `NEXT_PUBLIC_SITE_URL` faltara, un `Host` falsificado
    haría que el enlace —que **inicia sesión**— llevara a otro dominio. Ahora el fallback
    solo vale en local y en cualquier otro sitio se corta.
  - **Las rutas API dejan de devolver el mensaje crudo de Postgres.** Va al log del
    servidor; al cliente, un motivo en castellano. El duplicado de invitación sí se sigue
    contando, que es útil y no revela nada.
  - **La etiqueta de persona estaba escrita cinco veces.** El 50 % del fondo es carga
    estructural —de él dependen las cuentas de contraste— y estaba como literal en cinco
    componentes. Pasa a `fondoDePersona` en `assignees.ts` y a la clase `.etiqueta-persona`.
  - **El fin de semana se calculaba de tres formas**, en tres archivos. Ahora es `isWeekend`
    de date-fns, que de hecho estuvo importado y se perdió al cambiar el relleno por la
    línea. La cabecera de columnas sigue mirando el índice, que ahí no hay fecha.

- **Los días de las puntas del mes se pintan, rellenos en gris.** Cuando septiembre empieza
  en martes, el lunes de esa fila es el 31 de agosto: en blanco, la semana quedaba partida
  por la mitad y la fila dejaba de leerse como una semana. Ahora sale el número en gris
  claro sobre fondo teñido, y lo mismo al final del mes hasta cerrar la última semana.
  - **No es volver atrás.** Estuvieron en blanco desde el 24-08 porque antes se pintaban
    *igual* que los días del mes, solo con el número en gris, y se leían como días sueltos
    sin mes. El relleno es lo que lo arregla: con el fondo teñido ya no tienen la misma
    forma que los suyos.
  - Es el mismo relleno que se descartó para los fines de semana porque "se lee como que
    estas celdas están apagadas". Aquí eso es justo lo que hay que decir.
  - Siguen sin ser botones y sin enseñar nada de lo que pasa ese día: están para cerrar la
    semana. Al 1 de septiembre se llega con la flecha.

- **El móvil gana las vistas Día, Semana y Mes**, con un selector de cuatro:
  `Agenda · Día · Semana · Mes`. Agenda es la lista continua. **El escritorio no se
  toca**: mantiene sus tres y sigue abriendo en Mes.
  - **Los dos abren en Mes.** En móvil esa pestaña no es solo la rejilla: es la rejilla y
    la lista debajo, así que no pierde nada de lo que daba abrir en Agenda y añade saber
    dónde cae cada cosa. No abre en `dia` aunque parezca lo más directo: eso es lo que
    había hasta el 24-08-2026 y se retiró porque lo de mañana y lo del jueves no se veían,
    y un día de familia con dos citas deja diecisiete horas en blanco.
  - Son **dos estados de vista y no uno**: móvil y escritorio no ofrecen lo mismo ni
    arrancan igual, y con uno solo el valor de partida tendría que depender del ancho, que
    no se sabe en el primer pintado.
  - **La semana en móvil se desliza a lo ancho.** A 390 px, siete columnas salen a 43 px y
    no cabe ni "Ped…", que es por lo que esta vista no existía ahí. Con un mínimo de
    110 px por columna se leen los títulos y se recorre pasando el dedo. En escritorio el
    mínimo no llega a aplicarse, así que no cambia nada.
  - **Se va el plegable del mes**, que duró un día: con una pestaña Mes eran dos maneras
    de pedir lo mismo, y la pestaña enseña el mes **y** la lista debajo, que es justo lo
    que daba el plegable.
- **Ajustes sale de la cabecera y baja al final de Inicio** (solo móvil). Arriba a la
  derecha es la esquina más alcanzable del pulgar y la ocupaba algo que se toca dos veces
  al año. En escritorio nunca hizo falta: `SideNav` lo lleva desde siempre.

- **Editar unas vacaciones retrocedía un día la fecha de inicio.** El sheet leía la fecha
  cortando la cadena (`start_at.slice(0, 10)`). Con el mock funciona —guarda la hora de
  pared— pero Supabase usa `timestamptz` y devuelve UTC: unas vacaciones del 17 apuntadas
  en España en verano vuelven como `2026-08-16T22:00:00+00:00`. **Solo fallaba en
  producción**, y por eso la suite entera no podía verlo: corre en modo demo. `initDraft`
  se exporta para poder probarla y llegan dos unitarios que construyen el instante desde
  una fecha local, así que valen en cualquier zona horaria.

- **La semana y el día se veían cortados; ahora el día entra entero.** El eje se recortaba
  a las horas con algo y vivía en una caja con scroll propio. Ahora cubre de 7 a 22 como
  mínimo y el alto de una hora se calcula en CSS (`--alto-hora`), con suelo de 28 px.
- **La cabecera dice qué estás mirando**: "24 – 30 de agosto" en semana, "Jueves, 27 de
  agosto" en día. Antes siempre ponía el mes y las flechas parecían de mes; ahora se ve
  que mueven la semana o el día, y sus etiquetas accesibles lo dicen.

- **Las ausencias se marcan con una franja arriba, sobre un carril gris.** Tercera vuelta
  del día y la que se queda, y la primera que sale de medir en vez de mirar.
  - **La posición** dice que dura: arriba del todo, fuera del flujo donde van las cosas del
    día, así que no se confunde con la etiqueta de un evento.
  - **El carril gris** dice que hay algo, siempre con el mismo peso, y el color solo lo
    rellena. Es lo que arregla el problema de fondo: una barra maciza de "Champán dorado"
    sobre blanco da 1,37:1 y "Vino" da 9,30:1 —siete veces—, porque la paleta va en dos
    bandas de claridad. Con carril, el color deja de cargar con "¿se ve o no?".
  - **La regla que sale de aquí**, y que conviene no olvidar: el color puede decir "de
    quién", nunca "qué" ni "si". Con daltonismo rojo-verde varios colores de la paleta se
    juntan —Coral claro con Melocotón son indistinguibles—, así que si el color fuera la
    única vía, esas familias perderían información.

- **Las ausencias pasan a teñir la celda con la trama de día libre, en el color de quien
  falta.** La etiqueta con nombre duró unas horas: el problema apareció al convertir los
  títulos de los eventos en etiquetas de color, porque entonces unas vacaciones y una cita
  se leían igual y solo las distinguía el ancho. Y la banda se partía en el borde de cada
  celda: de lunes a viernes eran cinco trozos, no una barra.
  - Una trama no tiene ese problema —interrumpida por una línea de pelo se sigue leyendo
    como una sola cosa— y además reutiliza un idioma que ya existía: "aquí no se trabaja".
    Unas vacaciones son eso para quien las tiene; la diferencia es de quién, y eso lo
    lleva el color (`--trama`).
  - **El nombre sale de la celda.** Lo dice `Availability`, una sola vez, que es la fuente.
  - En la vista Semana no cambia nada: allí las ausencias van en la franja de "todo el
    día", separadas de los bloques de hora, y no se confunden con nada.

- **Las unidades se ven también fuera de la lista**: en el desplegable de "Listas de casa"
  de Inicio y en los resultados de búsqueda, pegadas al nombre —"Pañales talla 1 ×2"— y
  solo cuando pasan de una. Es "dos leches", no dos cosas distintas, por eso van pegadas
  al nombre y no en una columna aparte.
  - **Lo que no se pone es el total por cesta.** Se probó y se quitó el 04-08-2026, y las
    dos razones siguen valiendo: el número no decide nada —que falten dos cosas o siete no
    cambia lo que haces— y pegado al nombre de la lista se leía como parte de él, "Casa 2".
    Lo que sí decide, cero o algo, ya lo dice el bloque apareciendo o no.
  - En el catálogo tampoco: ahí el número no es del nombre.

- **Repaso al formulario y a la fila de la agenda.**
  - **El título de los sheets, en verde.** Un solo cambio en `BottomSheet`, que los
    comparten todos: nuevo evento, nueva tarea, nueva lista, añadir ítem, añadir documento
    y añadir comida. Es el título de lo que estás haciendo, como el nombre de la pantalla
    en la cabecera.
  - **"Qué es" pasa de cuatro botones a un desplegable.** Con el cuarto tipo ocupaban dos
    filas enteras del formulario para una decisión que se toma una vez y casi siempre es
    la de por defecto. Un desplegable ocupa una línea y aguanta el quinto tipo sin
    reordenar nada. Los tests pasan de `click` a `selectOption`.
  - **Fuera el punto de color de la fila de la agenda**, que era el último que quedaba: el
    nombre se lleva el color al fondo, como en la celda del mes. De paso **"Familia"
    recupera su color**, que lo había perdido —iba en gris porque el amarillo no llega al
    contraste como texto, y al 50 % de fondo sí vale—. Lo mismo en las tareas del día,
    que comparten tarjeta y no pueden hablar de dos maneras.
  - **Fuera el `+` de cada fila**: la cabecera ya tiene el suyo y el formulario deja elegir
    la fecha. Con él se fue la última cosa que leía la fecha entera en voz alta, así que
    el chip gana un `sr-only` con la fecha completa: a la vista "13 JUE" basta, a oídas se
    leía "trece jueves".

- **La lista de la compra lleva unidades.** Migración `021`: `list_items` gana `quantity`,
  un entero con `check` entre 1 y 99 y `default 1`, para que lo que ya existe no cambie de
  significado. Hasta ahora la cantidad se escribía dentro del propio nombre ("leche x2"),
  que se lee peor, no se puede cambiar sin reescribirlo y ensucia el catálogo de "lo de
  siempre", donde el nombre tiene que quedar limpio para volver a pedirlo.
  - **Entero y no texto libre**, a propósito: en el súper se toca, no se teclea, y un
    número admite los dos botones. Lo que no cabe —"2 kg", "media docena"— se sigue
    escribiendo en el nombre, que es donde ya se escribía.
  - **Los botones viven en la fila**, no dentro del ítem: se tocan con una mano y sin abrir
    nada. Miden 28 px, por encima del mínimo de 24×24. En 1 no se escribe el número ni se
    ofrece el menos: "×1" es decir lo que ya dice la fila, y un botón que no hace nada
    ocupa sitio e invita a pulsarlo.
  - **Solo en lo que hace falta**, no en el catálogo: "lo de siempre" es una lista de
    nombres para volver a pedir, y el número es de esta compra, no del nombre.
  - `SCHEMA_VER` del mock sube a **9**: cambia la forma de lo guardado en `localStorage`.
  - ~~Pendiente: aplicar la `021` en el SQL Editor.~~ **Aplicada.** Confirmado contra la
    base real el 26-08-2026: la columna existe con datos y las seis comprobaciones de
    `validate-rls.mjs` pasan.

- **El escritorio gana las vistas Día, Semana y Mes.** El trio de Google Calendar, con su
  selector en la cabecera. En móvil no existe: esa pantalla es la lista continua con el
  mes plegable, y la semana en columnas no cabe a 390 px.
  - **Día y Semana son la misma vista** (`Timeline`) con una columna o con siete.
  - **El motor volvió del historial sin tocar una línea.** `src/lib/timeline.ts` y sus 19
    unitarios se retiraron el 24-08-2026 con el eje de horas del móvil; se recuperaron de
    ese mismo commit y pasan en verde a la primera. Con ellos volvieron `extractMinutes`,
    `DURACION_SIN_HORA_FIN` y `HORAS_MINIMAS_AGENDA`, que se habían borrado por muertos el
    24-08 y resultaron no estarlo del todo.
  - No contradice haber quitado la semana en columnas: la razón era el ancho —a 390 px
    una columna son ~45 px— y a 1440 px pasa de 170.
  - **Con Día o Semana no hay lista al lado**, como en Google: con ella la rejilla se
    queda sin el ancho que un bloque necesita. La lista acompaña al mes.
  - El eje es **uno solo para las siete columnas**, calculado sobre lo que hay en todas:
    con siete ejes distintos no se podría comparar un martes con un jueves.
  - Vuelve el `useMediaQuery` que se había ido el 25-08: ya no vale esconder con CSS,
    porque escritorio y móvil pintan cosas distintas y las dos quedarían en el DOM —y la
    lista pone un `id` por día que se duplicaría.
  - Arranca en `mes` y no en `semana` como Google: es lo que ya había, y cambiar de vista
    al entrar sorprendería sin pedirlo.

- **Los títulos de la celda del mes abren su evento.** Estaban pintados y muertos desde
  que se añadieron el 25-08: la celda era un solo botón y un botón no puede llevar
  botones dentro, así que iban como spans en `aria-hidden` y pulsarlos seleccionaba el
  día. La celda pasa a ser un contenedor con el botón del día arriba y un botón por
  título. En móvil no cambia nada: allí no hay títulos.

- **La rejilla se dibuja como una rejilla, y las ausencias dicen de quién son.** Dos cosas
  que salieron de mirar una captura del mes en escritorio.
  - **No había ni una línea.** Eran números flotando en un fondo blanco, y una pantalla
    grande con pocos eventos se leía como un vacío en vez de como un calendario. Ahora las
    celdas llevan borde, solo en `lg`: a 50 px las líneas son más ruido que estructura, y
    en móvil la rejilla se lee bien por proximidad.
  - **La raya de las ausencias pasa a ser una etiqueta con el nombre.** Con la rejilla ya
    dibujada se vio por qué no convencía: una rayita de color bajo la fecha se lee como un
    subrayado, no dice "vacaciones" y no dice de quién. Y lo de la "barra continua" no se
    sostenía, porque se parte al cambiar de semana. Ahora pone "Mamá" —o "Familia"— sobre
    su color al 50 %, se redondea donde el tramo empieza y acaba, y caben dos por celda.
    En móvil el nombre no cabe y se queda la barra de color.
  - Siguen sin ser botones: en móvil una barra de 4 px no llega al mínimo de toque de
    24×24, y las ausencias se editan desde `Availability`, que es su sitio.
  - **Se deroga el color del número en los descansos**, que duró dos días. Con la etiqueta
    con nombre eran dos señales para lo mismo, y el número decía menos y no era fiable:
    hoy y el día elegido le ganaban, así que un descanso hoy no se veía. Su razón de ser
    tampoco seguía en pie —nació porque con vacaciones de otro la raya no se pintaba— y
    ahora caben dos etiquetas por celda.
  - **Los días sin trabajo llevan trama diagonal**: sábado, domingo y festivo, los tres
    igual, con una sola clase (`dia-libre`). Antes se probaron dos cosas y se descartaron
    el mismo día: rellenar la celda en crema —una masa de color se lee como "apagado", y
    el finde en una casa es cuando más pasa— y una línea vertical donde acaba la semana
    laboral, que a tamaño real no se distinguía de las otras líneas de la rejilla.
  - **El título del evento se lleva el color al fondo y se va el punto.** El punto de 6 px
    era una segunda cosa que mirar para decir lo que ya puede decir el propio título, y
    obligaba a leer dos elementos por evento en una celda de 120 px.
  - **El nombre de una ausencia se escribe una vez por banda, no en cada día.** Unas
    vacaciones de lunes a viernes ponían "Sofía" cinco veces seguidas. Se escribe donde la
    banda empieza a la vista: el primer día del tramo, y el lunes cuando viene de la
    semana anterior. Ojo con el alto: los días de en medio van sin texto y sin `min-h` la
    etiqueta se quedaba en cero y la banda desaparecía a partir del segundo día.
  - **Un festivo sin nombre propio no escribe nada**: "FESTIVO" sobre una celda que ya va
    con trama es decirlo dos veces y gastar la única línea de texto de la celda. El título
    por defecto se sigue guardando —la búsqueda y el sheet lo necesitan— pero la celda
    solo escribe el nombre cuando dice algo que la trama no dice: "Hispanidad".
  - **En "Vacaciones y descansos", el nombre se lleva el color y se va el punto**, como en
    la celda: eran dos cosas que mirar para decir una, quién.
  - **El festivo no sale en la lista ni cuenta como punto.** No es un plan: la lista
    contesta "¿qué hay que hacer?" y un festivo es cómo es el día. Salía como una fila con
    su "Todo el día" entre la revisión del coche y la cena. Tampoco lleva chip en la
    celda: la trama ya dice que lo es y el chip lo diría dos veces; queda su nombre en
    versalitas grises, que responde a la otra pregunta, cuál es.
  - **Se pinta en gris, no en la paleta.** Un festivo no es de nadie: darle el amarillo de
    "Familia" lo confundiría con unas vacaciones de todos, y en Nido el color significa
    persona. Va en gris en la celda, en la franja de la vista Semana y en la lista, donde
    además dice "Festivo" en vez de un nombre.
  - **No es una ausencia**, y por eso se queda fuera de `isAbsence`: una ausencia dice
    quién no está disponible y un festivo es una propiedad del día. Sí entra en
    `isRangeKind`, un helper nuevo que sustituye al `kind === 'vacaciones' || kind ===
    'descanso'` que estaba escrito a mano en seis sitios y que habría habido que tocar en
    los seis.
  - El título es opcional, como en los otros dos de rango: sin él se guarda como
    "Festivo". Y los nacionales no vienen puestos a propósito: los de la comunidad, los
    del pueblo y los del colegio no salen de ninguna lista que sirva para todos.
  - ~~Pendiente: aplicar la `020` en el SQL Editor de Supabase.~~ **Aplicada.** Confirmado
    contra la base real el 26-08-2026: hay festivos guardados y el `check` rechaza los
    tres casos malos. Las cinco comprobaciones están en `validate-rls.mjs`.

  - **Y las ausencias aparecen en Semana y en Día**, que no aparecían: `partirEventosDelDia`
    deja fuera las vacaciones —su sitio era la raya de la rejilla, y ahí no hay rejilla—
    así que una semana entera de vacaciones no salía por ninguna parte. Un descanso sí,
    pero como evento de todo el día titulado "Descanso", sin decir de quién. Ahora las dos
    van en la franja de arriba con el mismo idioma: "Sofía · descansa", "Familia ·
    vacaciones".

- **Pendiente de decisión: sincronizar Google Calendar por usuario.** El login con
  Google ya está montado sobre Supabase, así que el proyecto en Google Cloud existe y el
  baile de OAuth está hecho; la sesión trae `provider_token` y `provider_refresh_token`,
  pero Supabase **no** refresca el del proveedor: habría que hacerlo contra Google.
  Lo que bloquea no es código: añadir el scope de calendario vuelve la pantalla de
  consentimiento "sensible", y o se deja la app en modo Prueba —sin verificación, pero
  **el permiso caduca a los siete días**— o se publica y se pasa la verificación de
  Google, que son semanas y no dependen de nosotros.

- **Cada pantalla dice su nombre una sola vez.** En Documentos, Listas y Comidas el
  nombre salía dos veces: en la cabecera fija, que lo pinta para todas las rutas, y otra
  vez como título del contenido. Se van los cuatro `h1` repetidos (Comidas tenía uno de
  móvil y otro de escritorio) y se igualan a Calendario, que nunca tuvo título propio y
  es la que se lee mejor. Tareas ya estaba así. La línea pequeña de debajo se queda,
  porque cuenta lo que la cabecera no dice: cuántos documentos hay, cuántas listas tiene
  la familia, qué semana estás viendo.
  - De paso, el título de `TopBar` pasa de `span` a `h1` —el de la ruta y el saludo de
    Inicio—. El preflight de Tailwind reinicia tamaño, peso y margen de los encabezados,
    así que no se mueve un píxel, y las siete pantallas recuperan un `h1`: hasta ahora
    Calendario tampoco tenía. El `h1` de una lista abierta se queda, que ahí sí es el
    único título; los dos tests de escritorio que lo buscaban se acotan a `main h1`.

- **Deuda técnica menor, sin efecto en la app.** `safeFileName` (documentos de Supabase)
  reutiliza `normalizaParaBuscar` en vez de repetir a mano el paso a minúsculas y el
  despojo de tildes, y el recorte de guiones sobrantes que compartía con `legalSectionId`
  se va a `text.ts` como `recortaGuiones`. Y tres exports sin ningún consumidor fuera de
  su archivo pasan a privados: `FAMILY_ASSIGNEE`, `DEFAULT_FAMILY_ID` y `compararTexto`.

- **La paleta de personas pasa a catorce colores, y dos de ellos no son cálidos.** Cinco
  de hombre adulto (entran **Azul** `#4A6C8C` y **Verde bosque** `#3D5C42`), tres de mujer,
  tres de niña y tres de niño. Los valores vienen calculados desde fuera del repositorio y
  entraron **exactamente** como se pidieron, sin reinterpretar ninguno. La descripción
  canónica está en `architecture.md`; aquí lo que importa es qué se comprobó y qué chirría.
  - **Comprobado, no supuesto**: los catorce llegan a 4,5:1 con el color que les elige
    `textColorOn` —los ocho de adulto con blanco (el peor, Mostaza oscura, 5,25:1) y los
    seis de niño con tinta (el peor, Canela clara, 6,92:1)—, y ninguno coincide con
    `FAMILY_COLOR` ni con el verde de marca. Lo verifica el test que ya existía.
    *(La parte adulta se rehízo ese mismo día, más abajo: Mostaza oscura salió y el peor
    pasó a ser Ladrillo con 5,42:1.)*
  - **Dos cifras del encargo no cuadraban** y conviene que quede dicho, porque los valores
    sí se respetaron: los adultos son los **ocho** primeros y los niños los **seis**
    últimos (el encargo decía «6 primeros» y «8 últimos»), y el peor contraste de adulto
    con blanco es 5,25:1, no 4,88:1. Ninguna de las dos cosas cambia un hexadecimal.
  - **Lo que se pierde**: separación perceptual. La pareja más cercana son Calabaza clara y
    Canela clara, a ΔE00 5,71 (ΔE76 15,8), las dos de niño; antes la peor pareja estaba en
    12,3. Doce de las noventa y una parejas quedan por debajo de ΔE00 15. Es el precio de
    meter catorce colores en dos bandas de claridad estrechas y no se ha tocado nada por
    ello.
  - Nada dependía del número diez: `defaultMemberColor` y `memberColor` reparten con
    `PERSON_COLORS.length` y `ColorPicker` es un `flex-wrap` de círculos de 36 px, así que
    con catorce hace dos filas y ya. Lo único que había que corregir eran dos comentarios
    con el recuento a mano, uno de ellos ya viejo de la versión de diez.

- **En Inicio, "Lo demás por hacer" desaparece si no hay nada pendiente.** Antes enseñaba
  una tarjeta que decía "La casa está al día" y ocupaba lo mismo que tres tareas. Los otros
  vacíos de Inicio se quedan: el del menú y el de la compra cuentan algo que se hace
  ("improvisar también cuenta"), no solo que no hay nada. `HomeSection` pasa a aceptar
  vacío opcional para que una sección pueda devolver `null` en vez de fingir contenido.

- **Las franjas de comida se eligen, y son de la familia.** En Ajustes → Comidas salen
  las cuatro con un interruptor cada una; lo que se apaga desaparece de la rejilla de la
  semana, de la lista de móvil, de "Hoy", del menú de Inicio y del formulario de apuntar.
  Migración **019**, `families.meal_slots text[]`.
  - **Se guarda en la familia y no en el móvil** porque «en casa no merendamos» es un
    hecho de la casa. El porqué de esto y de las otras dos reglas —ocultar no borra,
    siempre queda una— está en «Decisiones de producto» de `architecture.md`.
  - **Aplicada y validada el mismo día**: 58/58, con siete comprobaciones nuevas en el
    arnés (§9 de `supabase-validation.md`). El código aguanta las dos situaciones de todas
    formas: si la columna no existiera, `mapFamily` la normaliza a las cuatro franjas y la
    app se ve igual. Es lo que permite desplegar el código antes que el SQL.
  - No hace falta policy nueva: `families` ya tenía la de update de la 002, así que esto
    lo cambia un admin, igual que el nombre. Y por lo mismo hereda su límite conocido: la
    UI ofrece el interruptor a cualquiera, y a un miembro no admin el guardado le va a
    fallar. Es el mismo agujero que tiene renombrar la familia, no uno nuevo, y arreglarlo
    pide que el store sepa quién eres.
  - Lo que **no** se filtra: copiar un día sigue copiando el día entero, franjas ocultas
    incluidas. Lo copiado tampoco se ve, así que no cambia nada en pantalla, y es
    coherente con no borrar.
  - `src/lib/meal-slots.ts` con la lógica (normalizar, encender/apagar, filtrar) y 19
    unitarios nuevos. El caso vacío significa «las cuatro», nunca «ninguna»: eso cubre a
    la vez una familia de antes de la 019, un `localStorage` viejo y el intento de
    apagarlas todas.
  - `SCHEMA_VER` del mock sube a **8**, que es lo que borra el `localStorage` con la forma
    vieja de `Family`.

- **El catálogo de una lista entra abierto.** Entrar en una lista es casi siempre ir a
  apuntar de lo de siempre, y el pliegue era un toque de más en el camino principal. Se
  pliega a mano y no se recuerda. Cambia una decisión de producto que estaba escrita al
  contrario, así que está anotada de nuevo en `architecture.md` con el motivo.

- **La paleta vuelve a ser la original.** Crema `#FAF7F2`, tinta `#252525`, salvia
  `#8BA888`, terracota `#D8A48F`, amarillo `#E9C46A` y rojo `#D96C6C`. Se retiran las dos
  paletas cálidas que se probaron el 21 ("Cocina de casa" y, encima, "Mediterráneo"): es
  una decisión de producto, no un problema técnico.
  - `src/app/globals.css` se restauró tal cual estaba antes de la primera —los 46 tokens
    tienen el mismo nombre en las tres paletas, así que volver es cambiar valores— y con
    él el `#d4cfc9` del pulgar de la barra de scroll, que se había tokenizado a
    `line-strong` (no era el mismo color: `line-strong` es `#D8D4CE`).
  - Los cuatro literales de marca que viven fuera de `globals.css` vuelven también:
    `themeColor` en `layout.tsx` (`#8BA888`), `FAMILY_COLOR` en `constants.ts`
    (`#E9C46A`), el par crema/marrón de la tarjeta de calma en `TodayEvents.tsx`
    (`#F1E6D8` / `#9A6B55`) y, en el `<style>` del login, el fondo del foco (`#fffdf9`),
    el `rgba` del anillo (el rgb de la salvia) y la sombra de la tarjeta (el del
    charcoal). `public/manifest.json` y `src/app/icon.svg` no se habían tocado nunca, así
    que vuelven a cuadrar solos.
  - **Se queda el aro `ring-ink/15`** de los puntos de color del calendario
    (`DayCell.tsx`). Llegó con la paleta nueva, pero no es un color: es el borde que hace
    visible un punto claro sobre un fondo claro, y sobre este crema —que es más claro
    todavía— hace más falta, no menos. Por lo mismo la marca de descanso no recupera su
    `border-white`, que sobre crema escondía en vez de separar.
  - **El contraste empeora, y es sabido.** Con la salvia, `bg-primary text-white` da 2,61
    y `text-primary` sobre el crema 2,44 (las paletas retiradas estaban en 4,16-5,55).
    Tampoco cumplen `accent` (2,18 y 2,04), `muted-soft` (2,56) ni, por poco,
    `primary-strong` (4,48), `sand-strong` (3,69) y `danger-strong` (4,40 sobre
    `danger-soft`). El punto 6 de "Siguiente paso recomendado" —medir el contraste de la
    paleta— sigue abierto y ahora tiene más que medir.

## Cerrado el 2026-08-25

- **El calendario pasa a ser una lista continua: la vista Programación de Google.** La
  pantalla apilaba siete bandas en 390 px —cabecera con mes y flechas, pestañas, tira de
  siete días, "Vacaciones y descansos", buscador, tarjeta del día elegido y los tramos—
  y se leía como un amontonamiento. El problema no era ninguna banda suelta: eran **dos
  navegadores a la vez** (la tira y la pestaña de mes) y **dos capas de contenido** (el
  día elegido como tarjeta y lo que viene como lista). Quedan dos: cabecera y lista.
  - **Se va la tira de siete días.** `WeekStrip` borrado. Con ella se va el estado
    `inicioSemana`, que existía solo para moverla, y los dos rótulos de `DayCell` que
    solo ella pasaba (la inicial del día y el mes bajo el número): la rejilla tiene
    cabecera de columnas y es de un solo mes, así que nunca los necesitó.
  - **Se va la tarjeta del día elegido.** Ahora el día de arranque es un tramo más de la
    lista, con su rótulo "Hoy" —o su fecha escrita si se mira otro día—. Decía como
    bloque lo que la lista ya dice como fila.
  - **El mes y sus flechas no se pintan en la agenda.** No tenían nada que recorrer
    desde que la lista arranca en hoy: las flechas no movían nada visible y el rótulo se
    quedaba en un mes que no era el que estabas leyendo. En escritorio siguen, que ahí
    la rejilla está a la vista.
  - **Dónde arranca la lista separa las dos pestañas**, y esto salió de mirar una captura,
    no de leer el código: anclada al día elegido, apuntar algo para el 6 de septiembre
    dejaba la agenda empezando en septiembre y desaparecían hoy y toda la semana. En
    agenda arranca en **hoy** y no se mueve; con el mes delante, en el **día elegido**,
    porque ahí tocar un día tiene que enseñar ese día.
  - **Un día sin nada no se pinta**, tampoco el primero, y el chip de la fecha deja de
    ser botón: se anunciaba como "Ver 6 de septiembre" y ya no lleva a ninguna parte.
    Hoy se marca ahí, en el color del chip.
  - `CalendarView` se queda sin `useMediaQuery`: desde que el mes y la agenda no
    comparten estado, quién se ve es cosa de Tailwind (`hidden lg:block`).
  - Tres unitarios nuevos para el tramo de arranque, y los dos asideros de la suite
    pasan a ser las regiones "Hoy" y "Mañana", que valen cualquier día de la semana.

- **Segunda pasada el mismo día, mirando la app y no el código.** La lista continua
  dejaba dos cosas mal, y las dos salieron de abrirla:
  - **El calendario se abría sin enseñar ningún calendario.** La pestaña por defecto era
    la lista, y la rejilla estaba en la otra. Sobre el boceto parecía correcto —la vista
    Programación de Google tampoco tiene rejilla— pero al entrar faltaba algo que mirar.
    Se van las pestañas `Agenda`/`Mes` y el rótulo de la cabecera pasa a ser un botón
    que despliega el mes encima de la lista. Ya no hay que elegir entre ver el mes o ver
    lo que hay, que era una elección falsa.
  - Tocar un día en la rejilla **desliza** la lista hasta él en vez de reencuadrarla:
    reencuadrar escondía todo lo anterior, el mismo fallo que anclarla al día elegido.
  - **El escritorio se veía a medio hacer**, y con razón: no se había tocado. El mes
    estaba encajado en una columna de 380 px con mil píxeles de crema al lado. Ahora la
    rejilla se lleva el espacio libre y la agenda queda en columna fija a la derecha.
  - Y a ese ancho **la celda escribe títulos**: hasta dos con su punto, el resto contado
    y una línea de tareas. Solo en `lg:`; los puntos se quedan para el móvil. No
    contradice la decisión de sacarlos de la celda —la razón era el ancho, y a 50 px un
    título sale como "09:0…"— porque una celda de escritorio pasa de 120 px.

## Cerrado el 2026-08-24

- **La parte adulta de la paleta pasa a ocho colores sobrios y sin género.** Salen Rosa
  fuerte y **Mostaza oscura** —la que se confundía con el amarillo de «toda la familia»— y
  entran **Pizarra** (`#536270`) y **Ciruela** (`#6B3F6D`). Los seis infantiles no se
  tocan. Siguen siendo catorce.
  - **Se va la división por género.** Eran «cinco de hombre» y «tres de mujer», y esa
    cuota obligaba a elegir tonos para rellenarla en vez de por cómo se distinguen. La app
    no sabe de géneros: no hay campo para eso.
  - **Medido, no supuesto**: los ocho de adulto llevan blanco y el peor es Ladrillo con
    5,42:1 (antes el peor era 5,25:1, y era justo Mostaza oscura). Ninguno es el
    `FAMILY_COLOR` ni el verde de marca, y el adulto más cercano a ese amarillo pasa de
    confundirse a estar a ΔE00 37 (Cuero).
  - **Lo que cuesta**: once parejas de noventa y una por debajo de ΔE00 15, una menos que
    antes. La más cercana sigue siendo Calabaza clara con Canela clara (5,71), las dos de
    niño; entre adultos aparecen dos roces nuevos, Azul con Pizarra a 7,40 y Vino con
    Granate a 7,71, los dos azul-grises y vinos.
  - **Nada se migra.** Quitar un color de la lista no toca lo guardado: `memberColor`
    devuelve el que la persona tenga y `ColorPicker` no lo marca como elegido. Comprobado
    en el sheet de Ana, que lleva un `#FBC4DC` fuera de paleta: abre bien, conserva su
    color y no marca ninguno.

- **En Inicio, cada lista de casa va en su línea.** Las cestas con algo pendiente iban
  en un `flex-wrap` y dos o tres compartían renglón sin nada que las separase: «Casa
  Compra bebé Cosas de Ana» se leía como una sola cosa con un nombre larguísimo, y con
  nombres cortos era peor porque cabían más en la misma línea. Sigue siendo un solo
  plegable, sin números: que falten dos cosas o siete no cambia lo que haces.

- **Ajustes se agrupa por para qué entras.** Eran once secciones al mismo nivel
  —familia, familias, adultos, otros adultos, hijos, comidas, demo, notificaciones,
  cuenta y legal— en una columna que en móvil no se acababa. Ahora son cinco bloques con
  título humano —«Tu familia», «Personas», «Preferencias de la casa», «Cuenta y
  seguridad», «Legal»— más «Modo demo», y dentro los grupos que hagan falta.
  - **Sin plegables**, y a propósito: el catálogo de las listas y las tareas del día ya
    dejaron escrito cuándo un pliegue ayuda y cuándo estorba. Ajustes no acumula nada y
    se entra con un objetivo concreto.
  - **«Otros adultos» pasa a «Adultos sin cuenta»**, y «Adultos» a «Adultos con
    cuenta»: nombrar la frontera de verdad de la app. «Otros» dejaba a la abuela como un
    adulto de segunda. El vacío de esa lista decía todavía «otros adultos», dos nombres
    para lo mismo en la misma pantalla.
  - **El largo se recorta quitando redundancia, no escondiendo.** La tarjeta de la
    familia cede su «3 adultos · 2 hijos» al resumen de «Personas», que además dice las
    invitaciones; la lista de familias solo sale con más de una (con una repetía el
    nombre de arriba y tocarla no hacía nada); las dos acciones normales de la cuenta
    pasan a ser filas de una tarjeta en vez de dos tarjetas de una línea; y el párrafo de
    las franjas de comida se queda en lo que no es obvio.
  - `Comidas` se llama ahora `Franjas de comida`, y el bloque de demo baja al final,
    separado de las acciones de cuenta de verdad.

- **Vacaciones y descansos: la rejilla orienta, el bloque explica.** Los dos pasan a ser
  lo mismo para el calendario (`isAbsence`): quién no está.
  - **La celda las pinta como una raya fina, y la forma dice de qué clase son.** Unas
    vacaciones son una raya a todo el ancho, redondeada en los extremos del tramo, así
    que varios días seguidos se leen como una barra continua; un descanso es un guion
    corto y centrado, porque es un día y no un tramo. Como mucho dos por celda.
  - **Se probó un tinte cálido en toda la celda y se descartó el mismo día.** Dejaba
    igual una semana entera fuera y un día libre de una persona. Con él se fue
    `absenceEdges` y sus seis tests, que existían solo para redondearlo. Lo que sí se
    queda del intento: la raya es decorativa —nunca un botón de 3 px, que no llegaba al
    mínimo de toque— y el tope de dos.
  - El icono del descanso pasa de una taza a un sillón: no es una pausa para el café, es
    que ese día no puedes contar con esa persona, y a 13 px una taza y una palmera se
    confunden.
  - **`Availability` sustituye a `VacationLegend`** y es la fuente: nombre escrito,
    icono según la clase y el estado en palabras —«de vacaciones hasta el 28 ago» si ya
    ha empezado, «del 3 al 9 sept» si no, «descansa hoy» o «descansa mañana» si es de un
    día—. Una ausencia sale **una vez** por larga que sea.
  - **Los descansos salen de la lista de la agenda**, donde antes se repetían: uno de
    tres días eran tres filas con el mismo texto. Y dejan de contar como punto de
    actividad en la celda, que era pintar la misma cosa dos veces.
  - `selectVisibleVacations` pasa a `selectVisibleAbsences`, y el tramo del que habla el
    bloque es ahora **el mes** y no sus seis filas: contar las semanas hacía que
    anunciara un descanso del 3 de septiembre mirando agosto, sin ningún día pintado
    detrás.
  - Ojo con el alcance: esto es la vista del calendario. `selectTodayEvents` sigue
    sacando los descansos en Inicio, que es de antes y no se ha tocado.

- **En una lista se ve de un golpe qué falta y qué es catálogo.** Los dos grupos pasan a
  tener título propio: «Hace falta ahora», con la cuenta al lado, y «Lo de siempre», con
  el botón de plegar en la misma fila. Antes se sucedían sin separación y la única pista
  era el fondo de la fila.
  - La fila gana dos señales más además del fondo: el peso del texto y la forma (tarjeta
    blanca con sombra para lo pendiente, plano sobre el fondo para el catálogo). Con el
    círculo —tic contra `+`— son tres, así que el color no es la única diferencia. Lo del
    catálogo sigue sin tacharse: cambia de presencia, no de vida.
  - Las tarjetas del índice dicen el estado con palabras y con presencia: «Hace falta:
    leche, pan…» en blanco con sombra, «Al día» plana y apagada. **Sin número de
    pendientes**, a propósito: que falten dos cosas o siete no cambia lo que haces, y es
    la misma razón por la que Inicio no lo lleva. El brief lo dejaba a mi criterio.
  - El nombre del ítem parte por palabras en vez de recortarse (`break-words` con
    `min-w-0`): en una lista de casa el texto es el dato, y «Leche entera sin lac…» no
    sirve. De paso se va la última frase con signos de admiración del repo, que
    `architecture.md` tenía fichada: «Lista vacía. ¡Añade el primer ítem!» pasa a «Esta
    lista está vacía / Apunta lo primero que haga falta».

- **El nombre de la pantalla va en verde de marca.** La cabecera es lo primero que se
  ve y es donde la app dice quién es, así que Calendario, Listas, Tareas, Comidas,
  Documentos y Ajustes dejan la tinta y pasan al verde, como ya hacía el saludo de
  Inicio.
  - Se usa `primary-strong` (#5C7A59) y **no** `primary` (#8BA888), que es el que
    llevaba Inicio. A 18 px el título no llega al umbral de "texto grande" de WCAG, así
    que le toca el 4,5:1 de texto normal: el salvia claro se queda en **2,44** sobre el
    crema y el oscuro da **4,48**. Sigue siendo el mismo verde de la familia.
  - Inicio cambia también, y eso arregla algo de paso: su saludo era el título más flojo
    de la app. Ahora las siete pantallas usan el mismo verde y el mismo contraste. Es
    justo el reparto que `architecture.md` ya describía —el claro para rellenos, el
    fuerte para texto—, aplicado ahora también a los títulos.

- **Icono nuevo de la app.** Pasa de una casa de trazo sobre la tarjeta crema a una
  casa clara maciza sobre el salvia de marca, con dos figuras abstractas dentro (verde
  oscuro y amarillo de familia). Cambian `src/app/icon.svg`, `scripts/gen-icons.cjs` y
  los cinco PNG generados. El `theme_color` del manifest y el `themeColor` de
  `layout.tsx` ya eran ese salvia, así que no hacía falta tocarlos.
  - `CACHE` sube a `nido-v2` en `public/sw.js`. `icon-192.png` e `icon-512.png` están en
    `PRECACHE`: al cambiar su contenido sin subir la versión, un móvil con la app ya
    instalada seguiría sirviendo el icono viejo hasta que la revalidación en segundo
    plano lo pillase.
  - El **porqué** del diseño no está escrito aquí: la decisión no salió de esta sesión.

- **El calendario se rediseña: agenda primero, mes como mapa.** En móvil abre en
  `Agenda` —una tira de siete días para navegar y, debajo, lo que pasa el día elegido
  con su hora y de quién es— y detrás los próximos días con algo. `Mes` es la otra
  pestaña y sirve de mapa: ver dónde hay algo e ir allí. En escritorio no hay pestañas,
  el mes va a la izquierda y la agenda a la derecha. Nada de la lógica de datos cambia:
  ni el CRUD, ni las recurrencias, ni las vacaciones, ni las tareas arrastradas a hoy,
  ni la asignación a personas.
  - **La celda del día es una sola y la comparten la tira y el mes** (`DayCell`), así
    que las dos dicen lo mismo de la misma forma. Se le quitaron los títulos de eventos
    (a 50 px de ancho salían como "09:0…"), el tooltip (única vía de leer el día, y no
    existe con el dedo) y tres de sus cuatro botones. Ahora es un botón que selecciona
    el día y su nombre accesible dice lo que hay en palabras: "lunes, 24 de agosto,
    2 planes, 1 tarea, de vacaciones".
  - **De paso arregla dos incumplimientos del mínimo de toque** que estaban ahí desde
    siempre y que la suite no veía porque los datos de demo no los pintan: la franja de
    vacaciones de la celda (3 px de alto) y el punto de descanso (10×10) eran botones.
    Las vacaciones pasan a señal y se editan desde `VacationLegend`, que gana `min-h-6`;
    los descansos se editan desde la agenda, donde ya salían. *(Las dos cosas cambiaron
    ese mismo día, más abajo: `Availability` sustituyó a `VacationLegend` y los descansos
    salieron de la agenda.)*
  - **La rejilla es de un solo mes.** Se dibuja por semanas completas —si no, las
    columnas dejarían de ser días de la semana— pero los huecos de las puntas van en
    blanco en vez de prestar días de los meses vecinos: agosto pintaba once días de
    julio y septiembre en gris, con la misma forma que los suyos, y se leían como días
    sueltos que no decían de qué mes eran. Se pierde tocar el 1 de septiembre desde
    agosto; se llega con la flecha, que es un toque igual. Con eso, `DayCell` se queda
    sin `isCurrentMonth`: ya no llega ningún día que haya que atenuar por ser de fuera.
  - **La tira marca el mes cuando cruza.** Al ser siete días rodantes, un tramo puede
    caer en dos meses y "30, 31, 1, 2" no dice dónde acaba uno. Solo entonces, el día 1
    lleva el mes en pequeño bajo el número; las otras seis columnas reservan el hueco
    vacío para no quedar más bajas. Va en `aria-hidden`, porque la etiqueta del botón ya
    trae la fecha entera.
  - **"Próximos días" va agrupado por tramos**: "Esta semana", "La semana que viene" y
    después uno por mes. Cerca se piensa en semanas y lejos en meses, que es como se
    habla en casa. La lista era plana de aquí a 45 días y el jueves que viene se leía
    igual que un cumpleaños de octubre; el chip de la fila dice "19 VIE" y no el mes, así
    que ni eso los separaba. Los tramos van respecto al día elegido y no respecto a hoy,
    porque el panel entero arranca ahí, y solo se pintan los que tienen algo dentro. El
    bloque pierde su título visible y gana `aria-label="Próximos días"`, que es lo que
    lo nombra para el lector de pantalla y el asidero de los tests: buscar "Esta semana"
    los habría roto los domingos, cuando ese tramo está vacío.
  - **`movil.spec.ts` gana un test para el modo Mes.** El bucle recorre cada ruta como
    se abre, y el calendario abre en agenda: la rejilla del mes —42 celdas en 390 px, lo
    más denso de la app— no llegaba a pintarse nunca.
  - **Se retira el eje de horas** (`DayTimeline`, `src/lib/timeline.ts` y sus 19 tests
    unitarios). En la estructura nueva no hay sitio para una tercera vista y el detalle
    del día se lee en lista. Lo que se pierde está escrito en `architecture.md`, en la
    decisión derogada.
  - **Dos tests de runtime cambian de forma, no de cobertura.** Las vacaciones se
    contaban por el `title` de la franja y ahora se cuentan por el nombre accesible del
    día, que es la vía que funciona con el dedo. Y el de la tarea diaria: al marcarla ya
    no "desaparece" —la agenda enseña también los próximos días—, así que ahora se
    comprueba que se muda de hoy a mañana, que es lo que de verdad hace.

- **Segunda pasada al calendario móvil: menos ruido en la celda y hoy como titular.**
  El rediseño de esa misma mañana dejó la estructura bien y la densidad a medias: la
  celda podía apilar tres puntos y dos rayas, y el bloque del día elegido pesaba lo
  mismo que los rótulos de los tramos. No cambia ninguna lógica de datos: ni eventos, ni
  recurrencias, ni vacaciones, ni tareas arrastradas, ni asignaciones.
  - **"Mañana" es un tramo propio.** Era la pregunta más frecuente después de "¿qué hay
    hoy?" y se leía igual que el sábado, metida dentro de "Esta semana". Solo sale cuando
    la agenda arranca hoy, así que nunca desordena los rótulos. La función de tramos sale
    del componente a `src/lib/agenda.ts` (`tramoDeAgenda`) con `hoy` como parámetro, y
    con ella llegan 7 unitarios en `e2e/unit/agenda.spec.ts`: un rótulo de fecha falla
    por un día de diferencia y eso no se ve en una captura.
  - **Dos filas de señal por celda como máximo**: hasta dos puntos —o el número, si son
    más— y **una** raya de ausencia. Eran tres puntos y hasta dos rayas: con la madre de
    vacaciones y el padre de descanso, un día pedía tres colores y dos filas para no
    decir más que "hoy falta gente", que es el resumen del día que la agenda vino a
    quitarle a la celda.
  - **La raya de ausencia no se pinta en gris cuando falta más de uno.** Se probó —el
    color ya no es de nadie en concreto— y se vio enseguida que partía la banda de una
    semana de vacaciones con un trozo gris el día que alguien descansaba, que se lee como
    que las vacaciones acaban ahí. Manda la de vacaciones, y la banda sigue.
  - **Hoy es el titular**: rótulo más grande que las versalitas de los tramos y aro verde
    en la tarjeta cuando el día elegido es hoy, el mismo idioma con el que Comidas marca
    hoy entre los siete días.
  - **Cada evento dice de quién es, siempre.** Lo que no es de nadie pone "Familia" en
    gris; antes se quedaba sin texto y solo lo decía el punto amarillo, justo lo que la
    app no quiere: saberse la paleta para entender a quién afecta algo.

- **Limpieza: fuera el código muerto del eje de horas y dos duplicados.** No cambia nada
  de lo que se ve ni de lo que se guarda; es deuda que dejaron los dos rediseños del
  24-08-2026.
  - **Restos del eje de horas.** `extractMinutes` en `date-utils.ts` y la sección
    "Agenda por horas" de `constants.ts` (`DURACION_SIN_HORA_FIN`, `HORAS_MINIMAS_AGENDA`)
    se quedaron sin nadie al retirar `DayTimeline`. Cero usos en `src/`, `e2e/` y
    `scripts/`.
  - **`runMutation` aprende a devolver.** Crear un evento o una serie devuelve lo creado
    —la vista salta a esa fecha—, y por eso los tres tenían copiado a mano el mismo
    `try/catch/finally` que `runMutation` ya encapsulaba. Ahora el motor es
    `runMutationWith<T>(acción, respaldo, mensaje)` y `runMutation` es su caso sin
    retorno. `createFamily` se queda fuera a propósito, y escrito en el código: no puede
    recargar al terminar, porque `switchFamily` ya cambia la familia activa y recargar
    ahí sería hacerlo con el `familyId` de la familia que acabas de dejar.
  - **`AssigneePicker`.** El bloque "Asignar a" estaba copiado letra por letra en
    `EventSheet` y `TaskSheet`; una fila de opciones duplicada es una fila que se cambia
    en un sitio y se olvida en el otro. El de Documentos no entra: allí es una fila de
    `SelectChip` con otra etiqueta y otro orden, y unirlos con una bandera se leería
    peor que las dos versiones.
  - **`SectionLink`, y el pie de Inicio deja de tener cinco versiones.** El enlace del
    pie —"Ver calendario", "Ver todas las tareas"— estaba escrito cinco veces con las
    mismas clases, y una de las cinco se había desviado: "Lo demás por hacer" iba en
    `text-primary-strong` y las otras cuatro en `text-primary`. Cinco copias son justo
    las que hacen falta para que una se quede atrás sin que nadie lo vea. Gana el
    `text-primary` de la mayoría, que es el enlace de la app. **Es el único cambio
    visible de toda la limpieza**, y es un tono de verde en un enlace.
  - Con él, `UpcomingEvents` y `TodayMeals` pasan por `HomeSection`, que ya existía y
    hace justo eso: tarjeta, vacío opcional y pie. Lo reimplementaban a mano mientras
    `HomeTasks` y `PendingItems` sí lo usaban. `TodayEvents` se queda con tarjeta propia
    a propósito: vive dentro del bloque del saludo, con otro fondo y otro redondeo.

- **Un descanso se ve desde la rejilla: el número del día va con el color de quien
  descansa.** Sale de un uso concreto —las abuelas—: si una no está el jueves, eso hay
  que verlo mirando el mes, sin abrir el día. La raya no daba para eso, porque desde el
  cambio de esta mañana sólo se pinta una por celda y manda la de vacaciones: un
  descanso dentro de las vacaciones de otro se quedaba sin ninguna señal.
  - **Círculo y no letra de color, y al 50 %.** La paleta va en dos bandas de claridad y
    `ColorPicker` ofrece las dos a cualquiera, así que la abuela puede tener "Champán
    dorado": escrito sobre blanco da 1,36:1 y no se lee. A color pleno se probó y gritaba
    más que "hoy" —una semana de descansos era una fila de círculos oscuros—, así que se
    bajó al 50 % el mismo día. La rebaja decide el color del número: mezclado con el
    fondo ningún color admite blanco (el peor, 1,17:1) y todos admiten tinta (el peor,
    Vino sobre el crema del hover, 5,26:1).
  - **Manda el día elegido, luego hoy, luego el descanso.** Los dos primeros dicen dónde
    estás y eso pesa más que quién falta; cuando tapan el color, la raya y `Availability`
    lo siguen contando. Las vacaciones no tocan el número: ya tienen la banda.
  - Lo comprueba un test de navegador nuevo que crea un descanso de dos días y mira el
    color exacto del segundo (el primero queda seleccionado al guardar). Un color se
    rompe sin que salte ningún test de estructura.

## Cerrado el 2026-08-21

- **Páginas legales: quién responde, y más fáciles de recorrer.** Privacidad decía
  "Responsable de Nido" y ahora dice quién es; términos añade la misma
  identificación, que antes solo estaba en privacidad. Y las dos ganan un índice de
  secciones con anclas y una línea de separación entre secciones, que se leían como un
  bloque corrido.
  - El índice sale de inspeccionar los hijos en `LegalShell` (`Children.toArray` +
    `isValidElement`), no de una lista por props: así las páginas no repiten su propia
    tabla de contenidos, que es justo el dato que se queda viejo al añadir una sección.
  - Los `id` salen de `normalizaParaBuscar` (`src/lib/text.ts`), que ya bajaba a
    minúsculas y quitaba tildes, para no tener dos formas de normalizar texto.
  - La línea la lleva cada sección con `first-of-type:border-t-0`: el párrafo de entrada
    es un `<p>`, así que la primera `<section>` sigue siendo la primera de su tipo y la
    cuenta sale sin pasar índices.

- **Paleta nueva: "Cocina de casa".** *(Revertida el 2026-08-24, junto con
  "Mediterráneo" que la sustituyó ese mismo día. Se queda escrito por lo que se aprendió
  midiendo, que está resumido en `architecture.md`.)* Crema `#F2E6D8`, tinta `#4A3728`, terracota de
  marca, oliva de segundo acento y amarillo `#C9A227`. El rojo de peligro se queda.
  Estructura de tokens intacta: solo cambian los valores.
  - **La terracota de marca no pudo ser la pedida.** `#B5651D` no llega a 4,5:1 en
    ninguno de sus dos papeles: 4,34 con blanco encima (`bg-primary text-white`, 12
    sitios) y 3,53 como texto sobre el crema (`text-primary`, 57 usos y mucho de 9-12
    px). Se usa `#A15408`, el más claro de ese mismo tono que cumple los dos: 5,55 y
    4,51. Son 6,6 puntos de L* más oscuro y se nota.
  - Las variantes se derivaron por búsqueda, no a ojo: para cada una se buscó la más
    clara de su familia que cumple su restricción. Así salieron `muted` (4,53 sobre
    `surface`, que era lo justo), `sand-strong` (4,56 sobre `bg-sand/30`) y
    `danger-strong`, que **sí** se ajustó aunque el rojo no: es una variante derivada y
    con el crema más oscuro el `#B24D4D` de antes se quedaba en 4,21.
  - Los neutros salen de la tinta y del crema, no de un gris: un gris neutro sobre
    fondo cálido se ve azulado.
  - De paso, seis colores de marca que vivían fuera del sistema: el `themeColor` de la
    PWA, el par crema/marrón de la tarjeta de calma en Inicio, el sage oscuro de los
    chips del login, y en el `<style>` del login el fondo del foco, el `rgba` del anillo
    (era el rgb del sage viejo) y la sombra de la tarjeta (el charcoal viejo).
  - Dos efectos colaterales, ya corregidos. `FAMILY_COLOR` era **exactamente** el token
    `sand` y al cambiar la paleta dejó de coincidir sin que nada avisara: pasa a
    `#C9A227`, con lo que sube de 1,36:1 a 1,97:1 sobre el crema y se separa del verde
    manzana de los niños de 13,9 a 19,0.
  - Y los colores claros de persona se perdían sobre el crema (rosa chicle 1,22:1). Se
    arregló con un aro `ring-ink/15` en los puntos del calendario, **no repintando la
    paleta**: repintarla no se podía. Con la escala por claridad (mujer clara, niña más
    clara), todo cálido, y la banda de niña oscurecida para verse, el rosa de niña se
    queda literalmente sin hueco: cae encima del rosa fuerte de mujer. La búsqueda dio
    cero candidatos. Un punto claro sobre fondo claro es un problema de borde, no de
    color, y así queda resuelto para cualquier paleta futura.
  - **Queda pendiente**: siete colores de persona están a menos de ΔE 15 de algún color
    de marca nuevo —ladrillo 13,0 y cuero 9,5 del terracota, oliva 8,3 del oliva de
    marca, rosa fuerte 11,6 y coral 11,8 del rojo de error—, porque la paleta de marca
    se ha metido en la misma banda cálida que la de personas. No se ha tocado: son
    papeles distintos (un punto de persona no compite con un botón), pero conviene
    mirarlo si algún día se ven juntos. Y el logo `src/app/icon.svg` sigue con la paleta
    vieja.

- **Escritorio en Tareas, Listas y Documentos.** Segunda tanda, con el mismo criterio
  que el piloto: todo desde `lg`, nada por debajo. Tareas en dos columnas, Listas en
  rejilla (dos desde `lg`, tres desde `xl`) con la lista abierta hasta 768 px, y
  Documentos en rejilla con los filtros sin arrastre. Home y Ajustes se quedan.
  - El patrón que salió de aquí y que conviene repetir: la rejilla va en el contenedor
    que ya existe y la cabecera ocupa la fila con `lg:col-span-2`, para no meter un div
    nuevo. Y hay que apagar el `space-y-*` con `lg:space-y-0`, porque el margen entre
    hermanos se suma al `gap` de la rejilla.
  - Se descartó la vista de dos paneles en Listas (índice a la izquierda, lista abierta
    a la derecha). No es CSS: `ListsView` devuelve un árbol distinto cuando hay lista
    seleccionada, así que sería reestructurar el componente y cambiar qué significa
    abrir una lista.
  - Nueve tests más en `escritorio.spec.ts`, y la mitad son del lado de 1023 px. La
    regla "ni una clase por debajo de `lg`" se comprobó además leyendo el diff: de las
    16 líneas de clases tocadas, ninguna perdió una clase base.

- **Layout de escritorio: barra lateral desde `lg`.** `BottomNav` se va con `lg:hidden` y
  entra `SideNav`, una columna de 224 px a la izquierda con las seis secciones más
  Ajustes. Por debajo de `lg` no cambia nada: lo único que se tocó fuera de `lg:` fueron
  comentarios.
  - Comidas ya tenía el tratamiento de escritorio que se pedía —rejilla de siete días
    desde `md`, con `WeekList` para el teléfono—, así que el trabajo real fue otro: con
    `SideNav` quitando 224 px, el mínimo de 860 px de `WeekGrid` dejaba de caber y la
    rejilla pasaba a arrastrarse en horizontal justo donde sobra sitio. Las columnas se
    aprietan en `lg` a 112 + 7×84 = 700 px y entran enteras.
  - Para poder apretarlas hubo que sacar `gridTemplateColumns` de un `style` en línea:
    un estilo en línea gana a cualquier clase y no admite variantes por ancho. El valor
    base de la clase es idéntico al de antes, y el test de 1023 px lo comprueba leyendo
    la primera columna (132 px, sin apretar).
  - `e2e/escritorio.spec.ts` es nuevo y son doce tests: la suite entera corría en un
    Pixel 7, así que nada vigilaba el layout ancho.
  - Quedan sin tocar Home, Tareas, Listas y Documentos: siguen siendo la columna de móvil
    centrada en escritorio. Era el piloto.

- **Unas vacaciones y un descanso se apuntan sin escribir título.** El tipo ya dice lo
  que son, así que pedir un nombre era pedir que alguien se inventara un texto para
  poder pulsar el botón. El campo sigue estando —"Playa con los abuelos" o "Turno de
  noche" valen la pena— pero es opcional, y el placeholder enseña con qué nombre se
  guardará si se deja vacío. La descripción ya era opcional y ahora lo dice.
  - `title` no es nullable en la base y hay sitios que lo enseñan (la franja del
    calendario, la etiqueta accesible del botón, el recordatorio diario), así que
    `eventTitleOr` en `src/lib/events.ts` lo rellena al guardar. Se rellena ahí a
    propósito, y no se deja vacío para que cada pantalla se invente su texto de reserva:
    eso es lo que dejó a Inicio sin la marca de los eventos de familia en su día.
  - Un plan sí sigue exigiendo título: "una cita" sin más no dice qué hay que hacer el
    jueves a las cinco.

- **La paleta de personas: diez colores cálidos, agrupados por a quién representan.**
  *(Superada el 24-08-2026: ahora son catorce y dos no son cálidos. Se queda escrito por
  los números, que explican de dónde vienen las bandas de claridad.)*
  Tres de hombre adulto, tres de mujer adulta, dos de niña y dos de niño. Se llegó aquí
  en tres pasos el mismo día, y los dos primeros están anotados porque explican los
  números.
  - **El punto de partida**: doce pasteles que no servían para distinguir a nadie.
    Dieciséis parejas por debajo de ΔE 20 (CIEDE2000) y la peor —lavanda y lila— en 5,3,
    con el umbral de "se nota" en 2. Cuatro de los doce eran rosas.
  - **La versión intermedia** estaba elegida para aguantar el daltonismo rojo-verde, y
    llegó a 18,4 de separación. Se descartó **por fría**: ese criterio obliga a repartir
    los tonos por todo el círculo, así que salían azules, verdes fríos y violetas, y una
    app de casa no se ve como una casa con eso. Queda escrito porque es la explicación de
    por qué la paleta de ahora separa menos.
  - **La de ahora** está en ΔE 12,3 en la peor pareja (rosa chicle y lila, las dos de
    niña): más del doble que el punto de partida, pero por debajo de la intermedia. Con
    daltonismo baja a 3,6, y eso ya no es un criterio: se retiró a propósito.
  - Cinco de los diez tienen que leerse como femeninos, así que caen en la misma banda de
    rosas y la separación sale de la claridad, no del tono: las mujeres en L* 64-70 y las
    niñas en 78-84. Las franjas esquivan L* 52-62, donde ni el blanco ni la tinta llegan
    a 4,5:1 encima del color y no cabe un grupo entero.
  - Dos cosas que salieron al medir y no se ven a ojo: el mostaza era **exactamente**
    `FAMILY_COLOR` y el verde salvia **exactamente** `--color-primary`, así que se podía
    elegir a mano el color que significa "de toda la familia" o el verde de la app. Los
    dos fuera desde entonces.
  - Once de los doce originales no aguantaban las iniciales blancas que la app les pone
    encima. Ahora **los diez pasan 4,5:1** (el peor, 5,39:1) porque la inicial ya no va en
    blanco a pelo: `textColorOn()` elige blanco o tinta según el fondo. De paso arregló
    sitios que no eran de la paleta: la etiqueta de "toda la familia" en Inicio y en
    Documentos iba en blanco sobre amarillo, a 1,67:1.
  - Se midió también si el amarillo `#E9C46A` era el mejor color para "toda la familia",
    y sí, con diferencia: está a 13,9 del color de persona más cercano de la paleta actual
    (34,1 de la intermedia), y todos los neutros que parecerían más lógicos —piedra, lino,
    gris, pizarra— son peores. Un gris tiene poca saturación y converge con los colores de
    persona en cuanto se pierde el tono. Sin cambios ahí.
  - El orden es el de los grupos, que es como se eligen. Tiene una consecuencia conocida:
    `defaultMemberColor` reparte por posición cuando nadie ha elegido, así que a los dos
    primeros adultos les tocan dos colores de hombre. Es un valor por defecto que se
    cambia de un toque, y la app no sabe de géneros: no hay campo para eso ni se añadió.
  - Los colores viven en la base como texto, así que nadie pierde el suyo: los existentes
    se quedan como están hasta que se cambien a mano.

- **Adultos sin cuenta (los abuelos)**: en Ajustes hay tres bloques —Adultos, Otros
  adultos e Hijos— y el de en medio permite dar de alta a alguien con un nombre y un
  color, sin correo y sin acceso a la app, solo para poder asignarle eventos, tareas
  y documentos.
  - Van en `children` con `kind = 'adulto'` (migración 018), no en `family_members`:
    esa tabla cuelga de `auth.users` con `user_id not null` y de ella depende toda la
    seguridad. El razonamiento completo, en «Decisiones de producto».
  - En «asignar a» salen con los adultos, no al final con los hijos: `splitPeople`
    en `src/lib/assignees.ts`.
  - El sheet lo dice en una línea, para que nadie espere una invitación: «No entra en
    la app ni recibe invitación».

- **Descansos familiares en el calendario**: se añade un tipo de evento `descanso`
  para marcar días de baja de un miembro o hijo, con una marca circular en la
  celda del calendario y sin saturar la vista. Las vacaciones siguen siendo una
  franja de varios días, y los descansos quedan como señal clara de
  disponibilidad.
  - La lógica vive en `src/lib/events.ts` y comparte la misma semántica que el
    resto de eventos: una persona descansa si el evento cubre ese día y la
    asignación coincide.
  - El formulario de eventos deja crear un descanso con un rango de fechas y la
    asignación correspondiente.
  - La comprobación de disponibilidad ya existe para saber si "puedes contar con
    esa persona" ese día.

## Cerrado el 2026-08-06

- **La semana del calendario pasa a ser el día por horas.** *(Superada el 24-08-2026: el rediseño del calendario retiró el eje de horas entero. Se queda escrito porque explica por qué existía y qué se pierde al quitarlo.)* Antes era una lista de
  siete días; ahora, con la semana plegada, se ve el día elegido sobre un eje de
  horas, con cada cita en su hora y con el alto de lo que dura. Es la vista "Día" de
  un calendario al uso. La de siete columnas se descartó a propósito: a 390 px cada
  columna son ~45 px y los bloques se quedan sin texto, que es también por lo que
  Google no la pone por defecto en el móvil.
  - La aritmética (colocar, medir, repartir los solapados y recortar el eje) vive en
    `src/lib/timeline.ts`, sin React y con 19 tests en `e2e/unit/timeline.spec.ts`.
  - Dos decisiones que los datos no traían: un evento **sin hora de fin** se dibuja
    con 45 min (`DURACION_SIN_HORA_FIN`), y las **tareas**, que vencen pero no
    ocurren a una hora, van en la franja de "todo el día" junto a los eventos de todo
    el día. Las vacaciones siguen fuera, en la franja de la rejilla.
  - El eje **se recorta a las horas que tienen algo**, con una hora de margen y un
    suelo de seis (`HORAS_MINIMAS_AGENDA`): un día de dos citas no es medio metro de
    blanco. La raya de la hora actual va por debajo de los bloques, que si no tachaba
    los títulos.
  - `AgendaList` pierde el modo semana y se queda con lo suyo: **los próximos
    eventos** (con el mes desplegado) y **los resultados de una búsqueda**, que
    atraviesa el calendario entero y no cabe en un día. Las tareas de un día salieron
    a `DayTasks`, que usan las dos vistas.

- **La agenda del calendario, repasada en móvil.** Se revisó a 390 px con la app
  abierta, no leyendo el código, y salieron cuatro cosas:
  - **La tira y la lista enseñaban semanas distintas.** Arriba, la semana natural del
    día elegido (3→9); abajo, siete días desde hoy y en realidad ocho (6→13). Las
    flechas movían solo la de arriba. Ahora las dos comparten un único tramo rodante
    de siete días, `inicioSemana` en `CalendarView`, que empieza hoy porque es donde
    cae lo atrasado. La cabecera de la rejilla dejó de ser fija: si el tramo abre en
    jueves, la primera columna es J.
  - **El calendario abría enseñando tareas.** Ver "Lo atrasado se arrastra al día de
    hoy" en `architecture.md`: desde tres tareas en un día van plegadas bajo un
    resumen que dice cuántas hay y cuántas van tarde.
  - **El nombre de quien lleva la tarea se comía el título.** No cedía nunca y el
    título cedía siempre. Ahora tiene tope de ancho y se recorta él primero.
  - **Menos mueble antes del primer plan**: la cabecera de la agenda pasó de dos
    líneas a una, y un día sin nada ocupa menos alto que uno lleno.

  De paso, apuntar un evento fuera de la semana visible vuelve a llevar la vista a su
  día: al compartir tramo, `handleCreate` tenía que mover también la tira.

## Cerrado el 2026-08-05

- **Fase 2 del roadmap (QA visual) hecha** a 390×844, que es más estrecho que el
  Pixel 7 con el que corre el resto de la suite. Nueve pantallas revisadas una a
  una. Salieron y se arreglaron: un color repetido entre un adulto y un hijo,
  títulos de tarea comidos por las etiquetas, un "Sin planes" en un día que sí
  tenía tareas y cinco controles por debajo del mínimo de toque. Lo que se puede
  comprobar sin teléfono queda fijo en `e2e/movil.spec.ts`.
- **Probada en un móvil real, sin incidencias.** Es lo que la suite no puede ver: corre
  sobre un Pixel 7 *emulado*, y una emulación no tiene teclado que se abra encima de un
  sheet ni scroll con inercia.
- Migraciones 015 (tareas con dueño) y 016 (caducidad de documentos) aplicadas en producción.
- Búsqueda en tareas, documentos y calendario.
- Deshacer una tarea marcada sin querer, y lo atrasado arrastrado al día de hoy.
- `safeNextPath` cierra el salto a otra web desde el enlace del correo, y
  `next.config.ts` añade cabeceras de seguridad.
- `scripts/gen-vapid.cjs` para generar las claves de push sin tener que recordar el comando.
- Repaso del camino de las notificaciones, que nunca se había ejecutado: el emisor ya
  cuenta y registra los envíos fallidos en vez de tragárselos (un `sent: 0` significaba
  a la vez "día tranquilo" y "falló todo"), no cuenta las vacaciones como evento del
  día, y la tarjeta de Ajustes explica en iPhone que hay que instalar la app en vez de
  decir que el navegador no admite avisos.
- `EventSheet` despiezado en cuatro.
- `supabase/validate_rls.sql` borrado. Hacía lo mismo que `scripts/validate-rls.mjs`
  pero peor: simulaba a los usuarios con `SET LOCAL ROLE` y claims de JWT inventadas
  en vez de autenticarlos de verdad, y obligaba a sustituir placeholders a mano.
- `all_in_one.sql` pasa a generarse (`scripts/gen-all-in-one.mjs`). Se mantenía a
  mano, que es la manera de que un día deje de coincidir con las migraciones sin que
  nadie se entere. El fichero generado es SQL-idéntico al que había.

## Cerrado el 2026-08-04

- `CRON_SECRET` configurada en Vercel: `/api/cron/reminders` responde 200 con
  `keptAlive: true`, así que el keep-alive de Supabase ya funciona.
- Migraciones 012 y 013 confirmadas en la base de producción.
- Cambio de contraseña dentro de la app: existe en `AccountActions.tsx` (cerraba el
  hueco de las personas invitadas, que entran sin contraseña).
- Páginas `/privacidad` y `/terminos` con `cerredax@gmail.com` como contacto público.
- **Invitación de punta a punta probada con éxito** en producción: el correo llega, el
  enlace da de alta en la familia y la persona ve los datos.
- Migración 014 verificada en la base real (ver "Estado Supabase").
- Bug de zona horaria corregido, código y datos: los eventos se guardaban bien pero se
  leían en UTC, y el error se acumulaba en cada edición. Las horas que habían quedado
  desplazadas ya están corregidas en producción.

