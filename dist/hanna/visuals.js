const ASSET_ROOT = './assets/hanna-v2';

export const HANNA_V2_PALETTE = Object.freeze({
  ink: '#2d2034', aubergine: '#583267', purple: '#79508b', lilac: '#e9dff0',
  lime: '#c9ef57', limeDark: '#59721d', cream: '#fffaf0', paper: '#f4eadb',
  coral: '#e97869', teal: '#3f8f88', ochre: '#d9a441', white: '#ffffff',
});

export const HANNA_ROOM_LOCATIONS = Object.freeze([
  ['entrance-door','bejárati ajtó','entry',11,47],['coat-rack','fogas','entry',26,40],['shoe-rack','cipőtartó','entry',43,61],['entry-mirror','tükör','entry',60,35],['key-bowl','kulcstál','entry',83,49],
  ['sofa','kanapé','living-room',32,58],['coffee-table','dohányzóasztal','living-room',45,81],['floor-lamp','állólámpa','living-room',61,39],['living-window','nappali ablak','living-room',18,28],['bookcase','könyvespolc','living-room',88,42],
  ['fridge','hűtőszekrény','kitchen',13,39],['sink','mosogató','kitchen',34,39],['countertop','konyhapult','kitchen',53,42],['oven','sütő','kitchen',71,55],['dining-table','étkezőasztal','kitchen',88,67],
  ['bed','ágy','bedroom',31,59],['nightstand','éjjeliszekrény','bedroom',54,67],['wardrobe','gardrób','bedroom',73,40],['dresser','komód','bedroom',88,58],['bedroom-window','hálószoba ablaka','bedroom',18,28],
  ['bathroom-door','fürdőszoba ajtaja','bathroom',11,44],['washbasin','mosdó','bathroom',34,56],['mirror-cabinet','tükrös szekrény','bathroom',36,27],['shower','zuhany','bathroom',72,41],['towel-rack','törölközőtartó','bathroom',89,49],
  ['study-door','dolgozószoba ajtaja','study',10,45],['desk','íróasztal','study',39,58],['monitor','monitor','study',46,39],['printer','nyomtató','study',69,55],['swivel-chair','forgószék','study',85,65],
].map(([id,label,roomId,x,y], index) => Object.freeze({ id,label,roomId,x,y,index:index+1,roomPosition:(index%5)+1 })));

export const HANNA_ROOMS = Object.freeze([
  {id:'entry',label:'1. Előszoba',src:`${ASSET_ROOT}/room-01-entry.svg`},
  {id:'living-room',label:'2. Nappali',src:`${ASSET_ROOT}/room-02-living.svg`},
  {id:'kitchen',label:'3. Konyha',src:`${ASSET_ROOT}/room-03-kitchen.svg`},
  {id:'bedroom',label:'4. Hálószoba',src:`${ASSET_ROOT}/room-04-bedroom.svg`},
  {id:'bathroom',label:'5. Fürdőszoba',src:`${ASSET_ROOT}/room-05-bathroom.svg`},
  {id:'study',label:'6. Dolgozószoba',src:`${ASSET_ROOT}/room-06-study.svg`},
]);

export const HANNA_PORTRAITS = Object.freeze(Array.from({ length: 24 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return Object.freeze({ id: `portrait-${number}`, src: `${ASSET_ROOT}/portraits/portrait-${number}.webp`, atlasIndex: index });
}));

export const HANNA_OBJECT_KEYS = Object.freeze(`alma auto csillag cica virag lufi kulcs lohere pillango hold kalap teknos eper labda raketa napraforgo banan bicikli ceruza dob ecset fenyo gomba hajo inga kancso maci ora pohar robot sajt tojas paradicsom repa szolo citrom hal meh bagoly kutya vonat repulo busz roller kamera telefon konyv ernyo korona harang gyertya zongora ananasz avokado barack cseresznye dinnye fank hamburger kenyer korte kukorica narancs pizza suti torta fagyi beka delfin elefant kacsa krokodil lo majom nyul oroszlan pingvin roka sun tigris zebra zsiraf mento helikopter motor taxi traktor teherauto villamos gitar hegedu trombita szaxofon ollo szemuveg taska terkep iranytu nagyito lampa sepru vodor kalapacs csavarhuzo fogkefe szappan dobokocka kirako papirsarkany jojo fa kaktusz level tulipan rozsa cipo zokni kesztyu sal kabat`.split(' '));
const PEG_TAIL_KEYS=Object.freeze(`alma auto csillag cica virag lufi kulcs lohere pillango hold kalap teknos eper labda raketa napraforgo banan bicikli ceruza dob ecset fenyo gomba hajo inga kancso maci ora pohar robot sajt tojas paradicsom repa szolo citrom hal meh bagoly kutya vonat repulo busz roller kamera telefon konyv ernyo korona harang zongora ananasz avokado barack cseresznye dinnye fank hamburger kenyer korte kukorica narancs pizza suti torta fagyi beka delfin elefant kacsa krokodil lo majom nyul oroszlan pingvin roka sun tigris zebra`.split(' '));

