import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

class MiniNode {
  constructor(tagName,ownText=''){this.tagName=String(tagName).toUpperCase();this.children=[];this.parentNode=null;this.parentElement=null;this.listeners=new Map();this.attributes={};this.dataset={};this.className='';this.value='';this.name='';this.type='';this.checked=false;this.disabled=false;this.hidden=false;this.readOnly=false;this.ownText=ownText;this.style={setProperty:(key,value)=>{this.style[key]=value;}};this.classList={add:(...names)=>this.setClasses(names,true),remove:(...names)=>this.setClasses(names,false),toggle:(name,on)=>this.setClasses([name],on===undefined?!this.className.split(/\s+/).includes(name):on)};}
  setClasses(names,on){const set=new Set(this.className.split(/\s+/).filter(Boolean));names.forEach(name=>on?set.add(name):set.delete(name));this.className=[...set].join(' ');}
  append(...nodes){for(const node of nodes){this.children.push(node);if(node&&typeof node==='object'){node.parentNode=this;node.parentElement=this;}}}
  replaceChildren(...nodes){this.children=[];this.ownText='';this.append(...nodes);}
  replaceWith(node){const parent=this.parentNode;if(!parent)return;const index=parent.children.indexOf(this);if(index>=0){parent.children.splice(index,1,node);node.parentNode=parent;node.parentElement=parent;}}
  remove(){const parent=this.parentNode;if(!parent)return;parent.children=parent.children.filter(child=>child!==this);}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='class')this.className=String(value);if(key==='name')this.name=String(value);if(key==='type')this.type=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=String(value);}
  getAttribute(key){return key==='class'?this.className:this.attributes[key]??null;}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==listener));}
  dispatchEvent(event){event.target??=this;event.currentTarget=this;for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
  click(){if(!this.disabled)this.dispatchEvent({type:'click',preventDefault(){}});}
  focus(){}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent({type:'close'});}
  querySelector(selector){return all(this,node=>matches(node,selector))[0]||null;}
  querySelectorAll(selector){return all(this,node=>matches(node,selector));}
  get textContent(){return this.ownText+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this.ownText=String(value);this.children=[];}
}
function all(root,predicate){const found=[];const visit=node=>{if(predicate(node))found.push(node);for(const child of node.children||[])visit(child);};visit(root);return found;}
function matches(node,selector){if(selector.startsWith('.'))return node.className.split(/\s+/).includes(selector.slice(1));const name=selector.match(/^\[name=['"]?([^'"\]]+)['"]?\]$/);if(name)return node.name===name[1];const data=selector.match(/^\[data-([\w-]+)\]$/);if(data)return node.dataset[data[1].replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]!==undefined;return node.tagName===selector.toUpperCase();}
function button(root,label){return all(root,node=>node.tagName==='BUTTON'&&node.textContent===label)[0];}
async function flush(){await Promise.resolve();await Promise.resolve();await new Promise(resolve=>setImmediate(resolve));}

class EventHub{constructor(){this.listeners=new Map();this.hidden=false;}addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==listener));}}
const documentHub=new EventHub();
globalThis.Node=MiniNode;
globalThis.document=Object.assign(documentHub,{body:new MiniNode('body'),head:new MiniNode('head'),querySelector:()=>null,createElement:tag=>new MiniNode(tag),createElementNS:(_ns,tag)=>new MiniNode(tag),createTextNode:text=>new MiniNode('#text',String(text))});
globalThis.IntersectionObserver=class {observe(){} disconnect(){}};
globalThis.innerWidth=390;
globalThis.matchMedia=()=>({matches:true});
Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>100}});

const {h}=await import('../dist/core.js');
const {cognitiveGames,createActiveRecallBuilder,renderCognitiveHub}=await import('../dist/cognitive/ui.js');
const {groupComparableResults,createCognitiveProfile,createSchoolCognitiveProfile}=await import('../dist/cognitive/profile.js');

