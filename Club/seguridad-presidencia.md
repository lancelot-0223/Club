# Seguridad de Presidencia

- El código presidencial no se guarda en JavaScript ni en el repositorio. Supabase conserva solamente su hash.
- No ejecutes scripts antiguos que contengan `DROP TABLE public.president_config` ni compartas tu código privado.
- En una instalación nueva, configura primero `supabase_house_points.sql` y luego `supabase_fix_president.sql`; cambia el marcador `CAMBIA_ESTE_CODIGO_PRIVADO` solo en el editor SQL de Supabase.
- Para reparar el proyecto existente sin borrar puntuaciones ni reemplazar el código, ejecuta `supabase_reparacion_segura.sql`.
- Las operaciones de puntos, miembros y asistencia validan el código también en el servidor. El navegador por sí solo no autoriza cambios.
