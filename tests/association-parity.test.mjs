import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRetrySession,
  generateStationsRound,
  generateFaces,
  generatePrices,
  generateShopping,
  associationGames,
} from '../dist/games/association-games.js';

function seeded(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function prefixedRandom(prefix, tail) {
  let index = 0;
  return () => index < prefix.length ? prefix[index++] : tail;
}

class MiniNode {
  constructor(tagName,ownText='') {
    this.tagName=tagName;
    this.children=[];
    this.listeners=new Map();
    this.attributes={};
    this.dataset={};
    this.style={setProperty:(key,value)=>{this.style[key]=value;}};
    this.className='';
    this.disabled=false;
    this.value='';
    this._ownText=ownText;
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];this._ownText='';}
  setAttribute(key,value){this.attributes[key]=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,listener){const listeners=this.listeners.get(type)||[];listeners.push(listener);this.listeners.set(type,listeners);}
  dispatchEvent(event){for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
  setCustomValidity(message){this.validationMessage=message;}
  set textContent(value){this._ownText=String(value);this.children=[];}
  get textContent(){return this._ownText+this.children.map(child=>child.textContent).join('');}
}

function installMiniDom(){
  globalThis.Node=MiniNode;
  globalThis.document={createElement:tag=>new MiniNode(tag),createTextNode:text=>new MiniNode('#text',String(text))};
}
function all(root,predicate){const found=[];const visit=node=>{if(predicate(node))found.push(node);for(const child of node.children||[])visit(child);};visit(root);return found;}
function withClass(root,className){return all(root,node=>String(node.className).split(/\s+/).includes(className));}
function button(root,label){return all(root,node=>node.tagName==='button'&&node.textContent===label)[0];}
function mountHarness(gameId,settings,seed=1){
  installMiniDom();const root=new MiniNode('root'),phases=[],doneCalls=[];let recall;
  const ctx={root,settings,rand:seeded(seed),phase:(title,message)=>phases.push({title,message}),memorize:callback=>{recall=callback;},done:(local,raw)=>doneCalls.push({local,raw})};
  associationGames[gameId].mount(ctx);
  return {root,phases,doneCalls,recall:()=>recall()};
}

test('Step By Step L1 has an independent three-choice set at every position', () => {
  for (const theme of ['stations', 'streets']) {
    const first = generateStationsRound({ level: 1, count: 3, theme }, seeded(0x51a7));
    const replay = generateStationsRound({ level: 1, count: 3, theme }, seeded(0x51a7));
    assert.deepEqual(replay, first, 'the stored seed must reproduce the full round');
    assert.equal(first.expected.length, 3);
    assert.equal(first.choicesByPosition.length, 3);
    first.choicesByPosition.forEach((choices, index) => {
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices).size, 3);
      assert.equal(choices.filter((choice) => choice === first.expected[index]).length, 1);
      assert.equal(choices.filter((choice) => !first.items.includes(choice)).length, 2);
    });
  }
});

test('Step By Step L2 is always a five-sentence ordering task', () => {
  const round = generateStationsRound({ level: 2, count: 8, theme: 'streets' }, seeded(9));
  assert.equal(round.items.length, 5);
  assert.deepEqual(round.expected, round.items);
  assert.ok(round.items.every((sentence) => sentence.endsWith('.')));
});

test('Who Is Who keeps portrait names fixed while regenerating specialty and room', () => {
  const faceShuffle = Array(11).fill(0.37);
  const first = generateFaces(3, prefixedRandom(faceShuffle, 0.11));
  const second = generateFaces(8, prefixedRandom(faceShuffle, 0.83));
  assert.deepEqual(first.map(({id,name}) => ({id,name})), second.map(({id,name}) => ({id,name})));
  assert.ok(first.some((face,index) => face.job !== second[index].job));
  assert.ok(first.some((face,index) => face.room !== second[index].room));
  assert.ok([...first,...second].every((face) => /^\d{2}$/.test(face.room)));
});

test('Price Question uses two-digit prices and exposes discount hints at both levels', () => {
  for (const level of [1, 2]) {
    for (const difficulty of ['easy', 'normal', 'hard']) {
      const items = generatePrices(5, difficulty, seeded(level * 100 + difficulty.length), level);
      assert.equal(items.length, 5);
      assert.equal(new Set(items.map((item) => item.price)).size, 5);
      assert.ok(items.every((item) => Number.isInteger(item.price) && item.price >= 10 && item.price <= 99));
      assert.ok(items.every((item) => Number.isInteger(item.discount) && item.discount >= 5 && item.discount <= 50));
    }
  }
});

test('Assortment uses the observed 9/14, 9/9 and 9/14 round sizes', () => {
  const cases = [
    [{ level: 1, difficulty: 'easy' }, 14],
    [{ level: 1, difficulty: 'hard' }, 14],
    [{ level: 2, difficulty: 'easy' }, 9],
    [{ level: 2, difficulty: 'normal' }, 9],
    [{ level: 2, difficulty: 'hard' }, 14],
  ];
  for (const [settings, optionCount] of cases) {
    const round = generateShopping(3, seeded(900 + optionCount + settings.level), settings);
    assert.equal(round.targets.length, 9);
    assert.equal(round.options.length, optionCount);
    assert.equal(new Set(round.targets.map((item) => item.id)).size, 9);
    assert.equal(new Set(round.options.map((item) => item.id)).size, optionCount);
    const options = new Set(round.options.map((item) => item.id));
    assert.ok(round.targets.every((item) => options.has(item.id)));
  }
});

