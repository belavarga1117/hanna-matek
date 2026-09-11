import test from 'node:test';
import assert from 'node:assert/strict';

class MiniNode{
  constructor(tagName,text='',namespaceURI='http://www.w3.org/1999/xhtml'){this.tagName=String(tagName).toUpperCase();this.namespaceURI=namespaceURI;this.children=[];this.parentNode=null;this.attributes={};this.listeners=new Map();this.className='';this.value='';this.selected=false;this.ownText=text;this.style={setProperty:(key,value)=>{this.style[key]=value;}};}
  append(...nodes){for(const node of nodes){this.children.push(node);if(node&&typeof node==='object')node.parentNode=this;}}
  replaceChildren(...nodes){this.children=[];this.ownText='';this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}
  getAttribute(key){return this.attributes[key]??null;}
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);}
  dispatchEvent(event){event.target??=this;for(const listener of this.listeners.get(event.type)||[])listener(event);return true;}
  get textContent(){return this.ownText+this.children.map((node)=>node.textContent).join('');}
  set textContent(value){this.ownText=String(value);this.children=[];}
}

globalThis.Node=MiniNode;
globalThis.document={createElement:(tag)=>new MiniNode(tag),createElementNS:(namespace,tag)=>new MiniNode(tag,'',namespace),createTextNode:(text)=>new MiniNode('#text',String(text))};

function h(tag,props={},...children){
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(props||{})){if(value===null||value===undefined||value===false)continue;if(key==='className')node.className=value;else if(key==='style'&&typeof value==='object')Object.assign(node.style,value);else if(/^on[A-Z]/.test(key))node.addEventListener(key.slice(2).toLowerCase(),value);else if(['value','selected','disabled','hidden'].includes(key))node[key]=value;else node.setAttribute(key,value===true?'':String(value));}
  for(const child of children.flat(Infinity))if(child!==null&&child!==undefined&&child!==false)node.append(child instanceof Node?child:document.createTextNode(String(child)));
  return node;
}
function all(root,predicate){const found=[];const visit=(node)=>{if(predicate(node))found.push(node);for(const child of node.children||[])visit(child);};visit(root);return found;}
function byClass(root,className){return all(root,(node)=>node.className.split(/\s+/).includes(className));}
function tags(root,tag){return all(root,(node)=>node.tagName===tag.toUpperCase());}
function metric(root,label){return byClass(root,'hanna-progress__metric').find((node)=>node.children[0]?.textContent===label);}

const {formatHannaRetention,renderHannaProgress}=await import('../dist/hanna/progress.js');

function row({id='r1',at='2026-09-11T10:00:00.000Z',key='chain-normal-8-ordered',activity='chain',itemCount=8,recallMode='ordered',...metrics}={}){
  return {id,at,settings:{activity,itemCount,recallMode},percent:metrics.accuracy==null?null:Math.round(metrics.accuracy*100),metrics:{activity,comparabilityKey:key,accuracy:metrics.accuracy??null,orderAccuracy:metrics.orderAccuracy??null,encodingDurationMs:metrics.encodingDurationMs??null,medianCorrectRtMs:metrics.medianCorrectRtMs??null,independentCorrect:metrics.independentCorrect??null,assistedCorrect:metrics.assistedCorrect??null,retentionMs:metrics.retentionMs??null,subscales:metrics.subscales??{}}};
}

test('üres eredménylistán őszinte kezdőállapot és namespaced mobilstílus jelenik meg',()=>{
  const view=renderHannaProgress(h,[]);assert.equal(view.tagName,'SECTION');assert.match(view.textContent,/Még nincs összehasonlítható Hanna-köröd/);assert.equal(tags(view,'IFRAME').length,0);
  const style=tags(view,'STYLE')[0].textContent;assert.match(style,/\.hanna-progress/);assert.match(style,/@media\(max-width:340px\)/);assert.match(style,/min-height:52px/);
});

