import {createHannaSettings,renderHannaResult,createHannaHub} from './hanna/ui.js';
import {describeHannaSettings} from './hanna/engine.js';
import {renderHannaMethodSources} from './hanna/research.js';
import {h, normalizeSettings, settingsQuery, parseRoute, normalizeResult, readHistory, saveHistory, clearHistory, historyStats, createCountdown} from './core.js';
import {games} from './catalog.js';
import {seededRandom, normalizeGameSettings, normalizeSettingsForVersion, scoreAttempt, GAME_RULES, COMMON_GAME_SETTINGS} from './game-engine.js';
import {createSchool} from './school.js';
import {describeNbackSettings} from './nback/settings-ui.js';
import {createNbackExplorer} from './nback/explorer.js';
import {renderNbackResult} from './nback/result-view.js';
import {createCognitiveSetup,describeCognitiveSettings,isCognitiveGameId,renderCognitiveHub,renderCognitiveResult} from './cognitive/ui.js';
import {createSchoolCognitiveProfile} from './cognitive/profile.js';

const app=document.querySelector('#app');
const ids=games.map(g=>g.id);
let history=[];
try {history=readHistory(localStorage,ids);} catch {}
let active=null, generation=0, filter='Mind', settingsDraft=null;
let renderedHash=location.hash||'#/';
const modules={};
let school, backendReady=false;
let activeAssignment=null;
const difficultyNames={easy:'Könnyű',normal:'Normál',hard:'Kihívás'};
const legacyModulesByName={core:()=>import('./legacy/v1/games/core-games.js').then(m=>m.coreGames),association:()=>import('./legacy/v1/games/association-games.js').then(m=>m.associationGames),advanced:()=>import('./legacy/v1/games/advanced-games.js').then(m=>m.advancedGames)};
const modulesByName={hanna:()=>import('./hanna/ui.js').then(m=>m.hannaGames),core:()=>import('./games/core-games.js').then(m=>m.coreGames),association:()=>import('./games/association-games.js').then(m=>m.associationGames),advanced:()=>import('./games/advanced-games.js').then(m=>m.advancedGames),nback:()=>import('./nback/ui.js').then(m=>m.nbackGames),cognitive:()=>import('./cognitive/ui.js').then(m=>m.cognitiveGames)};

