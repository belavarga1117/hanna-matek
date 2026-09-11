const DIMENSIONS=Object.freeze([
  ['encodingSpeed','Kódolási tempó','Milyen ütemben készítesz emlékezeti kapaszkodókat?','items/min','01'],
  ['immediateRecall','Azonnali felidézés','Mi marad meg közvetlenül a tanulás után?','ratio','02'],
  ['delayedRecall','Késleltetett felidézés','Mi marad meg egy köztes feladat után?','ratio','03'],
  ['sequenceMemory','Sorrendi emlékezet','Mennyire pontos a felidézett sorrend?','ratio','04'],
  ['randomAccess','Közvetlen hozzáférés','Mennyi idő alatt éred el a kért elemet?','ms','05'],
  ['nameMemory','Név–arc kapcsolatok','Fel tudod idézni a tanult nevet és arcot?','ratio','06'],
  ['numberMemory','Számok emlékezete','Hány tanult számjegyet idézel fel pontosan?','ratio','07'],
  ['associativeMemory','Kapcsolati felidézés','Hogyan segítenek a tanult kapcsolatok?','ratio','08'],
  ['longTermRetention','Tartós megtartás','Mi marad meg legalább egy nappal később?','ratio','09'],
  ['strategyIndependence','Önálló módszerhasználat','Mennyit idézel fel segítség nélkül?','ratio','10'],
]);
const UNITS={'ratio':'%','ms':'mp','items/min':'elem/perc'};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const number=(value,digits=0)=>value.toLocaleString('hu-HU',{maximumFractionDigits:digits});
const valueText=(value,unit)=>value===null?'—':unit==='ratio'?number(value*100):unit==='ms'?number(value/1000,2):number(value,1);
function validDimension(item,unit) {
  if(!item||!finite(item.value)||item.value<0||item.unit!==unit)return false;
  if(unit==='ratio'&&item.value>1)return false;
  return true;
}
export function buildHannaSkillProfile(results) {
  const rows=(Array.isArray(results)?results:[]).filter(row=>Number.isFinite(Date.parse(row.at))&&row.metrics?.schemaVersion===2).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  return DIMENSIONS.map(([id,label,description,unit,ordinal])=>{
    const measured=rows.flatMap(row=>{
      const metric=row.metrics.dimensions?.[id];
      if(!validDimension(metric,unit))return [];
      if(id==='longTermRetention'&&(!finite(metric.retentionMs)||metric.retentionMs<86400000))return [];
      return [{value:metric.value,at:row.at,resultId:row.id,comparison:row.metrics.comparabilityKey,evidence:metric.evidence||'practice',activity:row.settings?.activity,retentionMs:metric.retentionMs,accuracy:metric.accuracy}];
    });
    const current=measured.at(-1)||null;
    const comparable=current?measured.filter(row=>row.comparison&&row.comparison===current.comparison):[];
    const baseline=comparable[0]||null;
    return {id,label,description,unit,ordinal,direction:unit==='ms'?'lower':'higher',current,baseline,series:comparable,count:measured.length,
      delta:current&&baseline&&comparable.length>1?current.value-baseline.value:null};
  });
}
const CSS=`
.hm-skillmap{color:#30243d;display:grid;gap:22px;min-width:0}.hm-skillmap *{box-sizing:border-box}.hm-skillmap__hero{padding:clamp(22px,4vw,42px);border:1px solid #e8dfd2;border-radius:28px;background:radial-gradient(ellipse at 95% 0,#e5ecb8 0,transparent 42%),linear-gradient(125deg,#fffdf5,#f2edf9);display:grid;gap:12px}.hm-skillmap__hero span{letter-spacing:.14em;text-transform:uppercase;font-size:11px;font-weight:800;color:#6a537d}.hm-skillmap h2{font-size:clamp(28px,4vw,44px);line-height:1.1;letter-spacing:-.04em;margin:0}.hm-skillmap__hero p{max-width:680px;line-height:1.6;margin:0;color:#695e70}.hm-skillmap__hero strong{font-weight:700;color:#443152}.hm-skillmap__grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}.hm-skillmap__card{font:inherit;text-align:left;position:relative;display:grid;grid-template-rows:auto auto 1fr auto;gap:12px;border:1px solid #e5deec;border-radius:22px;background:#fffdf9;padding:18px;min-width:0;color:inherit;cursor:pointer;transition:border-color .2s,box-shadow .2s,transform .2s}.hm-skillmap__card:hover{transform:translateY(-2px);box-shadow:0 10px 25px #3621490c}.hm-skillmap__card[aria-pressed=true]{border-color:#73509f;box-shadow:0 0 0 2px #73509f20;background:#f6f0fb}.hm-skillmap__card:focus-visible{outline:3px solid #5b348c;outline-offset:3px}.hm-skillmap__card.is-empty{background:#faf9f6}.hm-skillmap__ordinal{font-size:11px;letter-spacing:.12em;color:#87798f}.hm-skillmap__card h3{font-size:15px;line-height:1.3;margin:0;min-height:40px}.hm-skillmap__meter{position:relative;width:100%;max-width:112px;aspect-ratio:1;margin:0 auto;display:grid;place-items:center}.hm-skillmap__meter svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}.hm-skillmap__meter circle{fill:none;stroke-width:5}.hm-skillmap__meter .track{stroke:#e9e3ed}.hm-skillmap__meter .fill{stroke:#7955a3;stroke-linecap:round;transition:stroke-dasharray .6s}.hm-skillmap__number{display:grid;justify-items:center;line-height:1.1;font-variant-numeric:tabular-nums}.hm-skillmap__number strong{font-size:28px;letter-spacing:-.04em}.hm-skillmap__number small{font-size:11px;color:#75647f;margin-top:6px}.hm-skillmap__card footer{font-size:11px;line-height:1.4;color:#726778;min-height:30px}.hm-skillmap__detail{background:#fffdf9;border:1px solid #e5deec;border-radius:24px;padding:24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:28px;align-items:center}.hm-skillmap__detail h3{font-size:24px;letter-spacing:-.03em;margin:0 0 8px}.hm-skillmap__detail p{line-height:1.6;color:#716779;margin:0 0 12px}.hm-skillmap__comparison{display:flex;gap:22px;flex-wrap:wrap}.hm-skillmap__comparison div{display:grid;gap:5px}.hm-skillmap__comparison small{color:#807087;font-size:11px}.hm-skillmap__comparison strong{font-size:22px;letter-spacing:-.03em}.hm-skillmap__plot{width:100%;height:190px}.hm-skillmap__plot text{font:11px system-ui;fill:#7f7188}.hm-skillmap__empty-plot{border:1px dashed #d6cddd;border-radius:16px;min-height:180px;display:grid;place-items:center;text-align:center;padding:22px;color:#84798b;background:#faf8fc}.hm-skillmap__note{font-size:12px;color:#817586;line-height:1.6;margin:0}.hm-skillmap__badge{display:inline-block;padding:5px 9px;border-radius:999px;background:#e8efc6;color:#4a5e25;font-size:11px;font-weight:700;margin-bottom:12px}
@media(max-width:1000px){.hm-skillmap__grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:560px){.hm-skillmap__grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.hm-skillmap__card{padding:14px;gap:8px;border-radius:18px}.hm-skillmap__detail{grid-template-columns:1fr;gap:14px;padding:18px}.hm-skillmap__hero{padding:22px}.hm-skillmap__meter{max-width:94px}}
@media(prefers-reduced-motion:reduce){.hm-skillmap__card,.hm-skillmap__meter .fill{transition:none}.hm-skillmap__card:hover{transform:none}}
`;
function svg(h,tag,attrs,...children){return h(tag,attrs,...children);}
function meter(h,dimension) {
  const value=dimension.current?.value??null,isRatio=dimension.unit==='ratio',dash=isRatio&&value!==null?value*289:0;
  return h('div',{className:'hm-skillmap__meter'},
    svg(h,'svg',{viewBox:'0 0 100 100','aria-hidden':'true'},svg(h,'circle',{cx:50,cy:50,r:46,class:'track',...(value===null?{'stroke-dasharray':'3 7'}:{})}),
      isRatio&&value!==null?svg(h,'circle',{cx:50,cy:50,r:46,class:'fill','stroke-dasharray':`${dash} 289`}):null),
    h('div',{className:'hm-skillmap__number'},h('strong',{},valueText(value,dimension.unit)),h('small',{},value===null?'még nincs adat':UNITS[dimension.unit])));
}
function trendPlot(h,dimension) {
  const rows=dimension.series;
  if(rows.length<2)return h('div',{className:'hm-skillmap__empty-plot'},rows.length?'A következő azonos beállítású kör után itt látod a saját változásodat.':'Még nincs ilyen mérésed. Az első megfelelő feladat után megjelenik a saját eredményed.');
  const values=rows.map(row=>row.value),max=dimension.unit==='ratio'?1:Math.max(...values)*1.15||1,min=0,w=500,height=190,left=42,right=20,top=22,bottom=30;
  const positions=rows.map((row,i)=>({x:left+i/(rows.length-1)*(w-left-right),y:top+(1-(row.value-min)/(max-min))*(height-top-bottom),row}));
  const dates=new Intl.DateTimeFormat('hu-HU',{month:'short',day:'numeric'});
  return svg(h,'svg',{viewBox:`0 0 ${w} ${height}`,class:'hm-skillmap__plot',role:'img','aria-label':`${dimension.label}: saját azonos beállítású körök, ${UNITS[dimension.unit]}`},
    ...[0,max/2,max].flatMap(value=>{const y=top+(1-value/max)*(height-top-bottom);return[svg(h,'line',{x1:left,y1:y,x2:w-right,y2:y,stroke:'#e9e3ed'}),svg(h,'text',{x:2,y:y+4},valueText(value,dimension.unit))];}),
    svg(h,'polyline',{points:positions.map(pos=>`${pos.x},${pos.y}`).join(' '),fill:'none',stroke:'#76509f','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}),
    ...positions.map(pos=>svg(h,'circle',{cx:pos.x,cy:pos.y,r:5,fill:'#dceca0',stroke:'#76509f','stroke-width':2},svg(h,'title',{},`${dates.format(new Date(pos.row.at))}: ${valueText(pos.row.value,dimension.unit)} ${UNITS[dimension.unit]}`))),
    svg(h,'text',{x:left,y:height-5},dates.format(new Date(rows[0].at))),svg(h,'text',{x:w-right,y:height-5,'text-anchor':'end'},dates.format(new Date(rows.at(-1).at))));
}
export function describeHannaSkillChange(dimension) {
  if(dimension.delta===null)return 'Még egy kör kell';
  if(dimension.delta===0)return 'Nem változott';
  if(dimension.direction==='lower')return `${valueText(Math.abs(dimension.delta),dimension.unit)} mp-cel ${dimension.delta<0?'gyorsabb':'lassabb'}`;
  return `${dimension.delta>0?'+':''}${valueText(dimension.delta,dimension.unit)} ${dimension.unit==='ratio'?'százalékpont':UNITS[dimension.unit]}`;
}
function loadProfileCssOnce(){
  if(typeof document==='undefined'||document.querySelector?.('style[data-hanna-skillmap]'))return;
  const style=document.createElement('style');style.dataset.hannaSkillmap='true';style.textContent=CSS;document.head?.append(style);
}
export function renderHannaSkillMap(h,results,{teacher=false}={}) {
  loadProfileCssOnce();
  const dimensions=buildHannaSkillProfile(results),measured=dimensions.filter(row=>row.current).length;
  let selected=dimensions.find(row=>row.current)?.id||dimensions[0].id;
  const root=h('section',{className:'hm-skillmap'});
  const detail=h('div',{});
  const cards=dimensions.map(dimension=>h('button',{type:'button',className:`hm-skillmap__card${dimension.current?'':' is-empty'}`,'aria-pressed':String(selected===dimension.id),onClick:()=>{selected=dimension.id;draw();}},
    h('span',{className:'hm-skillmap__ordinal'},dimension.ordinal),h('h3',{},dimension.label),meter(h,dimension),h('footer',{},dimension.current?`${dimension.count} mérés · ${dimension.current.evidence==='independent'?'önálló felidézés':'gyakorlás'}`:'Az első megfelelő körre vár')));
  function draw(){
    const dimension=dimensions.find(row=>row.id===selected),current=dimension.current?.value??null,base=dimension.baseline?.value??null;
    cards.forEach((card,index)=>card.setAttribute('aria-pressed',String(dimensions[index].id===selected)));
    const delta=describeHannaSkillChange(dimension);
    detail.replaceChildren(h('article',{className:'hm-skillmap__detail'},h('div',{},h('span',{className:'hm-skillmap__badge'},'SAJÁT KIINDULÓPONTHOZ MÉRVE'),h('h3',{},dimension.label),h('p',{},dimension.description),dimension.direction==='lower'?h('p',{className:'hm-skillmap__note'},'Itt a kisebb idő gyorsabb hozzáférést jelent. A görbe az eltelt másodperceket mutatja; az idő a böngészőben rögzített gyakorlási adat.'):null,
      h('div',{className:'hm-skillmap__comparison'},h('div',{},h('small',{},'Kiindulópont'),h('strong',{},`${valueText(base,dimension.unit)}${base===null?'':` ${UNITS[dimension.unit]}`}`)),h('div',{},h('small',{},'Legutóbbi'),h('strong',{},`${valueText(current,dimension.unit)}${current===null?'':` ${UNITS[dimension.unit]}`}`))),
      h('p',{className:'hm-skillmap__note'},dimension.delta===null?delta:`Változás az első azonos beállítású körhöz képest: ${delta}.`)),trendPlot(h,dimension)));
  }
  root.append(h('header',{className:'hm-skillmap__hero'},h('span',{},'A GYAKORLÁSOD TÉRKÉPE'),h('h2',{},teacher?'Így alakul a tanuló emlékezése':'Minden emlék mögött egy készség.'),h('p',{},h('strong',{},`${measured} / 10 területen van már saját adat.`),' Válassz egy kártyát: megmutatjuk a legutóbbi eredményt és a saját változásodat. A körök pontosságot, időt és segítséghasználatot mérnek külön.')),
    h('div',{className:'hm-skillmap__grid'},...cards),detail,h('p',{className:'hm-skillmap__note'},'Az idősor mindig azonos feladatbeállításokat köt össze. A körgyűrű csak százalékos mutatót ábrázol; a tempó és az idő saját mértékegységben marad. A hiányzó adat nem nulla, és ez nem más emberekhez vagy agyi aktivitáshoz viszonyított mérés.'));
  draw();return root;
}
