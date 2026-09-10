import test from 'node:test';
import assert from 'node:assert/strict';
import {seededRandom,normalizeGameSettings,scoreAttempt} from '../dist/game-engine.js';
import {generateDigitsRound,generateGridRound,generatePathRound,generateMissingRound} from '../dist/games/core-games.js';
import {generateStationsRound,generateFaces,generatePrices,generateShopping} from '../dist/games/association-games.js';
import {generatePictureRounds,generateCodeRound} from '../dist/games/advanced-games.js';

const SEED=0x1234abcd;
function generated(gameId,raw={}){
  const settings=normalizeGameSettings(gameId,raw),rng=seededRandom(SEED);
  if(gameId==='digits')return [settings,generateDigitsRound(settings,rng)];
  if(gameId==='grid')return [settings,generateGridRound(settings,rng)];
  if(gameId==='path')return [settings,generatePathRound(settings,rng)];
  if(gameId==='missing')return [settings,generateMissingRound(settings,rng)];
  if(gameId==='stations')return [settings,generateStationsRound(settings,rng)];
  if(gameId==='faces')return [settings,generateFaces(settings.count,rng)];
  if(gameId==='prices')return [settings,generatePrices(settings.count,settings.difficulty,rng,settings.level)];
  if(gameId==='shopping')return [settings,generateShopping(settings.count,rng)];
  if(gameId==='picture')return [settings,generatePictureRounds(settings,rng)];
  if(gameId==='code')return [settings,generateCodeRound(settings,rng)];
  throw new Error(gameId);
}
function perfect(gameId,raw={}){
  const [settings,round]=generated(gameId,raw);
  if(gameId==='digits')return [settings,{digits:round.expected.join('')}];
  if(gameId==='grid')return [settings,{cells:[...round.cells]}];
  if(gameId==='path')return [settings,{cells:[...round.expected]}];
  if(gameId==='missing')return [settings,{choiceId:round.missing.label}];
  if(gameId==='stations')return [settings,{items:[...round.expected]}];
  if(gameId==='faces')return [settings,{answers:round.map(face=>({faceId:face.id,name:face.name,...(settings.level>=2?{job:face.job}:{}),...(settings.level>=3?{room:face.room}:{})}))}];
  if(gameId==='prices')return [settings,{answers:round.map(item=>({itemId:item.id,price:item.price,...(settings.level>=2?{discount:item.discount}:{})}))}];
  if(gameId==='shopping')return [settings,{itemIds:round.targets.map(item=>item.id)}];
  if(gameId==='picture')return [settings,{rounds:round.map(item=>settings.level===1?{choiceId:item.target.id}:{itemIds:item.sequence.map(scene=>scene.id)})}];
  if(gameId==='code')return [settings,{mapping:round.symbols.map((symbol,digit)=>({digit,symbolId:symbol.id})),answers:round.messages.map(message=>message.join(''))}];
  throw new Error(gameId);
}

test('seededRandom ugyanabból a uint32 seedből ugyanazt a sorozatot adja',()=>{
  const first=seededRandom(SEED),second=seededRandom(SEED);
  assert.deepEqual(Array.from({length:20},()=>first()),Array.from({length:20},()=>second()));
  assert.throws(()=>seededRandom(-1),/seed/);assert.throws(()=>seededRandom(2**32),/seed/);
});

test('játékspecifikus beállítások szinteket, köröket és témákat ellenőriznek',()=>{
  assert.equal(normalizeGameSettings('faces',{level:3,count:99}).count,6);
  assert.equal(normalizeGameSettings('stations',{level:1,count:99}).count,6);
  assert.deepEqual(normalizeGameSettings('stations',{level:2,theme:'streets',count:8}).count,5);
  assert.equal(normalizeGameSettings('prices',{level:1,count:99}).count,5);
  assert.equal(normalizeGameSettings('prices',{level:2,count:99}).count,5);
  assert.equal(normalizeGameSettings('code',{level:3,rounds:1}).count,5);
  assert.equal(normalizeGameSettings('code',{level:3,rounds:1}).rounds,3);
  assert.throws(()=>normalizeGameSettings('unknown',{}),/Ismeretlen játék/);
  assert.throws(()=>normalizeGameSettings('digits',{level:2}),/nincs 2\. szint/);
  assert.throws(()=>normalizeGameSettings('stations',{theme:'sea'}),/téma/);
  assert.throws(()=>normalizeGameSettings('code',{symbolSet:'copied'}),/szimbólum/);
});

const modes=[
  ['digits',{}],['grid',{difficulty:'easy'}],['path',{reverse:true}],['missing',{}],
  ['stations',{level:1,theme:'stations'}],['stations',{level:1,theme:'streets'}],['stations',{level:2}],
  ['faces',{level:1}],['faces',{level:2}],['faces',{level:3}],
  ['prices',{level:1}],['prices',{level:2}],['shopping',{level:1}],['shopping',{level:2}],
  ['picture',{level:1,rounds:3}],['picture',{level:2,rounds:5}],
  ['code',{level:1,rounds:3,symbolSet:'objects'}],['code',{level:2,rounds:4,symbolSet:'abstract'}],['code',{level:3,rounds:5,symbolSet:'objects'}],
];
for(const [gameId,raw] of modes)test(`${gameId} ${JSON.stringify(raw)} hibátlan nyers választ szerveren 100%-ra pontoz`,()=>{
  const [settings,answer]=perfect(gameId,raw),result=scoreAttempt(gameId,settings,SEED,answer);
  assert.equal(result.correct,result.total);assert.equal(result.percent,100);assert.ok(result.total>0);assert.equal(result.details.length,result.total);
});

