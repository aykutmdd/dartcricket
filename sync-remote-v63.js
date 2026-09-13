import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config-v6.js";

const cricketNumbers = ["20","19","18","17","16","15","BULL"];
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomCode = "";
let playerCount = 0;
let selectedRoundLimit = 0;
let game = null;
let history = [];
let advanceTimer = null;
let scoreTimer = null;

const joinScreen = document.getElementById("join-screen");
const setupScreen = document.getElementById("setup-screen");
const controlScreen = document.getElementById("control-screen");
const joinCode = document.getElementById("join-code");
const joinButton = document.getElementById("join-button");
const joinStatus = document.getElementById("join-status");
const setupRoom = document.getElementById("setup-room");
const controlRoom = document.getElementById("control-room");
const playerCountButtons = document.getElementById("player-count-buttons");
const playerInputs = document.getElementById("player-inputs");
const roundLimitSection = document.getElementById("round-limit-section");
const roundLimitButtons = document.getElementById("round-limit-buttons");
const remoteRound = document.getElementById("remote-round");
const activeName = document.getElementById("active-player-name");
const activeScore = document.getElementById("active-player-score");
const shotStrip = document.getElementById("shot-strip");
const controls = document.getElementById("remote-controls");
const remoteMessage = document.getElementById("remote-message");
const remoteStatus = document.getElementById("remote-status");

function getSavedPlayers(){ try{return JSON.parse(localStorage.getItem("dartPlayers")||"[]")}catch{return []} }
function savePlayer(name){
  if(!name) return;
  const names=getSavedPlayers();
  if(!names.includes(name)){ names.push(name); names.sort((a,b)=>a.localeCompare(b,"tr")); localStorage.setItem("dartPlayers",JSON.stringify(names)); }
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function initialMarks(){ return {"20":0,"19":0,"18":0,"17":0,"16":0,"15":0,"BULL":0}; }

function buildCountButtons(){
  playerCountButtons.innerHTML="";
  for(let i=1;i<=6;i++){
    const b=document.createElement("button");
    b.textContent=`${i} Oyuncu`;
    b.addEventListener("click",()=>selectPlayerCount(i));
    playerCountButtons.appendChild(b);
  }
}
function selectPlayerCount(count){
  playerCount=count;
  [...playerCountButtons.children].forEach((b,i)=>b.classList.toggle("selected",i===count-1));
  roundLimitSection.classList.remove("hidden");
  const saved=getSavedPlayers();
  playerInputs.innerHTML="";
  for(let i=1;i<=count;i++){
    const wrap=document.createElement("div"); wrap.className="player-entry";
    const input=document.createElement("input"); input.id=`player${i}`; input.placeholder=`Oyuncu ${i}`; input.setAttribute("list",`playersList${i}`);
    const dl=document.createElement("datalist"); dl.id=`playersList${i}`;
    saved.forEach(name=>{ const opt=document.createElement("option"); opt.value=name; dl.appendChild(opt); });
    wrap.append(input,dl); playerInputs.appendChild(wrap);
  }
  const start=document.createElement("button");
  start.className="primary-button start-game-button"; start.textContent="OYUNU BAŞLAT"; start.addEventListener("click",startGame);
  playerInputs.appendChild(start);
}
roundLimitButtons.addEventListener("click",e=>{
  const b=e.target.closest("button[data-round-limit]"); if(!b) return;
  selectedRoundLimit=Number(b.dataset.roundLimit)||0;
  roundLimitButtons.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));
});

async function startGame(){
  if(!playerCount) return;
  const players=[];
  for(let i=1;i<=playerCount;i++){
    const input=document.getElementById(`player${i}`);
    const name=(input?.value||"").trim() || `Oyuncu ${i}`;
    savePlayer(name);
    players.push({
      name, score:0, marks:initialMarks(),
      successfulThrows:0, bullseyes:0, bullHits:0
    });
  }
  history=[];
  game={
    players, activePlayer:0, currentTurnShots:[], winner:null, scoreAnimation:"",
    round:1, roundLimit:selectedRoundLimit,
    suddenDeath:null
  };
  await syncGame(); showControls();
}