test('profile keeps practice and assessment separate and only joins identical comparability keys',()=>{
  const result=(id,mode,key,value,qualityFlags=[])=>({id,gameId:'spatial-span',at:`2026-09-${10+id}T08:00:00Z`,metrics:{familyId:'spatial-span',mode,comparabilityKey:key,comparable:qualityFlags.length===0,qualityFlags,primaryMetric:{name:'forwardSpanScore',value,unit:'items'}}});
  const grouped=groupComparableResults([result(1,'assessment','a',3),result(2,'assessment','a',4),result(3,'assessment','b',5),result(4,'practice','a',6),result(5,'assessment','a',6,['paused'])]);
  assert.equal(grouped.assessment[0].series.length,3);
  assert.deepEqual(grouped.assessment[0].series.map(series=>series.points.length),[2,1,1]);
  assert.equal(grouped.practice[0].series[0].points.length,1);
});

test('profile renders finished empty and one-point states with actual metric units',async()=>{
  let view=createCognitiveProfile({h,loadResults:async()=>({results:[]})});await view.ready;
  assert.match(view.element.textContent,/Még nincs rögzített próbák adat/);
  view=createCognitiveProfile({h,loadResults:async()=>({results:[{id:'x',gameId:'recognition',at:'2026-09-11T08:00:00Z',metrics:{familyId:'recognition',mode:'assessment',comparabilityKey:'same',comparable:true,qualityFlags:[],primaryMetric:{name:'balancedAccuracy',value:75,unit:'percent'}}}]})});await view.ready;
  assert.match(view.element.textContent,/75 %/);
  assert.match(view.element.textContent,/első összehasonlítható pont/);
  assert.equal(all(view.element,node=>node.tagName==='POLYLINE').length,0,'one point must not imply a trend line');
});

test('active recall builder collects 1–20 private answer items and fixes the later round separately',()=>{
  const builder=createActiveRecallBuilder({h});
  builder.element.querySelector('[name=prompt]').value='Mi a főváros?';
  builder.element.querySelector('[name=studyText]').value='Budapest Magyarország fővárosa.';
  builder.element.querySelector('[name=acceptedAnswers]').value='Budapest | budapest';
  const value=builder.getValue();
  assert.equal(value.items.length,1);assert.deepEqual(value.items[0].acceptedAnswers,['Budapest','budapest']);assert.equal(value.mode,'assessment');assert.equal(value.reviewDelayMinutes,1440);
  for(let index=1;index<20;index++)button(builder.element,'+ Kérdés').click();
  assert.equal(all(builder.element,node=>node.className.split(/\s+/).includes('recall-item')).length,20);assert.equal(button(builder.element,'+ Kérdés').disabled,true);
  builder.clearPrivate();assert.equal(builder.element.querySelector('[name=acceptedAnswers]').value,'');
});

test('mounted active recall records one raw response for a double click and permits an honest empty answer',async()=>{
  const mount=async({empty=false}={})=>{const root=new MiniNode('root'),done=[];const cleanup=cognitiveGames['active-recall'].mount({root,h,seed:7,settings:{mode:'assessment',inputModality:'keyboard',questions:[{questionId:'q1',question:'Mi a főváros?',learningExplanation:'Olvasd el: Budapest.'}],reviewRound:'initial',reviewDelayMinutes:60},phase(){},done:(_local,raw)=>done.push(raw)});await flush();button(root,'Elolvastam').click();await flush();const input=root.querySelector('textarea');input.value=empty?'':'Budapest';const submit=button(root,empty?'Nem tudom':'Válasz rögzítése');submit.click();submit.click();await flush();cleanup();return done[0];};
  const answered=await mount();assert.equal(answered.events.filter(event=>event.type==='response').length,1);assert.equal(answered.events.find(event=>event.type==='response').value,'Budapest');assert.equal(answered.device.pointer,'coarse');assert.equal(answered.device.viewportBucket,'small');
  const empty=await mount({empty:true});assert.equal(empty.events.filter(event=>event.type==='response').length,1);assert.equal(empty.events.find(event=>event.type==='response').value,null);
});

