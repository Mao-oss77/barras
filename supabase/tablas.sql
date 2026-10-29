-- ===== TABLAS DE LA APP DE BARRAS EN SUPABASE =====
-- Cómo usarlo: en Supabase, ir a "SQL Editor", pegar todo este archivo y oprimir "Run".
-- Solo se corre UNA vez (si se corre otra vez, avisa que las tablas ya existen).
--
-- Las horas se guardan en milisegundos desde 1970, igual que en la app (Date.now()).
-- Para leerlas como fecha en una consulta: to_timestamp(hora / 1000.0)
--
-- SEGURIDAD: cada fila lleva el usuario dueño (user_id), y las reglas de abajo ("policies")
-- hacen que cada persona solo pueda ver, crear, cambiar y borrar SUS filas.
-- Por eso la llave pública puede ir a la vista en el código de la página.


-- ===== GRUPOS (LAS PESTAÑAS) =====
create table public.grupos (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null,                 -- El mismo id que usa la app ("satisfaccion", "grupo1793...")
  nombre      text not null,
  orden       integer not null default 0,    -- Puesto de la pestaña (0 = la primera)
  actualizado timestamptz not null default now(),
  primary key (user_id, id)
);


-- ===== BARRAS =====
create table public.barras (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id          text not null,                 -- El mismo id que usa la app ("series", "barra1793...")
  grupo_id    text not null,                 -- En qué grupo está
  nombre      text not null,
  boton       text not null,                 -- Texto del botón de llenar
  tipo        text not null check (tipo in ('clic', 'arrastre', 'niveles')),
  duracion    bigint not null,               -- Cuánto tarda en vaciarse (milisegundos)
  unidad      text not null default 'dias',  -- Cómo se muestra la duración en Ajustes: 'horas' o 'dias'
  ultima_vez  bigint not null,               -- Hora en que estaría llena (de aquí sale qué tan llena está)
  rellenos    jsonb not null default '[]',   -- Solo barras con niveles: hora de cada relleno que contó
  orden       integer not null default 0,    -- Puesto de la tarjeta
  creada      bigint,                        -- Cuándo se creó la barra (las muy viejas no lo tienen)
  actualizado timestamptz not null default now(),
  primary key (user_id, id)
);


-- ===== HISTORIAL (CADA VEZ QUE LLENO UNA BARRA) =====
-- No se muestra en la pantalla principal: es para el informe.
create table public.historial (
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  barra_id text not null,
  hora     bigint not null,                  -- Cuándo la llené
  antes    smallint not null,                -- Nivel antes (0 a 100)
  despues  smallint not null,                -- Nivel después (0 a 100)
  primary key (user_id, barra_id, hora)
);


-- ===== REGLAS: CADA QUIEN SOLO TOCA LO SUYO =====
alter table public.grupos    enable row level security;
alter table public.barras    enable row level security;
alter table public.historial enable row level security;

create policy "Cada quien maneja sus grupos" on public.grupos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Cada quien maneja sus barras" on public.barras
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Cada quien maneja su historial" on public.historial
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
