-- Cambiar el código presidencial sin borrar tablas ni puntuaciones.
-- Reemplaza CAMBIA_AQUI_POR_TU_NUEVO_CODIGO por tu nuevo código privado.
-- Ejecuta esto solo en el SQL Editor de Supabase; no publiques tu código.
do $$
declare
    new_code text := 'lancelot_president0223';
    changed integer;
begin
    if new_code = 'lancelot_president0223' or length(trim(new_code)) < 8 or length(trim(new_code)) > 128 then
        raise exception 'Reemplaza el marcador por un código de entre 8 y 128 caracteres.';
    end if;

    update public.president_config
    set code_hash = extensions.crypt(trim(new_code), extensions.gen_salt('bf'))
    where id::text in ('true', '1');

    get diagnostics changed = row_count;
    if changed = 0 then
        raise exception 'No existe configuración presidencial. Ejecuta primero supabase_fix_president.sql con tu nuevo código.';
    end if;
end;
$$;
