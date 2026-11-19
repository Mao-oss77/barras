-- ===== TABLA DEL XP EN SUPABASE =====
-- Cómo usarlo: en Supabase, ir a "SQL Editor", pegar todo este archivo y oprimir "Run".
-- Solo se corre UNA vez (si se corre otra vez, avisa que la tabla ya existe).
--
-- Cada fila es un MOVIMIENTO de XP: lo que gané al llenar una barra, lo que devolví con Deshacer,
-- la bienvenida, y (más adelante) lo que gaste en la tienda. El saldo es la suma de todas.
-- Nunca se cambian ni se borran filas: solo se agregan. Así lo de varios dispositivos se suma sin pisarse.

create table public.xp (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id       text not null,                    -- Identificador del movimiento (lo inventa la app; "bienvenida" es fijo)
  hora     bigint not null,                  -- Cuándo pasó (milisegundos desde 1970, como la app)
  cantidad integer not null,                 -- Positivo si gané, negativo si devolví o gasté
  motivo   text not null,                    -- 'bienvenida', 'barra', 'deshacer' (y después 'tienda')
  barra_id text,                             -- De qué barra vino (si vino de una)
  primary key (user_id, id)
);

-- ===== REGLA: CADA QUIEN SOLO TOCA LO SUYO =====
alter table public.xp enable row level security;

create policy "Cada quien maneja su XP" on public.xp
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
