(() => {
    const client = window.FILP?.supabase;
    const ranking = document.getElementById("houseRanking");
    const houses = ["Slytherin", "Ravenclaw", "Hufflepuff", "Gryffindor"];
    const icons = { Slytherin:"🐍", Ravenclaw:"🦅", Hufflepuff:"🦡", Gryffindor:"🦁" };

    async function loadHousePoints() {
        if (!client || !ranking) return;
        try {
            const { data, error } = await client.from("house_points").select("house_name,points");
            if (error) throw error;
            const totals = Object.fromEntries(houses.map(h => [h, 0]));
            (data || []).forEach(row => {
                if (row.house_name in totals) totals[row.house_name] = Number(row.points) || 0;
            });
            const rows = houses.map(h => [h, totals[h]]).sort((a,b) => b[1] - a[1]);
            ranking.innerHTML = rows.map(([name, points], index) => `
                <li>
                    <span>#${index + 1}</span>
                    <strong>${icons[name]} ${name}</strong>
                    <b>${points} pts</b>
                </li>
            `).join("");
        } catch (error) {
            console.warn(error.message);
        }
    }

    loadHousePoints();
})();
