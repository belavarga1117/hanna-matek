import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createAudioBank} from '../dist/nback/audio.js';

test('all local n-back clips are distinct PCM assets shorter than the fastest trial',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../dist/nback/audio/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.clips.length,20);
  const bytes=await Promise.all(manifest.clips.map(async clip=>{
    const buf=await readFile(new URL('../dist/nback/audio/'+clip.file,import.meta.url));
    assert.equal(buf.toString('ascii',0,4),'RIFF');assert.equal(buf.toString('ascii',8,12),'WAVE');
    assert.ok(clip.duration>0.05&&clip.duration<1.2);
    if(!clip.file.startsWith('tone-'))assert.equal(clip.trailingReserveMs,120);
    return buf.toString('base64');
  }));
  assert.equal(new Set(bytes).size,20);
});

test('decoded banks start together, warmup suppresses arithmetic, stop and dispose never replay',async()=>{
  const oldFetch=globalThis.fetch,oldContext=globalThis.AudioContext,calls=[],contexts=[];
  globalThis.fetch=async url=>({ok:true,arrayBuffer:async()=>({id:url.pathname.split('/').at(-1)})});
  globalThis.AudioContext=class{
    state='suspended';currentTime=11;destination={};
    constructor(){contexts.push(this);}
    async decodeAudioData(data){return {...data,duration:0.8};}
    async resume(){this.state='running';}
    async close(){this.state='closed';}
    createStereoPanner(){return{pan:{value:0},connect(){},disconnect(){}};}
    createBufferSource(){const source={connect(){},disconnect(){},stop(){calls.push(['stop',this.buffer.id]);},start(at,offset){calls.push(offset===undefined?['play',this.buffer.id,at]:['resume',this.buffer.id,at,offset]);}};return source;}
  };
  try{
    const bank=await createAudioBank();assert.equal(calls.length,0);await bank.unlock();
    bank.play({audio:2,audio2:5},{mode:100});
    assert.deepEqual(calls.filter(c=>c[0]==='play'),[['play','letter-2.wav',11.005],['play','tone-5.wav',11.005]]);
    bank.stop();assert.equal(calls.filter(c=>c[0]==='stop').length,2);
    bank.play({audio:2},{mode:11},null,false,400);assert.deepEqual(calls.at(-1),['resume','letter-2.wav',11.005,0.4]);
    const endedCount=calls.filter(c=>c[0]==='play'||c[0]==='resume').length;bank.play({audio:2},{mode:11},null,false,900);assert.equal(calls.filter(c=>c[0]==='play'||c[0]==='resume').length,endedCount);
    bank.play({},{mode:7},'+',true);assert.equal(calls.filter(c=>c[0]==='play').length,2);
    bank.play({},{mode:7},'+',false);assert.equal(calls.at(-1)[1],'plus.wav');
    bank.dispose();bank.dispose();assert.equal(contexts[0].state,'closed');
    const count=calls.length;bank.play({audio:2},{mode:11});assert.equal(calls.length,count);
    await assert.rejects(()=>bank.unlock(),/lezárult/);
  }finally{globalThis.fetch=oldFetch;globalThis.AudioContext=oldContext;}
});
