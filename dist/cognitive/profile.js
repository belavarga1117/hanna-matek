import {COGNITIVE_META} from './ui.js';

const QUALITY_LABELS={visibilityInterrupted:'háttérbe került a lap',paused:'szünet történt',recovered:'helyreállított kör',audioFailure:'hanghiba',timingDeviation:'időzítési eltérés',delayedTimingUnverified:'nem ellenőrzött késleltetés',delayedRecallTooEarly:'túl rövid késleltetés',invalidProcessingCompliance:'kevés köztes válasz',insufficientRecognitionResponses:'hiányzó válaszfajta',reviewAnsweredEarly:'korai újrakérdezés'};

function normalizedPoint(result,index){
  const metrics=result?.metrics||{};const primary=metrics.primaryMetric;
  if(result?.gameId==='nback'&&metrics.version===1){const settings=result.settings||{};const mode=settings.selfPaced||settings.adaptive?'practice':'assessment';const identity={mode:metrics.mode,n:metrics.n,trialCount:metrics.trialCount,scoreProfile:metrics.scoreProfile,intervalMs:settings.intervalMs,selfPaced:!!settings.selfPaced,adaptive:!!settings.adaptive,variable:!!settings.variable,crab:!!settings.crab,multiStim:settings.multiStim||1,identity:settings.identity||null};return {id:result.id||`result-${index}`,gameId:'nback',familyId:'nback',mode,key:`nback:${JSON.stringify(identity)}`,value:Number(result.percent),unit:'percent',name:'nbackPercent',at:result.at||result.createdAt,qualityFlags:[],comparable:mode==='assessment',summary:result.summary||''};}
  if(!primary||!Number.isFinite(Number(primary.value))||!metrics.comparabilityKey)return null;
  const id=result.id||`result-${index}`,mode=metrics.mode||result.settings?.mode||'practice',qualityFlags=Array.isArray(metrics.qualityFlags)?metrics.qualityFlags:[];
  const isolated=qualityFlags.length>0||(mode==='assessment'&&metrics.comparable!==true);
  return {id,gameId:result.gameId,familyId:metrics.familyId||result.gameId,mode,key:isolated?`${metrics.comparabilityKey}:isolated:${id}`:metrics.comparabilityKey,value:Number(primary.value),unit:primary.unit||'',name:primary.name||'eredmény',at:result.at||result.createdAt,qualityFlags,comparable:metrics.comparable===true,summary:result.summary||''};
}

export function groupComparableResults(results=[]){
  const points=results.map(normalizedPoint).filter(Boolean).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const modes={practice:[],assessment:[]};
  for(const mode of Object.keys(modes)){
    const byFamily=new Map();
    for(const point of points.filter(item=>item.mode===mode)){
      if(!byFamily.has(point.familyId))byFamily.set(point.familyId,new Map());
      const byKey=byFamily.get(point.familyId);if(!byKey.has(point.key))byKey.set(point.key,[]);byKey.get(point.key).push(point);
    }
    modes[mode]=[...byFamily].map(([familyId,byKey])=>({familyId,series:[...byKey].map(([key,seriesPoints])=>({key,points:seriesPoints}))}));
  }
  return modes;
}

function unitLabel(unit){return {items:'elem',percent:'%',questions:'kérdés',ms:'ms'}[unit]||unit||'';}
function dateLabel(value){const date=new Date(value);return Number.isNaN(date.getTime())?'Ismeretlen idő':date.toLocaleDateString('hu-HU',{month:'short',day:'numeric'});}
function familyTitle(id){return id==='nback'?'N-back Műhely':COGNITIVE_META[id]?.title||id;}

