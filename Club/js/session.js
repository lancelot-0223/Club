// CLUB DEL SPOILER — navegación pública
(() => {
    const navLinks = `
        <a class="session-home" href="index.html"><img src="assets/logo-club.png" width="30" height="30" alt="Logo del Club del Spoiler"><span>Inicio</span></a>
        <a href="directiva.html">Directiva</a>
        <a href="casas.html">Casas</a>
        <a href="actividades.html">Actividades</a>
        <a href="reunion.html">Reunión</a>
        <a href="comunidad.html">Comunidad</a>
        <a class="nav-president" href="presidente.html">Presidencia</a>
    `;
    const nav = document.querySelector("[data-session-nav]");
    if (nav) nav.innerHTML = navLinks;
    document.dispatchEvent(new CustomEvent("FILP:ready"));
})();