function announce(text){document.querySelector('#announcer').textContent=text;}
function toast(text){document.querySelector('.toast')?.remove();const node=h('div',{className:'toast',role:'status'},text);document.body.append(node);setTimeout(()=>node.remove(),4000);}
function stop(){generation++;active?.dispose();active=null;}
function linkFor(game,settings){if(game.id==='hanna-method'){const params=new URLSearchParams();for(const [key,value] of Object.entries(settings||{})){if(['resourceSnapshot','reviewSnapshot','customContent','learnedSnapshot','trainingMastery'].includes(key))continue;if(Array.isArray(value))params.set(key,value.join(','));else if(value!=null)params.set(key,String(value));}return `#/jatek/hanna-method?${params}`;}if(isCognitiveGameId(game.id))return `#/jatek/${game.id}?mode=${settings?.mode==='practice'?'practice':'assessment'}`;return `#/jatek/${game.id}?${settingsQuery(settings)}`;}
function defaultSettings(game){return normalizeGameSettings(game.id,{});}
function settingsLabel(game,settings){return game.id==='hanna-method'?describeHannaSettings(settings):game.id==='nback'?describeNbackSettings(settings):isCognitiveGameId(game.id)?describeCognitiveSettings(settings):difficultyNames[settings.difficulty];}
function header(page='home'){
  if(school?.supported)return school.renderHeader(page==='cognitive'?'/memoriaprobak':(location.hash||'#/').slice(1).split('?')[0]);
  return h('header',{className:'site-header'},h('a',{href:'#/',className:'brand','aria-label':'Memória Műhely – kezdőlap'},h('span',{className:'brand-mark','aria-hidden':'true'},'m'),h('span',{},'memória',h('strong',{},'műhely'))),h('nav',{'aria-label':'Főmenü'},h('a',{href:'#/',className:page==='home'?'nav-link current':'nav-link','aria-current':page==='home'?'page':null},'Gyakorlatok'),h('a',{href:'#/memoriaprobak',className:page==='cognitive'?'nav-link current':'nav-link','aria-current':page==='cognitive'?'page':null},'Memóriapróbák'),h('a',{href:'#/hanna-modszer',className:page==='hanna'?'nav-link current':'nav-link'},'Hanna Módszer'),h('a',{href:'#/eredmenyek',className:page==='history'?'nav-link current':'nav-link','aria-current':page==='history'?'page':null},'Eredményeim')),h('span',{className:'header-note'},'Egy kis figyelem magadra'));
}
function footer(){if(school?.supported)return school.renderFooter();return h('footer',{className:'site-footer'},h('span',{},'A saját tempódban. Egy kör is számít.'),h('span',{},'Az eredmények ezen a böngészőn maradnak.'));}
function shell(content,page){app.replaceChildren(header(page),h('main',{id:'main-content',className:'main'},content),footer());window.scrollTo({top:0,behavior:'instant'});}
function mini(game,large=false){
  const box=h('div',{className:`game-art ${game.color} ${large?'large':''}`,'aria-hidden':'true'});
  if(game.icon==='faces')return h('div',{className:`game-art ${game.color} ${large?'large':''}`,'aria-hidden':'true'},[0,2,7].map(i=>h('span',{className:'mini-portrait',style:{backgroundImage:"url('./assets/portraits.png')",backgroundPosition:`${i%4*100/3}% ${Math.floor(i/4)*50}%`}})));
  const symbols={'hanna-method':['✦','↝','◎'],digits:['2','8','4'],grid:['▪','▪','▪','▪','▪','▪','▪','▪','▪'],path:['1','·','3','·','2','·'],missing:['🍋','?','🔑'],stations:['A','—','B'],prices:['🍐','490'],shopping:['🍎','🥕','🥖'],picture:['●','▲','◆','■'],code:['3','=','🌵'],nback:['N','←','N'],'spatial-span':['1','⌁','3'],'digit-span':['◌','7','2'],'picture-place':['🍎','▦','🧸'],'complex-span':['◇','+','⌁'],recognition:['◒','?','◐'],'attention-nogo':['●','★','▲'],'active-recall':['✎','?','↻']}[game.icon];
  box.append(...symbols.map((s,i)=>h('span',{className:`art-token ${game.icon==='grid'?'grid-token':''} token-${i}`},s)));return box;
}
function gameCard(game){return h('a',{className:'game-card',href:linkFor(game,defaultSettings(game)),'aria-label':`${game.title} – gyakorlat megnyitása`},mini(game),h('div',{className:'game-card-content'},h('span',{className:'eyebrow'},game.tag),h('h3',{},game.title),h('p',{},game.description),h('div',{className:'card-bottom'},h('span',{},game.id==='nback'?'folyamatos kör':'1–2 perc'),h('span',{className:'card-arrow','aria-hidden':'true'},'↗'))));}
function renderHome(){
  settingsDraft=null;
  const pending=pendingEntries();
  if(pending.length){renderPending(pending[0]);return;}
  const visibleGames=games.filter(game=>!game.cognitive&&!game.hanna);const stats=historyStats(history),last=[...history].reverse().find(entry=>visibleGames.some(game=>game.id===entry.gameId)),featured=visibleGames.find(g=>g.id===last?.gameId)||visibleGames[0];
  const grid=h('div',{className:'games-grid'});
  const countLabel=h('span',{className:'catalog-count'});
  const update=()=>{const shown=filter==='Mind'?visibleGames:visibleGames.filter(g=>g.category===filter);grid.replaceChildren(...shown.map(gameCard));countLabel.textContent=`${shown.length} gyakorlat`;};
  const categoryNames=['Mind',...new Set(visibleGames.map(game=>game.category))];
  if(!categoryNames.includes(filter))filter='Mind';
  const filters=categoryNames.map(name=>h('button',{className:`filter-button ${filter===name?'active':''}`,'aria-pressed':String(filter===name),onClick:()=>{filter=name;filters.forEach(b=>{const on=b.textContent===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});update();}},name));update();
  shell(h('div',{},h('section',{className:'intro'},h('div',{},h('span',{className:'eyebrow'},'EGY KIS GYAKORLÁS, A SAJÁT TEMPÓDBAN'),h('h1',{},'Ma mire ',h('em',{},'figyelsz?')),h('p',{},'Válassz egy játékot. Állítsd magadra. Kezdődhet.')),h('div',{className:'intro-badge'},h('strong',{},String(visibleGames.length)),h('span',{},'memória-',h('br'),'gyakorlat'))),h('section',{className:'start-strip'},h('div',{className:'start-strip-label'},h('span',{className:'tiny-star','aria-hidden':'true'},'✳'),h('div',{},h('span',{className:'eyebrow'},last?'FOLYTASD EGY ÚJ KÖRREL':'EGY JÓ KEZDÉS'),h('h2',{},featured.title))),h('p',{},last?'A legutóbbi beállításaiddal, friss feladattal.':'Jegyezz meg egy rövid számsort. Indulj öt számjeggyel.'),h('a',{className:'primary-button light-button',href:linkFor(featured,last?.settings||defaultSettings(featured))},'Kipróbálom',h('span',{'aria-hidden':'true'},'↗'))),h('a',{className:'cognitive-entry',href:'#/memoriaprobak'},h('span',{'aria-hidden':'true'},'⌁'),h('div',{},h('span',{className:'eyebrow'},'ÚJ · KÍSÉRLETI FELADATOK'),h('h2',{},'Memóriapróbák'),h('p',{},'Gyakorlás és rögzített próba, külön mutatókkal és tudományos háttérrel.')),h('strong',{},'Felfedezem →')),h('div',{className:'catalog-top'},h('div',{className:'filter-list','aria-label':'Játékkategóriák'},filters),countLabel),grid,h('section',{className:'practice-note'},h('span',{className:'note-icon','aria-hidden':'true'},'◎'),h('div',{},h('h2',{},stats.rounds?'Már van mire visszanézned.':'Találd meg a saját ritmusod.'),h('p',{},stats.rounds?`${stats.rounds} befejezett kör, ${stats.games} kipróbált játék. Az eredményeid segítenek a következő szint kiválasztásában.`:'Kezdd több megjegyzési idővel. Ha már könnyen megy, növeld az elemszámot vagy csökkentsd az időt.')),stats.rounds?h('a',{href:'#/eredmenyek',className:'text-link'},'Eredményeim →'):null)),'home');
}

