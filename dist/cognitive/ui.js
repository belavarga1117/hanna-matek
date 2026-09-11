import {generateCognitiveAssessment, isCognitiveGame, normalizeCognitiveSettings} from './engine.js';
import {createDigitAudio} from './audio.js';

export const COGNITIVE_TAXONOMY = Object.freeze([
  {id:'spatial-span',title:'Térbeli sorrend',short:'Térösvény',icon:'⌁',family:'Téri munkamemória',measures:'Felvillanó helyek sorrendjének előre és visszafelé felidézése.',limit:'A rövid, érintéses változat saját kísérleti protokoll.',network:['front','parietal']},
  {id:'digit-span',title:'Hallott számsor',short:'Hanglánc',icon:'◌',family:'Verbális munkamemória',measures:'Hallott számjegyek sorrendjének előre és visszafelé felidézése.',limit:'A böngésző hangja és az eszköz befolyásolhatja az eredményt.',network:['front','temporal','parietal']},
  {id:'picture-place',title:'Kép–hely társítás',short:'Képtérkép',icon:'▦',family:'Társításos emlékezet',measures:'Képek és helyek kapcsolatának tanulása, azonnali és legalább 60 másodperces késleltetett felidézése.',limit:'Egy kör nem mutat általános memóriafejlődést.',network:['medial','temporal','front']},
  {id:'complex-span',title:'Közbeiktatott feladat',short:'Kettős ösvény',icon:'◇',family:'Komplex munkamemória',measures:'Helyek megőrzése közben végzett szimmetriadöntés.',limit:'A felidézés és a köztes döntések pontossága külön értelmezendő.',network:['front','parietal','cingulate']},
  {id:'recognition',title:'Képfelismerés',short:'Ismerős kép',icon:'◒',family:'Felismerési emlékezet',measures:'Korábban látott és új képek elkülönítése.',limit:'A találat és a téves felismerés együtt mutat értelmezhető képet.',network:['medial','temporal','front']},
  {id:'attention-nogo',title:'Jelzés és visszatartás',short:'Jelőr',icon:'✦',family:'Figyelmi kontroll',measures:'Jelzés gyakori ingernél, válasz visszatartása a csillagnál.',limit:'Figyelmi kontextus, nem ADHD-vizsgálat vagy diagnózis.',network:['front','cingulate','motor']},
  {id:'nback',title:'N-back Műhely',short:'N-back',icon:'N',family:'Sorozatkövetés',measures:'Az aktuális inger összevetése az N lépéssel korábbival.',limit:'A meglévő, megbízható N-back motor külön gyakorlásként és rögzített próbaként nyitható meg.',network:['front','parietal','cingulate']},
]);

export const COGNITIVE_META = Object.freeze({
  ...Object.fromEntries(COGNITIVE_TAXONOMY.filter(item=>item.id!=='nback').map(item=>[item.id,item])),
  'active-recall':{id:'active-recall',title:'Emlékszel még?',short:'Aktív felidézés',icon:'✎',family:'Tanári tananyag',measures:'Saját tanári kérdések első és későbbi felidézése.',limit:'A későbbi kör tényleges elérhetőségét a szerver őrzi.',network:['front','medial','temporal']},
});

const PICTURES={alma:'🍎',bicikli:'🚲',ceruza:'✏️',dob:'🥁',ecset:'🖌️',fa:'🌳',gomba:'🍄',hajo:'⛵',inga:'🕰️',kancso:'🏺',labda:'⚽',maci:'🧸',nap:'☀️',ora:'⌚',pohar:'🥛',robot:'🤖'};
const RECOGNITION_PICTURES=['🪁','🎒','🧩','🛴','🌻','🎻','🧁','🧭','🪴','🛶','🧵','🪇','🥝','🦋','🛟','🪐','🧲','🎨','🧸','🍉','🗝️','🏕️','🚲','📷','🌙','🐚','🍄','⏰','🎈','🦜','🛼','🍋'];
const QUALITY_LABELS={visibilityInterrupted:'A lap háttérbe került',paused:'A feladat szünetelt',recovered:'A feladat újraindult',audioFailure:'A hang lejátszása hibázott',timingDeviation:'Az időzítés eltért',delayedTimingUnverified:'A késleltetés szerveroldali ideje nem ellenőrizhető',delayedRecallTooEarly:'A késleltetett felidézés túl korán történt',invalidProcessingCompliance:'Túl kevés köztes döntés érkezett',insufficientRecognitionResponses:'Nem érkezett mindkét képfajtára válasz',reviewAnsweredEarly:'A későbbi kör a tervezett idő előtt készült el'};

export function isCognitiveGameId(gameId){return isCognitiveGame(gameId);}

export function describeCognitiveSettings(settings={}){
  const mode=settings.mode==='practice'?'Gyakorlás':'Rögzített próba';
  if(settings.protocolId==='hanna-active-recall-v1')return `${mode} · ${settings.questions?.length||0} kérdés · ${settings.reviewRound==='review'?'későbbi felidézés':'első felidézés'}`;
  return `${mode} · ${settings.inputModality==='keyboard'?'billentyűzet':settings.inputModality==='mouse'?'egér':'érintés'}`;
}

