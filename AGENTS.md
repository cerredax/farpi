# Instrucciones para agentes

Farpi es una app familiar privada, mobile-first y de alcance pequeño.

**Las reglas de trabajo están en [`CLAUDE.md`](./CLAUDE.md). Léelo antes de tocar
nada.** Da igual el agente que seas: producto, reglas, comandos, arquitectura y
convenciones viven ahí, en un solo sitio.

Este fichero existe solo porque algunos agentes buscan un `AGENTS.md` en la raíz.
Antes duplicaba el contenido de `CLAUDE.md` con otras palabras, y lo único que
conseguía era que los dos se desincronizaran.

Lo mínimo, por si no llegas a abrir el otro:

- La documentación está en español. Escribe código, comentarios y docs en español.
- **Supabase está en producción con datos reales de una familia.** No ejecutes nada
  que escriba o borre en la base salvo petición explícita.
- `docs/project-status.md` es la fuente de verdad de qué está hecho y qué falta.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