function showSetup(){
  joinScreen.classList.add("hidden"); controlScreen.classList.add("hidden"); setupScreen.classList.remove("hidden"); setupRoom.textContent=roomCode;
}
function showControls(){
  joinScreen.classList.add("hidden"); setupScreen.classList.add("hidden"); controlScreen.classList.remove("hidden"); controlRoom.textContent=roomCode; renderRemote();
}
async function joinRoom(){
  const code=joinCode.value.replace(/\D/g,"").slice(0,4);
  if(code.length!==4){ joinStatus.textContent="4 haneli oda kodunu gir."; return; }
  joinButton.disabled=true; joinStatus.textContent="Bağlanıyor…";
  try{
    const roomRef=ref(db,`rooms/${code}`); const snap=await get(roomRef);
    if(!snap.exists()){ joinStatus.textContent="Bu oda bulunamadı."; joinButton.disabled=false; return; }
    roomCode=code;
    await update(roomRef,{remoteOnline:true,lastRemoteSeen:Date.now()});
    onDisconnect(ref(db,`rooms/${code}/remoteOnline`)).set(false);
    onValue(roomRef,s=>{
      const data=s.val(); if(!data) return;
      remoteStatus.textContent=data.tvOnline===false?"TV bağlantısı yok":"Bağlı";
      if(data.game && Array.isArray(data.game.players) && data.game.players.length){
        if(!game) game=data.game;
        if(controlScreen.classList.contains("hidden")) showControls();
      }
    });
    const data=snap.val();
    if(data.game && Array.isArray(data.game.players) && data.game.players.length){ game=data.game; showControls(); } else showSetup();
    joinStatus.textContent="";
  }catch(err){ console.error(err); joinStatus.textContent="Bağlantı kurulamadı. Firebase ayarlarını kontrol et."; joinButton.disabled=false; }
}
function saveState(){
  if(!game) return;
  history.push(JSON.stringify(game)); if(history.length>150) history.shift();
}
async function syncGame(){
  if(!roomCode || !game) return;
  await update(ref(db,`rooms/${roomCode}`),{status:game.winner?"finished":"playing",game,remoteOnline:true,updatedAt:Date.now()});
}
function roundText(){
  if(game?.suddenDeath?.active) return `ANİ ÖLÜM ${game.suddenDeath.round}`;
  const r=Number(game?.round||1), lim=Number(game?.roundLimit||0);
  return lim ? `TUR ${r} / ${lim}` : `TUR ${r}`;
}
function renderRemote(){
  if(!game || !game.players?.length) return;
  const p=game.players[game.activePlayer];
  activeName.textContent=p?.name||"-";
  activeScore.textContent=game.suddenDeath?.active ? String(game.suddenDeath.scores?.[game.activePlayer]||0) : String(p?.score||0);
  remoteRound.textContent=roundText();
  const shots=game.currentTurnShots||[];
  shotStrip.innerHTML=[0,1,2].map(i=>`<div class="shot-chip">${escapeHtml(shots[i]||"-")}</div>`).join("");
  if(game.winner) remoteMessage.textContent=`🏆 ${game.winner} KAZANDI`;
  else if(game.suddenDeath?.active) remoteMessage.textContent=`⚡ ANİ ÖLÜM — 3 DART / CRICKET SAYILARI`;
  else remoteMessage.textContent=game.scoreAnimation||"";

  controls.innerHTML=`
    <div class="remote-controls-grid">
      ${cricketNumbers.map(n=>`<button class="target-button ${n==="BULL"?"bull-button":""}" data-target="${n}">${n}</button>`).join("")}
    </div>
    <div class="action-row">
      <button class="action-button miss-button" id="miss-btn">ISKA</button>
      <button class="action-button" id="undo-btn">GERİ AL</button>
      <button class="action-button" id="next-btn">TURU GEÇ</button>
    </div>`;
  attachTargetHandlers();
  document.getElementById("miss-btn").addEventListener("click",addMiss);
  document.getElementById("undo-btn").addEventListener("click",undoMove);
  document.getElementById("next-btn").addEventListener("click",()=>nextPlayer(true));
}
function attachTargetHandlers(){
  document.querySelectorAll(".target-button").forEach(button=>{
    let timer=null,long=false,pointerId=null;
    button.addEventListener("pointerdown",e=>{
      if(e.button!==undefined && e.button!==0) return;
      e.preventDefault(); pointerId=e.pointerId; long=false; button.setPointerCapture?.(pointerId);
      timer=setTimeout(()=>{ long=true; openMultiplierMenu(button); },550);
    });
    const finish=e=>{
      if(pointerId!==null && e.pointerId!==pointerId) return;
      if(timer){clearTimeout(timer);timer=null;}
      if(!long) addMarks(button.dataset.target,1); pointerId=null;
    };
    const cancel=e=>{ if(pointerId!==null && e.pointerId!==pointerId) return; if(timer){clearTimeout(timer);timer=null;} pointerId=null; };
    button.addEventListener("pointerup",finish); button.addEventListener("pointercancel",cancel); button.addEventListener("lostpointercapture",cancel);
  });
}
function openMultiplierMenu(button){
  closeMenus();
  const number=button.dataset.target, menu=document.createElement("div"); menu.className="multiplier-menu";

  if(number==="BULL"){
    menu.classList.add("bullseye-menu");
    menu.innerHTML=`<button data-hit="2" data-bullseye="1">BULL'S EYE</button>`;
  }else{
    menu.innerHTML=`<button data-hit="2">D${number}</button><button data-hit="3">T${number}</button>`;
  }

  document.body.appendChild(menu);
  const rect=button.getBoundingClientRect(),width=number==="BULL"?190:160;
  let left=rect.left+rect.width/2-width/2; left=Math.max(8,Math.min(left,window.innerWidth-width-8));
  let top=rect.top-126; if(top<8) top=rect.bottom+8;
  menu.style.left=`${left}px`; menu.style.top=`${top}px`;
  menu.querySelectorAll("button").forEach(opt=>opt.addEventListener("click",async e=>{
    e.stopPropagation();
    await addMarks(number,Number(opt.dataset.hit),opt.dataset.bullseye==="1");
    closeMenus();
  }));
}
function closeMenus(){ document.querySelectorAll(".multiplier-menu").forEach(m=>m.remove()); }
function getNumberValue(number){ return number==="BULL"?25:parseInt(number,10); }