test('a kézi szünetet a háttérből visszatérés nem oldja fel',async()=>{
  const root=new MiniNode('root');
  const cleanup=cognitiveGames['active-recall'].mount({root,h,seed:7,settings:{mode:'assessment',inputModality:'keyboard',questions:[{questionId:'q1',question:'Mi a főváros?',learningExplanation:'Olvasd el: Budapest.'}],reviewRound:'initial',reviewDelayMinutes:60},phase(){},done(){}});
  await flush();button(root,'Szünet').click();assert.equal(button(root,'Folytatom').textContent,'Folytatom');assert.equal(root.querySelector('.cognitive-task').inert,true);
  documentHub.hidden=true;for(const listener of documentHub.listeners.get('visibilitychange')||[])listener();
  documentHub.hidden=false;for(const listener of documentHub.listeners.get('visibilitychange')||[])listener();
  assert.equal(button(root,'Folytatom').textContent,'Folytatom');assert.equal(root.querySelector('.cognitive-task').inert,true);
  cleanup();
});

test('taxonomy mounts the trusted N-back link, source limitation and educational cortical atlas',async()=>{
  const hub=renderCognitiveHub({h});await hub.ready;
  assert.match(hub.element.textContent,/N-back Műhely/);
  assert.match(hub.element.textContent,/Nem aktivitáserősséget, és nem a te agyad mérését mutatják\./);
  assert.match(document.body.textContent,/nem személyes normák/i);
  hub.dispose();
  assert.match(hub.element.textContent,/20 484 csúcsponttal/);
  const brain=await readFile(new URL('../dist/cognitive/brain-explorer.js',import.meta.url),'utf8');
  assert.match(brain,/prefers-reduced-motion: reduce/);
  assert.match(brain,/renderer\.dispose\(\)/);
});


test('the brain selector and task cards agree in both directions',async()=>{
  const hub=renderCognitiveHub({h});await hub.ready;
  const select=hub.element.querySelector('.bx-task-choice').querySelector('select');
  const cards=hub.element.querySelector('.taxonomy-grid').children;
  select.value='nback';select.dispatchEvent({type:'change'});
  assert.equal(cards[6].querySelector('button').getAttribute('aria-pressed'),'true');
  assert.equal(cards[0].querySelector('button').getAttribute('aria-pressed'),'false');
  cards[2].querySelector('button').click();
  assert.equal(select.value,'picture-place');
  assert.equal(cards[2].querySelector('button').getAttribute('aria-pressed'),'true');
  assert.equal(cards[6].querySelector('button').getAttribute('aria-pressed'),'false');
  hub.dispose();
});

test('digit audio restart cannot paint a cancelled round over the new playback prompt',async()=>{
  const previousAudio=globalThis.Audio, clips=[];
  globalThis.Audio=class {
    constructor(){this.listeners=new Map();clips.push(this);}
    load(){} addEventListener(type,cb){this.listeners.set(type,cb);} removeEventListener(type,cb){if(this.listeners.get(type)===cb)this.listeners.delete(type);}
    play(){this.playing=true;return Promise.resolve();} pause(){this.playing=false;}
  };
  const {normalizeCognitiveSettings}=await import('../dist/cognitive/engine.js');
  const root=new MiniNode('root');let cleanup;
  try{
    cleanup=cognitiveGames['digit-span'].mount({root,h,seed:7,settings:normalizeCognitiveSettings('digit-span',{mode:'practice',minLength:2,maxLength:2}),phase(){},done(){}});
    button(root,'Számsor lejátszása').click();await flush();
    const active=clips.find(x=>x.playing);assert.ok(active);
    const lateEnd=active.listeners.get('ended');
    button(root,'Feladat újraindítása').click();await flush();lateEnd();await flush();
    assert.equal(active.playing,false);
    assert.ok(button(root,'Számsor lejátszása'));
    assert.equal(button(root,'Válasz rögzítése'),undefined);
    assert.equal(root.querySelector('.input-error'),null);
    button(root,'Számsor lejátszása').click();await flush();
    button(root,'Szünet').click();await flush();
    assert.ok(clips.every(x=>!x.playing));
    assert.equal(root.querySelector('.cognitive-task').inert,true);
    button(root,'Folytatom').click();await flush();
    assert.equal(button(root,'Számsor lejátszása').disabled,false);
    assert.equal(button(root,'Válasz rögzítése'),undefined);
  }finally{cleanup?.();globalThis.Audio=previousAudio;}
});


