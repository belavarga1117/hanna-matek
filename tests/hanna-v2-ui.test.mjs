import test from 'node:test';
import assert from 'node:assert/strict';

class MiniNode {
  constructor(tagName, text = '', namespaceURI = '') {
    this.tagName = String(tagName).toUpperCase(); this.ownText = text; this.namespaceURI = namespaceURI;
    this.children = []; this.parentNode = null; this.listeners = new Map(); this.attributes = {}; this.dataset = {};
    this.className = ''; this.value = ''; this.checked = false; this.disabled = false; this.hidden = false;
    this.style = { setProperty: (key, value) => { this.style[key] = value; } };
  }
  append(...nodes) { for (const node of nodes.flat(Infinity)) { if (node === null || node === undefined || node === false) continue; this.children.push(node); if (node && typeof node === 'object') node.parentNode = this; } }
  replaceChildren(...nodes) { this.children = []; this.ownText = ''; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((entry) => entry !== this); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry !== listener)); }
  dispatchEvent(event) { event.target ??= this; event.currentTarget = this; event.preventDefault ??= () => {}; for (const listener of this.listeners.get(event.type) || []) listener(event); return true; }
  click() { if (!this.disabled) { this.focus(); this.dispatchEvent({ type: 'click' }); } }
  focus() { focused = this; documentSurface.activeElement = this; }
  scrollIntoView(options) { this.lastScrollOptions = options; }
  querySelector(selector) { return query(this, selector)[0] || null; }
  querySelectorAll(selector) { return query(this, selector); }
  get textContent() { return this.ownText + this.children.map((entry) => entry.textContent).join(''); }
  set textContent(value) { this.ownText = String(value); this.children = []; }
}

function walk(root) { const result = []; const visit = (node) => { result.push(node); for (const child of node.children || []) visit(child); }; visit(root); return result; }
function camel(value) { return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); }
function matches(node, selector) {
  if (!node || typeof node !== 'object') return false;
  if (selector.startsWith('.')) return node.className.split(/\s+/).includes(selector.slice(1));
  const dataValue = selector.match(/^\[data-([\w-]+)="([^"]*)"\]$/); if (dataValue) return String(node.dataset[camel(dataValue[1])]) === dataValue[2];
  const dataPresent = selector.match(/^\[data-([\w-]+)\]$/); if (dataPresent) return node.dataset[camel(dataPresent[1])] !== undefined;
  const enabled = selector.match(/^(\w+):not\(\[disabled\]\)$/); if (enabled) return node.tagName === enabled[1].toUpperCase() && !node.disabled;
  return node.tagName === selector.toUpperCase();
}
function query(root, selector) {
  const result = [];
  for (const alternative of selector.split(',').map((entry) => entry.trim())) {
    const parts = alternative.split(/\s+/);
    for (const node of walk(root)) {
      if (!matches(node, parts.at(-1))) continue;
      let parent = node.parentNode; let valid = true;
      for (let index = parts.length - 2; index >= 0; index--) { while (parent && !matches(parent, parts[index])) parent = parent.parentNode; if (!parent) { valid = false; break; } parent = parent.parentNode; }
      if (valid && !result.includes(node)) result.push(node);
    }
  }
  return result;
}
function button(root, label) { return walk(root).find((entry) => entry.tagName === 'BUTTON' && entry.textContent === label); }
function buttons(root, label) { return walk(root).filter((entry) => entry.tagName === 'BUTTON' && entry.textContent === label); }
function insideSorter(node,root) { for(let current=node;current&&current!==root;current=current.parentNode) if(current.className?.split?.(/\s+/).includes('hanna-v2-sorter')) return true; return false; }

class EventSurface {
  constructor() { this.listeners = new Map(); this.hidden = false; }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry !== listener)); }
  dispatch(type, details = {}) { const event={ type, defaultPrevented:false, ...details }; event.preventDefault ??= () => { event.defaultPrevented=true; }; event.stopPropagation ??= () => { event.propagationStopped=true; }; for (const listener of this.listeners.get(type) || []) listener(event); return event; }
}

let time = 0; let timerId = 0; let focused = null; const timers = new Map();
function fakeTimeout(callback, delay = 0) { const id = ++timerId; timers.set(id, { at: time + Math.max(0, Number(delay) || 0), callback }); return id; }
function fakeClear(id) { timers.delete(id); }
function advance(ms) { const target = time + ms; while (true) { const next = [...timers.entries()].filter(([, entry]) => entry.at <= target).sort((a,b) => a[1].at - b[1].at || a[0] - b[0])[0]; if (!next) break; timers.delete(next[0]); time = next[1].at; next[1].callback(); } time = target; }
function reset() { time = 0; timerId = 0; timers.clear(); focused = null; documentSurface.activeElement = null; documentSurface.hidden = false; }
async function flush() { await Promise.resolve(); await Promise.resolve(); await new Promise((resolve) => setImmediate(resolve)); }
function pressKey(key,{repeat=false}={}) { const event=documentSurface.dispatch('keydown',{key,repeat}); if(!event.defaultPrevented&&documentSurface.activeElement?.tagName==='BUTTON')documentSurface.activeElement.click(); return event; }
function releaseKey(key) { return documentSurface.dispatch('keyup',{key}); }

const documentSurface = new EventSurface(); const windowSurface = new EventSurface();
Object.assign(documentSurface, {
  head: new MiniNode('head'),
  createElement: (tag) => new MiniNode(tag),
  createElementNS: (namespace, tag) => new MiniNode(tag, '', namespace),
  createTextNode: (value) => new MiniNode('#text', String(value)),
  querySelector(selector) { return this.head.querySelector(selector); },
});
globalThis.Node = MiniNode; globalThis.document = documentSurface; globalThis.window = windowSurface;
globalThis.setTimeout = fakeTimeout; globalThis.clearTimeout = fakeClear;
globalThis.requestAnimationFrame = (callback) => callback();
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => time } });

const { h } = await import('../dist/core.js');
const { HANNA_ACTIVITIES, HANNA_CONCEPTS, HANNA_OBJECTS, HANNA_PEGS } = await import('../dist/hanna/content-v2.js');
const { generateHannaSession, normalizeHannaSettings, scoreHannaAttempt } = await import('../dist/hanna/engine-v2.js');
const { HANNA_OBJECT_KEYS, HANNA_PORTRAITS, HANNA_ROOM_LOCATIONS, HANNA_ROOMS, hannaObjectSource, hannaPortraitSource, renderHannaRoom, renderHannaVisual } = await import('../dist/hanna/visuals.js');
const { createHannaHub, createHannaSettings, describeHannaSettings, hannaGames, renderHannaResult } = await import('../dist/hanna/ui-v2.js');

function begin(root) { button(root, 'Kezdjük').click(); button(root, 'Értem, tovább')?.click(); }
function finishSimpleEncoding(root) {
  let guard = 0;
  while (button(root, 'Következő kapcsolat') || button(root, 'Kódolás kész')) {
    (button(root, 'Következő kapcsolat') || button(root, 'Kódolás kész')).click();
    if (++guard > 100) throw new Error('encoding loop');
  }
}

test('premium visual library exposes semantic objects, 24 portraits and six stable five-place rooms', () => {
  reset();
  assert.equal(HANNA_PORTRAITS.length, 24); assert.equal(new Set(HANNA_PORTRAITS.map((entry) => entry.src)).size, 24);
  assert.equal(HANNA_ROOM_LOCATIONS.length, 30); assert.equal(HANNA_ROOMS.length,6); assert.deepEqual([...new Set(HANNA_ROOM_LOCATIONS.map((entry)=>entry.roomId))],HANNA_ROOMS.map((entry)=>entry.id));
  assert.equal(HANNA_OBJECT_KEYS.length,120); assert.equal(HANNA_OBJECTS.every((entry)=>hannaObjectSource(entry.id)?.includes(`/objects/${entry.id}.`)),true);
  assert.equal(Array.from({length:100},(_,index)=>hannaObjectSource(`peg-${String(index+1).padStart(3,'0')}`)).every(Boolean),true);
  const objectByLabel=new Map(HANNA_OBJECTS.map((entry)=>[entry.label,entry.id]));for(const peg of HANNA_PEGS.slice(20))assert.equal(hannaObjectSource(peg.visual.key),hannaObjectSource(objectByLabel.get(peg.label)),`${peg.number}: ${peg.label}`);
  const selected = []; const room = renderHannaRoom(h, { activeId: HANNA_ROOM_LOCATIONS[17].id, onSelect: (id) => selected.push(id), chunk: 1 });
  assert.equal(room.querySelectorAll('[data-location-id]').length, 5); assert.equal(room.querySelectorAll('.hanna-v2-room-guide li').length, 5);
  room.querySelector(`[data-location-id="${HANNA_ROOM_LOCATIONS[17].id}"]`).click(); assert.deepEqual(selected, [HANNA_ROOM_LOCATIONS[17].id]);
  const fusion = renderHannaVisual(h, { type:'scene', key:'pair-fusion', parts:[{role:'actor',key:'alma'},{role:'target',key:'esernyő'}], action:'merge' }, { label:'Fúzió' });
  const adjacency = renderHannaVisual(h, { type:'scene', key:'pair-near', parts:[{role:'actor',key:'alma'},{role:'target',key:'esernyő'}], action:'adjacent' }, { label:'Egymás mellett' });
  assert.equal(fusion.className.includes('is-fusion'), true); assert.equal(adjacency.className.includes('is-adjacent'), true);
  assert.ok(fusion.querySelectorAll('img').length>=2);assert.equal(adjacency.querySelectorAll('img').length,2);
  assert.equal(renderHannaVisual(h,{type:'object',key:'unknown-semantic-key'}).querySelectorAll('[data-visual-fallback]').length,1);
  const conceptArt=HANNA_CONCEPTS.map((entry)=>renderHannaVisual(h,entry.visual,{label:entry.label}));assert.equal(conceptArt.length,24);assert.equal(conceptArt.every((entry)=>entry.querySelector('[data-concept-key]')&&entry.querySelectorAll('[data-visual-fallback]').length===0),true);assert.equal(new Set(conceptArt.map((entry)=>entry.querySelector('[data-concept-key]').dataset.conceptKey)).size,24);
  for(const concept of HANNA_CONCEPTS){for(const parts of [[{role:'actor',key:concept.id,label:concept.label},{role:'target',key:'tigris',label:'tigris'}],[{role:'actor',key:'tigris',label:'tigris'},{role:'target',key:concept.id,label:concept.label}]])assert.equal(renderHannaVisual(h,{type:'scene',key:`concept-${concept.id}`,relationship:'interaction',action:'collides-and-shatters',parts}).querySelectorAll('[data-visual-fallback]').length,0,concept.id);}
});

