# Estado del proyecto

Última revisión: 2026-09-30.

Este documento cuenta **cómo está** Farpi y **qué falta**. El relato de cada cierre (qué estaba
mal, qué se decidió, qué se descartó) vive en el **cuerpo de su commit** (`git log`), y el porqué
de las decisiones técnicas y de producto, en `docs/architecture.md`. Aquí solo lo que sigue
siendo verdad hoy.

## Resumen

Farpi está en producción (`https://www.farpi.app`), en uso diario por la familia y probada en un
móvil real (Android, 05-08-2026). Supabase está conectado de extremo a extremo: autenticación,
repositorios reales, `StoreProvider` async, onboarding e invitaciones por magic link. Los archivos
de los documentos no los guarda Farpi: viven en el Google Drive de quien los sube, y la familia
los ve igual sin conectar nada. La UI consume la frontera de repositorios y elige implementación
real o mock según `IS_DEMO_MODE`; el modo demo sigue funcionando como fallback y como entorno de
pruebas (e2e).

La base está validada con `node scripts/validate-rls.mjs`: **206/206** (30-09-2026). **Lo que queda
no es código de producto**: pruebas que piden un aparato delante, decisiones sin tomar,
funcionalidades que no existen y los pasos de Google Play. La lista entera, en «Siguiente paso
recomendado».

## Implementado

### Pantallas

- **Inicio**: la tarjeta del día (saludo, cumpleaños, planes, tareas y menú de hoy), el aviso de
  papeles que caducan y lo que viene en tres cajas: «Mañana», «Próximos días» (lo que queda de
  la semana, hasta el domingo) y «Próxima semana». Cada día es un bloque con su rótulo. Los planes
  que ya han pasado se atenúan y el siguiente lleva su hora en verde. Las tareas de hoy tienen
  tope de cuatro y cada una dice desde cuándo está atrasada; lo atrasado se arrastra a hoy. Tocar
  un plan lo abre en edición. «Listas de casa» va por cestas y su `+` apunta en la que más pendiente
  tiene. En escritorio las tres cajas van juntas en una columna. La cabecera dice «Inicio».
- **Calendario**: eventos, series (semanales, anuales y cada dos semanas, con o sin fecha de fin),
  vacaciones y descansos como franja, festivos y cumpleaños. Vistas Mes, Semana, Día y Agenda
  (por días o por persona). Elegir un día del mes enseña qué hay ese día y ofrece apuntar ahí.
  En móvil se pasa de mes o de día con el dedo y aparece «Hoy» cuando lo mirado no contiene hoy.
  - **Hoy es la celda entera en azul claro** y el mismo azul en agenda, panel del día y cabecera
    de Día y Semana; el día elegido lleva un aro verde. Lo que ya ha pasado se ve más apagado
    (`eventoYaPasado`, en `lib/events.ts`); vacaciones, descansos y festivos no se apagan.
  - **En móvil, el mes es un mapa limpio**: una marca por persona y clase (círculo los planes,
    cuadrado las tareas), ausencias como línea fina y debajo solo el panel del día elegido más
    «Ver todo lo que viene». En escritorio el mes se lleva el ancho (con la agenda al lado desde
    1400 px) y la celda dice la hora de cada cosa.
  - «Vacaciones y descansos» va por personas y plegado; «Cumpleaños» también, con número en el
    título. Si no queda nadie disponible, el día lleva una sola franja amarilla.
  - Pulsar un hueco del eje en Día y Semana abre el alta con esa hora; doble clic en el mes o en la
    fecha de la agenda abre el alta de ese día.
  - Un plan con hora puede pedir **aviso antes** («30 minutos antes», ver Notificaciones).
- **Tareas**: recurrencia, prioridad, dueño (un adulto o un hijo), quién la marcó y filtro por
  persona. El vencimiento es solo el campo de fecha. Buscar enseña también las completadas. Una
  tarea que no se guarda no se pierde: el formulario espera y se queda abierto.
- **Listas**: lo que falta arriba y lo ya comprado debajo como catálogo (se vuelve a pedir con un
  `+`, no con un tic). Se apunta escribiendo al pie, con sugerencias del historial; el sheet sirve
  para editar y para apuntar desde Inicio. La fila solo tiene marcar y unidades; mover y borrar
  están en el sheet. Se puede compartir lo pendiente con el diálogo del sistema.
  El sheet de apuntar tiene **dictado por voz** (`useDictado`, `src/lib/dictado.ts`): «leche, pan y
  huevos» sale como tres ítems, que se enseñan antes de guardar. Usa el reconocimiento del navegador
  (en Chrome lo transcribe Google, y `/privacidad` lo dice) y por eso `Permissions-Policy` abre el
  micrófono a `self`. **Sin probar en un móvil real ni en la TWA de Google Play.** Solo la compra;
  las tareas no tienen dictado.
