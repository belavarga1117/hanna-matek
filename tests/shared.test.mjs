import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSettings,parseRoute,settingsQuery,normalizeResult,readHistory,saveHistory,historyStats,createCountdown} from '../dist/core.js';
import {makePictureRound,makeCodeRound,scoreCode} from '../dist/games/advanced-games.js';

function rng(seed=42){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
test('shared links are bounded, deterministic and never carry history',()=>{
 const s=normalizeSettings({count:999,seconds:-2,difficulty:'bogus',reverse:'1'});
 assert.deepEqual(s,{count:9,seconds:3,difficulty:'normal',reverse:true,level:1,rounds:3,theme:'stations',symbolSet:'objects'});
 assert.deepEqual(parseRoute('#/jatek/digits?'+settingsQuery(s),['digits']),{page:'game',id:'digits',settings:s});
 assert.deepEqual(parseRoute('#/jatek/unknown?count=50',['digits']),{page:'home'});
 assert.equal(normalizeSettings({seconds:'bad'}).seconds,10);
});
test('result scores and untrusted history are normalized without breaking play',()=>{
 assert.equal(normalizeResult({correct:100,total:4}).percent,100);
 assert.equal(normalizeResult({correct:-1,total:4}).correct,0);
 assert.deepEqual(readHistory({getItem:()=>'{invalid'},['digits']),[]);
 assert.deepEqual(readHistory({getItem:()=>JSON.stringify([{gameId:'other',at:new Date().toISOString(),correct:2,total:2}])},['digits']),[]);
 const entry={gameId:'digits',at:new Date().toISOString(),correct:3,total:5,settings:{count:5},duration:20};
 let text; const storage={setItem:(k,v)=>text=v,getItem:()=>text};
 saveHistory(storage,Array.from({length:205},()=>entry));
 const history=readHistory(storage,['digits']);assert.equal(history.length,200);assert.equal(history[0].percent,60);assert.deepEqual(historyStats(history),{rounds:200,games:1,percent:60});
});
test('countdown pauses, resumes and completes exactly once',()=>{
 let now=0,tick,done=0,cancelled=0;
 const timer=createCountdown(10,{now:()=>now,schedule:fn=>(tick=fn,1),unschedule:()=>cancelled++,onDone:()=>done++});
 now=3000;tick();assert.equal(timer.remaining,7);timer.pause();now=9000;assert.equal(timer.remaining,7);timer.resume();now=16000;tick();timer.finish();assert.equal(done,1);assert.equal(cancelled,1);
});
test('abandoned countdown cannot finish a later game',()=>{
 let now=0,tick,done=0;const timer=createCountdown(3,{now:()=>now,schedule:fn=>(tick=fn,1),unschedule:()=>{},onDone:()=>done++});timer.cancel();now=4000;tick();timer.finish();assert.equal(done,0);
});
test('visual recognition always has four distinct choices and exactly one target',()=>{
 for(const difficulty of ['easy','normal','hard'])for(let seed=1;seed<=60;seed++){
  const round=makePictureRound(difficulty,rng(seed));assert.equal(round.choices.length,4);assert.equal(round.choices.filter(c=>c.correct).length,1);assert.equal(new Set(round.choices.map(c=>JSON.stringify(c.picture))).size,4);assert.deepEqual(round.choices.find(c=>c.correct).picture,round.target);
 }
});
test('code symbols are unique and numeric zero is preserved in scoring',()=>{
 const round=makeCodeRound(8,'hard',rng(21));assert.equal(round.symbols.length,8);assert.equal(new Set(round.symbols.map(s=>s[1])).size,8);assert.equal(round.message.length,8);assert.ok(round.message.every(d=>d>=0&&d<8));assert.equal(scoreCode([0,1,2],'012'),3);assert.equal(scoreCode([0,1,2],'011'),2);
});