test('invalid portrait ids and unresolved room coordinates fail honestly without borrowing another cue',()=>{
  reset();assert.equal(hannaPortraitSource('portrait-00'),null);assert.equal(hannaPortraitSource('portrait-25'),null);assert.equal(hannaPortraitSource('portrait-3'),null);
  const portrait=renderHannaVisual(h,{type:'portrait',key:'portrait-99',label:'Ismeretlen arc'});assert.equal(portrait.dataset.visualFallback,'invalid-portrait');assert.equal(portrait.querySelectorAll('img').length,0);assert.equal(portrait.textContent.includes('Ismeretlen arc'),false);
  const locations=HANNA_ROOM_LOCATIONS.slice(0,5).map((entry,index)=>index===2?{...entry,x:undefined,y:undefined}:entry);const room=renderHannaRoom(h,{locations,activeId:locations[0].id});assert.equal(room.querySelectorAll('.hanna-v2-hotspot').length,4);assert.equal(room.querySelectorAll('.hanna-v2-hotspot').some((entry)=>String(entry.style['--hotspot-x']).includes('undefined')||String(entry.style['--hotspot-y']).includes('undefined')),false);
});

test('an unknown own concept is presented as an honest word card, not as a claimed picture', () => {
  reset();
  const visual = renderHannaVisual(h, { type:'concept', key:'sajat-fogalom-42', label:'Saját összetett fogalmam' });
  assert.equal(visual.querySelectorAll('[data-visual-fallback]').length, 1);
  assert.ok(visual.textContent.includes('SAJÁT FOGALOM'));
  assert.ok(visual.textContent.includes('Saját összetett fogalmam'));
  assert.ok(visual.textContent.includes('Készíts hozzá saját mentális képet'));
  assert.equal(visual.textContent.includes('KÉP'), false);
  assert.equal(visual.textContent.includes('rajzolt fogalmi metafora'), false);
});

test('settings expose all 15 games and only engine-supported number sizes', () => {
  reset(); const changes = [];
  const component = createHannaSettings({ h, value:{ activity:'baseline', hannaVersion:2 }, onChange:(value)=>changes.push(value) });
  const activity = component.element.querySelector('[data-setting="activity"]'); assert.equal(activity.querySelectorAll('option').length, 15);
  activity.value = 'numbers'; activity.dispatchEvent({ type:'change' });
  assert.equal(component.getValue().activity, 'numbers'); assert.equal(component.getValue().itemCount, 8); assert.equal(component.getValue().recallMode, 'verbatim');
  const count = component.element.querySelector('[data-setting="Mennyiség"]'); assert.deepEqual(count.querySelectorAll('option').map((entry)=>Number(entry.value)), [8,16,20,30]);
  activity.value='faces';activity.dispatchEvent({type:'change'});assert.ok(component.element.textContent.includes('Név → Személyes információ'));assert.equal(component.element.textContent.includes('name → fact'),false);
  assert.ok(describeHannaSettings({activity:'faces',itemCount:20,difficulty:'hard'}).includes('Nehéz'));
  assert.ok(changes.length); component.dispose();
});

test('activity changes clear every source-specific snapshot before launch',()=>{
  reset();for(const [from,to,extra] of [['random','boss',{sourceResultId:'old-result',learnedSnapshot:{stale:true},trainingMastery:{old:true}}],['review','chain',{reviewIds:['old-review'],reviewSnapshot:[{stale:true}]},]]){const component=createHannaSettings({h,value:{activity:from,...extra}});const activity=component.element.querySelector('[data-setting="activity"]');activity.value=to;activity.dispatchEvent({type:'change'});const next=component.getValue();for(const key of ['sourceResultId','learnedSnapshot','trainingMastery'])assert.equal(key in next,false,`${from} → ${to}: ${key}`);for(const key of ['reviewIds','reviewSnapshot','resourceIds','resourceSnapshot'])assert.deepEqual(next[key]||[],[],`${from} → ${to}: ${key}`);assert.doesNotThrow(()=>normalizeHannaSettings(next));component.dispose();}
});

test('switching to a beginner association starts with concrete content',()=>{
  reset();const component=createHannaSettings({h,value:{activity:'concept',difficulty:'hard',contentLevel:'abstract'}});const activity=component.element.querySelector('[data-setting="activity"]');activity.value='association';activity.dispatchEvent({type:'change'});const next=component.getValue();assert.equal(next.activity,'association');assert.equal(next.difficulty,'beginner');assert.equal(next.contentLevel,'concrete');component.dispose();
});

test('association settings describe a time-bound image pool instead of a fixed pair count',()=>{
  reset();const component=createHannaSettings({h,value:{activity:'association',itemCount:3,associationMs:30000}});const pool=component.element.querySelector('[data-setting="Képkészlet"]');assert.ok(pool);assert.ok(pool.textContent.includes('6 külön kép'));assert.ok(component.element.textContent.includes('a megoldott párok száma a tempódtól függ'));component.dispose();
});

test('manual number size, adaptive choice, encoding limit and partial own Major size survive settings normalization',()=>{
  reset();const numbers=createHannaSettings({h,value:{activity:'numbers',itemCount:30,encodingMs:60000,adaptive:false}});assert.equal(numbers.getValue().itemCount,30);assert.equal(numbers.getValue().encodingMs,60000);assert.equal(numbers.getValue().adaptive,false);assert.ok(numbers.element.querySelector('[data-setting="Mennyiség"]').textContent.includes('30 számjegy'));const adaptive=numbers.element.querySelector('[data-setting="adaptive"]');assert.ok(adaptive);adaptive.checked=true;adaptive.dispatchEvent({type:'change'});assert.equal(numbers.getValue().adaptive,true);numbers.dispose();
  const resource={id:'major-own',kind:'major',title:'Három saját kód',revision:1,ready:true,data:{entries:[{code:'00',label:'szósz'},{code:'01',label:'szita'},{code:'02',label:'szén'}]}};const major=createHannaSettings({h,value:{activity:'major',itemCount:3,resourceIds:[resource.id],resourceSnapshot:[resource],encodingMs:30000,adaptive:false},resources:[resource]});assert.equal(major.getValue().itemCount,3);assert.ok(major.element.textContent.includes('3 elem'));assert.equal(major.getValue().resourceSnapshot[0].id,resource.id);major.dispose();
});

test('association and concept never show an unrelated encoding timer while baseline flow stays Hungarian',()=>{
  reset();for(const activity of ['association','concept']){const component=createHannaSettings({h,value:{activity,encodingMs:60000}});assert.equal(component.element.querySelector('[data-setting="Kódolási idő"]'),null);assert.equal(component.getValue().encodingMs,0);component.dispose();}const baseline=createHannaSettings({h,value:{activity:'baseline'}});assert.ok(baseline.element.textContent.includes('Szavak azonnal → képek azonnal → számjegyek azonnal'));assert.equal(baseline.element.textContent.includes('word immediate'),false);baseline.dispose();
});

