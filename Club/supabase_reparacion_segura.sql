-- CLUB DEL SPOILER — MIGRACIÓN SEGURA DE MIEMBROS Y ASISTENCIA
-- Conserva puntos y código presidencial existente. No elimina datos.
-- Ejecutar una vez en Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

-- Crear las tablas base si es una instalación nueva; si ya existen, no se vacían.
create table if not exists public.president_config (
    id boolean primary key default true,
    code_hash text not null
);
alter table public.president_config enable row level security;
revoke all on table public.president_config from public, anon, authenticated;

create table if not exists public.house_points (
    house_name text primary key,
    points integer not null default 0,
    updated_at timestamptz not null default now(),
    constraint house_name_valid check (house_name in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor')),
    constraint points_non_negative check (points >= 0)
);
alter table public.house_points add column if not exists updated_at timestamptz not null default now();
insert into public.house_points (house_name, points) values
    ('Slytherin', 0), ('Ravenclaw', 0), ('Hufflepuff', 0), ('Gryffindor', 0)
on conflict (house_name) do nothing;
alter table public.house_points enable row level security;
drop policy if exists "Public can read house points" on public.house_points;
create policy "Public can read house points" on public.house_points for select to anon using (true);
grant select on public.house_points to anon;
revoke insert, update, delete on public.house_points from public, anon, authenticated;

create table if not exists public.club_members (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    casa text,
    activo boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.club_members add column if not exists nombre text;
alter table public.club_members add column if not exists casa text;
alter table public.club_members add column if not exists activo boolean not null default true;
alter table public.club_members add column if not exists created_at timestamptz not null default now();

create table if not exists public.club_attendance (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references public.club_members(id) on delete cascade,
    meeting_date date not null,
    status text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint attendance_unique_member_date unique (member_id, meeting_date)
);

alter table public.club_attendance add column if not exists updated_at timestamptz not null default now();

-- Reemplaza cualquier restricción antigua de estado para permitir excusado.
do $$
declare c record;
begin
    for c in
        select conname
        from pg_constraint
        where conrelid = 'public.club_attendance'::regclass
          and contype = 'c'
          and pg_get_constraintdef(oid) ilike '%status%'
    loop
        execute format('alter table public.club_attendance drop constraint %I', c.conname);
    end loop;
end;
$$;
alter table public.club_attendance
    add constraint attendance_status_valid check (status in ('present','absent','excused'));

create index if not exists club_attendance_date_idx on public.club_attendance(meeting_date);
create index if not exists club_attendance_member_idx on public.club_attendance(member_id);
create unique index if not exists club_attendance_member_date_unique on public.club_attendance(member_id, meeting_date);

alter table public.club_members enable row level security;
alter table public.club_attendance enable row level security;
drop policy if exists "Public can read active club members" on public.club_members;
create policy "Public can read active club members" on public.club_members for select to anon using (activo = true);
drop policy if exists "Public can read attendance" on public.club_attendance;
create policy "Public can read attendance" on public.club_attendance for select to anon using (true);
grant select on public.club_members, public.club_attendance to anon;
revoke insert, update, delete on public.club_members, public.club_attendance from public, anon, authenticated;

-- Soporta ambas variantes de president_config que se usaron antes (id boolean o integer).
create or replace function public.verify_president_code(p_code text)
returns boolean
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare stored_hash text;
begin
    if p_code is null or length(trim(p_code)) < 8 or length(trim(p_code)) > 128 then return false; end if;
    select code_hash into stored_hash from public.president_config
    where id::text in ('true', '1') limit 1;
    if stored_hash is null then return false; end if;
    return extensions.crypt(trim(p_code), stored_hash) = stored_hash;
end;
$$;

create or replace function public.adjust_house_points(p_house text, p_delta integer, p_code text)
returns integer
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare new_points integer;
begin
    if not public.verify_president_code(p_code) then raise exception 'Código de presidencia incorrecto'; end if;
    if p_house not in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor') then raise exception 'Casa no válida'; end if;
    if p_delta is null or p_delta = 0 or abs(p_delta) > 100 then raise exception 'Puedes cambiar como máximo 100 puntos por operación'; end if;
    update public.house_points set points = greatest(0, points + p_delta), updated_at = now()
    where house_name = p_house returning points into new_points;
    if new_points is null then raise exception 'No existe esa casa'; end if;
    return new_points;
end;
$$;

create or replace function public.add_club_member(p_name text, p_house text, p_code text)
returns uuid
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
declare new_id uuid;
begin
    if not public.verify_president_code(p_code) then raise exception 'Código de presidencia incorrecto'; end if;
    if p_name is null or char_length(trim(p_name)) < 1 or char_length(trim(p_name)) > 80 then raise exception 'Nombre no válido'; end if;
    if p_house is not null and p_house not in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor') then raise exception 'Casa no válida'; end if;
    insert into public.club_members(nombre, casa) values (trim(p_name), nullif(trim(p_house), '')) returning id into new_id;
    return new_id;
end;
$$;

create or replace function public.remove_club_member(p_member_id uuid, p_code text)
returns boolean
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
begin
    if not public.verify_president_code(p_code) then raise exception 'Código de presidencia incorrecto'; end if;
    delete from public.club_members where id = p_member_id;
    return found;
end;
$$;

create or replace function public.set_club_attendance(p_member_id uuid, p_date date, p_status text, p_code text)
returns boolean
language plpgsql security definer
set search_path = public, extensions, pg_temp
as $$
begin
    if not public.verify_president_code(p_code) then raise exception 'Código de presidencia incorrecto'; end if;
    if p_date is null or p_date < date '2026-10-20' then raise exception 'La asistencia comienza el martes 20 de octubre de 2026'; end if;
    if extract(isodow from p_date) <> 2 then raise exception 'La asistencia solo puede registrarse para martes'; end if;
    if p_status not in ('present','absent','excused') then raise exception 'Estado de asistencia no válido'; end if;
    if not exists (select 1 from public.club_members where id = p_member_id and activo = true) then raise exception 'Miembro no encontrado'; end if;
    insert into public.club_attendance(member_id, meeting_date, status, updated_at)
    values (p_member_id, p_date, p_status, now())
    on conflict (member_id, meeting_date) do update set status = excluded.status, updated_at = now();
    return true;
end;
$$;

revoke all on function public.verify_president_code(text) from public, authenticated;
revoke all on function public.adjust_house_points(text, integer, text) from public, authenticated;
revoke all on function public.add_club_member(text, text, text) from public, authenticated;
revoke all on function public.remove_club_member(uuid, text) from public, authenticated;
revoke all on function public.set_club_attendance(uuid, date, text, text) from public, authenticated;
grant execute on function public.verify_president_code(text) to anon;
grant execute on function public.adjust_house_points(text, integer, text) to anon;
grant execute on function public.add_club_member(text, text, text) to anon;
grant execute on function public.remove_club_member(uuid, text) to anon;
grant execute on function public.set_club_attendance(uuid, date, text, text) to anon;

notify pgrst, 'reload schema';