- **Comidas**: día y semana, copiar día, y cinco franjas que se activan por familia en Ajustes
  (apagar una no borra lo apuntado). `Comedor` entra apagado. Comida y comedor llevan primero,
  segundo y postre. En móvil se pasa de semana. En escritorio una semana vacía solo enseña
  «Añadir» el día de hoy.
- **Documentos**: subir, abrir, editar y borrar, con aviso de caducidad. Once categorías
  (`DOC_CATEGORIES`, con su emoji); el filtro solo ofrece las que tienen papeles y enseña cuatro
  más «+N más». El sheet espera a que el archivo haya subido y conserva el borrador si falla. Una
  ficha sin dueño lo dice. El archivo sale con su extensión.
- **Notas**: título, texto libre, emoji y fijar arriba; se leen enteras en la tarjeta y se copian
  desde su formulario. No salen en Inicio. Es texto plano protegido solo por la RLS (la
  política de privacidad avisa de que Farpi no es un gestor de contraseñas).
- **Cumpleaños** (`/birthdays`, en «Más»): los doce meses que vienen, repartidos por meses y con
  buscador; junta los de casa (de su fecha de nacimiento) y los apuntados. Las filas se tocan y
  editar una serie anual edita la serie entera.
- **Finanzas** (`/finances`, en «Más»): cuatro pestañas, **«Este mes», «Estadísticas», «Fijos» y
  «Presupuestos»**, con el dinero en céntimos enteros y siempre positivos (el `kind` separa
  gasto de ingreso). No hay saldos entre adultos ni conexión con ningún banco.
  - **Este mes**: la cuenta (fijos que entran y salen, «para el mes», lo apuntado y cuánto
    queda), las partidas plegadas («quedan 355 €») y el día a día por días, con buscador en todos
    los meses y sugerencias de lo que la casa apunta a menudo. Cada mes enseña lo que valía
    entonces: el mes en curso refleja la plantilla (con el ajuste de ese mes si lo hay) y un mes
    cerrado enseña su copia congelada. Lo congelado es el plan, no el día a día: en un mes
    cerrado se apunta pero no se editan fijos ni partidas. El cierre lo hacen el cron diario y
    la app al arrancar, y se puede adelantar a mano. Un mes pasado se puede poner a cero, y los
    apuntes de un mes se pueden borrar de una vez.
  - **Estadísticas**: siete bloques (tres del año natural, el ritmo del mes, los meses, el
    desglose y cada 100 € que entran), todo SVG a mano, sin librerías.
  - **Fijos**: la plantilla de lo que entra y sale todos los meses, y las partidas. «Entra» es
    azul en los gráficos.
  - **Presupuestos** (Beta): los que te pasan de fuera, agrupados por para qué son.
  - **Importar el extracto** (`/finances/importar`, Beta): Norma 43, `.txt` del Sabadell o Excel del
    BBVA, leído en el navegador. Nada entra sin confirmarlo; de la cuenta solo se guardan los
    cuatro últimos dígitos.
- **Ajustes**: familia (miembros, invitaciones, hijos y adultos sin cuenta, roles, cerrar una
  familia), casa (franjas de comida), cuenta (contraseña, copia de seguridad, borrar cuenta),
  sincronización (Drive y avisos) y legal. En móvil es un índice de filas; en escritorio,
  pestañas de pie. **Solo ofrece lo que puedes hacer**: lo de administrador no se enseña a un
  `member`. Cerrar sesión deja en la portada.
- **Navegación**: `BottomNav` en móvil con «Más» (Cumpleaños, Notas, Finanzas, Documentos,
  Ajustes y cerrar sesión) y `SideNav` desde `lg:`. El `+` de alta vive en `ViewHeader` en las seis
  pantallas de contenido.
- Guardar confirma («Guardado»), borrar desde una fila pide un segundo toque, cuatro borrados
  preguntan en un diálogo (lista, partida, persona, familia) y se puede deshacer marcar un ítem y
  eliminar una tarea, una nota o un ítem. Lo que apunta otra persona se ve sin recargar.