test('a configured encoding limit visibly advances a number image while own tempo does not',()=>{
  reset();const timedRoot=new MiniNode('root');const timed=normalizeHannaSettings({hannaVersion:2,activity:'numbers',itemCount:8,encodingMs:30000,adaptive:false});const disposeTimed=hannaGames['hanna-method'].mount({root:timedRoot,h,settings:timed,seed:3,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(timedRoot);const first=timedRoot.querySelector('.hanna-v2-word-image strong').textContent;assert.ok(timedRoot.textContent.includes('Képalkotás: 30 mp'));advance(29999);assert.equal(timedRoot.querySelector('.hanna-v2-word-image strong').textContent,first);advance(1);assert.notEqual(timedRoot.querySelector('.hanna-v2-word-image strong').textContent,first);disposeTimed();
  reset();const ownRoot=new MiniNode('root');const own=normalizeHannaSettings({hannaVersion:2,activity:'numbers',itemCount:8,encodingMs:0,adaptive:false});const disposeOwn=hannaGames['hanna-method'].mount({root:ownRoot,h,settings:own,seed:3,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(ownRoot);assert.equal(ownRoot.querySelector('.hanna-v2-encoding-limit'),null);advance(120000);assert.equal(ownRoot.querySelector('.hanna-v2-word-image strong').textContent,first);disposeOwn();
});

test('teacher settings load and attach an eligible private material snapshot', async()=>{
  reset();const resource={id:'material-own',kind:'material',title:'Saját szavak',revision:2,ready:true,data:{items:Array.from({length:10},(_,index)=>({id:`w${index}`,label:`szó ${index}`}))}};
  const calls=[];const component=createHannaSettings({h,value:{activity:'chain'},school:{user:{id:'teacher-1',role:'teacher'},api:async(path,options)=>{calls.push([path,options]);return{resources:[resource]};}}});
  await flush();assert.deepEqual(calls,[['/api/hanna/resources',{method:'GET'}]]);const picker=component.element.querySelector('[data-setting="resourceIds-material"]');assert.ok(picker);picker.value=resource.id;picker.dispatchEvent({type:'change'});assert.deepEqual(component.getValue().resourceIds,[resource.id]);assert.equal(component.getValue().resourceSnapshot[0].revision,2);component.dispose();
});

test('partial own Major, peg and palace resources follow the engine post-clamp eligibility',()=>{
  reset();const cases=[
    {activity:'major',kind:'major',id:'major-3',expected:3,data:{entries:Array.from({length:3},(_,index)=>({code:String(index).padStart(2,'0'),label:`Szó ${index}`}))}},
    {activity:'peg',kind:'peg',id:'peg-5',expected:5,data:{entries:Array.from({length:5},(_,index)=>({number:index+1,label:`Horog ${index+1}`}))}},
    {activity:'palace',kind:'palace',id:'palace-5',expected:5,data:{locations:Array.from({length:5},(_,index)=>({id:`hely-${index+1}`,name:`Hely ${index+1}`}))}},
  ];
  for(const entry of cases){const resource={id:entry.id,kind:entry.kind,title:entry.id,revision:1,ready:true,data:entry.data};const component=createHannaSettings({h,value:{activity:entry.activity,itemCount:10,trainingSize:10},resources:[resource]});const picker=component.element.querySelector(`[data-setting="resourceIds-${entry.kind}"]`);const own=picker.querySelectorAll('option').find((option)=>option.value===entry.id);assert.equal(own.disabled,false,`${entry.kind} engine-valid partial resource`);picker.value=entry.id;picker.dispatchEvent({type:'change'});assert.equal(component.getValue().itemCount,entry.expected);assert.doesNotThrow(()=>normalizeHannaSettings(component.getValue()));component.dispose();}
});

test('settings rerender restores focus to the same live control',()=>{
  reset();const component=createHannaSettings({h,value:{activity:'numbers',itemCount:8,adaptive:false}});const count=component.element.querySelector('[data-setting="Mennyiség"]');count.focus();count.value='16';count.dispatchEvent({type:'change'});const replacement=component.element.querySelector('[data-setting="Mennyiség"]');assert.notEqual(replacement,count);assert.equal(documentSurface.activeElement,replacement);component.dispose();
});

test('boss settings can carry a ready palace and peg snapshot together',()=>{
  reset();const palace={id:'p1',kind:'palace',title:'Otthoni út',revision:1,ready:true,data:{locations:Array.from({length:5},(_,index)=>({id:`p${index}`,name:`Hely ${index}`}))}};const peg={id:'g1',kind:'peg',title:'Saját horgok',revision:1,ready:true,data:{entries:Array.from({length:10},(_,index)=>({number:index+1,label:`Horog ${index+1}`}))}};const component=createHannaSettings({h,value:{activity:'boss'},resources:[palace,peg]});for(const kind of ['palace','peg']){const picker=component.element.querySelector(`[data-setting="resourceIds-${kind}"]`);const ownOption=picker.querySelectorAll('option').find((entry)=>entry.value===(kind==='palace'?'p1':'g1'));assert.equal(ownOption.disabled,false,`${kind} must be selectable in the boss setup`);picker.value=ownOption.value;picker.dispatchEvent({type:'change'});}assert.deepEqual(new Set(component.getValue().resourceIds),new Set(['p1','g1']));assert.equal(component.getValue().resourceSnapshot.length,2);component.dispose();
});

test('association sprint renders four semantic illustrated choices per pair and emits one valid gated answer', async () => {
  reset(); const root = new MiniNode('root'); const done = []; const prepared = [];
  const settings = normalizeHannaSettings({ hannaVersion:2, activity:'association', itemCount:3, delayMs:10000, associationMs:30000 });
  const dispose = hannaGames['hanna-method'].mount({ root,h,settings,seed:19,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(answer,meta){prepared.push({answer,meta});return null;} });
  begin(root);
  assert.equal(root.querySelector('.hanna-v2-play').lastScrollOptions?.behavior,'auto');
  assert.ok(root.querySelector('.hanna-v2-play').className.includes('is-association-round'));
  assert.equal(root.querySelectorAll('.hanna-v2-phase-heading').length,0);
  assert.ok(root.querySelector('.hanna-v2-association-head h3').textContent.includes(' + '));
  assert.equal(root.querySelectorAll('.hanna-v2-own-scene').length,1);
  const stableTimer=root.querySelector('.hanna-v2-timer');const stableFocus=focused;advance(1000);assert.equal(root.querySelector('.hanna-v2-timer'),stableTimer,'a timer tick must not replace the choice grid');assert.equal(focused,stableFocus,'a timer tick must not move keyboard focus');
  for (let pair = 0; pair < 3; pair++) {
    assert.equal(root.querySelectorAll('.hanna-v2-association-choice').length, 4);
    const choice=root.querySelectorAll('.hanna-v2-association-choice')[pair % 4];choice.click();assert.equal(root.querySelectorAll('.hanna-v2-association-choice')[pair%4],choice,'selection must stay in the same visible grid');button(root, 'Ezt a képet viszem tovább').click();
  }
  advance(30000);
  await flush(); assert.equal(prepared.length, 1); assert.equal(prepared[0].meta.gateId, 'association-delay-gate');
  advance(10050);
  assert.equal(button(root,'2. támpont').disabled,true);assert.equal(button(root,'3. támpont').disabled,true);assert.equal(button(root,'Megoldás').disabled,true);
  button(root, '1. támpont').click(); button(root, '2. támpont').click(); button(root, '3. támpont').click(); button(root, 'Megoldás').click();
  for (let index = 0; index < 3; index++) { const input = root.querySelector('input'); if (input) input.value = ''; button(root, 'Válasz rögzítése').click(); }
  button(root, 'Tovább').click();
  assert.equal(done.length, 1); assert.equal(done[0][0], null); assert.equal(done[0][1].version, 2); assert.equal(done[0][1].encoding.length, 3); assert.equal(done[0][1].responses[0].hintLevel, 4);
  const allowedEvents=['start','complete','pause','resume','visibility','restart','hint','show-answer','phase','encoding-commit','association-choice','association-time','recall-response','location-select','gate-prepare','gate-ready'];assert.ok(done[0][1].events.every((entry)=>allowedEvents.includes(entry.type)));
  for(const event of done[0][1].events){if(event.type==='encoding-commit'||event.type==='association-time')assert.ok(event.stepId,event.type);if(event.type==='association-choice')assert.ok(event.stepId&&event.roundId,event.type);if(event.type==='recall-response')assert.ok(event.trialId,event.type);if(event.type==='gate-prepare'||event.type==='gate-ready')assert.ok(event.gateId,event.type);}
  assert.doesNotThrow(()=>scoreHannaAttempt(settings,19,done[0][1],{serverDurationMs:50000}));
  dispose(); dispose(); assert.equal(root.children.length, 0); assert.equal(timers.size, 0);
});

test('timed palace steps never fabricate a place check or skip an empty own scene',()=>{
  reset();const root=new MiniNode('root');const seed=3;const palace={id:'timed-palace',kind:'palace',title:'Öt hely',revision:1,ready:true,data:{locations:Array.from({length:5},(_,index)=>({id:`tp-${index+1}`,name:`Hely ${index+1}`}))}};const settings=normalizeHannaSettings({hannaVersion:2,activity:'palace',itemCount:5,resourceIds:[palace.id],resourceSnapshot:[palace],encodingMs:30000,delayMs:10000,adaptive:false});const plan=generateHannaSession(settings,seed);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  for(let index=0;index<15;index++)walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active')).click();
  for(const trial of plan.training.trials){root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent===String(trial.expected)).click();button(root,'Következő próba').click();}
  assert.ok(root.textContent.includes('Képalkotás: 30 mp'));assert.ok(root.textContent.includes('Előbb érintsd meg: Hely 1'));advance(30000);assert.ok(root.textContent.includes('Az időkeret lejárt'));assert.ok(root.textContent.includes('Előbb érintsd meg: Hely 1'));
  walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active')).click();assert.equal(button(root,'Kapcsolat rögzítése').disabled,true);const firstScene=root.querySelector('textarea');firstScene.value='a kulcs felrázza az ajtót';firstScene.dispatchEvent({type:'input'});button(root,'Kapcsolat rögzítése').click();assert.ok(root.textContent.includes('Előbb érintsd meg: Hely 2'));assert.ok(root.textContent.includes('Képalkotás: 30 mp'));advance(30000);assert.ok(root.textContent.includes('Az időkeret lejárt'));assert.ok(root.textContent.includes('Előbb érintsd meg: Hely 2'));assert.equal(button(root,'Kapcsolat rögzítése').disabled,true);dispose();
});

test('boss strategy and face reveal keep one visible step deadline across rerenders',()=>{
  reset();const bossRoot=new MiniNode('root');const bossSettings=normalizeHannaSettings({hannaVersion:2,activity:'boss',encodingMs:30000,adaptive:false});const disposeBoss=hannaGames['hanna-method'].mount({root:bossRoot,h,settings:bossSettings,seed:1,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(bossRoot);assert.ok(bossRoot.textContent.includes('Képalkotás: 30 mp'));advance(10000);bossRoot.querySelectorAll('.hanna-v2-strategy')[0].click();assert.ok(bossRoot.textContent.includes('Képalkotás: 20 mp'));advance(20000);assert.ok(bossRoot.textContent.includes('Az időkeret lejárt'));assert.ok(bossRoot.querySelector('.hanna-v2-boss-strategy'));assert.equal(button(bossRoot,'Ezzel a stratégiával kódolom').disabled,true);disposeBoss();
  reset();const faceRoot=new MiniNode('root');const faceSettings=normalizeHannaSettings({hannaVersion:2,activity:'faces',itemCount:3,encodingMs:30000,delayMs:10000,adaptive:false});const disposeFace=hannaGames['hanna-method'].mount({root:faceRoot,h,settings:faceSettings,seed:5,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(faceRoot);assert.ok(faceRoot.textContent.includes('Képalkotás: 30 mp'));advance(3000);assert.ok(faceRoot.textContent.includes('Személyes tény:'));assert.ok(faceRoot.textContent.includes('Képalkotás: 27 mp'));advance(27000);assert.ok(faceRoot.textContent.includes('3 MÁSODPERC · ARC ÉS NÉV'));disposeFace();
});

test('association initial focus stays in the visible choice pool, never in the closed own-scene details',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'association',itemCount:3,associationMs:30000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:19,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);assert.ok(documentSurface.activeElement.className.split(/\s+/).includes('hanna-v2-association-choice'));assert.equal(documentSurface.activeElement.tagName,'BUTTON');dispose();
});

test('one held Enter advances exactly one encoding step and moves focus to the next editable field',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:5,encodingMs:0,delayMs:10000,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  const action=button(root,'Következő kapcsolat');action.focus();pressKey('Enter');const nextField=root.querySelector('textarea');assert.equal(documentSurface.activeElement,nextField,'a new step must focus its editable field, not the repeated footer action');const nextScreen=root.textContent;const repeatedNewline=pressKey('Enter',{repeat:true});const repeatedSpace=pressKey(' ',{repeat:true});assert.equal(repeatedNewline.defaultPrevented,false,'textarea newline repeat must remain a normal editing action');assert.equal(repeatedSpace.defaultPrevented,false,'textarea space repeat must remain a normal editing action');assert.equal(root.textContent,nextScreen,'editing keys must not commit the next step');releaseKey('Enter');releaseKey(' ');dispose();
});

test('held Enter remains blocked when the activated control crosses a block boundary',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:5,encodingMs:0,delayMs:10000,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);while(button(root,'Következő kapcsolat'))button(root,'Következő kapcsolat').click();const finalAction=button(root,'Kódolás kész');finalAction.focus();pressKey('Enter');const repeat=pressKey('Enter',{repeat:true});assert.equal(repeat.defaultPrevented,true,'a block reset must not clear the held-key barrier');releaseKey('Enter');dispose();
});

test('lost keyup recovers on window blur and resume before the next button activation',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:5,encodingMs:0,delayMs:10000,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);const action=button(root,'Következő kapcsolat');action.focus();pressKey('Enter');windowSurface.dispatch('blur');assert.ok(button(root,'Folytatás'));button(root,'Folytatás').click();const nextAction=button(root,'Következő kapcsolat');nextAction.focus();const recovered=pressKey('Enter');assert.equal(recovered.defaultPrevented,false);assert.notEqual(button(root,'Következő kapcsolat'),nextAction,'the recovered key must activate the live next step');releaseKey('Enter');dispose();
});

