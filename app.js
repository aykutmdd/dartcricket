let playerCount = 0;

const cricketNumbers = [
"20",
"19",
"18",
"17",
"16",
"15",
"BULL"
];

let players = [];
let activePlayer = 0;

let history = [];
let currentTurnShots = [];
let winner = null;
let scoreAnimation = "";

function getSavedPlayers(){

const saved =
localStorage.getItem("dartPlayers");

if(!saved){

return [];

}

return JSON.parse(saved);

}

function savePlayer(name){

if(!name){
return;
}

let players =
getSavedPlayers();

if(players.includes(name)){
return;
}

players.push(name);

players.sort();

localStorage.setItem(
"dartPlayers",
JSON.stringify(players)
);

}

function selectPlayerCount(count){

playerCount = count;

const container =
document.getElementById("player-inputs");

container.innerHTML = "";

for(let i=1;i<=count;i++){

const savedPlayers =
getSavedPlayers();

let options =
'<option value="">Seç veya yaz...</option>';

savedPlayers.forEach(name=>{

options += `
<option value="${name}">
${name}
</option>
`;

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

container.innerHTML += `<br> <button onclick="startGame()">
Oyunu Başlat </button>`;

}

function startGame(){

players = [];

for(let i=1;i<=playerCount;i++){

const playerName =
document.getElementById(`player${i}`).value
|| `Oyuncu ${i}`;

savePlayer(playerName);

players.push({
name: playerName,

score:0,
marks:{
20:0,
19:0,
18:0,
17:0,
16:0,
15:0,
BULL:0
}
});

}

document
.getElementById("setup-screen")
.classList.add("hidden");

document
.getElementById("game-screen")
.classList.remove("hidden");

renderBoard();

}

function markSymbol(value){

if(value === 0) return "";

if(value === 1) return "/";

if(value === 2) return "X";

return "Ⓧ";

}

function renderBoard(){

const board =
document.getElementById("scoreboard");

let html = `
<table
style="
width:100%;
border-collapse:collapse;
table-layout:fixed;
text-align:center;
font-size:28px;
">
`;

/* ÜST BAŞLIK */

html += "<tr>";

for(let i=0;i<players.length;i++){

if(i === Math.floor(playerCount/2)){

html += `
<th
style="
color:#f0b400;
font-size:32px;
"
>
#
</th>
`;

}

html += `
<th
style="
padding:15px;
border:${i===activePlayer ? "3px solid #00ff66" : "1px solid #333"};
box-shadow:${i===activePlayer ? "0 0 20px #00ff66" : "none"};
"
>
${i===activePlayer ? "▶ " : ""}
${players[i].name}
<br>
<span style="color:#00ff66">
${players[i].score}
</span>
</th>
`;

}

html += "</tr>";

/* CRICKET SATIRLARI */

cricketNumbers.forEach(number=>{

html += "<tr>";

for(let i=0;i<players.length;i++){

if(i === Math.floor(playerCount/2)){

html += `
<td
style="
color:#f0b400;
font-size:42px;
font-weight:bold;
"
>
${number}
</td>
`;

}

html += `
<td
style="
height:60px;
border:1px solid #222;
font-size:42px;
"
>
${markSymbol(
players[i].marks[number]
)}
</td>
`;

}

html += "</tr>";

});

html += "</table>";

if(winner){

html += `
<div
style="
margin-top:30px;
font-size:48px;
font-weight:bold;
text-align:center;
color:#00ff66;
"
>
🏆 ${winner} KAZANDI
</div>
`;
}

if(scoreAnimation){

html += `
<div
style="
position:fixed;
top:30px;
right:40px;
font-size:64px;
font-weight:bold;
color:#00ff66;
text-shadow:
0 0 10px #00ff66,
0 0 20px #00ff66,
0 0 30px #00ff66;
z-index:999;
"
>
${scoreAnimation}
</div>
`;
}

board.innerHTML = html;

html += `

<div
style="
display:flex;
justify-content:center;
gap:20px;
margin-top:25px;
"
>

<div class="dart-box">
${currentTurnShots[0] || "-"}
</div>

<div class="dart-box">
${currentTurnShots[1] || "-"}
</div>

<div class="dart-box">
${currentTurnShots[2] || "-"}
</div>

</div>

`;

board.innerHTML = html;

const controls =
document.getElementById("controls");

controls.innerHTML = `

<div class="button-grid">

<div class="button-row">

<button onclick="addMarks('20',3)">T20</button>
<button onclick="addMarks('20',2)">D20</button>
<button onclick="addMarks('20',1)">S20</button>

<button onclick="addMarks('19',3)">T19</button>
<button onclick="addMarks('19',2)">D19</button>
<button onclick="addMarks('19',1)">S19</button>

<button onclick="addMarks('18',3)">T18</button>
<button onclick="addMarks('18',2)">D18</button>
<button onclick="addMarks('18',1)">S18</button>

</div>

<div class="button-row">

<button onclick="addMarks('17',3)">T17</button>
<button onclick="addMarks('17',2)">D17</button>
<button onclick="addMarks('17',1)">S17</button>

<button onclick="addMarks('16',3)">T16</button>
<button onclick="addMarks('16',2)">D16</button>
<button onclick="addMarks('16',1)">S16</button>

<button onclick="addMarks('15',3)">T15</button>
<button onclick="addMarks('15',2)">D15</button>
<button onclick="addMarks('15',1)">S15</button>

</div>

<div class="button-row">

<button onclick="addMarks('BULL',1)">SB</button>

<button onclick="addMarks('BULL',2)">DB</button>

<button onclick="addMiss()">ISKA</button>

<button onclick="undoMove()">GERİ AL</button>

<button onclick="nextPlayer()">TURU GEÇ</button>

</div>

</div>
`;

}

function nextPlayer(){

saveState();

activePlayer++;

if(activePlayer >= players.length){

activePlayer = 0;

}

currentTurnShots = [];

renderBoard();

}

function saveState(){

history.push(
JSON.stringify({
players,
activePlayer,
currentTurnShots,
winner,
scoreAnimation
})
);

}

function getNumberValue(number){

if(number === "BULL"){
return 25;
}

return parseInt(number);

}

function addScore(number, extraHits){

let value =
getNumberValue(number);

let points =
value * extraHits;

players[activePlayer].score += points;

showScoreAnimation(points);

}

function showScoreAnimation(points){

scoreAnimation = "+" + points;

setTimeout(() => {

scoreAnimation = "";

renderBoard();

},1000);

}

function checkWinner(){

const player =
players[activePlayer];

const allClosed =
player.marks["20"] >= 3 &&
player.marks["19"] >= 3 &&
player.marks["18"] >= 3 &&
player.marks["17"] >= 3 &&
player.marks["16"] >= 3 &&
player.marks["15"] >= 3 &&
player.marks["BULL"] >= 3;

if(!allClosed){
return;
}


winner = player.name;

}

function addMiss(){

saveState();

currentTurnShots.push("ISKA");

if(currentTurnShots.length > 3){

currentTurnShots.shift();

}

renderBoard();

}


function addMarks(number,hits){


saveState();

let current =
players[activePlayer].marks[number];

let newTotal =
current + hits;

const prefix =
hits === 1 ? "S" :
hits === 2 ? "D" :
"T";

const shot = prefix + number;

currentTurnShots.push(shot);

if(currentTurnShots.length > 3){

currentTurnShots.shift();

}

if(newTotal > 3){

let extraHits =
newTotal - 3;

let somebodyOpen =
false;

for(let i=0;i<players.length;i++){

if(i === activePlayer){
continue;
}

if(players[i].marks[number] < 3){

somebodyOpen = true;
break;

}

}

if(somebodyOpen){

addScore(
number,
extraHits
);

}

newTotal = 3;

}

current = newTotal;

players[activePlayer].marks[number] =
current;

checkWinner();


renderBoard();

}

function undoMove(){

if(history.length === 0){

return;

}

const previous =
JSON.parse(history.pop());

players =
previous.players;

activePlayer =
previous.activePlayer;

currentTurnShots =
previous.currentTurnShots || [];

winner =
previous.winner;

scoreAnimation =
previous.scoreAnimation;

renderBoard();

}

