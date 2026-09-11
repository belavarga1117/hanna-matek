import { MODE_DEFINITIONS, normalizeConfig } from './engine.js';
import { createNbackSettings } from './settings-ui.js';

const VIEW_KEY = 'memoria.nback.setup-view.v1';
const STARTER_IDS = [10, 11, 2, 20, 7, 24];
const NAMES = {10:'Helyek nyomában',11:'Hallgasd a betűt',2:'Hely és hang',3:'Hely, szín és hang',7:'Számolj fejben',8:'Számok és helyek',9:'Számok, helyek és színek',4:'Betűből hang, hangból betű',5:'Keresztegyezés és hely',6:'Keresztegyezés, hely és szín',12:'Keresztegyezés és szín',100:'Betűhang és zongora'};
const CHANNELS = {
  position1:{name:'Hely',icon:'grid',question:'Ugyanott jelenik meg a jel?'},
  color:{name:'Szín',icon:'color',question:'Ugyanazt a színt látod?'},
  image:{name:'Ábra',icon:'shape',question:'Ugyanazt az ábrát látod?'},
  audio:{name:'Betűhang',icon:'sound',question:'Ugyanazt a betűt hallod?'},
  audio2:{name:'Zongorahang',icon:'piano',question:'Ugyanazt a zongorahangot hallod?'},
  arithmetic:{name:'Számolás',icon:'math',question:'Számolj a korábbi és a mostani számmal.'},
};

export const EXPLORER_MODES = Object.freeze(MODE_DEFINITIONS.map(mode => {
  const cross = mode.family === 'combination';
  const keys = mode.channels.filter(key => CHANNELS[key]);
  const words = keys.map(key => ({position1:'hely',color:'szín',image:'ábra',audio:keys.includes('audio2')?'betűhang':'hang',audio2:'zongorahang'})[key]);
  const title = NAMES[mode.id] || `${words.slice(0,-1).join(', ')} és ${words.at(-1)}`.replace(/^./, c => c.toLocaleUpperCase('hu'));
  const description = cross ? 'A látott és a hallott betűt önmagával és egymással is összehasonlítod.'
    : mode.family === 'arithmetic' ? (mode.id === 7 ? 'Emlékezz a korábbi számra, és számolj vele.' : `Számolás közben ${mode.id === 8 ? 'a jel helyét is figyeled' : 'a jel helyét és színét is figyeled'}.`)
    : keys.map(key => CHANNELS[key].question).join(' ');
  const tone = cross ? 'rose' : mode.family === 'arithmetic' ? 'peach' : mode.family === 'dual-audio' ? 'blue' : keys.includes('audio') ? 'lilac' : 'mint';
  return Object.freeze({...mode,title,referenceTitle:mode.title,keys,cross,description,tone});
}));

const FILTERS = [
  {id:'start',label:'Kezdéshez',intro:'Egy jó első lépés',description:'Kezdj egyetlen megfigyeléssel, aztán próbálj két dolgot együtt.',match:mode=>STARTER_IDS.includes(mode.id)},
  {id:'standard',label:'Helyek, képek, hangok',intro:'Figyeld, mi ismétlődik',description:'A helyet, a színt, az ábrát és a kimondott betűt külön-külön követed.',match:mode=>['standard','single'].includes(mode.family)},
  {id:'arithmetic',label:'Számolás',intro:'Emlékezz, és számolj',description:'A korábbi számmal és a mostanival végzed el a jelzett műveletet.',match:mode=>mode.family==='arithmetic'},
  {id:'combination',label:'Keresztegyezés',intro:'Kapcsold össze a látottat és a hallottat',description:'Itt az is egyezés lehet, ha a most látott betűt korábban hallottad.',match:mode=>mode.cross},
  {id:'dual-audio',label:'Kétféle hang',intro:'Két hang, két külön emlék',description:'Egy kimondott betűt és egy zongorahangot követsz, egymástól függetlenül.',match:mode=>mode.family==='dual-audio'},
  {id:'all',label:'Mind a 28',intro:'Az összes feladat',description:'Ugyanaz a játékcsalád, más-más megfigyelni valóval.',match:()=>true},
];

