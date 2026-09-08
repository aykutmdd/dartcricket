/* UI FIX v2: tek satır hedef butonları + sabit skor satırları */
let playerCount = 0;

const cricketNumbers = [
    "20", "19", "18", "17", "16", "15", "BULL"
];

let players = [];
let activePlayer = 0;
let history = [];
let currentTurnShots = [];
let winner = null;
let scoreAnimation = "";

function getSavedPlayers() {
    const saved = localStorage.getItem("dartPlayers");
    if (!saved) return [];
    return JSON.parse(saved);
}

function savePlayer(name) {
    if (!name) return;

    let players = getSavedPlayers();

    if (players.includes(name)) return;

    players.push(name);
    players.sort();

    localStorage.setItem("dartPlayers", JSON.stringify(players));
}

function selectPlayerCount(count) {
    playerCount = count;

    const container = document.getElementById("player-inputs");
    container.innerHTML = "";

    for (let i = 1; i <= count; i++) {
        const savedPlayers = getSavedPlayers();

        let options = '<option value="">Seç veya yaz...</option>';

        savedPlayers.forEach(name => {
            options += `<option value="${name}">${name}</option>`;
        });

        container.innerHTML += `
            <div style="margin:10px">
                <input
                    list="playersList${i}"
                    id="player${i}"
                    placeholder="Oyuncu ${i}">
                <datalist id="playersList${i}">
                    ${options}
                </datalist>
            </div>
        `;
    }

    container.innerHTML += `<br><button onclick="startGame()">Oyunu Başlat</button>`;
}

function startGame() {
    players = [];
    activePlayer = 0;
    history = [];
    currentTurnShots = [];
    winner = null;
    scoreAnimation = "";

    for (let i = 1; i <= playerCount; i++) {
        const playerName =
            document.getElementById(`player${i}`).value || `Oyuncu ${i}`;

        savePlayer(playerName);

        players.push({
            name: playerName,
            score: 0,
            marks: {
                20: 0,
                19: 0,
                18: 0,
                17: 0,
                16: 0,
                15: 0,
                BULL: 0
            }
        });
    }

    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");

    renderBoard();
}

function markSymbol(value) {
    if (value === 0) return "";
    if (value === 1) return "/";
    if (value === 2) return "X";
    return "Ⓧ";
}

function renderBoard() {
    const board = document.getElementById("scoreboard");

    let html = `
        <table class="dart-scoreboard">
            <tr>
                <th class="number-header">HEDEF</th>
    `;

    players.forEach((player, i) => {
        html += `
            <th class="${i === activePlayer ? "active-player" : ""}">
                ${i === activePlayer ? "▶ " : ""}
                ${player.name}
                <span class="player-score">${player.score}</span>
            </th>
        `;
    });

    html += `</tr>`;

    cricketNumbers.forEach(number => {
        html += `<tr>`;
        html += `<td class="target-number">${number}</td>`;

        players.forEach(player => {
            html += `
                <td class="mark-cell">
                    <div class="mark-symbol-wrap">${markSymbol(player.marks[number])}</div>
                </td>
            `;
        });

        html += `</tr>`;
    });

    html += `</table>`;

    html += `
        <div class="turn-shots">
            <div class="dart-box">${currentTurnShots[0] || "-"}</div>
            <div class="dart-box">${currentTurnShots[1] || "-"}</div>
            <div class="dart-box">${currentTurnShots[2] || "-"}</div>
        </div>
    `;

    if (winner) {
        html += `
            <div class="winner-message">🏆 ${winner} KAZANDI</div>
        `;
    }

    if (scoreAnimation) {
        html += `<div class="score-animation">${scoreAnimation}</div>`;
    }

    board.innerHTML = html;

    renderControls();
}

function renderControls() {
    const controls = document.getElementById("controls");

    controls.innerHTML = `
        <div class="button-grid">
            <div class="button-row all-controls-row">
                ${createTargetButton("20")}
                ${createTargetButton("19")}
                ${createTargetButton("18")}
                ${createTargetButton("17")}
                ${createTargetButton("16")}
                ${createTargetButton("15")}
                ${createTargetButton("BULL", true)}
                <button class="action-button miss-button" onclick="addMiss()">ISKA</button>
                <button class="action-button" onclick="undoMove()">GERİ AL</button>
                <button class="action-button" onclick="nextPlayer()">TURU GEÇ</button>
            </div>
        </div>
    `;

    attachLongPressHandlers();
}

function createTargetButton(number, isBull = false) {
    return `
        <button
            class="target-button ${isBull ? "bull-button" : ""}"
            data-target="${number}">
            ${number}
        </button>
    `;
}

/*
 * Tek hedef butonu davranışı:
 * - Kısa dokunma: S hedefi
 * - Yaklaşık 550 ms basılı tutma: D/T seçimi açılır
 *
 * Menü açıldığında D veya T seçilir. Menü dışında dokunmak menüyü kapatır.
 */
