import test from 'node:test';
import assert from 'node:assert/strict';

class MiniNode {
  constructor(tagName, ownText = '') {
    this.tagName = String(tagName).toUpperCase(); this.children = []; this.parentNode = null;
    this.listeners = new Map(); this.attributes = {}; this.dataset = {}; this.className = ''; this.value = '';
    this.checked = false; this.disabled = false; this.hidden = false; this.ownText = ownText;
    this.style = { setProperty: (key, value) => { this.style[key] = value; } };
    this.classList = { add: (...names) => { const set = new Set(this.className.split(/\s+/).filter(Boolean)); names.forEach((name) => set.add(name)); this.className = [...set].join(' '); } };
  }
  append(...nodes) { for (const node of nodes) { this.children.push(node); if (node && typeof node === 'object') node.parentNode = this; } }
  replaceChildren(...nodes) { this.children = []; this.ownText = ''; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener)); }
  dispatchEvent(event) { event.target ??= this; for (const listener of this.listeners.get(event.type) || []) listener(event); return true; }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click', target: this, preventDefault() {} }); }
  focus() {}
  querySelector(selector) { return all(this, (node) => matches(node, selector))[0] || null; }
  querySelectorAll(selector) { return all(this, (node) => matches(node, selector)); }
  get textContent() { return this.ownText + this.children.map((node) => node.textContent).join(''); }
  set textContent(value) { this.ownText = String(value); this.children = []; }
}

function all(root, predicate) { const found = []; const visit = (node) => { if (predicate(node)) found.push(node); for (const child of node.children || []) visit(child); }; visit(root); return found; }
function matches(node, selector) {
  if (selector === 'option') return node.tagName === 'OPTION';
  if (selector === 'p') return node.tagName === 'P';
  const data = selector.match(/^\[data-([\w-]+)="([^"]+)"\]$/);
  if (data) return String(node.dataset[data[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())]) === data[2];
  return false;
}
function withClass(root, name) { return all(root, (node) => node.className.split(/\s+/).includes(name)); }
function button(root, text) { return all(root, (node) => node.tagName === 'BUTTON' && node.textContent === text)[0]; }

class MiniEvents {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener)); }
  dispatch(type, extra = {}) { for (const listener of this.listeners.get(type) || []) listener({ type, preventDefault() {}, ...extra }); }
}

let clock = 0, rafId = 0, rafs = new Map();
const documentEvents = new MiniEvents(), windowEvents = new MiniEvents();
globalThis.Node = MiniNode;
globalThis.document = Object.assign(documentEvents, {
  hidden: false, head: new MiniNode('head'), createElement: (tag) => new MiniNode(tag), createTextNode: (text) => new MiniNode('#text', String(text)),
  querySelector(selector) { return this.head.querySelector(selector); },
});
globalThis.window = windowEvents;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => clock } });
globalThis.requestAnimationFrame = (callback) => { const id = ++rafId; rafs.set(id, callback); return id; };
globalThis.cancelAnimationFrame = (id) => rafs.delete(id);
globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });

class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  async decodeAudioData() { return {}; }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createStereoPanner() { return { pan: { value: 0 }, connect() {}, disconnect() {} }; }
  createBufferSource() { return { connect() {}, disconnect() {}, start() {}, stop() {}, set onended(value) { this._onended = value; } }; }
}
globalThis.AudioContext = FakeAudioContext;

const { h } = await import('../dist/core.js');
const { MODE_DEFINITIONS } = await import('../dist/nback/engine.js');
const { createNbackSettings } = await import('../dist/nback/settings-ui.js');
const { renderNbackResult } = await import('../dist/nback/result-view.js');
const { nbackGames, arithmeticValueValid, responseKeyMap } = await import('../dist/nback/ui.js');

async function flush() { await Promise.resolve(); await Promise.resolve(); await new Promise((resolve) => setImmediate(resolve)); }
function runFrame(at) { clock = at; const pending = [...rafs.values()]; rafs.clear(); pending.forEach((callback) => callback(at)); }

