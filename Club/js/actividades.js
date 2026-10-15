(() => {
    const client = window.FILP?.supabase;
    const list = document.getElementById("activitiesList");
    const upcoming = document.getElementById("upcomingActivities");
    if (!client) return;
    const escapeHTML = v => { const d=document.createElement("div"); d.textContent=v??""; return d.innerHTML; };
    (async () => {
        try {
            const {data,error}=await client.from("activities").select("*").order("date",{ascending:true});
            if(error) throw error;
            const html=(data||[]).map(a=>`<article class="activity-card"><h3>${escapeHTML(a.title)}</h3><p>${escapeHTML(a.description||"")}</p><time>${new Date(a.date).toLocaleString("es-DO")}</time></article>`).join("")||"<p>No hay actividades próximas.</p>";
            if(list) list.innerHTML=html;
            if(upcoming) upcoming.innerHTML=html;
        } catch(e){ console.warn(e.message); }
    })();
})();