test('pause opens a focused Escape-resumable modal without changing the active game answer state',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'association',itemCount:3,associationMs:30000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:19,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);const own=root.querySelector('.hanna-v2-own-scene textarea');own.value='a két tárgy összeütközik';own.dispatchEvent({type:'input'});assert.equal(button(root,'Ezt a képet viszem tovább').disabled,false);own.value='';own.dispatchEvent({type:'input'});assert.equal(button(root,'Ezt a képet viszem tovább').disabled,true);root.querySelectorAll('.hanna-v2-association-choice')[0].click();button(root,'Szünet').click();assert.equal(root.querySelectorAll('.hanna-v2-pause').length,1);assert.ok(button(root,'Folytatás'));button(root,'Folytatás').click();assert.equal(root.querySelectorAll('.hanna-v2-pause').length,0);assert.equal(root.querySelectorAll('.hanna-v2-association-choice').filter((entry)=>entry.className.split(/\s+/).includes('is-selected')).length,1);dispose();
});

test('whole-session restart binds recall only to the new run associations',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'association',itemCount:3,associationMs:30000,delayMs:10000,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:19,phase(){},done(){},async prepareHannaRecall(){return null;}});
  const reachRecall=async(tag)=>{begin(root);for(let index=0;index<3;index++){const own=root.querySelector('.hanna-v2-own-scene textarea');own.value=`${tag} ${index+1}`;own.dispatchEvent({type:'input'});button(root,'Ezt a képet viszem tovább').click();}advance(30000);await flush();advance(10050);};
  await reachRecall('ELSŐ-KÖR-JELENET');button(root,'1. támpont').click();button(root,'2. támpont').click();assert.ok(root.textContent.includes('ELSŐ-KÖR-JELENET'));button(root,'Újrakezdés').click();await reachRecall('MÁSODIK-KÖR-JELENET');button(root,'1. támpont').click();button(root,'2. támpont').click();assert.ok(root.textContent.includes('MÁSODIK-KÖR-JELENET'));assert.equal(root.textContent.includes('ELSŐ-KÖR-JELENET'),false);dispose();
});

test('paused time never consumes the active recall delay and Escape resumes from the same remainder',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:5,delayMs:10000,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);finishSimpleEncoding(root);await flush();advance(2000);button(root,'Szünet').click();assert.equal(focused,button(root,'Folytatás'));advance(30000);documentSurface.dispatch('keydown',{key:'Escape'});assert.equal(root.querySelector('.hanna-v2-pause'),null);assert.ok(root.textContent.includes('8 mp'));advance(7950);assert.ok(root.querySelector('.hanna-v2-distractor'));advance(100);assert.ok(root.querySelector('.hanna-v2-sorter'));dispose();
});

test('route training teaches visible places before a hidden test and corrects a wrong answer in place',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'loci',itemCount:5,delayMs:10000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:3,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  assert.ok(root.textContent.includes('1/3 bejárás'));const wrongPlace=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.dataset.locationId&&!entry.className.split(/\s+/).includes('is-active'));wrongPlace.click();assert.ok(root.textContent.includes('Ez még nem a következő hely. Keresd:'));assert.equal(root.querySelector(`[data-location-id="${wrongPlace.dataset.locationId}"]`).className.includes('is-visited'),false);for(let index=0;index<15;index++){const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active'));assert.ok(active,`guided route ${index+1}`);active.click();}assert.ok(root.textContent.includes('REJTETT PRÓBA'));
  const wrong=root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent!=='bejárati ajtó');wrong.click();assert.ok(root.textContent.includes('A helyes válasz: bejárati ajtó'));assert.equal(button(root,'Kapcsolat rögzítése'),undefined);dispose();
});

test('failed route training returns to a live guided room before a reshuffled hidden test',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'loci',itemCount:5,delayMs:10000,adaptive:false});const plan=generateHannaSession(settings,9);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:9,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);for(let index=0;index<15;index++)walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active')).click();for(const trial of plan.training.trials){const wrong=root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent!==String(trial.expected));wrong.click();button(root,'Következő próba').click();}assert.ok(button(root,'Újratanulás'));button(root,'Újratanulás').click();assert.ok(root.textContent.includes('1/5 tanulandó kapcsolat'));const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active'));assert.ok(active);active.click();assert.ok(root.textContent.includes('2/5 tanulandó kapcsolat'));dispose();
});

test('custom palace placement shows the real station and target, preserving the own scene across station taps',()=>{
  reset();const root=new MiniNode('root');const seed=3;const names=['Ajtó','Fiók','Asztal','Ablak','Szék'];const palace={id:'p1',kind:'palace',title:'Otthon',revision:1,ready:true,data:{locations:names.map((name,index)=>({id:`p${index}`,name}))}};const settings=normalizeHannaSettings({hannaVersion:2,activity:'palace',itemCount:5,resourceIds:['p1'],resourceSnapshot:[palace],delayMs:10000});const plan=generateHannaSession(settings,seed);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  for(let index=0;index<15;index++){const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active'));assert.ok(active);active.click();}
  for(const trial of plan.training.trials){const choice=root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent===String(trial.expected));assert.ok(choice,trial.id);choice.click();button(root,'Következő próba').click();}
  assert.ok(root.querySelector('.hanna-v2-place-link'));assert.ok(root.textContent.includes('Előbb érintsd meg: Ajtó'));assert.equal(root.querySelectorAll('.hanna-v2-custom-route').length,1);assert.equal(root.textContent.includes('Hely 1'),false);assert.equal(documentSurface.activeElement.dataset.locationId,'p0','the mandatory custom station picker must receive focus before its story field');const scene=root.querySelector('textarea');scene.value='az óriási kulcs kipattintja az ajtót';scene.dispatchEvent({type:'input'});const wrong=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.dataset.locationId==='p1');const visitedBefore=wrong.className.includes('is-visited');wrong.click();assert.ok(root.textContent.includes('Ez még nem a következő hely. Keresd: Ajtó.'));assert.equal(root.querySelector('[data-location-id="p1"]').className.includes('is-visited'),visitedBefore,'a téves koppintás nem változtathatja a bejárt állapotot');assert.equal(button(root,'Kapcsolat rögzítése').disabled,true);const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.dataset.locationId==='p0');active.click();assert.equal(documentSurface.activeElement.dataset.locationId,'p0');assert.ok(root.textContent.includes('Ajtó → kulcs'));assert.equal(root.querySelector('textarea').value,'az óriási kulcs kipattintja az ajtót');assert.equal(button(root,'Kapcsolat rögzítése').disabled,false);dispose();
});

