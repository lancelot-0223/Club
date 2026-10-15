# Club del Spoiler — GitHub + Netlify

## GitHub
Sube el contenido de esta carpeta al repositorio, de modo que `index.html` quede en la raíz.

## Netlify
- Build command: vacío.
- Publish directory: `Club` si el repositorio contiene una carpeta `Club/`; si `index.html` está en la raíz, usa `.`.

No necesitas Node.js ni npm.

## Supabase
La configuración pública está en `js/config.js`. No pongas nunca una `service_role` ni una secret key en la web.

Para una instalación nueva, ejecuta `supabase_house_points.sql`, luego `supabase_fix_president.sql` (reemplaza el marcador del código solo en Supabase) y después `supabase_reparacion_segura.sql`.

Si ya tienes datos, ejecuta `supabase_reparacion_segura.sql`: no borra las puntuaciones ni reemplaza el código presidencial existente. Para cambiar el código explícitamente, usa `supabase_cambiar_codigo_presidente.sql`.
