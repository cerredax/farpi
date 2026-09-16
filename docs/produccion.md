# Puesta en producción

Estado y pasos para llevar Farpi a producción en Vercel + Supabase. Marca las casillas a medida que las completes.

> Última actualización: 2026-09-15.

## 0. El cambio de nombre a Farpi

La app pasó a llamarse **Farpi** el 31-08-2026. El código y los papeles ya lo dicen. Lo
que no es código va por su cuenta, y cada línea tiene su propio riesgo:

- [x] **Proyecto de Vercel** y **proyecto de Supabase**: renombrados (31-08-2026).
- [x] **Carpeta de Google Drive**: renombrada a «Farpi» a mano (31-08-2026). Se renombró,
      **no se borró**, que es la diferencia entre no pasar nada y perderlo todo: los
      documentos de Farpi *son* los archivos de esa carpeta —en la base solo está la
      ficha—, y Drive identifica carpetas y archivos por id, no por nombre. Al renombrar,
      el id no cambia, el `folder_ref` cacheado en `storage_connections` sigue valiendo y
      los documentos se siguen abriendo.
- [x] **Repositorio de GitHub**: renombrado a `cerredax/farpi` (31-08-2026), y el remoto
      local apuntado al nombre nuevo. GitHub deja redirección permanente desde el viejo, y
      **por eso mismo** había que actualizar el remoto: si no, todo sigue funcionando y te
      quedas años apuntando a un nombre que ya no existe sin enterarte. Queda comprobar
      que Vercel sigue viendo el repositorio (Settings → Git) en el próximo despliegue.
- [x] **Dominio**: `www.farpi.app` sirviendo desde el **15-09-2026**, con el ápice
      redirigido a él con un 308. Los cinco sitios de abajo dicen ya lo mismo y las tres
      pruebas del final pasan. Registrado el 31-08-2026.

      **Un solo host, y estricto.** La cookie de estado del OAuth de Drive se pone
      *host-only* (`start/route.ts` no le da atributo `domain`), así que una cookie de
      `www.farpi.app` **no viaja a `farpi.app`**. Si el flujo empieza en un host y vuelve
      al otro, la conexión con Drive falla con «estado no válido» y no hay nada en los
      logs que lo explique. Por eso todo —variables, Supabase y Google— tiene que decir
      `www`, y el ápice solo redirige.

      Los cinco sitios que tienen que decir lo mismo:

      1. **Vercel → Domains**: añadir `farpi.app` y `www.farpi.app`, y marcar
         **`www.farpi.app` como principal**. Vercel redirige el ápice con un 308.
      2. **Vercel → Environment Variables**: `SITE_URL=https://www.farpi.app`
         y `GOOGLE_REDIRECT_URI=https://www.farpi.app/api/documents/providers/google/callback`.
      3. **Supabase → Authentication → URL Configuration → Site URL**: `https://www.farpi.app`.
      4. **Supabase → Redirect URLs**: añadir `https://www.farpi.app/auth/callback`
         (mantener el de `http://localhost:3000/auth/callback` para desarrollo).
      5. **Google Cloud → Credenciales → cliente OAuth → Authorized redirect URIs**:
         `https://www.farpi.app/api/documents/providers/google/callback`, **idéntica** a la
         del punto 2. Google compara la cadena entera; una barra de más y contesta
         `redirect_uri_mismatch`. Este documento la dio por añadida desde el 31-08-2026
         y **no lo estaba**: lo registrado era el ápice, `https://farpi.app/…`, sin `www`.
         Ver abajo.

      **En qué orden, para no tener caída**: primero el dominio en Vercel (1) y la entrada
      nueva en Supabase (4) **sin quitar las viejas** —Supabase y Google admiten varias—;
      después las variables (2 y 3), que es lo que hace el cambio efectivo; y solo cuando
      todo responda, retirar las entradas del dominio antiguo. Con (5) ya hecho, el único
      orden que importa es no cambiar las variables antes de tener el dominio sirviendo.

      **Lo que enseñó el corte** (15-09-2026). Conectar Drive dio `redirect_uri_mismatch`
      dos veces seguidas, por dos causas distintas y las dos invisibles desde el panel:

      - `GOOGLE_REDIRECT_URI` seguía en el dominio viejo. Mirando Vercel «parecía todo
        bien», porque una variable con un valor viejo tiene exactamente el mismo aspecto
        que una correcta.
      - Y en Google lo registrado era el **ápice**, `https://farpi.app/…`. Para Google
        `farpi.app` y `www.farpi.app` son dos hosts distintos aunque uno redirija al otro:
        valida la cadena **antes** de redirigir a ninguna parte, así que el 308 no salva
        nada.

      Los dos fallos se parecen a «Google aún no ha propagado el cambio», que es la
      respuesta cómoda y era falsa las dos veces. **La salida está en el propio error**:
      el 400 de Google nombra el `redirect_uri` que se envió. Leerlo y compararlo con lo
      registrado resuelve esto en un minuto; esperar no resuelve nada.

      **Cómo comprobar que quedó bien**, en este orden: entrar por magic link (prueba 3 y
      4), abrir un documento ya subido (prueba que el token de Drive sigue vivo) y
      **desconectar y volver a conectar Drive** (única prueba real de 2 y 5). Las tres
      hechas el 15-09-2026.

