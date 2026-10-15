(() => {
    "use strict";

    // ==========================================
    // CONFIGURACIÓN
    // ==========================================

    const client = window.FILP?.supabase;

    let presidentCode = null;

    const CONNECTION_TIMEOUT = 8000;

    // ==========================================
    // ELEMENTOS
    // ==========================================

    const gate = document.getElementById("presidentGate");
    const panel = document.getElementById("presidentPanel");

    const loginForm = document.getElementById("presidentLoginForm");
    const loginMessage = document.getElementById("presidentLoginMessage");

    const pointsForm = document.getElementById("pointsForm");
    const removeButton = document.getElementById("removePointsButton");
    const logoutButton = document.getElementById("presidentLogout");

    const pointsMessage = document.getElementById("pointsMessage");

    const toggleCode = document.getElementById("togglePresidentCode");
    const codeInput = document.getElementById("presidentCode");

    const connectionStatus = document.getElementById("connectionStatus");

    const totalPoints = document.getElementById("totalPoints");
    const houseAdminList = document.getElementById("houseAdminList");

    // ==========================================
    // CASAS
    // ==========================================

    const houses = [
        "Slytherin",
        "Ravenclaw",
        "Hufflepuff",
        "Gryffindor"
    ];

    const icons = {
        Slytherin: "🐍",
        Ravenclaw: "🦅",
        Hufflepuff: "🦡",
        Gryffindor: "🦁"
    };

    // ==========================================
    // MENSAJES
    // ==========================================

    function setMessage(element, text, type = "") {
        if (!element) return;

        element.textContent = text;
        element.className = `auth-message ${type}`.trim();
    }

    function setConnection(text, ok = false, type = "") {
        if (!connectionStatus) return;

        connectionStatus.textContent = text;

        connectionStatus.className =
            `connection-status ${ok ? "ok" : ""} ${type}`.trim();
    }

    // ==========================================
    // PANEL
    // ==========================================

    function showPanel(visible) {
        if (gate) {
            gate.hidden = visible;
        }

        if (panel) {
            panel.hidden = !visible;
        }
    }

    // ==========================================
    // TIMEOUT PARA SUPABASE
    // ==========================================

    async function withTimeout(promise, milliseconds = CONNECTION_TIMEOUT) {
        let timeoutId;

        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(
                    new Error(
                        "Supabase tardó demasiado en responder."
                    )
                );
            }, milliseconds);
        });

        try {
            return await Promise.race([
                promise,
                timeout
            ]);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ==========================================
    // VERIFICAR CÓDIGO
    // ==========================================

    async function verifyCode(code) {
        if (!client) {
            throw new Error(
                "Supabase no está inicializado. Revisa config.js."
            );
        }

        if (!code) {
            throw new Error(
                "Introduce el código de presidencia."
            );
        }

        try {
            const result = await withTimeout(
                client.rpc("verify_president_code", {
                    p_code: code
                })
            );

            const { data, error } = result;

            if (error) {
                console.error(
                    "Error de Supabase al verificar:",
                    error
                );

                throw new Error(
                    error.message ||
                    "Supabase rechazó la verificación."
                );
            }

            return data === true;

        } catch (error) {
            console.error(
                "Error verificando código:",
                error
            );

            const message =
                String(error?.message || error || "");

            if (
                /tardó demasiado|timeout|network|fetch|failed to fetch/i.test(
                    message
                )
            ) {
                throw new Error(
                    "Supabase no respondió. Comprueba que el proyecto esté activo y que config.js tenga la URL y clave correctas."
                );
            }

            throw error;
        }
    }

    // ==========================================
    // COMPROBAR CONEXIÓN
    // ==========================================

    async function testConnection() {
        if (!client) {
            setConnection(
                "✕ Supabase no está inicializado.",
                false,
                "error"
            );

            return false;
        }

        setConnection(
            "⏳ Comprobando conexión…"
        );

        try {
            const result = await withTimeout(
                client
                    .from("house_points")
                    .select("house_name")
                    .limit(1)
            );

            const { error } = result;

            if (error) {
                console.error(
                    "Supabase respondió con error:",
                    error
                );

                setConnection(
                    `⚠ Supabase respondió, pero hay un problema: ${error.message}`,
                    false,
                    "warning"
                );

                return false;
            }

            setConnection(
                "✓ Supabase conectado correctamente",
                true
            );

            return true;

        } catch (error) {
            console.error(
                "Error de conexión con Supabase:",
                error
            );

            setConnection(
                "✕ Supabase no responde. Revisa la configuración.",
                false,
                "error"
            );

            return false;
        }
    }

    // ==========================================
    // CARGAR PUNTOS
    // ==========================================

    async function loadStats() {
        if (!client) {
            setMessage(
                pointsMessage,
                "Supabase no está disponible.",
                "error"
            );

            return;
        }

        try {
            const result = await withTimeout(
                client
                    .from("house_points")
                    .select("house_name,points")
            );

            const { data, error } = result;

            if (error) {
                throw error;
            }

            const rows = Array.isArray(data)
                ? data
                : [];

            const total = rows.reduce(
                (sum, row) => {
                    return (
                        sum +
                        (Number(row.points) || 0)
                    );
                },
                0
            );

            if (totalPoints) {
                totalPoints.textContent = total;
            }

            const byHouse = Object.fromEntries(
                rows.map(row => [
                    row.house_name,
                    Number(row.points) || 0
                ])
            );

            if (houseAdminList) {
                houseAdminList.innerHTML =
                    houses
                        .map(house => {
                            return `
                                <article class="house-admin-item">
                                    <span>
                                        <strong>
                                            ${icons[house] || "🏠"} ${house}
                                        </strong>
                                    </span>

                                    <strong class="member-admin-points">
                                        ${byHouse[house] ?? 0} pts
                                    </strong>
                                </article>
                            `;
                        })
                        .join("");
            }

        } catch (error) {
            console.error(
                "Error cargando puntos:",
                error
            );

            setMessage(
                pointsMessage,
                error.message ||
                "No se pudieron cargar los puntos.",
                "error"
            );
        }
    }

    // ==========================================
    // MODIFICAR PUNTOS
    // ==========================================

    async function adjustPoints(direction) {
        const house =
            document.getElementById("houseSelect")?.value;

        const amount =
            Number(
                document.getElementById("pointsAmount")?.value
            );

        if (!house) {
            setMessage(
                pointsMessage,
                "Selecciona una casa.",
                "error"
            );

            return;
        }

        if (
            !Number.isInteger(amount) ||
            amount <= 0
        ) {
            setMessage(
                pointsMessage,
                "Indica una cantidad entera mayor que cero.",
                "error"
            );

            return;
        }

        if (amount > 100) {
            setMessage(
                pointsMessage,
                "El máximo por operación es de 100 puntos.",
                "error"
            );

            return;
        }

        if (!presidentCode) {
            showPanel(false);

            setMessage(
                loginMessage,
                "La sesión presidencial ha expirado.",
                "error"
            );

            return;
        }

        if (!client) {
            setMessage(
                pointsMessage,
                "Supabase no está disponible.",
                "error"
            );

            return;
        }

        const change =
            Math.abs(amount) * direction;

        try {
            pointsForm
                ?.querySelectorAll(
                    "button, input, select"
                )
                .forEach(element => {
                    element.disabled = true;
                });

            setMessage(
                pointsMessage,
                "Actualizando puntuación…"
            );

            const result = await withTimeout(
                client.rpc(
                    "adjust_house_points",
                    {
                        p_house: house,
                        p_delta: change,
                        p_code: presidentCode
                    }
                )
            );

            const { data, error } = result;

            if (error) {
                throw error;
            }

            if (typeof data !== "number") {
                throw new Error(
                    "Supabase no devolvió una puntuación válida."
                );
            }

            setMessage(
                pointsMessage,
                `${house}: ahora tiene ${data} puntos.`,
                "success"
            );

            const amountInput =
                document.getElementById("pointsAmount");

            if (amountInput) {
                amountInput.value = "";
            }

            await loadStats();

        } catch (error) {
            console.error(
                "Error modificando puntos:",
                error
            );

            setMessage(
                pointsMessage,
                error.message ||
                "No se pudieron modificar los puntos.",
                "error"
            );

        } finally {
            pointsForm
                ?.querySelectorAll(
                    "button, input, select"
                )
                .forEach(element => {
                    element.disabled = false;
                });
        }
    }

    // ==========================================
    // MOSTRAR / OCULTAR CÓDIGO
    // ==========================================

    toggleCode?.addEventListener(
        "click",
        () => {
            if (!codeInput) return;

            const visible =
                codeInput.type === "text";

            codeInput.type =
                visible
                    ? "password"
                    : "text";

            toggleCode.textContent =
                visible
                    ? "Mostrar"
                    : "Ocultar";

            toggleCode.setAttribute(
                "aria-label",
                visible
                    ? "Mostrar código"
                    : "Ocultar código"
            );
        }
    );

    // ==========================================
    // LOGIN PRESIDENCIAL
    // ==========================================

    loginForm?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const code =
                codeInput?.value.trim();

            if (!code) {
                setMessage(
                    loginMessage,
                    "Introduce el código de presidencia.",
                    "error"
                );

                return;
            }

            if (
                code.length < 8 ||
                code.length > 128
            ) {
                setMessage(
                    loginMessage,
                    "El código no tiene un formato válido.",
                    "error"
                );

                return;
            }

            try {
                loginForm
                    .querySelectorAll(
                        "button, input"
                    )
                    .forEach(element => {
                        element.disabled = true;
                    });

                setMessage(
                    loginMessage,
                    "Verificando código…"
                );

                const valid =
                    await verifyCode(code);

                if (!valid) {
                    throw new Error(
                        "Código de presidencia incorrecto."
                    );
                }

                presidentCode = code;

                if (codeInput) {
                    codeInput.value = "";
                }

                setMessage(
                    loginMessage,
                    "✓ Acceso concedido.",
                    "success"
                );

                showPanel(true);

                await loadStats();

            } catch (error) {
                console.error(
                    "Error de acceso:",
                    error
                );

                setMessage(
                    loginMessage,
                    error.message ||
                    "No se pudo comprobar el código.",
                    "error"
                );

            } finally {
                loginForm
                    .querySelectorAll(
                        "button, input"
                    )
                    .forEach(element => {
                        element.disabled = false;
                    });
            }
        }
    );

    // ==========================================
    // AÑADIR PUNTOS
    // ==========================================

    pointsForm?.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            adjustPoints(1);
        }
    );

    // ==========================================
    // QUITAR PUNTOS
    // ==========================================

    removeButton?.addEventListener(
        "click",
        () => {
            adjustPoints(-1);
        }
    );

    // ==========================================
    // CERRAR PANEL
    // ==========================================

    logoutButton?.addEventListener(
        "click",
        () => {
            presidentCode = null;

            showPanel(false);

            setMessage(
                loginMessage,
                "Panel presidencial cerrado.",
                "success"
            );
        }
    );

    // ==========================================
    // ESTADO INICIAL
    // ==========================================

    showPanel(false);

    // No bloqueamos la página.
    // La comprobación tiene timeout.
    testConnection();

})();