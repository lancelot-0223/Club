// Tema claro/oscuro y estilo visual local
(() => {
    const THEME_KEY = "FILP-theme";
    const STYLE_KEY = "FILP-visual-theme";
    const root = document.documentElement;

    const apply = () => {
        root.dataset.theme = localStorage.getItem(THEME_KEY) || "dark";
        root.dataset.visualTheme = localStorage.getItem(STYLE_KEY) || "dark-academia";
        document.querySelectorAll('input[name="theme"]').forEach(input => {
            input.checked = input.value === root.dataset.theme;
        });
        const select = document.getElementById("visualTheme");
        if (select) select.value = root.dataset.visualTheme;
    };

    window.FILP = window.FILP || {};
    window.FILP.setTheme = value => { localStorage.setItem(THEME_KEY, value); apply(); };
    window.FILP.setVisualTheme = value => { localStorage.setItem(STYLE_KEY, value); apply(); };

    document.addEventListener("change", e => {
        if (e.target.matches('input[name="theme"]')) window.FILP.setTheme(e.target.value);
        if (e.target.id === "visualTheme") window.FILP.setVisualTheme(e.target.value);
    });
    apply();
})();
