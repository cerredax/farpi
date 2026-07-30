# Guía de validación Supabase (paso a paso)

Objetivo: cerrar la Fase 3 verificando que RLS, RPCs, Storage e integridad funcionan en tu proyecto Supabase real. Al terminar, anota los resultados en `docs/supabase-validation.md`.

> Regla de oro: **no** pegues en el repo URLs privadas, anon key, service role key ni datos personales.

---

## 0. Arrancar la app para probarla

La app decide entre **modo demo** y **Supabase real** según las variables de entorno (`src/lib/supabase/env.ts`).

### Modo demo (sin backend, datos en `localStorage`)

No necesita configuración. Con `.env.local` sin credenciales reales (o con los placeholders), arranca en demo:

```bash
npm run dev
# abre http://localhost:3000  → entra directo, datos de prueba
```

### Modo Supabase real

Crea/completa `.env.local` (no se commitea) con:

```env
NEXT_PUBLIC_SUPABASE_URL=<tu-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>   # solo servidor; para invitaciones
NEXT_PUBLIC_SITE_URL=http://localhost:3000        # redirect del magic link
```

```bash
npm run dev
# /auth/login mostrará el formulario real (no "Modo local activo")
```

Comprobación rápida de que estás en modo real: en `/auth/login` aparece el formulario Entrar/Crear cuenta. Si ves "Modo local activo", las variables no se están leyendo.

---

## 1. Confirmar migraciones y estructura

En **Dashboard → SQL Editor**, ejecuta como `postgres` los bloques de estructura (final de `supabase/validate_rls.sql`, sección 15/17):

- Tablas: deben existir `families, family_members, family_invites, children, events, tasks, lists, list_items, meal_plans, documents`.
- Triggers: `updated_at` por tabla + los de integridad cross-family (`list_items`, `events`, `documents`).
- Policies (`pg_policies`): RLS activo en las tablas privadas y en `storage.objects` (bucket `documents`).
- Funciones (`security_type = DEFINER`): `create_family_with_admin`, `update_my_family_profile`, `remove_family_member`, `update_family_member_role`, `accept_family_invite`.
- Bucket: `storage.buckets` muestra `documents` con `public = false`.

Marca en `supabase-validation.md` la sección "Migraciones" y la estructura.

---

## 2. Crear dos usuarios de prueba

**Dashboard → Authentication → Users → Add user** (con contraseña, marca email confirmado):

- `usuario-a@test.com`
- `usuario-b@test.com`

Apunta sus **UUID** (columna `id`). Los llamaremos `USER_A_ID` y `USER_B_ID`.

---

## 3. Crear dos familias y obtener los UUID

La forma más realista es **desde la app** (una sesión por usuario, mejor en dos navegadores/perfiles distintos):

1. Entra como Usuario A → onboarding → crea "Familia Test A".
2. Entra como Usuario B → onboarding → crea "Familia Test B".

Luego, en SQL Editor (como `postgres`), obtén los identificadores que usarás como placeholders:

```sql
SELECT f.id AS family_id, f.name, m.id AS member_id, m.user_id, m.role
FROM public.families f
JOIN public.family_members m ON m.family_id = f.id
ORDER BY f.created_at;
```

Anota: `FAMILY_A_ID`, `FAMILY_B_ID`, `MEMBER_A_ID` (miembro admin de A), etc.

---

## 4. Ejecutar los bloques de RLS y RPCs

Abre `supabase/validate_rls.sql`, **sustituye los placeholders** (`USER_A_ID`, `FAMILY_A_ID`, `MEMBER_A_ID`, …) por los UUID reales y ejecuta bloque a bloque. Cada bloque indica el resultado esperado en un comentario `-- ESPERADO:`.

Cubre, por orden:

| Sección | Qué valida | Debe pasar si… |
|---|---|---|
| 2 | RLS `families` | A no ve/edita la familia de B |
| 3 | RLS `family_members` | A no inserta miembros en B; DELETE directo da 0 filas |
| 4–9 | RLS del resto de tablas | cada usuario solo ve/crea en su familia |
| 10 | RLS `family_invites` | solo el admin invita en su familia |
| 11 | Triggers cross-family | rechaza `list_item`/`event`/`document` con IDs de otra familia |
| 12 | `remove_family_member` | no borra al único admin; no-admin no puede |
| 13 | `update_family_member_role` | no degrada al único admin; rol inválido falla |
| 14 | `update_my_family_profile` | A no edita el perfil de B |
| 16 | `accept_family_invite` | solo el email invitado; idempotente; estados inválidos fallan |

> Los bloques usan `BEGIN … ROLLBACK` para no dejar basura. Para el test 16 necesitas datos persistidos: cambia a `COMMIT` el bloque que crea la invitación (test 10) y limpia con `DELETE` al final.

---

## 5. Validación por navegador (aislamiento real)

Complementa el SQL con la prueba de extremo a extremo, que es la que de verdad importa:

1. Navegador 1 → Usuario A (Familia A): crea un evento, una tarea y una lista.
2. Navegador 2 (perfil distinto/incógnito) → Usuario B (Familia B).
3. Confirma que **B no ve nada de A** en ninguna sección y viceversa.
4. Como miembro **no admin**: verifica que no puede quitar miembros ni invitar (la UI de roles bloquea degradar al único admin; el servidor lo rechaza igualmente).

---

## 6. Storage privado (bucket `documents`)

Esto no se puede validar solo con SQL; usa el Dashboard:

1. Como Usuario A, sube un documento desde la app (sección Docs). Debe guardarse en `Storage → documents` con path `{family_id}/{document_id}/{filename}`.
2. Desde la app, pulsa **Abrir documento** → debe abrirse por signed URL.
3. **Dashboard → Storage → documents**: confirma que el bucket es **privado** (no público).
4. Prueba de fuga: como Usuario B, intenta generar una signed URL del objeto de A conociendo su path (por SQL o cliente). ESPERADO: falla / acceso denegado (la policy SELECT filtra por `family_id`).

---

## 7. Registrar resultados

Marca las casillas de `docs/supabase-validation.md` y, en su sección "Resultado", resume qué pasó y qué no. Con eso, la Fase 3 queda cerrada y el backend validado.

---

## Apéndice: problemas típicos

- **"Modo local activo" cuando esperabas el login real**: revisa que `.env.local` tenga URL y anon key válidas y reinicia `npm run dev` (las `NEXT_PUBLIC_*` se leen al arrancar).
- **La invitación por email no llega**: falta `SUPABASE_SERVICE_ROLE_KEY` o el proveedor de email de Supabase no está configurado (Auth → Email).
- **El magic link redirige mal**: ajusta `NEXT_PUBLIC_SITE_URL` y añade esa URL en Authentication → URL Configuration → Redirect URLs.
