import test from 'node:test';
import assert from 'node:assert/strict';

class MiniNode {
  constructor(tagName, ownText = '') {
    this.tagName = String(tagName).toUpperCase(); this.children = []; this.parentNode = null;
    this.listeners = new Map(); this.attributes = {}; this.dataset = {}; this.className = ''; this.value = '';
    this.checked = false; this.disabled = false; this.hidden = false; this.open = false; this.ownText = ownText;
    this.files = []; this.style = { setProperty: (key, value) => { this.style[key] = value; } };
    this.classList = {
      add: (...names) => { const values = new Set(this.className.split(/\s+/).filter(Boolean)); names.forEach((name) => values.add(name)); this.className = [...values].join(' '); },
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }
  append(...nodes) { for (const node of nodes) { if (node === null || node === undefined || node === false) continue; this.children.push(node); if (node && typeof node === 'object') node.parentNode = this; } }
  replaceChildren(...nodes) { this.children = []; this.ownText = ''; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((item) => item !== listener)); }
  dispatchEvent(event) {
    event.target ??= this; event.currentTarget = this; event.preventDefault ??= () => {};
    for (const listener of this.listeners.get(event.type) || []) listener(event);
    return true;
  }
  click() { if (!this.disabled) this.dispatchEvent({ type: 'click' }); }
  focus() { focused = this; }
  querySelector(selector) { return query(this, selector)[0] || null; }
  querySelectorAll(selector) { return query(this, selector); }
  get textContent() { return this.ownText + this.children.map((node) => node.textContent).join(''); }
  set textContent(value) { this.ownText = String(value); this.children = []; }
}

function walk(root, includeRoot = true) {
  const found = [];
  const visit = (node) => { found.push(node); for (const child of node.children || []) visit(child); };
  if (includeRoot) visit(root); else for (const child of root.children || []) visit(child);
  return found;
}
function camel(value) { return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()); }
function simpleMatch(node, selector) {
  if (!node || typeof node !== 'object') return false;
  if (selector.startsWith('.')) return node.className.split(/\s+/).includes(selector.slice(1));
  const dataValue = selector.match(/^\[data-([\w-]+)="([^"]*)"\]$/);
  if (dataValue) return String(node.dataset[camel(dataValue[1])]) === dataValue[2];
  const dataPresent = selector.match(/^\[data-([\w-]+)\]$/);
  if (dataPresent) return node.dataset[camel(dataPresent[1])] !== undefined;
  const notDisabled = selector.match(/^(\w+):not\(\[disabled\]\)$/);
  if (notDisabled) return node.tagName === notDisabled[1].toUpperCase() && !node.disabled;
  return node.tagName === selector.toUpperCase();
}
function query(root, selector) {
  const alternatives = selector.split(',').map((entry) => entry.trim()).filter(Boolean);
  const nodes = walk(root);
  const result = [];
  for (const alternative of alternatives) {
    const parts = alternative.split(/\s+/);
    for (const node of nodes) {
      if (!simpleMatch(node, parts.at(-1))) continue;
      let ancestor = node.parentNode; let matched = true;
      for (let index = parts.length - 2; index >= 0; index--) {
        while (ancestor && !simpleMatch(ancestor, parts[index])) ancestor = ancestor.parentNode;
        if (!ancestor) { matched = false; break; }
        ancestor = ancestor.parentNode;
      }
      if (matched && !result.includes(node)) result.push(node);
    }
  }
  return result;
}
function withClass(root, className) { return query(root, `.${className}`); }
function button(root, label) { return walk(root).find((node) => node.tagName === 'BUTTON' && node.textContent === label); }
function buttons(root, label) { return walk(root).filter((node) => node.tagName === 'BUTTON' && node.textContent === label); }

class MiniEvents {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) { const list = this.listeners.get(type) || []; list.push(listener); this.listeners.set(type, list); }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => entry !== listener)); }
  dispatch(type, extra = {}) { for (const listener of this.listeners.get(type) || []) listener({ type, preventDefault() {}, ...extra }); }
}