test('settings expose every source mode, exact presets, and a rejected reference length over 200', () => {
  const editor = createNbackSettings({ h, value: {}, onChange() {} });
  assert.equal(all(editor.element, (node) => node.tagName === 'OPTION' && node.parentNode?.tagName === 'OPTGROUP').length, MODE_DEFINITIONS.length);
  button(editor.element, 'Könnyű kezdés').click();
  assert.deepEqual({ n: editor.getValue().n, trialCount: editor.getValue().trialCount, intervalMs: editor.getValue().intervalMs }, { n: 1, trialCount: 20, intervalMs: 3000 });
  editor.setValue({ n: 10, mode: 2 });
  button(editor.element, 'Referencia-hossz').click();
  assert.equal(editor.getValue().trialCount, 110);
  editor.setValue({ n: 15, mode: 2, trialCount: 20 });
  button(editor.element, 'Referencia-hossz').click();
  assert.match(withClass(editor.element, 'nback-validation')[0].textContent, /legfeljebb 200/);
  assert.equal(editor.getValue().trialCount, 20);
});

test('result view renders real per-channel confusion counts and both formula-sensitive fields', () => {
  const result = renderNbackResult(h, { percent: 75, summary: 'Próba', metrics: { n: 2, scoreProfile: 'workshop',
    totals: { hits: 3, falseAlarms: 1, misses: 2, correctRejections: 9 },
    channels: [{ id: 'position1', label: 'Pozíció', hits: 2, falseAlarms: 1, misses: 1, correctRejections: 5, percent: 50 }],
    adaptation: { fromN: 2, nextN: 3, action: 'up' } } });
  assert.match(result.textContent, /Találat3/);
  assert.match(result.textContent, /Pozíció211550%/);
  assert.match(result.textContent, /Workshop-képlet/);
  assert.match(result.textContent, /Következő szint: 3-back/);
  assert.doesNotMatch(result.textContent, /csillag/i);
});

test('shortcut allocation is unique and arithmetic accepts signed decimal or rational but not an empty zero', () => {
  const map = responseKeyMap([
    { id: 'position1', key: 'a' }, { id: 'position2', key: 'a' }, { id: 'audio', key: 'l' }, { id: 'audio2', key: ';' },
  ]);
  assert.equal(map.size, 4);
  assert.equal(new Set(map.keys()).size, 4);
  assert.equal(arithmeticValueValid(''), false);
  assert.equal(arithmeticValueValid('-2'), true);
  assert.equal(arithmeticValueValid('0.5'), true);
  assert.equal(arithmeticValueValid('1/2'), true);
  assert.equal(arithmeticValueValid('1/0'), false);
});

test('mounted fixed session records one event, pauses on blur, avoids catch-up bursts, finishes once, and cleans handlers', async () => {
  clock = 0; rafs.clear();
  const root = new MiniNode('root'), phases = [], done = [];
  const cleanup = nbackGames.nback.mount({ root, h, seed: 17, settings: { mode: 10, n: 1, trialCount: 4, intervalMs: 400 },
    phase: (title, detail) => phases.push([title, detail]), done: (local, raw) => done.push([local, raw]) });
  assert.equal(typeof cleanup, 'function');
  await flush();
  const start = button(root, 'Értékelt kör indítása'); assert.ok(start); start.click(); await flush();
  const firstResponse = withClass(root, 'nback-response-button')[0]; firstResponse.click(); firstResponse.click();
  windowEvents.dispatch('blur');
  const phaseCountAtPause = phases.length;
  runFrame(5000);
  assert.equal(phases.length, phaseCountAtPause, 'paused time must not advance a trial');
  button(root, 'Folytatás').click(); await flush();
  runFrame(5400);
  const scoredResponse = withClass(root, 'nback-response-button')[0]; scoredResponse.click(); scoredResponse.click();
  const afterLateFrame = phases.length;
  runFrame(9400);
  assert.equal(phases.length, afterLateFrame + 1, 'one late animation frame advances at most one trial');
  runFrame(9800); runFrame(10200); runFrame(10600);
  assert.equal(done.length, 1);
  assert.equal(done[0][0], null);
  assert.equal(done[0][1].version, 1);
  assert.equal(done[0][1].events.length, 1, 'warmup and duplicate responses are never saved');
  assert.equal(done[0][1].events[0].trialIndex, 1);
  runFrame(20000);
  assert.equal(done.length, 1, 'completion is emitted only once');
  cleanup(); cleanup();
  assert.equal(root.children.length, 0);
  const before = phases.length; windowEvents.dispatch('blur'); assert.equal(phases.length, before);
});

