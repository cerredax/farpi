# Nido

Nido es una app familiar privada para ver de un vistazo el calendario, las listas, las comidas y los documentos importantes de casa.

La pantalla principal debe responder con claridad a una pregunta:

> ¿Qué tenemos que saber hoy en casa?

## En una frase

Una app familiar, mobile-first y privada para organizar el día a día sin convertirlo en un SaaS complejo.

## Stack

- Next.js con App Router.
- React.
- TypeScript.
- Tailwind CSS.
- Supabase para Auth, PostgreSQL, Storage y RLS.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abrir:

```text
http://localhost:3000
```

La UI sigue pudiendo funcionar en modo demo con datos mock guardados en `localStorage`. Supabase ya está subido como backend base y se valida de forma aislada antes de conectar toda la app a datos reales.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Documentación interna

- [Estado del proyecto](./docs/project-status.md): qué está hecho, qué falta y cuál es el siguiente paso.
- [Arquitectura](./docs/architecture.md): decisiones técnicas, modo demo, Supabase, repositorios y datos.
- [Roadmap](./docs/roadmap.md): orden recomendado de trabajo por fases.
- [Checklist de pruebas](./docs/testing-checklist.md): QA manual del MVP mock.
- [Validación Supabase](./docs/supabase-validation.md): pruebas de migraciones, RLS, RPCs y Storage.
- [Reglas para agentes](./AGENTS.md): normas para Codex, Claude u otros asistentes.

## Estructura principal

```text
src/app                    Rutas de Next.js
src/components             Componentes UI y pantallas
src/lib/mock-store.ts      Store mock del modo demo
src/lib/store-context.tsx  Contexto global actual
src/lib/constants.ts       Constantes compartidas
src/lib/date-utils.ts      Helpers de fecha local
src/lib/validators.ts      Validaciones ligeras
src/lib/selectors.ts       Selectores derivados
src/lib/repos              Contratos y repositorios preparados para Supabase
supabase/migrations        Esquema, RLS, RPCs, integridad, invitaciones y Storage
docs                       Documentación de proyecto, QA y roadmap
```

## Principios

- Mobile-first.
- Diseño cálido, limpio y familiar.
- Arquitectura simple y mantenible.
- Modo demo funcional hasta conectar Supabase.
- Nada de ERP, backend complejo, Docker, NestJS o funcionalidades fuera del MVP.
