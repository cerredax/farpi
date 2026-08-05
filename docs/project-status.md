# Estado del proyecto

Última revisión: 2026-08-05.

## Resumen

Nido está conectado a Supabase de extremo a extremo: autenticación, repositorios reales, `StoreProvider` async, onboarding, invitaciones por magic link y documentos reales en Storage. La UI consume la frontera de repositorios y elige implementación real o mock según `IS_DEMO_MODE`. El modo demo/mock sigue funcionando como fallback y como entorno de pruebas (e2e).

La app está en producción, en uso diario por la familia y probada en un móvil real (05-08-2026). Lo que queda no es código de producto: dos comprobaciones baratas y funcionalidades que todavía no existen (ver "Siguiente paso recomendado").

## Implementado

### Pantallas / producto

- Inicio / Hoy, con "Esta semana" y lo que va atrasado arrastrado al día de hoy.
- Calendario (eventos, series semanales y anuales, vacaciones como franja). En la
  vista de semana salen también las tareas que vencen, y se pueden marcar allí.
- Tareas: recurrencia, prioridad, dueño (un adulto o un hijo) y quién la marcó.
- Listas e ítems: lo que falta arriba, lo que ya tenéis plegado como catálogo (se vuelve a pedir con un `+`, no con un tic), mover un ítem de una lista a otra.
- Búsqueda en listas, tareas, documentos y calendario. La del calendario encuentra
  eventos pasados, no solo los del tramo pintado.
- Comidas (día/semana, copiar día).
- Documentos: subir, abrir/descargar (signed URL 60 s), editar, borrar y aviso de
  caducidad en la tarjeta.
- Deshacer una tarea marcada sin querer, desde el aviso de la barra de estado.
- Ajustes de familia: miembros, invitaciones, hijos, cambio de rol admin/miembro.
- Cuenta: cambiar contraseña y borrar cuenta (`AccountActions.tsx`).
- Páginas legales públicas `/privacidad` y `/terminos`.
- Modo demo con persistencia en `localStorage`.

### Conexión Supabase (completada)

- Auth real (login/signup, recuperación de contraseña, logout).
- Repositorios reales en `src/lib/supabase-repos/` (un módulo por dominio) + mock en `src/lib/mock-repos.ts`, tras el contrato `src/lib/repos/types.ts`.
- `StoreProvider` async con estados loading/error y `reload()`.
- Onboarding real (`/onboarding` → `create_family_with_admin`) y resolución de familia activa en `AppShell`.
- Invitaciones por email vía magic link (`/api/invite` con service role) y aceptación automática en `/auth/callback` (`accept_family_invite`).
- Documentos reales en Storage con path `{family_id}/{document_id}/{filename}`, subida con rollback y descarga por signed URL.
- Gestión de roles desde Ajustes (`update_family_member_role`) con bloqueo del último admin en la UI.
- Detección de modo demo unificada en `src/lib/supabase/env.ts` (cliente, servidor, proxy y API).

### Backend / migraciones