function modeSettings(gameId, mode, inputModality='touch'){
  const base={mode,inputModality};
  if(mode==='practice'){
    if(gameId==='spatial-span')Object.assign(base,{minLength:2,maxLength:4,stimulusMs:650,interstimulusMs:200,responseWindowMs:10000});
    if(gameId==='digit-span')Object.assign(base,{minLength:2,maxLength:4,digitMs:650,interdigitMs:300,responseWindowMs:10000});
    if(gameId==='picture-place')Object.assign(base,{itemCount:4,gridSize:6,studyMs:8000,responseWindowMs:8000});
    if(gameId==='complex-span')Object.assign(base,{setSizes:[2,3],sequencesPerSize:1,processingWindowMs:4000,responseWindowMs:10000});
    if(gameId==='recognition')Object.assign(base,{studyCount:4,testCount:8,studyMs:7000,responseWindowMs:4000});
    if(gameId==='attention-nogo')Object.assign(base,{trialCount:16,goRatio:.75,intertrialMs:1100,responseWindowMs:900});
  }
  return normalizeCognitiveSettings(gameId,base);
}

export function createCognitiveSettings({h,gameId,value={},compact=false,onChange=()=>{},onSoundTest=null}){
  const initial=normalizeCognitiveSettings(gameId,value);
  const mode=h('select',{name:'cognitiveMode','aria-label':'Feladat módja'},
    h('option',{value:'practice',selected:initial.mode==='practice'},'Gyakorlás · rövidebb, szabadon ismételhető'),
    h('option',{value:'assessment',selected:initial.mode==='assessment'},'Rögzített próba · azonos feltételek'));
  const modality=h('select',{name:'inputModality','aria-label':'Bevitel módja'},
    [['touch','Érintés'],['mouse','Egér'],['keyboard','Billentyűzet'],['mixed','Vegyes']].map(([id,label])=>h('option',{value:id,selected:id===initial.inputModality},label)));
  mode.value=initial.mode;modality.value=initial.inputModality;
  const status=h('span',{className:'cognitive-audio-status',role:'status'});
  const testButton=gameId==='digit-span'&&typeof onSoundTest==='function'?h('button',{type:'button',className:'secondary-button compact-button',onClick:async()=>{
    testButton.disabled=true;status.textContent='Hang előkészítése…';
    try{await onSoundTest();status.textContent='✓ A két próbaszám hallható volt.';}catch(error){status.textContent=error?.message||'A hangpróba nem sikerült.';}finally{testButton.disabled=false;}
  }},'Hangpróba'):null;
  const element=h('div',{className:`cognitive-settings ${compact?'compact':''}`},
    h('label',{className:'cognitive-field'},h('span',{},'Mód'),mode),
    h('label',{className:'cognitive-field'},h('span',{},'Válaszadás'),modality),
    testButton?h('div',{className:'cognitive-audio-check'},testButton,status):null,
    h('p',{className:'cognitive-protocol-note'},'A rögzített próba beállításai lezártak. Gyakorláskor rövidebb sorozat indul.'));
  const getValue=()=>modeSettings(gameId,mode.value,modality.value);
  const changed=()=>onChange(getValue());mode.addEventListener('change',changed);modality.addEventListener('change',changed);
  return {element,getValue,setValue(raw){const next=normalizeCognitiveSettings(gameId,raw);mode.value=next.mode;modality.value=next.inputModality;changed();}};
}

export function createCognitiveSetup({h,game,value={mode:'assessment'},onStart,onBack='#/memoriaprobak'}){
  let audio=null;
  const settings=createCognitiveSettings({h,gameId:game.id,value,onSoundTest:async()=>{audio?.dispose();audio=await createDigitAudio();await audio.test();}});
  const meta=COGNITIVE_META[game.id];
  const element=h('div',{className:'cognitive-setup'},h('a',{className:'back-link',href:onBack},'← Memóriapróbák'),
    h('div',{className:'cognitive-setup-grid'},
      h('section',{className:'cognitive-setup-story'},h('span',{className:'cognitive-glyph','aria-hidden':'true'},meta.icon),h('span',{className:'eyebrow'},meta.family.toLocaleUpperCase('hu')),h('h1',{},meta.title),h('p',{className:'cognitive-lead'},meta.measures),h('div',{className:'cognitive-limit'},h('strong',{},'Mit érdemes tudni?'),h('p',{},meta.limit))),
      h('section',{className:'settings-panel cognitive-start-panel','aria-label':'Memóriapróba beállításai'},h('span',{className:'eyebrow'},'KÍSÉRLETI PROTOKOLL'),h('h2',{},'Válassz módot'),h('p',{className:'muted'},'A gyakorlás rövidebb. A rögzített próbában nincs menet közbeni helyességjelzés.'),settings.element,h('button',{className:'primary-button start-button',onClick:()=>onStart(settings.getValue())},'Feladat indítása'),h('p',{className:'settings-footnote'},'Az eredmény feladatspecifikus teljesítmény, nem IQ-, egészség- vagy „agyéletkor” pontszám.'))));
  return {element,dispose(){audio?.dispose();}};
}