const OBJECT_ALIASES = Object.freeze({
  apple:'alma',umbrella:'ernyo',esernyo:'ernyo',book:'konyv',lamp:'lampa',violin:'hegedu',key:'kulcs',bell:'harang',cup:'pohar',bicycle:'bicikli',sun:'napraforgo',
  notebook:'konyv',hook:'kalapacs',door:'kulcs',word:'konyv',number:'dobokocka',meaning:'nagyito',bridge:'terkep',memory:'kirako',
  lista:'konyv',strategia:'iranytu',emlek:'kirako',ido:'ora',előtte:'iranytu',
});
const OBJECT_LABELS = Object.freeze({apple:'alma',umbrella:'esernyő',book:'könyv',lamp:'lámpa',violin:'hegedű',key:'kulcs',bell:'harang',cup:'pohár',bicycle:'bicikli'});

function numberFromId(value, fallback = 1) {
  const match = String(value || '').match(/(\d{1,3})(?!.*\d)/);
  return match ? Math.max(1, Number(match[1])) : fallback;
}

export function hannaPortraitSource(id) {
  const match = String(id || '').match(/^portrait-(\d{2})$/);
  const number = match ? Number(match[1]) : 0;
  return number >= 1 && number <= 24 ? `${ASSET_ROOT}/portraits/portrait-${String(number).padStart(2, '0')}.webp` : null;
}

export function resolveHannaRoomLocation(id, index = 0) {
  const raw = String(id || '').replace(/^builtin-room:/, '');
  return HANNA_ROOM_LOCATIONS.find((entry) => entry.id === raw) || null;
}

function titleCase(value) {
  const raw = String(value || '').replace(/^.*:/, '').replace(/[-_]+/g, ' ').trim();
  return OBJECT_LABELS[raw] || raw || 'emlékkép';
}