test('self-paced arithmetic keeps Enter for the answer and Space for advancing even while the input is focused', async () => {
  clock = 0; rafs.clear();
  const root = new MiniNode('root'), phases = [], done = [];
  const cleanup = nbackGames.nback.mount({ root, h, seed: 91,
    settings: { mode: 7, n: 1, trialCount: 4, intervalMs: 400, selfPaced: true, operations: ['+'] },
    phase: (title, detail) => phases.push([title, detail]), done: (...args) => done.push(args) });
  await flush(); button(root, 'Értékelt kör indítása').click(); await flush();
  const input = withClass(root, 'nback-arithmetic-input')[0];
  input.value = '0';
  const beforeEnter = phases.length;
  windowEvents.dispatch('keydown', { key: 'Enter', target: input, repeat: false });
  assert.equal(phases.length, beforeEnter, 'Enter records but must not advance');
  assert.match(withClass(root, 'nback-response-feedback')[0].textContent, /rögzítve/);
  runFrame(500);
  windowEvents.dispatch('keydown', { key: ' ', target: input, repeat: false });
  assert.equal(phases.length, beforeEnter + 1, 'Space advances after the flash');
  assert.equal(done.length, 0);
  cleanup();
});

test('the guided practice has scored interactions even for high N, restores the chosen N, and never saves', async () => {
  clock = 0; rafs.clear();
  const root = new MiniNode('root'), done = [];
  const cleanup = nbackGames.nback.mount({ root, h, seed: 123, settings: { mode: 2, n: 20, trialCount: 4, intervalMs: 1200 },
    phase() {}, done: (...args) => done.push(args) });
  await flush(); button(root, 'Rövid próba').click(); await flush();
  assert.ok(withClass(root, 'nback-response-button').length > 0, 'practice is interactive');
  for(let step=1;step<=6;step++){runFrame(step*1200);button(root,'Tovább').click();}
  assert.equal(done.length, 0);
  assert.ok(button(root, 'Értékelt kör indítása'));
  assert.match(root.textContent, /próba véget ért/i);
  assert.match(root.textContent,/20-BACK/);
  cleanup();
});

test('self-paced holds its visual cue, Triple Combination Color renders color, and input focus keeps other channels usable',async()=>{
  clock=0;rafs.clear();const root=new MiniNode('root');
  let cleanup=nbackGames.nback.mount({root,h,seed:33,settings:{mode:12,n:1,trialCount:4,selfPaced:true},phase(){},done(){}});
  await flush();button(root,'Értékelt kör indítása').click();await flush();
  assert.ok(withClass(root,'nback-letter')[0].style.backgroundColor,'central combination color must actually be visible');
  runFrame(2000);assert.equal(withClass(root,'nback-stimulus')[0].hidden,false,'self-paced source keeps stimulus until advance');cleanup();
  clock=0;cleanup=nbackGames.nback.mount({root,h,seed:18,settings:{mode:9,n:1,trialCount:4,selfPaced:true},phase(){},done(){}});
  await flush();button(root,'Értékelt kör indítása').click();await flush();runFrame(500);button(root,'Tovább').click();
  const input=withClass(root,'nback-arithmetic-input')[0];
  windowEvents.dispatch('keydown',{key:'a',target:input,repeat:false});
  assert.equal(root.querySelector('[data-channel="position1"]').disabled,true,'position shortcut remains active while arithmetic is focused');
  input.value='2';button(root,'±').click();assert.equal(input.value,'-2');button(root,'/').click();assert.equal(input.value,'-2/');cleanup();
});

test('multi position-only shows only the identity feature and multi fixed flash gets its reference duration',async()=>{
  clock=0;rafs.clear();const root=new MiniNode('root');
  const cleanup=nbackGames.nback.mount({root,h,seed:17,settings:{mode:10,n:1,trialCount:4,multiStim:3,identity:'color',intervalMs:1000},phase(){},done(){}});
  await flush();button(root,'Értékelt kör indítása').click();await flush();
  assert.equal(withClass(root,'nback-shape').length,0,'unscored random shapes must not become extra stimuli');
  runFrame(600);assert.equal(withClass(root,'nback-stimulus')[0].hidden,false);
  runFrame(700);assert.equal(withClass(root,'nback-stimulus')[0].hidden,true);cleanup();
});

test('selection blocks unsupported mode changes and Jaeggi incompatible switches',()=>{
  const editor=createNbackSettings({h,value:{mode:10,multiStim:3},onChange(){}});
  let opts=all(editor.element,n=>n.tagName==='OPTION'&&n.parentNode?.tagName==='OPTGROUP');
  assert.equal(opts.find(n=>n.value==='7').disabled,true);
  assert.equal(opts.find(n=>n.value==='2').disabled,false);
  editor.setValue({mode:2,scoreProfile:'jaeggi',trialCount:20});
  assert.equal(editor.element.querySelector('[data-setting="variable"]').disabled,true);
  assert.equal(editor.element.querySelector('[data-setting="selfPaced"]').disabled,true);
  assert.equal(editor.element.querySelector('[data-setting="trialCount"]').disabled,true);
});