- [x] **Plantillas de correo del panel de Supabase**: las seis pegadas en el panel
      el **15-09-2026**, con sus asuntos. Ya no queda nada firmando como Nido.

      Se aplican **a mano** —Supabase no las lee del repositorio—, así que si se vuelve
      a tocar `supabase/email-templates/` hay que volver a pegarlas: el fichero y el
      panel no se enteran el uno del otro.

      Repasadas ese mismo día y arregladas tres cosas antes de pegarlas: el cuadrado
      del logo pintaba una **`N`** —de Nido— con «Farpi» escrito justo debajo, en las
      seis; el pie iba en `muted-soft`, que la paleta reserva para decoración, y daba
      2,56:1; y el botón y el cuerpo se habían quedado con los valores anteriores de
      `primary-strong` y `muted`. Ahora lo más flojo del correo da 5,06:1.
- [x] **Pantalla de consentimiento de Google**: el nombre de la app pasa a «Farpi»
      (31-08-2026) y se aplicó directamente, sin cola de verificación de marca. En la misma
      pasada se **añadió** —no sustituyó— la redirect URI de `www.farpi.app` al cliente
      OAuth, que es la diferencia entre no notar nada y romper la conexión con Drive:
      Google compara la cadena entera y la app sigue mandando la del dominio viejo hasta
      que se cambie la variable en Vercel.

      **Branding, cerrado el 15-09-2026** con el dominio ya vivo: *App Domain* (homepage,
      privacidad y términos a `https://www.farpi.app/…`), *Authorized Domains*
      (`farpi.app`) y el logo.

      **El logo tiene precio y conviene saberlo**: sin él la app no pasa por
      verificación, porque `drive.file` no es un scope sensible. Subirlo la mete en la
      cola de verificación de marca. Enviada el 15-09-2026; mientras se revisa no cambia
      nada —quien conecta Drive no ve ningún aviso— y si Google dijera que no, se queda
      todo como estaba. El archivo se generó a 120×120 desde la variante **maskable**
      del icono, la del fondo a sangre: Google recorta en círculo y la del icono de app,
      con sus esquinas redondeadas y su margen, deja halo.

      De la verificación salieron dos avisos. El primero, que el dominio no constaba
      tuyo, se resolvió verificándolo en **Search Console** con un TXT en el DNS (ver
      más abajo). El segundo decía que la portada «está protegida por una página de
      acceso», y es **un falso positivo**: `/` es pública —está en `PUBLIC_ROUTES`— y
      enseña el hero, las capturas y las preguntas sin sesión, pero lleva `AuthCard`
      incrustada (`LandingPage.tsx`), así que el clasificador de Google ve un campo de
      contraseña en la home. Arreglarlo de verdad sería sacar el formulario de la
      portada, deshaciendo lo que se unificó el 01 y el 02-09. No se hizo.

      Dos cosas que **no** hay que hacer nunca aquí, porque sí tumbarían las conexiones:
      borrar y recrear el cliente OAuth —se caen todos los permisos concedidos— y devolver
      la app a *Testing*, donde los refresh tokens caducan a los siete días. Ojo con no
      confundir eso con la verificación de marca: lo que hace caducar los tokens es el
      **estado de publicación**, no el logo.

