import {h, normalizeSettings, settingsQuery, parseRoute, normalizeResult, readHistory, saveHistory, clearHistory, historyStats, createCountdown} from './core.js';
import {games} from './catalog.js';

const app=document.querySelector('#app');
const ids=games.map(g=>g.id);
let history=[];
try {history=readHistory(localStorage,ids);} catch {}
let active=null, generation=0, filter='Mind', settingsDraft=null;
const modules={};
const difficultyNames={easy:'Könnyű',normal:'Normál',hard:'Kihívás'};
const modulesByName={core:()=>import('./games/core-games.js').then(m=>m.coreGames),association:()=>import('./games/association-games.js').then(m=>m.associationGames),advanced:()=>import('./games/advanced-games.js').then(m=>m.advancedGames)};

function announce(text){document.querySelector('#announcer').textContent=text;}
function toast(text){document.querySelector('.toast')?.remove();const node=h('div',{className:'toast',role:'status'},text);document.body.append(node);setTimeout(()=>node.remove(),4000);}
function stop(){generation++;active?.dispose();active=null;}
function linkFor(game,settings){return `#/jatek/${game.id}?${settingsQuery(settings)}`;}
function header(page='home'){
  return h('header',{className:'site-header'},h('a',{href:'#/',className:'brand','aria-label':'Memória Műhely – kezdőlap'},h('span',{className:'brand-mark','aria-hidden':'true'},'m'),h('span',{},'memória',h('strong',{},'műhely'))),h('nav',{'aria-label':'Főmenü'},h('a',{href:'#/',className:page==='home'?'nav-link current':'nav-link','aria-current':page==='home'?'page':null},'Gyakorlatok'),h('a',{href:'#/eredmenyek',className:page==='history'?'nav-link current':'nav-link','aria-current':page==='history'?'page':null},'Eredményeim')),h('span',{className:'header-note'},'Egy kis figyelem magadra'));
}
function footer(){return h('footer',{className:'site-footer'},h('span',{},'A saját tempódban. Egy kör is számít.'),h('span',{},'Az eredmények ezen a böngészőn maradnak.'));}
function shell(content,page){app.replaceChildren(header(page),h('main',{id:'main-content',className:'main'},content),footer());window.scrollTo({top:0,behavior:'instant'});}
function mini(game,large=false){
  const box=h('div',{className:`game-art ${game.color} ${large?'large':''}`,'aria-hidden':'true'});
  if(game.icon==='faces')return h('div',{className:`game-art ${game.color} ${large?'large':''}`,'aria-hidden':'true'},[0,2,7].map(i=>h('span',{className:'mini-portrait',style:{backgroundImage:"url('./assets/portraits.png')",backgroundPosition:`${i%4*100/3}% ${Math.floor(i/4)*50}%`}})));
  const symbols={digits:['2','8','4'],grid:['▪','▪','▪','▪','▪','▪','▪','▪','▪'],path:['1','·','3','·','2','·'],missing:['🍋','?','🔑'],stations:['A','—','B'],prices:['🍐','490'],shopping:['🍎','🥕','🥖'],picture:['●','▲','◆','■'],code:['3','=','🌵']}[game.icon];
  box.append(...symbols.map((s,i)=>h('span',{className:`art-token ${game.icon==='grid'?'grid-token':''} token-${i}`},s)));return box;
}
function gameCard(game){return h('a',{className:'game-card',href:linkFor(game,normalizeSettings()),'aria-label':`${game.title} – gyakorlat megnyitása`},mini(game),h('div',{className:'game-card-content'},h('span',{className:'eyebrow'},game.tag),h('h3',{},game.title),h('p',{},game.description),h('div',{className:'card-bottom'},h('span',{},'1–2 perc'),h('span',{className:'card-arrow','aria-hidden':'true'},'↗'))));}
function renderHome(){
  settingsDraft=null;
  const stats=historyStats(history),last=history.at(-1),featured=games.find(g=>g.id===last?.gameId)||games[0];
  const grid=h('div',{className:'games-grid'});
  const countLabel=h('span',{className:'catalog-count'});
  const update=()=>{const shown=filter==='Mind'?games:games.filter(g=>g.category===filter);grid.replaceChildren(...shown.map(gameCard));countLabel.textContent=`${shown.length} gyakorlat`;};
  const filters=['Mind','Sorrend','Képek','Kapcsolatok','Tér'].map(name=>h('button',{className:`filter-button ${filter===name?'active':''}`,'aria-pressed':String(filter===name),onClick:()=>{filter=name;filters.forEach(b=>{const on=b.textContent===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});update();}},name));update();
  shell(h('div',{},h('section',{className:'intro'},h('div',{},h('span',{className:'eyebrow'},'EGY KIS GYAKORLÁS, A SAJÁT TEMPÓDBAN'),h('h1',{},'Ma mire ',h('em',{},'figyelsz?')),h('p',{},'Válassz egy játékot. Állítsd magadra. Kezdődhet.')),h('div',{className:'intro-badge'},h('strong',{},'10'),h('span',{},'rövid',h('br'),'gyakorlat'))),h('section',{className:'start-strip'},h('div',{className:'start-strip-label'},h('span',{className:'tiny-star','aria-hidden':'true'},'✳'),h('div',{},h('span',{className:'eyebrow'},last?'FOLYTASD EGY ÚJ KÖRREL':'EGY JÓ KEZDÉS'),h('h2',{},featured.title))),h('p',{},last?'A legutóbbi beállításaiddal, friss feladattal.':'Jegyezz meg egy rövid számsort. Indulj öt számjeggyel.'),h('a',{className:'primary-button light-button',href:linkFor(featured,last?.settings||normalizeSettings())},'Kipróbálom',h('span',{'aria-hidden':'true'},'↗'))),h('div',{className:'catalog-top'},h('div',{className:'filter-list','aria-label':'Játékkategóriák'},filters),countLabel),grid,h('section',{className:'practice-note'},h('span',{className:'note-icon','aria-hidden':'true'},'◎'),h('div',{},h('h2',{},stats.rounds?'Már van mire visszanézned.':'Találd meg a saját ritmusod.'),h('p',{},stats.rounds?`${stats.rounds} befejezett kör, ${stats.games} kipróbált játék. Az eredményeid segítenek a következő szint kiválasztásában.`:'Kezdd több megjegyzési idővel. Ha már könnyen megy, növeld az elemszámot vagy csökkentsd az időt.')),stats.rounds?h('a',{href:'#/eredmenyek',className:'text-link'},'Eredményeim →'):null)),'home');
}