test('palace recall walks one real station at a time, preserves corrections and submits ordered arrays',async()=>{
  reset();const root=new MiniNode('root');const done=[];const seed=3;const names=['Ajtó','Fiók','Lámpa','Ablak','Szék'];const palace={id:'p1',kind:'palace',title:'Otthon',revision:1,ready:true,data:{locations:names.map((name,index)=>({id:`p${index}`,name,...(index===0?{photo:'data:image/png;base64,cGxhY2U='}:{})}))}};const settings=normalizeHannaSettings({hannaVersion:2,activity:'palace',itemCount:5,resourceIds:['p1'],resourceSnapshot:[palace],delayMs:10000});const plan=generateHannaSession(settings,seed);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(){return null;}});begin(root);
  for(let index=0;index<15;index++){const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active'));assert.ok(active);active.click();}
  for(const trial of plan.training.trials){root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent===String(trial.expected)).click();button(root,'Következő próba').click();}
  for(let index=0;index<5;index++){const step=plan.encodingSteps.find((entry)=>entry.id===`palace-place-${index+1}`);const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.dataset.locationId===step.locationId);assert.ok(active);active.click();const scene=root.querySelector('textarea');scene.value=`saját jelenet ${index+1}`;scene.dispatchEvent({type:'input'});button(root,'Kapcsolat rögzítése').click();}
  await flush();advance(10050);
  assert.ok(root.querySelector('.hanna-v2-route-recall'));assert.ok(root.textContent.includes('Ajtó'));assert.equal(root.querySelectorAll('.hanna-v2-custom-route img').length,1);assert.equal(root.textContent.includes(plan.recallTrials[0].expected[0]),false,'the learned object must stay hidden');
  let field=root.querySelector('input');field.value='első javítandó';field.dispatchEvent({type:'input'});button(root,'Következő hely').click();assert.ok(root.textContent.includes('Fiók'));assert.equal(documentSurface.activeElement.dataset.focusId,'route-answer');button(root,'Előző hely').click();assert.equal(documentSurface.activeElement.dataset.focusId,'route-answer');assert.equal(root.querySelector('input').value,'első javítandó');root.querySelector('input').value='első végleges';root.querySelector('input').dispatchEvent({type:'input'});button(root,'Következő hely').click();
  for(let index=1;index<5;index++){field=root.querySelector('input');field.value=`előre ${index+1}`;field.dispatchEvent({type:'input'});button(root,index===4?'Teljes útvonal rögzítése':'Következő hely').click();}
  assert.ok(root.textContent.includes('Szék'));assert.ok(root.textContent.includes('VISSZAFELÉ BEJÁRÁS'));
  for(let index=0;index<5;index++){field=root.querySelector('input');field.value=`vissza ${index+1}`;field.dispatchEvent({type:'input'});button(root,index===4?'Teljes útvonal rögzítése':'Következő hely').click();}
  for(let index=0;index<5;index++){assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);assert.ok(root.querySelector('.hanna-v2-custom-route'));const active=root.querySelector('.hanna-v2-custom-route .is-active');assert.ok(active);field=root.querySelector('input');field.value=`véletlen ${index+1}`;button(root,'Válasz rögzítése').click();}
  button(root,'Tovább').click();assert.equal(done.length,1);assert.deepEqual(done[0][1].responses[0].value,['első végleges','előre 2','előre 3','előre 4','előre 5']);assert.deepEqual(done[0][1].responses[1].value,['vissza 1','vissza 2','vissza 3','vissza 4','vissza 5']);dispose();
});

test('a 30-place builtin route follows the actual room in forward, reverse and random recall',async()=>{
  reset();const root=new MiniNode('root');const seed=11;const settings=normalizeHannaSettings({hannaVersion:2,activity:'loci',itemCount:30,delayMs:10000,adaptive:false});const plan=generateHannaSession(settings,seed);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  for(let index=0;index<90;index++){const active=walk(root).find((entry)=>entry.tagName==='BUTTON'&&entry.className.split(/\s+/).includes('is-active'));assert.ok(active,`tour ${index+1}`);active.click();}
  for(const trial of plan.training.trials){const choice=root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent===String(trial.expected));assert.ok(choice,trial.id);choice.click();button(root,'Következő próba').click();}
  for(let index=0;index<30;index++){const active=root.querySelector('.hanna-v2-room-canvas .is-active');assert.ok(active,`encoding ${index+1}`);active.click();const own=root.querySelector('textarea');own.value=`jelenet ${index+1}`;own.dispatchEvent({type:'input'});button(root,'Kapcsolat rögzítése').click();}
  await flush();advance(10050);for(let index=0;index<30;index++){const step=plan.encodingSteps.find((entry)=>entry.id===`loci-place-${index+1}`);const location=HANNA_ROOM_LOCATIONS.find((entry)=>entry.id===step.locationId);assert.ok(root.textContent.includes(location.label),`forward ${index+1}: ${location.label}`);assert.equal(root.querySelector('.hanna-v2-room-canvas img').attributes.src,HANNA_ROOMS.find((entry)=>entry.id===location.roomId).src);const input=root.querySelector('input');input.value=`előre ${index+1}`;input.dispatchEvent({type:'input'});button(root,index===29?'Teljes útvonal rögzítése':'Következő hely').click();}
  const lastLocation=HANNA_ROOM_LOCATIONS.at(-1);assert.ok(root.textContent.includes(lastLocation.label));assert.equal(root.querySelector('.hanna-v2-room-canvas img').attributes.src,HANNA_ROOMS.at(-1).src);for(let index=0;index<30;index++){const input=root.querySelector('input');input.value=`vissza ${index+1}`;input.dispatchEvent({type:'input'});button(root,index===29?'Teljes útvonal rögzítése':'Következő hely').click();}
  for(const trial of plan.recallTrials.slice(2)){const locationId=String(trial.anchorId).replace(/^builtin-room:/,'');const location=HANNA_ROOM_LOCATIONS.find((entry)=>entry.id===locationId);assert.ok(location,trial.id);assert.equal(root.querySelector('.hanna-v2-room-canvas .is-active').dataset.locationId,locationId);assert.equal(root.querySelector('.hanna-v2-room-canvas img').attributes.src,HANNA_ROOMS.find((entry)=>entry.id===location.roomId).src);root.querySelector('input').value='véletlen válasz';button(root,'Válasz rögzítése').click();}dispose();
});

test('random recall from a palace shows the real learned place instead of a location placeholder',()=>{
  reset();const root=new MiniNode('root');const anchors=['Ajtó','Fiók','Lámpa','Ablak','Szék'].map((label,index)=>({id:`palace:p${index}`,label,position:index+1,kind:'location',visual:{type:'location',key:`p${index}`,label}}));const content=['alma','konyv','kulcs','lampa','hajo'].map((key,index)=>({id:`saved-${key}`,kind:'picture',label:key,position:index+1,anchorId:anchors[index].id,visual:{type:'object',key}}));const learnedSnapshot={version:2,sourceActivity:'palace',sourceLabel:'Otthoni út',content,anchors,encoding:content.map((entry,index)=>({stepId:`palace-place-${index+1}`,itemId:entry.id,association:`saját kapcsolat ${index+1}`,rtMs:1000}))};const settings=normalizeHannaSettings({hannaVersion:2,activity:'random',recallMode:'random',sourceResultId:'result-1',learnedSnapshot});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:4,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);assert.ok(root.querySelector('.hanna-v2-custom-route'));assert.ok(root.textContent.includes('Lámpa'));assert.ok(root.querySelector('.hanna-v2-custom-route .is-active'));assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);assert.equal(root.textContent.includes('Felidézési támpont – szöveges vizuális helyőrző'),false);dispose();
});

test('multi-choice recall keeps focus on the toggled live choice',()=>{
  reset();const root=new MiniNode('root');const anchors=['Ajtó','Fiók','Lámpa','Ablak','Szék'].map((label,index)=>({id:`palace:p${index}`,label,position:index+1,kind:'location',visual:{type:'location',key:`p${index}`,label}}));const content=['alma','konyv','kulcs','lampa','hajo'].map((key,index)=>({id:`saved-${key}`,kind:'picture',label:key,position:index+1,anchorId:anchors[index].id,visual:{type:'object',key}}));const learnedSnapshot={version:2,sourceActivity:'palace',sourceLabel:'Otthoni út',content,anchors,encoding:content.map((entry,index)=>({stepId:`palace-place-${index+1}`,itemId:entry.id,association:`saját kapcsolat ${index+1}`,rtMs:1000}))};const settings=normalizeHannaSettings({hannaVersion:2,activity:'random',recallMode:'choice',sourceResultId:'result-1',learnedSnapshot});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:4,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);for(let index=0;index<3;index++)root.querySelectorAll('.hanna-v2-choice')[0].click();const choice=root.querySelectorAll('.hanna-v2-choice')[3];const focusId=choice.dataset.focusId;choice.click();assert.equal(documentSurface.activeElement.dataset.focusId,focusId);assert.equal(documentSurface.activeElement.attributes['aria-pressed'],'true');documentSurface.activeElement.click();assert.equal(documentSurface.activeElement.dataset.focusId,focusId);assert.equal(documentSurface.activeElement.attributes['aria-pressed'],'false');dispose();
});

