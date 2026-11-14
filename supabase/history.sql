-- =====================================================================
-- Pizarra Digital — "Clases pasadas": historial de pizarras de cada usuario
-- Ejecuta este archivo DESPUÉS de schema.sql y collab.sql (Supabase → SQL Editor → Run).
-- Es idempotente y solo añade: no modifica ninguna tabla, función ni política existente.
-- =====================================================================

-- Una fila por (usuario, pizarra): pizarras que creó o a las que se unió con código (ya aprobado).
create table if not exists public.board_history (
  user_id          uuid not null references auth.users (id) on delete cascade,
  board_id         text not null references public.boards (id) on delete cascade,
  role             text not null check (role in ('owner', 'guest')),
  board_name       text not null default '',   -- último nombre conocido
  teacher_name     text not null default '',   -- nombre del profesor/creador
  board_created_at timestamptz,                -- fecha de creación de la pizarra
  first_seen_at    timestamptz not null default now(),   -- cuándo la creó o se unió
  last_access_at   timestamptz not null default now(),   -- último acceso
  primary key (user_id, board_id)
);

create index if not exists board_history_user_idx on public.board_history (user_id, last_access_at desc);

alter table public.board_history enable row level security;

-- Cada usuario ve y puede quitar solo su historial. Las altas pasan por touch_board_history().
drop policy if exists "historial: leer el propio" on public.board_history;
create policy "historial: leer el propio" on public.board_history
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "historial: borrar el propio" on public.board_history;
create policy "historial: borrar el propio" on public.board_history
  for delete to authenticated using (user_id = (select auth.uid()));

-- Registra (o actualiza el último acceso de) una pizarra en el historial del usuario actual.
-- Solo si es el propietario o un participante aprobado; si no, no hace nada.
create or replace function public.touch_board_history(p_board_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_owner uuid;
  v_created timestamptz;
  v_role text;
  v_teacher text;
begin
  if v_uid is null then
    return;
  end if;

  select b.name, b.owner_id, b.created_at into v_name, v_owner, v_created
    from public.boards b where b.id = p_board_id;
  if v_owner is null then
    return;
  end if;

  if v_owner = v_uid then
    v_role := 'owner';
  elsif public.is_board_member(p_board_id) then
    v_role := 'guest';
  else
    return;
  end if;

  select coalesce(nullif(p.name, ''), 'Profesor') into v_teacher from public.profiles p where p.id = v_owner;

  insert into public.board_history as h (user_id, board_id, role, board_name, teacher_name, board_created_at)
  values (v_uid, p_board_id, v_role, coalesce(v_name, ''), coalesce(v_teacher, 'Profesor'), v_created)
  on conflict (user_id, board_id) do update
    set role             = excluded.role,
        board_name       = excluded.board_name,
        teacher_name     = excluded.teacher_name,
        board_created_at = excluded.board_created_at,
        last_access_at   = now();
end;
$$;

-- Historial del usuario actual con el nombre de la pizarra y del profesor al día,
-- y si todavía tiene acceso (propietario o participante aprobado).
create or replace function public.list_board_history()
returns table (
  board_id text,
  role text,
  board_name text,
  teacher_name text,
  board_created_at timestamptz,
  first_seen_at timestamptz,
  last_access_at timestamptz,
  has_access boolean
)
language sql stable security definer set search_path = '' as $$
  select h.board_id,
         h.role,
         coalesce(b.name, h.board_name),
         coalesce(nullif(p.name, ''), h.teacher_name),
         coalesce(b.created_at, h.board_created_at),
         h.first_seen_at,
         h.last_access_at,
         (b.owner_id = (select auth.uid()) or public.is_board_member(h.board_id))
    from public.board_history h
    join public.boards b on b.id = h.board_id
    left join public.profiles p on p.id = b.owner_id
   where h.user_id = (select auth.uid())
   order by h.last_access_at desc;
$$;

revoke all on function public.touch_board_history(text) from public, anon;
revoke all on function public.list_board_history() from public, anon;
grant execute on function public.touch_board_history(text) to authenticated;
grant execute on function public.list_board_history() to authenticated;