function svgChart(h,series,title){
  const ns='http://www.w3.org/2000/svg';const make=(tag,attrs={})=>{const node=document.createElementNS?document.createElementNS(ns,tag):h(tag,{});for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
  const svg=make('svg',{viewBox:'0 0 640 250',class:'profile-chart',role:'img','aria-label':`${title}: ${series.points.length} összehasonlítható adatpont`});
  const values=series.points.map(point=>point.value),min=Math.min(...values),max=Math.max(...values),span=Math.max(1,max-min);const x=index=>series.points.length===1?320:54+index*(532/(series.points.length-1));const y=value=>195-(value-min)/span*130;
  svg.append(make('line',{x1:54,y1:195,x2:586,y2:195,class:'chart-axis'}));
  if(series.points.length>1)svg.append(make('polyline',{points:series.points.map((point,index)=>`${x(index)},${y(point.value)}`).join(' '),class:'chart-line',fill:'none'}));
  series.points.forEach((point,index)=>{const dot=make('circle',{cx:x(index),cy:y(point.value),r:8,class:'chart-point',tabindex:'0'});const label=make('title');label.textContent=`${dateLabel(point.at)}: ${point.value} ${unitLabel(point.unit)}`;dot.append(label);svg.append(dot);});
  return svg;
}

function reason(point){if(point.qualityFlags.length)return point.qualityFlags.map(flag=>QUALITY_LABELS[flag]||flag).join(', ');if(!point.comparable)return point.mode==='practice'?'Gyakorlási alkalom, ezért külön sorozat.':'Ez az alkalom nem összehasonlítható.';return 'Azonos protokoll és beállítás.';}

function seriesCard(h,family,series){
  const first=series.points[0],one=series.points.length===1;
  return h('article',{className:'profile-family-card'},h('div',{className:'profile-family-head'},h('div',{},h('span',{className:'eyebrow'},first.mode==='assessment'?'RÖGZÍTETT PRÓBA':'GYAKORLÁS'),h('h3',{},familyTitle(family.familyId))),h('strong',{},`${series.points.at(-1).value} ${unitLabel(series.points.at(-1).unit)}`)),svgChart(h,series,familyTitle(family.familyId)),h('p',{className:'profile-state'},one?'Ez az első összehasonlítható pont. Egyetlen alkalomból még nem rajzolunk változást.':`${series.points.length} azonos beállítású alkalom kapcsolódik össze.`),h('ul',{className:'profile-points'},series.points.slice(-4).reverse().map(point=>h('li',{},h('span',{},dateLabel(point.at)),h('strong',{},`${point.value} ${unitLabel(point.unit)}`),h('small',{},reason(point))))));
}

function modeSection(h,title,intro,families){
  const cards=families.flatMap(family=>family.series.map(series=>seriesCard(h,family,series)));
  return h('section',{className:'profile-mode'},h('div',{className:'section-title'},h('div',{},h('span',{className:'eyebrow'},title.toLocaleUpperCase('hu')),h('h2',{},title)),h('p',{},intro)),cards.length?h('div',{className:'profile-grid'},cards):h('div',{className:'profile-empty'},h('span',{'aria-hidden':'true'},'○'),h('h3',{},`Még nincs ${title.toLocaleLowerCase('hu')} adat.`),h('p',{},'Egy befejezett feladat után itt a tényleges mutató és mértékegység jelenik meg.')));
}

export function createSchoolCognitiveProfile({h,school}){
  const teacher=school?.supported&&school.user?.role==='teacher';
  return createCognitiveProfile({h,teacher,
    loadStudents:()=>school.api('/api/teacher/students'),
    loadResults:studentId=>school?.supported?school.api(teacher?`/api/teacher/results?studentId=${encodeURIComponent(studentId)}`:'/api/results'):Promise.resolve({results:[]}),
  });
}

export function createCognitiveProfile({h,loadResults,teacher=false,loadStudents}){
  let disposed=false,requestId=0,students=[],ready;
  const content=h('div',{className:'profile-content','aria-live':'polite'});
  const select=h('select',{'aria-label':'Tanuló',disabled:true,onChange:()=>{ready=showResults(select.value);}});
  const chooser=h('section',{className:'profile-student-picker'},h('label',{},'Tanuló',select),h('p',{},'A tanári próbakörök nem mentődnek. Itt a kiválasztott tanuló saját eredményeit látod.'));
  const element=h('div',{className:'cognitive-profile'},h('a',{className:'back-link',href:'#/memoriaprobak'},'← Memóriapróbák'),h('section',{className:'profile-hero'},h('span',{className:'eyebrow'},teacher?'TANÁRI NÉZET · TANULÓNKÉNTI EREDMÉNYEK':'SAJÁT ADATOK, AZONOS FELTÉTELEK'),h('h1',{},'Memória',h('em',{},'profil')),h('p',{},teacher?'Válassz tanulót a memóriapróbák és az N-back eredményeinek áttekintéséhez. Azonos feladat és beállítás mellett mutatjuk a változást.':'Azonos feladat és beállítás mellett mutatjuk a saját eredményeid változását. A gyakorlás és a rögzített próba külön marad.')),teacher?chooser:null,content);
  function loading(text){content.replaceChildren(h('div',{className:'profile-loading',role:'status'},text));}
  function empty(title,text,link){content.replaceChildren(h('div',{className:'profile-empty'},h('h2',{},title),h('p',{},text),link));}
  function failed(error,retry){content.replaceChildren(h('div',{className:'profile-empty error-state',role:'alert'},h('h2',{},'Most nem tudtuk betölteni a profilt'),h('p',{},error?.message||'Próbáld újra később.'),h('button',{className:'secondary-button',onClick:()=>{ready=retry();}},'Újrapróbálom')));}
  async function showResults(studentId){
    if(disposed)return;
    const ticket=++requestId,student=teacher?students.find(item=>item.id===studentId):null;
    if(teacher&&!student){empty('Válassz tanulót','A kiválasztott tanuló eredményei külön profilban jelennek meg.');return;}
    loading(teacher?`${student.displayName} eredményeinek betöltése…`:'A saját eredmények betöltése…');
    try{
      const payload=await loadResults(studentId);
      if(disposed||ticket!==requestId)return;
      const results=Array.isArray(payload)?payload:Array.isArray(payload?.results)?payload.results:[];
      const grouped=groupComparableResults(teacher?results.filter(result=>result.studentId===studentId):results);
      content.replaceChildren(...(teacher?[h('h2',{className:'profile-student-title'},`${student.displayName} memóriaprofilja`)]:[]),modeSection(h,'Rögzített próbák','Azonos protokoll és beállítás mellett értelmezhető saját idősor.',grouped.assessment),modeSection(h,'Gyakorlás','A gyakorlókörök külön sorozatban segítenek visszanézni a feladatot.',grouped.practice),h('aside',{className:'profile-note'},h('strong',{},'Mit nem mond ez a profil?'),h('p',{},'Nem hasonlít más emberekhez, nem ad percentilist, IQ-t, „agyéletkort” vagy agyi egészségértéket.')));
    }catch(error){if(!disposed&&ticket===requestId)failed(error,()=>showResults(studentId));}
  }
  async function initialize(){
    if(disposed)return;
    if(!teacher)return showResults();
    const ticket=++requestId;select.disabled=true;loading('A tanulók betöltése…');
    try{
      const payload=await loadStudents();
      if(disposed||ticket!==requestId)return;
      students=Array.isArray(payload?.students)?payload.students:[];
      select.replaceChildren(h('option',{value:''},'Válassz tanulót…'),...students.map(student=>h('option',{value:student.id},`${student.displayName} (${student.username})${student.active===false?' · inaktív':''}`)));
      select.value='';select.disabled=students.length===0;
      if(!students.length){empty('Még nincs tanulód','Tanuló felvétele után itt követheted a mentett memóriapróbáit.',h('a',{className:'secondary-button',href:'#/tanar/tanulok'},'Tanulók kezelése'));return;}
      return showResults('');
    }catch(error){if(!disposed&&ticket===requestId)failed(error,initialize);}
  }
  ready=Promise.resolve().then(initialize);
  return {element,get ready(){return ready;},dispose(){disposed=true;requestId++;}};
}