let now = 0; let timerId = 0; let focused = null; const timers = new Map();
function setFakeTimeout(callback, delay = 0) { const id = ++timerId; timers.set(id, { at: now + Math.max(0, Number(delay) || 0), callback }); return id; }
function clearFakeTimeout(id) { timers.delete(id); }
function advance(milliseconds) {
  const target = now + milliseconds;
  while (true) {
    const due = [...timers.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
    if (!due) break;
    timers.delete(due[0]); now = due[1].at; due[1].callback();
  }
  now = target;
}
function resetClock() { now = 0; timerId = 0; timers.clear(); focused = null; }

const documentEvents = new MiniEvents(); const windowEvents = new MiniEvents();
globalThis.Node = MiniNode;
globalThis.document = Object.assign(documentEvents, {
  hidden: false, head: new MiniNode('head'), createElement: (tag) => new MiniNode(tag), createTextNode: (value) => new MiniNode('#text', String(value)),
  querySelector(selector) { return this.head.querySelector(selector); },
});
globalThis.window = windowEvents;
globalThis.setTimeout = setFakeTimeout;
globalThis.clearTimeout = clearFakeTimeout;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => now } });

const { h } = await import('../dist/core.js');
const { HANNA_ACTIVITIES } = await import('../dist/hanna/content.js');
const { generateHannaSession, normalizeHannaSettings, scoreHannaAttempt } = await import('../dist/hanna/engine.js');
const { createHannaSettings, hannaGames, renderHannaResult } = await import('../dist/hanna/ui.js');
const { createHannaHub, createHannaWorkspace } = await import('../dist/hanna/workspace.js');

async function flush() { await Promise.resolve(); await Promise.resolve(); await new Promise((resolve) => setImmediate(resolve)); }
function palaceResource(id = 'palota-1', ready = true) {
  return {
    id, kind: 'palace', title: 'Otthoni útvonal', revision: 3, ready,
    data: { locations: Array.from({ length: 5 }, (_, index) => ({ id: `p-${index}`, name: `Hely ${index + 1}`, description: `Leírás ${index + 1}` })) },
    createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z',
  };
}
function reviewSnapshot() {
  return [{
    id: 'due-1', sourceActivity: 'chain', sourceItemId: 'chain-1', prompt: 'Mi volt az első elem?', expected: 'alma',
    accepted: ['alma'], hints: ['Egy gyümölcs.', 'Piros is lehet.', 'A-val kezdődik.'],
    content: [{ id: 'review-alma', kind: 'picture', label: 'alma', image: '🍎' }],
    learnedAt: '2026-09-10T08:00:00.000Z', lastReviewedAt: null, intervalMs: 600000,
  }];
}
function settingsFor(activity) {
  if (activity === 'palace') return normalizeHannaSettings({ activity, itemCount: 5, resourceIds: ['palota-1'], resourceSnapshot: [palaceResource()] });
  if (activity === 'review') return normalizeHannaSettings({ activity, reviewIds: ['due-1'], reviewSnapshot: reviewSnapshot() });
  return normalizeHannaSettings({ activity, delayMs: 10000 });
}

function completeTraining(root, plan) {
  if (!plan.training) return;
  assert.ok(button(root,'Betanító próba indítása'),'reference is taught before the recall gate');
  button(root,'Betanító próba indítása').click();
  assert.equal(root.querySelectorAll('.hanna-room').length,0,'training questions hide the route and its correct target');
  for (const trial of plan.training.trials) {
    const choice = trial.choices.find((entry) => entry.value === trial.expected);
    const target = button(root, choice.label);
    assert.ok(target, `${plan.activity}: training choice ${choice.label}`);
    advance(10); target.click();
  }
  assert.ok(button(root, 'Tovább a kódoláshoz'), `${plan.activity}: training gate opens`);
  button(root, 'Tovább a kódoláshoz').click();
}
function completeEncoding(root, plan) {
  for (let index = 0; index < plan.encodingSteps.length; index++) {
    if (plan.encodingSteps[index].id === 'association-warmup') advance(30000);
    if (plan.activity === 'boss') {
      const select = root.querySelector('[data-strategy]'); select.value = 'láncsztori'; select.dispatchEvent({ type: 'change' });
    }
    const label = index === plan.encodingSteps.length - 1 ? 'Kódolás kész' : 'Következő kapcsolat';
    const next = button(root, label);
    assert.ok(next, `${plan.activity}: encoding step ${index + 1}`); advance(5); next.click();
  }
}
function skipRecallUntil(root, phase) {
  let guard = 0;
  while (root.children[0]?.dataset?.phase === phase && button(root, 'Kihagyom')) {
    button(root, 'Kihagyom').click();
    if (++guard > 100) throw new Error('Recall loop did not advance.');
  }
}

