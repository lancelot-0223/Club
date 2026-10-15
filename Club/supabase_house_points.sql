-- CLUB DEL SPOILER
-- Puntos por CASA + acceso de presidencia mediante un único código.
-- No se crean cuentas de usuario para los miembros.
-- Ejecuta este archivo completo en Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.house_points (
    house_name text primary key,
    points integer not null default 0,
    constraint house_name_valid check (
        house_name in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor')
    ),
    constraint points_non_negative check (points >= 0)
);

insert into public.house_points (house_name, points) values
    ('Slytherin', 0),
    ('Ravenclaw', 0),
    ('Hufflepuff', 0),
    ('Gryffindor', 0)
on conflict (house_name) do nothing;

alter table public.house_points add column if not exists updated_at timestamptz not null default now();
alter table public.house_points enable row level security;

drop policy if exists "Public can read house points" on public.house_points;
create policy "Public can read house points"
on public.house_points
for select
to anon
using (true);

-- La configuración del código presidencial se crea de forma segura en
-- supabase_fix_president.sql. Ese archivo preserva cualquier hash existente.
create table if not exists public.president_config (
    id boolean primary key default true,
    code_hash text not null
);
alter table public.president_config enable row level security;
revoke all on public.president_config from public, anon, authenticated;

create or replace function public.verify_president_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
    stored_hash text;
begin
    if p_code is null or length(trim(p_code)) < 8 or length(trim(p_code)) > 128 then
        return false;
    end if;

    select code_hash into stored_hash
    from public.president_config
    where id::text in ('true', '1')
    limit 1;

    if stored_hash is null then
        return false;
    end if;

    return extensions.crypt(trim(p_code), stored_hash) = stored_hash;
end;
$$;

create or replace function public.adjust_house_points(
    p_house text,
    p_delta integer,
    p_code text
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
    stored_hash text;
    new_points integer;
begin
    if p_code is null or length(trim(p_code)) < 8 or length(trim(p_code)) > 128 then
        raise exception 'Código de presidencia incorrecto';
    end if;

    if p_house not in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor') then
        raise exception 'Casa no válida';
    end if;

    if p_delta is null or p_delta = 0 or abs(p_delta) > 10000 then
        raise exception 'Cantidad de puntos no válida';
    end if;

    select code_hash into stored_hash
    from public.president_config
    where id::text in ('true', '1')
    limit 1;

    if stored_hash is null
       or extensions.crypt(trim(p_code), stored_hash) <> stored_hash then
        raise exception 'Código de presidencia incorrecto';
    end if;

    update public.house_points
    set points = greatest(0, points + p_delta), updated_at = now()
    where house_name = p_house
    returning points into new_points;

    if new_points is null then
        raise exception 'No existe esa casa';
    end if;

    return new_points;
end;
$$;

-- Sin acceso directo a la tabla de puntos para escribir.
revoke insert, update, delete on public.house_points from anon, authenticated;

-- No se necesitan cuentas de Supabase: solo el rol anónimo puede invocar estas funciones.
revoke all on function public.verify_president_code(text) from public, authenticated;
revoke all on function public.adjust_house_points(text, integer, text) from public, authenticated;
grant execute on function public.verify_president_code(text) to anon;
grant execute on function public.adjust_house_points(text, integer, text) to anon;