- [x] **Search Console**: `farpi.app` verificado el 15-09-2026 como propiedad de tipo
      *Dominio*, que cubre el ápice, el `www` y cualquier subdominio de una vez. Hizo
      falta para que Google admitiera el dominio en el Branding.

      **El registro TXT no se borra nunca.** Vive en el DNS de Vercel —el dominio está
      registrado ahí y con sus nameservers— y se puso con
      `vercel dns add farpi.app @ TXT "google-site-verification=…"`. Si desaparece,
      Google des-verifica la propiedad y el Branding vuelve a dar error.
- [ ] **Play Store**: el *package name* es irreversible. Todavía no se ha publicado, que
      es justo por lo que este era el momento de cambiar el nombre.

La etiqueta `appProperties.nido_family` de los archivos ya subidos **no se toca**: va
dentro de cada archivo, en el Drive de su dueño, y reescribirla exigiría recorrer uno a
uno los papeles de todas las familias. `listar` pregunta por las dos.

---

## 1. Resumen del estado

La app está **funcionalmente completa** y verificada (build, lint y la suite entera en verde: unitarios y de navegador):

- Supabase conectado de extremo a extremo: auth, repositorios reales, store async.
- Onboarding, invitaciones por magic link, gestión de miembros y roles.
- Documentos con los archivos en el **Google Drive de quien los sube** (27-08-2026):
  subir, abrir y borrar. La familia los ve igual y sin conectar nada. El bucket de
  Supabase Storage que había antes se borró el mismo día.
- PWA instalable (iconos + manifest), accesibilidad revisada.
- Código refactorizado: sin código muerto, sheets y detección de demo unificados, paleta tokenizada.

El backend está **validado** (§4): **169/169** comprobaciones de RLS, RPCs e integridad
(05-09-2026). La app está desplegada y operativa en **https://www.farpi.app** desde el
15-09-2026 (§0). La URL de Vercel sigue sirviendo, pero el host de la casa es ese.

Arquitectura y detalle: `architecture.md`. Estado: `project-status.md`. Roadmap: `roadmap.md`.

---

## 2. Requisitos antes del primer deploy

### 2.1 Variables de entorno en Vercel

En **Vercel → proyecto `farpi` → Settings → Environment Variables** (marca *Production* y *Preview*):