test('chain uses tap-accessible ordered selection, then a word-bank-free free list, then random recall', async () => {
  reset(); const root = new MiniNode('root'); const done = [];
  const settings = normalizeHannaSettings({ hannaVersion:2, activity:'chain', itemCount:5, delayMs:10000, recallMode:'ordered' });
  const dispose = hannaGames['hanna-method'].mount({ root,h,settings,seed:7,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(){return null;} });
  begin(root); finishSimpleEncoding(root); await flush();assert.equal(root.querySelectorAll('.hanna-v2-distractor-grid button').length,4);root.querySelectorAll('.hanna-v2-distractor-grid button').find((entry)=>Number(entry.textContent)%2===0).click();advance(10050);
  assert.ok(root.querySelector('.hanna-v2-sorter')); let guard=0;
  while (root.querySelectorAll('.hanna-v2-sort-pool button').length) { root.querySelectorAll('.hanna-v2-sort-pool button')[0].click(); if (++guard>10) throw new Error('sort loop'); }
  button(root,'Sorrend rögzítése').click();
  assert.ok(root.querySelector('.hanna-v2-free-list')); assert.equal(root.querySelectorAll('.hanna-v2-choice').length,0);
  root.querySelector('textarea').value='alma, könyv'; button(root,'Válasz rögzítése').click();
  while (button(root,'Kihagyom')||root.querySelector('.hanna-v2-choice')) (button(root,'Kihagyom')||root.querySelector('.hanna-v2-choice')).click();
  button(root,'Tovább').click();
  assert.equal(done.length,1); assert.ok(Array.isArray(done[0][1].responses[0].value)); assert.equal(done[0][1].responses[0].value.length,5); assert.deepEqual(done[0][1].responses[1].value,['alma','könyv']);
  assert.doesNotThrow(()=>scoreHannaAttempt(settings,7,done[0][1],{serverDurationMs:20000})); dispose();
});

test('long ordered chains expose the complete word bank in eight-item pages and keep focus in the sorter',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:40,delayMs:10000,encodingMs:0,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);finishSimpleEncoding(root);await flush();advance(10050);assert.ok(root.querySelector('.hanna-v2-sorter'));assert.equal(root.querySelectorAll('.hanna-v2-sort-pool button').length,8);assert.ok(root.textContent.includes('1–8 / 40 megmaradt'));button(root,'Következő lap').click();assert.ok(root.textContent.includes('9–16 / 40 megmaradt'));assert.equal(documentSurface.activeElement.dataset.focusId,'sort-pool-next');let selected=0;while(root.querySelectorAll('.hanna-v2-sort-pool button').length){root.querySelectorAll('.hanna-v2-sort-pool button')[0].click();selected++;assert.ok(selected<=40);if(selected<40){assert.ok(documentSurface.activeElement);assert.equal(insideSorter(documentSurface.activeElement,root),true);}}assert.equal(selected,40);assert.ok(root.textContent.includes('Készülő teljes sorrend · 40/40'));assert.ok(root.textContent.includes('Nincs megmaradt elem'));dispose();
});

test('mobile long-chain sorter uses four reachable choices per page',async()=>{
  reset();const originalMatchMedia=globalThis.matchMedia;globalThis.matchMedia=(query)=>({matches:String(query).includes('max-width: 560px')});const root=new MiniNode('root');let dispose=()=>{};try{const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:10,delayMs:10000,encodingMs:0,adaptive:false});dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);finishSimpleEncoding(root);await flush();advance(10050);assert.ok(root.querySelector('.hanna-v2-play').className.includes('is-sort-recall'));assert.equal(root.querySelectorAll('.hanna-v2-sort-pool button').length,4);assert.ok(root.textContent.includes('1–4 / 10 megmaradt'));assert.ok(root.textContent.includes('négyes lapokban'));assert.ok(root.textContent.includes('Koppints a következő elemre'));}finally{dispose();globalThis.matchMedia=originalMatchMedia;}
});

test('sorter responds to a live mobile breakpoint change and removes its listener on dispose',async()=>{
  reset();const originalMatchMedia=globalThis.matchMedia;const media=new EventSurface();media.matches=false;globalThis.matchMedia=()=>media;const root=new MiniNode('root');let dispose=()=>{};try{const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:10,delayMs:10000,encodingMs:0,adaptive:false});dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);finishSimpleEncoding(root);await flush();advance(10050);assert.equal(root.querySelectorAll('.hanna-v2-sort-pool button').length,8);root.querySelectorAll('.hanna-v2-sort-pool button')[0].click();assert.ok(root.textContent.includes('Készülő teljes sorrend · 1/10'));media.matches=true;media.dispatch('change',{matches:true});assert.equal(root.querySelectorAll('.hanna-v2-sort-pool button').length,4);assert.ok(root.textContent.includes('Készülő teljes sorrend · 1/10'));dispose();assert.equal((media.listeners.get('change')||[]).length,0);}finally{dispose();globalThis.matchMedia=originalMatchMedia;}
});

test('short sorter remove controls keep focus on the adjacent chosen item',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'chain',itemCount:5,delayMs:10000,encodingMs:0,adaptive:false});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);finishSimpleEncoding(root);await flush();advance(10050);for(let index=0;index<3;index++)root.querySelectorAll('.hanna-v2-sort-pool button')[0].click();const removeButtons=buttons(root,'Vissza');assert.equal(removeButtons.length,3);assert.notEqual(removeButtons[0].dataset.focusId,removeButtons[1].dataset.focusId);removeButtons[1].click();assert.equal(documentSurface.activeElement.dataset.focusId,'sort-remove-1');dispose();
});

test('result localizes measured areas and does not draw a skill bar for response time',()=>{
  reset();const dimensions={encodingSpeed:{value:4.5,unit:'items/min',evidence:'practice'},immediateRecall:{value:.9,unit:'ratio'},delayedRecall:{value:.8,unit:'ratio',evidence:'assisted'},sequenceMemory:{value:.7,unit:'ratio'},randomAccess:{value:7999,unit:'ms'},nameMemory:{value:.9,unit:'ratio'},numberMemory:{value:.8,unit:'ratio'},associativeMemory:{value:.7,unit:'ratio'},longTermRetention:{value:.6,unit:'ratio'},strategyIndependence:{value:.5,unit:'ratio'},empty:{value:null},missing:null};const result=renderHannaResult(h,{correct:55,total:56,percent:98,summary:'Részletes szerveres magyarázat',details:[{label:'1. szó',actual:'—',expected:'felszíni',correct:false,feedback:'Kimaradt szó.'}],metrics:{dimensions,blockResults:[{id:'text-immediate',correct:27,total:28},{id:'text-delayed',correct:28,total:28}]}});
  for(const label of ['Kódolási tempó','Azonnali felidézés','Késleltetett felidézés','Sorrendi emlékezet','Közvetlen hozzáférés','Név–arc kapcsolatok','Számok emlékezete','Kapcsolati felidézés','Tartós megtartás','Önálló módszerhasználat'])assert.ok(result.textContent.includes(label),label);
  assert.ok(result.textContent.includes('55/56 sikeres felidézés'));assert.ok(result.textContent.includes('8 mp'));assert.ok(result.textContent.includes('elem/perc'));assert.equal(result.textContent.includes('items/min'),false);assert.ok(result.textContent.includes('gyakorlási adat'));assert.ok(result.textContent.includes('segítséggel felidézve'));assert.ok(result.textContent.includes('Szöveg · azonnali felidézés'));assert.ok(result.textContent.includes('Kimaradt szó: felszíni'));assert.equal(result.querySelectorAll('.hanna-v2-progress-track').length,8);assert.equal(result.querySelectorAll('.hanna-v2-progress-card').length,10);for(const raw of ['delayedRecall','longTermRetention','strategyIndependence','practice','assisted','text-immediate'])assert.equal(result.textContent.includes(raw),false,raw);
});

test('number result exposes digit throughput and exact partial credit',()=>{
  reset();const result=renderHannaResult(h,{correct:8,total:8,percent:100,metrics:{dimensions:{encodingSpeed:{value:3,unit:'items/min'}},blockResults:[{id:'numbers-delayed',correct:8,total:8}],subscales:{number:{digitsCorrect:8,digitsTotal:8,digitsPerMinute:12.5}}}});assert.ok(result.textContent.includes('Helyes számjegy / perc'));assert.ok(result.textContent.includes('12,5'));assert.ok(result.textContent.includes('8/8 számjegy pontos'));assert.equal(result.querySelectorAll('.hanna-v2-progress-track').length,0);
});

