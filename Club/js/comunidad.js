// CLUB DEL SPOILER — COMUNIDAD Y ASISTENCIA
(() => {
    const client = window.FILP?.supabase;
    const START_DATE = "2026-10-20";
    const FIRST_YEAR = Number(START_DATE.slice(0, 4));
    const state = {
        members: [],
        attendance: new Map(),
        presidentCode: null,
        unlocked: false
    };

    const $ = (id) => document.getElementById(id);
    const esc = (value) => {
        const div = document.createElement("div");
        div.textContent = value ?? "";
        return div.innerHTML;
    };

    const houseIcons = {
        Slytherin: "🐍",
        Ravenclaw: "🦅",
        Hufflepuff: "🦡",
        Gryffindor: "🦁"
    };

    const houseClass = {
        Slytherin: "house-slytherin",
        Ravenclaw: "house-ravenclaw",
        Hufflepuff: "house-hufflepuff",
        Gryffindor: "house-gryffindor"
    };

    function formatDate(date) {
        return date.toLocaleDateString("es-DO", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    function isoDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function selectedYear() {
        const value = Number($("meetingYearSelect")?.value);
        return Number.isInteger(value) && value >= FIRST_YEAR ? value : FIRST_YEAR;
    }

    function getTuesdays(year = selectedYear()) {
        const start = new Date(`${START_DATE}T12:00:00`);
        const end = new Date(`${year + 1}-01-01T12:00:00`);
        const current = new Date(Math.max(
            start.getTime(),
            new Date(`${year}-01-01T12:00:00`).getTime()
        ));
        const result = [];

        while (current < end) {
            if (current.getDay() === 2 && isoDate(current) >= START_DATE) {
                result.push(new Date(current));
            }
            current.setDate(current.getDate() + 1);
        }
        return result;
    }

    function populateMeetingFilters() {
        const yearSelect = $("meetingYearSelect");
        const dateSelect = $("meetingDateSelect");
        if (!yearSelect || !dateSelect) return;

        const currentYear = new Date().getFullYear();
        const lastYear = Math.max(currentYear + 5, FIRST_YEAR + 5);
        const previousYear = Number(yearSelect.value);
        const selected = previousYear >= FIRST_YEAR && previousYear <= lastYear
            ? previousYear
            : Math.max(FIRST_YEAR, currentYear);

        yearSelect.innerHTML = Array.from(
            { length: lastYear - FIRST_YEAR + 1 },
            (_, index) => FIRST_YEAR + index
        ).map(year => `<option value="${year}">${year}</option>`).join("");
        yearSelect.value = String(selected);

        const previousDate = dateSelect.value;
        const dates = getTuesdays(selected);
        dateSelect.innerHTML = dates.length
            ? dates.map(date => {
                const value = isoDate(date);
                return `<option value="${value}">${formatDate(date)}</option>`;
            }).join("")
            : `<option value="">No hay martes disponibles</option>`;

        if (dates.some(date => isoDate(date) === previousDate)) {
            dateSelect.value = previousDate;
        } else if (dates.length) {
            const today = isoDate(new Date());
            const upcoming = dates.find(date => isoDate(date) >= today);
            dateSelect.value = isoDate(upcoming || dates[dates.length - 1]);
        }

        yearSelect.onchange = () => {
            populateMeetingFilters();
            renderMeetings();
            renderStats();
        };
        dateSelect.onchange = () => renderMeetings();
    }

    function setMessage(id, message, type = "") {
        const el = $(id);
        if (!el) return;
        el.textContent = message;
        el.className = `auth-message ${type}`;
    }

    function statusLabel(status) {
        if (status === "present") return "Presente";
        if (status === "absent") return "Ausente";
        if (status === "excused") return "Excusado";
        return "Sin marcar";
    }

    function renderStats() {
        $("memberCount").textContent = state.members.length;
        $("meetingCount").textContent = getTuesdays().length;
        $("attendanceCount").textContent = [...state.attendance.values()]
            .filter(a => a.status === "present").length;
    }

    function renderAdminMembers() {
        const box = $("adminMemberList");
        if (!box) return;

        if (!state.members.length) {
            box.innerHTML = `<p class="text-soft">Todavía no hay miembros registrados.</p>`;
            return;
        }

        box.innerHTML = state.members.map(member => `
            <div class="admin-member-row">
                <div>
                    <strong>${esc(member.nombre)}</strong>
                    <small>${member.casa ? `${houseIcons[member.casa] || ""} ${esc(member.casa)}` : "Sin casa"}</small>
                </div>
                <button class="admin-remove" type="button" data-remove-member="${member.id}">
                    Quitar
                </button>
            </div>
        `).join("");

        box.querySelectorAll("[data-remove-member]").forEach(button => {
            button.addEventListener("click", () => removeMember(button.dataset.removeMember));
        });
    }

    function attendanceFor(memberId, date) {
        return state.attendance.get(`${memberId}_${date}`)?.status || "pending";
    }

    function renderMeetings() {
        const container = $("monthsContainer");
        if (!container) return;

        const selectedDate = $("meetingDateSelect")?.value || "";
        const tuesdays = getTuesdays().filter(date => isoDate(date) === selectedDate);
        if (!tuesdays.length) {
            container.innerHTML = `<div class="empty-state"><h3>Selecciona un martes</h3><p>No hay una reunión disponible para esa selección.</p></div>`;
            return;
        }
        const grouped = new Map();

        tuesdays.forEach(date => {
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push(date);
        });

        let meetingNumber = 0;

        container.innerHTML = [...grouped.entries()].map(([key, dates]) => {
            const first = dates[0];
            const monthName = first.toLocaleDateString("es-DO", { month: "long", year: "numeric" });

            return `
                <article class="month-card">
                    <header class="month-heading">
                        <h3>${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</h3>
                        <span>${dates.length} ${dates.length === 1 ? "martes" : "martes"}</span>
                    </header>

                    ${dates.map(date => {
                        meetingNumber++;
                        const dateISO = isoDate(date);
                        const rows = state.members.map(member => {
                            const status = attendanceFor(member.id, dateISO);
                            const icon = houseIcons[member.casa] || "✦";
                            const cls = houseClass[member.casa] || "";

                            return `
                                <div class="attendance-person ${cls}">
                                    <div>
                                        <span class="person-name">${esc(member.nombre)}</span>
                                        <span class="person-house">${icon} ${esc(member.casa || "Sin casa")}</span>
                                    </div>
                                    <div>
                                        <span class="attendance-status ${status}">
                                            <i class="dot ${status}"></i>${statusLabel(status)}
                                        </span>
                                        ${state.unlocked ? `
                                            <div class="attendance-actions">
                                                <button class="mark-present" type="button"
                                                    data-member="${member.id}" data-date="${dateISO}" data-status="present">
                                                    ✓ Presente
                                                </button>
                                                <button class="mark-absent" type="button"
                                                    data-member="${member.id}" data-date="${dateISO}" data-status="absent">
                                                    × Ausente
                                                </button>
                                                <button class="mark-excused" type="button"
                                                    data-member="${member.id}" data-date="${dateISO}" data-status="excused">
                                                    ◇ Excusado
                                                </button>
                                            </div>
                                        ` : ""}
                                    </div>
                                </div>
                            `;
                        }).join("");

                        return `
                            <div class="meeting-card">
                                <div class="meeting-head">
                                    <div class="meeting-date">
                                        <span class="meeting-number">${String(meetingNumber).padStart(2, "0")}</span>
                                        <div>
                                            <strong>${formatDate(date)}</strong>
                                            <span>Encuentro del Club del Spoiler</span>
                                        </div>
                                    </div>
                                    <span class="meeting-summary">
                                        ${state.members.length} miembros
                                    </span>
                                </div>
                                <div class="attendance-list">
                                    ${rows || `<p class="text-soft">Añade miembros desde Presidencia para registrar asistencia.</p>`}
                                </div>
                            </div>
                        `;
                    }).join("")}
                </article>
            `;
        }).join("");

        container.querySelectorAll("[data-status]").forEach(button => {
            button.addEventListener("click", () => setAttendance(
                button.dataset.member,
                button.dataset.date,
                button.dataset.status
            ));
        });
    }

    async function loadMembers() {
        if (!client) throw new Error("Supabase no está inicializado.");

        const { data, error } = await client
            .from("club_members")
            .select("id,nombre,casa,created_at")
            .eq("activo", true)
            .order("nombre", { ascending: true });

        if (error) throw error;
        state.members = data || [];
    }

    async function loadAttendance() {
        if (!client || !state.members.length) {
            state.attendance.clear();
            return;
        }

        const ids = state.members.map(m => m.id);
        const { data, error } = await client
            .from("club_attendance")
            .select("member_id,meeting_date,status")
            .in("member_id", ids);

        if (error) throw error;

        state.attendance.clear();
        (data || []).forEach(row => {
            state.attendance.set(`${row.member_id}_${row.meeting_date}`, row);
        });
    }

    async function reload() {
        try {
            await loadMembers();
            await loadAttendance();
            renderAdminMembers();
            renderMeetings();
            renderStats();
        } catch (error) {
            console.error("Error cargando comunidad:", error);
            $("monthsContainer").innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠</div>
                    <h3>No se pudo cargar la comunidad</h3>
                    <p>Revisa que las tablas de comunidad estén creadas en Supabase.</p>
                </div>
            `;
        }
    }

    async function unlockAdmin() {
        const code = $("presidentCode")?.value.trim();

        if (!code) {
            setMessage("adminMessage", "Escribe el código presidencial.", "error");
            return;
        }

        if (!client) {
            setMessage("adminMessage", "Supabase no está inicializado.", "error");
            return;
        }

        try {
            setMessage("adminMessage", "Verificando...", "");

            const { data, error } = await client.rpc("verify_president_code", {
                p_code: code
            });

            if (error) throw error;

            if (!data) {
                setMessage("adminMessage", "Código presidencial incorrecto.", "error");
                return;
            }

            state.presidentCode = code;
            state.unlocked = true;

            $("adminLogin").hidden = true;
            $("adminTools").hidden = false;
            $("adminPanel").classList.add("admin-unlocked");
            document.body.classList.add("admin-unlocked");

            setMessage("adminMessage", "");
            renderMeetings();
        } catch (error) {
            console.error(error);
            setMessage("adminMessage", "No se pudo verificar el código.", "error");
        }
    }

    function lockAdmin() {
        state.presidentCode = null;
        state.unlocked = false;

        $("adminLogin").hidden = false;
        $("adminTools").hidden = true;
        $("adminPanel").classList.remove("admin-unlocked");
        document.body.classList.remove("admin-unlocked");
        $("presidentCode").value = "";
        $("adminMessage").textContent = "";
        renderMeetings();
    }

    async function addMember(event) {
        event.preventDefault();

        if (!state.presidentCode) {
            setMessage("memberMessage", "Primero desbloquea Presidencia.", "error");
            return;
        }

        const name = $("memberName").value.trim();
        const house = $("memberHouse").value || null;

        if (!name) return;

        try {
            const { data, error } = await client.rpc("add_club_member", {
                p_name: name,
                p_house: house,
                p_code: state.presidentCode
            });

            if (error) throw error;

            $("memberName").value = "";
            $("memberHouse").value = "";
            setMessage("memberMessage", "Miembro añadido correctamente.", "success");

            await reload();
        } catch (error) {
            console.error(error);
            setMessage("memberMessage", error.message || "No se pudo añadir el miembro.", "error");
        }
    }

    async function removeMember(memberId) {
        if (!state.presidentCode) return;

        const member = state.members.find(m => m.id === memberId);
        if (!member) return;

        if (!confirm(`¿Quitar a ${member.nombre} de la comunidad? También se eliminarán sus asistencias.`)) {
            return;
        }

        try {
            const { error } = await client.rpc("remove_club_member", {
                p_member_id: memberId,
                p_code: state.presidentCode
            });

            if (error) throw error;
            await reload();
        } catch (error) {
            console.error(error);
            setMessage("memberMessage", error.message || "No se pudo quitar el miembro.", "error");
        }
    }

    async function setAttendance(memberId, date, status) {
        if (!state.unlocked || !state.presidentCode) {
            setMessage("adminMessage", "Verifica el código presidencial para cambiar la asistencia.", "error");
            return;
        }

        try {
            const { error } = await client.rpc("set_club_attendance", {
                p_member_id: memberId,
                p_date: date,
                p_status: status,
                p_code: state.presidentCode
            });

            if (error) throw error;

            state.attendance.set(`${memberId}_${date}`, {
                member_id: memberId,
                meeting_date: date,
                status
            });

            renderMeetings();
            renderStats();
        } catch (error) {
            console.error(error);
            setMessage("memberMessage", error.message || "No se pudo guardar la asistencia.", "error");
        }
    }

    function bindEvents() {
        $("toggleAdminBtn")?.addEventListener("click", () => {
            $("adminPanel").hidden = false;
            $("adminPanel").scrollIntoView({ behavior: "smooth", block: "start" });
            $("presidentCode")?.focus();
        });

        $("lockAdminBtn")?.addEventListener("click", lockAdmin);
        $("presidentForm")?.addEventListener("submit", event => {
            event.preventDefault();
            unlockAdmin();
        });
        $("memberForm")?.addEventListener("submit", addMember);

        $("toggleCode")?.addEventListener("click", () => {
            const input = $("presidentCode");
            if (!input) return;
            input.type = input.type === "password" ? "text" : "password";
            $("toggleCode").textContent = input.type === "password" ? "👁" : "🙈";
        });
    }

    if (!client) {
        $("monthsContainer").innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠</div>
                <h3>Supabase no está inicializado</h3>
                <p>Comprueba que config.js se cargue antes de comunidad.js.</p>
            </div>
        `;
        return;
    }

    bindEvents();
    populateMeetingFilters();
    reload();
})();