function objectKey(key) {
  const raw = String(key || '').replace(/^object:/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (HANNA_OBJECT_KEYS.includes(raw)) return raw;
  if (OBJECT_ALIASES[raw]) return OBJECT_ALIASES[raw];
  const peg = raw.match(/^peg-(\d{1,3})$/);
  if (peg && Number(peg[1]) >=21 && Number(peg[1])<=100) return PEG_TAIL_KEYS[Number(peg[1])-21];
  return null;
}

export function hannaObjectSource(key) {
  const peg=String(key||'').match(/^peg-(\d{1,3})$/);if(peg&&Number(peg[1])>=1&&Number(peg[1])<=20)return `${ASSET_ROOT}/pegs/peg-${String(Number(peg[1])).padStart(3,'0')}.webp`;
  const resolved = objectKey(key);
  return resolved ? `${ASSET_ROOT}/objects/${resolved}.${resolved==='inga'?'svg':'webp'}` : null;
}

function objectPicture(h, key, label, className = '') {
  const source = hannaObjectSource(key);
  if (source) return h('img', { className, src: source, alt: label || titleCase(key), draggable: false });
  return h('div', { className:`hanna-v2-visual-fallback ${className}`.trim(), dataset:{visualFallback:String(key || 'unknown')}, role:'img', 'aria-label':`${label || titleCase(key)} – szöveges vizuális helyőrző` },
    h('span',{},'KÉP'),h('strong',{},label || titleCase(key)));
}

const CONCEPT_KEYS=Object.freeze(['egyuttmukodes','egyensuly','kovetkezmeny','alkalmazkodas','rendszer','felelosseg','kolcsonhatas','kovetkezetesseg','osszefugges','prioritas','valtozas','bizonyitek','okozat','hatar','modell','hipotezis','meres','bizonytalansag','absztrakcio','strategia','visszacsatolas','korlat','dontes','nezopont']);
function conceptPicture(h,key,label,className=''){
  const id=String(key||'').replace(/^concept-/,'');if(!CONCEPT_KEYS.includes(id))return null;
  const path=(d,extra={})=>h('path',{d,fill:'none',stroke:'#583267','stroke-width':'8','stroke-linecap':'round','stroke-linejoin':'round',...extra});
  const circle=(cx,cy,r,fill='#c9ef57')=>h('circle',{cx,cy,r,fill,stroke:'#583267','stroke-width':'6'});
  const rect=(x,y,width,height,fill='#fffaf0',extra={})=>h('rect',{x,y,width,height,rx:'8',fill,stroke:'#583267','stroke-width':'6',...extra});
  const arrow=(d)=>h('g',{},path(d,{stroke:'#e97869','stroke-width':'10'}),path('M188 52l24 14l-22 17',{stroke:'#e97869','stroke-width':'10'}));
  let art=[];
  if(id==='egyuttmukodes')art=[circle(74,70,22),circle(246,70,22),path('M75 96l45 58l40-29l40 29l45-58'),rect(130,118,60,48,'#e97869')];
  else if(id==='egyensuly')art=[path('M160 48v132M92 180h136M82 82h156'),path('M100 82l-28 66h56zM220 82l-28 66h56z'),circle(160,45,12,'#e97869')];
  else if(id==='kovetkezmeny'||id==='okozat')art=[...Array.from({length:5},(_,i)=>rect(42+i*48,82+i*9,22,78,i===4&&id==='kovetkezmeny'?'#e97869':'#c9ef57',{transform:`rotate(${i*8} ${53+i*48} ${121+i*9})`})),id==='okozat'?arrow('M30 58C100 22 182 24 208 62'):path('M264 55l8 19l20 3l-15 14l4 20l-17-10l-18 10l5-20l-16-14l21-3z',{fill:'#e97869'})];
  else if(id==='alkalmazkodas')art=[path('M52 125c50-70 126-75 174-22c-38 64-118 79-174 22z',{fill:'#c9ef57'}),circle(198,101,7,'#2d2034'),path('M68 126c-36 5-37 45 1 45'),path('M110 92c14 35 40 56 78 61',{stroke:'#3f8f88'})];
  else if(id==='rendszer'||id==='visszacsatolas')art=[circle(112,112,44,'#c9ef57'),circle(204,112,34,'#e97869'),circle(112,112,12,'#fff'),circle(204,112,10,'#fff'),id==='visszacsatolas'?arrow('M72 62C126 15 224 34 227 75'):path('M148 112h22')];
  else if(id==='felelosseg')art=[path('M55 167c35-28 68-34 104-5c26-42 63-64 108-61'),circle(205,91,55,'#fff'),path('M205 48v86M162 91h86'),path('M205 91l25-29',{stroke:'#e97869','stroke-width':'10'})];
  else if(id==='kolcsonhatas')art=[circle(98,116,42,'#c9ef57'),circle(222,116,42,'#e97869'),path('M140 116h40'),path('M159 92l24 24l-24 24M181 92l-24 24l24 24')];
  else if(id==='kovetkezetesseg')art=[...Array.from({length:5},(_,i)=>h('ellipse',{cx:64+i*47,cy:150-i*18,rx:'18',ry:'27',fill:i%2?'#e97869':'#c9ef57',stroke:'#583267','stroke-width':'5',transform:`rotate(-28 ${64+i*47} ${150-i*18})`})),path('M48 186L274 63',{stroke:'#3f8f88','stroke-dasharray':'3 17'})];
  else if(id==='osszefugges')art=[circle(160,108,22,'#e97869'),circle(70,58,18),circle(250,58,18),circle(70,170,18),circle(250,170,18),path('M88 65l54 33M232 65l-54 33M88 164l54-44M232 164l-54-44')];
  else if(id==='prioritas')art=[rect(52,142,62,45,'#e9dff0'),rect(129,110,62,77,'#c9ef57'),rect(206,70,62,117,'#e97869'),circle(237,50,14,'#c9ef57')];
  else if(id==='valtozas')art=[h('ellipse',{cx:'84',cy:'118',rx:'25',ry:'55',fill:'#e9dff0',stroke:'#583267','stroke-width':'7'}),arrow('M117 116h66'),path('M222 115c-45-45-57 24-15 18c-9 49 42 31 26-5c48 14 44-43 3-22c3-44-46-38-31 3z',{fill:'#c9ef57'})];
  else if(id==='bizonyitek')art=[circle(135,102,62,'#fff'),path('M180 148l57 47',{stroke:'#e97869','stroke-width':'16'}),path('M113 83c16-24 41-4 27 13c-18 24 1 40 18 22M117 137h2',{stroke:'#3f8f88'})];
  else if(id==='hatar')art=[rect(42,52,236,132,'#fff'),path('M160 46v144',{stroke:'#e97869','stroke-width':'12','stroke-dasharray':'13 12'}),circle(98,118,25),circle(222,118,25,'#e97869')];
  else if(id==='modell')art=[rect(42,48,236,144,'#e9dff0'),path('M66 156l45-62l49 62l49-62l45 62M64 164h192'),rect(194,62,58,36,'#fff')];
  else if(id==='hipotezis')art=[rect(72,40,176,154,'#fff'),path('M129 89c6-31 62-29 62 7c0 29-32 26-32 52M159 172h1',{stroke:'#e97869','stroke-width':'12'})];
  else if(id==='meres')art=[rect(54,142,212,35,'#c9ef57'),...Array.from({length:8},(_,i)=>path(`M${72+i*24} 142v${i%2?16:25}`,{stroke:'#583267','stroke-width':'4'})),path('M115 134c2-65 70-82 96-36c-13 39-54 47-96 36z',{fill:'#3f8f88'})];
  else if(id==='bizonytalansag')art=[path('M30 164c45-34 69 22 111-8s70 15 143-15',{stroke:'#b9acbb','stroke-width':'18'}),path('M160 160V71M160 75l64 28l-64 26'),circle(160,54,10,'#e97869')];
  else if(id==='absztrakcio')art=[rect(40,126,46,46,'#e97869'),circle(135,149,25),path('M194 172l27-50l31 50z',{fill:'#3f8f88'}),arrow('M84 78h124'),path('M218 43c-40-23-84-23-119 0v51c40 23 81 23 119 0z',{fill:'#c9ef57'})];
  else if(id==='strategia')art=[circle(58,170,15,'#e97869'),circle(260,48,18,'#c9ef57'),path('M58 154V95h88V62M146 95h72v-27M146 95v55h64'),path('M241 48h-22M206 37l13 11l-13 11',{stroke:'#e97869'})];
  else if(id==='korlat')art=[path('M38 178C84 110 102 88 160 78c58 10 76 32 122 100',{stroke:'#c9ef57','stroke-width':'28'}),rect(132,65,56,102,'#fff'),path('M132 88h56M132 118h56')];
  else if(id==='dontes')art=[path('M160 186V107M160 107L84 50M160 107l76-57'),path('M75 48l27-2l-10 25M245 48l-27-2l10 25',{stroke:'#e97869'}),circle(160,190,12,'#c9ef57')];
  else if(id==='nezopont')art=[path('M160 60l63 36v72l-63 36l-63-36V96zM97 96l63 36l63-36M160 132v72'),circle(54,92,18,'#c9ef57'),circle(266,176,18,'#e97869'),path('M72 99l48 20M248 168l-48-18')];
  return h('svg',{className:`hanna-v2-semantic-concept ${className}`.trim(),viewBox:'0 0 320 230',role:'img','aria-label':`${label||titleCase(id)} – rajzolt fogalmi metafora`,dataset:{conceptKey:id}},h('rect',{width:'320',height:'230',rx:'28',fill:'#fffaf0'}),...art);
}

function sceneVisual(h, visual, label) {
  const parts = Array.isArray(visual.parts) ? visual.parts : [];
  const left = parts.find((entry) => entry.role === 'actor') || parts[0] || { key: visual.key };
  const right = parts.find((entry) => entry.role === 'target') || parts[1] || { key: `${visual.key}-target` };
  const action = String(visual.action || visual.variant || 'interaction').toLowerCase();const relationship=String(visual.relationship||'').toLowerCase();
  const adjacent = relationship==='adjacency'||/adjacent|mellett|near|side|beside/.test(action); const fused = /fus|merge|össze|inside|through|transform/.test(action);const collision=relationship==='interaction'||/collid|impact|shatter|utkoz|csapod/.test(action);
  const mode = relationship==='isolated'?'isolated':relationship==='other-context'?'other-context':adjacent?'adjacent':collision?'collision':fused?'fusion':/burst/.test(action)?'burst':'interaction';
  const actionLabel = {adjacent:'csak egymás mellett',isolated:'külön, kapcsolat nélkül','other-context':'két külön helyzet',collision:'nekicsapódik · kibillen',fusion:'egymásba alakulnak',burst:'szétrobbannak',interaction:'hatnak egymásra'}[mode];
  return h('figure', { className: `hanna-v2-visual hanna-v2-scene is-${mode}`, 'aria-label': label, dataset:{sceneAction:mode} },
    h('div', {className:'hanna-v2-scene-board'},
      conceptPicture(h,left.key,left.label || titleCase(left.key),'is-actor')||objectPicture(h,left.key,left.label || titleCase(left.key),'is-actor'),
      conceptPicture(h,right.key,right.label || titleCase(right.key),'is-target')||objectPicture(h,right.key,right.label || titleCase(right.key),'is-target'),
      h('svg',{className:'hanna-v2-scene-motion',viewBox:'0 0 460 220','aria-hidden':'true'},mode==='adjacent'?h('path',{d:'M170 178H290',stroke:'#8f7a94','stroke-width':'5','stroke-dasharray':'4 12'}):mode==='isolated'?null:mode==='other-context'?h('path',{d:'M230 20V200',stroke:'#583267','stroke-width':'9'}):mode==='collision'?h('g',{},h('path',{d:'M36 126C102 126 154 119 218 109',fill:'none',stroke:'#c9ef57','stroke-width':'16','stroke-linecap':'round'}),h('path',{d:'M196 91L224 108L199 130',fill:'none',stroke:'#583267','stroke-width':'9','stroke-linecap':'round','stroke-linejoin':'round'}),h('path',{d:'M247 71l12 25l27-14l-11 27l28 9l-28 9l11 27l-27-14l-12 25l-10-25l-28 14l11-27l-28-9l28-9l-11-27l28 14z',fill:'#e97869',stroke:'#583267','stroke-width':'4'})):h('g',{},h('path',{d:'M92 151C156 17 326 22 363 111C383 161 334 190 290 166',fill:'none',stroke:'#c9ef57','stroke-width':'15','stroke-linecap':'round'}),h('path',{d:'M286 145L277 176L309 167',fill:'none',stroke:'#583267','stroke-width':'8','stroke-linecap':'round','stroke-linejoin':'round'}),h('path',{d:'M220 94l15-33l14 33l34 14l-34 14l-14 34l-15-34l-34-14z',fill:'#e97869'}))),
      !['adjacent','isolated','other-context'].includes(mode)?h('div',{className:'hanna-v2-scene-fragments','aria-hidden':'true'},...Array.from({length:3},()=>h('i',{},conceptPicture(h,right.key,right.label||titleCase(right.key))||objectPicture(h,right.key,'','')))):null,
      h('b',{},actionLabel)),
    h('figcaption', {}, label));
}

function cardVisual(h, visual, label) {
  const type = visual.type || 'object';
  return h('figure', { className: `hanna-v2-visual hanna-v2-symbol is-${type}`, 'aria-label': label },
    type === 'number'
      ? h('div',{className:'hanna-v2-number-card'},String(visual.label || visual.key || '0'))
      : type === 'concept'
        ? conceptPicture(h,visual.key,label)||h('div',{className:'hanna-v2-concept-card',dataset:{visualFallback:String(visual.key||'unknown')}},h('i',{},'SAJÁT FOGALOM'),h('strong',{},label),h('span',{},'Készíts hozzá saját mentális képet'))
        : objectPicture(h,visual.key,label),
    h('figcaption', {}, label));
}

function methodVisual(h,visual,label){const key=visual.key;
  if(key==='loci'||key==='palace')return h('figure',{className:'hanna-v2-visual hanna-v2-method-art is-route','aria-label':label},h('div',{className:'hanna-v2-method-room'},h('img',{src:HANNA_ROOMS[0].src,alt:''}),...HANNA_ROOM_LOCATIONS.slice(0,5).map((location)=>h('span',{style:{'--hotspot-x':`${location.x}%`,'--hotspot-y':`${location.y}%`}},String(location.index)))),h('b',{},key==='palace'?'Saját helyekből útvonal':'5 → 10 → 30 stabil hely'));
  if(key==='peg')return h('figure',{className:'hanna-v2-visual hanna-v2-method-art is-peg','aria-label':label},h('div',{className:'hanna-v2-method-peg'},h('strong',{},'1'),h('i',{},'→'),objectPicture(h,'peg-001','gyertya'),h('span',{},'szám → horog → kép')));
  if(key==='keyword')return h('figure',{className:'hanna-v2-visual hanna-v2-method-art is-keyword','aria-label':label},h('div',{className:'hanna-v2-method-keyword'},h('span',{},'PATO'),h('i',{},'hangzik: „pad”'),objectPicture(h,'kacsa','kacsa'),h('b',{},'jelentése: kacsa')));
  if(key==='random')return h('figure',{className:'hanna-v2-visual hanna-v2-method-art is-random','aria-label':label},h('div',{className:'hanna-v2-method-random'},h('b',{},'Mi volt a 7. hely előtt?'),h('div',{},...Array.from({length:7},(_,index)=>h('span',{className:index===6?'is-active':''},String(index+1)))),h('i',{},'6 → ? → 7')));
  if(key==='review')return h('figure',{className:'hanna-v2-visual hanna-v2-method-art is-review','aria-label':label},h('div',{className:'hanna-v2-method-review'},h('div',{},h('strong',{},'1'),h('span',{},'3'),h('span',{},'7')),objectPicture(h,'alma','régi emlék'),h('b',{},'Ma esedékes')));
  if(key==='boss')return h('figure',{className:'hanna-v2-visual hanna-v2-method-art is-boss','aria-label':label},h('div',{className:'hanna-v2-method-boss'},h('div',{},objectPicture(h,'alma','lista'),h('b',{},'Lánc')),h('div',{},h('img',{src:hannaPortraitSource('portrait-03'),alt:'arc'}),h('b',{},'Arc')),h('div',{},h('strong',{},'42'),h('b',{},'Szám')),h('div',{},objectPicture(h,'nagyito','fogalom'),h('b',{},'Fogalom'))));
  return cardVisual(h,{type:'object',key:'kirako',label},label);
}

export function renderHannaVisual(h, visual = {}, options = {}) {
  const normalized = typeof visual === 'string' ? { type: 'object', key: visual } : (visual || {});
  const label = options.label || normalized.label || titleCase(normalized.key);
  if(normalized.type==='method')return methodVisual(h,normalized,label);
  if (normalized.type === 'portrait') {
    const source=hannaPortraitSource(normalized.key);
    return h('figure', { className: `hanna-v2-visual hanna-v2-portrait${source?'':' is-missing'}`, dataset: { portraitId: normalized.key, ...(source?{}:{visualFallback:'invalid-portrait'}) }, 'aria-label': source?(options.recall ? 'Arcportré név nélkül' : label):'A portré nem érhető el' },
      source?h('img', { src: source, alt: options.recall ? 'Egy korábban tanult személy portréja' : label, draggable: false }):h('svg',{viewBox:'0 0 240 240','aria-hidden':'true'},h('rect',{width:'240',height:'240',fill:'#e9dff0'}),h('circle',{cx:'120',cy:'88',r:'42',fill:'#fffaf0',stroke:'#583267','stroke-width':'8'}),h('path',{d:'M45 220c8-55 36-82 75-82s67 27 75 82',fill:'#fffaf0',stroke:'#583267','stroke-width':'8'}),h('path',{d:'M78 88c6-39 78-53 87 1',fill:'none',stroke:'#79508b','stroke-width':'16','stroke-linecap':'round'})),
      source&&!options.recall ? h('figcaption', {}, label) : null);
  }
  if (normalized.type === 'location') {
    const location = resolveHannaRoomLocation(normalized.key);
    if (!location) return cardVisual(h,{type:'object',key:normalized.key,label},label);
    const room=HANNA_ROOMS.find((entry)=>entry.id===location.roomId);
    return h('figure', { className: 'hanna-v2-location-cue', dataset: { locationId: location.id } },
      h('img', { src: room.src, alt: '' }),
      h('span', { style: { '--hotspot-x': `${location.x}%`, '--hotspot-y': `${location.y}%` } }, String(location.index)),
      options.hideLabel?null:h('figcaption', {}, location.label));
  }
  if (normalized.type === 'scene') return sceneVisual(h, normalized, label);
  return cardVisual(h, normalized, label);
}

export function renderHannaRoom(h, { locations = HANNA_ROOM_LOCATIONS, activeId = null, visitedIds = [], onSelect = null, chunk = null } = {}) {
  const resolved = locations.map((entry, index) => {
    const base = resolveHannaRoomLocation(entry?.id || entry?.anchorId || entry, index);
    const own = typeof entry === 'object' ? entry : {};
    return { ...(base || {}), ...own, id: own.id || own.locationId || base?.id || String(entry), label: own.label || own.name || base?.label || `Saját hely ${index+1}`, builtin:Boolean(base), index:index+1 };
  });
  const custom = resolved.some((entry)=>!entry.builtin || entry.photo || entry.image || entry.imageUrl);
  const start = chunk == null ? 0 : Math.max(0, Number(chunk) * (custom?10:5));
  const active=resolved.find((entry)=>entry.id===activeId);const roomId=active?.roomId||resolved[start]?.roomId;
  const builtinRoom=HANNA_ROOMS.some((entry)=>entry.id===roomId);
  const guided = builtinRoom ? resolved.filter((entry)=>entry.roomId===roomId) : resolved.length>10?resolved.slice(start,start+10):resolved;
  const guideStart=Math.max(0,resolved.indexOf(guided[0]));
  const visited = new Set(visitedIds);
  const interactive=typeof onSelect==='function';
  return h('section', { className: `hanna-v2-room${custom?' is-custom':''}`, dataset: { activeLocation: activeId || '' } },
    custom?null:h('div',{className:'hanna-v2-room-map','aria-label':'Az előszobából nyíló hat szoba útvonala'},h('strong',{},'Előszobai elosztó'),h('div',{},...HANNA_ROOMS.map((room,index)=>h('span',{className:room.id===roomId?'is-active':'','aria-current':room.id===roomId?'step':null},h('b',{},String(index+1)),room.label.replace(/^\d+\.\s*/,''))))),
    custom ? h('div',{className:'hanna-v2-custom-route','aria-label':'Saját útvonal állomásai'},...guided.map((location,index)=>h(interactive?'button':'div',{...(interactive?{type:'button',onClick:()=>onSelect(location.id)}:{}),className:`${location.id===activeId?'is-active ':''}${visited.has(location.id)?'is-visited':''}`.trim(),dataset:{locationId:location.id},'aria-current':location.id===activeId?'step':null},location.photo||location.image||location.imageUrl?h('img',{src:location.photo||location.image||location.imageUrl,alt:''}):h('span',{},String(start+index+1)),h('b',{},location.label)))) :
    h('div', { className: 'hanna-v2-room-canvas' },
      h('img', { src: HANNA_ROOMS.find((entry)=>entry.id===roomId)?.src||HANNA_ROOMS[0].src, alt: HANNA_ROOMS.find((entry)=>entry.id===roomId)?.label||'Háromrészes otthoni memóriaútvonal', draggable: false }),
      h('strong',{className:'hanna-v2-room-name'},HANNA_ROOMS.find((entry)=>entry.id===roomId)?.label||'Saját útvonal'),
      ...guided.filter((location)=>Number.isFinite(Number(location.x))&&Number.isFinite(Number(location.y))).map((location) => h(interactive?'button':'span', {
        ...(interactive?{type:'button',onClick:()=>onSelect(location.id)}:{role:'img'}), className: `hanna-v2-hotspot ${location.id === activeId ? 'is-active ' : ''}${visited.has(location.id) ? 'is-visited' : ''}`.trim(),
        style: { '--hotspot-x': `${location.x}%`, '--hotspot-y': `${location.y}%` },
        dataset: { locationId: location.id }, 'aria-label': `${location.index}. ${location.label}`,
        'aria-current': location.id === activeId ? 'step' : null,
      }, h('span', {}, String(location.index))))),
    custom?null:h('ol', { className: 'hanna-v2-room-guide', start: guideStart + 1, 'aria-label': resolved.length > 10 ? `${guideStart + 1}–${Math.min(guideStart + guided.length, resolved.length)}. állomás` : 'A szoba állomásai' },
      ...guided.map((location) => h('li', { className: location.id === activeId ? 'is-active' : '' },
        h('div', {}, h('span', {}, String(resolved.indexOf(location) + 1)), h('b', {}, location.label))))));
}

function resourceMeta(resource = {}) {
  if (resource.statusMessage) return String(resource.statusMessage);
  if (resource.kind === 'palace') return `${resource.data?.locations?.length || 0} stabil hely · ${resource.ready ? 'bejárható' : 'betanítás kell'}`;
  if (resource.kind === 'major') return `${resource.data?.entries?.length || 0}/100 kód elkészítve`;
  if (resource.kind === 'peg') return `${resource.data?.entries?.length || 0} saját horog`;
  return `${resource.data?.items?.length || resource.data?.rubric?.length || 0} tanulási egység`;
}

export function createHannaResourceCard(h, resource = {}, actions = {}) {
  const visualKey = resource.kind === 'palace' ? 'door' : resource.kind === 'peg' ? 'hook' : resource.kind === 'major' ? 'number-code' : 'notebook';
  return h('article', { className: 'hanna-v2-resource-card', dataset: { resourceId: resource.id || '', resourceKind: resource.kind || '' } },
    renderHannaVisual(h, { type: resource.kind === 'major' ? 'number' : 'object', key: visualKey, label: resource.kind === 'major' ? '00–99' : undefined }, { label: resource.title || 'Saját eszköz' }),
    h('div', { className: 'hanna-v2-resource-copy' }, h('span', { className: 'hanna-v2-kicker' }, `${resource.kind || 'anyag'} · R${resource.revision || 1}`),
      h('h3', {}, resource.title || 'Névtelen eszköz'), h('p', {}, resourceMeta(resource)),
      h('div', { className: 'hanna-v2-card-actions' },
        actions.start ? h('button', { type: 'button', className: 'hanna-v2-button is-primary', disabled: resource.kind === 'palace' && !resource.ready, onClick: () => actions.start(resource) }, resource.ready === false ? 'Betanítás után' : 'Gyakorlás') : null,
        actions.edit ? h('button', { type: 'button', className: 'hanna-v2-button is-quiet', onClick: () => actions.edit(resource) }, 'Szerkesztés') : null)));
}

export function createHannaProgressCard(h, metric = {}) {
  const hasValue = Number.isFinite(metric.value);
  const ratioMetric=metric.unit==='ratio'||metric.unit==='%'||metric.format==='percent'||(Number.isFinite(metric.max)&&metric.max>0);
  const max = Number.isFinite(metric.max)&&metric.max>0?metric.max:metric.unit==='ratio'?1:100;
  const ratio = hasValue&&ratioMetric?Math.max(0,Math.min(1,metric.value/max)):0;
  const display=metric.display??(metric.unit==='ratio'?`${Math.round(metric.value*100)}%`:metric.unit==='ms'?`${(metric.value/1000).toLocaleString('hu-HU',{maximumFractionDigits:1})} mp`:metric.unit==='s'?`${metric.value.toLocaleString('hu-HU',{maximumFractionDigits:1})} mp`:String(metric.value));
  const evidenceLabel=({practice:'gyakorlási adat',assisted:'segítséggel felidézve',independent:'önálló felidézés',training:'betanítási adat',delayed:'késleltetett felidézés'})[metric.evidence]||metric.evidence||'gyakorlási adat';
  return h('article', { className: 'hanna-v2-progress-card', dataset: { metricId: metric.id || '' } },
    h('header', {}, h('span', { className: 'hanna-v2-kicker' }, evidenceLabel), h('h3', {}, metric.label || metric.id || 'Mutató')),
    h('div', { className: 'hanna-v2-progress-value' }, h('strong', {}, hasValue ? String(display) : '—'), h('small', {}, hasValue ? (metric.unit&&!['ratio','ms','s'].includes(metric.unit)?metric.unit:'') : 'még nincs összehasonlítható adat')),
    ratioMetric?h('div', { className: 'hanna-v2-progress-track', role: 'img', 'aria-label': hasValue ? `${metric.label||metric.id}: ${display}` : `${metric.label||metric.id}: nincs adat` }, h('span', { style: { '--progress': `${ratio * 100}%` } })):null,
    metric.note ? h('p', {}, metric.note) : null);
}

export const renderHannaResourceCard = createHannaResourceCard;
export const renderHannaProgressCard = createHannaProgressCard;