- Los estados vacíos son el emoji y el título, sin párrafos de manual.

### Portada, acceso y marca

- **`/` pública** (`LandingPage.tsx`): titular con el formulario de acceso al lado, el texto de
  Omar contado como reportaje, tres capturas y seis preguntas, y «Próximamente en Google Play»
  sin enlace. Los textos, en `src/components/landing/textos.ts`. El formulario es el mismo
  `AuthCard` que usa `/auth/login`; no hay copia.
- **Las capturas salen de la app de verdad**: `node scripts/gen-capturas.mjs` las genera contra el
  modo demo con el reloj congelado en el 17-06-2026 (nueve capturas y `public/og.png`; la portada
  usa tres, las otras van a la ficha de Play). Se importan en vez de pedirse por ruta (la caché de
  imágenes de Next no se entera si no). **Si se regeneran, se revisan las notas de `textos.ts`**,
  que citan lo que se ve. Regeneradas el 30-09-2026 tras los cambios del calendario.
- **El texto de Omar lo escribió él**: no se «mejora la redacción» y una traducción la tiene que dar
  por buena él. Va sin caja, sin firma y sin foto.
- **Reglas de contenido**: se dice «casa» y no «hogar» (la marca es «¿Qué tenemos que saber hoy en
  casa?»); los textos no llevan guion largo; los datos de demo son los de una casa (Carlos, María y
  su hija Cris), las listas son de cosas y no de tareas, y lo que crea un test no puede llamarse
  como algo de la demo.
- Páginas públicas `/privacidad`, `/terminos` y `/borrar-cuenta`, actualizadas el 30-09-2026 (las
  fichas de documentos que quedan sin archivo al borrar una cuenta, el correo de las invitaciones,
  los cuatro últimos dígitos del extracto, Gmail como proveedor de correo y los avisos).
- El enlace se ve al compartirlo (`openGraph` y `twitter`, con `metadataBase` de `SITE_URL`).
- El botón «Continuar con Google» usa la paleta de Google al pasar el ratón; es el único azul de
  la app fuera de «hoy» en el calendario y de los gráficos, y va literal a propósito. No se ve en
  modo demo.

### Conexión Supabase y backend

- Auth real (login, registro, recuperar contraseña, cerrar sesión), repositorios reales en
  `src/lib/supabase-repos/` y mock en `src/lib/mock-repos.ts` tras `src/lib/repos/types.ts`;
  onboarding (`create_family_with_admin`), invitaciones por magic link (`/api/invite`, con tope de
  diez en 24 h y caducidad de 30 días) y aceptación automática (`accept_family_invite`). Al abrir
  una invitación hay que pulsar «Entrar» con el correo a la vista.
- **`supabase/schema.sql` es el esquema y lo único que hay**: un solo archivo con la base como
  está, aplicado en el proyecto real. El trozo suelto que se pega en el SQL Editor sale de
  `git diff supabase/schema.sql` y no se guarda. Un backfill de datos, si hiciera falta, iría a
  `supabase/datos/` con su fecha. La base y el archivo divergen en tres índices que se quitaron
  del archivo y no de la base (el `drop` está al final del bloque de índices).
- **Documentos en Google Drive**: subida directa del navegador por sesión reanudable, lectura por
  proxy (`/api/documents/[id]/file`) con el token del dueño, y tokens cifrados (AES-256-GCM) en
  `storage_connections`, con RLS y sin policies. El bucket `documents` se borró.
- **Regla del último admin**: una familia siempre tiene al menos un admin. La validan las RPCs
  `remove_family_member` y `update_family_member_role` y `/api/account/delete`; la UI solo la
  refuerza. `family_members` solo tiene policy de `select`: entrar, cambiar un rol y echar a
  alguien pasan por RPC.
- Adultos sin cuenta (abuelos) viven en `children` con `kind = 'adulto'`.
- **Cuando Supabase no contesta, la app lo dice**: `getUser()` tiene cinco segundos; las páginas
  públicas se sirven, las rutas API dan 503 con JSON y el resto enseña `/no-disponible`.
  **`/api/salud`** mide las dos mitades de Supabase (200 o 503) y está vigilada desde UptimeRobot
  cada cinco minutos, contra el `www`.