test('teacher result links to the selected student profile with an explicit student context',()=>{
  reset();const result=renderHannaResult(h,{correct:4,total:5,percent:80,studentDisplayName:'Hanna',metrics:{}},{teacher:true,studentId:'student 7',studentLabel:'Hanna'});assert.ok(result.textContent.includes('Tanulói eredmény · Hanna'));assert.ok(result.textContent.includes('Tanuló teljes készségtérképe'));assert.equal(result.querySelector('a').attributes.href,'#/hanna-modszer?view=progress&studentId=student%207');
});

test('a teacher practice result stays distinct from a selected student profile',()=>{
  reset();const result=renderHannaResult(h,{correct:3,total:3,percent:100,metrics:{timingEvidence:{source:'browser-monotonic-clock',serverVerified:false},blockResults:[{id:'peg-forward',label:'Tárgyak előre',correct:3,total:3}] }},{teacher:true});assert.ok(result.textContent.includes('Tanári próbakör'));assert.ok(result.textContent.includes('Tanulói készségtérképek'));assert.equal(result.textContent.includes('Tanulói eredmény'),false);assert.ok(result.textContent.includes('Tárgyak előre'));assert.ok(result.textContent.includes('nem külön szerverhitelesített időadat'));
});

test('number encoding pairs the code with a readable built-in image word, never a visual placeholder',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'numbers',itemCount:8,delayMs:10000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:0,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);assert.ok(root.querySelector('.hanna-v2-word-image'));assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);assert.equal(root.textContent.includes('szöveges vizuális helyőrző'),false);dispose();
});

test('number recall uses one compact numeric field instead of list-entry guidance',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'numbers',itemCount:8,delayMs:10000,encodingMs:0,adaptive:false});const plan=generateHannaSession(settings,0);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:0,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);for(let index=0;index<plan.encodingSteps.length;index++)button(root,index===plan.encodingSteps.length-1?'Kódolás kész':'Következő kapcsolat').click();await flush();advance(10050);const input=root.querySelector('.hanna-v2-answer input');assert.ok(input);assert.equal(input.attributes.inputMode,'numeric');assert.equal(input.attributes.placeholder,'Írd be a számsort szóközök nélkül…');assert.equal(root.textContent.includes('soronként vagy vesszővel'),false);dispose();
});

test('face encoding gives a three-second name glance, then exposes both trait and personal fact',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'faces',itemCount:3,recallMode:'free',delayMs:10000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:5,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);assert.ok(root.textContent.includes('3 MÁSODPERC · ARC ÉS NÉV'));assert.equal(root.textContent.includes('Személyes tény:'),false);advance(2999);assert.equal(root.textContent.includes('Személyes tény:'),false);advance(1);assert.ok(root.textContent.includes('Megfigyelési támpont:'));assert.ok(root.textContent.includes('Személyes tény:'));assert.ok(root.textContent.includes('Saját történetem, benne a személyes ténnyel'));dispose();
});

test('a face recall keeps the learned name out of portrait labels and third-level hints',async()=>{
  reset();const root=new MiniNode('root');const seed=5;const settings=normalizeHannaSettings({hannaVersion:2,activity:'faces',itemCount:3,recallMode:'free',delayMs:10000,adaptive:false});const plan=generateHannaSession(settings,seed);const expected=String(plan.recallTrials[0].expected);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);for(let index=0;index<3;index++){advance(3000);button(root,index===2?'Kódolás kész':'Következő kapcsolat').click();}await flush();advance(10050);assert.ok(root.querySelector('.hanna-v2-portrait'));for(const level of [1,2,3])button(root,`${level}. támpont`).click();assert.equal(root.textContent.includes(expected),false);assert.equal(root.querySelector('.hanna-v2-portrait').attributes['aria-label'],'Arcportré név nélkül');dispose();
});

test('text shows concrete first-recall feedback before restudy and closes after the second recall',async()=>{
  reset();const root=new MiniNode('root');const done=[];const settings=normalizeHannaSettings({hannaVersion:2,activity:'text',recallMode:'verbatim',delayMs:10000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:2,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(){return null;}});begin(root);button(root,'Megjegyeztem').click();const first=root.querySelector('textarea');first.value='';button(root,'Válasz rögzítése').click();assert.ok(root.textContent.includes('ELSŐ FELIDÉZÉS · SZÓPONTOS ELTÉRÉSEK'));assert.ok(root.textContent.includes('Kimaradt:'));assert.ok(root.textContent.includes('előzetes, helyi szóegyeztetés'));assert.ok(root.textContent.includes('végső eredményt a szerver számolja'));button(root,'Célzott átnézés kész').click();await flush();advance(10050);const second=root.querySelector('textarea');second.value='';button(root,'Válasz rögzítése').click();assert.ok(root.textContent.includes('Mindkét felidézés elkészült'));assert.equal(button(root,'Újra átnéztem'),undefined);button(root,'Kör lezárása').click();assert.equal(done.length,1);dispose();
});

test('concept imagination carries the own image into an editable definition-binding step', () => {
  reset(); const root = new MiniNode('root');
  const settings = normalizeHannaSettings({ hannaVersion:2, activity:'concept', itemCount:3, delayMs:10000 });
  const plan = generateHannaSession(settings,4); const firstConcept=plan.content[0];
  const dispose = hannaGames['hanna-method'].mount({ root,h,settings,seed:4,phase(){},done(){},async prepareHannaRecall(){return null;} });
  begin(root); assert.ok(root.querySelector('.hanna-v2-concept-imagine')); assert.equal(root.querySelectorAll('textarea').length,0);
  advance(1999); assert.equal(root.querySelectorAll('textarea').length,0); advance(1); assert.equal(root.querySelectorAll('textarea').length,1);
  const own=root.querySelector('textarea');own.value='két kéz együtt emel';own.dispatchEvent({type:'input'});assert.equal(button(root,'Saját kép rögzítése').disabled,false);button(root,'Saját kép rögzítése').click();
  assert.ok(root.querySelector('.hanna-v2-concept-binding'));assert.ok(root.textContent.includes(firstConcept.meaning));assert.equal(root.querySelectorAll('textarea').length,2);assert.equal(root.querySelectorAll('textarea')[0].value,'két kéz együtt emel');assert.equal(root.textContent.includes('szöveges vizuális helyőrző'),false);
  const link=root.querySelectorAll('textarea')[1];link.value='együtt mozdulnak ugyanazért a célért';link.dispatchEvent({type:'input'});assert.equal(button(root,'Jelentéskapcsolat rögzítése').disabled,false);
  dispose(); assert.equal(timers.size,0);
});

test('keyword bridge shows distinct foreign-word, sound-key and real meaning visuals without a generic placeholder',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'keyword',itemCount:3,contentLevel:'noun',delayMs:10000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:1,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);assert.equal(root.querySelectorAll('.hanna-v2-keyword-card').length,1);assert.ok(root.textContent.includes('Hangzáskulcs:'));assert.equal(root.querySelectorAll('.hanna-v2-memory-pair [data-visual-fallback]').length,0);assert.equal(root.textContent.includes('kapcsolat – szöveges vizuális helyőrző'),false);dispose();
});

test('major encoding renders the full digit code table, then a deliberate two-digit word image',()=>{
  reset();const root=new MiniNode('root');const seed=2;const settings=normalizeHannaSettings({hannaVersion:2,activity:'major'});const plan=generateHannaSession(settings,seed);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  for(let index=0;index<plan.training.items.length;index++)(button(root,index===plan.training.items.length-1?'Jöhet a rejtett próba':'Következő kapcsolat')).click();
  for(const trial of plan.training.trials){const expected=String(trial.expected);const choice=root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent===expected);assert.ok(choice,trial.id);choice.click();button(root,'Következő próba').click();}
  assert.equal(root.querySelectorAll('.hanna-v2-major-rule').length,10);assert.equal(button(root,'Lista rögzítve'),undefined);button(root,'Hangkód rögzítve').click();assert.ok(root.querySelector('.hanna-v2-major-word'));assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);dispose();
});

test('peg encoding shows the new object and its actual numbered hook without a connection placeholder',()=>{
  reset();const root=new MiniNode('root');const seed=1;const settings=normalizeHannaSettings({hannaVersion:2,activity:'peg',itemCount:10,trainingSize:10,delayMs:10000});const plan=generateHannaSession(settings,seed);const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);for(let index=0;index<plan.training.items.length;index++)button(root,index===plan.training.items.length-1?'Jöhet a rejtett próba':'Következő kapcsolat').click();for(const trial of plan.training.trials){root.querySelectorAll('.hanna-v2-choice').find((entry)=>entry.textContent===String(trial.expected)).click();button(root,'Következő próba').click();}assert.ok(root.textContent.includes('1. horog: gyertya'));assert.equal(root.querySelectorAll('.hanna-v2-memory-pair [data-visual-fallback]').length,0);assert.equal(root.textContent.includes('kapcsolat – szöveges vizuális helyőrző'),false);dispose();
});

