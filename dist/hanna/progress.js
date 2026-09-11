import {HANNA_ACTIVITIES} from './content.js';

const ACTIVITY = Object.freeze(Object.fromEntries(HANNA_ACTIVITIES.map((entry)=>[entry.id,entry])));
const RECALL_LABELS = Object.freeze({choice:'választás',ordered:'sorrend',free:'szabad felidézés',random:'véletlen kérdezés',reverse:'visszafelé',verbatim:'szó szerint',meaning:'kulcsgondolatok'});
const BASELINE_LABELS = Object.freeze({wordImmediate:'Szavak · azonnal',wordDelayed:'Szavak · később',pictureImmediate:'Képek · azonnal',pictureDelayed:'Képek · később',digitImmediate:'Számok · azonnal',digitDelayed:'Számok · később'});
const ASSOCIATIVE = new Set(['chain','association','loci','palace','peg','keyword','concept']);
const STYLE = `
.hanna-progress{--hp-ink:#302447;--hp-purple:#7651bf;--hp-purple-dark:#4d347d;--hp-lilac:#eee8f7;--hp-lime:#d9ef7f;--hp-muted:#71687e;--hp-line:#ddd5e8;color:var(--hp-ink);display:grid;gap:18px;min-width:0}
.hanna-progress *{box-sizing:border-box}.hanna-progress__intro{display:grid;gap:5px}.hanna-progress__intro h2,.hanna-progress h3{margin:0}.hanna-progress__intro p,.hanna-progress__note{margin:0;color:var(--hp-muted);line-height:1.5}
.hanna-progress__picker{display:grid;gap:7px;font-weight:750}.hanna-progress__picker select{width:100%;min-height:52px;border:2px solid var(--hp-line);border-radius:14px;background:#fff;color:var(--hp-ink);font:inherit;padding:10px 42px 10px 14px}
.hanna-progress__body{display:grid;gap:16px;min-width:0}.hanna-progress__summary{border-radius:18px;background:linear-gradient(135deg,var(--hp-purple-dark),#7651bf);color:#fff;padding:20px;display:grid;gap:8px}.hanna-progress__summary p{margin:0;color:#f2edf9;line-height:1.5}.hanna-progress__summary strong{color:var(--hp-lime)}
.hanna-progress__activity-summary{border-left:5px solid var(--hp-lime);background:#fbf9fd;border-radius:14px;padding:14px 16px;display:grid;gap:5px}.hanna-progress__activity-summary h3,.hanna-progress__activity-summary p{margin:0}.hanna-progress__activity-summary p{color:var(--hp-muted);line-height:1.45}
.hanna-progress__metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.hanna-progress__metric{min-width:0;border:1px solid var(--hp-line);background:#fff;border-radius:15px;padding:15px;display:grid;gap:4px}.hanna-progress__metric span{font-size:.78rem;color:var(--hp-muted)}.hanna-progress__metric strong{font-size:1.2rem;overflow-wrap:anywhere}.hanna-progress__metric small{color:var(--hp-muted);line-height:1.35}
.hanna-progress__panel{border:1px solid var(--hp-line);background:#fff;border-radius:18px;padding:17px;display:grid;gap:13px;min-width:0}.hanna-progress__chart{width:100%;height:auto;min-height:160px;background:#fbf9fd;border-radius:12px}.hanna-progress__grid{stroke:#ddd5e8;stroke-width:1}.hanna-progress__line{fill:none;stroke:var(--hp-purple);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.hanna-progress__dot{fill:var(--hp-lime);stroke:var(--hp-purple-dark);stroke-width:3}.hanna-progress__axis{fill:var(--hp-muted);font:11px system-ui,sans-serif}
.hanna-progress__table-wrap{overflow-x:auto}.hanna-progress__table{width:100%;border-collapse:collapse;min-width:720px;font-variant-numeric:tabular-nums}.hanna-progress__table th,.hanna-progress__table td{text-align:left;padding:10px 9px;border-bottom:1px solid var(--hp-line);white-space:nowrap}.hanna-progress__table th{font-size:.75rem;color:var(--hp-muted)}.hanna-progress__table tbody tr:last-child td{border-bottom:0}
.hanna-progress__subscales{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.hanna-progress__subscale{background:var(--hp-lilac);border-radius:12px;padding:12px;display:grid;gap:3px}.hanna-progress__subscale span{font-size:.76rem;color:var(--hp-muted)}.hanna-progress__empty{border:1px dashed var(--hp-line);border-radius:18px;padding:28px 18px;text-align:center;background:#fff}.hanna-progress__empty p{color:var(--hp-muted)}
@media(max-width:560px){.hanna-progress{gap:14px}.hanna-progress__metrics,.hanna-progress__subscales{grid-template-columns:repeat(2,minmax(0,1fr))}.hanna-progress__metric{padding:12px}.hanna-progress__panel{padding:13px}.hanna-progress__summary{padding:17px}.hanna-progress__chart{min-height:145px}}
@media(max-width:340px){.hanna-progress__metrics,.hanna-progress__subscales{grid-template-columns:1fr}.hanna-progress__picker select{font-size:16px}.hanna-progress__table{min-width:660px}}
`;

