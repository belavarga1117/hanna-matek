import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  CODE_SYMBOL_SETS,
  SCENE_ATLASES,
  SCENES,
  extraSceneCrop,
  appendCodeAttempt,
  appendPictureAttempt,
  codeMaxAttempts,
  createEmptyPictureSlots,
  generateCodeRound,
  generatePictureRounds,
  isWholeCodeCorrect,
  isWholePictureSequenceCorrect,
  makeCodeRound,
  makePictureRound,
  scoreCode,
} from '../dist/games/advanced-games.js';

function rng(seed=42){
  return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
}

test('a Storyboard négy családja családonként hat valódi jelenetből áll',()=>{
  assert.equal(SCENES.length,24);
  for(let family=0;family<4;family+=1){
    const scenes=SCENES.filter(item=>item.row===family);
    assert.equal(scenes.length,6);
    assert.equal(new Set(scenes.map(item=>item.id)).size,6);
    assert.equal(scenes.filter(item=>item.atlas==='base').length,4);
    assert.equal(scenes.filter(item=>item.atlas==='extra').length,2);
    assert.ok(scenes.every(item=>!('filter' in item)));
  }
  assert.match(SCENES.find(item=>item.id==='scene-16').label,/körte/);
  assert.match(SCENES.find(item=>item.id==='scene-17').label,/tejeskancsó/);
  assert.match(SCENES.find(item=>item.id==='scene-18').label,/piros autó/);
  assert.match(SCENES.find(item=>item.id==='scene-19').label,/padon/);
  assert.match(SCENES.find(item=>item.id==='scene-20').label,/vonalzó/);
  assert.match(SCENES.find(item=>item.id==='scene-21').label,/két építőkocka/);
  assert.match(SCENES.find(item=>item.id==='scene-22').label,/nyitott könyv/);
  assert.match(SCENES.find(item=>item.id==='scene-23').label,/mackó/);
});

test('az extra atlasz ellenőrizhető méret- és sorhatár-metaadatot ad',()=>{
  assert.deepEqual(SCENE_ATLASES.extra,{
    src:'./assets/scenes-extra-v2.png',
    width:887,
    height:1774,
    columns:2,
    rows:4,
    yBounds:[0,435,875,1285,1774],
    inset:4,
  });
  for(const scene of SCENES.filter(x=>x.atlas==='extra')){
    const {x,y,size}=extraSceneCrop(scene),atlas=SCENE_ATLASES.extra;
    assert.ok(x>=scene.atlasColumn*atlas.width/2+atlas.inset);
    assert.ok(x+size<=(scene.atlasColumn+1)*atlas.width/2-atlas.inset);
    assert.ok(y>=atlas.yBounds[scene.atlasRow]+atlas.inset);
    assert.ok(y+size<=atlas.yBounds[scene.atlasRow+1]-atlas.inset,'crop must not show the neighboring atlas row');
  }
});

test('Storyboard L1 D1 négyet mintáz a hatból, D2 mind a hatot adja',()=>{
  const seenEasy=new Set();
  for(let iteration=1;iteration<=80;iteration+=1){
    const seed=(iteration*2654435761)>>>0;
    for(const difficulty of ['easy','normal']){
      const [round]=generatePictureRounds({level:1,rounds:3,difficulty},rng(seed));
      assert.equal(round.choices.length,4);
      assert.equal(new Set(round.choices.map(item=>item.id)).size,4);
      assert.equal(round.choices.filter(item=>item.id===round.target.id).length,1);
      assert.ok(round.choices.every(item=>item.row===round.target.row));
      round.choices.forEach(item=>seenEasy.add(item.id));
    }
    const [hard]=generatePictureRounds({level:1,rounds:3,difficulty:'hard'},rng(seed));
    assert.equal(hard.choices.length,6);
    assert.equal(new Set(hard.choices.map(item=>item.id)).size,6);
    assert.ok(hard.choices.every(item=>item.row===hard.target.row));
    assert.ok(hard.choices.some(item=>item.id===hard.target.id));
  }
  assert.equal(seenEasy.size,24);
});

test('Storyboard L2 négy képet és négy üres drophelyet használ, egész képsort pontoz',()=>{
  for(let seed=1;seed<=40;seed+=1){
    const [round]=generatePictureRounds({level:2,rounds:3,difficulty:'hard'},rng(seed));
    assert.equal(round.sequence.length,4);
    assert.equal(round.choices.length,4);
    assert.equal(new Set(round.sequence.map(item=>item.id)).size,4);
    assert.deepEqual(new Set(round.sequence.map(item=>item.id)),new Set(round.choices.map(item=>item.id)));
    assert.ok(round.sequence.every(item=>item.row===round.sequence[0].row));
  }
  assert.deepEqual(createEmptyPictureSlots(),[null,null,null,null]);
  assert.equal(generatePictureRounds({level:1,rounds:1,difficulty:'easy'},rng(1)).length,3);
  assert.equal(generatePictureRounds({level:1,rounds:9,difficulty:'easy'},rng(1)).length,5);
  const expected=['a','b','c','d'];
  assert.equal(isWholePictureSequenceCorrect(expected,expected),true);
  assert.equal(isWholePictureSequenceCorrect(expected,['a','b','d','c']),false);
  assert.equal(isWholePictureSequenceCorrect(expected,['a','b','c']),false);
  const threeRounds=[expected,['a','b','d','c'],expected];
  assert.equal(threeRounds.filter(answer=>isWholePictureSequenceCorrect(expected,answer)).length,2);
});

