# Estado del proyecto

Última revisión: 2026-08-03.

## Resumen

Nido está conectado a Supabase de extremo a extremo: autenticación, repositorios reales, `StoreProvider` async, onboarding, invitaciones por magic link y documentos reales en Storage. La UI consume la frontera de repositorios y elige implementación real o mock según `IS_DEMO_MODE`. El modo demo/mock sigue funcionando como fallback y como entorno de pruebas (e2e).

## Implementado

### Pantallas / producto

- Inicio / Hoy.
- Calendario (eventos, series semanales y anuales).
- Tareas (con recurrencia).
- Listas e ítems.
- Comidas (día/semana, copiar día).
- Documentos: subir, abrir/descargar (signed URL 60 s), editar y borrar.
- Ajustes de familia: miembros, invitaciones, hijos, cambio de rol admin/miembro.
- Modo demo con persistencia en `localStorage`.

### Conexión Supabase (completada)

- Auth real (login/signup, recuperación de contraseña, logout).
- Repositorios reales en `src/lib/supabase-repos.ts` + mock en `src/lib/mock-repos.ts`, tras el contrato `src/lib/repos/types.ts`.
- `StoreProvider` async con estados loading/error y `reload()`.
- Onboarding real (`/onboarding` → `create_family_with_admin`) y resolución de familia activa en `AppShell`.
- Invitaciones por email vía magic link (`/api/invite` con service role) y aceptación automática en `/auth/callback` (`accept_family_invite`).
- Documentos reales en Storage con path `{family_id}/{document_id}/{filename}`, subida con rollback y descarga por signed URL.
- Gestión de roles desde Ajustes (`update_family_member_role`) con bloqueo del último admin en la UI.
- Detección de modo demo unificada en `src/lib/supabase/env.ts` (cliente, servidor, proxy y API).

### Backend / migraciones

- Migraciones Supabase aplicadas/preparadas (001–012).
- RLS base por familia con `my_family_ids()` endurecida (`set search_path = public`).
- RPC `create_family_with_admin` con nombre normalizado.
- RPC `update_my_family_profile` para editar solo campos seguros del perfil.
- Tabla de invitaciones con policies idempotentes y `with check`.
- Bucket privado `documents` con policies completas (SELECT por familia habilita signed URLs).
- Triggers de integridad cross-family (`family_id`, `list_id`, `child_id`).
- RPCs admin `remove_family_member` y `update_family_member_role` con control de último admin.
- RPC `accept_family_invite(p_invite_id uuid)`.
- Asignación de eventos y documentos a cualquier miembro de la familia, no solo a hijos (migración 012).
- Script `supabase/validate_rls.sql` para validar RLS, RPCs, triggers e invitaciones desde SQL Editor.

### Calidad / infraestructura

- Refactor: constantes, validadores, fechas, selectores, contratos de repos.
- Los 5 sheets con overlay propio (Event, Doc, Task, Item, List) unificados en el `BottomSheet` compartido.
- Código muerto eliminado: stubs `src/lib/repos/*` (salvo `types.ts`), hook `useFamily.ts`, endpoints temporales `/api/check-config` y `/api/diag`.
- Lógica de recurrencia unificada en `src/lib/recurrence.ts` (la usaban por duplicado los repos Supabase, el store mock y `EventSheet`).
- Helpers compartidos: `parseLocalDate()` en `date-utils.ts` y `capitalize()` en `src/lib/text.ts` (antes repetido en 5 componentes).
- Los sheets validan con `src/lib/validators.ts` en lugar de comprobaciones ad-hoc; `EventSheet` ya bloquea hora de fin anterior a la de inicio.
- Métodos de repo sin uso retirados del contrato: `getTodayEvents`, `getUpcomingEvents`, `getPendingItems` (las pantallas derivan con `selectors.ts`).
- Paleta tokenizada: de 54 colores sueltos a 18, y de 109 apariciones a 36. Los tonos casi idénticos (seis verdes claros, cinco blancos cálidos) se unificaron en tokens de `globals.css`. Lo que queda literal son datos (paleta de hijos, prioridades), marca de terceros (logo de Google) y cuatro decorativos de un solo uso.
- PWA: iconos any + maskable + apple-touch y `manifest.json` con purposes (script `scripts/gen-icons.cjs`).
- Vistas grandes despiezadas: cada pantalla con estado propio tiene su hook (`useListsState`, `useMealsState`, `useDocsState`) y los bloques de UI viven en su fichero (`WeekGrid`, `MealRow`, `DocCard`, `FileTypeIcon`, `OffDayConfirmDialog`, `LoginHero`).
- Andamiaje de sheets unificado: `useSheetForm`/`useSheetDelete` (`src/hooks/useSheetForm.ts`) y los componentes `Field`, `SheetFooter`, `SelectChip` y `DotOption` en `src/components/ui/`.
- 65 tests unitarios de lógica pura en `e2e/unit/` (recurrencia, fechas, selectores, validadores), sin dependencias nuevas: usan el runner de Playwright y no levantan servidor (`npm run test:unit`, ~0,6 s).
- `scripts/validate-rls.mjs`: validación manual de RLS/RPCs/integridad contra el Supabase real, repetible tras cambios de esquema.
- Tests e2e smoke con `@playwright/test` (login demo → /home) y apertura de los sheets de tareas, listas, documentos, calendario y comidas. Ejecutar con `npm run test:e2e`.