const profileStudents=[{id:'student-a',username:'anna',displayName:'Anna',active:true},{id:'student-b',username:'bence',displayName:'Bence',active:true}];
const profileResult=(studentId,value)=>({id:studentId,studentId,gameId:'recognition',at:'2026-09-11T08:00:00Z',metrics:{familyId:'recognition',mode:'assessment',comparabilityKey:'same',comparable:true,qualityFlags:[],primaryMetric:{name:'balancedAccuracy',value,unit:'percent'}}});

test('teacher profile uses teacher APIs and only loads the selected student',async()=>{
  const calls=[];
  const view=createSchoolCognitiveProfile({h,school:{supported:true,user:{role:'teacher'},api:async path=>{calls.push(path);if(path==='/api/teacher/students')return {students:profileStudents};return {results:[profileResult('student-a',71),profileResult('student-b',92)]};}}});
  await view.ready;
  assert.deepEqual(calls,['/api/teacher/students']);
  const select=view.element.querySelector('select');
  select.value='student-a';select.dispatchEvent({type:'change'});await view.ready;
  assert.deepEqual(calls,['/api/teacher/students','/api/teacher/results?studentId=student-a']);
  assert.match(view.element.querySelector('.profile-content').textContent,/Anna memóriaprofilja/);
  assert.match(view.element.textContent,/71 %/);assert.doesNotMatch(view.element.textContent,/92 %/);
  select.value='not-in-owned-list';select.dispatchEvent({type:'change'});await view.ready;
  assert.equal(calls.length,2);assert.doesNotMatch(view.element.textContent,/71 %/);
  view.dispose();
});

test('student profile keeps using own results without a teacher request',async()=>{
  const calls=[];const view=createSchoolCognitiveProfile({h,school:{supported:true,user:{role:'student'},api:async path=>{calls.push(path);return {results:[profileResult('student-a',71)]};}}});
  await view.ready;assert.deepEqual(calls,['/api/results']);assert.equal(view.element.querySelector('select'),null);assert.match(view.element.textContent,/71 %/);view.dispose();
});

test('switching students and leaving profile discard stale result responses',async()=>{
  const pending=new Map();const view=createCognitiveProfile({h,teacher:true,loadStudents:async()=>({students:profileStudents}),loadResults:id=>new Promise(resolve=>pending.set(id,resolve))});
  await view.ready;const select=view.element.querySelector('select');
  select.value='student-a';select.dispatchEvent({type:'change'});
  select.value='student-b';select.dispatchEvent({type:'change'});
  pending.get('student-b')({results:[profileResult('student-b',92)]});await view.ready;
  pending.get('student-a')({results:[profileResult('student-a',71)]});await flush();
  assert.match(view.element.querySelector('.profile-content').textContent,/Bence memóriaprofilja/);assert.doesNotMatch(view.element.textContent,/71 %/);
  select.value='student-a';select.dispatchEvent({type:'change'});view.dispose();
  pending.get('student-a')({results:[profileResult('student-a',71)]});await view.ready;
  assert.doesNotMatch(view.element.textContent,/71 %/);
});

test('teacher without students gets an actionable empty state and can retry list errors',async()=>{
  let attempts=0;const view=createCognitiveProfile({h,teacher:true,loadStudents:async()=>{if(++attempts===1)throw new Error('Próba hálózati hiba');return {students:[]};},loadResults:()=>assert.fail('No student result request without a student')});
  await view.ready;assert.match(view.element.textContent,/Próba hálózati hiba/);button(view.element,'Újrapróbálom').click();await view.ready;
  assert.match(view.element.textContent,/Még nincs tanulód/);assert.match(view.element.textContent,/Tanulók kezelése/);assert.equal(view.element.querySelector('select').disabled,true);view.dispose();
});