test('settings list all 15 activities and switch to constrained scalar shapes without invalid combinations', async () => {
  resetClock();
  const changes = [];
  const editor = createHannaSettings({ h, value: { activity: 'baseline' }, onChange: (value) => changes.push(value) });
  const activity = editor.element.querySelector('[data-setting="activity"]');
  assert.equal(activity.querySelectorAll('option').length, 15);
  activity.value = 'text'; activity.dispatchEvent({ type: 'change' });
  assert.equal(editor.getValue().activity, 'text'); assert.equal(editor.getValue().itemCount, 1);
  activity.value = 'numbers'; activity.dispatchEvent({ type: 'change' });
  assert.equal(editor.getValue().itemCount, 16);
  const count = editor.element.querySelector('[data-setting="itemCount"]');
  assert.deepEqual(count.querySelectorAll('option').map((option) => Number(option.value)), [16, 20, 30]);
  assert.ok(changes.length >= 2); editor.dispose();
});

test('all 15 activities mount and complete through training, encoding, active delay and recall exactly once', async () => {
  for (const activity of HANNA_ACTIVITIES.map((entry) => entry.id)) {
    resetClock(); document.hidden = false;
    const settings = settingsFor(activity); const plan = generateHannaSession(settings, 27);
    const root = new MiniNode('root'); const done = []; let prepares = 0;
    const cleanup = hannaGames['hanna-method'].mount({ root, h, settings, seed: 27, phase() {}, done: (...args) => done.push(args), async prepareHannaRecall() { prepares++; return { availableAt: null }; } });
    const start = button(root, plan.training ? 'Betanítás indítása' : 'Tanulás indítása');
    assert.ok(start, `${activity}: intro`); start.click();
    completeTraining(root, plan); completeEncoding(root, plan);
    skipRecallUntil(root, 'recall');
    if(activity==='text'){assert.ok(button(root,'Átnéztem, jöhet a köztes feladat'));button(root,'Átnéztem, jöhet a köztes feladat').click();}
    await flush();
    if (root.children[0]?.dataset?.phase === 'distractor') advance(10050);
    skipRecallUntil(root, 'recall');
    assert.equal(done.length, 1, `${activity}: one completion`);
    assert.equal(done[0][0], null);
    assert.equal(done[0][1].version, 1);
    assert.equal(done[0][1].responses.length, 0, 'explicit skips remain missing responses');
    assert.equal(prepares, 1, `${activity}: server recall gate called once`);
    assert.doesNotThrow(() => scoreHannaAttempt(settings, 27, done[0][1]), `${activity}: emitted answer validates in the real engine`);
    advance(20000); assert.equal(done.length, 1);
    cleanup(); cleanup(); assert.equal(root.children.length, 0);
  }
});

test('pause freezes the active delay, restart drops old state, and disposal cancels a late server gate', async () => {
  resetClock(); document.hidden = false;
  const settings = normalizeHannaSettings({ activity: 'association', itemCount: 3, delayMs: 10000 });
  const plan = generateHannaSession(settings, 8); const root = new MiniNode('root'); const done = [];
  let release; const gate = new Promise((resolve) => { release = resolve; });
  let cleanup = hannaGames['hanna-method'].mount({ root, h, settings, seed: 8, phase() {}, done: (...args) => done.push(args), prepareHannaRecall: () => gate });
  button(root, 'Tanulás indítása').click(); completeEncoding(root, plan);
  windowEvents.dispatch('blur'); release({ availableAt: null }); await flush(); advance(30000);
  assert.equal(done.length, 0); assert.ok(button(root, 'Folytatás'));
  button(root, 'Folytatás').click();
  advance(5000); assert.equal(root.children[0].dataset.phase, 'distractor');
  button(root, 'Újrakezdés').click(); assert.ok(button(root, 'Tanulás indítása')); assert.equal(done.length, 0);
  cleanup(); assert.equal(timers.size, 0);

  let lateRelease; const lateGate = new Promise((resolve) => { lateRelease = resolve; });
  cleanup = hannaGames['hanna-method'].mount({ root, h, settings, seed: 8, phase() {}, done: (...args) => done.push(args), prepareHannaRecall: () => lateGate });
  button(root, 'Tanulás indítása').click(); completeEncoding(root, plan); cleanup();
  lateRelease({ availableAt: null }); await flush(); advance(20000);
  assert.equal(root.children.length, 0); assert.equal(done.length, 0); assert.equal(timers.size, 0);
});