export function createActiveRecallBuilder({h,onChange=()=>{}}){
  const itemsRoot=h('div',{className:'recall-items'});
  const delay=h('select',{name:'reviewDelayMinutes'},[[60,'1 óra'],[1440,'1 nap'],[4320,'3 nap'],[10080,'1 hét']].map(([value,label])=>h('option',{value:String(value),selected:value===1440},label)));
  delay.value='1440';
  const addButton=h('button',{type:'button',className:'secondary-button recall-add'},'+ Kérdés');
  function itemCard(){
    const card=h('article',{className:'recall-item'},h('div',{className:'recall-item-head'},h('strong',{},'Kérdés'),h('button',{type:'button',className:'text-link'},'Eltávolítás')),
      h('label',{className:'school-field'},h('span',{},'Kérdés vagy felszólítás'),h('input',{name:'prompt',required:true,maxlength:'500',placeholder:'Például: Mi Magyarország fővárosa?'})),
      h('label',{className:'school-field'},h('span',{},'Tanulási magyarázat'),h('textarea',{name:'studyText',maxlength:'1200',rows:'2',placeholder:'A felidézés előtt ezt olvassa el a tanuló.'})),
      h('label',{className:'school-field'},h('span',{},'Elfogadott válaszok'),h('input',{name:'acceptedAnswers',dataset:{privateAnswer:'true'},required:true,maxlength:'900',placeholder:'Budapest | budapest'})),
      h('p',{className:'form-hint'},'Több elfogadott alakot | jellel válassz el. A válaszkulcs nem kerül a tanulói felületre.'));
    card.querySelector('button').addEventListener('click',()=>{if(itemsRoot.children.length>1){card.remove();renumber();onChange();}});
    return card;
  }
  function renumber(){[...itemsRoot.children].forEach((card,index)=>{card.querySelector('strong').textContent=`${index+1}. kérdés`;});addButton.disabled=itemsRoot.children.length>=20;}
  function add(){if(itemsRoot.children.length>=20)return;itemsRoot.append(itemCard());renumber();onChange();}
  addButton.addEventListener('click',add);delay.addEventListener('change',onChange);add();
  const element=h('div',{className:'active-recall-builder'},h('p',{className:'level-rule'},'1–20 saját tétel. Az első felidézést egy ténylegesen későbbi második kör követi.'),itemsRoot,addButton,h('label',{className:'school-field recall-delay'},h('span',{},'Későbbi felidézés'),delay),h('p',{className:'recall-repeat-note'},'Ismétlés: 2 kör · az első most, a második a beállított késleltetés után.'));
  return {element,getValue(){const items=[...itemsRoot.children].map(card=>({prompt:card.querySelector('[name=prompt]').value.trim(),studyText:card.querySelector('[name=studyText]').value.trim(),acceptedAnswers:card.querySelector('[name=acceptedAnswers]').value.split('|').map(value=>value.trim()).filter(Boolean)}));if(items.some(item=>!item.prompt||!item.acceptedAnswers.length))throw new Error('Minden tételhez kérdés és legalább egy elfogadott válasz szükséges.');if(items.some(item=>item.acceptedAnswers.length>12))throw new Error('Egy tételhez legfeljebb 12 elfogadott válasz adható meg.');return {mode:'assessment',inputModality:'keyboard',reviewDelayMinutes:Number(delay.value),items};},clearPrivate(){itemsRoot.querySelectorAll('[data-private-answer]').forEach(input=>{input.value='';});}};
}

function eventId(){return globalThis.crypto?.randomUUID?.()||`10000000-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)}`;}
function pointerMode(){if(globalThis.matchMedia?.('(pointer: coarse)').matches)return'touch';return'mouse';}

function createRecorder(plan){
  const startedAt=new Date().toISOString();let events=[],lastAt=0;
  const push=(type,value,trialIndex,atMs=lastAt)=>{const next=Math.max(lastAt,Number(atMs)||0);lastAt=next;events.push({eventId:eventId(),type,...(trialIndex===undefined?{}:{trialIndex}),atMs:next,value});};
  return {response(trial,value,rt){push('response',value,trial.trialIndex,Math.min(trial.onsetMs+trial.stimulus.responseWindowMs-1,trial.onsetMs+Math.max(1,rt)));},quality(type,value){push(type,value,undefined,lastAt);},audio(trial,value){push('audio',value,trial.trialIndex,Math.max(lastAt,trial.onsetMs));},reset(){events=[];lastAt=0;push('recovery','reload');},raw(){const width=Number(globalThis.innerWidth)||1024;return {version:1,startedAt,completedAt:new Date().toISOString(),events:[...events],device:{pointer:pointerMode(),viewportBucket:width<600?'small':width<1000?'medium':'large'}};}};
}

function createPausableClock(){
  let paused=false,current=null,disposed=false;
  function start(){if(!current||paused||disposed)return;current.started=performance.now();current.timer=setTimeout(()=>{const done=current;current=null;done.resolve(true);},current.remaining);}
  return {wait(ms){if(disposed)return Promise.resolve(false);return new Promise(resolve=>{current={remaining:Math.max(0,ms),resolve,timer:null,started:0};start();});},pause(){if(paused||disposed)return;paused=true;if(current?.timer){clearTimeout(current.timer);current.remaining=Math.max(0,current.remaining-(performance.now()-current.started));current.timer=null;}},resume(){if(!paused||disposed)return;paused=false;start();},cancel(){disposed=true;if(current?.timer)clearTimeout(current.timer);const pending=current;current=null;pending?.resolve(false);},get paused(){return paused;}};
}