test('retry history stores the real submitted raws, closes after success, and caps failures at two', () => {
  const failures = createRetrySession();
  const first = { itemIds: ['alma','tej','sajt','tojas','rizs','citrom','hal','mez','banan'] };
  assert.deepEqual(failures.record(first, false), { number: 1, finished: false, canRetry: true });
  first.itemIds[0] = 'utólagos-módosítás';
  const second = { itemIds: ['banan','tej','sajt','tojas','rizs','citrom','hal','mez','alma'] };
  assert.deepEqual(failures.record(second, false), { number: 2, finished: true, canRetry: false });
  assert.deepEqual(failures.raw(), { attempts: [
    { itemIds: ['alma','tej','sajt','tojas','rizs','citrom','hal','mez','banan'] },
    second,
  ] });
  assert.throws(() => failures.record(second, false), /lezárult/);

  const success = createRetrySession();
  const faceAnswer = { answers: [{ faceId: 4, name: 'Félix' }] };
  assert.deepEqual(success.record(faceAnswer, true), { number: 1, finished: true, canRetry: false });
  assert.deepEqual(success.raw(), { attempts: [faceAnswer] });
  assert.throws(() => success.record(faceAnswer, false), /lezárult/);
});

test('mounted association controls expose drag and keyboard paths without dropdowns or number inputs', () => {
  const order=mountHarness('stations',{level:2,count:5,theme:'stations'},70);order.recall();
  assert.equal(withClass(order.root,'association-sort-row').length,5);
  assert.ok(withClass(order.root,'association-sort-row').every(row=>row.getAttribute('draggable')===''));
  assert.ok(button(order.root,'Fel'));
  assert.ok(button(order.root,'Le'));

  const faces=mountHarness('faces',{level:3,count:5},701);faces.recall();
  assert.equal(all(faces.root,node=>node.tagName==='select').length,0);
  assert.ok(withClass(faces.root,'association-label').every(label=>label.getAttribute('draggable')===''));

  const prices=mountHarness('prices',{level:2,count:3,difficulty:'normal'},702);prices.recall();
  assert.ok(withClass(prices.root,'price-input').every(input=>input.getAttribute('type')==='text'&&input.getAttribute('inputmode')==='numeric'&&input.getAttribute('maxlength')==='2'));
});

test('Step By Step L1 mount shows comparison and waits for Finish before done', () => {
  const game=mountHarness('stations',{level:1,count:3,theme:'stations'},71);game.recall();
  for(let position=0;position<3;position++)withClass(game.root,'association-choice')[0].click();
  button(game.root,'Ellenőrzés').click();
  assert.equal(game.doneCalls.length,0);
  assert.equal(game.phases.at(-1).title,'Összehasonlítás');
  assert.match(game.root.textContent,/Saját válasz:/);
  assert.match(game.root.textContent,/Helyes válasz:/);
  button(game.root,'Befejezés').click();
  assert.equal(game.doneCalls.length,1);
  assert.equal(game.doneCalls[0].raw.items.length,3);
});

test('Who Is Who mount keeps portrait order and shuffles the label bank once', () => {
  const game=mountHarness('faces',{level:1,count:9},72);
  const studyPortraits=withClass(game.root,'portrait').map(node=>node.style.backgroundPosition);
  const studyNames=withClass(game.root,'name-chip').map(node=>node.textContent);
  game.recall();
  const recallPortraits=withClass(game.root,'portrait').map(node=>node.style.backgroundPosition);
  const labelNames=withClass(game.root,'association-label').map(node=>node.textContent);
  assert.deepEqual(recallPortraits,studyPortraits);
  assert.deepEqual(new Set(labelNames),new Set(studyNames));
  assert.notDeepEqual(labelNames,studyNames);
});

test('Price mount hides L2 hint, accepts zero, and preserves zero raw through solution view', () => {
  const l1=mountHarness('prices',{level:1,count:3,difficulty:'normal'},73);l1.recall();
  assert.equal(withClass(l1.root,'association-hint').length,3);

  const l2=mountHarness('prices',{level:2,count:3,difficulty:'normal'},74);l2.recall();
  assert.equal(withClass(l2.root,'association-hint').length,0);
  const inputs=withClass(l2.root,'price-input');
  assert.equal(inputs.length,6);
  for(const input of inputs){input.value='0';input.dispatchEvent(new Event('input'));}
  assert.equal(button(l2.root,'Ellenőrzés').disabled,false);
  button(l2.root,'Ellenőrzés').click();
  assert.equal(l2.doneCalls.length,0);
  button(l2.root,'Megoldás megtekintése').click();
  button(l2.root,'Befejezés').click();
  assert.equal(l2.doneCalls.length,1);
  assert.deepEqual(l2.doneCalls[0].raw.answers.map(answer=>[answer.price,answer.discount]),[[0,0],[0,0],[0,0]]);
});

test('Shopping mount empties all nine slots after the first failed check', () => {
  const settings={level:1,count:9,difficulty:'easy'},seed=75,round=generateShopping(9,seeded(seed),settings),targetIds=round.targets.map(item=>item.id),distractor=round.options.find(item=>!targetIds.includes(item.id)),wrongIds=[...targetIds.slice(0,8),distractor.id];
  const game=mountHarness('shopping',settings,seed);game.recall();
  for(let index=0;index<wrongIds.length;index++){
    const item=round.options.find(option=>option.id===wrongIds[index]);
    all(game.root,node=>node.tagName==='button'&&String(node.className).includes('object-tile')&&node.textContent.includes(item.name))[0].click();
    withClass(game.root,'association-cart-slot')[index].click();
  }
  button(game.root,'Ellenőrzés').click();
  assert.equal(game.doneCalls.length,0);
  assert.equal(withClass(game.root,'association-cart-slot').length,9);
  assert.ok(withClass(game.root,'association-cart-slot').every(slot=>slot.textContent.includes('üres')));
  assert.match(game.root.textContent,/mind a kilenc helyet kiürítettük/i);
});