- **PWA**: iconos `any` y `maskable`, `manifest.json` (con `id`, `scope`, `lang`, categorías y
  capturas) y `public/sw.js` con fallback `/offline`. Dos cachés (`farpi-paginas-v2` y
  `farpi-estaticos-v2`); cerrar sesión vacía la de páginas; solo se cachean navegaciones que
  salieron bien. Se prueba contra `npm run start`.
- **Notificaciones**: resumen de las siete (planes, tareas pendientes, cumpleaños de hoy y de
  mañana, papeles por caducar) y **aviso de cada evento**, cuyo disparador es un job de `pg_cron`
  en Supabase cada cinco minutos (programado el 30-09-2026; primera ejecución, 200). Los avisos se
  reparan al abrir la app y se van al cerrar sesión. Inicio ofrece activarlos con un toque
  mientras el navegador no haya preguntado nunca (`ActivarAvisos`). Detalle en
  `docs/notificaciones.md`.
- **Copia de seguridad** (Ajustes → Cuenta): un JSON con todo lo de la casa, sin los archivos de los
  documentos. No hay restaurar.

### Calidad, accesibilidad y pruebas

- **1044 tests con el runner de Playwright** (único runner): **786 unitarios** de lógica pura en
  `e2e/unit/` (`npm run test:unit`) y **258 de navegador**; 13 de ellos, los del recorrido de
  idioma, van en `fixme` hasta que se migren sus pantallas. Este es el **único** sitio con el recuento
  exacto. Los de navegador son `smoke.spec.ts`, `runtime.spec.ts` (falla ante cualquier
  `console.error`), `movil.spec.ts` (390×844), `escritorio.spec.ts` (1440 y 1023 px) y el
  recorrido de idioma. `npm run test:e2e` los corre todos levantando el dev server en :3100.
  Última pasada completa: 1031 pasan, 13 saltados, 0 fallos (30-09-2026).
- **Contraste medido y AA**: quedan 6 avisos deliberados (días fuera de mes del calendario y el `·`
  de `Garantias`). Reglas: el verde de marca no es color de texto (`primary-strong`), `faint` y
  `muted-soft` son para decoración, el color de una persona va de fondo y el nombre en tinta
  (`.etiqueta-persona`) y el rojo relleno con texto blanco es `danger-strong`.
- **Ningún control baja de 44×44 px**, también dentro de los sheets (se abren uno a uno en
  `e2e/movil.spec.ts`); el suelo duro es 24 px (WCAG 2.5.8). Única excepción: el correo inline del
  texto de Omar.
- Foco de teclado propio (`:focus-visible` en `primary-strong`), sheets que atrapan y devuelven el
  foco, regiones de aviso siempre en el DOM, errores de escritura en castellano
  (`src/lib/errores.ts`) y ningún botón de guardar nace apagado por un campo vacío.
- Carga inicial con la app apagada (`CargandoFarpi.tsx`).
- Código compartido: constantes, validadores, fechas, selectores, recurrencia, `BottomSheet` con
  `useSheetForm`/`useSheetDelete`, paleta tokenizada en `globals.css` y vistas grandes despiezadas
  en hooks y componentes.
- **La app en otro idioma**: el diccionario está en `src/lib/i18n/` y el idioma es del dispositivo
  (cookie `farpi_idioma`). Traducido: navegación, aviso de guardado, arranque, marco de Ajustes,
  validadores, errores de Supabase, Listas, Comidas, el acceso y las pantallas de fallo. El inglés
  no se ofrece hasta que esté todo (`IDIOMAS_OFRECIDOS`).
- `scripts/validate-rls.mjs`: validación de RLS, RPCs e integridad contra el Supabase real.

### Rendimiento

- **Invalidación por porción en el store**: cada escritura declara qué datos toca y solo se
  recargan esos (`runMutation(accion, ['tasks'])`). Dos escrituras recargan todo a propósito
  (borrar un hijo y echar a un miembro). Sin declarar nada se recarga todo.
- **Pendiente a propósito**: los getters no tienen ventana temporal (`expenses` es la tabla que
  más crece, ~1.000 filas al año, y varias cosas necesitan la historia entera) y no hay
  actualización optimista en los dos gestos más frecuentes. **Umbral escrito: revisarlo al pasar
  de ~3.000 apuntes.**

### Seguridad

- RLS por familia con `my_family_ids()` (`security definer`, `search_path` fijo); lo que no se
  hace con policies va por RPC. `documents` tiene cuatro policies y un trigger
  (`trg_document_storage_inmutable`) que impide reescribir `storage_owner`, `storage_path` y
  `family_id`.