- Migraciones Supabase 001–016 aplicadas en el proyecto real. Las 015 (dueño de la tarea) y 016 (caducidad de documentos), el 2026-08-05.
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_family_member_profile` (migración 014): nombre y color del miembro, editables por él mismo o por un admin de su familia. Sustituye a `update_my_family_profile`.
- Tabla de invitaciones con policies idempotentes y `with check`.
- Bucket privado `documents` con policies completas (SELECT por familia habilita signed URLs).
- Triggers de integridad cross-family (`family_id`, `list_id`, `child_id`), incluidos
  los de `tasks` que llegaron con la 015.
- RPCs admin `remove_family_member` y `update_family_member_role` con control de último admin.
- RPC `accept_family_invite(p_invite_id uuid)`.
- Asignación de eventos y documentos a cualquier miembro de la familia, no solo a hijos (migración 012).
- Vacaciones: eventos de varios días por persona, pintados como franja en el calendario (migración 013). Solo se ven en el calendario: fuera de la lista de eventos y de los planes de hoy.
- Perfil del miembro: nombre editable también por el admin, y color propio elegible como el de los hijos (migración 014).
- Tareas con dueño: se asignan a un adulto o a un hijo como los eventos y los documentos, y se guarda quién las marcó (migración 015).
- Caducidad de documentos: fecha opcional, aviso en la tarjeta a 30 días (`DIAS_AVISO_CADUCIDAD`) y en el recordatorio diario (migración 016).
- `supabase/all_in_one.sql`, las 16 migraciones concatenadas para levantar un proyecto de cero. Generado con `scripts/gen-all-in-one.mjs`, no editado a mano.

### Calidad / infraestructura

- Refactor: constantes, validadores, fechas, selectores, contratos de repos.
- Los 5 sheets con overlay propio (Event, Doc, Task, Item, List) unificados en el `BottomSheet` compartido.
- Código muerto eliminado: stubs `src/lib/repos/*` (salvo `types.ts`), hook `useFamily.ts`, endpoints temporales `/api/check-config` y `/api/diag`.
- Lógica de recurrencia unificada en `src/lib/recurrence.ts` (la usaban por duplicado los repos Supabase, el store mock y `EventSheet`).
- Helpers compartidos: `parseLocalDate()` en `date-utils.ts` y `capitalize()` en `src/lib/text.ts` (antes repetido en 5 componentes).
- Los sheets validan con `src/lib/validators.ts` en lugar de comprobaciones ad-hoc; `EventSheet` ya bloquea hora de fin anterior a la de inicio.
- Métodos de repo sin uso retirados del contrato: `getTodayEvents`, `getUpcomingEvents`, `getPendingItems` (las pantallas derivan con `selectors.ts`).
- Paleta tokenizada: de 54 colores sueltos a 18, y de 109 apariciones a 36. Los tonos casi idénticos (seis verdes claros, cinco blancos cálidos) se unificaron en tokens de `globals.css`. Lo que queda literal son datos (paleta de hijos, prioridades), marca de terceros (logo de Google) y cuatro decorativos de un solo uso.
- PWA: iconos any + maskable + apple-touch, `manifest.json` con purposes (script `scripts/gen-icons.cjs`) y service worker con fallback `/offline`.
- Vistas grandes despiezadas: cada pantalla con estado propio tiene su hook (`useListsState`, `useMealsState`, `useDocsState`, `useEventSheet`) y los bloques de UI viven en su fichero (`WeekGrid`, `MealRow`, `DocCard`, `FileTypeIcon`, `OffDayConfirmDialog`, `LoginHero`, `EventRecurrenceFields`, `EventSeriesDelete`, `ListItemRow`). `EventSheet` fue el último: de 483 líneas a cuatro piezas.
- Andamiaje de sheets unificado: `useSheetForm`/`useSheetDelete` (`src/hooks/useSheetForm.ts`) y los componentes `Field`, `SheetFooter`, `SelectChip` y `DotOption` en `src/components/ui/`.
- **198 tests con el runner de Playwright**, sin dependencias nuevas:
  - 150 unitarios de lógica pura en `e2e/unit/` (recurrencia, fechas, selectores, validadores, asignaciones, eventos, detección de modo demo). No levantan servidor: `npm run test:unit`, ~0,6 s.
  - 48 de navegador: `smoke.spec.ts` (login demo → /home), `runtime.spec.ts` (apertura de sheets y flujos CRUD) y `movil.spec.ts` (390×844: desbordes y tamaño mínimo de los controles). `npm run test:e2e` los corre todos levantando el dev server en :3100.
- `scripts/validate-rls.mjs`: validación manual de RLS/RPCs/integridad contra el Supabase real, repetible tras cambios de esquema.

## Correcciones de seguridad

- `my_family_ids()` con `set search_path = public` (evita search path hijacking).
- Eliminada policy de update libre sobre `family_members`; reemplazada por RPC (hoy `update_family_member_profile`).
- `family_invites` update con `using` + `with check`.
- `?next=` del callback pasa por `safeNextPath`: solo rutas de la propia app. Sin eso,
  un enlace de correo legítimo podía acabar en otra web justo después de iniciar sesión.
- Cabeceras de seguridad en `next.config.ts`. Sin CSP a propósito (ver `architecture.md`).

## Regla del último admin — DECISIÓN TOMADA

Una familia debe tener siempre al menos un admin. Están prohibidas cuando quedaría cero admins:

- Eliminar al único admin de una familia.
- Degradar al único admin de `admin` a `member`.

**Aplicación en Supabase:** validación mediante RPCs `security definer` (`remove_family_member`, `update_family_member_role`) y bloqueo en `/api/account/delete` cuando borrar una cuenta dejaría una familia compartida sin admin. No se implementa mediante policies RLS. Ver `architecture.md`.

**Aplicación en la UI:** `MemberSheet` bloquea degradar al único admin (calculado en `SettingsView`); el servidor es la validación autoritativa.

**Nota sobre policies:** `Admin gestiona miembros` queda sustituida por `Admin inserta miembros`; UPDATE y DELETE de miembros pasan por RPCs.

## Estado Supabase

- Proyecto Supabase creado, migraciones 001–016 aplicadas y UI conectada. Las 012, 013 y 014 se verificaron contra la base real el 04-08-2026; las 015 y 016 se aplicaron el 05-08-2026.
- 014 (`update_family_member_profile` + `family_members.color`): la columna existe, la RPC responde y la antigua `update_my_family_profile` está borrada. Editar un miembro funciona en producción.
- App en producción (Vercel) contra el mismo proyecto Supabase que local.
- **Validación aislada completada el 2026-08-03: 47/47 comprobaciones correctas** (RLS por tabla con dos usuarios reales, RPCs, regla del último admin, invitaciones y triggers cross-family). Resultados en `docs/supabase-validation.md`.
- SMTP propio configurado, así que las invitaciones por magic link ya se envían.
- No documentar URLs privadas, anon keys ni secretos en el repositorio.

## Pendientes de validación Supabase

015 y 016 ya están aplicadas. Queda **volver a pasar `node scripts/validate-rls.mjs`**
y anotar el resultado en `docs/supabase-validation.md`. El script ya trae dos
comprobaciones nuevas para los triggers cross-family de `tasks` (que no se pueda
asignar una tarea a un hijo o a un miembro de otra familia) y dos del perfil que
llegaron con la 014, así que pasa de 47 a **51 comprobaciones**.

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

## Siguiente paso recomendado

La app está en producción y en uso diario por la familia, y probada en un móvil
real. Lo que queda son dos comprobaciones baratas y funcionalidades que no existen.

### Las dos comprobaciones que yo haría ya

1. **Revalidar RLS**: `node scripts/validate-rls.mjs` y anotar el resultado en
   `docs/supabase-validation.md` (ver arriba). Es lo único pendiente con forma de
   problema de seguridad: la 015 metió en `tasks` dos columnas que apuntan a otra
   familia, y que los triggers estén escritos no prueba que salten. Ojo: crea y
   borra usuarios y familias de prueba en el Supabase real.
2. **Que el cron corra solo** a las 07:00 UTC (la llamada manual ya va). Revisar los
   logs de Vercel y comprobar que devuelve `keptAlive: true`. Si el programador no
   dispara, Supabase se pausa por inactividad en el plan free y una mañana la app no
   abre.

### Funcionalidades que faltan, no riesgos

3. **Notificaciones push**: el código está completo y `CRON_SECRET` ya está puesta.
   Las claves VAPID se generan con `node scripts/gen-vapid.cjs`; falta ponerlas en
   Vercel y **volver a desplegar** (las `NEXT_PUBLIC_*` se hornean en el build). Sin
   ellas el botón de activarlas no aparece y el cron responde
   `skipped: 'VAPID no configurado'`. Ver `docs/notificaciones.md`.
4. **Backup/export de datos de la familia.** No urge, pero es lo insustituible: los
   documentos y el calendario viven en un único proyecto Supabase del plan gratuito,
   sin exportación.

### Decisión abierta

5. **Google Play (TWA)**: falta el package name definitivo,
   `public/.well-known/assetlinks.json` (necesita el SHA-256 de la firma) y la guía
   `docs/play-store.md`. La PWA y la política de privacidad ya están.

### Después

6. Medir el contraste de la paleta (el resto de la revisión de accesibilidad —roles,
   labels, foco, `inert` en los sheets— está hecha, Fase 8 del roadmap).
