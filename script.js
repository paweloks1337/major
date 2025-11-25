// ==============================
// Konfiguracja JSONbin.io
// ==============================
const API_KEY = "6925e616d0ea881f40ffb922";       // Twój X-Access-Key
const TYPES_BIN_ID = "6925e58cd0ea881f40ffb821";   // Bin ID types.json
const RESULTS_BIN_ID = "6925e5bbae596e708f707277";// Bin ID results.json

// ==============================
// Funkcja generowania tokenu
// ==============================
function generateToken() {
    let token = localStorage.getItem("userToken");
    if (!token) {
        token = crypto.randomUUID();
        localStorage.setItem("userToken", token);
    }
    return token;
}

// ==============================
// Zapis typów użytkownika
// ==============================
async function saveUserTypes(nick, userTypes) {
    const token = generateToken();
    let typesData = await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY }
    }).then(res => res.json());

    let users = typesData.record.users || [];

    // Sprawdź czy token istnieje
    const index = users.findIndex(u => u.token === token);
    const userData = { nick, token, types: userTypes };

    if (index > -1) {
        users[index] = userData; // aktualizacja istniejącego
    } else {
        users.push(userData); // nowy użytkownik
    }

    // Zapisz do JSONbin
    await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": API_KEY
        },
        body: JSON.stringify({ users })
    });
    alert("Typy zapisane! Twój token: " + token);
}

// ==============================
// Pobranie własnych typów
// ==============================
async function getMyTypes(token) {
    let typesData = await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY }
    }).then(res => res.json());

    let users = typesData.record.users || [];
    const user = users.find(u => u.token === token);
    return user ? user.types : null;
}

// ==============================
// Zapis wyników przez admina
// ==============================
async function saveResults(results) {
    await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": API_KEY
        },
        body: JSON.stringify({ matches: results })
    });
    alert("Wyniki zapisane!");
}

// ==============================
// Pobranie wyników i typów
// ==============================
async function getAllData() {
    const typesData = await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY }
    }).then(res => res.json());
    const resultsData = await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}/latest`, {
        headers: { "X-Master-Key": API_KEY }
    }).then(res => res.json());
    return {
        users: typesData.record.users || [],
        results: resultsData.record.matches || []
    };
}

// ==============================
// Funkcja liczenia punktów
// ==============================
function calculatePoints(userTypes, results) {
    let points = 0;
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const user = userTypes[i];

        if (!user || !user.score) continue;

        // BO1
        if (result.type === "BO1") {
            if (user.score === result.score) points += 5;
            else if (user.score.split("-")[0] === result.score.split("-")[0]) points += 3;
        }
        // BO3
        if (result.type === "BO3") {
            if (user.score === result.score) points += 7;
            else if (user.score.split(":")[0] === result.score.split(":")[0]) points += 4;
        }
    }
    return points;
}

// ==============================
// Generowanie rankingu
// ==============================
async function generateRanking(containerId) {
    const data = await getAllData();
    const users = data.users;
    const results = data.results;

    const ranking = users.map(u => {
        return {
            nick: u.nick,
            points: calculatePoints(u.types, results)
        };
    });

    // Sortowanie malejąco
    ranking.sort((a, b) => b.points - a.points);

    // Wyświetlanie w tabeli
    const container = document.getElementById(containerId);
    container.innerHTML = "<tr><th>#</th><th>Nick</th><th>Punkty</th></tr>";
    ranking.forEach((r, index) => {
        container.innerHTML += `<tr><td>${index + 1}</td><td>${r.nick}</td><td>${r.points}</td></tr>`;
    });
}
