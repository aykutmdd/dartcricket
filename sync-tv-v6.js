import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config-v6.js";

const cricketNumbers = ["20","19","18","17","16","15","BULL"]; // v6.1
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const waiting = document.getElementById("tv-waiting");
const gameScreen = document.getElementById("tv-game");
const roomCodeEl = document.getElementById("room-code");
const roomSmall = document.getElementById("tv-room-small");
const statusEl = document.getElementById("tv-status");
const statusGameEl = document.getElementById("tv-status-game");
const scoreboard = document.getElementById("scoreboard");

function markSymbol(value){
  if(!value) return "";
  if(value===1) return "/";
  if(value===2) return "X";
  return "Ⓧ";
}

async function makeRoomCode(){
  for(let attempt=0; attempt<30; attempt++){
    const code = String(Math.floor(1000 + Math.random()*9000));
    const snap = await get(ref(db, `rooms/${code}`));
    if(!snap.exists()) return code;
  }
  return String(Date.now()).slice(-4);
}

function renderBoard(state){
  const players = state.players || [];
  const activePlayer = state.activePlayer || 0;
  const shots = state.currentTurnShots || [];
  const leftCount = Math.ceil(players.length/2);

  let html = `<table class="dart-scoreboard"><tr>`;

  players.slice(0,leftCount).forEach((p,i)=>{
    html += `<th class="${i===activePlayer?"active-player":""}">
      ${i===activePlayer?"▶ ":""}${escapeHtml(p.name)}
      <span class="player-score">${Number(p.score)||0}</span>
    </th>`;
  });

  html += `<th class="number-header">HEDEF</th>`;

  players.slice(leftCount).forEach((p,j)=>{
    const i = leftCount+j;
    html += `<th class="${i===activePlayer?"active-player":""}">
      ${i===activePlayer?"▶ ":""}${escapeHtml(p.name)}
      <span class="player-score">${Number(p.score)||0}</span>
    </th>`;
  });

  html += `</tr>`;

  cricketNumbers.forEach(number=>{
    html += `<tr>`;
    players.slice(0,leftCount).forEach(p=>{
      html += `<td><div class="mark-symbol-wrap">${markSymbol(Number(p.marks?.[number])||0)}</div></td>`;
    });
    html += `<td class="target-number">${number}</td>`;
    players.slice(leftCount).forEach(p=>{
      html += `<td><div class="mark-symbol-wrap">${markSymbol(Number(p.marks?.[number])||0)}</div></td>`;
    });
    html += `</tr>`;
  });

  html += `</table>
    <div class="turn-shots">
      <div class="dart-box">${escapeHtml(shots[0]||"-")}</div>
      <div class="dart-box">${escapeHtml(shots[1]||"-")}</div>
      <div class="dart-box">${escapeHtml(shots[2]||"-")}</div>
    </div>`;

  if(state.winner){
    html += `
      <div class="tv-winner-overlay">
        <div class="winner-trophy">🏆</div>
        <div class="winner-name">${escapeHtml(state.winner)}</div>
        <div class="winner-text">KAZANDI</div>
      </div>`;
  }
  if(state.scoreAnimation){
    html += `<div class="score-animation">${escapeHtml(state.scoreAnimation)}</div>`;
  }
  scoreboard.innerHTML = html;
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

async function init(){
  try{
    const room = await makeRoomCode();
    roomCodeEl.textContent = room;
    roomSmall.textContent = room;

    const roomRef = ref(db, `rooms/${room}`);
    await set(roomRef, {
      status: "waiting",
      createdAt: Date.now(),
      tvOnline: true
    });

    onDisconnect(ref(db, `rooms/${room}/tvOnline`)).set(false);

    onValue(roomRef, snap=>{
      const data = snap.val();
      if(!data){
        statusEl.textContent = "Oda bulunamadı.";
        return;
      }
      if(data.game && Array.isArray(data.game.players) && data.game.players.length){
        waiting.classList.add("hidden");
        gameScreen.classList.remove("hidden");
        statusGameEl.textContent = data.remoteOnline === false ? "Telefon bağlantısı bekleniyor" : "Bağlı";
        renderBoard(data.game);
      }else{
        waiting.classList.remove("hidden");
        gameScreen.classList.add("hidden");
        statusEl.textContent = data.remoteOnline ? "Telefon bağlandı — oyuncular bekleniyor…" : "Telefon bağlantısı bekleniyor…";
      }
    });
  }catch(err){
    console.error(err);
    statusEl.textContent = "Firebase bağlantısı kurulamadı. Yapılandırmayı kontrol et.";
  }
}

init();