## Correcciones de seguridad

- `my_family_ids()` con `set search_path = public` (evita search path hijacking).
- Eliminada policy de update libre sobre `family_members`; reemplazada por RPC `update_my_family_profile`.
- `family_invites` update con `using` + `with check`.

## Regla del último admin — DECISIÓN TOMADA

Una familia debe tener siempre al menos un admin. Están prohibidas cuando quedaría cero admins:

- Eliminar al único admin de una familia.
- Degradar al único admin de `admin` a `member`.

**Aplicación en Supabase:** validación mediante RPCs `security definer` (`remove_family_member`, `update_family_member_role`) y bloqueo en `/api/account/delete` cuando borrar una cuenta dejaría una familia compartida sin admin. No se implementa mediante policies RLS. Ver `architecture.md`.

**Aplicación en la UI:** `MemberSheet` bloquea degradar al único admin (calculado en `SettingsView`); el servidor es la validación autoritativa.

**Nota sobre policies:** `Admin gestiona miembros` queda sustituida por `Admin inserta miembros`; UPDATE y DELETE de miembros pasan por RPCs.

## Estado Supabase

- Proyecto Supabase creado, migraciones 001–011 aplicadas y UI conectada.
- App en producción (Vercel) contra el mismo proyecto Supabase que local.
- **Validación aislada completada el 2026-08-03: 47/47 comprobaciones correctas** (RLS por tabla con dos usuarios reales, RPCs, regla del último admin, invitaciones y triggers cross-family). Resultados en `docs/supabase-validation.md`.
- SMTP propio configurado, así que las invitaciones por magic link ya se envían.
- No documentar URLs privadas, anon keys ni secretos en el repositorio.

## Pendientes de validación Supabase

Ninguno. Repetir con `node scripts/validate-rls.mjs` tras cambios de esquema, policies o RPCs.

## Siguiente paso recomendado (plan para 2026-08-04)

### Bloqueante: desplegar lo de hoy

1. **Añadir `CRON_SECRET` en Vercel** (Production). Sin ella el cron responde 503.
2. **Pushear los commits pendientes.** Entre ellos va el arreglo del callback de
   invitaciones, y corre prisa: el enlace de recuperación de contraseña enviado a
   `omar.garcia@confia.es` el 03-08 **no funcionará bien hasta que ese arreglo esté en
   producción**, porque devuelve la sesión en el fragmento de la URL.

### Verificar en producción (lo de hoy está probado en local, no en real)

3. **Invitación completa de punta a punta** con un email nuevo: que llegue, que el
   enlace dé de alta en la familia y que la persona vea los datos. El flujo se arregló
   hoy pero nunca se ha ejecutado entero con éxito.
4. **Que el cron corra** por primera vez (07:00 UTC). Revisar los logs de Vercel y que
   devuelva `keptAlive: true`.
5. **Mirar la app con los colores nuevos** en pantalla real. La tokenización unificó
   tonos casi idénticos; está verificada con capturas, pero conviene un vistazo humano.

### Hueco funcional detectado

6. **Una persona invitada no tiene contraseña.** `inviteUserByEmail` crea el usuario sin
   ella, así que solo puede entrar por el enlace del correo o poniéndose una desde
   "¿Olvidaste tu contraseña?". La app no ofrece ningún sitio para **cambiar la
   contraseña** estando dentro. Merece la pena decidir si se añade.

### Después

7. Revisión de accesibilidad (labels, foco, contraste, roles).
8. Decidir si se borra `supabase/validate_rls.sql`, redundante con
   `scripts/validate-rls.mjs`.