test('three hints and solution reveal stay separate from a correct response and never become independent credit', async () => {
  resetClock();
  const settings = normalizeHannaSettings({ activity: 'association', itemCount: 3, delayMs: 10000 });
  const plan = generateHannaSession(settings, 41); const root = new MiniNode('root'); const done = [];
  const cleanup = hannaGames['hanna-method'].mount({ root, h, settings, seed: 41, phase() {}, done: (...args) => done.push(args), async prepareHannaRecall() { return null; } });
  button(root, 'Tanulás indítása').click(); completeEncoding(root, plan); await flush(); advance(10050);
  button(root, '1. támpont').click(); button(root, '2. támpont').click(); button(root, '3. támpont').click(); button(root, 'Megoldás mutatása').click();
  withClass(root, 'hanna-choice').find((choice) => choice.textContent.endsWith(plan.recallTrials[0].expected)).click();
  for (const trial of plan.recallTrials.slice(1)) withClass(root, 'hanna-choice').find((choice) => choice.textContent.endsWith(trial.expected)).click();
  assert.equal(done.length, 1); assert.equal(done[0][1].responses[0].hintLevel, 4);
  const result = scoreHannaAttempt(settings, 41, done[0][1]);
  assert.equal(result.correct, 3); assert.equal(result.metrics.independentCorrect, 2); assert.equal(result.metrics.assistedCorrect, 1);
  assert.ok(result.metrics.qualityFlags.includes('solution-viewed')); cleanup();
});