test('csak pontosan azonos comparabilityKey körök kerülnek ugyanabba az idősorba',()=>{
  const results=[
    row({id:'a1',at:'2026-09-01T10:00:00Z',key:'A',accuracy:.5,orderAccuracy:.4,encodingDurationMs:20_000,medianCorrectRtMs:1400,independentCorrect:4,assistedCorrect:1,retentionMs:10_000}),
    row({id:'a2',at:'2026-09-03T10:00:00Z',key:'A',accuracy:.7,orderAccuracy:.6,encodingDurationMs:18_000,medianCorrectRtMs:1200,independentCorrect:6,assistedCorrect:1,retentionMs:12_000}),
    row({id:'b1',at:'2026-09-04T10:00:00Z',key:'B',activity:'chain',itemCount:10,recallMode:'random',accuracy:.9,encodingDurationMs:15_000,medianCorrectRtMs:900,independentCorrect:8,assistedCorrect:1,retentionMs:15_000}),
  ];
  const view=renderHannaProgress(h,results),select=tags(view,'SELECT')[0],options=tags(select,'OPTION');assert.equal(options.length,2);assert.match(options[0].textContent,/10 elem · véletlen kérdezés/);assert.match(view.textContent,/Még kell egy második/);assert.equal(tags(view,'CIRCLE').length,1);
  select.value='A';select.dispatchEvent({type:'change'});assert.match(view.textContent,/20 százalékponttal magasabb/);assert.equal(tags(view,'CIRCLE').length,2);assert.equal(tags(view,'POLYLINE').length,1);assert.equal(byClass(view,'hanna-progress__table')[0].children[1].children.length,2);
});

test('az adaptív elemszámok aktivitásszinten látszanak, de nem kerülnek közös pontossággrafikonra',()=>{
  const view=renderHannaProgress(h,[row({id:'small',at:'2026-09-01T10:00:00Z',key:'chain-8',itemCount:8,accuracy:.8}),row({id:'large',at:'2026-09-02T10:00:00Z',key:'chain-10',itemCount:10,accuracy:.9})]);
  const summary=byClass(view,'hanna-progress__activity-summary')[0];assert.match(summary.textContent,/2 befejezett kör/);assert.match(summary.textContent,/8 → 10/);assert.match(summary.textContent,/nem vonjuk össze/);assert.equal(tags(view,'CIRCLE').length,1);assert.match(tags(view,'TITLE')[0].textContent,/10 elem/);
});

test('a grafikon SVG namespaced, valós dátumot és 0–100 százalékos skálát használ',()=>{
  const view=renderHannaProgress(h,[row({at:'2026-08-31T08:15:00Z',accuracy:.25}),row({id:'r2',at:'2026-09-11T09:45:00Z',accuracy:.75})]),svg=tags(view,'SVG')[0];
  assert.equal(svg.namespaceURI,'http://www.w3.org/2000/svg');assert.equal(svg.getAttribute('viewBox'),'0 0 640 190');assert.match(svg.getAttribute('aria-label'),/valós gyakorlási dátumokkal/);assert.match(svg.textContent,/0%50%100%/);assert.match(view.textContent,/2026/);
});

test('a null metrika nem változik hamis nullává',()=>{
  const view=renderHannaProgress(h,[row()]);
  for(const label of ['Pontosság','Sorrend','Medián válaszidő','Tényleges kódolási idő','Önálló arány','Megtartási idő'])assert.equal(metric(view,label).children[1].textContent,'—',label);
  assert.equal(tags(view,'CIRCLE').length,0);assert.match(metric(view,'Sorrend').textContent,/nincs sorrendmutató/);assert.match(metric(view,'Megtartási idő').textContent,/Nincs hitelesített adat/);
});

