// Effects play locally; recorded applause is bundled with this application.
let context=null,master=null,enabled=true,celebrationTimer=null,applauseBuffer=null,applauseLoading=null,applauseSource=null,celebrationEpoch=0,bullseyeBuffer=null,bullseyeLoading=null,bullseyeSource=null;
try{enabled=localStorage.getItem('x01Sound')!=='off';}catch{}
export function soundEnabled(){return enabled;}
export function unlockSound(){
  if(!enabled)return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    if(!context){context=new Audio();master=context.createGain();master.gain.value=.55;master.connect(context.destination);}
    if(context.state!=='running')context.resume().catch(()=>{});
    // A silent sample activates audio during the button gesture on mobile.
    const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(master);source.start();loadApplause();loadBullseye();
  }catch{}
}
export function toggleSound(){enabled=!enabled;try{localStorage.setItem('x01Sound',enabled?'on':'off');}catch{}if(!enabled){stopCelebration();if(master)master.gain.value=0;}else{if(master)master.gain.value=.55;unlockSound();playShot({label:'S20'},{});}return enabled;}
function tone(frequency,offset,duration=.2,volume=.22,type='sine',endFrequency=null){
  if(!context||!master)return;
  const start=context.currentTime+offset,o=context.createOscillator(),gain=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,start);if(endFrequency)o.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(gain);gain.connect(master);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();gain.disconnect();};
}
function chime(notes,step=.09){notes.forEach((f,i)=>{tone(f,i*step,.25,.18);tone(f*2,i*step,.14,.045);});}
function loadApplause(){
  if(applauseBuffer)return Promise.resolve(applauseBuffer);
  if(applauseLoading)return applauseLoading;
  if(!context)return Promise.resolve(null);
  applauseLoading=fetch(new URL('./applause.mp3?v=1.3',import.meta.url))
    .then(response=>{if(!response.ok)throw Error('Alkış dosyası yüklenemedi');return response.arrayBuffer();})
    .then(bytes=>context.decodeAudioData(bytes))
    .then(buffer=>{applauseBuffer=buffer;return buffer;})
    .catch(error=>{console.warn(error.message);return null;})
    .finally(()=>{applauseLoading=null;});
  return applauseLoading;
}
async function applause(){
  const epoch=celebrationEpoch,buffer=await loadApplause();
  if(!enabled||epoch!==celebrationEpoch||!buffer||!context)return;
  if(applauseSource)try{applauseSource.stop();}catch{}
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;gain.gain.value=1.25;source.connect(gain);gain.connect(master);applauseSource=source;source.start();
  source.onended=()=>{source.disconnect();gain.disconnect();if(applauseSource===source)applauseSource=null;};
}
function missBuzz(){
  if(!context||!master)return;
  const start=context.currentTime,duration=.72,o=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain(),vibrato=context.createOscillator(),depth=context.createGain();
  o.type='sawtooth';o.frequency.setValueAtTime(115,start);o.frequency.exponentialRampToValueAtTime(42,start+duration);
  filter.type='lowpass';filter.Q.value=3;filter.frequency.setValueAtTime(700,start);filter.frequency.exponentialRampToValueAtTime(180,start+duration);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.3,start+.025);gain.gain.setValueAtTime(.25,start+.43);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  vibrato.frequency.value=22;depth.gain.value=8;vibrato.connect(depth);depth.connect(o.frequency);o.connect(filter);filter.connect(gain);gain.connect(master);o.start(start);vibrato.start(start);o.stop(start+duration+.02);vibrato.stop(start+duration+.02);
  o.onended=()=>{o.disconnect();filter.disconnect();gain.disconnect();vibrato.disconnect();depth.disconnect();};
}
function loadBullseye(){
  if(bullseyeBuffer)return Promise.resolve(bullseyeBuffer);
  if(bullseyeLoading)return bullseyeLoading;
  if(!context)return Promise.resolve(null);
  bullseyeLoading=fetch(new URL('./bullseye.mp3?v=1.4',import.meta.url))
    .then(response=>{if(!response.ok)throw Error('Bull’s eye dosyası yüklenemedi');return response.arrayBuffer();})
    .then(bytes=>context.decodeAudioData(bytes))
    .then(buffer=>{bullseyeBuffer=buffer;return buffer;})
    .catch(error=>{console.warn(error.message);return null;})
    .finally(()=>{bullseyeLoading=null;});
  return bullseyeLoading;
}
async function playBullseye(){
  const epoch=celebrationEpoch,buffer=await loadBullseye();
  if(!enabled||epoch!==celebrationEpoch||!buffer||!context)return;
  if(bullseyeSource)try{bullseyeSource.stop();}catch{}
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=1.2;source.connect(gain);gain.connect(master);bullseyeSource=source;
  await new Promise(resolve=>{source.onended=()=>{source.disconnect();gain.disconnect();if(bullseyeSource===source)bullseyeSource=null;resolve();};source.start();});
}
export function playShot(action,game){
  if(!enabled)return;
  const epoch=celebrationEpoch;let bullseyeFinished=null;
  try{
    if(game.bust){missBuzz();}
    else if(action.label==='ISKA'){missBuzz();}
    else if(action.label==='BULL'){chime([523.25,659.25,783.99,1046.5],.075);}
    else if(action.label==="BULL'S EYE"){bullseyeFinished=playBullseye();}
    else {const m=action.label?.startsWith('T')?3:action.label?.startsWith('D')?2:1;chime(m===3?[880,1175,1568]:m===2?[880,1320]:[1047,1568]);}
    if(game.winner!=null){
      const schedule=()=>{if(!enabled||epoch!==celebrationEpoch)return;clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>{if(enabled&&epoch===celebrationEpoch)applause().catch(()=>{});},280);};
      if(bullseyeFinished)bullseyeFinished.then(schedule).catch(()=>{});else schedule();
    }
  }catch{}
}
export function stopCelebration(){celebrationEpoch++;clearTimeout(celebrationTimer);if(bullseyeSource){try{bullseyeSource.stop();}catch{}bullseyeSource=null;}if(applauseSource){try{applauseSource.stop();}catch{}applauseSource=null;}}
export function announceSoundReady(){} // The activation chime confirms audio is enabled.