test('workspace uses exact API shapes, hides an unready route, and passes the server resource unchanged to teacher preview', async () => {
  resetClock();
  const major = { id: 'major-1', kind: 'major', title: 'Saját kódképek', revision: 4, ready: true, data: { entries: [{ code: '00', label: 'szósz' }] }, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z' };
  const palace = palaceResource('palota-rejtett', false); const calls = []; const starts = [];
  const school = { user: { id: 'teacher-1', role: 'teacher' }, async api(path, options = {}) { calls.push([path, options]); if (path === '/api/hanna/resources') return { resources: [major, palace] }; throw new Error(`Unexpected API: ${path}`); } };
  const workspace = createHannaWorkspace({ h, school, onStart: (settings) => starts.push(settings) }); await flush();
  button(workspace.element, 'Saját előnézet').click();
  assert.equal(starts.length, 1); assert.equal(starts[0].resourceIds[0], major.id); assert.strictEqual(starts[0].resourceSnapshot[0], major, 'the server object is not reserialized or normalized by the workspace');
  assert.ok(button(workspace.element, 'Teszt után használható').disabled);
  button(workspace.element, 'Útvonalteszt').click();
  assert.doesNotMatch(workspace.element.textContent, /Hely 1/, 'route names stay hidden during recall');
  assert.match(workspace.element.textContent, /Rejtett útvonal ellenőrzése/);
  assert.deepEqual(calls[0], ['/api/hanna/resources', { method: 'GET' }]);
  workspace.dispose();
});

test('resource editor PATCHes the optimistic revision and reuses the created identity on later saves', async () => {
  resetClock();
  let serverResource = {
    id: 'material-1', kind: 'material', title: 'Történelem', revision: 2, ready: true,
    data: { items: [{ id: 'ev-1', label: 'Honfoglalás', meaning: 'A magyar törzsek Kárpát-medencei megtelepedése.' }] },
    createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z',
  };
  const writes = [];
  const school = { user: { id: 'student-1', role: 'student' }, async api(path, options = {}) {
    if (path === '/api/hanna/resources' && options.method === 'GET') return { resources: [serverResource] };
    if (path === '/api/hanna/resources/material-1' && options.method === 'PATCH') {
      writes.push(options.body);
      serverResource = { ...serverResource, title: options.body.title, data: options.body.data, revision: serverResource.revision + 1 };
      return { resource: serverResource };
    }
    throw new Error(`Unexpected API: ${path}`);
  } };
  const workspace = createHannaWorkspace({ h, school }); await flush();
  button(workspace.element, 'Szerkesztés').click();
  const title = workspace.element.querySelector('.hanna-resource-meta input'); title.value = 'Magyar történelem'; title.dispatchEvent({ type: 'input' });
  button(workspace.element, 'Módosítások mentése').click(); await flush();
  assert.equal(writes[0].revision, 2); assert.equal(writes[0].title, 'Magyar történelem');
  title.value = 'Magyar történelem II.'; title.dispatchEvent({ type: 'input' });
  button(workspace.element, 'Módosítások mentése').click(); await flush();
  assert.equal(writes[1].revision, 3, 'the returned revision becomes the next optimistic-lock revision');
  assert.deepEqual(Object.keys(writes[1]).sort(), ['data', 'revision', 'title']);
  workspace.dispose();
});

test('hub keeps API failure distinct from honest empty progress and teacher preview never invents student data', async () => {
  resetClock();
  const failed = createHannaHub({ h, school: { user: { id: 'student-1', role: 'student' }, async api() { throw new Error('Hálózati próbahiba'); } }, onStart() {} });
  button(failed.element, 'Napi tréning').click(); await flush();
  assert.match(failed.element.textContent, /Ez nem üres eredményállapot/); assert.match(failed.element.textContent, /Hálózati próbahiba/); failed.dispose();

  const calls = [];
  const teacher = createHannaHub({ h, school: { user: { id: 'teacher-1', role: 'teacher' }, async api(path) {
    calls.push(path);
    if (path === '/api/teacher/students') return { students: [] };
    if (path === '/api/hanna/resources') return { resources: [] };
    return { resources: [], due: [], dueCount: 0, results: [], milestones: [], dailyPlan: [], serverNow: '2026-09-11T10:00:00.000Z' };
  } }, onStart() {} });
  button(teacher.element, 'Tanulói fejlődés').click(); await flush();
  assert.match(teacher.element.textContent, /Nincs kiválasztott tanuló/);
  assert.match(teacher.element.textContent, /Tanári saját próbakör nem jelenik meg/);
  assert.ok(calls.includes('/api/teacher/students')); teacher.dispose();
});

test('result detail shows observed answers and practical feedback without an arbitrary cross-unit radar', () => {
  const view = renderHannaResult(h, {
    percent: 50, summary: '1/2 felidézési egység helyes.', details: [
      { label: '2. hely', actual: 'alma', expected: 'kulcs', correct: false, feedback: 'A hely és a tárgy kapcsolata maradt ki; járd be újra ezt a pontot.' },
    ], metrics: { technique: 'Loci módszer', independentCorrect: 1, assistedCorrect: 0, medianCorrectRtMs: 1200, encodingDurationMs: 30000, retentionMs: 10000, orderAccuracy: 50, adaptation: { reason: 'A következő körben maradjon ugyanennyi hely.' } },
  });
  assert.match(view.textContent, /Válaszod: alma · Cél: kulcs/);
  assert.match(view.textContent, /járd be újra ezt a pontot/);
  assert.doesNotMatch(view.textContent, /radar|IQ|csillag/i);
});


test('baseline asks for hidden-item typed recall and hints preserve the current draft',()=>{
  resetClock();const settings=normalizeHannaSettings({activity:'baseline',itemCount:3}),plan=generateHannaSession(settings,29),root=new MiniNode('root');
  const cleanup=hannaGames['hanna-method'].mount({root,h,settings,seed:29,phase(){},done(){}});
  button(root,'Tanulás indítása').click();completeEncoding(root,plan);
  assert.equal(withClass(root,'hanna-order-pool').length,0);
  const inputs=withClass(root,'hanna-baseline-inputs')[0].querySelectorAll('input');assert.equal(inputs.length,3);
  for(const word of plan.recallTrials[0].expected)assert.equal(!!button(root,word),false);
  inputs[0].value='saját válasz';button(root,'1. támpont').click();
  assert.equal(withClass(root,'hanna-baseline-inputs')[0].querySelectorAll('input')[0].value,'saját válasz');cleanup();
});

test('failed training teaches the correct pair and returns to reference before retry',()=>{
  resetClock();const settings=normalizeHannaSettings({activity:'peg',itemCount:5}),plan=generateHannaSession(settings,7),root=new MiniNode('root');
  const cleanup=hannaGames['hanna-method'].mount({root,h,settings,seed:7,phase(){},done(){}});
  button(root,'Betanítás indítása').click();button(root,'Betanító próba indítása').click();
  const first=plan.training.trials[0],wrong=first.choices.find(c=>c.value!==first.expected),right=first.choices.find(c=>c.value===first.expected);
  button(root,wrong.label).click();assert.ok(root.textContent.includes(right.label));assert.ok(button(root,'Értem, tovább'));button(root,'Értem, tovább').click();
  for(const [index,trial] of plan.training.trials.slice(1).entries()){advance(10);button(root,trial.choices.find(c=>index===0?c.value!==trial.expected:c.value===trial.expected).label).click();if(index===0)button(root,'Értem, tovább').click();}
  button(root,'Betanítás újra').click();assert.ok(button(root,'Betanító próba indítása'));assert.ok(root.textContent.includes('Tanuld meg'));cleanup();
});

test('pause blocks hint and encoding actions, preserves associations and records restarts',async()=>{
  resetClock();const settings=normalizeHannaSettings({activity:'chain',itemCount:5,delayMs:10000});const plan=generateHannaSession(settings,21),root=new MiniNode('root'),done=[];
  const cleanup=hannaGames['hanna-method'].mount({root,h,settings,seed:21,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(){return null;}});
  button(root,'Tanulás indítása').click();root.querySelector('textarea').value='Egy óriási alma gurul a horgon.';root.querySelector('.hanna-technique-check input').checked=true;
  button(root,'Következő kapcsolat').click();button(root,'Előző').click();assert.equal(root.querySelector('textarea').value,'Egy óriási alma gurul a horgon.');assert.equal(root.querySelector('.hanna-technique-check input').checked,true);
  const next=button(root,'Következő kapcsolat');button(root,'Szünet').click();next.click();assert.ok(button(root,'Folytatás'));button(root,'Folytatás').click();assert.equal(root.querySelector('textarea').value,'Egy óriási alma gurul a horgon.');
  button(root,'Újrakezdés').click();button(root,'Tanulás indítása').click();completeEncoding(root,plan);await flush();advance(10100);
  const hint=button(root,'1. támpont'),reveal=button(root,'Megoldás mutatása');button(root,'Szünet').click();hint.click();reveal.click();assert.ok(button(root,'Folytatás'));assert.equal(withClass(root,'hanna-answer-reveal').length,0);button(root,'Folytatás').click();skipRecallUntil(root,'recall');
  assert.equal(done.length,1);assert.ok(done[0][1].events.some(event=>event.type==='restart'));assert.ok(scoreHannaAttempt(settings,21,done[0][1]).metrics.qualityFlags.includes('restarted'));cleanup();
});

test('ordered pools have independent seeded permutations rather than cyclic answer order',async()=>{
  const {shuffleHannaChoices}=await import('../dist/hanna/ui.js');const source=Array.from({length:10},(_,i)=>i);let cyclic=0;
  for(let seed=1;seed<=200;seed++){const out=shuffleHannaChoices(source,seed);assert.deepEqual([...out].sort((a,b)=>a-b),source);if(out.slice(1).every((n,i)=>(n-out[i]+10)%10===1)||out.slice(1).every((n,i)=>(n-out[i]+10)%10===9))cyclic++;assert.deepEqual(out,shuffleHannaChoices(source,seed));}
  assert.equal(cyclic,0);
});

test('mobile digit entry emits a short numeric response that receives partial credit',async()=>{
 resetClock();const settings=normalizeHannaSettings({activity:'numbers',itemCount:16,delayMs:10000}),plan=generateHannaSession(settings,51),root=new MiniNode('root'),done=[];
 const cleanup=hannaGames['hanna-method'].mount({root,h,settings,seed:51,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(){return null;}});
 button(root,'Tanulás indítása').click();completeEncoding(root,plan);await flush();advance(10100);
 const input=withClass(root,'hanna-free-answer')[0].querySelector('input');assert.ok(input,'numeric input replaces textarea');assert.equal(input.getAttribute('inputmode'),'numeric');input.value=String(plan.recallTrials[0].expected).slice(0,14);button(root,'Válasz rögzítése').click();
 assert.equal(done.length,1);const result=scoreHannaAttempt(settings,51,done[0][1]);assert.equal(result.correct,14);assert.equal(result.total,16);cleanup();
});

test('hidden typed baseline accepts blanks and mistaken words as scored answers',async()=>{
 resetClock();const settings=normalizeHannaSettings({activity:'baseline',itemCount:3,delayMs:10000}),plan=generateHannaSession(settings,54),root=new MiniNode('root'),done=[];let checkpoint;
 const cleanup=hannaGames['hanna-method'].mount({root,h,settings,seed:54,phase(){},done:(...args)=>done.push(args),async prepareHannaRecall(answer){checkpoint=scoreHannaAttempt(settings,54,answer);return null;}});
 button(root,'Tanulás indítása').click();completeEncoding(root,plan);
 const fill=(trials)=>{for(const trial of trials){const fields=withClass(root,'hanna-baseline-inputs')[0].querySelectorAll('input');fields[0].value=trial.expected[0];fields[1].value='téves emlék';fields[2].value='';button(root,'Felidézés rögzítése').click();}};
 fill(plan.recallTrials.filter(t=>t.phase==='immediate'));await flush();assert.ok(checkpoint);advance(10100);fill(plan.recallTrials.filter(t=>t.phase!=='immediate'));
 const score=scoreHannaAttempt(settings,54,done[0][1]);assert.equal(score.correct,6);assert.equal(score.total,18);cleanup();
});

test('invalid resource settings revert visibly and deselecting material restores built-in content',async()=>{
 resetClock();const material={id:'material-settings',kind:'material',title:'Öt tárgy',revision:1,ready:true,data:{items:['alma','körte','hajó','kulcs','ház'].map((label,i)=>({id:'i'+i,label}))}};
 const school={user:{id:'s',role:'student'},async api(){return{resources:[material]};}},editor=createHannaSettings({h,school,value:{activity:'chain',itemCount:5}});await flush();
 let resource=editor.element.querySelector('[data-setting="resourceIds"]');resource.value=material.id;resource.dispatchEvent({type:'change'});assert.equal(editor.getValue().contentLevel,'material');
 const count=editor.element.querySelector('[data-setting="itemCount"]');count.value=10;count.dispatchEvent({type:'change'});assert.equal(editor.element.querySelector('[data-setting="itemCount"]').value,5);assert.equal(editor.getValue().itemCount,5);assert.ok(editor.element.querySelector('[data-hanna-validation="true"]').textContent);
 resource=editor.element.querySelector('[data-setting="resourceIds"]');resource.value='';resource.dispatchEvent({type:'change'});assert.equal(editor.getValue().contentLevel,'concrete');assert.equal(editor.getValue().resourceIds.length,0);generateHannaSession(editor.getValue(),5);editor.dispose();
});


test('order cards support local drag, reorder, return, pause guard and tap fallback', async()=>{
  resetClock(); document.hidden=false;
  const settings=normalizeHannaSettings({activity:'chain',itemCount:5,adaptive:false}),plan=generateHannaSession(settings,73),root=new MiniNode('root');let saved;
  const cleanup=hannaGames['hanna-method'].mount({root,h,settings,seed:73,phase(){},done:(_score,answer)=>{saved=answer;},async prepareHannaRecall(){return {availableAt:null};}});
  button(root,'Tanulás indítása').click();completeEncoding(root,plan);await flush();advance(10050);
  const start=(node)=>node.dispatchEvent({type:'dragstart',dataTransfer:{setData(){}}});
  const drop=(node)=>node.dispatchEvent({type:'drop'});
  const pool=()=>root.querySelector('.hanna-order-pool'),selected=()=>root.querySelector('.hanna-order-selected');
  let first=pool().querySelectorAll('button')[0];const firstLabel=first.textContent;start(first);drop(selected());assert.ok(selected().textContent.includes(firstLabel));
  let second=pool().querySelectorAll('button')[0];const secondLabel=second.textContent;start(second);drop(selected().querySelector('button'));assert.ok(selected().querySelectorAll('button')[0].textContent.includes(secondLabel));
  start(selected().querySelectorAll('button')[0]);drop(pool());assert.equal(selected().querySelectorAll('button').length,1);
  start(pool().querySelectorAll('button')[0]);const staleTarget=selected();button(root,'Szünet').click();drop(staleTarget);button(root,'Folytatás').click();assert.equal(selected().querySelectorAll('button').length,1);
  for(const choice of [...selected().querySelectorAll('button')])choice.click();
  for(const value of plan.recallTrials[0].expected){const choice=pool().querySelectorAll('button').find(node=>node.textContent===value);assert.ok(choice);choice.click();}
  button(root,'Sorrend rögzítése').click();assert.ok(saved);assert.equal(scoreHannaAttempt(settings,73,saved).percent,100);cleanup();
});