const PATHS = {
  grid:'M3 3h6v6H3z M15 3h6v6h-6z M3 15h6v6H3z M15 15h6v6h-6z',
  sound:'M4 9v6h4l5 4V5L8 9H4 M17 8c3 2 3 6 0 8 M20 5c5 4 5 10 0 14',
  color:'M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12z',
  shape:'M12 3 22 20H2Z',piano:'M3 4h18v16H3z M9 4v16 M15 4v16 M7 4v8 M13 4v8 M19 4v8',
  math:'M4 7h7 M7.5 3.5v7 M15 7h6 M4 17h7 M15 15h6 M15 19h6',
  cross:'M3 6h5l8 12h5 M17 14l4 4-4 4 M3 18h5L16 6h5 M17 2l4 4-4 4',
  arrow:'M5 12h14 M13 6l6 6-6 6',search:'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  close:'m6 6 12 12 M6 18 18 6',spark:'m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z',
};

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  for (const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(key,value);
  const path = document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',PATHS[name] || PATHS.spark);svg.append(path);return svg;
}
function loadCss() {
  if(document.querySelector('link[data-nback-explorer-css]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./explorer.css',import.meta.url).href;link.dataset.nbackExplorerCss='true';document.head.append(link);
}
const normalizedText = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu');

function artwork(h,mode,{alternate=false,labeled=false}={}) {
  const has=key=>mode.keys.includes(key);
  const token=h('span',{className:`nx-token ${has('color')?'nx-token-color':''}`},has('image')?(alternate?'◆':'●'):has('arithmetic')?(alternate?'2':'4'):'');
  const grid=has('position1')?h('div',{className:'nx-mini-grid'},Array.from({length:9},(_,i)=>h('span',{className:`nx-mini-cell ${i===4?'nx-mini-center':''}`},i===(alternate?7:2)?token:null))):null;
  const sound=has('audio')?h('div',{className:'nx-sound'},icon('sound'),h('span',{className:'nx-wave'},[10,22,33,18,28,12,23].map(height=>h('i',{style:{height:`${height}px`}}))),labeled?h('small',{},`Hallod: „${alternate?'B':'A'}”`):null):null;
  const piano=has('audio2')?h('div',{className:'nx-piano'},Array.from({length:7},(_,i)=>h('i',{className:i===(alternate?4:2)?'is-note':''})),labeled?h('small',{},alternate?'Másik zongorahang':'Egy zongorahang'):null):null;
  const math=has('arithmetic')&&!grid?h('div',{className:'nx-math'},h('span',{},alternate?'2':'4'),h('span',{className:'nx-math-op'},'+')):null;
  const visual=!grid&&!math&&!mode.cross&&(has('image')||has('color'))?h('div',{className:'nx-visual'},token,has('color')?h('span',{className:'nx-palette'},h('i'),h('i'),h('i')):null):null;
  const cross=mode.cross?h('div',{className:'nx-cross'},h('span',{className:'nx-letter'},alternate?'B':'A'),icon('cross'),h('span',{className:'nx-cross-sound'},icon('sound'),labeled?h('small',{},'A'):null)):null;
  return h('div',{className:`nx-art nx-tone-${mode.tone} ${has('color')?'nx-art-has-color':''} ${alternate?'nx-art-alternate':''}`,'aria-hidden':String(!labeled)},
    grid,visual,math,cross,h('div',{className:'nx-audio-stack'},mode.cross?null:sound,piano),
    has('color')&&(grid||mode.cross)?h('span',{className:'nx-art-color-note'},h('i'),h('i'),h('i')):null,
    has('arithmetic')&&grid?h('span',{className:'nx-operation-badge'},'+'):null);
}

function channelBadges(h,mode) {
  return h('div',{className:'nx-channels'},mode.cross?h('span',{},icon('cross'),'Keresztegyezés'):null,
    mode.keys.filter(key=>!mode.cross||key!=='audio').map(key=>h('span',{},icon(CHANNELS[key].icon),CHANNELS[key].name)));
}

/** A discovery layer only: all game settings, validation and launch paths remain canonical. */
export function createNbackExplorer({h,value,onChange=()=>{},onStart,onShare,onError=()=>{}}) {
  loadCss();
  let current=normalizeConfig(value),filter='start',query='',view='classic';
  let syncDetail=()=>{},refreshCards=()=>{},returnFocus=null;
  try{if(localStorage.getItem(VIEW_KEY)==='modern')view='modern';}catch{}
  const settings=createNbackSettings({h,value:current,onChange:next=>{current=next;onChange(next);syncDetail();refreshCards();}});
  const classicSlot=h('div');
  const classic=h('section',{className:'nx-classic','aria-label':'Klasszikus N-back beállítások'},
    h('div',{className:'nx-classic-intro'},h('span',{className:'eyebrow'},'BRAIN WORKSHOP FELADATCSALÁD'),h('h1',{},'N-back Műhely'),h('p',{},'A megszokott nézet, minden beállítással.')),
    h('div',{className:'settings-panel'},h('h2',{},'Válaszd ki a módot'),classicSlot,
      h('button',{className:'primary-button start-button',onClick:()=>launch()},'N-back indítása'),
      h('button',{className:'secondary-button',onClick:()=>share()},'Gyakorlatlink másolása')));

  const dialog=h('dialog',{className:'nx-dialog','aria-labelledby':'nx-detail-title'});
  const modern=h('section',{className:'nx-modern','aria-label':'Modernizált N-back feladatválasztó'});
  const tabButtons=['classic','modern'].map((id,i)=>h('button',{type:'button',role:'tab',id:`nx-tab-${id}`,'aria-controls':`nx-panel-${id}`,onClick:()=>setView(id)},i===0?'Klasszikus':'Modernizált',i===1?icon('spark'):null));
  const tabbar=h('div',{className:'nx-view-tabs',role:'tablist','aria-label':'N-back nézet'},tabButtons);
  tabbar.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const id=event.key==='Home'?'classic':event.key==='End'?'modern':view==='classic'?'modern':'classic';setView(id);tabButtons[id==='classic'?0:1].focus();});
  const element=h('div',{className:'nx-workshop'},h('div',{className:'nx-toolbar'},h('a',{href:'#/',className:'back-link'},'← Gyakorlatok'),tabbar),classic,modern,dialog);
  for(const [panel,id] of [[classic,'classic'],[modern,'modern']]){panel.id=`nx-panel-${id}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`nx-tab-${id}`);}

  function getValue(){return settings.getValue();}
  function setValue(next){const normalized=normalizeConfig(next);settings.setValue(normalized);current=getValue();onChange(current);syncDetail();refreshCards();}
  function launch(){try{const config=getValue();dialog.close();onStart(config);}catch(error){onError(error.message);}}
  function share(){try{onShare(getValue());}catch(error){onError(error.message);}}
  function setView(next){
    if(dialog.open)dialog.close();view=next;classic.hidden=next!=='classic';modern.hidden=next!=='modern';
    tabButtons.forEach((button,i)=>{const selected=(i===0?'classic':'modern')===next;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});
    if(next==='classic')classicSlot.append(settings.element);
    try{localStorage.setItem(VIEW_KEY,next);}catch{}
  }
  function candidate(mode){
    try {
      const next={...getValue(),mode:mode.id};
      if(!next.selfPaced&&(mode.keys.includes('audio')||mode.keys.includes('audio2')||mode.keys.includes('arithmetic')))next.intervalMs=Math.max(1200,next.intervalMs);
      return {config:normalizeConfig(next)};
    }catch(error){return {reason:error.message.replace(/^Hibás N-back beállítás: /,'')};}
  }

  const beginner=EXPLORER_MODES.find(mode=>mode.id===10);
  const starterButton=h('button',{className:'nx-primary',onClick:()=>{
    setValue(normalizeConfig({mode:10,n:1,trialCount:8,selfPaced:true,adaptive:false}));openMode(beginner,starterButton);
  }},'Ezzel kezdem',icon('arrow'));
  modern.append(h('header',{className:'nx-heading'},h('div',{},h('span',{className:'nx-eyebrow'},'N-BACK MŰHELY'),h('h1',{},'Mire figyelnél ',h('em',{},'ma?')),h('p',{},'Helyek, hangok, színek. Találd meg a neked való feladatot, és haladj a saját tempódban.')),
    h('div',{className:'nx-collection-mark','aria-label':'28 feladat, egy műhely'},h('strong',{},'28'),h('span',{},'feladat',h('br'),'egy műhelyben'))));
  modern.append(h('section',{className:'nx-start'},h('div',{className:'nx-start-art'},artwork(h,beginner),h('span',{className:'nx-floating-match'},'✓ Ugyanott!')),
    h('div',{className:'nx-start-copy'},h('span',{className:'nx-eyebrow'},'MOST PRÓBÁLOD ELŐSZÖR?'),h('h2',{},'Kezdd egyetlen megfigyeléssel.'),h('p',{},'Figyeld, hol villan fel a jel. Ha ugyanott, mint az előző lépésben, jelezz.'),h('div',{className:'nx-start-facts'},h('span',{},'1-back'),h('span',{},'8 értékelt lépés'),h('span',{},'Saját tempó'))),starterButton));

  const filterButtons=FILTERS.map(item=>h('button',{type:'button',className:'nx-filter','aria-pressed':String(filter===item.id),onClick:()=>{filter=item.id;renderCards();}},item.label));
  const search=h('input',{type:'search',placeholder:'Pl. szín, hang, számolás','aria-label':'Feladat keresése'});
  search.addEventListener('input',()=>{query=search.value;renderCards();});
  const resultTitle=h('h2'),resultDescription=h('p'),resultCount=h('span',{className:'nx-result-count',role:'status'});
  const cards=h('div',{className:'nx-card-grid'});
  modern.append(h('div',{className:'nx-browse-heading'},h('h2',{},'Fedezd fel a feladatokat'),h('label',{className:'nx-search'},icon('search'),search)),
    h('div',{className:'nx-filters','aria-label':'Feladatcsoportok'},filterButtons),h('div',{className:'nx-section-heading'},h('div',{},resultTitle,resultDescription),resultCount),cards,
    h('aside',{className:'nx-explainer'},h('span',{className:'nx-explainer-icon'},'N'),h('div',{},h('h3',{},'Mit jelent az N-back?'),h('p',{},'Az 1-backben az előző, a 2-backben a kettővel korábbi jelhez hasonlítasz. Kezdd 1-gyel; a több megfigyelni való önmagában is új kihívás.'))));

  function renderCards(){
    const selected=FILTERS.find(item=>item.id===filter),term=normalizedText(query.trim());
    const visible=EXPLORER_MODES.filter(mode=>selected.match(mode)&&(!term||normalizedText(`${mode.title} ${mode.referenceTitle} ${mode.description} ${mode.keys.map(key=>CHANNELS[key].name).join(' ')}`).includes(term)));
    if(filter==='start')visible.sort((a,b)=>STARTER_IDS.indexOf(a.id)-STARTER_IDS.indexOf(b.id));
    resultTitle.textContent=selected.intro;resultDescription.textContent=selected.description;resultCount.textContent=`${visible.length} feladat`;
    filterButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(FILTERS[i].id===filter)));
    cards.replaceChildren(...visible.map(mode=>{
      const {reason}=candidate(mode);
      const button=h('button',{type:'button',className:'nx-card-button',dataset:{explorerMode:String(mode.id)},'aria-label':`Megnézem: ${mode.title}`},
        h('div',{className:'nx-card-art'},artwork(h,mode),h('span',{className:'nx-load-label'},mode.cross?`${mode.channels.length} féle egyezés`:`${mode.keys.length} megfigyelés`)),
        h('div',{className:'nx-card-body'},h('h3',{},mode.title),h('p',{},mode.description),channelBadges(h,mode),
          h('div',{className:'nx-card-bottom'},h('span',{},mode.referenceTitle),h('strong',{},'Megnézem',icon('arrow')))));
      button.addEventListener('click',()=>openMode(mode,button));
      // Incompatible modes stay discoverable. The detail explains the conflict and never launches it.
      if(reason)button.append(h('span',{className:'nx-constraint-note'},'Más haladó beállítást igényel'));
      return h('article',{className:`nx-card ${Number(current.mode)===mode.id?'nx-card-selected':''}`},button);
    }));
    if(!visible.length)cards.append(h('div',{className:'nx-empty'},h('h3',{},'Ilyen feladat nincs ebben a csoportban.'),h('p',{},'Próbálj egy másik szót, vagy nézz körül az összes feladat között.'),h('button',{className:'nx-secondary',onClick:()=>{filter='all';query='';search.value='';renderCards();}},'Mutasd mind a 28-at')));
  }
  refreshCards=renderCards;

  function openMode(mode,opener){
    const selected=candidate(mode);returnFocus=opener;
    if(selected.config)setValue(selected.config);
    const conflict=h('p',{className:'nx-conflict',role:'alert',hidden:!selected.reason},selected.reason?`Ezzel a beállítással még nem választható: ${selected.reason} A haladó beállításokban tudod feloldani.`:'');
    const close=h('button',{className:'nx-close','aria-label':'Feladat részleteinek bezárása',onClick:()=>dialog.close()},icon('close'));
    const nInput=h('input',{type:'number',min:1,max:20,step:1,'aria-label':'Hány lépéssel korábbira emlékezel?'});
    const nHelp=h('p',{className:'nx-help'});
    const length=h('select',{'aria-label':'Kör hossza'},[8,20,40].map(n=>h('option',{value:String(n)},`${n} lépés${n===8?' · rövid kör':n===20?' · szokásos kör':''}`)));
    const pace=h('select',{'aria-label':'Játék tempója'},h('option',{value:'self'},'Saját tempó · én léptetek'),h('option',{value:'4000'},'Nyugodt · 4 másodperc'),h('option',{value:'3000'},'Szokásos · 3 másodperc'));
    const auto=h('input',{type:'checkbox'});
    const quickError=h('p',{className:'nx-conflict',role:'alert',hidden:true});
    function change(patch){try{setValue({...getValue(),...patch});quickError.hidden=true;syncDetail();}catch(error){quickError.textContent=error.message;quickError.hidden=false;start.disabled=true;}}
    nInput.addEventListener('input',()=>change({n:Number(nInput.value)}));
    length.addEventListener('change',()=>change({trialCount:Number(length.value)}));
    pace.addEventListener('change',()=>change({selfPaced:pace.value==='self',...(pace.value==='self'?{}:{intervalMs:Number(pace.value)})}));
    auto.addEventListener('change',()=>change({adaptive:auto.checked}));
    const advancedSlot=h('div',{className:'nx-advanced-slot'});
    const advanced=h('details',{className:'nx-advanced'},h('summary',{},'Minden beállítás',h('span',{},'Változó N, több tárgy, műveletek…')),advancedSlot);
    advancedSlot.append(settings.element);
    if(selected.reason)advanced.open=true;
    const start=h('button',{className:'nx-primary',onClick:()=>{
      // Read the visible quick controls as well, so a last edit is never lost on launch.
      change({n:Number(nInput.value),trialCount:Number(length.value),selfPaced:pace.value==='self',...(pace.value==='self'?{}:{intervalMs:Number(pace.value)}),adaptive:auto.checked});
      if(quickError.hidden&&Number(current.mode)===mode.id)launch();
    }},'Kezdődhet a játék',icon('arrow'));
    const summary=h('p',{className:'nx-launch-summary'});
    syncDetail=()=>{
      nInput.value=String(current.n);nHelp.textContent=current.variable?`A visszalépés változik, legfeljebb ${current.n} lépés lehet.`:current.crab?`${current.n} elemű blokkokat hasonlítasz össze, fordított sorrendben.`:current.n===1?'Az előző lépéshez hasonlítasz.':`A ${current.n} lépéssel korábbi jelhez hasonlítasz.`;
      const setChoice=(control,val,label)=>{control.querySelector('[data-custom]')?.remove();if(![...control.options].some(option=>option.value===String(val)))control.append(h('option',{value:String(val),dataset:{custom:'true'}},label));control.value=String(val);};
      setChoice(length,current.trialCount,`${current.trialCount} lépés · egyéni`);setChoice(pace,current.selfPaced?'self':current.intervalMs,`${Number(current.intervalMs)/1000} másodperc · egyéni`);
      auto.checked=!!current.adaptive;nInput.disabled=false;length.disabled=current.scoreProfile==='jaeggi';pace.disabled=current.scoreProfile==='jaeggi';
      let valid=true;try{getValue();}catch{valid=false;}
      const isSelected=Number(current.mode)===mode.id;
      start.disabled=!valid||!isSelected||!quickError.hidden;
      conflict.hidden=isSelected;
      if(!isSelected)conflict.textContent='A kiválasztott haladó szabályok másik feladathoz tartoznak. Módosítsd őket, majd válaszd ezt a feladatot a Feladattípus mezőben.';
      const modifiers=[current.variable?'változó N':null,current.crab?'fordított blokkok':null,current.multiStim>1?`${current.multiStim} tárgy`:null,current.scoreProfile==='jaeggi'?'Jaeggi-pontozás':null].filter(Boolean);
      summary.textContent=isSelected?`${current.n}-back · ${current.trialCount} értékelt + ${current.n} bemelegítő lépés · ${current.selfPaced?'saját tempó':`${current.intervalMs/1000} mp/lépés`}${modifiers.length?' · '+modifiers.join(' · '):''}`:'Válaszd ki ezt a feladattípust a beállításokban.';
    };
    let alternate=false;
    const example=h('div',{className:'nx-example'});
    const exampleButton=h('button',{className:'nx-example-next',onClick:()=>{alternate=!alternate;renderExample();}},'Másik példa ↻');
    function renderExample(){
      const first=artwork(h,mode,{labeled:true});
      const second=artwork(h,mode,{alternate,labeled:true});
      let answer=alternate?'Most más a jel. Ezekre ne jelezz.':'Ugyanaz a jel: jelöld az egyező csatornákat.';
      if(mode.cross){answer=alternate?'A most látott B nem egyezik a korábbi A-val. A hallott A egyezik a korábbi látott és hallott A-val.':'Az A betű látva és hallva is ismétlődik: mind a négy betűegyezést jelöld.';if(mode.keys.includes('position1')||mode.keys.includes('color'))answer+=alternate?' A hely és a szín változását külön figyeld.':' A további egyező csatornákat is jelöld.';}
      if(mode.family==='arithmetic')answer=alternate?'A korábbi 4 plusz a mostani 2: írd be, hogy 6.':'A korábbi 4 plusz a mostani 4: írd be, hogy 8.';
      if(mode.family==='arithmetic'&&mode.keys.length>1)answer+=alternate?` A ${mode.keys.includes('color')?'hely és a szín':'hely'} változását külön figyeld.`:` A ${mode.keys.includes('color')?'hely és a szín':'hely'} egyezését külön is jelöld.`;
      example.replaceChildren(h('div',{className:'nx-example-pair'},h('div',{},h('span',{className:'nx-example-label'},'Előző lépés'),first),h('span',{className:'nx-example-arrow'},icon('arrow')),h('div',{},h('span',{className:'nx-example-label'},'Most'),second)),h('p',{className:'nx-example-answer'},answer));
    }
    renderExample();
    dialog.replaceChildren(h('div',{className:'nx-detail-top'},h('div',{},h('span',{className:'nx-eyebrow'},mode.referenceTitle),h('h2',{id:'nx-detail-title'},mode.title)),close),
      h('div',{className:'nx-detail-columns'},h('section',{className:'nx-explanation'},channelBadges(h,mode),h('p',{className:'nx-detail-description'},mode.description),
        h('div',{className:'nx-example-heading'},h('h3',{},'Az alapfeladat 1-backben'),exampleButton),example,
        h('p',{className:'nx-demo-note'},'Szemléltető alaphelyzet, haladó módosítók nélkül. A hangot itt felirat jelzi; a játékban hallani fogod.'),
        h('div',{className:'nx-one-rule'},icon('spark'),h('p',{},mode.cross?'Minden egyezést külön jelezhetsz. A hangot és a látott betűt egymással is összeveted.':mode.family==='arithmetic'?'Az első szám mindig a korábbi, a második a mostani. A műveletet az aktuális lépés adja.':'Minden megfigyelést külön kövess. Egyszerre több helyes jelzésed is lehet.'))),
        h('section',{className:'nx-quick-settings'},h('h3',{},'Állítsd a saját ritmusodra'),h('label',{className:'nx-quick-field'},h('span',{},'Hány lépéssel korábbira emlékezel?'),nInput,nHelp),
          h('label',{className:'nx-quick-field'},h('span',{},'Milyen hosszú legyen?'),length),h('label',{className:'nx-quick-field'},h('span',{},'Milyen tempóban játszanál?'),pace),
          h('label',{className:'nx-auto'},auto,h('span',{},'A következő kör szintje igazodjon az eredményemhez.')),quickError)),
      conflict,advanced,h('footer',{className:'nx-detail-footer'},h('div',{},summary,h('span',{},'Indítás után rövid bevezető és kipróbálható gyakorlókör vár.')),start));
    syncDetail();dialog.showModal();
  }
  dialog.addEventListener('close',()=>{syncDetail=()=>{};classicSlot.append(settings.element);const focusTarget=returnFocus?.isConnected?returnFocus:element.querySelector(`[data-explorer-mode="${returnFocus?.dataset.explorerMode}"]`);focusTarget?.focus({preventScroll:true});});
  renderCards();setView(view);
  return {element,getValue,setValue};
}