function checkWinner(){
  const p=game.players[game.activePlayer];
  const allClosed=cricketNumbers.every(n=>(p.marks[n]||0)>=3);
  if(allClosed) game.winner=p.name;
}
function recordStats(number,hits,isBullseye=false){
  const p=game.players[game.activePlayer];
  p.successfulThrows=Number(p.successfulThrows||0)+1;
  if(number==="BULL"){
    // "Toplam Bull sayısı" = Bull bölgesine isabet eden dart adedi.
    // Bull's Eye ayrıca ayrı tie-break kriteri olarak tutulur.
    p.bullHits=Number(p.bullHits||0)+1;
    if(isBullseye) p.bullseyes=Number(p.bullseyes||0)+1;
  }
}
function shotLabel(number,hits,isBullseye=false){
  if(number==="BULL") return isBullseye ? "BULL'S EYE" : "BULL";
  return `${hits===1?"S":hits===2?"D":"T"}${number}`;
}

async function addMarks(number,hits,isBullseye=false){
  if(!game || game.winner) return;
  if(game.suddenDeath?.active) return addSuddenDeathHit(number,hits,isBullseye);
  saveState();
  recordStats(number,hits,isBullseye);
  let current=Number(game.players[game.activePlayer].marks[number]||0), newTotal=current+hits;
  game.currentTurnShots=[...(game.currentTurnShots||[]),shotLabel(number,hits,isBullseye)].slice(-3);

  if(newTotal>3){
    const extraHits=newTotal-3;
    const somebodyOpen=game.players.some((p,i)=>i!==game.activePlayer && Number(p.marks[number]||0)<3);
    if(somebodyOpen && extraHits>0){
      const points=getNumberValue(number)*extraHits;
      game.players[game.activePlayer].score=Number(game.players[game.activePlayer].score||0)+points;
      game.scoreAnimation=`+${points}`;
      clearTimeout(scoreTimer);
      scoreTimer=setTimeout(async()=>{ if(game && !game.suddenDeath?.active){game.scoreAnimation="";renderRemote();await syncGame();} },1000);
    }
    newTotal=3;
  }
  game.players[game.activePlayer].marks[number]=newTotal;
  checkWinner(); renderRemote(); await syncGame();
  if(game.currentTurnShots.length===3 && !game.winner){
    clearTimeout(advanceTimer); advanceTimer=setTimeout(()=>nextPlayer(false),600);
  }
}
async function addMiss(){
  if(!game || game.winner) return;
  saveState();
  game.currentTurnShots=[...(game.currentTurnShots||[]),"ISKA"].slice(-3);
  renderRemote(); await syncGame();
  if(game.currentTurnShots.length===3){ clearTimeout(advanceTimer); advanceTimer=setTimeout(()=>nextPlayer(false),600); }
}

