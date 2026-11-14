-- =====================================================================
-- Pizarra Digital — acceso por código y permisos en tiempo real
-- Ejecuta este archivo DESPUÉS de schema.sql (Supabase → SQL Editor → Run).
-- Es idempotente: se puede ejecutar varias veces sin romper nada.
-- No modifica ninguna tabla ni política existente: solo añade.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------

-- Código de acceso de cada pizarra compartida (uno por pizarra).
create table if not exists public.board_shares (
  board_id   text primary key references public.boards (id) on delete cascade,
  code       text not null unique,
  enabled    boolean not null default true,   -- false: no se aceptan solicitudes nuevas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Participantes (estudiantes) de cada pizarra, su estado y sus permisos.
create table if not exists public.board_members (
  board_id     text not null references public.boards (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar       jsonb,
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected', 'removed')),
  can_write    boolean not null default false,   -- puedeEscribir
  can_upload   boolean not null default false,   -- puedeSubirFotos
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  primary key (board_id, user_id)
);

create index if not exists board_members_user_idx on public.board_members (user_id);

alter table public.board_shares enable row level security;
alter table public.board_members enable row level security;

-- ---------------------------------------------------------------------
-- 2. Funciones auxiliares (security definer: evitan recursión entre políticas)
-- ---------------------------------------------------------------------

create or replace function public.is_board_owner(p_board_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards b where b.id = p_board_id and b.owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_board_member(p_board_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.board_members m
     where m.board_id = p_board_id and m.user_id = (select auth.uid()) and m.status = 'approved'
  );
$$;

create or replace function public.can_write_board(p_board_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_board_owner(p_board_id) or exists (
    select 1 from public.board_members m
     where m.board_id = p_board_id and m.user_id = (select auth.uid())
       and m.status = 'approved' and m.can_write
  );
$$;

-- ¿Puede el usuario actual leer las imágenes de la carpeta de `p_folder` (id del profesor)?
create or replace function public.can_read_shared_images(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards b
      join public.board_members m on m.board_id = b.id
     where b.owner_id::text = p_folder and m.user_id = (select auth.uid()) and m.status = 'approved'
  );
$$;

-- ¿Puede el usuario actual subir imágenes a la carpeta del profesor `p_folder`?
create or replace function public.can_upload_shared_images(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.boards b
      join public.board_members m on m.board_id = b.id
     where b.owner_id::text = p_folder and m.user_id = (select auth.uid())
       and m.status = 'approved' and m.can_upload
  );
$$;

-- Canal de tiempo real privado "board:<id de pizarra>": solo propietario y participantes aprobados.
create or replace function public.can_join_board_channel(p_topic text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_topic like 'board:%'
     and (public.is_board_owner(substr(p_topic, 7)) or public.is_board_member(substr(p_topic, 7)));
$$;

-- Código de 6 caracteres sin caracteres confusos (sin I, O, 0, 1). 32 símbolos → sin sesgo.
create or replace function public.gen_board_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(6);
  result text := '';
begin
  for i in 0..5 loop
    result := result || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Políticas RLS
-- ---------------------------------------------------------------------

-- Códigos: solo el propietario los ve. Se crean/cambian mediante funciones (sección 4).
drop policy if exists "codigos: leer los propios" on public.board_shares;
create policy "codigos: leer los propios" on public.board_shares
  for select to authenticated using (public.is_board_owner(board_id));

-- Participantes: cada uno ve su fila; el profesor ve todas las de sus pizarras;
-- los aprobados ven a los demás aprobados (nombres y permisos para la sesión en vivo).
drop policy if exists "participantes: leer" on public.board_members;
create policy "participantes: leer" on public.board_members
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.is_board_owner(board_id)
    or (status = 'approved' and public.is_board_member(board_id))
  );

-- Solo el profesor aprueba, rechaza, retira y cambia permisos.
drop policy if exists "participantes: gestionar (profesor)" on public.board_members;
create policy "participantes: gestionar (profesor)" on public.board_members
  for update to authenticated
  using (public.is_board_owner(board_id)) with check (public.is_board_owner(board_id));

-- El profesor puede borrar filas; el estudiante puede salir (borrar la suya).
drop policy if exists "participantes: borrar" on public.board_members;
create policy "participantes: borrar" on public.board_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_board_owner(board_id));

-- Pizarras: los participantes aprobados pueden LEER la pizarra compartida.
-- (Escribir solo es posible mediante apply_board_ops, que valida el permiso.)
drop policy if exists "pizarras: leer compartidas" on public.boards;
create policy "pizarras: leer compartidas" on public.boards
  for select to authenticated using (public.is_board_member(id));

-- Imágenes: los participantes leen la carpeta del profesor y, con permiso, suben a ella.
drop policy if exists "imagenes: leer compartidas" on storage.objects;
create policy "imagenes: leer compartidas" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and public.can_read_shared_images((storage.foldername(name))[1]));

drop policy if exists "imagenes: subir a pizarra compartida" on storage.objects;
create policy "imagenes: subir a pizarra compartida" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and public.can_upload_shared_images((storage.foldername(name))[1]));

-- Tiempo real (canales privados): solo propietario y participantes aprobados escuchan y envían.
drop policy if exists "tiempo real: pizarra compartida (leer)" on realtime.messages;
create policy "tiempo real: pizarra compartida (leer)" on realtime.messages
  for select to authenticated
  using (realtime.messages.extension in ('broadcast', 'presence') and public.can_join_board_channel((select realtime.topic())));

drop policy if exists "tiempo real: pizarra compartida (enviar)" on realtime.messages;
create policy "tiempo real: pizarra compartida (enviar)" on realtime.messages
  for insert to authenticated
  with check (realtime.messages.extension in ('broadcast', 'presence') and public.can_join_board_channel((select realtime.topic())));

-- ---------------------------------------------------------------------
-- 4. Funciones RPC
-- ---------------------------------------------------------------------

-- Activa (o regenera) el código de una pizarra. Solo el propietario.
create or replace function public.enable_board_code(p_board_id text, p_regenerate boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text;
  v_tries int := 0;
begin
  if not public.is_board_owner(p_board_id) then
    raise exception 'Solo el propietario puede compartir esta pizarra.';
  end if;

  select code into v_code from public.board_shares where board_id = p_board_id;
  if v_code is not null and not p_regenerate then
    update public.board_shares set enabled = true, updated_at = now() where board_id = p_board_id;
    return v_code;
  end if;

  loop
    v_code := public.gen_board_code();
    begin
      insert into public.board_shares (board_id, code) values (p_board_id, v_code)
      on conflict (board_id) do update set code = excluded.code, enabled = true, updated_at = now();
      return v_code;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries > 10 then raise; end if;
    end;
  end loop;
end;
$$;

-- Desactiva el código: no se aceptan solicitudes nuevas (los aprobados siguen dentro).
create or replace function public.disable_board_code(p_board_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_board_owner(p_board_id) then
    raise exception 'Solo el propietario puede cambiar el código.';
  end if;
  update public.board_shares set enabled = false, updated_at = now() where board_id = p_board_id;
end;
$$;

-- El estudiante solicita unirse con un código. Devuelve la pizarra y el estado de su solicitud.
create or replace function public.request_board_join(p_code text)
returns table (joined_board_id text, board_name text, member_status text)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_board text;
  v_owner uuid;
  v_name text;
  v_status text;
  v_profile_name text;
  v_profile_avatar jsonb;
begin
  if v_uid is null then
    raise exception 'No hay sesión iniciada.';
  end if;

  select s.board_id, b.owner_id, b.name into v_board, v_owner, v_name
    from public.board_shares s
    join public.boards b on b.id = s.board_id
   where s.code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
     and s.enabled;

  if v_board is null then
    raise exception 'Código no válido o desactivado.';
  end if;

  if v_owner = v_uid then
    return query select v_board, v_name, 'owner'::text;
    return;
  end if;

  select p.name, p.avatar into v_profile_name, v_profile_avatar from public.profiles p where p.id = v_uid;

  insert into public.board_members as m (board_id, user_id, display_name, avatar)
  values (v_board, v_uid, coalesce(v_profile_name, ''), v_profile_avatar)
  on conflict (board_id, user_id) do update
    set status       = case when m.status in ('rejected', 'removed') then 'pending' else m.status end,
        requested_at = case when m.status in ('rejected', 'removed') then now() else m.requested_at end,
        display_name = excluded.display_name,
        avatar       = excluded.avatar
  returning m.status into v_status;

  return query select v_board, v_name, v_status;
end;
$$;

-- Aplica cambios por elemento (alta/modificación, borrado, orden) de forma atómica.
-- Lo usan el profesor y los estudiantes con permiso de escritura en pizarras compartidas,
-- para que dos personas dibujando a la vez no se sobrescriban.
create or replace function public.apply_board_ops(
  p_board_id text,
  p_upserts  jsonb default '[]'::jsonb,
  p_deletes  text[] default '{}',
  p_order    text[] default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_els jsonb;
  v_new jsonb;
  v_ups jsonb := coalesce(p_upserts, '[]'::jsonb);
  v_dels text[] := coalesce(p_deletes, '{}');
begin
  if not public.can_write_board(p_board_id) then
    raise exception 'No tienes permiso para escribir en esta pizarra.';
  end if;
  if jsonb_typeof(v_ups) <> 'array' or jsonb_array_length(v_ups) > 5000 or coalesce(array_length(v_dels, 1), 0) > 5000 then
    raise exception 'Cambios no válidos.';
  end if;
  if exists (select 1 from jsonb_array_elements(v_ups) x
              where jsonb_typeof(x.value) <> 'object' or coalesce(x.value ->> 'id', '') = '') then
    raise exception 'Cada elemento debe tener un id.';
  end if;

  select b.elements into v_els from public.boards b where b.id = p_board_id for update;
  if v_els is null then
    raise exception 'La pizarra no existe.';
  end if;

  select coalesce(jsonb_agg(m.e order by
           case when p_order is null then 0
                else coalesce(array_position(p_order, m.e ->> 'id'), 2147483647) end,
           m.grp, m.ord), '[]'::jsonb)
    into v_new
    from (
      -- elementos existentes (reemplazados si llegan modificados), salvo los borrados
      select coalesce(u.value, c.value) as e, c.ord as ord, 0 as grp
        from jsonb_array_elements(v_els) with ordinality as c(value, ord)
        left join lateral (
          select x.value from jsonb_array_elements(v_ups) x where x.value ->> 'id' = c.value ->> 'id' limit 1
        ) u on true
       where not (coalesce(c.value ->> 'id', '') = any (v_dels))
      union all
      -- elementos nuevos, al final
      select x.value, x.ord, 1
        from jsonb_array_elements(v_ups) with ordinality as x(value, ord)
       where not exists (select 1 from jsonb_array_elements(v_els) c2 where c2.value ->> 'id' = x.value ->> 'id')
         and not ((x.value ->> 'id') = any (v_dels))
    ) m;

  update public.boards
     set elements = v_new,
         element_count = (select count(*) from jsonb_array_elements(v_new) e where e.value ->> 'type' <> 'erase'),
         updated_at = now()
   where id = p_board_id;
end;
$$;

-- Permisos de ejecución: nada para anónimos.
revoke all on function public.is_board_owner(text) from public, anon;
revoke all on function public.is_board_member(text) from public, anon;
revoke all on function public.can_write_board(text) from public, anon;
revoke all on function public.can_read_shared_images(text) from public, anon;
revoke all on function public.can_upload_shared_images(text) from public, anon;
revoke all on function public.can_join_board_channel(text) from public, anon;
revoke all on function public.gen_board_code() from public, anon, authenticated;
revoke all on function public.enable_board_code(text, boolean) from public, anon;
revoke all on function public.disable_board_code(text) from public, anon;
revoke all on function public.request_board_join(text) from public, anon;
revoke all on function public.apply_board_ops(text, jsonb, text[], text[]) from public, anon;

grant execute on function public.is_board_owner(text) to authenticated;
grant execute on function public.is_board_member(text) to authenticated;
grant execute on function public.can_write_board(text) to authenticated;
grant execute on function public.can_read_shared_images(text) to authenticated;
grant execute on function public.can_upload_shared_images(text) to authenticated;
grant execute on function public.can_join_board_channel(text) to authenticated;
grant execute on function public.enable_board_code(text, boolean) to authenticated;
grant execute on function public.disable_board_code(text) to authenticated;
grant execute on function public.request_board_join(text) to authenticated;
grant execute on function public.apply_board_ops(text, jsonb, text[], text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Tiempo real: avisos de solicitudes y cambios de permisos (postgres_changes)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'board_members'
  ) then
    alter publication supabase_realtime add table public.board_members;
  end if;
end;
$$;
