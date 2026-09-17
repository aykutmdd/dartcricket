import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config-v6.js";

const cricketNumbers=["20","19","18","17","16","15","BULL"];
const app=initializeApp(firebaseConfig);
const db=getDatabase(app);
const waiting=document.getElementById("tv-waiting"),gameScreen=document.getElementById("tv-game");
const roomCodeEl=document.getElementById("room-code"),roomSmall=document.getElementById("tv-room-small");
const statusEl=document.getElementById("tv-status"),statusGameEl=document.getElementById("tv-status-game");
const scoreboard=document.getElementById("scoreboard");

function markSymbol(v){ if(!v)return ""; if(v===1)return "/"; if(v===2)return "X"; return "Ⓧ"; }
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));}
async function makeRoomCode(){
  for(let a=0;a<30;a++){const c=String(Math.floor(1000+Math.random()*9000));if(!(await get(ref(db,`rooms/${c}`))).exists())return c;}
  return String(Date.now()).slice(-4);
}
function roundText(state){
  if(state.suddenDeath?.active) return `⚡ ANİ ÖLÜM ${Number(state.suddenDeath.round||1)}`;
  const r=Number(state.round||1),lim=Number(state.roundLimit||0);
  return lim?`TUR ${r} / ${lim}`:`TUR ${r}`;
}
function renderBoard(state){
  const players=state.players||[],activePlayer=Number(state.activePlayer||0),shots=state.currentTurnShots||[],leftCount=Math.ceil(players.length/2);
  let html=`<div class="tv-round-banner">${escapeHtml(roundText(state))}</div>`;
  if(state.suddenDeath?.active){
    html+=renderSuddenDeath(state);
  }else{
    html+=`<table class="dart-scoreboard"><tr>`;
    players.slice(0,leftCount).forEach((p,i)=>{html+=`<th class="${i===activePlayer?"active-player":""}">${i===activePlayer?"▶ ":""}${escapeHtml(p.name)}<span class="player-score">${Number(p.score)||0}</span></th>`;});
    html+=`<th class="number-header">HEDEF</th>`;
    players.slice(leftCount).forEach((p,j)=>{const i=leftCount+j;html+=`<th class="${i===activePlayer?"active-player":""}">${i===activePlayer?"▶ ":""}${escapeHtml(p.name)}<span class="player-score">${Number(p.score)||0}</span></th>`;});
    html+=`</tr>`;
    cricketNumbers.forEach(n=>{
      html+=`<tr>`;
      players.slice(0,leftCount).forEach(p=>html+=`<td><div class="mark-symbol-wrap">${markSymbol(Number(p.marks?.[n])||0)}</div></td>`);
      html+=`<td class="target-number">${n}</td>`;
      players.slice(leftCount).forEach(p=>html+=`<td><div class="mark-symbol-wrap">${markSymbol(Number(p.marks?.[n])||0)}</div></td>`);
      html+=`</tr>`;
    });
    html+=`</table>`;
  }
  html+=`<div class="turn-shots"><div class="dart-box">${escapeHtml(shots[0]||"-")}</div><div class="dart-box">${escapeHtml(shots[1]||"-")}</div><div class="dart-box">${escapeHtml(shots[2]||"-")}</div></div>`;
  if(state.winner){
    html+=`<div class="tv-winner-overlay"><div class="winner-trophy">🏆</div><div class="winner-name">${escapeHtml(state.winner)}</div><div class="winner-text">KAZANDI</div>${state.winReason?`<div class="winner-reason">${escapeHtml(state.winReason)}</div>`:""}</div>`;
  }
  if(state.scoreAnimation) html+=`<div class="score-animation">${escapeHtml(state.scoreAnimation)}</div>`;
  scoreboard.innerHTML=html;
}
function renderSuddenDeath(state){
  const sd=state.suddenDeath, contenders=sd.contenders||[];
  return `<div class="sudden-death-panel">
    <div class="sudden-title">3 DART · CRICKET SAYILARI</div>
    <div class="sudden-grid">
      ${contenders.map(i=>{
        const p=state.players[i],active=i===Number(state.activePlayer||0);
        return `<div class="sudden-player ${active?"active":""}">
          <div class="sudden-name">${active?"▶ ":""}${escapeHtml(p?.name||"")}</div>
          <div class="sudden-score">${Number(sd.scores?.[i]||0)}</div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}
async function init(){
  try{
    const room=await makeRoomCode();roomCodeEl.textContent=room;roomSmall.textContent=room;
    const roomRef=ref(db,`rooms/${room}`);
    await set(roomRef,{status:"waiting",createdAt:Date.now(),tvOnline:true});
    onDisconnect(ref(db,`rooms/${room}/tvOnline`)).set(false);
    onValue(roomRef,snap=>{
      const data=snap.val();
      if(!data){statusEl.textContent="Oda bulunamadı.";return;}
      if(data.game&&Array.isArray(data.game.players)&&data.game.players.length){
        waiting.classList.add("hidden");gameScreen.classList.remove("hidden");
        statusGameEl.textContent=data.remoteOnline===false?"Telefon bağlantısı bekleniyor":"Bağlı";
        renderBoard(data.game);
      }else{
        waiting.classList.remove("hidden");gameScreen.classList.add("hidden");
        statusEl.textContent=data.remoteOnline?"Telefon bağlandı — oyuncular bekleniyor…":"Telefon bağlantısı bekleniyor…";
      }
    });
  }catch(err){console.error(err);statusEl.textContent="Firebase bağlantısı kurulamadı. Yapılandırmayı kontrol et.";}
}
init();
