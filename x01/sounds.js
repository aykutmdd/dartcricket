// Local effects: no third-party sound service or audio downloads.
let context=null,master=null,enabled=true,celebrationTimer=null;
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
    const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(master);source.start();
  }catch{}
}
export function toggleSound(){enabled=!enabled;try{localStorage.setItem('x01Sound',enabled?'on':'off');}catch{}if(!enabled){clearTimeout(celebrationTimer);try{window.speechSynthesis?.cancel();}catch{}if(master)master.gain.value=0;}else{if(master)master.gain.value=.55;unlockSound();playShot({label:'S20'},{});}return enabled;}
function tone(frequency,offset,duration=.2,volume=.22,type='sine',endFrequency=null){
  if(!context||!master)return;
  const start=context.currentTime+offset,o=context.createOscillator(),gain=context.createGain();o.type=type;o.frequency.setValueAtTime(frequency,start);if(endFrequency)o.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(gain);gain.connect(master);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();gain.disconnect();};
}
function chime(notes,step=.09){notes.forEach((f,i)=>{tone(f,i*step,.25,.18);tone(f*2,i*step,.14,.045);});}
function applause(){
  if(!context)return;
  // Overlapping filtered noise bursts imitate a small crowd clapping.
  const duration=2.6,length=Math.ceil(context.sampleRate*duration),buffer=context.createBuffer(2,length,context.sampleRate);
  for(let channel=0;channel<2;channel++){
    const samples=buffer.getChannelData(channel);
    for(let clap=0;clap<95;clap++){
      const at=Math.floor((.06+Math.random()*2.2)*context.sampleRate),tail=Math.floor((.025+Math.random()*.045)*context.sampleRate),strength=.11+Math.random()*.15;
      for(let i=0;i<tail&&at+i<length;i++)samples[at+i]+=(Math.random()*2-1)*strength*Math.exp(-i/(tail*.19));
    }
    for(let i=0;i<length;i++)samples[i]=Math.tanh(samples[i]);
  }
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1600;filter.Q.value=.6;gain.gain.value=.9;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
export function sayBullseye(){
  if(!enabled)return;
  // Called directly from the tap so mobile speech permissions apply.
  try{if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance)return;window.speechSynthesis.cancel();const phrase=new SpeechSynthesisUtterance("Bull's eye!");phrase.lang='en-US';phrase.rate=.9;phrase.pitch=1.05;phrase.volume=.9;const voice=window.speechSynthesis.getVoices().find(v=>/^en[-_]/i.test(v.lang));if(voice)phrase.voice=voice;window.speechSynthesis.speak(phrase);}catch{}
}
export function playShot(action,game){
  if(!enabled)return;
  try{
    if(game.bust){tone(220,0,.35,.2,'triangle',90);tone(150,.12,.3,.14,'triangle',65);}
    else if(action.label==='ISKA'){tone(180,0,.22,.2,'triangle',65);}
    else if(action.label==='BULL'){chime([523.25,659.25,783.99,1046.5],.075);}
    else if(action.label==="BULL'S EYE"){chime([784,1047,1568],.09);}
    else {const m=action.label?.startsWith('T')?3:action.label?.startsWith('D')?2:1;chime(m===3?[880,1175,1568]:m===2?[880,1320]:[1047,1568]);}
    if(game.winner!=null){clearTimeout(celebrationTimer);celebrationTimer=setTimeout(()=>{if(enabled)try{chime([523,659,784,1047],.13);applause();}catch{}},action.label==="BULL'S EYE"?1000:280);}
  }catch{}
}
export function stopCelebration(){clearTimeout(celebrationTimer);try{window.speechSynthesis?.cancel();}catch{}}

export function announceSoundReady(){
  if(!enabled)return;
  try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;const phrase=new SpeechSynthesisUtterance('Ses açık.');phrase.lang='tr-TR';phrase.volume=.8;window.speechSynthesis.speak(phrase);}catch{}
}