function finite(value){return typeof value==='number'&&Number.isFinite(value);}
function ratio(value){return finite(value)&&value>=0&&value<=1?value:null;}
function percent(value){return value===null?'—':`${Math.round(value*100)}%`;}
function seconds(value){return finite(value)?`${(value/1000).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})} mp`:'—';}
function duration(value){
  if(!finite(value))return '—';
  if(value<60_000)return seconds(value);
  const minutes=Math.floor(value/60_000),remaining=Math.round((value%60_000)/1000);
  return remaining?`${minutes} p ${remaining} mp`:`${minutes} p`;
}
export function formatHannaRetention(value){
  if(!finite(value))return '—';
  if(value<60_000)return seconds(value);
  if(value<3_600_000)return `${Math.round(value/60_000)} perc`;
  if(value<86_400_000)return `${(value/3_600_000).toLocaleString('hu-HU',{maximumFractionDigits:1})} óra`;
  return `${(value/86_400_000).toLocaleString('hu-HU',{maximumFractionDigits:1})} nap`;
}
function dateLabel(timestamp){return new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));}
function activityLabel(activity){return ACTIVITY[activity]?.title||'Hanna-gyakorlás';}
function groupLabel(row){
  const settings=row.settings||{},metrics=row.metrics||{},activity=metrics.activity||settings.activity;
  const parts=[activityLabel(activity),ACTIVITY[activity]?.technique].filter(Boolean);
  if(Number.isFinite(Number(settings.itemCount)))parts.push(`${Number(settings.itemCount)} elem`);
  if(settings.recallMode)parts.push(RECALL_LABELS[settings.recallMode]||String(settings.recallMode));
  return parts.join(' · ');
}
function normalizeRows(results){
  if(!Array.isArray(results))return [];
  return results.flatMap((row)=>{
    if(!row||typeof row!=='object'||!row.metrics||typeof row.metrics.comparabilityKey!=='string'||!row.metrics.comparabilityKey||!Number.isFinite(Date.parse(row.at)))return [];
    const metrics=row.metrics,accuracy=ratio(metrics.accuracy),orderAccuracy=ratio(metrics.orderAccuracy);
    const independent=finite(metrics.independentCorrect)&&metrics.independentCorrect>=0?metrics.independentCorrect:null,assisted=finite(metrics.assistedCorrect)&&metrics.assistedCorrect>=0?metrics.assistedCorrect:null;
    const independentRatio=independent!==null&&assisted!==null&&independent+assisted>0?independent/(independent+assisted):null;
    return [{...row,_time:Date.parse(row.at),_accuracy:accuracy,_orderAccuracy:orderAccuracy,_independentRatio:independentRatio}];
  }).sort((left,right)=>left._time-right._time);
}
function groupRows(rows){
  const groups=new Map();
  for(const row of rows){const key=row.metrics.comparabilityKey,list=groups.get(key)||[];list.push(row);groups.set(key,list);}
  return [...groups.entries()].map(([key,items])=>({key,items,label:groupLabel(items.at(-1)),latestAt:items.at(-1)._time})).sort((left,right)=>right.latestAt-left.latestAt);
}
function svgElement(tag,attributes={},children=[]){
  const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
  for(const child of children)node.append(child instanceof Node?child:document.createTextNode(String(child)));
  return node;
}
function chart(rows){
  const width=640,height=190,left=42,right=16,top=16,bottom=30,plotWidth=width-left-right,plotHeight=height-top-bottom;
  const points=rows.filter((row)=>row._accuracy!==null),times=points.map((row)=>row._time),minimum=times.length?Math.min(...times):0,maximum=times.length?Math.max(...times):0;
  const svg=svgElement('svg',{class:'hanna-progress__chart',viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Pontosság idővonala százalékban, valós gyakorlási dátumokkal',preserveAspectRatio:'xMidYMid meet'});
  for(const tick of [0,.5,1]){const y=top+(1-tick)*plotHeight;svg.append(svgElement('line',{x1:left,y1:y,x2:width-right,y2:y,class:'hanna-progress__grid'}),svgElement('text',{x:4,y:y+4,class:'hanna-progress__axis'},[`${Math.round(tick*100)}%`]));}
  if(points.length){const coordinates=points.map((row,index)=>{const x=maximum===minimum?left+plotWidth/2:left+(row._time-minimum)/(maximum-minimum)*plotWidth,y=top+(1-row._accuracy)*plotHeight;return {x,y,row,index};});if(coordinates.length>1)svg.append(svgElement('polyline',{points:coordinates.map((point)=>`${point.x},${point.y}`).join(' '),class:'hanna-progress__line'}));for(const point of coordinates){const dot=svgElement('circle',{cx:point.x,cy:point.y,r:6,class:'hanna-progress__dot'}),itemCount=Number(point.row.settings?.itemCount),countLabel=Number.isFinite(itemCount)?` · ${itemCount} elem`:'';dot.append(svgElement('title',{},[`${dateLabel(point.row.at)}: ${percent(point.row._accuracy)}${countLabel}`]));svg.append(dot);}const first=coordinates[0],last=coordinates.at(-1);svg.append(svgElement('text',{x:first.x,y:height-9,'text-anchor':coordinates.length===1?'middle':'start',class:'hanna-progress__axis'},[new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(new Date(first.row.at))]));if(coordinates.length>1)svg.append(svgElement('text',{x:last.x,y:height-9,'text-anchor':'end',class:'hanna-progress__axis'},[new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'}).format(new Date(last.row.at))]));}
  return svg;
}
function metric(h,label,value,note){return h('div',{className:'hanna-progress__metric'},h('span',{},label),h('strong',{},value),h('small',{},note));}
function relatedMetric(row){
  const activity=row.metrics.activity||row.settings?.activity;
  if(activity==='faces')return ['Névfelidézés',percent(row._accuracy),'Azonos arc–név beállítás'];
  if(activity==='numbers'){const number=row.metrics.subscales?.number||{};return ['Megjegyzett számjegy',finite(number.digitsCorrect)&&finite(number.digitsTotal)?`${number.digitsCorrect} / ${number.digitsTotal}`:'—',finite(number.digitsPerMinute)?`${number.digitsPerMinute.toLocaleString('hu-HU',{maximumFractionDigits:1})} számjegy/perc`:'Nincs tempóadat'];}
  if(activity==='major')return ['Szám–hang kapcsolat',percent(row._accuracy),'Azonos kód- és nehézségi beállítás'];
  if(activity==='random')return ['Közvetlen hozzáférés',percent(row._accuracy),'Sorszám, szomszéd és kategória'];
  if(activity==='review')return ['Későbbi felidézés',percent(row._accuracy),finite(row.metrics.retentionMs)?`Eltelt idő: ${formatHannaRetention(row.metrics.retentionMs)}`:'Az eltelt idő nincs hitelesítve'];
  if(ASSOCIATIVE.has(activity))return ['Kapcsolati felidézés',percent(row._accuracy),row._orderAccuracy===null?'Pontosság':'Sorrenddel együtt'];
  return ['Feladatspecifikus pontosság',percent(row._accuracy),'Azonos beállítású kör'];
}
function comparisonText(rows){
  if(rows.length<2)return 'Még kell egy második, pontosan azonos beállítású kör az összevetéshez.';
  const current=rows.at(-1)._accuracy,previous=rows.at(-2)._accuracy;
  if(current===null||previous===null)return 'A két legutóbbi kör egyikében nincs pontossági adat, ezért most nincs számszerű összevetés.';
  const delta=Math.round((current-previous)*100),direction=delta>0?'magasabb':delta<0?'alacsonyabb':'ugyanannyi';
  return `A legutóbbi kör pontossága ${Math.abs(delta)} százalékponttal ${direction}, mint az előző azonos beállítású körben. Ez két gyakorlás összevetése, nem általános képességállítás.`;
}
function baselinePanel(h,row){
  if((row.metrics.activity||row.settings?.activity)!=='baseline')return [];
  const subscales=row.metrics.subscales||{};
  return [h('section',{className:'hanna-progress__panel'},h('h3',{},'Startteszt részfeladatai'),h('p',{className:'hanna-progress__note'},'A hat arány külön marad; egyik sem helyettesíti a másikat.'),h('div',{className:'hanna-progress__subscales'},...Object.entries(BASELINE_LABELS).map(([key,label])=>{const item=subscales[key],value=ratio(typeof item==='number'?item:item?.accuracy);return h('div',{className:'hanna-progress__subscale'},h('span',{},label),h('strong',{},percent(value)));})))];
}
function textPanel(h,row){
  if((row.metrics.activity||row.settings?.activity)!=='text')return [];
  const subscales=row.metrics.subscales||{},items=[['textImmediate','Első aktív felidézés'],['textDelayed','Második aktív felidézés']];
  return [h('section',{className:'hanna-progress__panel'},h('h3',{},'Szövegfelidézés két lépésben'),h('p',{className:'hanna-progress__note'},'Az első próbát és a javítás utáni újrapróbálást külön mutatjuk.'),h('div',{className:'hanna-progress__subscales'},...items.map(([key,label])=>h('div',{className:'hanna-progress__subscale'},h('span',{},label),h('strong',{},percent(ratio(subscales[key]?.accuracy)))))))];
}
function activitySummary(h,allRows,latest){
  const activity=latest.metrics.activity||latest.settings?.activity,rows=allRows.filter((row)=>(row.metrics.activity||row.settings?.activity)===activity),counts=rows.map((row)=>Number(row.settings?.itemCount)).filter(Number.isFinite),distinct=[...new Set(counts)];
  const countText=distinct.length>1?`Gyakorolt elemszámok: ${distinct.join(' → ')}.`:distinct.length?`Gyakorolt elemszám: ${distinct[0]}.`:'Az elemszám nem áll rendelkezésre.';
  return h('section',{className:'hanna-progress__activity-summary'},h('h3',{},`${activityLabel(activity)} összes kör`),h('p',{},`${rows.length} befejezett kör. ${countText}`),h('p',{},distinct.length>1?'Az eltérő elemszámú körök pontosságát nem vonjuk össze; a grafikon csak a kiválasztott, pontosan azonos beállítást mutatja.':'A grafikon továbbra is csak a kiválasztott, pontosan azonos beállítást mutatja.'));
}
function resultTable(h,rows){
  return h('div',{className:'hanna-progress__table-wrap'},h('table',{className:'hanna-progress__table'},h('thead',{},h('tr',{},...['Dátum','Pontosság','Sorrend','Medián válasz','Kódolási idő','Önálló arány','Eltelt idő'].map((label)=>h('th',{scope:'col'},label)))),h('tbody',{},...rows.slice().reverse().map((row)=>h('tr',{},h('td',{},dateLabel(row.at)),h('td',{},percent(row._accuracy)),h('td',{},percent(row._orderAccuracy)),h('td',{},seconds(row.metrics.medianCorrectRtMs)),h('td',{},duration(row.metrics.encodingDurationMs)),h('td',{},percent(row._independentRatio)),h('td',{},formatHannaRetention(row.metrics.retentionMs)))))));
}
function renderGroup(h,group,allRows){
  const rows=group.items,latest=rows.at(-1),related=relatedMetric(latest),technique=ACTIVITY[latest.metrics.activity||latest.settings?.activity]?.technique||activityLabel(latest.metrics.activity||latest.settings?.activity);
  return h('div',{className:'hanna-progress__body'},
    h('section',{className:'hanna-progress__summary'},h('h3',{},group.label),h('p',{},`${rows.length} azonos beállítású kör. Technika: `,h('strong',{},technique),'.'),h('p',{},comparisonText(rows))),
    activitySummary(h,allRows,latest),
    h('div',{className:'hanna-progress__metrics'},metric(h,'Pontosság',percent(latest._accuracy),'A legutóbbi körben'),metric(h,'Sorrend',percent(latest._orderAccuracy),latest._orderAccuracy===null?'Ehhez a módhoz nincs sorrendmutató':'A legutóbbi körben'),metric(h,'Medián válaszidő',seconds(latest.metrics.medianCorrectRtMs),'Helyes válaszok ideje'),metric(h,'Tényleges kódolási idő',duration(latest.metrics.encodingDurationMs),'Tanulással töltött idő'),metric(h,'Önálló arány',percent(latest._independentRatio),latest._independentRatio===null?'Nincs kiszámítható adat':'Önálló / összes helyes'),metric(h,'Megtartási idő',formatHannaRetention(latest.metrics.retentionMs),finite(latest.metrics.retentionMs)?'Szerver által mért késleltetés':'Nincs hitelesített adat'),metric(h,related[0],related[1],related[2])),
    ...baselinePanel(h,latest),
    ...textPanel(h,latest),
    h('section',{className:'hanna-progress__panel'},h('h3',{},'Pontosság időben'),h('p',{className:'hanna-progress__note'},'Csak ennek a pontos beállításnak a körei szerepelnek.'),chart(rows)),
    h('section',{className:'hanna-progress__panel'},h('h3',{},'Körök részletesen'),resultTable(h,rows)),
  );
}

export function renderHannaProgress(h,results,{teacher=false}={}){
  if(typeof h!=='function')throw new TypeError('A renderHannaProgress h segédfüggvényt vár.');
  const rows=normalizeRows(results),groups=groupRows(rows),root=h('section',{className:'hanna-progress'},h('style',{},STYLE),h('header',{className:'hanna-progress__intro'},h('h2',{},teacher?'A tanuló fejlődése':'Saját fejlődésem'),h('p',{},'Azonos technikát és beállítást hasonlíts össze. Ezek saját gyakorlási adatok, nem normák vagy képességpontok.')));
  if(!groups.length){root.append(h('div',{className:'hanna-progress__empty'},h('h3',{},'Még nincs összehasonlítható Hanna-köröd'),h('p',{},'Az első befejezett gyakorlás után itt jelennek meg a saját adataid.')));return root;}
  const select=h('select',{'aria-label':'Technika és pontos beállítás kiválasztása'},...groups.map((group,index)=>h('option',{value:group.key,selected:index===0},group.label))),body=h('div',{className:'hanna-progress__body-host'});
  const draw=()=>{const group=groups.find((entry)=>entry.key===select.value)||groups[0];body.replaceChildren(renderGroup(h,group,rows));};
  select.addEventListener('change',draw);root.append(h('label',{className:'hanna-progress__picker'},h('span',{},'Melyik gyakorlást nézed?'),select),body);select.value=groups[0].key;draw();return root;
}