function progressNode(h,index,total){return h('div',{className:'cognitive-progress','aria-label':`${index+1}. rész ${total} közül`},h('span',{style:{width:`${Math.round(index/Math.max(1,total)*100)}%`}}));}
function pictureFor(id){const match=String(id).match(/(\d+)$/);return match?RECOGNITION_PICTURES[(Number(match[1])-1)%RECOGNITION_PICTURES.length]:(PICTURES[id]||'◈');}
function grid(h,size,{active=null,onPick=null,disabled=false,selected=[]}={}){return h('div',{className:'cognitive-grid',style:{'--grid-columns':String(Math.ceil(Math.sqrt(size)))}},Array.from({length:size},(_,index)=>h('button',{type:'button',className:`cognitive-cell ${active===index?'active':''} ${selected.includes(index)?'selected':''}`,disabled:disabled||!onPick,'aria-label':`${index+1}. mező`,onClick:()=>onPick?.(index)},selected.includes(index)?String(selected.indexOf(index)+1):'')));}

function metricCards(h,metrics){
  const primary=metrics?.primaryMetric;
  const cards=[];
  if(primary)cards.push([metricLabel(primary.name),displayMetric(primary.value,primary.unit)]);
  const sub=metrics?.subscales||{};
  if(sub.forward)cards.push(['Előre',`${sub.forward.spanScore} elem`],['Vissza',`${sub.backward?.spanScore??'–'} elem`]);
  if(sub.immediate)cards.push(['Azonnali',`${sub.immediate.correct}/${sub.immediate.total}`],['Késleltetett',`${sub.delayed?.correct??0}/${sub.delayed?.total??0}`]);
  if(Number.isFinite(sub.processingAccuracy))cards.push(['Köztes döntés',`${sub.processingAccuracy}%`]);
  if(Number.isFinite(sub.goAccuracy))cards.push(['Go találat',`${sub.goAccuracy}%`],['Visszatartás',`${sub.inhibitionAccuracy}%`]);
  if(Number.isFinite(sub.oldAccuracy))cards.push(['Régi képek',`${sub.oldAccuracy}%`],['Új képek',`${sub.newAccuracy}%`]);
  return h('div',{className:'cognitive-result-metrics'},cards.slice(0,4).map(([label,value])=>h('div',{},h('span',{},label),h('strong',{},value))));
}
function metricLabel(name){return {forwardSpanScore:'Előre terjedelempont',delayedRecallCorrect:'Késleltetett felidézés',recallAccuracy:'Felidézési pontosság',balancedAccuracy:'Kiegyensúlyozott pontosság',acceptedRecallCount:'Elfogadott felidézés'}[name]||name;}
function displayMetric(value,unit){return `${value} ${{items:'elem',percent:'%',questions:'kérdés'}[unit]||unit||''}`.trim();}

export function renderCognitiveResult(h,result){
  const metrics=result?.metrics||{};const flags=metrics.qualityFlags||[];
  return h('section',{className:'cognitive-result-explanation'},h('span',{className:'eyebrow'},metrics.mode==='practice'?'GYAKORLÁS':'RÖGZÍTETT PRÓBA'),h('h2',{},'Mit mutat ez a kör?'),h('p',{},result.summary||'A feladat befejeződött.'),metricCards(h,metrics),flags.length?h('div',{className:'quality-flags'},h('strong',{},'Az összehasonlítást befolyásolja'),h('ul',{},flags.map(flag=>h('li',{},QUALITY_LABELS[flag]||flag)))):h('p',{className:'quality-clear'},metrics.comparable?'✓ Zavartalan, azonos protokollú próba.':'Ez a gyakorlókör nem kerül mérési trendbe.'),h('p',{className:'cognitive-result-disclaimer'},'Ez egy konkrét feladat eredménye. Nem memória-, IQ-, egészség- vagy agyéletkor-pontszám.'));
}