- [x] `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase.
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública (formato nuevo `sb_publishable_…`).
- [x] `SUPABASE_SERVICE_ROLE_KEY` — clave de servicio `sb_secret_…` (solo servidor; necesaria para enviar invitaciones). **Nunca** exponer al cliente.
- [x] `SITE_URL` — dominio de producción. Se usa para el `redirectTo` del magic link. Se llamó
      `NEXT_PUBLIC_SITE_URL` hasta el 01-09-2026: solo se lee en servidor, el prefijo no hacía falta y
      Vercel obliga a clasificar como públicas las variables que lo llevan. La vieja se sigue leyendo
      como respaldo, pero la buena es esta.

- [x] `CRON_SECRET` — **obligatoria para que el cron diario funcione**. Cualquier cadena larga y aleatoria. Vercel la envía sola en la cabecera `Authorization` cuando la variable se llama así. Sin ella, `/api/cron/reminders` responde 503 y no se ejecuta el keep-alive de Supabase. *(Añadida el 04-08-2026; el endpoint responde 200 con `keptAlive: true`.)*

- [x] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — **puestas en Vercel** y probadas de punta a punta el 28-08-2026 (`sent: 1, fallidos: 0`). Son *opcionales* solo en el sentido de que la app arranca sin ellas: faltando, las notificaciones push quedan desactivadas —el botón de activarlas no aparece (`src/lib/push.ts`) y el cron responde `skipped: 'VAPID no configurado'`, aunque mantiene el keep-alive—. Se generan con `node scripts/gen-vapid.cjs`, que las imprime ya con el nombre de cada variable. Después de guardarlas hay que **volver a desplegar**: las `NEXT_PUBLIC_*` se hornean en el build.

- [x] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — puestas, y la `REDIRECT_URI` corregida al dominio `www` el 15-09-2026 (§0). Son **obligatorias para los documentos**: sin ellas, las rutas de `/api/documents/*` responden 503 y no se puede subir ni abrir ningún papel. La `REDIRECT_URI` tiene que ser exactamente `https://<dominio>/api/documents/providers/google/callback`.
- [x] `DOCS_TOKEN_KEY` — puesta. Clave de 32 bytes con la que se cifran los tokens de Drive antes de guardarlos (`openssl rand -hex 32`). **Si se pierde o se rota, todas las conexiones guardadas dejan de descifrarse** y cada persona tiene que volver a conectar su Drive.

> La lista completa, incluidas las de notificaciones push (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), `CRON_SECRET` y `FARPI_TIME_ZONE` (esta última opcional y nunca definida: el cron usa `Europe/Madrid`), está en **`.env.example`** en la raíz del repositorio. Ese fichero es la plantilla de referencia: no lo lee ningún código, pero es el inventario de lo que la app necesita.

> **Cuidado al pegarlas.** En la puesta en marcha se colaron dos veces valores recortados (un espacio delante y la última letra perdida), y el síntoma fue un "Failed to fetch" opaco en el navegador. Para comprobar qué valores hay realmente horneados en producción, basta con buscar la URL en el JS servido: `curl -s https://<dominio>/auth/login` y seguir los chunks de `/_next/static`.

> Sin `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` válidas, la app arranca en **modo demo** (datos locales). Es el comportamiento correcto, pero no es lo que quieres en producción.

### 2.2 Supabase — base de datos

> Las tres primeras casillas hablan de **migraciones numeradas, que ya no existen**: se
> aplastaron en `supabase/schema.sql` el 26-08-2026 y están en el historial de git. Se
> quedan escritas porque dicen qué se aplicó en la base real y qué día, que es lo único
> que un archivo de esquema no sabe contar. De ahí para abajo, cada casilla nombra lo que
> cambió, no un número.

- [x] Migraciones `001`–`016` aplicadas en el proyecto de producción (SQL Editor o CLI). Verificado el 04-08-2026 contra la base real: existen `events.kind` (013), `events.member_id` y `documents.member_id` (012) y `family_members.color` (014). Las 015 y 016 se aplicaron el 05-08-2026 y quedaron **revalidadas el 06-08-2026** con `node scripts/validate-rls.mjs`: 51/51 (§4).
- [x] Migraciones `017_event_kind_descanso.sql` (guardar un descanso) y `018_person_kind.sql` (`children.kind`, los adultos sin cuenta) aplicadas el 21-08-2026 y **revalidadas** ese mismo día: 51/51 (§4).
- [x] Migración `019_meal_slots.sql` (`families.meal_slots`, qué franjas de comida ve la familia) aplicada el 24-08-2026 y **validada** ese mismo día: 58/58, con siete comprobaciones propias (§4).
- [x] **Documentos en Google Drive**: las dos columnas de `documents`
      (`storage_provider`, `storage_owner`) y la tabla `storage_connections` aplicadas
      el 27-08-2026 y **validadas** ese mismo día: **80/80**, con once comprobaciones
      propias (§4). `storage_connections` no se puede leer por PostgREST con ninguna
      sesión de usuario, ni siquiera la de su dueño.
- [x] ~~Bucket `documents`~~ **borrado el 27-08-2026**, con sus policies. Farpi ya no
      guarda archivos: viven en el Google Drive de quien los sube.
- [x] **El comedor y los platos de una comida**: `meal_plans.second_course` y
      `dessert`, el `check` de `slot` con `school` y el de `families.meal_slots` de 1 a
      5, aplicados el 02-09-2026 y **validados** ese mismo día (§4). El `default` de
      `meal_slots` **no** cambió: el comedor entra apagado, y por eso ninguna familia
      existente se despertó con una fila más en Comidas.
- [x] **Las once carpetas de documentos**: el `check` de `documents.category` aplicado el
      02-09-2026 y **validado** ese mismo día, categoría por categoría (§4). Ese check y
      `DOC_CATEGORIES` son dos listas que tienen que decir lo mismo: si una crece y la
      otra no, guardar ese papel falla en producción y no al desplegar.
- [x] Las dos cosas juntas: **117/117**, con once comprobaciones nuevas en el arnés.
- [x] **La revisión de seguridad del 03-09-2026**: el trigger
      `trg_document_storage_inmutable` y las cuatro policies de `documents` —la regla del
      dueño vive solo en el `insert`—, y `family_members` sin ninguna policy de escritura.
      Aplicado y validado ese mismo día: **163/163**.
      La cuarta pieza de aquel día, la RPC `accept_family_invite`, va anotada en §2.3
      por ser de Auth.
- [x] **Arreglo del trigger aplicado** el 04-09-2026 y validado ese mismo
      día: **165/165**. Corrige el trigger de la línea de arriba, que se pisaba con el
      `on delete set null` de `documents.storage_owner` y dejaba sin poder borrar su cuenta
      a quien hubiera subido un papel a una familia que le sobrevive.
- [x] RLS activo en todas las tablas privadas. `storage_connections` la lleva activada
      y **sin ninguna policy**, que es lo que la deja solo para el service role.

### 2.3 Supabase — Auth

- [x] **Authentication → URL Configuration → Site URL**: el dominio de producción.
- [x] **Redirect URLs**: añadir `https://<dominio>/auth/callback` (y `http://localhost:3000/auth/callback` para desarrollo).
- [x] **Parche SQL del 03-09-2026 aplicado** (cuatro secciones, hoy en
      `supabase/schema.sql`). De Auth es la RPC `accept_family_invite`, que ahora exige además que la
      invitación no lleve más de 30 días esperando y que la cuenta no se haya creado
      después de escribirse. Las otras tres son de base de datos y están anotadas en §2.2.
      Validado después con `node scripts/validate-rls.mjs`: **163/163**.
- [x] **Email**: proveedor SMTP configurado (Auth → Emails, en `.../auth/smtp`). Sin esto, las invitaciones por magic link y la confirmación de cuenta no se envían.
- [x] **Confirm email** (Auth → Sign In / Providers → Email): debe estar **activado** en producción. Si lo desactivas para probar en local, acuérdate de volver a activarlo.
      Desde el 03-09-2026 **la seguridad de las invitaciones ya no depende de este ajuste**:
      `accept_family_invite` exige además que la cuenta la haya creado el propio correo de
      invitación o que existiera antes de escribirse. Sigue teniendo que estar activado —un
      correo sin confirmar es una cuenta que no se sabe de quién es— pero apagarlo ya no
      abre la puerta de la familia.
- [ ] **Google** (opcional): el botón "Continuar con Google" del login se muestra solo si el proveedor está habilitado en Supabase — la app lo consulta en `/auth/v1/settings` (ver `src/lib/supabase/auth-providers.ts`). Si lo habilitas, añade también el redirect `https://<dominio>/auth/callback`.

> Estado a 2026-08-03: esquema completo (11 tablas), claves nuevas funcionando, SMTP propio configurado y primer usuario creado. Solo está activo el proveedor `email`; Google sigue desactivado.

---

### 2.4 Google Cloud — Drive para los documentos

**Está todo hecho**: los documentos llevan en producción desde el 27-08-2026 y la
redirect URI y el Branding se cerraron el 15-09-2026 (§0). Lo de aquí abajo queda como
la lista de lo que hay que tener puesto en **Google Cloud Console → APIs y servicios**,
que es lo que hace falta para rehacerlo o para entender qué se rompe si alguien lo toca:

- [x] Habilitar la **Google Drive API** en el proyecto.
- [x] Crear un **ID de cliente de OAuth** de tipo *Aplicación web*. En **URI de
      redirección autorizados**, **solo la de producción**. Google compara la cadena
      **entera**, así que un preview de Vercel con URL aleatoria no puede conectar.

      **Nada de `localhost` aquí** (15-09-2026). La había, para poder conectar Drive
      desde `npm run dev`, y Google avisó: *«tu app no está configurada para usar flujos
      OAuth seguros y puede ser vulnerable a la suplantación de identidad»*. Las
      redirecciones a IP de bucle invertido son para apps de escritorio; en un cliente
      web son un agujero, porque cualquier programa que escuche en ese puerto de la
      máquina se queda con el código. Se borró y se pierde poco: en local se siguen
      **viendo y abriendo** los documentos —eso va por proxy con el token del dueño, que
      se descifra con `DOCS_TOKEN_KEY`—, lo único que no se puede es *conectar* un Drive
      nuevo. Si alguna vez hace falta, se añade un rato y se vuelve a quitar; y si se
      fuera a trabajar a fondo en documentos, lo limpio es un **segundo cliente OAuth
      solo para desarrollo**, con su propio id y secreto en `.env.local`.
- [x] En la pantalla de consentimiento, dejar como único scope
      `https://www.googleapis.com/auth/drive.file`. Es **no sensible**, así que no
      hace falta verificación ni auditoría CASA. Añadir `drive` o `drive.readonly`
      metería el proyecto en un proceso de semanas.
- [x] **Publicar la app: estado "In production", no "Testing".** Es el punto que
      rompe el sistema en silencio si se olvida:
      - en *Testing*, Google **caduca los refresh tokens a los 7 días** y toda la
        familia tendría que reconectar cada semana;
      - en *Testing*, además, solo entran las cuentas añadidas a mano a la lista de
        usuarios de prueba (máximo 100): a quien no esté, Google le contesta
        `access_denied`.
      Con solo `drive.file` se puede publicar sin pasar verificación. Sí hacen falta
      la URL de la política de privacidad (`/privacidad`) y la del dominio.

## 3. Desplegar

El proyecto está vinculado a Vercel y a GitHub (`cerredax/farpi`).

- **Auto-deploy**: `git push origin main` → Vercel construye y despliega producción.
- **Manual**: `vercel --prod` (requiere Vercel CLI: `npm i -g vercel`).

Build local de comprobación: `npm run build`.

---

## 4. Validación Supabase (Fase 3) — COMPLETADA (2026-08-06)

Resultados en **`docs/supabase-validation.md`**: 169/169 comprobaciones correctas, con el esquema entero validado (última pasada, 05-09-2026). Repetible con `node scripts/validate-rls.mjs`.

- [x] Cuatro usuarios y tres familias de prueba (creados y eliminados durante la ejecución).
- [x] RLS por tabla y aislamiento entre familias, con sesiones de usuario reales.
- [x] Las 5 RPCs, incluida la regla del último admin.
- [x] Triggers de integridad cross-family.
- [x] Los documentos en Drive: nadie puede apuntar una ficha al Drive de otra persona, ni
      reescribir el dueño o la ruta de una que ya existe, y un ajeno no ve el documento
      aunque conozca su identificador de archivo. El bucket `documents` se borró el
      27-08-2026 y con él las diez comprobaciones de Storage; esto es lo que las
      sustituye.
- [x] Resultados registrados en `docs/supabase-validation.md`.

---

## 5. Smoke post-deploy (manual, en el dominio real)

> **Las casillas se quedan sin marcar a propósito**: esto no es un registro de lo hecho
> sino un procedimiento que se vuelve a correr entero cada vez que cambia el dominio o
> algo de §2. Lo de si funciona ya lo contesta otra cosa: la app está en **uso diario por
> la familia** desde el 05-08-2026, así que entrar, crear, invitar y abrir un papel se
> prueban solos todos los días.
>
> **La última pasada fue el 15-09-2026**, con el dominio nuevo, y no entera: las tres que
> el cambio de host podía romper —entrar por magic link, abrir un documento ya subido y
> desconectar y volver a conectar Drive—. Pasaron las tres; el detalle, en §0. Instalar
> como PWA sigue sin comprobarse en un móvil de verdad, y es el mismo punto abierto que
> arrastra la Fase 2 del roadmap.

- [ ] `/auth/login` muestra el **formulario real** (no "Modo local activo").
- [ ] Registro → confirmación por email → login.
- [ ] Onboarding: crear familia.
- [ ] Crear evento, tarea, lista + ítem y comida; recargar y comprobar persistencia.
- [ ] Subir un documento y pulsar **Abrir documento**: el archivo va al Google Drive de
      quien lo sube y lo sirve Farpi por proxy (`/api/documents/[id]/file`). Ya no hay
      signed URLs ni bucket, desde el 27-08-2026.
- [ ] Invitar a un segundo email → llega el magic link → aceptar → se une a la familia.
- [ ] Cambiar rol de un miembro; comprobar que no se puede degradar al único admin.
- [ ] Cerrar sesión.
- [ ] Instalar como PWA en móvil (icono correcto).

---

## 6. Tareas pendientes (backlog)

### Bloqueantes para producción
- [x] Configurar env vars en Vercel (§2.1).
- [x] Configurar Auth de Supabase: Site URL, Redirect URLs y SMTP (§2.3).
- [x] Cerrar validación Supabase (§4).

### Recomendadas (no bloqueantes)
- [x] Verificar `SITE_URL` = dominio final antes de invitar a nadie.
- [x] `CRON_SECRET` en Vercel y cron respondiendo 200 (04-08-2026).
- [x] Revalidar RLS tras las migraciones 015 y 016 — hecho el 06-08-2026, 51/51 (§4).
- [ ] Revisar límites de envío de email del proveedor (Gmail SMTP: ~500/día).
- [x] Claves VAPID en Vercel y push funcionando (28-08-2026, §2.1).
- [x] Ejecución automática de las 07:00 UTC comprobada en los logs de Vercel (06-08-2026). El keep-alive de Supabase corre solo, no solo a mano.
- [x] Pasar la app por un móvil de verdad (05-08-2026): sin incidencias. Quedan
  sueltos Safari de iOS y la PWA instalada, según el móvil de la prueba. Ver
  `roadmap.md`, Fase 2.

### Mejoras futuras (opcional)
- [x] PWA **offline** (service worker registrado en producción, con fallback `/offline`).
- [x] Tokenizar los colores one-off (hecho 2026-08-03: 109 → 36 apariciones).
- [x] Tests e2e de flujos CRUD (`e2e/runtime.spec.ts`) y de móvil a 390 px (`e2e/movil.spec.ts`).
- [ ] Backup/export de datos de la familia.
- [ ] Publicar en Google Play como TWA: package name, SHA-256 de la firma,
  `public/.well-known/assetlinks.json` y la guía `docs/play-store.md`.
- [ ] Medir el contraste de la paleta.

---

## 7. Notas y limitaciones conocidas

- **Páginas legales**: `/privacidad` y `/terminos` son públicas (rutas abiertas en `src/lib/supabase/middleware.ts`) y su correo de contacto es `cerredax@gmail.com`. La URL de `/privacidad` es la que pide Google Play.
- **Modo demo**: si faltan credenciales, la app funciona con datos en `localStorage`. La sección "Reiniciar datos de demo" en Ajustes solo aparece en ese modo.
- **Regla del último admin**: se valida en el servidor (RPCs `security definer` y borrado de cuenta) y la UI la refuerza; el mock no la valida (asume un único admin).
- **Comandos útiles**: `npm run dev` (arranca), `npm run build`, `npm run lint`, `npm run test:e2e`.