function renderSetup(game,settings){
  settingsDraft={gameId:game.id,settings:normalizeSettings(settings)};
  if(game.maxCount)settingsDraft.settings.count=Math.min(settingsDraft.settings.count,game.maxCount);
  const s=settingsDraft.settings;
  const count=h('select',{id:'setting-count'},Array.from({length:(game.maxCount||8)-2},(_,i)=>h('option',{value:String(i+3),selected:i+3===s.count},String(i+3))));
  const seconds=h('input',{id:'setting-seconds',type:'range',min:'3',max:'30',step:'1',value:String(s.seconds)});
  const secondsValue=h('output',{for:'setting-seconds'},`${s.seconds} mp`);
  const reverse=h('input',{id:'setting-reverse',type:'checkbox',checked:s.reverse});
  const get=()=>normalizeSettings({...s,count:Number(count.value),seconds:Number(seconds.value),reverse:reverse.checked});
  seconds.addEventListener('input',()=>{s.seconds=Number(seconds.value);secondsValue.textContent=`${s.seconds} mp`;});
  count.addEventListener('change',()=>{s.count=Number(count.value);});reverse.addEventListener('change',()=>{s.reverse=reverse.checked;});
  const difficultyButtons=Object.entries(difficultyNames).map(([value,label])=>h('button',{className:`level-button ${s.difficulty===value?'active':''}`,'aria-pressed':String(s.difficulty===value),onClick:()=>{
    s.difficulty=value;const preset={easy:{count:4,seconds:15},normal:{count:5,seconds:10},hard:{count:7,seconds:5}}[value];s.count=Math.min(preset.count,game.maxCount||8);s.seconds=preset.seconds;count.value=String(s.count);seconds.value=String(s.seconds);secondsValue.textContent=`${s.seconds} mp`;difficultyButtons.forEach((b,i)=>{const on=Object.keys(difficultyNames)[i]===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  }},label));
  const share=h('button',{className:'secondary-button',onClick:()=>shareSettings(game,get())},'Gyakorlatlink másolása');
  const start=h('button',{className:'primary-button start-button',onClick:()=>startGame(game,get())},'Gyakorlat indítása',h('span',{'aria-hidden':'true'},'→'));
  shell(h('div',{},h('a',{href:'#/',className:'back-link'},'← Gyakorlatok'),h('div',{className:'setup-layout'},h('section',{className:'setup-info'},mini(game,true),h('span',{className:'eyebrow'},game.tag),h('h1',{},game.title),h('p',{className:'setup-description'},game.description),h('ol',{className:'steps'},game.steps.map((text,i)=>h('li',{},h('span',{},String(i+1)),text)))),h('section',{className:'settings-panel','aria-label':'Gyakorlat beállításai'},h('span',{className:'eyebrow'},'AHOGY NEKED JÓ'),h('h2',{},'Állítsd magadra'),h('p',{className:'muted'},game.id==='path'?'A lejátszás után lesz időd nyugodtan válaszolni.':'A megjegyzés után lesz időd nyugodtan válaszolni.'),h('div',{className:'field'},h('span',{className:'field-label'},'Kiinduló szint'),h('div',{className:'level-buttons'},difficultyButtons)),!game.noCount?h('div',{className:'field inline-field'},h('label',{for:'setting-count'},game.countLabel),count):null,h('div',{className:'field'},h('div',{className:'inline-field'},h('label',{for:'setting-seconds'},game.id==='path'?'Lejátszási idő':'Megjegyzési idő'),secondsValue),seconds,h('div',{className:'range-labels'},h('span',{},'3 mp'),h('span',{},'30 mp'))),game.reverse?h('label',{className:'check-label',for:'setting-reverse'},reverse,'Fordított sorrendben kérem'):null,start,share,h('p',{className:'settings-footnote'},'A link a beállításokat viszi tovább. Az eredményeidet nem osztja meg.')))),'game');
}
async function shareSettings(game,settings){
  const url=new URL(location.href);url.hash=linkFor(game,settings).slice(1);
  try {await navigator.clipboard.writeText(url.href);toast('A gyakorlatlink a vágólapon van.');}
  catch {const dialog=h('dialog',{className:'share-dialog'},h('h2',{},'A gyakorlat linkje'),h('p',{},'Ezt a linket másold ki és küldd tovább.'),h('input',{className:'share-url',value:url.href,readOnly:true,'aria-label':'Megosztható gyakorlatlink'}),h('button',{className:'primary-button',onClick:()=>dialog.close()},'Bezárom'));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();dialog.querySelector('input').select();}
}

async function startGame(game,rawSettings){
  stop();const token=generation;const settings=normalizeSettings(rawSettings);if(game.maxCount)settings.count=Math.min(settings.count,game.maxCount);
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
  shell(h('div',{className:'play-page'},h('div',{className:'play-top'},h('button',{className:'back-link',onClick:()=>{stop();renderSetup(game,settings);}},'← Beállítások'),h('span',{className:`game-category ${game.color}`},game.title),pause),h('section',{className:'play-panel'},h('div',{className:'phase-heading'},phaseTitle,phaseText),timerWrap,root,h('div',{className:'ready-row'},ready),overlay),h('div',{className:'play-caption'},h('span',{},difficultyNames[settings.difficulty]),h('span',{},`${settings.seconds} mp ${game.id==='path'?'lejátszás':'megjegyzés'}`),h('span',{},'Időkorlát nélküli válaszadás'))),'game');
  try{
    const library=modules[game.module]||(modules[game.module]=await modulesByName[game.module]());
    if(token!==generation||disposed)return;
    if(!library[game.id]?.mount)throw new Error('A gyakorlat nem érhető el.');
    const ctx={root,settings,rand:Math.random,h,phase(title,subtitle){if(disposed)return;phaseTitle.textContent=title;phaseText.textContent=subtitle||'';announce(title);},delay(fn,ms){const t=setTimeout(()=>{timers.delete(t);if(!disposed)fn();},ms);timers.add(t);return t;},memorize(callback,{onProgress,allowSkip=true}={}){
      if(disposed)return;countdown?.cancel();timerWrap.hidden=false;ready.hidden=!allowSkip;pause.hidden=false;
      countdown=createCountdown(settings.seconds,{onTick:left=>{timerText.textContent=`${Math.ceil(left)} mp`;timerFill.style.width=`${Math.max(0,left/settings.seconds*100)}%`;onProgress?.(Math.min(1,Math.max(0,1-left/settings.seconds)));},onDone:()=>{if(disposed)return;countdown=null;timerWrap.hidden=true;ready.hidden=true;pause.hidden=true;overlay.hidden=true;root.inert=false;phaseTitle.focus({preventScroll:true});callback();}});
      if(document.hidden)setPaused(true);
    },done(result){if(disposed||token!==generation)return;const normalized=normalizeResult(result);const entry={...normalized,gameId:game.id,at:new Date().toISOString(),settings,duration:Math.round((performance.now()-started)/1000)};dispose();active=null;history=[...history,entry].slice(-200);let saved=true;try{saveHistory(localStorage,history);}catch{saved=false;}renderResult(game,settings,entry,saved);}};
    gameCleanup=library[game.id].mount(ctx);
  }catch(error){if(disposed)return;dispose();active=null;root.replaceChildren(h('div',{className:'error-state'},h('h2',{},'Most nem sikerült elindítani'),h('p',{},'Próbáld újra. Az eddigi eredményeid megmaradnak.'),h('button',{className:'primary-button',onClick:()=>startGame(game,settings)},'Újrapróbálom')));phaseTitle.textContent='Egy kis fennakadás';phaseText.textContent='';console.error('Game could not start',error);}
}

function renderResult(game,settings,result,saved){
  const message=result.percent===100?'Minden a helyére került.':result.percent>=60?'Szép kör volt.':'Minden kör egy új lehetőség.';
  const details=result.details.length?h('details',{className:'result-details'},h('summary',{},'Válaszok áttekintése'),h('div',{className:'answer-details'},result.details.map(d=>h('div',{className:`answer-detail ${d.correct?'correct':'incorrect'}`},h('span',{className:'detail-mark','aria-label':d.correct?'Helyes':'Eltérő'},d.correct?'✓':'↺'),h('div',{},h('strong',{},d.label),h('p',{},`A válaszod: ${d.actual||'–'}`),!d.correct?h('p',{},`Megoldás: ${d.expected}`):null))))):null;
  shell(h('section',{className:'result-panel'},h('span',{className:'eyebrow'},`${game.title.toLocaleUpperCase('hu')} · KÖR TELJESÍTVE`),h('div',{className:'score-ring',style:{'--score':`${result.percent}%`}},h('span',{},h('strong',{},result.percent),h('span',{},'%'))),h('h1',{},message),h('p',{className:'result-summary'},`${result.correct} / ${result.total} helyes válasz`),result.summary?h('p',{className:'muted'},result.summary):null,h('p',{className:saved?'saved-note':'input-error'},saved?'✓ Az eredményt elmentettük ezen az eszközön.':'Az eredmény most nem menthető a böngészőben.'),details,h('div',{className:'result-actions'},h('button',{className:'primary-button',onClick:()=>startGame(game,settings)},'Újra játszom'),h('a',{className:'secondary-button',href:'#/'},'Másik gyakorlat')),h('div',{className:'result-links'},h('button',{className:'text-link',onClick:()=>renderSetup(game,settings)},'Beállítások módosítása'),h('a',{className:'text-link',href:'#/eredmenyek'},'Összes eredmény'))),'game');announce(`${result.correct} helyes válasz ${result.total} közül.`);
}
function renderHistory(){
  settingsDraft=null;const stats=historyStats(history);
  const summary=h('div',{className:'stats-grid'},[['Befejezett kör',stats.rounds],['Kipróbált játék',`${stats.games} / 10`],['Helyes válaszok',stats.percent===null?'–':`${stats.percent}%`]].map(([label,value])=>h('div',{className:'stat'},h('span',{},label),h('strong',{},value))));
  const rows=history.length?h('div',{className:'history-list'},[...history].reverse().slice(0,30).map(entry=>{const game=games.find(g=>g.id===entry.gameId);return h('a',{className:'history-row',href:linkFor(game,entry.settings),'aria-label':`${game.title}, ${entry.correct}/${entry.total}, új kör indítása a beállításokkal`},h('span',{className:`history-symbol ${game.color}`},game.title[0]),h('div',{className:'history-title'},h('strong',{},game.title),h('span',{},new Date(entry.at).toLocaleString('hu-HU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))),h('span',{className:'history-level'},difficultyNames[entry.settings.difficulty]),h('strong',{className:'history-score'},`${entry.correct} / ${entry.total}`),h('span',{className:'history-percent'},`${entry.percent}%`));})):h('div',{className:'empty-state'},h('span',{className:'empty-symbol','aria-hidden':'true'},'◎'),h('h2',{},'Az első kör még előtted van.'),h('p',{},'Játssz egyet, és itt megtalálod az eredményed.'),h('a',{className:'primary-button',href:'#/'},'Választok egy játékot'));
  shell(h('div',{},h('section',{className:'intro compact'},h('div',{},h('span',{className:'eyebrow'},'A SAJÁT UTAD'),h('h1',{},'Egy kis ',h('em',{},'visszatekintés.')),h('p',{},'Az eredmények a gyakorlást követik. Nem képességvizsgálati pontszámok.'))),summary,h('div',{className:'section-title'},h('h2',{},'Legutóbbi körök'),history.length?h('button',{className:'text-link',onClick:confirmClear},'Előzmények törlése'):null),rows,h('p',{className:'privacy-note'},'Legfeljebb 200 kört őrzünk meg ezen a böngészőn. Másik eszközön ezek nem jelennek meg.')),'history');
}
function confirmClear(){const dialog=h('dialog',{className:'confirm-dialog'},h('h2',{},'Törlöd az előzményeket?'),h('p',{},'Az ezen a böngészőn mentett játékere­dmények eltűnnek. A játékokat bármikor újrakezdheted.'),h('div',{className:'answer-row'},h('button',{className:'secondary-button',onClick:()=>dialog.close()},'Mégsem'),h('button',{className:'primary-button',onClick:()=>{try{clearHistory(localStorage);}catch{toast('A mentett adatokat most nem sikerült törölni.');dialog.close();return;}history=[];dialog.close();renderHistory();}},'Igen, törlöm')));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();}
function renderRoute(){stop();document.querySelectorAll('dialog').forEach(d=>d.remove());const route=parseRoute(location.hash,ids);if(route.page==='history')renderHistory();else if(route.page==='game')renderSetup(games.find(g=>g.id===route.id),route.settings);else renderHome();}
window.addEventListener('hashchange',renderRoute);
window.addEventListener('pagehide',event=>{if(!event.persisted)stop();});
renderRoute();

// Optional structured navigation uses the same actions as the visible interface.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
  register({name:'list_memory_games',title:'Memóriajátékok listája',description:'List the available games and the current visible session. Does not expose answers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({games:games.map(g=>({id:g.id,title:g.title,category:g.category})),current:active?{gameId:active.game.id,stage:active.stage}:parseRoute(location.hash,ids)})});
  register({name:'configure_memory_game',title:'Gyakorlat beállítása',description:'Open the visible setup page for a memory game; does not start a round or save a result.',inputSchema:{type:'object',properties:{gameId:{type:'string',enum:ids},count:{type:'integer',minimum:3,maximum:8},seconds:{type:'integer',minimum:3,maximum:30}},required:['gameId'],additionalProperties:false},execute:input=>{if(!input||!ids.includes(input.gameId)||Object.keys(input).some(k=>!['gameId','count','seconds'].includes(k))||['count','seconds'].some(k=>input[k]!==undefined&&(!Number.isInteger(input[k])||input[k]<(k==='count'?3:3)||input[k]>(k==='count'?8:30))))throw new Error('Invalid game or settings');const game=games.find(g=>g.id===input.gameId),settings=normalizeSettings(input);stop();window.history.replaceState(null,'',linkFor(game,settings));renderSetup(game,settings);return {gameId:game.id,settings:settingsDraft.settings,page:'setup'};}});
  window.addEventListener('pagehide',event=>{if(!event.persisted)lifecycle.abort();});
}
