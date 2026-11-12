-- =====================================================================
-- Pizarra Digital — esquema de Supabase
-- Pega este archivo completo en Supabase → SQL Editor → New query → Run.
-- Se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Perfiles (uno por usuario de Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  name             text not null default '',
  avatar           jsonb,
  terms_acceptance jsonb,                          -- última versión aceptada y fecha
  consent_log      jsonb not null default '[]'::jsonb, -- historial de aceptaciones
  welcome_seeded   boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "perfil: leer el propio" on public.profiles;
create policy "perfil: leer el propio" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "perfil: actualizar el propio" on public.profiles;
create policy "perfil: actualizar el propio" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Crea el perfil automáticamente al registrarse, con el nombre, el avatar y la
-- aceptación de términos enviados en los metadatos del registro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar, terms_acceptance, consent_log)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    new.raw_user_meta_data -> 'avatar',
    new.raw_user_meta_data -> 'terms_acceptance',
    case
      when new.raw_user_meta_data ? 'terms_acceptance'
        then jsonb_build_array(new.raw_user_meta_data -> 'terms_acceptance')
      else '[]'::jsonb
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Pizarras
-- ---------------------------------------------------------------------
create table if not exists public.boards (
  id            text primary key,
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  background    text not null default 'white',
  elements      jsonb not null default '[]'::jsonb,
  viewport      jsonb,
  thumbnail     text,
  element_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists boards_owner_updated_idx on public.boards (owner_id, updated_at desc);

alter table public.boards enable row level security;

drop policy if exists "pizarras: leer las propias" on public.boards;
create policy "pizarras: leer las propias" on public.boards
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists "pizarras: crear propias" on public.boards;
create policy "pizarras: crear propias" on public.boards
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists "pizarras: editar las propias" on public.boards;
create policy "pizarras: editar las propias" on public.boards
  for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

drop policy if exists "pizarras: borrar las propias" on public.boards;
create policy "pizarras: borrar las propias" on public.boards
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- ---------------------------------------------------------------------
-- 3. Imágenes: bucket privado, una carpeta por usuario (<id de usuario>/<id de imagen>)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagenes: leer las propias" on storage.objects;
create policy "imagenes: leer las propias" on storage.objects
  for select to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "imagenes: subir propias" on storage.objects;
create policy "imagenes: subir propias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "imagenes: actualizar las propias" on storage.objects;
create policy "imagenes: actualizar las propias" on storage.objects
  for update to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "imagenes: borrar las propias" on storage.objects;
create policy "imagenes: borrar las propias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- 4. Borrar la propia cuenta (perfil y pizarras se borran en cascada;
--    la app borra antes las imágenes del almacenamiento).
-- ---------------------------------------------------------------------
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'No hay sesión iniciada';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
