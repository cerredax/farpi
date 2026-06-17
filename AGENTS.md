# Instrucciones para agentes

Este proyecto es Nido, una app familiar privada, mobile-first y de alcance pequeño.

## Lee primero

- `README.md`
- `docs/project-status.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/testing-checklist.md`

## Producto

Nido debe responder rápido a:

> ¿Qué tenemos que saber hoy en casa?

La app debe seguir siendo sencilla, visual y útil para una familia. Evitar convertirla en SaaS empresarial.

## Reglas de trabajo

- No conectar Supabase real salvo petición explícita.
- Mantener el modo demo/mock funcionando.
- No introducir backend complejo, Docker, NestJS ni arquitectura grande.
- No cambiar el diseño visual de forma amplia sin confirmación.
- Mantener mobile-first.
- Si se toca una migración, revisar tipos TypeScript, mock-store y documentación.
- Si se cambia un flujo mock, comprobar persistencia en `localStorage`.
- Para cambios relevantes, ejecutar `npm run lint` y `npm run build`.
- Si aparecen warnings por archivos temporales, limpiarlos o excluirlos.

## Calidad de código

- Usar `src/lib/constants.ts` para constantes compartidas.
- Usar `src/lib/date-utils.ts` para fechas locales.
- Usar `src/lib/validators.ts` para validaciones ligeras.
- Usar `src/lib/selectors.ts` para datos derivados.
- Reutilizar `src/components/ui/BottomSheet.tsx` en sheets cuando sea razonable.
- Mantener contratos de repositorios en `src/lib/repos/types.ts`.
- No sobrerrefactorizar: cada cambio debe acercar el proyecto a Supabase o mejorar mantenimiento real.

## Next.js

El proyecto usa una versión moderna de Next.js. Si una API o convención genera dudas, revisar la documentación local instalada en `node_modules/next/dist/docs/` antes de asumir comportamiento antiguo.

## Fuente de verdad

- Estado y pendientes: `docs/project-status.md`.
- Arquitectura y decisiones: `docs/architecture.md`.
- Orden de trabajo: `docs/roadmap.md`.
- QA manual: `docs/testing-checklist.md`.