test('minden szabálytípus részpontot ad a helyes mezőkre, és a hibás válasz nem lesz teljes',()=>{
  const cases=[];
  for(const [gameId,raw] of [['digits',{}],['grid',{}],['path',{}],['stations',{level:2}],['faces',{level:3}],['prices',{level:2}],['shopping',{level:2}],['picture',{level:1}],['picture',{level:2}],['code',{level:3}]]){
    const [settings,answer]=perfect(gameId,raw);
    if(gameId==='digits')answer.digits=`${(Number(answer.digits[0])+1)%10}${answer.digits.slice(1)}`;
    else if(gameId==='grid'){const [,round]=generated(gameId,raw);answer.cells[0]=Array.from({length:round.size*round.size},(_,i)=>i).find(i=>!round.cells.includes(i));}
    else if(gameId==='path')[answer.cells[0],answer.cells[1]]=[answer.cells[1],answer.cells[0]];
    else if(gameId==='stations')[answer.items[0],answer.items[1]]=[answer.items[1],answer.items[0]];
    else if(gameId==='faces')[answer.answers[0].name,answer.answers[1].name]=[answer.answers[1].name,answer.answers[0].name];
    else if(gameId==='prices')answer.answers[0].discount+=1;
    else if(gameId==='shopping')[answer.itemIds[0],answer.itemIds[1]]=[answer.itemIds[1],answer.itemIds[0]];
    else if(gameId==='picture'&&settings.level===1){const [,rounds]=generated(gameId,raw);answer.rounds[0].choiceId=rounds[0].choices.find(item=>item.id!==rounds[0].target.id).id;}
    else if(gameId==='picture')[answer.rounds[0].itemIds[0],answer.rounds[0].itemIds[1]]=[answer.rounds[0].itemIds[1],answer.rounds[0].itemIds[0]];
    else if(gameId==='code')answer.answers[0]=`${(Number(answer.answers[0][0])+1)%10}${answer.answers[0].slice(1)}`;
    cases.push(scoreAttempt(gameId,settings,SEED,answer));
  }
  for(const result of cases){assert.ok(result.correct>0);assert.ok(result.correct<result.total);assert.ok(result.percent>0&&result.percent<100);}
});

test('extra mezők, hibás hossz, ismétlés és idegen azonosító nem növelhet pontot',()=>{
  const malformed=[];
  {const [s,a]=perfect('digits');malformed.push(()=>scoreAttempt('digits',s,SEED,{...a,correct:999}));}
  {const [s,a]=perfect('grid');a.cells[1]=a.cells[0];malformed.push(()=>scoreAttempt('grid',s,SEED,a));}
  {const [s,a]=perfect('path');a.cells.pop();malformed.push(()=>scoreAttempt('path',s,SEED,a));}
  {const [s]=perfect('missing');malformed.push(()=>scoreAttempt('missing',s,SEED,{choiceId:'idegen'}));}
  {const [s,a]=perfect('stations',{level:2});a.items[1]=a.items[0];malformed.push(()=>scoreAttempt('stations',s,SEED,a));}
  {const [s,a]=perfect('faces',{level:3});a.answers[1].faceId=a.answers[0].faceId;malformed.push(()=>scoreAttempt('faces',s,SEED,a));}
  {const [s,a]=perfect('prices',{level:2});a.answers[0].extra=1;malformed.push(()=>scoreAttempt('prices',s,SEED,a));}
  {const [s,a]=perfect('shopping',{level:1});a.itemIds[1]=a.itemIds[0];malformed.push(()=>scoreAttempt('shopping',s,SEED,a));}
  {const [s,a]=perfect('picture',{level:2});a.rounds[0].itemIds[1]=a.rounds[0].itemIds[0];malformed.push(()=>scoreAttempt('picture',s,SEED,a));}
  {const [s,a]=perfect('code',{level:2});a.mapping[1].symbolId=a.mapping[0].symbolId;malformed.push(()=>scoreAttempt('code',s,SEED,a));}
  malformed.forEach(call=>assert.throws(call,/Hibás nyers válasz/));
});

test('azonos seed és beállítás azonos eredményt ad, kliens pontmezőt nem fogad el',()=>{
  const [settings,answer]=perfect('prices',{level:2,count:6,difficulty:'hard'}),first=scoreAttempt('prices',settings,SEED,answer),second=scoreAttempt('prices',settings,SEED,structuredClone(answer));
  assert.deepEqual(first,second);
  assert.throws(()=>scoreAttempt('prices',settings,SEED,{...answer,correct:first.total,total:first.total}),/mezői/);
});

test('Storyboard 1 hard módban hat egyedi, ugyanahhoz a jelenetcsaládhoz tartozó választ ad',()=>{
  const [settings,rounds]=generated('picture',{level:1,rounds:3,difficulty:'hard'});
  assert.equal(settings.difficulty,'hard');
  for(const round of rounds){assert.equal(round.choices.length,6);assert.equal(new Set(round.choices.map(item=>item.id)).size,6);assert.ok(round.choices.some(item=>item.id===round.target.id));assert.ok(round.choices.every(item=>item.row===round.target.row));}
});

test('a képes játék részletei magyar jelenetleírást mutatnak, a nyers válasz ID marad',()=>{
  for(const level of [1,2]){
    const [settings,answer]=perfect('picture',{level,rounds:3,difficulty:'hard'}),raw=structuredClone(answer),result=scoreAttempt('picture',settings,SEED,answer);
    assert.deepEqual(answer,raw);
    assert.ok(result.details.every(item=>!item.expected.startsWith('scene-')&&!item.actual.startsWith('scene-')));
    assert.ok(result.details.every(item=>/[ÁÉÍÓÖŐÚÜŰáéíóöőúüű]|Konyha|Park/.test(item.expected)));
  }
});