function compareByCriterion(indices,key,mode="number"){
  let best;
  indices.forEach(i=>{
    const p=game.players[i];
    let v=mode==="bool" ? (Number(p[key]||0)>0?1:0) : Number(p[key]||0);
    if(best===undefined || v>best) best=v;
  });
  return indices.filter(i=>{
    const p=game.players[i];
    const v=mode==="bool" ? (Number(p[key]||0)>0?1:0) : Number(p[key]||0);
    return v===best;
  });
}
function evaluateRoundLimit(){
  let tied=game.players.map((_,i)=>i);

  // 1) En çok başarılı atış
  tied=compareByCriterion(tied,"successfulThrows");
  if(tied.length===1) return finishWinner(tied[0],"En çok başarılı atış");

  // 2) En yüksek Cricket puanı
  tied=compareByCriterion(tied,"score");
  if(tied.length===1) return finishWinner(tied[0],"En yüksek puan");

  // 3) En az bir Bull's Eye vurmuş olmak
  tied=compareByCriterion(tied,"bullseyes","bool");
  if(tied.length===1) return finishWinner(tied[0],"Bull's Eye");

  // 4) Toplam Bull isabeti (dart adedi)
  tied=compareByCriterion(tied,"bullHits");
  if(tied.length===1) return finishWinner(tied[0],"Toplam Bull");

  // 5) Hâlâ eşit kalan oyuncular 3 dartlık ani ölüme gider.
  startSuddenDeath(tied);
}
function finishWinner(index,reason=""){
  game.winner=game.players[index].name;
  game.winReason=reason;
  game.suddenDeath=null;
}
function startSuddenDeath(indices){
  game.suddenDeath={
    active:true, round:1, contenders:indices, scores:{}, completed:[],
    message:"3 dartlık ani ölüm"
  };
  indices.forEach(i=>game.suddenDeath.scores[i]=0);
  game.activePlayer=indices[0];
  game.currentTurnShots=[];
  game.scoreAnimation="";
}
function nextSuddenDeathPlayer(){
  const sd=game.suddenDeath;
  if(!sd?.active) return;
  if(!sd.completed.includes(game.activePlayer)) sd.completed.push(game.activePlayer);
  const currentPos=sd.contenders.indexOf(game.activePlayer);
  if(currentPos<sd.contenders.length-1){
    game.activePlayer=sd.contenders[currentPos+1];
    game.currentTurnShots=[];
    return;
  }
  let best=-1, tied=[];
  sd.contenders.forEach(i=>{
    const s=Number(sd.scores[i]||0);
    if(s>best){best=s;tied=[i];} else if(s===best)tied.push(i);
  });
  if(tied.length===1){ finishWinner(tied[0],"Ani ölüm"); return; }
  sd.round=Number(sd.round||1)+1;
  sd.contenders=tied; sd.scores={}; sd.completed=[];
  tied.forEach(i=>sd.scores[i]=0);
  game.activePlayer=tied[0]; game.currentTurnShots=[];
}
async function addSuddenDeathHit(number,hits,isBullseye=false){
  saveState();
  const points=getNumberValue(number)*hits;
  game.suddenDeath.scores[game.activePlayer]=Number(game.suddenDeath.scores[game.activePlayer]||0)+points;
  game.currentTurnShots=[...(game.currentTurnShots||[]),shotLabel(number,hits,isBullseye)].slice(-3);
  game.scoreAnimation=`+${points}`;
  renderRemote(); await syncGame();
  if(game.currentTurnShots.length===3){
    clearTimeout(advanceTimer); advanceTimer=setTimeout(async()=>{ nextSuddenDeathPlayer(); renderRemote(); await syncGame(); },600);
  }
}

async function nextPlayer(manual){
  if(!game || !game.players.length || game.winner) return;
  clearTimeout(advanceTimer);
  if(manual) saveState();
  if(game.suddenDeath?.active){
    // TURU GEÇ: eksik dartları 0 kabul ederek sıradaki ani ölüm oyuncusuna geç.
    nextSuddenDeathPlayer(); closeMenus(); renderRemote(); await syncGame(); return;
  }
  const wasLast=Number(game.activePlayer||0)===game.players.length-1;
  game.activePlayer=(Number(game.activePlayer||0)+1)%game.players.length;
  game.currentTurnShots=[]; game.scoreAnimation=""; closeMenus();

  if(wasLast){
    const limit=Number(game.roundLimit||0);
    const completedRound=Number(game.round||1);
    if(limit && completedRound>=limit){
      evaluateRoundLimit();
    }else{
      game.round=completedRound+1;
    }
  }
  renderRemote(); await syncGame();
}
async function undoMove(){
  clearTimeout(advanceTimer); clearTimeout(scoreTimer); closeMenus();
  if(!history.length) return;
  game=JSON.parse(history.pop()); renderRemote(); await syncGame();
}

joinButton.addEventListener("click",joinRoom);
joinCode.addEventListener("input",()=>joinCode.value=joinCode.value.replace(/\D/g,"").slice(0,4));
joinCode.addEventListener("keydown",e=>{if(e.key==="Enter") joinRoom()});
const params=new URLSearchParams(location.search);
const roomFromUrl=(params.get("room")||"").replace(/\D/g,"").slice(0,4);
if(roomFromUrl.length===4){ joinCode.value=roomFromUrl; joinRoom(); }
buildCountButtons();