function attachLongPressHandlers() {
    document.querySelectorAll(".target-button").forEach(button => {
        let timer = null;
        let longPressTriggered = false;

        const startPress = (event) => {
            if (event.type === "mousedown" && event.button !== 0) return;

            longPressTriggered = false;

            timer = setTimeout(() => {
                longPressTriggered = true;
                openMultiplierMenu(button);
            }, 550);
        };

        const cancelPress = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        };

        const finishPress = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            if (!longPressTriggered) {
                addMarks(button.dataset.target, 1);
            }
        };

        button.addEventListener("touchstart", startPress, { passive: true });
        button.addEventListener("touchend", finishPress);
        button.addEventListener("touchcancel", cancelPress);

        button.addEventListener("mousedown", startPress);
        button.addEventListener("mouseup", finishPress);
        button.addEventListener("mouseleave", cancelPress);
    });
}

function openMultiplierMenu(button) {
    closeMultiplierMenus();

    const number = button.dataset.target;

    const menu = document.createElement("div");
    menu.className = "multiplier-menu";

    menu.innerHTML = `
        <button type="button" data-hit="2">D${number}</button>
        <button type="button" data-hit="3">T${number}</button>
    `;

    document.body.appendChild(menu);

    const rect = button.getBoundingClientRect();
    const menuWidth = 150;

    let left = rect.left + rect.width / 2 - menuWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    let top = rect.top - 118;
    if (top < 8) top = rect.bottom + 8;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    menu.querySelectorAll("button").forEach(option => {
        option.addEventListener("click", () => {
            const hits = Number(option.dataset.hit);
            addMarks(number, hits);
            closeMultiplierMenus();
        });
    });

    setTimeout(() => {
        document.addEventListener("click", outsideMenuClick, { once: true });
    }, 0);

    function outsideMenuClick(event) {
        if (!menu.contains(event.target) && event.target !== button) {
            closeMultiplierMenus();
        }
    }
}

function closeMultiplierMenus() {
    document.querySelectorAll(".multiplier-menu").forEach(menu => menu.remove());
}

function nextPlayer() {
    saveState();

    activePlayer++;

    if (activePlayer >= players.length) {
        activePlayer = 0;
    }

    currentTurnShots = [];
    closeMultiplierMenus();
    renderBoard();
}

function saveState() {
    history.push(JSON.stringify({
        players,
        activePlayer,
        currentTurnShots,
        winner,
        scoreAnimation
    }));
}

function getNumberValue(number) {
    if (number === "BULL") return 25;
    return parseInt(number);
}

function addScore(number, extraHits) {
    const value = getNumberValue(number);
    const points = value * extraHits;

    players[activePlayer].score += points;
    showScoreAnimation(points);
}

function showScoreAnimation(points) {
    scoreAnimation = "+" + points;

    setTimeout(() => {
        scoreAnimation = "";
        renderBoard();
    }, 1000);
}

function checkWinner() {
    const player = players[activePlayer];

    const allClosed =
        player.marks["20"] >= 3 &&
        player.marks["19"] >= 3 &&
        player.marks["18"] >= 3 &&
        player.marks["17"] >= 3 &&
        player.marks["16"] >= 3 &&
        player.marks["15"] >= 3 &&
        player.marks["BULL"] >= 3;

    if (!allClosed) return;

    winner = player.name;
}

function addMiss() {
    saveState();

    currentTurnShots.push("ISKA");

    if (currentTurnShots.length > 3) {
        currentTurnShots.shift();
    }

    if (currentTurnShots.length === 3) {
        setTimeout(() => nextPlayer(), 600);
    }

    renderBoard();
}

function addMarks(number, hits) {
    if (winner) return;

    saveState();

    let current = players[activePlayer].marks[number];
    let newTotal = current + hits;

    const prefix =
        hits === 1 ? "S" :
        hits === 2 ? "D" : "T";

    const shot = prefix + number;

    currentTurnShots.push(shot);

    if (currentTurnShots.length > 3) {
        currentTurnShots.shift();
    }

    if (currentTurnShots.length === 3) {
        setTimeout(() => nextPlayer(), 600);
    }

    if (newTotal > 3) {
        const extraHits = newTotal - 3;

        let somebodyOpen = false;

        for (let i = 0; i < players.length; i++) {
            if (i === activePlayer) continue;

            if (players[i].marks[number] < 3) {
                somebodyOpen = true;
                break;
            }
        }

        if (somebodyOpen) {
            addScore(number, extraHits);
        }

        newTotal = 3;
    }

    players[activePlayer].marks[number] = newTotal;

    checkWinner();
    renderBoard();
}

function undoMove() {
    if (history.length === 0) return;

    closeMultiplierMenus();

    const previous = JSON.parse(history.pop());

    players = previous.players;
    activePlayer = previous.activePlayer;
    currentTurnShots = previous.currentTurnShots || [];
    winner = previous.winner;
    scoreAnimation = previous.scoreAnimation;

    renderBoard();
}