function brainNetwork(h,selected='spatial-span'){
  const meta=COGNITIVE_META[selected]||COGNITIVE_TAXONOMY.find(item=>item.id===selected)||COGNITIVE_META['spatial-span'];
  const ns='http://www.w3.org/2000/svg';const make=(tag,attrs={})=>{const node=document.createElementNS?document.createElementNS(ns,tag):h(tag,{});for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
  const svg=make('svg',{viewBox:'0 0 520 300',role:'img','aria-labelledby':'brain-title brain-description',class:'brain-network'});
  const title=make('title',{id:'brain-title'});title.textContent=`${meta.title} – együttműködő agyi hálózatok`;
  const description=make('desc',{id:'brain-description'});description.textContent='Sematikus oktatási ábra, amely a feladathoz kutatásokban kapcsolódó elosztott hálózatokat mutatja.';
  const outline=make('path',{d:'M78 164C50 121 76 63 132 55c31-39 91-40 126-9 45-27 102-3 112 42 49 2 78 48 60 88 22 37-3 83-45 91-28 31-80 31-111 5-37 26-91 17-116-20-42 11-82-10-80-48-22-7-31-25-20-40Z',class:'brain-outline'});svg.append(title,description,outline);
  const points={front:[132,112],parietal:[300,85],temporal:[330,198],medial:[248,170],cingulate:[226,108],motor:[170,195]};
  const active=new Set(meta.network||[]),names=Object.keys(points);
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){const a=points[names[i]],b=points[names[j]];if(active.has(names[i])&&active.has(names[j]))svg.append(make('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],class:'brain-link'}));}
  names.forEach(name=>{const [cx,cy]=points[name];svg.append(make('circle',{cx,cy,r:active.has(name)?13:7,class:active.has(name)?'brain-node active':'brain-node'}));});
  return svg;
}

const FALLBACK_SOURCES=[
  {sourceId:'owen-2005',citation:'Owen és mtsai. (2005) · N-back funkcionális képalkotási metaelemzés',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6871745/',method:'24 képalkotó vizsgálat összegzése; elosztott frontoparietális mintázat.'},
  {sourceId:'squire-2004',citation:'Squire és mtsai. (2004) · The Medial Temporal Lobe',url:'https://doi.org/10.1146/annurev.neuro.27.070203.144130',method:'Áttekintés az új tények, események és társítások megőrzésében részt vevő rendszerről.'},
  {sourceId:'roediger-karpicke-2006',citation:'Roediger & Karpicke (2006) · Test-enhanced learning',url:'https://pubmed.ncbi.nlm.nih.gov/16507066/',method:'Az aktív felidézés és a későbbi megtartás kísérleti vizsgálata.'},
  {sourceId:'hedge-2018',citation:'Hedge és mtsai. (2018) · The reliability paradox',url:'https://pubmed.ncbi.nlm.nih.gov/28726177/',method:'A csoportszintű hatások és az egyéni különbségek megbízhatóságának eltérése.'},
];

export async function loadCognitiveReferences(){
  try{const module=await import('./reference-data.js');const records=module.cognitiveReferenceData||module.default;return Array.isArray(records)?records:[];}catch{return [];}
}

function sourceCard(h,record){
  const canShowNumbers=record?.license?.reuse==='data-reuse';
  const sample=record.sample||{};const task=record.task||{};const values=canShowNumbers&&Array.isArray(record.table?.values)?record.table.values:[];
  return h('article',{className:'source-card'},h('span',{className:'source-kind'},record.sourceType||'kutatási forrás'),h('h3',{},record.citation||record.sourceId),h('p',{},record.method||[task.name,task.version,task.modality].filter(Boolean).join(' · ')),(sample.ageMin!=null||sample.n!=null)?h('p',{className:'source-sample'},`${sample.ageMin!=null?`${sample.ageMin}–${sample.ageMax} év · `:''}${sample.n!=null?`n=${sample.n}`:''}`):null,values.length?h('div',{className:'reference-values'},values.slice(0,4).map(value=>h('span',{},`${value.ageLabel||'Minta'} · ${value.metric}: ${value.mean}${value.sd!=null?` (SD ${value.sd})`:''}`))):null,values.length?h('small',{},`Forrásadat: ${record.sourceId} · ${record.table?.locator||'pontos hely nincs megadva'}`):null,h('p',{className:'source-applicability'},record.applicability?.reason||'A külső eljárás nem azonos a Hanna-protokollal; személyes percentilis nem számolható.'),h('a',{className:'text-link',href:record.url,target:'_blank',rel:'noopener noreferrer'},'Forrás megnyitása ↗'),record.license?.reuse==='link-only'?h('small',{},'A licenc miatt a számszerű táblázat itt nem jelenik meg.'):null);
}

export function renderCognitiveHub({h}){
  const taskLink=(id,mode)=>id==='nback'?(mode==='practice'?'#/jatek/nback?mode=2&n=1&trialCount=20&intervalMs=3000&selfPaced=1&adaptive=0':'#/jatek/nback?mode=2&n=2&trialCount=30&intervalMs=3000&selfPaced=0&adaptive=0'):`#/jatek/${id}?mode=${mode}`;
  let selected='spatial-span';const brain=h('div',{className:'brain-frame'},brainNetwork(h,selected));const brainCopy=h('div',{},h('span',{className:'eyebrow'},'MI TÖRTÉNIK A HÁTTÉRBEN?'),h('h2',{},COGNITIVE_META[selected].title),h('p',{},'Több, egymással együttműködő hálózat vesz részt a feladat végzésében.'));
  const cards=COGNITIVE_TAXONOMY.map(meta=>h('article',{className:`taxonomy-card ${meta.id===selected?'selected':''}`},h('button',{type:'button','aria-pressed':String(meta.id===selected),onClick:event=>{selected=meta.id;cards.forEach(card=>card.classList.remove('selected'));event.currentTarget.parentElement.classList.add('selected');brain.replaceChildren(brainNetwork(h,selected));brainCopy.querySelector('h2').textContent=meta.title;brainCopy.querySelector('p').textContent=meta.measures;}},h('span',{className:'taxonomy-icon','aria-hidden':'true'},meta.icon),h('span',{},h('strong',{},meta.title),h('small',{},meta.family))),h('p',{},meta.measures),h('p',{className:'taxonomy-limit'},meta.limit),h('a',{className:'primary-button',href:taskLink(meta.id,'assessment')},meta.id==='nback'?'Rögzített N-back':'Próba indítása'),h('a',{className:'text-link',href:taskLink(meta.id,'practice')},'Gyakorlás')));
  const sourceList=h('div',{className:'source-list'},h('p',{className:'muted'},'A részletes források betöltése…'));
  const sources=h('dialog',{className:'source-drawer'},h('div',{className:'source-drawer-head'},h('div',{},h('span',{className:'eyebrow'},'KUTATÁSI HÁTTÉR'),h('h2',{},'Források és korlátok')),h('button',{className:'icon-button','aria-label':'Források bezárása',onClick:()=>sources.close()},'×')),h('p',{},'A kutatási csoportadatok nem személyes normák. A Hanna-feladatok saját kísérleti protokollok.'),sourceList);
  document.body.append(sources);
  const ready=loadCognitiveReferences().then(records=>{const shown=records.length?records:FALLBACK_SOURCES;sourceList.replaceChildren(...shown.map(record=>sourceCard(h,record)));});
  const element=h('div',{className:'cognitive-hub'},h('section',{className:'cognitive-hero'},h('div',{},h('span',{className:'eyebrow'},'GYAKORLÁS VAGY RÖGZÍTETT PRÓBA'),h('h1',{},'Memória',h('em',{},'próbák')),h('p',{},'Hét feladatcsalád, külön értelmezhető mutatókkal. A gyakorlás szabadabb; a rögzített próba azonos feltételeket őriz.')),h('div',{className:'cognitive-hero-actions'},h('a',{className:'primary-button',href:'#/jatek/spatial-span?mode=assessment'},'Első próba'),h('a',{className:'secondary-button',href:'#/memoriaprofil'},'Saját profil'))),h('div',{className:'mode-contrast'},h('article',{},h('span',{},'01'),h('div',{},h('strong',{},'Gyakorlás'),h('p',{},'Rövidebb kör, szabad ismétlés, feladatközeli visszajelzés.'))),h('article',{},h('span',{},'02'),h('div',{},h('strong',{},'Rögzített próba'),h('p',{},'Lezárt beállítások, menet közben nincs helyességjelzés.')))),h('section',{className:'taxonomy-section'},h('div',{className:'section-title'},h('div',{},h('span',{className:'eyebrow'},'TUDOMÁNYOS RENDSZERTAN'),h('h2',{},'Mit figyel meg az egyes feladat?')),h('button',{className:'text-link',onClick:()=>sources.showModal()},'Források és módszer')),h('div',{className:'taxonomy-grid'},cards)),h('section',{className:'brain-section'},brain,h('div',{className:'brain-copy'},brainCopy,h('p',{className:'brain-disclaimer'},'Ez az ábra oktatási szemléltetés: nem a te személyes agyi aktivitásodat vagy agyi egészségedet méri.'))),h('section',{className:'teacher-recall-card'},h('span',{className:'taxonomy-icon','aria-hidden':'true'},'✎'),h('div',{},h('span',{className:'eyebrow'},'TANÁRI TANANYAG'),h('h2',{},'Emlékszel még?'),h('p',{},'Saját kérdések, tanulási magyarázat és ténylegesen későbbi újrakérdezés. Az elfogadott válaszokat csak a szerver őrzi.')),h('a',{className:'secondary-button',href:'#/tanar/feladatsorok?uj=1'},'Feladatsor készítése')));
  return {element,ready,dispose(){sources.remove();}};
}

function mountCognitive(ctx,gameId){
  const {root,h,settings,seed,phase,done}=ctx;const plan=generateCognitiveAssessment(gameId,settings,seed);let recorder=createRecorder(plan),clock=createPausableClock(),disposed=false,runId=0,cancelAnswer=null,audio=null;const spanHits=new Map(),stoppedDirections=new Set();
  const controls=h('div',{className:'cognitive-run-controls'});const pause=h('button',{className:'secondary-button compact-button'},'Szünet');const restart=h('button',{className:'text-link'},'Feladat újraindítása');const content=h('div',{className:'cognitive-task'});controls.append(pause,restart);root.replaceChildren(controls,content);
  const setPaused=(value,reason='manual')=>{if(value===clock.paused)return;if(value){clock.pause();recorder.quality('pause',reason);pause.textContent='Folytatom';content.inert=true;}else{clock.resume();recorder.quality('resume',reason);pause.textContent='Szünet';content.inert=false;}};
  pause.addEventListener('click',()=>setPaused(!clock.paused,'manual'));
  const visibility=()=>{if(document.hidden){recorder.quality('visibility','hidden');setPaused(true,'background');}else{recorder.quality('visibility','visible');setPaused(false,'background');}};document.addEventListener('visibilitychange',visibility);
  function reset(){runId++;cancelAnswer?.();clock.cancel();clock=createPausableClock();recorder.reset();spanHits.clear();stoppedDirections.clear();content.inert=false;pause.textContent='Szünet';void run(runId);}
  restart.addEventListener('click',reset);
  const show=(title,subtitle,...nodes)=>{phase(title,subtitle);content.replaceChildren(progressNode(h,currentIndex,plan.trials.length),...nodes);};let currentIndex=0;
  const wait=ms=>clock.wait(ms);
  function ask(trial,node,getValue,canSubmit=()=>true){return new Promise(resolve=>{let answered=false;const shown=performance.now();const submit=h('button',{className:'primary-button cognitive-submit'},'Válasz rögzítése');const skip=h('button',{className:'text-link'},'Nem tudom');const finish=value=>{if(answered)return;answered=true;submit.disabled=true;skip.disabled=true;resolve({value,rt:performance.now()-shown});};submit.addEventListener('click',()=>{if(canSubmit())finish(getValue());});skip.addEventListener('click',()=>finish(null));node.append(h('div',{className:'cognitive-answer-actions'},submit,skip));cancelAnswer=()=>finish(Symbol.for('cancel'));});}
  function rememberSpanOutcome(trial,value,sequence){const expected=trial.stimulus.direction==='forward'?sequence:[...sequence].reverse(),correct=Array.isArray(value)&&expected.every((item,index)=>value[index]===item),key=`${trial.stimulus.direction}:${trial.stimulus.length}`,hits=(spanHits.get(key)||0)+(correct?1:0);spanHits.set(key,hits);if(trial.stimulus.series===settings.sequencesPerLength-1&&hits===0)stoppedDirections.add(trial.stimulus.direction);}
  async function showSpan(trial,id){const sequence=trial.stimulus.sequence;show(trial.stimulus.direction==='forward'?'Jegyezd meg előre':'Most visszafelé idézd fel',`${sequence.length} mező`,grid(h,trial.stimulus.gridSize,{disabled:true}));const gridNode=content.querySelector('.cognitive-grid');for(const cell of sequence){gridNode.children[cell].classList.add('active');if(!await wait(settings.stimulusMs))return false;gridNode.children[cell].classList.remove('active');if(!await wait(settings.interstimulusMs))return false;}let selected=[];const answerGrid=grid(h,trial.stimulus.gridSize,{selected,onPick:index=>{if(selected.includes(index)||selected.length>=sequence.length)return;selected.push(index);answerGrid.children[index].classList.add('selected');answerGrid.children[index].textContent=String(selected.length);}});show('Jelöld a sorrendet',trial.stimulus.direction==='forward'?'Ugyanabban a sorrendben':'Az utolsó mezőtől visszafelé',answerGrid);const reply=await ask(trial,content,()=>[...selected],()=>selected.length===sequence.length);if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);rememberSpanOutcome(trial,reply.value,sequence);return true;}
  async function showDigit(trial){show('Hallott számsor',`${trial.stimulus.direction==='forward'?'Előre':'Visszafelé'} · ${trial.stimulus.length} számjegy`,h('div',{className:'audio-orb','aria-hidden':'true'},'◌'));const play=h('button',{className:'primary-button'},'Számsor lejátszása');content.append(play);await new Promise(resolve=>{play.addEventListener('click',async()=>{if(play.disabled)return;play.disabled=true;try{audio ||= await createDigitAudio();await audio.playDigits(trial.stimulus.audioTokens.map(token=>Number(token.split('-')[1])));recorder.audio(trial,'played');resolve();}catch(error){recorder.audio(trial,'error');play.disabled=false;content.append(h('p',{className:'input-error',role:'alert'},error.message));}});cancelAnswer=resolve;});let entered=[];const digits=h('div',{className:'digit-pad'},Array.from({length:10},(_,digit)=>h('button',{className:'digit-key',onClick:()=>{if(entered.length<trial.stimulus.length){entered.push(digit);answer.textContent=entered.join(' ');}}},String(digit))));const answer=h('div',{className:'digit-answer','aria-live':'polite'},'–');show('Írd be a hallott sort',trial.stimulus.direction==='forward'?'Ugyanabban a sorrendben':'Visszafelé',answer,digits,h('button',{className:'text-link',onClick:()=>{entered.pop();answer.textContent=entered.join(' ')||'–';}},'Utolsó törlése'));const reply=await ask(trial,content,()=>[...entered],()=>entered.length===trial.stimulus.length);if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);rememberSpanOutcome(trial,reply.value,trial.stimulus.audioTokens.map(token=>Number(token.split('-')[1])));return true;}
  async function showPicture(trial){if(trial.kind==='association-study'){const board=grid(h,settings.gridSize,{disabled:true});for(const pair of trial.stimulus.associations)board.children[pair.cell].textContent=pictureFor(pair.itemId);show(`${trial.stimulus.round}. tanulási kör`,'Jegyezd meg, melyik kép hol lakik.',board);return wait(trial.stimulus.studyMs);}const board=grid(h,settings.gridSize,{onPick:index=>{picked=index;[...board.children].forEach(node=>node.classList.remove('selected'));board.children[index].classList.add('selected');}});let picked=null;show(trial.phase==='delayed'?'Késleltetett felidézés':trial.phase==='immediate'?'Azonnali felidézés':'Tanulási visszahívás',`Hol volt ez a kép? ${pictureFor(trial.stimulus.itemId)}`,h('div',{className:'picture-prompt'},pictureFor(trial.stimulus.itemId)),board);const reply=await ask(trial,content,()=>picked,()=>picked!==null);if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);return true;}
  async function delayedIntermission(){const seconds=Math.ceil(settings.delayedMinimumMs/1000);let left=seconds;const time=h('strong',{className:'intermission-time'},`${left} mp`);show('Egy hasznos közjáték','A későbbi felidézés csak a teljes várakozás után nyílik meg.',h('div',{className:'intermission-card'},h('span',{'aria-hidden':'true'},'◌ · ◇ · ◌'),h('p',{},'Nézz körül, lélegezz nyugodtan, vagy számolj vissza húsztól. A képek helyét ne jegyezd fel.'),time));while(left>0){if(!await wait(1000))return false;left--;time.textContent=`${left} mp`;}return true;}
  async function showComplex(trial){if(trial.kind==='memory-item'){const board=grid(h,settings.gridSize,{active:trial.stimulus.location,disabled:true});show('Őrizd meg a helyet',`${trial.stimulus.itemIndex+1}. hely a ${trial.stimulus.setSize} közül`,board);return wait(settings.memoryItemMs);}if(trial.kind==='symmetry-decision'){const shape=h('div',{className:`symmetry-shape ${trial.stimulus.shapeId.endsWith('-s')?'symmetric':'asymmetric'}`},'◈');show('Szimmetrikus?', 'Dönts a formáról, miközben a helyeket észben tartod.',shape);const buttons=h('div',{className:'binary-choice'});show('Szimmetrikus?','Dönts a formáról, miközben a helyeket észben tartod.',shape,buttons);const reply=await new Promise(resolve=>{let used=false;[['Igen',true],['Nem',false]].forEach(([label,value])=>buttons.append(h('button',{className:'primary-button',onClick:()=>{if(used)return;used=true;[...buttons.children].forEach(b=>b.disabled=true);resolve({value,rt:400});}},label)));cancelAnswer=()=>resolve({value:Symbol.for('cancel')});});if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);return true;}let selected=[];const board=grid(h,settings.gridSize,{onPick:index=>{if(selected.includes(index)||selected.length>=trial.stimulus.setSize)return;selected.push(index);board.children[index].classList.add('selected');board.children[index].textContent=String(selected.length);}});show('Idézd fel a helyeket','Koppints a megjegyzett sorrendben.',board);const reply=await ask(trial,content,()=>[...selected],()=>selected.length===trial.stimulus.setSize);if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);return true;}
  async function showRecognition(trial){if(trial.kind==='recognition-study'){show('Nézd meg a képeket','Hamarosan új és korábban látott képek keverednek.',h('div',{className:'picture-study'},trial.stimulus.items.map(id=>h('span',{},pictureFor(id)))));return wait(trial.stimulus.studyMs);}show('Láttad ezt a képet?','A tanulási részben szerepelt?',h('div',{className:'recognition-picture'},pictureFor(trial.stimulus.itemId)));const choices=h('div',{className:'binary-choice'});content.append(choices);const reply=await new Promise(resolve=>{let used=false;[['Igen, láttam','old'],['Nem, új','new']].forEach(([label,value])=>choices.append(h('button',{className:'primary-button',onClick:()=>{if(used)return;used=true;[...choices.children].forEach(b=>b.disabled=true);resolve({value,rt:performance.now()%1000+1});}},label)));cancelAnswer=()=>resolve({value:Symbol.for('cancel')});});if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);return true;}
  async function showAttention(trial){let tapped=false;const symbol={kor:'●',haromszog:'▲',negyzet:'■',csillag:'★'}[trial.stimulus.symbol];const tap=h('button',{className:'attention-target','aria-label':symbol==='★'?'Csillag: ne koppints':'Jelzés',onClick:()=>{if(tapped||symbol==='★'&&tap.disabled)return;tapped=true;tap.disabled=true;recorder.response(trial,true,Math.max(1,performance.now()%trial.stimulus.responseWindowMs));}},symbol);show('Jelezz — a csillagnál várj',`${trial.trialIndex+1} / ${plan.trials.length}`,tap);await wait(trial.stimulus.responseWindowMs);tap.disabled=true;return wait(Math.max(0,settings.intertrialMs-trial.stimulus.responseWindowMs));}
  async function showRecall(trial){if(settings.reviewRound==='initial'&&trial.stimulus.learningExplanation){show('Először olvasd el','Ezután emlékezetből válaszolsz.',h('article',{className:'recall-study'},h('p',{},trial.stimulus.learningExplanation)));const next=h('button',{className:'primary-button'},'Elolvastam');content.append(next);await new Promise(resolve=>{next.addEventListener('click',resolve,{once:true});cancelAnswer=resolve;});}const input=h('textarea',{className:'recall-answer',rows:'4',maxlength:'500','aria-label':'Válasz'});show(settings.reviewRound==='review'?'Emlékszel még?':'Most idézd fel',trial.stimulus.question,input);const reply=await ask(trial,content,()=>input.value,()=>true);if(typeof reply.value==='symbol')return false;recorder.response(trial,reply.value,reply.rt);return true;}
  async function run(id){for(currentIndex=0;currentIndex<plan.trials.length;currentIndex++){if(disposed||id!==runId)return;const trial=plan.trials[currentIndex];if((gameId==='spatial-span'||gameId==='digit-span')&&stoppedDirections.has(trial.stimulus.direction))continue;if(gameId==='picture-place'&&trial.phase==='delayed'&&!plan.trials.slice(0,currentIndex).some(item=>item.phase==='delayed'))if(!await delayedIntermission())return;let ok=true;if(gameId==='spatial-span')ok=await showSpan(trial,id);else if(gameId==='digit-span')ok=await showDigit(trial);else if(gameId==='picture-place')ok=await showPicture(trial);else if(gameId==='complex-span')ok=await showComplex(trial);else if(gameId==='recognition')ok=await showRecognition(trial);else if(gameId==='attention-nogo')ok=await showAttention(trial);else ok=await showRecall(trial);if(!ok||id!==runId)return;}if(disposed||id!==runId)return;done(null,recorder.raw());}
  void run(0);
  return ()=>{disposed=true;runId++;cancelAnswer?.();clock.cancel();audio?.dispose();document.removeEventListener('visibilitychange',visibility);};
}

export const cognitiveGames=Object.freeze(Object.fromEntries(Object.keys(COGNITIVE_META).map(gameId=>[gameId,{mount:ctx=>mountCognitive(ctx,gameId)}])));
