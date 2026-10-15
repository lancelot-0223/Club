(() => {
    const client=window.FILP?.supabase;
    if(!client) return;
    const map={presidente:"presidenteNombre",vicepresidente:"vicepresidenteNombre",secretaria:"secretariaNombre",tesorera:"tesoreraNombre",vocal1:"vocal1Nombre",vocal2:"vocal2Nombre",vocal3:"vocal3Nombre"};
    (async()=>{ try {
        const {data,error}=await client.from("profiles").select("nombre,rol").in("rol",Object.keys(map));
        if(error) throw error;
        (data||[]).forEach(p=>{const id=map[p.rol];if(id)document.getElementById(id).textContent=p.nombre||"Por asignar";});
    } catch(e){console.warn(e.message);} })();
})();