test('rubric recall asks for meaning in free prose and preserves the draft through hints',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'concept',itemCount:3,delayMs:10000});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:4,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);for(let index=0;index<3;index++){advance(2000);const image=root.querySelector('textarea');image.value=`saját kép ${index+1}`;image.dispatchEvent({type:'input'});button(root,'Saját kép rögzítése').click();const fields=root.querySelectorAll('textarea');fields[1].value='a mozgás megmutatja a jelentést';fields[1].dispatchEvent({type:'input'});button(root,'Jelentéskapcsolat rögzítése').click();}await flush();advance(10050);const recall=root.querySelector('textarea');assert.equal(recall.attributes.placeholder,'Írd le a jelentést a saját szavaiddal…');assert.ok(root.textContent.includes('Az elfogadott megfogalmazásokat a szerver értékeli'));assert.equal(root.textContent.includes('A sorrendet és a kihagyásokat'),false);recall.value='félkész saját válasz';recall.dispatchEvent({type:'input'});button(root,'1. támpont').click();assert.equal(root.querySelector('textarea').value,'félkész saját válasz');assert.equal(documentSurface.activeElement.dataset.focusId,'hint-2');button(root,'2. támpont').click();assert.equal(documentSurface.activeElement.dataset.focusId,'hint-3');button(root,'3. támpont').click();assert.equal(documentSurface.activeElement.dataset.focusId,'show-answer');button(root,'Megoldás').click();assert.equal(documentSurface.activeElement.dataset.focusId,'recall-answer');assert.equal(root.querySelector('textarea').value,'félkész saját válasz');dispose();
});

test('boss keeps the full item set visible and requires a strategy plus an own connection',()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'boss'});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:1,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);assert.equal(root.querySelectorAll('.hanna-v2-boss-items article').length,5);assert.equal(root.querySelectorAll('.hanna-v2-strategy').length,3);assert.equal(button(root,'Lista rögzítve'),undefined);const submit=button(root,'Ezzel a stratégiával kódolom');assert.equal(submit.disabled,true);root.querySelectorAll('.hanna-v2-strategy')[0].click();const own=root.querySelector('.hanna-v2-strategy-support textarea');own.value='a zokni nekicsapódik a sajtnak';own.dispatchEvent({type:'input'});assert.equal(button(root,'Ezzel a stratégiával kódolom').disabled,false);assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);dispose();
});

test('boss exposes stage-specific face, number and concept support without placeholders',async()=>{
  reset();const root=new MiniNode('root');const settings=normalizeHannaSettings({hannaVersion:2,activity:'boss'});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:1,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);
  const commit=(own)=>{root.querySelectorAll('.hanna-v2-strategy')[0].click();const field=root.querySelector('.hanna-v2-strategy-support textarea');field.value=own;field.dispatchEvent({type:'input'});button(root,'Ezzel a stratégiával kódolom').click();};
  commit('öt tárgy mozgó lánca');assert.ok(root.textContent.includes('Névkulcs és történet'));assert.ok(root.textContent.includes('Személyes információ:'));assert.ok(root.querySelector('.hanna-v2-portrait'));assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);
  commit('a névkulcs és a személyes tény egy jelenetben');assert.ok(root.textContent.includes('Számképek lánca'));assert.ok(root.textContent.includes('34 → mérő'));assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);
  commit('mérő, vas, mama és csésze együtt mozog');assert.ok(root.textContent.includes('Kép és jelentés'));assert.ok(root.textContent.includes('Átmenet egy korábbi állapotból egy másikba.'));assert.ok(root.querySelector('[data-concept-key="valtozas"]'));assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);
  commit('a pillangó kibújik és megmutatja a változást');await flush();advance(10050);assert.equal(root.textContent.includes('Ma esedékes'),false);assert.ok(root.querySelector('.hanna-v2-recall-layout').className.includes('is-cue-free'));button(root,'1. támpont').click();button(root,'2. támpont').click();assert.ok(root.querySelector('.hanna-v2-recall-layout').className.includes('is-cue-free'));button(root,'3. támpont').click();assert.equal(root.querySelector('.hanna-v2-recall-layout').className.includes('is-cue-free'),false);assert.ok(root.querySelector('.hanna-v2-recall-layout .hanna-v2-visual'));dispose();
});

test('boss custom palace renders a route icon and real station ribbon instead of a location placeholder',()=>{
  reset();const root=new MiniNode('root');const palace={id:'p1',kind:'palace',title:'Otthon',revision:1,ready:true,data:{locations:['Ajtó','Fogas','Polc','Ablak','Szék'].map((name,index)=>({id:`own-${index+1}`,name,...(index===0?{photo:'data:image/png;base64,cGxhY2U='}:{})}))}};const settings=normalizeHannaSettings({hannaVersion:2,activity:'boss',resourceIds:['p1'],resourceSnapshot:[palace]});const dispose=hannaGames['hanna-method'].mount({root,h,settings,seed:1,phase(){},done(){},async prepareHannaRecall(){return null;}});begin(root);const loci=root.querySelectorAll('.hanna-v2-strategy').find((entry)=>entry.textContent.includes('Memóriapalota'));assert.ok(loci);assert.equal(loci.querySelectorAll('[data-visual-fallback]').length,0);loci.click();assert.equal(root.querySelectorAll('.hanna-v2-boss-route-ribbon div').length,5);assert.ok(root.textContent.includes('Ajtó'));assert.equal(root.querySelectorAll('.hanna-v2-boss-anchor-list li').length,5);assert.equal(root.querySelectorAll('[data-visual-fallback]').length,0);dispose();
});

test('hub is visual-first, starts an ordinary game with a V2-only shape, and blocks source-only games', () => {
  reset(); const starts=[]; const hub=createHannaHub({h,onStart:(settings)=>starts.push(settings)});
  assert.equal(hub.element.querySelectorAll('.hanna-v2-game-card').length,HANNA_ACTIVITIES.length);
  assert.equal(hub.element.querySelectorAll('[data-visual-fallback]').length,0);const activity=hub.element.querySelector('[data-setting="activity"]');activity.focus();activity.value='text';activity.dispatchEvent({type:'change'});assert.equal(documentSurface.activeElement,hub.element.querySelector('.hanna-v2-featured [data-setting="activity"]'));assert.ok(hub.element.querySelector('.hanna-v2-featured').textContent.includes('Szövegépítő'));assert.ok(hub.element.querySelectorAll('.hanna-v2-game-card').find((entry)=>entry.textContent.includes('Szövegépítő')).className.includes('is-selected'));button(hub.element,'Játék indítása').click(); assert.equal(starts.length,1); assert.equal(starts[0].hannaVersion,2); assert.equal(starts[0].activity,'text');
  const randomCard=hub.element.querySelectorAll('.hanna-v2-game-card').find((entry)=>entry.textContent.includes('Random Recall')); randomCard.click();
  assert.equal(button(hub.element,'A Mai útvonalból indítható').disabled,true); assert.equal(starts.length,1);
  assert.equal(typeof hub.canLeave,'function');assert.equal(hub.canLeave(),true);hub.dispose();
});

test('hub reuses one successful resource fetch across settings rerenders',async()=>{
  reset();let resourceCalls=0;const school={user:{id:'student-1',role:'student'},api:async(path)=>{if(path==='/api/hanna/resources'){resourceCalls++;return{resources:[]};}return{results:[],dailyPlan:[]};}};const hub=createHannaHub({h,school});await flush();assert.equal(resourceCalls,1);const activity=hub.element.querySelector('[data-setting="activity"]');activity.value='text';activity.dispatchEvent({type:'change'});await flush();const next=hub.element.querySelector('[data-setting="activity"]');next.value='chain';next.dispatchEvent({type:'change'});await flush();assert.equal(resourceCalls,1);hub.dispose();
});

test('returning from own tools invalidates the settings resource cache',async()=>{
  reset();let resourceCalls=0;let serverResources=[];const school={user:{id:'student-1',role:'student'},api:async(path)=>{if(path==='/api/hanna/resources'){resourceCalls++;return{resources:serverResources};}return{results:[],dailyPlan:[]};}};const hub=createHannaHub({h,school});await flush();assert.equal(resourceCalls,1);button(hub.element,'Saját eszközök').click();for(let index=0;index<6;index++)await flush();serverResources=[{id:'fresh-material',kind:'material',title:'Friss saját lista',revision:1,ready:true,data:{items:Array.from({length:5},(_,index)=>({id:`f-${index}`,label:`Elem ${index+1}`}))}}];button(hub.element,'Játékok').click();for(let index=0;index<4;index++)await flush();assert.ok(resourceCalls>=2);const activity=hub.element.querySelector('[data-setting="activity"]');activity.value='chain';activity.dispatchEvent({type:'change'});await flush();const picker=hub.element.querySelector('[data-setting="resourceIds-material"]');assert.ok(picker.querySelectorAll('option').some((entry)=>entry.value==='fresh-material'));hub.dispose();
});

test('teacher progress loads one selected student dashboard and keeps the daily dashboard teacher-owned',async()=>{
  reset();const calls=[];const students=[{id:'student-a',displayName:'Anna',active:true},{id:'student-b',displayName:'Bence',active:true}];const school={user:{id:'teacher-1',role:'teacher'},api:async(path,options)=>{calls.push([path,options]);if(path==='/api/teacher/students')return{students};return{results:[],dailyPlan:[]};}};const hub=createHannaHub({h,school,initialView:'progress',initialStudentId:'student-b'});for(let index=0;index<8&&calls.length<2;index++)await flush();assert.deepEqual(calls.slice(0,2).map((entry)=>entry[0]),['/api/teacher/students','/api/hanna/dashboard?studentId=student-b']);const picker=hub.element.querySelector('[data-setting="profileStudent"]');assert.ok(picker);assert.equal(picker.value,'student-b');picker.value='student-a';picker.dispatchEvent({type:'change'});await flush();assert.equal(calls.at(-1)[0],'/api/hanna/dashboard?studentId=student-a');button(hub.element,'Mai útvonal').click();await flush();assert.equal(calls.at(-1)[0],'/api/hanna/dashboard');hub.dispose();
});