test('baseline a hat azonnali és késleltetett tényleges arányt külön mutatja',()=>{
  const subscales={wordImmediate:{accuracy:1},wordDelayed:{accuracy:.8},pictureImmediate:{accuracy:.6},pictureDelayed:{accuracy:.4},digitImmediate:{accuracy:.2},digitDelayed:{accuracy:null}};
  const view=renderHannaProgress(h,[row({activity:'baseline',key:'baseline-5',recallMode:'ordered',accuracy:.6,subscales})]),cards=byClass(view,'hanna-progress__subscale');assert.equal(cards.length,6);
  assert.deepEqual(cards.map((card)=>card.children[1].textContent),['100%','80%','60%','40%','20%','—']);assert.match(view.textContent,/A hat arány külön marad/);
});

test('a Szövegépítő első és második aktív felidézése külön arányként jelenik meg',()=>{
  const view=renderHannaProgress(h,[row({activity:'text',key:'text-a',recallMode:'meaning',accuracy:.5,subscales:{textImmediate:{accuracy:1},textDelayed:{accuracy:0}}})]),cards=byClass(view,'hanna-progress__subscale');assert.equal(cards.length,2);assert.deepEqual(cards.map((card)=>card.children[1].textContent),['100%','0%']);assert.match(view.textContent,/javítás utáni újrapróbálást külön/);
});

test('Számszörny a számjegy-, tempó- és önállósági mutatót saját egységében mutatja',()=>{
  const view=renderHannaProgress(h,[row({activity:'numbers',key:'numbers-16',itemCount:16,recallMode:'verbatim',accuracy:.75,independentCorrect:9,assistedCorrect:3,encodingDurationMs:30_000,medianCorrectRtMs:1100,subscales:{number:{digitsCorrect:12,digitsTotal:16,digitsPerMinute:24}}})]);
  assert.equal(metric(view,'Megjegyzett számjegy').children[1].textContent,'12 / 16');assert.match(metric(view,'Megjegyzett számjegy').textContent,/24 számjegy\/perc/);assert.equal(metric(view,'Önálló arány').children[1].textContent,'75%');assert.equal(metric(view,'Tényleges kódolási idő').children[1].textContent,'30,0 mp');
});

test('név-, asszociatív-, random- és hosszú távú csoportok a saját kapcsolódó mutatójukat kapják',()=>{
  const cases=[['faces','Névfelidézés'],['association','Kapcsolati felidézés'],['random','Közvetlen hozzáférés'],['review','Későbbi felidézés']];
  for(const [activity,label] of cases){const view=renderHannaProgress(h,[row({activity,key:`${activity}-key`,accuracy:.8,retentionMs:activity==='review'?86_400_000:null})]);assert.ok(metric(view,label),activity);}
});

test('hibás és össze nem hasonlítható rows kimaradnak, a bemeneti sorrend nem módosul',()=>{
  const results=[row({id:'late',at:'2026-09-11T10:00:00Z',accuracy:.8}),{id:'bad',at:'nem-dátum',settings:{},metrics:{comparabilityKey:'x'}},row({id:'early',at:'2026-09-01T10:00:00Z',accuracy:.6})],before=results.map((entry)=>entry.id),view=renderHannaProgress(h,results);
  assert.deepEqual(results.map((entry)=>entry.id),before);assert.equal(tags(view,'TR').length,3);assert.equal(tags(view,'CIRCLE').length,2);
});

test('a renderer h segédfüggvényt kér és nem indít hálózati vagy iframe felületet',()=>{
  assert.throws(()=>renderHannaProgress(null,[]),/h segédfüggvényt/);const view=renderHannaProgress(h,[row({accuracy:.5})]);assert.equal(tags(view,'IFRAME').length,0);assert.equal(tags(view,'SCRIPT').length,0);
});

test('a megosztott megtartásiformázó percet, órát és napot megfelelő egységben ad vissza',()=>{
  assert.equal(formatHannaRetention(null),'—');assert.equal(formatHannaRetention(600_000),'10 perc');assert.equal(formatHannaRetention(5_400_000),'1,5 óra');assert.equal(formatHannaRetention(604_800_000),'7 nap');
});
