-- CLUB DEL SPOILER — configuración segura de Presidencia
-- NO elimina tablas, NO borra puntos y NO reemplaza un código que ya exista.
-- En una instalación nueva, cambia CAMBIA_ESTE_CODIGO_PRIVADO por tu código
-- privado antes de ejecutar este archivo. No lo publiques en GitHub.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.president_config (
    id boolean primary key default true,
    code_hash text not null
);

-- Solo inicializa el código si todavía no existe ninguna fila.
-- También funciona si una instalación anterior creó id como integer.
do $$
declare
    initial_code text := 'CAMBIA_ESTE_CODIGO_PRIVADO';
    id_data_type text;
    has_config boolean;
begin
    select data_type into id_data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'president_config'
      and column_name = 'id';

    execute 'select exists (select 1 from public.president_config where code_hash is not null)'
       into has_config;

    if not has_config then
        if initial_code = 'CAMBIA_ESTE_CODIGO_PRIVADO' then
            raise exception 'Antes de ejecutar: reemplaza CAMBIA_ESTE_CODIGO_PRIVADO por tu código privado.';
        end if;

        if id_data_type = 'boolean' then
            insert into public.president_config (id, code_hash)
            values (true, extensions.crypt(initial_code, extensions.gen_salt('bf')))
            on conflict do nothing;
        else
            execute 'insert into public.president_config (id, code_hash) values (1, $1) on conflict do nothing'
            using extensions.crypt(initial_code, extensions.gen_salt('bf'));
        end if;
    end if;
end;
$$;

alter table public.president_config enable row level security;
revoke all on table public.president_config from public, anon, authenticated;

create table if not exists public.house_points (
    house_name text primary key,
    points integer not null default 0,
    constraint house_name_valid check (
        house_name in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor')
    ),
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

create or replace function public.verify_president_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare stored_hash text;
begin
    if p_code is null or length(trim(p_code)) < 8 or length(trim(p_code)) > 128 then
        return false;
    end if;

    select code_hash into stored_hash
    from public.president_config
    where id::text in ('true', '1')
    limit 1;

    if stored_hash is null then return false; end if;
    return extensions.crypt(trim(p_code), stored_hash) = stored_hash;
end;
$$;

create or replace function public.adjust_house_points(
    p_house text, p_delta integer, p_code text
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare new_points integer;
begin
    if not public.verify_president_code(p_code) then
        raise exception 'Código de presidencia incorrecto';
    end if;
    if p_house not in ('Slytherin','Ravenclaw','Hufflepuff','Gryffindor') then
        raise exception 'Casa no válida';
    end if;
    if p_delta is null or p_delta = 0 or abs(p_delta) > 100 then
        raise exception 'Puedes cambiar como máximo 100 puntos por operación';
    end if;

    update public.house_points
    set points = greatest(0, points + p_delta), updated_at = now()
    where house_name = p_house
    returning points into new_points;

    if new_points is null then raise exception 'No existe esa casa'; end if;
    return new_points;
end;
$$;

revoke all on function public.verify_president_code(text) from public, authenticated;
revoke all on function public.adjust_house_points(text, integer, text) from public, authenticated;
grant execute on function public.verify_president_code(text) to anon;
grant execute on function public.adjust_house_points(text, integer, text) to anon;

notify pgrst, 'reload schema';
