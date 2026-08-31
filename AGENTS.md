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