function renderSetup(game,settings){
  activeAssignment=null;
  if(game.id==='hanna-method'){
    const raw=Object.fromEntries(new URLSearchParams(location.hash.split('?')[1]||''));
    let value;try{value=normalizeGameSettings(game.id,Object.keys(raw).length?raw:settings);}catch(error){value=normalizeGameSettings(game.id,{});toast('A megnyitott kör beállítása nem használható. Válassz új beállítást.');}
    const component=createHannaSettings({h,value,school});active=component;settingsDraft={gameId:game.id,settings:value};
    shell(h('div',{className:'hanna-setup'},h('a',{href:'#/hanna-modszer',className:'back-link'},'← Hanna Módszer'),h('h1',{},'Válaszd ki a mai technikát'),component.element,h('button',{className:'primary-button',onClick:async()=>{try{await startGame(game,component.getValue());}catch(error){toast(error.message||'A kör most nem indítható.');}}},'Gyakorlat indítása')),'hanna');return;
  }
  if(isCognitiveGameId(game.id)){
    if(game.id==='active-recall'){location.hash=school?.user?.role==='teacher'?'#/tanar/feladatsorok?uj=1':'#/feladataim';return;}
    const mode=new URLSearchParams(location.hash.split('?')[1]||'').get('mode')==='practice'?'practice':'assessment';
    const component=createCognitiveSetup({h,game,value:{mode},onStart:value=>startGame(game,value)});settingsDraft={gameId:game.id,settings:{mode}};shell(component.element,'cognitive');return;
  }
  if(game.id==='nback'){
    let s;try{s=normalizeGameSettings('nback',settings);}catch{s=normalizeGameSettings('nback',{});toast('Ez az N-back beállítás nem támogatott; az alapbeállítást nyitottuk meg.');}
    settingsDraft={gameId:game.id,settings:s};
    const component=createNbackExplorer({h,value:s,onChange:value=>{settingsDraft={gameId:game.id,settings:value};},onStart:value=>startGame(game,value),onShare:value=>shareSettings(game,value),onError:toast});
    shell(component.element,'game');
    return;
  }
  let s;try{s=normalizeGameSettings(game.id,settings);}catch{s=normalizeGameSettings(game.id);toast('Ehhez a játékhoz az alapbeállításokat nyitottuk meg.');}
  settingsDraft={gameId:game.id,settings:s};
  const rules=GAME_RULES[game.id],levels=game.levels;
  const field=(label,id,node)=>h('div',{className:'field inline-field'},h('label',{for:id},label),node);
  const level=h('select',{id:'setting-level'},levels.map(v=>h('option',{value:String(v.value),selected:v.value===s.level},`${v.value}. ${v.label}`)));
  const bounds=rules.count||[3,8];
  const count=h('select',{id:'setting-count'},Array.from({length:bounds[1]-bounds[0]+1},(_,i)=>h('option',{value:String(i+bounds[0]),selected:i+bounds[0]===s.count},String(i+bounds[0]))));
  const time=COMMON_GAME_SETTINGS.seconds;
  const seconds=h('select',{id:'setting-seconds'},Array.from({length:(time.max-time.min)/time.step+1},(_,i)=>{const n=time.min+i*time.step;return h('option',{value:String(n),selected:n===s.seconds},String(n));}));
  const reverse=h('input',{id:'setting-reverse',type:'checkbox',checked:s.reverse});
  const difficultyOptions=game.id==='grid'?[['easy','4 × 4 mező'],['normal','5 × 5 mező']]:game.id==='picture'?[['easy','4 hasonló kép'],['hard','6 hasonló kép']]:game.id==='shopping'?[['easy','9 termék, zavarók nélkül'],['hard','14 termék, zavarókkal']]:Object.entries(difficultyNames);
  const difficultyValue=game.id==='grid'&&s.difficulty==='hard'?'normal':game.id==='picture'&&s.difficulty==='normal'?'easy':s.difficulty;
  const difficulty=h('select',{id:'setting-difficulty'},difficultyOptions.map(([v,label])=>h('option',{value:v,selected:v===difficultyValue},label)));
  const rounds=h('select',{id:'setting-rounds'},[3,4,5].map(v=>h('option',{value:String(v),selected:v===s.rounds},String(v))));
  const theme=h('select',{id:'setting-theme'},[['stations','Megállók'],['streets','Utcák']].map(([v,label])=>h('option',{value:v,selected:v===s.theme},label)));
  const symbolSet=h('select',{id:'setting-symbols'},[['objects','1. Emoji'],['abstract','2. Színes ikonok']].map(([v,label])=>h('option',{value:v,selected:v===s.symbolSet},label)));
  const get=()=>normalizeGameSettings(game.id,{...s,level:Number(level.value),count:Number(count.value),seconds:Number(seconds.value),difficulty:difficulty.value,reverse:reverse.checked,rounds:Number(rounds.value),theme:theme.value,symbolSet:symbolSet.value});
  const rule=h('p',{className:'muted',id:'level-rule'}),steps=h('ol',{className:'steps'});
  const countField=rules.count?field(game.countLabel||'Elemszám','setting-count',count):null;
  const difficultyField=['grid','shopping','picture'].includes(game.id)?field('Nehézség','setting-difficulty',difficulty):null;
  const themeField=game.id==='stations'?field('Szókészlet','setting-theme',theme):null;
  function updateRule(){const value=Number(level.value),l=levels.find(v=>v.value===value)||levels[0];rule.textContent=l.description||game.description;steps.replaceChildren(...(l.steps||game.steps).map((text,i)=>h('li',{},h('span',{},String(i+1)),text)));if(countField)countField.hidden=game.id==='stations'&&value===2;if(themeField)themeField.hidden=value!==1;if(difficultyField)difficultyField.hidden=(game.id==='picture'&&value===2)||(game.id==='shopping'&&value===1);}
  level.addEventListener('change',updateRule);updateRule();
  shell(h('div',{},h('a',{href:'#/',className:'back-link'},'← Gyakorlatok'),h('div',{className:'setup-layout'},h('section',{className:'setup-info'},mini(game,true),h('span',{className:'eyebrow'},game.tag),h('h1',{},game.title),rule,steps),h('section',{className:'settings-panel','aria-label':'Gyakorlat beállításai'},h('span',{className:'eyebrow'},'A SAJÁT TEMPÓDBAN'),h('h2',{},'Állítsd magadra'),levels.length>1?field('Játékváltozat','setting-level',level):null,difficultyField,countField,field(game.id==='path'?'Lejátszás (mp)':'Megjegyzés (mp)','setting-seconds',seconds),rules.rounds?field('Feladatok egy körben','setting-rounds',rounds):null,themeField,game.id==='code'?field('Képkulcs','setting-symbols',symbolSet):null,game.reverse?h('label',{className:'check-label',for:'setting-reverse'},reverse,'Fordított sorrendben kérem'):null,h('button',{className:'primary-button start-button',onClick:()=>startGame(game,get())},'Gyakorlat indítása'),h('button',{className:'secondary-button',onClick:()=>shareSettings(game,get())},'Gyakorlatlink másolása'),h('p',{className:'settings-footnote'},'A szint a feladat szabályát is megváltoztathatja. Indítás előtt olvasd el a leírást.')))),'game');
}
async function shareSettings(game,settings){
  const url=new URL(location.href);url.hash=linkFor(game,settings).slice(1);
  try {await navigator.clipboard.writeText(url.href);toast('A gyakorlatlink a vágólapon van.');}
  catch {const dialog=h('dialog',{className:'share-dialog'},h('h2',{},'A gyakorlat linkje'),h('p',{},'Ezt a linket másold ki és küldd tovább.'),h('input',{className:'share-url',value:url.href,readOnly:true,'aria-label':'Megosztható gyakorlatlink'}),h('button',{className:'primary-button',onClick:()=>dialog.close()},'Bezárom'));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();dialog.querySelector('input').select();}
}

