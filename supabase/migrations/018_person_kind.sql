-- Abuelos: adultos de la familia que no entran en la app.
--
-- Hasta ahora un adulto solo podía existir como `family_members`, y esa tabla
-- cuelga de `auth.users` con `user_id not null`: para estar en ella hay que
-- tener correo y cuenta. Una abuela que recoge a los niños los martes no tiene
-- ni una cosa ni la otra, y sin embargo hay que poder asignarle cosas.
--
-- No se hace tabla nueva ni se permite `family_members` sin usuario. La 012 ya
-- dejó dicho dónde está la frontera: «un miembro tiene cuenta y entra en la
-- app; un hijo es alguien de quien la familia lleva registro». El eje real no
-- es adulto/niño, es con cuenta/sin cuenta, y `children` es ya la tabla de las
-- personas sin cuenta: tiene nombre, color, asignación por `child_id` en
-- eventos, tareas y documentos, y sus triggers de integridad entre familias.
-- Solo le faltaba distinguir de quién se lleva registro.
--
-- Por eso `kind` va aquí y no en otro sitio: un abuelo se asigna, se pinta y se
-- borra exactamente igual que un hijo. Lo único que cambia es dónde sale en
-- Ajustes y cómo se le llama.

alter table public.children
  add column if not exists kind text not null default 'hijo';

alter table public.children
  drop constraint if exists children_kind_valido;
alter table public.children
  add constraint children_kind_valido check (kind in ('hijo', 'adulto'));
