// ============================================
// CONFIGURACIÓN SUPABASE — CLUB DEL SPOILER
// ============================================

window.FILP = window.FILP || {};

window.FILP.supabaseUrl =
    "https://immmizrdmlnoldfougkd.supabase.co";

window.FILP.supabaseKey =
    "sb_publishable_9EdrF9zuIT0hDmC-3ABogQ_5U6_hzhp";

// La librería @supabase/supabase-js debe cargarse
// antes que este archivo.
if (typeof window.supabase === "undefined") {
    console.error("❌ La librería de Supabase no está cargada.");
    window.FILP.supabase = null;
} else {
    try {
        window.FILP.supabase = window.supabase.createClient(
            window.FILP.supabaseUrl,
            window.FILP.supabaseKey
        );

        console.log("✅ Supabase inicializado correctamente.");
    } catch (error) {
        window.FILP.supabase = null;
        console.error("❌ Error inicializando Supabase:", error);
    }
}