async function startGame(game,rawSettings,assignment=null){
  let settings;try{settings=normalizeGameSettings(game.id,rawSettings);}catch(error){toast(error.message||'A kör beállítása nem használható.');return;}
  stop();const pending=pendingEntries();if(pending.length){renderPending(pending[0]);return;}const token=generation;let attempt=null;
  const userId=school?.user?.id;
  const teacherPreview=school?.supported&&school.user?.role==='teacher';
  activeAssignment=assignment;
  if(school?.supported&&!teacherPreview){
    if(!userId){location.hash='#/fiok';return;}
    shell(h('section',{className:'empty-state',role:'status'},h('h2',{},'Előkészítjük a gyakorlatot…')),'game');
    try{const response=await school.api('/api/attempts',{method:'POST',body:{clientRulesVersion:2,gameId:game.id,settings,...(assignment?.assignmentStepId?{assignmentStepId:assignment.assignmentStepId}:{})}});if(token!==generation||school.user?.id!==userId)return;attempt=response.attempt;settings=normalizeSettingsForVersion(game.id,attempt.settings,attempt.rulesVersion);}
    catch(error){if(token!==generation)return;shell(h('section',{className:'empty-state'},h('h2',{},'Most nem indult el a kör'),h('p',{role:'alert'},error.message||'Ellenőrizd a kapcsolatot és próbáld újra.'),h('button',{className:'primary-button',onClick:()=>startGame(game,rawSettings,assignment)},'Újrapróbálom'),h('a',{className:'secondary-button',href:assignment?'#/feladataim':'#/'},'Vissza')),'game');return;}
  }
  if(teacherPreview&&game.id==='hanna-method'&&settings.resourceIds?.length){
    try{const data=await school.api('/api/hanna/resources');if(token!==generation)return;const resources=data.resources.filter(resource=>settings.resourceIds.includes(resource.id));if(resources.length!==settings.resourceIds.length)throw new Error('A saját eszköz nem található.');settings=normalizeGameSettings(game.id,{...settings,resourceSnapshot:resources});}
    catch(error){if(token!==generation)return;toast(error.message);location.hash='#/hanna-modszer';return;}
  }
  const rulesVersion=attempt?.rulesVersion||2;
  const localSeed=attempt?.seed??crypto.getRandomValues(new Uint32Array(1))[0];
  window.history.replaceState(null,'',linkFor(game,settings));
  const phaseTitle=h('h2',{tabIndex:-1},'Egy pillanat…'),phaseText=h('p',{className:'muted'}),root=h('div',{className:'game-stage'}),timerText=h('span',{className:'timer-number'},''),timerFill=h('div',{className:'timer-fill'}),timerWrap=h('div',{className:'timer-wrap',hidden:true},h('div',{className:'timer-label'},h('span',{},game.id==='path'?'Lejátszás':'Megjegyzés'),timerText),h('div',{className:'timer-track'},timerFill));
  const ready=h('button',{className:'secondary-button',hidden:true},'Készen állok');
  const pause=h('button',{className:'icon-button',hidden:true,'aria-label':'Gyakorlat szüneteltetése'},'Ⅱ');
  const overlay=h('div',{className:'pause-overlay',hidden:true},h('div',{},h('span',{className:'pause-symbol','aria-hidden':'true'},'Ⅱ'),h('h2',{},'Egy kis szünet'),h('p',{},'Innen folytatjuk, amikor készen állsz.'),h('button',{className:'primary-button',onClick:()=>setPaused(false)},'Folytatom')));
  let countdown=null,paused=false,disposed=false,gameCleanup=null,started=performance.now();const timers=new Set();
  const dispose=()=>{if(disposed)return;disposed=true;countdown?.cancel();for(const t of timers)clearTimeout(t);gameCleanup?.();document.removeEventListener('visibilitychange',visibility);};
  const visibility=()=>{if(document.hidden&&countdown&&!disposed)setPaused(true);};
  function setPaused(value){if(disposed||!countdown)return;paused=value;overlay.hidden=!value;root.inert=value;ready.disabled=value;value?countdown.pause():countdown.resume();if(value)overlay.querySelector('button').focus();}
  pause.addEventListener('click',()=>setPaused(!paused));ready.addEventListener('click',()=>countdown?.finish());document.addEventListener('visibilitychange',visibility);
  const session={dispose,game,settings,get stage(){return countdown?'memorize':'answer';}};active=session;
  const hanna=game.id==='hanna-method';
  const cognitive=isCognitiveGameId(game.id);
  const caption=hanna?[h('span',{},describeHannaSettings(settings)),h('span',{},'Tanulás és felidézés')]:game.id==='nback'?[h('span',{},`N=${settings.n}`),h('span',{},`${settings.trialCount} pontozott inger`),h('span',{},settings.selfPaced?'Saját tempó':`${settings.intervalMs/1000} mp / inger`)]:cognitive?[h('span',{},settings.mode==='practice'?'Gyakorlás':'Rögzített próba'),h('span',{},'Kísérleti protokoll'),h('span',{},'Nincs csillag vagy rangpont')]:[h('span',{},difficultyNames[settings.difficulty]),h('span',{},`${settings.seconds} mp ${game.id==='path'?'lejátszás':'megjegyzés'}`),h('span',{},'Időkorlát nélküli válaszadás')];
  shell(h('div',{className:`play-page ${game.id==='nback'?'nback-host-play':''} ${cognitive?'cognitive-host-play':''} ${hanna?'hanna-host-play':''}`},h('div',{className:'play-top'},h('button',{className:'back-link',onClick:()=>{stop();renderSetup(game,settings);}},'← Beállítások'),h('span',{className:`game-category ${game.color}`},game.title),game.id==='nback'||cognitive||hanna?null:pause),h('section',{className:'play-panel'},rulesVersion===1?h('p',{className:'muted'},'Korábban indított vagy kiosztott gyakorlat, az eredeti szabályaival.'):null,hanna&&Number(settings.hannaVersion)===2?null:h('div',{className:'phase-heading'},phaseTitle,phaseText),game.id==='nback'||cognitive||hanna?null:timerWrap,root,game.id==='nback'||cognitive||hanna?null:h('div',{className:'ready-row'},ready),game.id==='nback'||cognitive||hanna?null:overlay),h('div',{className:'play-caption'},caption)),'game');
  try{
    const moduleKey=`${rulesVersion}:${game.module}`;
    const loader=rulesVersion===1?legacyModulesByName[game.module]:modulesByName[game.module];
    if(!loader)throw new Error('A gyakorlat ehhez a szabályverzióhoz nem érhető el.');
    const library=modules[moduleKey]||(modules[moduleKey]=await loader());
    if(token!==generation||disposed)return;
    if(!library[game.id]?.mount)throw new Error('A gyakorlat nem érhető el.');
    const ctx={root,settings,seed:localSeed,rand:seededRandom(localSeed),h,phase(title,subtitle){if(disposed)return;phaseTitle.textContent=title;phaseText.textContent=subtitle||'';announce(title);},async prepareHannaRecall(answer,{gateId}={}){if(!attempt)return null;const response=await school.api(`/api/attempts/${attempt.id}/hanna-ready`,{method:'POST',body:{answer,...(gateId?{gateId}:{})}});return response.availableAt||null;},async prepareDelayedRecall(answer){if(!attempt)return null;const response=await school.api(`/api/attempts/${attempt.id}/delay-ready`,{method:'POST',body:{answer}});return response.availableAt||null;},delay(fn,ms){const t=setTimeout(()=>{timers.delete(t);if(!disposed)fn();},ms);timers.add(t);return t;},memorize(callback,{onProgress,allowSkip=true}={}){
      if(disposed)return;countdown?.cancel();timerWrap.hidden=false;ready.hidden=!allowSkip;pause.hidden=false;
      countdown=createCountdown(settings.seconds,{onTick:left=>{timerText.textContent=`${Math.ceil(left)} mp`;timerFill.style.width=`${Math.max(0,left/settings.seconds*100)}%`;onProgress?.(Math.min(1,Math.max(0,1-left/settings.seconds)));},onDone:()=>{if(disposed)return;countdown=null;timerWrap.hidden=true;ready.hidden=true;pause.hidden=true;overlay.hidden=true;root.inert=false;phaseTitle.focus({preventScroll:true});callback();}});
      if(document.hidden)setPaused(true);
    },done(result,answer){if(disposed||token!==generation)return;const completedAt=new Date().toISOString();
      if(attempt&&(game.id==='active-recall'||game.id==='hanna-method')){dispose();active=null;const pending={attemptId:attempt.id,gameId:game.id,settings,answer,userId,assignment,at:completedAt};storePending(pending);submitPending(pending);return;}
      const scored=scoreAttempt(game.id,settings,localSeed,answer,rulesVersion);const normalized=cognitive||hanna?{...scored,gameId:game.id}:normalizeResult({...scored,gameId:game.id});const entry={...normalized,gameId:game.id,at:completedAt,settings,duration:Math.round((performance.now()-started)/1000)};dispose();active=null;
      if(attempt){const pending={attemptId:attempt.id,gameId:game.id,settings,answer,userId,assignment,at:entry.at};storePending(pending);submitPending(pending);return;}
      if(teacherPreview){renderResult(game,settings,entry,false);return;}
      history=[...history,entry].slice(-200);let saved=true;try{saveHistory(localStorage,history);}catch{saved=false;}renderResult(game,settings,entry,saved);}};
    gameCleanup=library[game.id].mount(ctx);
  }catch(error){if(disposed)return;dispose();active=null;root.replaceChildren(h('div',{className:'error-state'},h('h2',{},'Most nem sikerült elindítani'),h('p',{},'Próbáld újra. Az eddigi eredményeid megmaradnak.'),h('button',{className:'primary-button',onClick:()=>startGame(game,settings)},'Újrapróbálom')));phaseTitle.textContent='Egy kis fennakadás';phaseText.textContent='';console.error('Game could not start',error);}
}