- Siete cabeceras de seguridad en `next.config.ts` (CSP con `'unsafe-inline'` en scripts porque Next
  los inyecta, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y COOP) y
  corte del build si producción arranca en modo demo.
- Rutas API: el motivo del fallo va al log y la respuesta es genérica; 503 sin
  `SUPABASE_SERVICE_ROLE_KEY`; origen propio exigido en las que escriben (`deOtroSitio`);
  `CRON_SECRET` comparado en tiempo constante; `/api/push` solo acepta los cuatro servidores de
  push que existen.
- El tope de invitaciones se cuenta en `invite_sends` (RLS sin policies, solo la service role).
  `?next=` pasa por `safeNextPath`. El callback no muestra el texto que trae un enlace con error.
  Las RPCs de meses rechazan una familia nula.
- **Next.js 16.3.6**; `npm audit` a cero (30-09-2026).
- **Abierto a propósito** (decisiones de producto o no compensan): el registro sigue abierto a
  cualquiera; `/api/invite` distingue por código de respuesta si un correo ya tiene cuenta; borrar
  la cuenta no vuelve a pedir la contraseña; los avisos push enseñan el título de los planes con el
  móvil bloqueado; dos admins que se quiten el rol a la vez podrían dejar la familia sin ninguno; y
  `/api/push` no limita cuántas suscripciones tiene una persona. Sin revisar desde el código: los
  ajustes del panel de Supabase que no son públicos y los de Vercel.

### Validación Supabase

Sin pendientes. Última pasada: **206/206** (30-09-2026), con el aviso de cada evento
(`events.remind_before_minutes` y `event_reminders_sent`). Las pasadas anteriores, una a una y con
lo que cada comprobación protege, están en `docs/supabase-validation.md`, que es donde vive el
detalle. Local y producción son el **mismo** proyecto Supabase. No se documentan URLs privadas,
claves ni secretos en el repositorio.

## Siguiente paso recomendado

La app está en producción y en uso diario por la familia. **No queda código de producto
pendiente.** Esta es la lista entera y no hay otra; el porqué de cada decisión, en
`docs/architecture.md`.

### Para retomar (lista de trabajo)

En orden. Lo de abajo explica cada punto.

0. **Probar el aviso de cada evento de punta a punta.** El job de `pg_cron` ya está programado y
   contestó 200; falta ver llegar un aviso: con los avisos activados en un móvil, apuntar un plan
   que empiece dentro de 20 minutos con «15 minutos antes».
1. **Smoke con una cuenta nueva en `www.farpi.app`** (`docs/produccion.md`, §5): registro con un
   correo nuevo, confirmación por email, crear familia, crear un evento, invitar a una segunda
   persona y cerrar sesión. La última pasada entera fue el 15-09-2026 y la de una cuenta nueva no
   consta nunca.
2. **Comprobar el cron de las siete** en los logs de Vercel (`/api/cron/reminders`): uno de los dos
   de cada mañana tiene que decir `fueraDeHora: true` y el otro traer `sent`.
3. **Probar en el móvil que los avisos se reparan solos** (`docs/notificaciones.md`, «Que no haya
   que volver a activarlas»): borrar la fila de `push_subscriptions` y abrir la app, y tiene que
   volver; cerrar sesión, y tiene que irse.
4. **Firewall**: mirar en Vercel → Firewall si la regla «Limite API» (modo `log`) salta con el uso
   normal; si no, pasarla a 429 (el comando está en `docs/produccion.md`).
5. **El botón atrás de Android**: en una TWA sale de la app, y el código no tiene URL ni `popstate`
   en los formularios. Probarlo en un aparato antes de subir a Play.
6. **Google Play**, siguiendo `docs/play-store.md`: cuenta de desarrollador, Bubblewrap con
   `farpi.app`, subir a prueba cerrada, la huella SHA-256 → `public/.well-known/assetlinks.json`
   (hoy da 404, como es esperable), la ficha (falta el gráfico de 1024×500), una cuenta de
   revisión en la base real (y borrarla después) y **12 testers durante 14 días**.
7. Sin prisa: reglas por comercio al importar (quitarían la Beta), el mes fantasma por la app, una
   sección de ayuda y un `robots.txt`.

### 1. Hay que tener un aparato delante

Es lo único que no ve ninguna herramienta.