test('a Storyboard retry-history pillanatkép, a megoldás nem írja át',()=>{
  const first=['b','a','c','d'],second=['a','c','b','d'];
  let attempts=appendPictureAttempt([],first);
  first[0]='a';
  attempts=appendPictureAttempt(attempts,second);
  const raw={rounds:[{attempts}]};
  const before=structuredClone(raw);
  let displayed=['x','x','x','x'];
  displayed=['a','b','c','d'];
  displayed.reverse();
  assert.deepEqual(raw,before);
  assert.deepEqual(raw.rounds[0].attempts.map(item=>item.itemIds),[['b','a','c','d'],['a','c','b','d']]);
});

test('az ATM mindkét saját készlete 16 elemű, ebből tíz egyedi jelet választ',()=>{
  for(const [setName,pool] of Object.entries(CODE_SYMBOL_SETS)){
    assert.equal(pool.length,16);
    assert.equal(new Set(pool.map(item=>item.id)).size,16);
    if(setName==='abstract')assert.ok(pool.every(item=>/^#[0-9a-f]{6}$/i.test(item.color)));
    for(let seed=1;seed<=40;seed+=1){
      for(const level of [1,2,3]){
        const round=generateCodeRound({level,rounds:4,symbolSet:setName},rng(seed));
        assert.equal(round.symbols.length,10);
        assert.equal(new Set(round.symbols.map(item=>item.id)).size,10);
        assert.equal(round.messages.length,4);
        assert.ok(round.messages.every(message=>message.length===[0,3,4,5][level]));
        assert.ok(round.messages.flat().every(digit=>Number.isInteger(digit)&&digit>=0&&digit<=9));
      }
    }
  }
  assert.equal(generateCodeRound({level:1,rounds:1,symbolSet:'objects'},rng(1)).messages.length,3);
  assert.equal(generateCodeRound({level:1,rounds:9,symbolSet:'objects'},rng(1)).messages.length,5);
});

test('az ATM egész kódot pontoz, a javítás teljes pontot ér és a limit szintfüggő',()=>{
  assert.equal(codeMaxAttempts({level:1}),2);
  assert.equal(codeMaxAttempts({level:2}),2);
  assert.equal(codeMaxAttempts({level:3}),3);
  const message=[1,2,3,4,5];
  assert.equal(isWholeCodeCorrect(message,'12345'),true);
  assert.equal(isWholeCodeCorrect(message,'12344'),false);
  assert.equal(isWholeCodeCorrect(message,'1234'),false);
  let attempts=appendCodeAttempt([],'00000');
  attempts=appendCodeAttempt(attempts,'11111');
  attempts=appendCodeAttempt(attempts,'12345');
  assert.deepEqual(attempts,['00000','11111','12345']);
  assert.equal(attempts.slice(0,codeMaxAttempts({level:1})).some(answer=>isWholeCodeCorrect(message,answer)),false);
  assert.equal(attempts.slice(0,codeMaxAttempts({level:3})).some(answer=>isWholeCodeCorrect(message,answer)),true);
  const exhausted=attempts.slice(0,2);
  const raw={mapping:[{digit:0,symbolId:'jel'}],answers:[{attempts:[...exhausted]}]};
  const solution=message.join('');
  assert.equal(raw.answers[0].attempts.includes(solution),false);
  assert.ok(!('correct' in raw)&&!('total' in raw));
});

test('a legacy exportok és a nulla számjegy pontozása megmarad',()=>{
  const picture=makePictureRound('easy',rng(9));
  assert.equal(picture.choices.length,4);
  assert.equal(picture.choices.filter(item=>item.correct).length,1);
  const code=makeCodeRound(5,'normal',rng(10));
  assert.equal(code.message.length,5);
  assert.equal(scoreCode([0,1,2],'012'),3);
  assert.equal(scoreCode([0,1,2],'011'),2);
});

test('az UI valódi drag/dropot, tapot és billentyűzetes szerkesztést tartalmaz',async()=>{
  const source=await readFile(new URL('../dist/games/advanced-games.js',import.meta.url),'utf8');
  const css=await readFile(new URL('../dist/games/advanced-parity.css',import.meta.url),'utf8');
  assert.match(source,/onDragstart/);
  assert.match(source,/onDrop/);
  assert.match(source,/dataTransfer/);
  assert.match(source,/onKeydown:handleKey/);
  assert.match(source,/ArrowLeft/);
  assert.match(source,/Backspace/);
  assert.match(source,/Aktuális számjegy törlése/);
  assert.match(source,/Megoldás megtekintése/);
  assert.match(source,/answers:answers\.map\(answer=>\(\{attempts:/);
  assert.doesNotMatch(source,/hue-rotate|saturate\(/);
  assert.match(css,/\.scene-drop-grid/);
  assert.match(css,/grid-template-columns:\s*repeat\(4,/);
  assert.doesNotMatch(css,/\.game-stage\s*>\s*:is\(\.scene-card/);
});