function renderResult(game,settings,result,saved){
  if(game.id==='hanna-method'){
    shell(h('section',{className:'result-panel hanna-complete'},h('span',{className:'eyebrow'},'HANNA MÓDSZER'),h('h1',{},'A mai kör elkészült.'),renderHannaResult(h,result,{teacher:school?.user?.role==='teacher'}),h('p',{className:saved||school?.user?.role==='teacher'?'saved-note':'input-error'},school?.user?.role==='teacher'?'Tanári előnézet. Tanulói eredményt nem rögzít.':saved?'✓ A válaszok és az eredmény a fiókodba mentve.':'Az eredmény most nem menthető.'),h('div',{className:'result-actions'},activeAssignment?h('a',{className:'primary-button',href:'#/feladataim'},'Vissza a feladataimhoz'):h('button',{className:'primary-button',onClick:()=>startGame(game,settings.activity==='review'?{...settings,reviewIds:[],reviewSnapshot:[]}:settings)},settings.activity==='review'?'Következő esedékes kör':'Új kör'),h('a',{className:'secondary-button',href:'#/hanna-modszer?view=daily'},'Napi terv folytatása'),h('a',{className:'secondary-button',href:'#/hanna-modszer'},'Hanna Módszer'))),'hanna');announce('A Hanna Módszer kör befejeződött.');return;
  }

  if(isCognitiveGameId(game.id)){
    shell(h('section',{className:'result-panel cognitive-complete'},h('span',{className:'eyebrow'},`${game.title.toLocaleUpperCase('hu')} · KÖR TELJESÍTVE`),h('h1',{},settings.mode==='practice'?'A gyakorlókör elkészült.':'A rögzített próba elkészült.'),renderCognitiveResult(h,result),h('p',{className:saved||school?.user?.role==='teacher'?'saved-note':'input-error'},school?.supported&&school.user?.role==='teacher'?'Tanári előnézet. Tanulói eredményt nem rögzít.':saved?'✓ Az eredményt a fiókodba mentettük.':'Az eredmény most nem menthető.'),h('div',{className:'result-actions'},activeAssignment?h('a',{className:'primary-button',href:'#/feladataim'},'Vissza a feladataimhoz'):h('button',{className:'primary-button',onClick:()=>startGame(game,settings)},'Új kör'),h('a',{className:'secondary-button',href:'#/memoriaprofil'},school?.user?.role==='teacher'?'Tanulói profilok':'Saját profil'),h('a',{className:'secondary-button',href:'#/memoriaprobak'},'Másik próba'))),'cognitive');announce('A memóriapróba befejeződött.');return;
  }
  const message=result.percent===100?'Minden a helyére került.':result.percent>=60?'Szép kör volt.':'Minden kör egy új lehetőség.';
  const details=result.details.length?h('details',{className:'result-details'},h('summary',{},'Válaszok áttekintése'),h('div',{className:'answer-details'},result.details.map(d=>h('div',{className:`answer-detail ${d.correct?'correct':'incorrect'}`},h('span',{className:'detail-mark','aria-label':d.correct?'Helyes':'Eltérő'},d.correct?'✓':'↺'),h('div',{},h('strong',{},d.label),h('p',{},`A válaszod: ${d.actual||'–'}`),!d.correct?h('p',{},`Megoldás: ${d.expected}`):null))))):null;
  const starLine=game.id==='nback'?h('p',{className:'result-stars','aria-label':'A Brain Workshop N-back forrás nem használ csillagokat.'},'A Brain Workshop N-back pontozásában nincs csillag.'):h('p',{className:'result-stars','aria-label':result.stars===null?'Ehhez az eredményhez még nincs csillagértékelés':`${result.stars} csillag`},result.stars===null?'Az eredmény menthető; ehhez a pontszámhoz még nincs meghatározott csillagértékelés.':'★'.repeat(result.stars)+'☆'.repeat(3-result.stars));
  shell(h('section',{className:'result-panel'},h('span',{className:'eyebrow'},`${game.title.toLocaleUpperCase('hu')} · KÖR TELJESÍTVE`),h('div',{className:'score-ring',style:{'--score':`${result.percent}%`}},h('span',{},h('strong',{},result.percent),h('span',{},'%'))),h('h1',{},message),game.id==='nback'?renderNbackResult(h,result):h('p',{className:'result-summary'},`${result.correct} / ${result.total} helyes válasz`),game.id!=='nback'&&result.summary?h('p',{className:'muted'},result.summary):null,starLine,h('p',{className:saved||school?.user?.role==='teacher'?'saved-note':'input-error'},school?.supported&&school.user?.role==='teacher'?'Tanári próbakör. Tanulói eredményt nem rögzít.':saved?(school?.supported?'✓ Az eredményt a fiókodba mentettük.':'✓ Az eredményt elmentettük ezen az eszközön.'):'Az eredmény most nem menthető a böngészőben.'),game.id==='nback'?null:details,h('div',{className:'result-actions'},activeAssignment?h('a',{className:'primary-button',href:'#/feladataim'},'Vissza a feladataimhoz'):h('button',{className:'primary-button',onClick:()=>startGame(game,settings)},'Újra játszom'),h('a',{className:'secondary-button',href:'#/'},'Másik gyakorlat')),h('div',{className:'result-links'},h('button',{className:'text-link',onClick:()=>renderSetup(game,settings)},'Beállítások módosítása'),h('a',{className:'text-link',href:'#/eredmenyek'},'Összes eredmény'))),'game');announce(game.id==='nback'?`${result.percent} százalékos N-back eredmény.`:`${result.correct} helyes válasz ${result.total} közül.`);
}
function renderHistory(){
  settingsDraft=null;const stats=historyStats(history);
  const summary=h('div',{className:'stats-grid'},[['Befejezett kör',stats.rounds],['Kipróbált játék',`${stats.games} / ${games.length}`],['Pontosság',stats.percent===null?'–':`${stats.percent}%`]].map(([label,value])=>h('div',{className:'stat'},h('span',{},label),h('strong',{},value))));
  const rows=history.length?h('div',{className:'history-list'},[...history].reverse().slice(0,30).map(entry=>{const game=games.find(g=>g.id===entry.gameId);return h('a',{className:'history-row',href:linkFor(game,entry.settings),'aria-label':game.id==='nback'?`${game.title}, N=${entry.settings.n}, ${entry.percent}%, új kör indítása`:`${game.title}, ${entry.correct}/${entry.total}, új kör indítása a beállításokkal`},h('span',{className:`history-symbol ${game.color}`},game.title[0]),h('div',{className:'history-title'},h('strong',{},game.title),h('span',{},new Date(entry.at).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))),h('span',{className:'history-level'},settingsLabel(game,entry.settings)),h('strong',{className:'history-score'},game.id==='nback'?`N=${entry.settings.n}`:`${entry.correct} / ${entry.total}`),h('span',{className:'history-percent'},`${entry.percent}%`));})):h('div',{className:'empty-state'},h('span',{className:'empty-symbol','aria-hidden':'true'},'◎'),h('h2',{},'Az első kör még előtted van.'),h('p',{},'Játssz egyet, és itt megtalálod az eredményed.'),h('a',{className:'primary-button',href:'#/'},'Választok egy játékot'));
  shell(h('div',{},h('section',{className:'intro compact'},h('div',{},h('span',{className:'eyebrow'},'A SAJÁT UTAD'),h('h1',{},'Egy kis ',h('em',{},'visszatekintés.')),h('p',{},'Az eredmények a gyakorlást követik. Nem képességvizsgálati pontszámok.'))),summary,h('div',{className:'section-title'},h('h2',{},'Legutóbbi körök'),history.length?h('button',{className:'text-link',onClick:confirmClear},'Előzmények törlése'):null),rows,h('p',{className:'privacy-note'},'Legfeljebb 200 kört őrzünk meg ezen a böngészőn. Másik eszközön ezek nem jelennek meg.')),'history');
}
function confirmClear(){const dialog=h('dialog',{className:'confirm-dialog'},h('h2',{},'Törlöd az előzményeket?'),h('p',{},'Az ezen a böngészőn mentett játékere­dmények eltűnnek. A játékokat bármikor újrakezdheted.'),h('div',{className:'answer-row'},h('button',{className:'secondary-button',onClick:()=>dialog.close()},'Mégsem'),h('button',{className:'primary-button',onClick:()=>{try{clearHistory(localStorage);}catch{toast('A mentett adatokat most nem sikerült törölni.');dialog.close();return;}history=[];dialog.close();renderHistory();}},'Igen, törlöm')));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();}
function renderRoute(){if(!backendReady)return;const nextHash=location.hash||'#/';if(nextHash!==renderedHash&&active?.canLeave&&!active.canLeave()){window.history.replaceState(null,'',renderedHash);return;}renderedHash=nextHash;stop();document.querySelectorAll('dialog').forEach(d=>d.remove());const rawPath=(location.hash||'#/').replace(/^#/,'').split('?')[0].replace(/\/$/,'')||'/';if(rawPath==='/hanna-modszer'){if(school?.supported&&!school.user){location.hash='#/fiok';return;}const component=createHannaHub({h,school,initialView:new URLSearchParams(location.hash.split('?')[1]||'').get('view')||'discover',initialStudentId:new URLSearchParams(location.hash.split('?')[1]||'').get('studentId')||'',onStart:settings=>startGame(games.find(game=>game.id==='hanna-method'),settings)});active=component;shell(h('div',{},component.element,renderHannaMethodSources(h)),'hanna');return;}if(rawPath==='/memoriaprobak'){const component=renderCognitiveHub({h,teacher:school?.user?.role==='teacher'});active=component;shell(component.element,'cognitive');return;}if(rawPath==='/memoriaprofil'){if(school?.supported&&!school.user){location.hash='#/fiok';return;}const component=createSchoolCognitiveProfile({h,school});active=component;shell(component.element,'cognitive');return;}if(school?.renderRoute())return;if(school?.supported&&!school.user){location.hash='#/fiok';return;}const pending=pendingEntries();if(pending.length){renderPending(pending[0]);return;}const route=parseRoute(location.hash,ids);if(route.page==='history')renderHistory();else if(route.page==='game')renderSetup(games.find(g=>g.id===route.id),route.settings);else renderHome();}
window.addEventListener('hashchange',renderRoute);
window.addEventListener('pagehide',event=>{if(!event.persisted)stop();});
school=createSchool({h,games,onPlay:(gameId,settings,assignment)=>{const game=games.find(g=>g.id===gameId);if(game)startGame(game,settings,assignment);},onAuthChange:async()=>{stop();history=[];await loadAccountHistory();renderRoute();},renderPractice:()=>{location.hash='#/';renderRoute();}});
async function loadAccountHistory(){if(!school.supported)return;if(!school.user||school.user.role!=='student'){history=[];return;}const userId=school.user.id;try{const data=await school.api('/api/results');if(school.user?.id===userId)history=[...(data.results||[])].map(result=>({...result,...(isCognitiveGameId(result.gameId)||result.gameId==='hanna-method'?result:normalizeResult(result)),settings:normalizeSettingsForVersion(result.gameId,result.settings,result.rulesVersion)})).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));}catch{history=[];}}
async function initialize(){try{await school.init();await loadAccountHistory();backendReady=true;renderRoute();}catch{app.replaceChildren(h('main',{className:'main'},h('section',{className:'empty-state'},h('h1',{},'Most nem érjük el a műhelyt'),h('p',{},'A fiókod adatai megmaradnak. Ellenőrizd a kapcsolatot, és próbáld újra.'),h('button',{className:'primary-button',onClick:initialize},'Újrapróbálom'))));}}
function pendingKey(){return school?.user?`memoria:pending:v1:${school.user.id}`:null;}
function pendingEntries(){try{const key=pendingKey();if(!key)return[];const data=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(p=>p.userId===school.user.id&&p.attemptId&&ids.includes(p.gameId)).slice(-10):[];}catch{return[];}}
function storePending(pending){try{const entries=pendingEntries().filter(p=>p.attemptId!==pending.attemptId);sessionStorage.setItem(pendingKey(),JSON.stringify([...entries,pending].slice(-10)));}catch{}}
function removePending(id){try{sessionStorage.setItem(pendingKey(),JSON.stringify(pendingEntries().filter(p=>p.attemptId!==id)));}catch{}}
function renderPending(pending,error=null,busy=false){
  const game=games.find(g=>g.id===pending.gameId),terminal=error&&[400,404,409,410].includes(error.status);
  shell(h('section',{className:'result-panel'},h('span',{className:'eyebrow'},game.title),h('h1',{},busy?'Ellenőrizzük a válaszodat…':terminal?'Ez a kör már nem menthető':'A válaszod mentésre vár'),h('p',{role:busy?'status':'alert'},busy?'A pontszámot a műhely számolja ki.':error?.message||'Folytasd a mentést, hogy az eredményed a fiókodba kerüljön.'),!busy&&!terminal?h('button',{className:'primary-button',onClick:()=>submitPending(pending)},'Mentés újrapróbálása'):null,terminal?h('button',{className:'primary-button',onClick:()=>{removePending(pending.attemptId);if(pending.assignment){location.hash='#/feladataim';renderRoute();}else startGame(game,pending.settings);}},'Új kört kezdek'):null,!busy&&!terminal?h('p',{className:'muted'},'Újrapróbáláskor ugyanaz a kör csak egyszer számít.'):null,h('a',{className:'text-link',href:school.user?.role==='student'?'#/feladataim':'#/tanar'},'Vissza az áttekintéshez')),'game');
}
async function submitPending(pending){if(school.user?.id!==pending.userId){location.hash='#/fiok';return;}renderPending(pending,null,true);const token=generation;try{const data=await school.api(`/api/attempts/${pending.attemptId}/submit`,{method:'POST',body:{answer:pending.answer}});if(school.user?.id!==pending.userId)return;removePending(pending.attemptId);await loadAccountHistory();if(token!==generation)return;activeAssignment=pending.assignment;renderResult(games.find(g=>g.id===pending.gameId),pending.settings,data.result,true);}catch(error){if(token!==generation||school.user?.id!==pending.userId)return;renderPending(pending,error);}}
initialize();

