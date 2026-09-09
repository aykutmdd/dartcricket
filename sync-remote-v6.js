import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config-v6.js";

const cricketNumbers = ["20","19","18","17","16","15","BULL"];
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let roomCode = "";
let playerCount = 0;
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
const activeName = document.getElementById("active-player-name");
const activeScore = document.getElementById("active-player-score");
const shotStrip = document.getElementById("shot-strip");
const controls = document.getElementById("remote-controls");
const remoteMessage = document.getElementById("remote-message");
const remoteStatus = document.getElementById("remote-status");

function getSavedPlayers(){
  try{return JSON.parse(localStorage.getItem("dartPlayers")||"[]")}catch{return []}
}
function savePlayer(name){
  if(!name) return;
  const names = getSavedPlayers();
  if(!names.includes(name)){
    names.push(name); names.sort((a,b)=>a.localeCompare(b,"tr"));
    localStorage.setItem("dartPlayers",JSON.stringify(names));
  }
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function initialMarks(){
  return {"20":0,"19":0,"18":0,"17":0,"16":0,"15":0,"BULL":0};
}

function buildCountButtons(){
  playerCountButtons.innerHTML = "";
  for(let i=1;i<=6;i++){
    const b=document.createElement("button");
    b.textContent=`${i} Oyuncu`;
    b.addEventListener("click",()=>selectPlayerCount(i));
    playerCountButtons.appendChild(b);
  }
}

function selectPlayerCount(count){
  playerCount = count;
  const saved = getSavedPlayers();
  playerInputs.innerHTML = "";
  for(let i=1;i<=count;i++){
    const wrap=document.createElement("div");
    wrap.className="player-entry";
    const input=document.createElement("input");
    input.id=`player${i}`;
    input.placeholder=`Oyuncu ${i}`;
    input.setAttribute("list",`playersList${i}`);
    const dl=document.createElement("datalist");
    dl.id=`playersList${i}`;
    saved.forEach(name=>{
      const opt=document.createElement("option");
      opt.value=name; dl.appendChild(opt);
    });
    wrap.append(input,dl);
    playerInputs.appendChild(wrap);
  }
  const start=document.createElement("button");
  start.className="primary-button start-game-button";
  start.textContent="OYUNU BAŞLAT";
  start.addEventListener("click",startGame);
  playerInputs.appendChild(start);
}

async function startGame(){
  if(!playerCount) return;
  const players=[];
  for(let i=1;i<=playerCount;i++){
    const input=document.getElementById(`player${i}`);
    const name=(input?.value||"").trim() || `Oyuncu ${i}`;
    savePlayer(name);
    players.push({name,score:0,marks:initialMarks()});
  }
  history=[];
  game={
    players,
    activePlayer:0,
    currentTurnShots:[],
    winner:null,
    scoreAnimation:""
  };
  await syncGame();
  showControls();
}

function showSetup(){
  joinScreen.classList.add("hidden");
  controlScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  setupRoom.textContent=roomCode;
}
function showControls(){
  joinScreen.classList.add("hidden");
  setupScreen.classList.add("hidden");
  controlScreen.classList.remove("hidden");
  controlRoom.textContent=roomCode;
  renderRemote();
}

async function joinRoom(){
  const code=joinCode.value.replace(/\D/g,"").slice(0,4);
  if(code.length!==4){
    joinStatus.textContent="4 haneli oda kodunu gir.";
    return;
  }
  joinButton.disabled=true;
  joinStatus.textContent="Bağlanıyor…";
  try{
    const roomRef=ref(db,`rooms/${code}`);
    const snap=await get(roomRef);
    if(!snap.exists()){
      joinStatus.textContent="Bu oda bulunamadı.";
      joinButton.disabled=false;
      return;
    }
    roomCode=code;
    await update(roomRef,{remoteOnline:true,lastRemoteSeen:Date.now()});
    onDisconnect(ref(db,`rooms/${code}/remoteOnline`)).set(false);

    onValue(roomRef,s=>{
      const data=s.val();
      if(!data) return;
      remoteStatus.textContent=data.tvOnline===false?"TV bağlantısı yok":"Bağlı";
      if(data.game && Array.isArray(data.game.players) && data.game.players.length){
        if(!game) game=data.game;
        if(controlScreen.classList.contains("hidden")) showControls();
      }
    });

    const data=snap.val();
    if(data.game && Array.isArray(data.game.players) && data.game.players.length){
      game=data.game;
      showControls();
    }else{
      showSetup();
    }
    joinStatus.textContent="";
  }catch(err){
    console.error(err);
    joinStatus.textContent="Bağlantı kurulamadı. Firebase ayarlarını kontrol et.";
    joinButton.disabled=false;
  }
}

function saveState(){
  if(!game) return;
  history.push(JSON.stringify(game));
  if(history.length>100) history.shift();
}

async function syncGame(){
  if(!roomCode || !game) return;
  await update(ref(db,`rooms/${roomCode}`),{
    status:"playing",
    game,
    remoteOnline:true,
    updatedAt:Date.now()
  });
}

function renderRemote(){
  if(!game || !game.players?.length) return;
  const p=game.players[game.activePlayer];
  activeName.textContent=p?.name||"-";
  activeScore.textContent=String(p?.score||0);
  const shots=game.currentTurnShots||[];
  shotStrip.innerHTML=[0,1,2].map(i=>`<div class="shot-chip">${escapeHtml(shots[i]||"-")}</div>`).join("");
  remoteMessage.textContent=game.winner ? `🏆 ${game.winner} KAZANDI` : (game.scoreAnimation||"");

  controls.innerHTML=`
    <div class="remote-controls-grid">
      ${["20","19","18","17","16","15","BULL"].map(n=>`<button class="target-button ${n==="BULL"?"bull-button":""}" data-target="${n}">${n}</button>`).join("")}
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
    let timer=null;
    let long=false;
    let pointerId=null;

    button.addEventListener("pointerdown",e=>{
      if(e.button!==undefined && e.button!==0) return;
      e.preventDefault();
      pointerId=e.pointerId;
      long=false;
      button.setPointerCapture?.(pointerId);
      timer=setTimeout(()=>{
        long=true;
        openMultiplierMenu(button);
      },550);
    });

    const finish=e=>{
      if(pointerId!==null && e.pointerId!==pointerId) return;
      if(timer){clearTimeout(timer);timer=null;}
      if(!long) addMarks(button.dataset.target,1);
      pointerId=null;
    };
    const cancel=e=>{
      if(pointerId!==null && e.pointerId!==pointerId) return;
      if(timer){clearTimeout(timer);timer=null;}
      pointerId=null;
    };

    button.addEventListener("pointerup",finish);
    button.addEventListener("pointercancel",cancel);
    button.addEventListener("lostpointercapture",cancel);
  });
}

function openMultiplierMenu(button){
  closeMenus();
  const number=button.dataset.target;
  const menu=document.createElement("div");
  menu.className="multiplier-menu";
  menu.innerHTML=`<button data-hit="2">D${number}</button><button data-hit="3">T${number}</button>`;
  document.body.appendChild(menu);

  const rect=button.getBoundingClientRect();
  const width=160;
  let left=rect.left+rect.width/2-width/2;
  left=Math.max(8,Math.min(left,window.innerWidth-width-8));
  let top=rect.top-126;
  if(top<8) top=rect.bottom+8;
  menu.style.left=`${left}px`;
  menu.style.top=`${top}px`;

  menu.querySelectorAll("button").forEach(opt=>{
    opt.addEventListener("click",async e=>{
      e.stopPropagation();
      await addMarks(number,Number(opt.dataset.hit));
      closeMenus();
    });
  });
}
function closeMenus(){document.querySelectorAll(".multiplier-menu").forEach(m=>m.remove())}

function getNumberValue(number){return number==="BULL"?25:parseInt(number,10)}

function checkWinner(){
  const p=game.players[game.activePlayer];
  const allClosed=cricketNumbers.every(n=>(p.marks[n]||0)>=3);
  if(allClosed) game.winner=p.name;
}

async function addMarks(number,hits){
  if(!game || game.winner) return;
  saveState();

  let current=Number(game.players[game.activePlayer].marks[number]||0);
  let newTotal=current+hits;
  const prefix=hits===1?"S":hits===2?"D":"T";
  game.currentTurnShots=[...(game.currentTurnShots||[]),prefix+number].slice(-3);

  if(newTotal>3){
    const extraHits=newTotal-3;
    const somebodyOpen=game.players.some((p,i)=>i!==game.activePlayer && Number(p.marks[number]||0)<3);
    if(somebodyOpen && extraHits>0){
      const points=getNumberValue(number)*extraHits;
      game.players[game.activePlayer].score=Number(game.players[game.activePlayer].score||0)+points;
      game.scoreAnimation=`+${points}`;
      clearTimeout(scoreTimer);
      scoreTimer=setTimeout(async()=>{
        if(game){game.scoreAnimation=""; renderRemote(); await syncGame();}
      },1000);
    }
    newTotal=3;
  }

  game.players[game.activePlayer].marks[number]=newTotal;
  checkWinner();
  renderRemote();
  await syncGame();

  if(game.currentTurnShots.length===3 && !game.winner){
    clearTimeout(advanceTimer);
    advanceTimer=setTimeout(()=>nextPlayer(false),600);
  }
}

async function addMiss(){
  if(!game || game.winner) return;
  saveState();
  game.currentTurnShots=[...(game.currentTurnShots||[]),"ISKA"].slice(-3);
  renderRemote();
  await syncGame();
  if(game.currentTurnShots.length===3){
    clearTimeout(advanceTimer);
    advanceTimer=setTimeout(()=>nextPlayer(false),600);
  }
}

async function nextPlayer(manual){
  if(!game || !game.players.length) return;
  clearTimeout(advanceTimer);
  if(manual) saveState();
  game.activePlayer=(Number(game.activePlayer||0)+1)%game.players.length;
  game.currentTurnShots=[];
  game.scoreAnimation="";
  closeMenus();
  renderRemote();
  await syncGame();
}

async function undoMove(){
  clearTimeout(advanceTimer);
  clearTimeout(scoreTimer);
  closeMenus();
  if(!history.length) return;
  game=JSON.parse(history.pop());
  renderRemote();
  await syncGame();
}

joinButton.addEventListener("click",joinRoom);
joinCode.addEventListener("input",()=>joinCode.value=joinCode.value.replace(/\D/g,"").slice(0,4));
joinCode.addEventListener("keydown",e=>{if(e.key==="Enter") joinRoom()});

const params=new URLSearchParams(location.search);
const roomFromUrl=(params.get("room")||"").replace(/\D/g,"").slice(0,4);
if(roomFromUrl.length===4){
  joinCode.value=roomFromUrl;
  joinRoom();
}

buildCountButtons();
