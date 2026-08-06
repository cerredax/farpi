# Nido

Nido es una app familiar privada para ver de un vistazo el calendario, las listas, las comidas y los documentos importantes de casa.

La pantalla principal debe responder con claridad a una pregunta:

> ¿Qué tenemos que saber hoy en casa?

## En una frase

Una app familiar, mobile-first y privada para organizar el día a día sin convertirlo en un SaaS complejo.

## Stack

- Next.js 16 con App Router.
- React.
- TypeScript.
- Tailwind CSS v4 (sin `tailwind.config`; los tokens viven en `src/app/globals.css`).
- Supabase para Auth, PostgreSQL, Storage y RLS.
- Playwright como único runner de tests, para los unitarios y para los de navegador.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
```

Sin credenciales de Supabase en `.env.local`, la app arranca en **modo demo** con datos
mock en `localStorage`. Con ellas habla con Supabase de verdad: auth, datos, Storage y
RLS. La decisión se toma en un solo sitio, `src/lib/supabase/env.ts`, y la plantilla de
variables está en `.env.example`.

## Scripts

```bash
npm run dev         # servidor de desarrollo, puerto 3000
npm run build       # build de producción
npm run start       # servir el build
npm run lint        # eslint
npm run test:unit   # tests de lógica pura, sin servidor (~0,6 s)
npm run test:e2e    # la suite entera: unitarios + navegador, en modo demo

node scripts/validate-rls.mjs    # valida RLS, RPCs y triggers contra el Supabase real
node scripts/gen-all-in-one.mjs  # regenera supabase/all_in_one.sql desde las migraciones
node scripts/gen-vapid.cjs       # genera el par de claves para las notificaciones push
node scripts/gen-icons.cjs       # regenera los iconos de la PWA
```

## Documentación interna

- [Estado del proyecto](./docs/project-status.md): qué está hecho, qué falta y cuál es el siguiente paso.
- [Arquitectura](./docs/architecture.md): decisiones técnicas, modo demo, Supabase, repositorios y datos.
- [Roadmap](./docs/roadmap.md): orden recomendado de trabajo por fases.
- [Puesta en producción](./docs/produccion.md): checklist de despliegue en Vercel + Supabase.
- [Checklist de pruebas](./docs/testing-checklist.md): QA manual, y qué está ya automatizado.
- [Validación Supabase](./docs/supabase-validation.md): pruebas de migraciones, RLS, RPCs y Storage.
- [Notificaciones](./docs/notificaciones.md): cómo activar los recordatorios por push.
- [Reglas de trabajo](./CLAUDE.md): producto, límites, comandos, arquitectura y convenciones. Vale para cualquier agente (Claude, Codex u otro); [`AGENTS.md`](./AGENTS.md) solo apunta aquí.

## Estructura principal

```text
src/app                    Rutas de Next.js
src/components             Componentes UI y pantallas
src/hooks                  Estado de pantalla y andamiaje de los sheets
src/lib/store              Store mock del modo demo, un módulo por dominio
src/lib/supabase-repos     Repos reales, un módulo por dominio
src/lib/store-context.tsx  Contexto global actual
src/lib/constants.ts       Constantes compartidas
src/lib/date-utils.ts      Helpers de fecha local
src/lib/validators.ts      Validaciones ligeras
src/lib/selectors.ts       Selectores derivados
src/lib/repos              Contrato que cumplen las dos implementaciones
src/proxy.ts               Middleware de Next 16, refresca la sesión
e2e                        Tests de navegador; e2e/unit, los de lógica pura
scripts                    Validación de RLS, claves VAPID e iconos de la PWA
supabase/migrations        Esquema, RLS, RPCs, integridad, invitaciones y Storage
docs                       Documentación de proyecto, QA y roadmap
```

## Principios

- Mobile-first.
- Diseño cálido, limpio y familiar.
- Arquitectura simple y mantenible.
- Modo demo siempre funcional: es el fallback sin credenciales y el entorno de los tests.
- Nada de ERP, backend complejo, Docker, NestJS o funcionalidades fuera del MVP.