- **Safari de iOS**: el teclado, el `100vh` y la safe-area se comportan distinto que en Android.
- **La PWA instalada**: icono, splash, el notch y la barra de abajo.
- **El flujo de documentos con dos cuentas** (`docs/testing-checklist.md` §8.1): que A suba un
  papel a su Drive y B lo abra sin conectar nada.

### 2. Decisión sin tomar

- **Google Play (TWA)**: el package name es **`farpi.app`** (irreversible al publicar). Lo del
  repositorio está hecho (`manifest.json`, `/borrar-cuenta`, `/.well-known/` fuera del proxy, la
  guía). Falta lo que no vive aquí: cuenta, Bubblewrap, huella de la firma, ficha y prueba cerrada.
- **La portada en inglés**: preparada y sin traducir (`textos.ts` obliga a traducirlos todos).
  Va después de la app en inglés, y el texto de Omar lo tiene que dar por bueno él.
- **La app en inglés**: faltan Calendario, Tareas, Finanzas, Notas, Documentos, Cumpleaños, el
  interior de Ajustes e Inicio (`e2e/idioma-recorrido.spec.ts` los lista en `SIN_MIGRAR`). Antes de
  ofrecerlo hay que decidir lo que no es traducir: el aviso de las siete y los correos no saben el
  idioma de cada móvil, las RPC lanzan frases en castellano y el dinero se escribe a la española.

### 3. Funcionalidad que no existe

- **Presupuestos e Importar el extracto** salen como «Beta» (`BetaBadge`); quitar la pastilla es
  darlos por cerrados, y el candidato son las reglas por comercio.
- **Reglas por comercio al importar**: hoy la partida se propone solo si el concepto del banco
  nombra a la partida. Pide una tabla nueva, así que se decide aparte.
- **Una sección de ayuda**, contrapartida de haber vaciado los estados vacíos de manual.
- **Dar salida por la app a un mes fantasma**: hoy un mes cerrado y vacío solo se recupera por el
  SQL Editor. Sería una RPC nueva y, detrás, `validate-rls.mjs` y `supabase-validation.md`.

### 4. Candidatos de la revisión del 30-09-2026

Ninguno está decidido; en este orden de lo que más se nota:

- **Escribir sin conexión**: no hay cola de cambios (lo más caro y lo que menos urge).
- **Modo oscuro**: no hay ni `dark:` ni `prefers-color-scheme`; cambia el diseño de forma amplia y
  obligaría a repetir la medida de contraste.
- **Avisos**: no se elige qué tipos recibir, ni se avisa de lo que añade otro miembro, ni hay aviso
  por tarea.
- **Refrescar solas Finanzas, Documentos y Ajustes** (hoy solo `PORCIONES_DEL_DIA`).
- **Deshacer un evento eliminado**, y que el resto de sheets no se cierren antes de saber si
  guardó, como ya hace el de tareas.
- **Repetición mensual de eventos**, una serie de verdad sin fin y avisar al editar de que el
  evento es de una serie.
- **Comidas**: pasar los ingredientes a la lista de la compra y copiar una semana entera.
- **Búsqueda global** (cada pantalla tiene la suya, y solo con tres o más elementos).
- **Invitar con un enlace o por WhatsApp** y **restaurar** la copia de seguridad.
- **Finanzas**: la foto del ticket, el día de cargo de un fijo y exportar a CSV.
- **Notas y documentos**: casillas y fotos en una nota; varios archivos por documento y un almacén
  que no sea Drive.
- **Quién hizo una tarea que se repite**: al completarla solo se mueve la fecha.

### 5. Acabados de Finanzas

- **La rejilla de iconos de un fijo va con un hueco**: son 23 y la última fila lleva siete.
  Mejor candidato, 🦷.
- **🏛️ y 🏦 se parecen** en la tipografía de Android; están separados en la rejilla para que no se
  comparen de un vistazo, pero el problema sigue ahí.

### Lo que no hay que hacer

- **Telemetría de errores del cliente**: es una app familiar con DNI e informes médicos dentro;
  mandar trazas a un tercero cuesta más de lo que resuelve.
- **Volver a numerar migraciones**: sin un runner que apunte cuáles se aplicaron es una lista que
  hay que creerse, y aquí el SQL se pega a mano. La regla está en `CLAUDE.md`.

## Historial

Los trabajos ya cerrados, con su porqué, están en los cuerpos de los commits (`git log`). No hay un
documento de historial: tenerlo era contar dos veces lo mismo, y la copia era la que se quedaba
vieja.