test('self-paced waits for complete decoded speech and pause preserves the elapsed cue time',async()=>{
  clock=0;rafs.clear();const root=new MiniNode('root'),phases=[];
  const decode=FakeAudioContext.prototype.decodeAudioData;
  FakeAudioContext.prototype.decodeAudioData=async()=>({duration:0.9});
  const cleanup=nbackGames.nback.mount({root,h,seed:4,settings:{mode:11,n:1,trialCount:4,selfPaced:true},phase:(...args)=>phases.push(args),done(){}});
  try{
    await flush();button(root,'Értékelt kör indítása').click();await flush();
    runFrame(500);assert.equal(button(root,'Tovább').disabled,true);
    const before=phases.length;windowEvents.dispatch('keydown',{key:'Enter',repeat:false});assert.equal(phases.length,before);
    windowEvents.dispatch('blur');runFrame(5000);button(root,'Folytatás').click();await flush();
    runFrame(5419);assert.equal(button(root,'Tovább').disabled,true,'pause excludes wall time without restarting the response window');
    runFrame(5420);assert.equal(button(root,'Tovább').disabled,false);
  }finally{cleanup();FakeAudioContext.prototype.decodeAudioData=decode;}
});

test('fixed pause after the flash stays blank and keeps the original remaining response time',async()=>{
 clock=0;rafs.clear();const root=new MiniNode('root'),phases=[];
 const cleanup=nbackGames.nback.mount({root,h,seed:3,settings:{mode:10,n:1,trialCount:4,intervalMs:1000},phase:(...args)=>phases.push(args),done(){}});
 await flush();button(root,'Értékelt kör indítása').click();await flush();runFrame(1000);runFrame(1600);
 assert.equal(withClass(root,'nback-stimulus')[0].hidden,true);
 windowEvents.dispatch('blur');runFrame(10000);button(root,'Folytatás').click();await flush();
 assert.equal(withClass(root,'nback-stimulus')[0].hidden,true,'ISI must not become an extra encoding cue');
 const count=phases.length;runFrame(10400);assert.equal(phases.length,count+1,'only the remaining400ms may elapse');cleanup();
});

test('typed valid arithmetic is captured at close without Enter; blank and late-only input remain missing',async()=>{
 clock=0;rafs.clear();const root=new MiniNode('root'),done=[];
 const cleanup=nbackGames.nback.mount({root,h,seed:5,settings:{mode:7,n:1,trialCount:4,intervalMs:1200},phase(){},done:(_local,raw)=>done.push(raw)});
 await flush();button(root,'Értékelt kör indítása').click();await flush();runFrame(1200);
 let input=withClass(root,'nback-arithmetic-input')[0];input.value='-2';input.dispatchEvent({type:'input'});runFrame(2400);
 runFrame(3600);input=withClass(root,'nback-arithmetic-input')[0];input.value='1/2';input.dispatchEvent({type:'input'});runFrame(4800);
 input=withClass(root,'nback-arithmetic-input')[0];clock=6001;input.value='9';input.dispatchEvent({type:'input'});runFrame(6001);
 assert.equal(done.length,1);assert.deepEqual(done[0].events.map(e=>[e.trialIndex,e.value,e.atMs]),[[1,'-2',0],[3,'1/2',0]]);cleanup();
});

test('mobile sign control updates the arithmetic draft before automatic close',async()=>{
 clock=0;rafs.clear();const root=new MiniNode('root'),done=[];
 const cleanup=nbackGames.nback.mount({root,h,seed:5,settings:{mode:7,n:1,trialCount:4,intervalMs:1200},phase(){},done:(_local,raw)=>done.push(raw)});
 await flush();button(root,'Értékelt kör indítása').click();await flush();runFrame(1200);
 const input=withClass(root,'nback-arithmetic-input')[0];input.value='2';input.dispatchEvent({type:'input'});button(root,'±').click();
 for(const time of [2400,3600,4800,6000])runFrame(time);
 assert.deepEqual(done[0].events.map(e=>[e.trialIndex,e.value]),[[1,'-2']]);cleanup();
});
