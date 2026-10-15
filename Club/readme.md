# Club del Spoiler — versión sin cuentas

El sitio público muestra las casas, los puntos y la comunidad. La presidencia puede modificar puntos y administrar miembros/asistencias usando un código verificado por Supabase.

## Configuración / reparación de Supabase

### Instalación nueva
1. Revisa `js/config.js`: debe contener la URL y la publishable/anon key del proyecto. Nunca pongas una `service_role` o secret key en el navegador.
2. En el SQL Editor de Supabase ejecuta `supabase_house_points.sql`.
3. Abre `supabase_fix_president.sql`, cambia `CAMBIA_ESTE_CODIGO_PRIVADO` por tu código privado y ejecuta el archivo en Supabase. No subas ese código real a GitHub.
4. Ejecuta `supabase_reparacion_segura.sql` para crear/reparar los miembros y la asistencia.
5. Publica la carpeta `Club`.

### Proyecto existente
- Ejecuta únicamente `supabase_reparacion_segura.sql` para reparar la asistencia y los RPC sin borrar puntuaciones ni reemplazar el hash del código actual.
- Si necesitas cambiar el código, usa `supabase_cambiar_codigo_presidente.sql` y reemplaza su marcador por tu nuevo código privado.
- No ejecutes scripts antiguos que borren `president_config`; este proyecto ya no necesita borrar esa tabla para reparar el acceso.

## Funciones
- Puntos de casas: añadir o quitar puntos, con validación del código en el servidor.
- Comunidad: añadir y quitar miembros, y marcar Presente, Ausente o Excusado.
- Asistencia: los filtros de año y martes muestran un encuentro a la vez para evitar una lista interminable.
- El código presidencial se guarda como hash en Supabase; no está escrito en JavaScript ni se guarda en `sessionStorage`.

### Tiempo
- Esto me llevo mucho tiempo, we. por favor no lo dañen.