// Optional structured navigation uses the same actions as the visible interface.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'list_memory_games',title:'Memóriajátékok listája',description:'List the available games and the current visible session. Does not expose answers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({games:games.map(g=>({id:g.id,title:g.title,category:g.category})),current:active?.game?{gameId:active.game.id,stage:active.stage}:parseRoute(location.hash,ids)})});
  register({name:'configure_memory_game',title:'Gyakorlat beállítása',description:'Open the visible setup page for a memory game; does not start a round or save a result.',inputSchema:{type:'object',properties:{gameId:{type:'string',enum:ids},count:{type:'integer',minimum:3,maximum:8},seconds:{type:'integer',minimum:3,maximum:30}},required:['gameId'],additionalProperties:false},execute:input=>{if(!input||!ids.includes(input.gameId)||Object.keys(input).some(k=>!['gameId','count','seconds'].includes(k))||['count','seconds'].some(k=>input[k]!==undefined&&(!Number.isInteger(input[k])||input[k]<(k==='count'?3:3)||input[k]>(k==='count'?8:30))))throw new Error('Invalid game or settings');const game=games.find(g=>g.id===input.gameId),{gameId,...rawSettings}=input,settings=normalizeGameSettings(game.id,game.id==='nback'?{}:rawSettings);if(school?.supported&&!school.user)throw new Error('Bejelentkezés szükséges');stop();window.history.replaceState(null,'',linkFor(game,settings));renderSetup(game,settings);return {gameId:game.id,settings:settingsDraft.settings,page:'setup'};}});
  window.addEventListener('pagehide',event=>{if(!event.persisted)lifecycle.abort();});
}
