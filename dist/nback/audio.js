import {channelsForConfig} from './engine.js';

export const AUDIO_SYMBOLS = Object.freeze(['A','B','C','D','E','F','G','H']);
const operations={'+':'plus','-':'minus','*':'times','/':'divide'};
const files=[...Array.from({length:8},(_,i)=>`letter-${i+1}`),...Array.from({length:8},(_,i)=>`tone-${i+1}`),...Object.values(operations)];

/** Decode the complete, locally shipped sound bank before a round can start. */
export async function createAudioBank(){
  const AudioContext=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioContext)throw new Error('Ez a böngésző nem támogatja a játék hangját. Nyisd meg egy friss böngészőben.');
  const context=new AudioContext();
  const buffers=new Map(),sources=new Set();let disposed=false;
  try{
    await Promise.all(files.map(async id=>{
      const response=await fetch(new URL(`./audio/${id}.wav?v=4`,import.meta.url),{cache:'force-cache'});
      if(!response.ok)throw new Error('A hangkészlet most nem töltődött be. Ellenőrizd a kapcsolatot, majd próbáld újra.');
      buffers.set(id,await context.decodeAudioData(await response.arrayBuffer()));
    }));
  }catch(error){await context.close().catch(()=>{});throw error;}
  function stop(){for(const source of sources){try{source.stop();}catch{}try{source.disconnect();}catch{}}sources.clear();}
  function start(id,pan,at,offsetMs=0){
    const buffer=buffers.get(id);if(!buffer||Number.isFinite(buffer.duration)&&offsetMs>=buffer.duration*1000)return;
    const source=context.createBufferSource();source.buffer=buffer;
    let output=source,panner=null;
    if(pan&&context.createStereoPanner){panner=context.createStereoPanner();panner.pan.value=pan;source.connect(panner);output=panner;}
    output.connect(context.destination);sources.add(source);
    source.onended=()=>{sources.delete(source);source.disconnect();panner?.disconnect();};
    if(offsetMs>0)source.start(at,offsetMs/1000);else source.start(at);
  }
  return {
    async unlock(){
      if(disposed)throw new Error('Ez a hangkör már lezárult. Indíts új kört.');
      await context.resume();
      if(context.state!=='running')throw new Error('A hang még nem indult el. Koppints újra az indításra.');
    },
    play(stimuli,config,operation=null,warmup=false,offsetMs=0){
      if(disposed)return;
      stop();
      const channels=new Set(channelsForConfig(config).map(channel=>channel.id));
      const hasAudio=channels.has('audio'),hasSecond=channels.has('audio2'),hasArithmetic=channels.has('arithmetic');
      if(!hasAudio&&!hasSecond&&(!hasArithmetic||warmup))return;
      if(context.state!=='running')throw new Error('A böngésző szüneteltette a hangot. Folytasd a kört az indítógombbal.');
      const at=context.currentTime+0.005;
      if(hasAudio)start(`letter-${stimuli.audio}`,hasSecond?-0.8:0,at,offsetMs);
      if(hasSecond)start(`tone-${stimuli.audio2}`,0.8,at,offsetMs);
      if(hasArithmetic&&!warmup&&operations[operation])start(operations[operation],0,at,offsetMs);
    },
    durationMs(stimuli,config,operation=null,warmup=false){
      const ids=new Set(channelsForConfig(config).map(channel=>channel.id)),durations=[];
      if(ids.has('audio'))durations.push(buffers.get(`letter-${stimuli.audio}`)?.duration||0);
      if(ids.has('audio2'))durations.push(buffers.get(`tone-${stimuli.audio2}`)?.duration||0);
      if(ids.has('arithmetic')&&!warmup&&operations[operation])durations.push(buffers.get(operations[operation])?.duration||0);
      return Math.ceil(Math.max(0,...durations)*1000)+20;
    },
    stop,
    dispose(){if(disposed)return;disposed=true;stop();buffers.clear();void context.close().catch(()=>{});},
  };
}
