import {
  HANNA_ACTIVITIES,
  HANNA_CONCEPTS,
  HANNA_FACES,
  HANNA_KEYWORDS,
  HANNA_OBJECTS,
  HANNA_PEGS,
  HANNA_ROUTE,
  HANNA_TEXTS,
  HU_MAJOR_DIGITS,
  HU_MAJOR_WORDS,
} from './content-v1.js';

const UINT32_MAX = 0xffffffff;
const MAX_PAYLOAD_BYTES = 1_000_000;
const MAX_TEXT = 10_000;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RETENTION_MS = Number.MAX_SAFE_INTEGER;
// Az első 52 elem a korábban kiosztott seedelt körök stabil tárgykészlete.
// A 100-as peg a teljes, kibővített készletből választ.
const CORE_HANNA_OBJECTS = Object.freeze(HANNA_OBJECTS.slice(0,52));
const ACTIVITY_IDS = Object.freeze(HANNA_ACTIVITIES.map((entry) => entry.id));
const ACTIVITY_BY_ID = Object.freeze(Object.fromEntries(HANNA_ACTIVITIES.map((entry) => [entry.id, entry])));
const EVENT_TYPES = Object.freeze(['pause','resume','visibility','restart','hint','show-answer','phase']);
const CONTENT_LEVELS = Object.freeze(['concrete','mixed','abstract','material']);
const DIFFICULTIES = Object.freeze(['easy','normal','hard']);
const CONTENT_LEVELS_BY_ACTIVITY = Object.freeze(Object.fromEntries(HANNA_ACTIVITIES.map(({id})=>[id,Object.freeze(
  ['chain','association'].includes(id)?['concrete','mixed','abstract','material']:
  ['keyword','text','concept'].includes(id)?['concrete','material']:['concrete'],
)])));
const INTERVALS = Object.freeze([600_000,3_600_000,86_400_000,259_200_000,604_800_000,1_209_600_000,2_592_000_000]);
const COUNTS = Object.freeze({
  baseline:[3,10,5],chain:[5,40,8],association:[3,15,5],loci:[5,30,8],palace:[5,30,8],peg:[5,100,10],
  faces:[3,12,5],keyword:[3,8,5],major:[10,10,10],numbers:[16,30,16],random:[5,30,10],text:[1,1,1],
  concept:[3,6,5],review:[1,50,10],boss:[4,12,8],
});

function invalid(message) { throw new TypeError(`Hibás Hanna-adat: ${message}`); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function allowedObject(value, keys, label) {
  if (!isObject(value)) invalid(`${label} objektum legyen`);
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) invalid(`${label} ismeretlen mezőt tartalmaz`);
  return value;
}
function integer(value, label, min, max) {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) invalid(`${label} ${min} és ${max} közötti egész legyen`);
  return parsed;
}
function numberValue(value, label, min, max) {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) invalid(`${label} ${min} és ${max} közötti szám legyen`);
  return parsed;
}
function textValue(value, label, {min=1,max=500}={}) {
  if (typeof value !== 'string') invalid(`${label} szöveg legyen`);
  const result = value.trim();
  if (result.length < min || result.length > max) invalid(`${label} hossza ${min}–${max} karakter legyen`);
  return result;
}
function booleanValue(value, fallback, label) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === false) return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  invalid(`${label} logikai érték legyen`);
}
function enumValue(value, allowed, label) {
  if (!allowed.includes(value)) invalid(`${label} nem támogatott`);
  return value;
}
function uniqueStrings(value, label, {max=100}={}) {
  const source = typeof value === 'string' ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : value;
  if (!Array.isArray(source) || source.length > max) invalid(`${label} legfeljebb ${max} elemű lista legyen`);
  const result = source.map((entry,index) => textValue(entry, `${label}[${index}]`, {max:100}));
  if (new Set(result).size !== result.length) invalid(`${label} ne tartalmazzon ismétlést`);
  return result;
}
function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
function isoValue(value, label) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) invalid(`${label} érvényes ISO-időpont legyen`);
  return new Date(value).toISOString();
}
function normalizedText(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function seededRandom(seed) {
  let state = integer(seed, 'seed', 0, UINT32_MAX) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(values, rng) {
  const result = [...values];
  for (let index=result.length-1; index>0; index-=1) {
    const other = Math.floor(rng() * (index+1));
    [result[index],result[other]] = [result[other],result[index]];
  }
  return result;
}
function sample(values, count, rng) {
  if (count > values.length) invalid('nincs elég különböző tartalmi elem ehhez a körhöz');
  return shuffle(values,rng).slice(0,count);
}
function median(values) {
  if (!values.length) return null;
  const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
  return sorted.length%2 ? sorted[middle] : Math.round((sorted[middle-1]+sorted[middle])/2);
}
function publicItem(item, prefix='item') {
  return {id:`${prefix}-${item.id}`,kind:'picture',label:item.label,image:item.image,category:item.category};
}
function hints(...values) {
  const defaults=['Idézd fel a képet vagy történetet.','Keresd meg a kapcsolódó helyet vagy kulcsot.','Nézd meg az első biztos kapaszkodót.'];
  return [0,1,2].map((index)=>String(values[index] ?? defaults[index]));
}
function makeTrial(id,index,prompt,kind,itemIds,expected,extra={}) {
  return {id,index,prompt,kind,itemIds:[...itemIds],expected:clone(expected),hints:hints(...(extra.hints||[])),phase:extra.phase||'recall',
    ...(extra.choices?{choices:clone(extra.choices)}:{}),...(extra.accepted?{accepted:[...extra.accepted]}:{}),
    ...(extra.rubric?{rubric:clone(extra.rubric)}:{}),...(extra.label?{label:extra.label}:{}),
    ...(extra.entry?{entry:extra.entry}:{}),...(extra.image?{image:extra.image}:{}),...(Number.isInteger(extra.portraitIndex)?{portraitIndex:extra.portraitIndex}:{}),
  };
}
function objectChoices(items, expected, rng, count=4) {
  const pool=shuffle(items.filter((item)=>item.label!==expected),rng).slice(0,Math.max(0,count-1));
  return shuffle([{value:expected,label:expected,image:items.find((item)=>item.label===expected)?.image},...pool.map((item)=>({value:item.label,label:item.label,image:item.image}))],rng);
}
function avoidAlignedLabelCollisions(items,anchors) {
  const result=[...items];
  for(let index=0;index<result.length;index+=1){
    if(normalizedText(result[index].label)!==normalizedText(anchors[index].label))continue;
    let swapIndex=-1;
    for(let offset=1;offset<result.length;offset+=1){
      const candidate=(index+offset)%result.length;
      if(normalizedText(result[candidate].label)===normalizedText(anchors[index].label))continue;
      if(normalizedText(result[index].label)===normalizedText(anchors[candidate].label))continue;
      swapIndex=candidate;break;
    }
    if(swapIndex<0)invalid('nem készíthető önálló felidézés: a hely vagy horog neve megegyezik a tanulandó elemmel');
    [result[index],result[swapIndex]]=[result[swapIndex],result[index]];
  }
  return result;
}
function dedupeReviewItems(items){
  const seen=new Set();
  return items.filter((item)=>{const learnedIds=item.content.map((entry)=>entry.id).sort().join('|'),key=`${learnedIds}\u0000${normalizedText(item.prompt)}\u0000${JSON.stringify(item.expected)}`;if(seen.has(key))return false;seen.add(key);return true;});
}
function basePlan(settings, seed, content, encodingSteps, recallTrials, extras={}) {
  const activity=ACTIVITY_BY_ID[settings.activity];
  const generatedReviewItems=recallTrials.flatMap((trial)=>Array.isArray(trial.expected)?trial.expected.map((expected,index)=>{
    const sourceItemId=trial.itemIds[index]??`${trial.id}-${index}`,item=content.find((entry)=>entry.id===sourceItemId);
    const originalPosition=content.findIndex((entry)=>entry.id===sourceItemId)+1;
    const prompt=['multi','ordered'].includes(trial.kind)&&originalPosition>0?`Mi volt az eredeti lista ${originalPosition}. helyén?`: `${trial.prompt} (${index+1}. hely)`;
    return {id:`review-${trial.id}-${sourceItemId}`,prompt,expected,hints:[...trial.hints],content:item?[clone(item)]:[]};
  }):[{id:`review-${trial.id}`,prompt:trial.prompt,expected:clone(trial.expected),...(trial.accepted?{accepted:[...trial.accepted]}:{}),hints:[...trial.hints],content:content.filter((item)=>trial.itemIds.includes(item.id)).map(clone)}]);
  const reviewItems=extras.reviewItems??dedupeReviewItems(generatedReviewItems);
  return deepFreeze({version:1,activity:settings.activity,seed,settings:clone(settings),content:clone(content),encodingSteps:clone(encodingSteps),recallTrials:clone(recallTrials),
    instructions:{title:activity.title,text:activity.instruction},training:extras.training?clone(extras.training):null,reviewItems:clone(reviewItems),
    resourceSnapshot:clone(settings.resourceSnapshot ?? []),protocolId:`hanna-${settings.activity}-v1`,...(extras.sourceActivity?{sourceActivity:extras.sourceActivity}:{}),...(extras.sourceTextId?{sourceTextId:extras.sourceTextId}:{}),
  });
}

function normalizeMaterialItem(entry,index) {
  allowedObject(entry,['id','label','meaning','keyword','category'],`items[${index}]`);
  return {id:textValue(entry.id,`items[${index}].id`,{max:80}),label:textValue(entry.label,`items[${index}].label`,{max:300}),
    ...(entry.meaning!==undefined?{meaning:textValue(entry.meaning,`items[${index}].meaning`,{max:1000})}:{}),
    ...(entry.keyword!==undefined?{keyword:textValue(entry.keyword,`items[${index}].keyword`,{max:300})}:{}),
    ...(entry.category!==undefined?{category:textValue(entry.category,`items[${index}].category`,{max:100})}:{}),
  };
}
function normalizeRubric(value,label='rubric') {
  if (!Array.isArray(value) || value.length<1 || value.length>100) invalid(`${label} 1–100 elemű lista legyen`);
  const ids=new Set();
  return value.map((entry,index)=>{
    allowedObject(entry,['id','label','accepted'],`${label}[${index}]`);
    const id=textValue(entry.id,`${label}[${index}].id`,{max:80});
    if (ids.has(id)) invalid(`${label} azonosítói legyenek egyediek`); ids.add(id);
    const rubricLabel=textValue(entry.label,`${label}[${index}].label`,{max:300}),accepted=entry.accepted===undefined?[]:uniqueStrings(entry.accepted,`${label}[${index}].accepted`,{max:20});
    if(accepted.some((value)=>normalizedText(rubricLabel).includes(normalizedText(value))))invalid(`${label} címkéje nem tartalmazhatja a teljes elfogadott választ`);
    return {id,label:rubricLabel,...(accepted.length?{accepted}:{})};
  });
}

export function normalizeHannaResource(kind,data) {
  enumValue(kind,['palace','peg','major','material'],'kind');
  if (kind==='palace') {
    allowedObject(data,['locations'],'palace.data');
    if (!Array.isArray(data.locations) || data.locations.length<5 || data.locations.length>30) invalid('palace.locations 5–30 elemű lista legyen');
    let totalPhotoBytes=0; const ids=new Set();
    const locations=data.locations.map((entry,index)=>{
      allowedObject(entry,['id','name','description','photo'],`locations[${index}]`);
      const id=textValue(entry.id,`locations[${index}].id`,{max:80}); if(ids.has(id))invalid('a helyazonosítók legyenek egyediek');ids.add(id);
      let photo;
      if(entry.photo!==undefined){
        photo=textValue(entry.photo,`locations[${index}].photo`,{max:280_000});
        const match=photo.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
        if(!match)invalid('a photo csak JPG, PNG vagy WebP data URL lehet');
        const bytes=Math.floor(match[2].length*3/4)-(match[2].endsWith('==')?2:match[2].endsWith('=')?1:0);
        if(bytes>200_000)invalid('egy palotafotó legfeljebb 200 KB lehet');totalPhotoBytes+=bytes;
      }
      return {id,name:textValue(entry.name,`locations[${index}].name`,{max:120}),description:textValue(entry.description??'',`locations[${index}].description`,{min:0,max:500}),...(photo?{photo}:{})};
    });
    if(totalPhotoBytes>1_000_000)invalid('a palotafotók összesen legfeljebb 1 MB méretűek lehetnek');
    return deepFreeze({locations});
  }
  if(kind==='peg'){
    allowedObject(data,['entries'],'peg.data');
    if(!Array.isArray(data.entries)||data.entries.length<5||data.entries.length>100)invalid('peg.entries 5–100 elemű lista legyen');
    const entries=data.entries.map((entry,index)=>{allowedObject(entry,['number','label'],`entries[${index}]`);const number=integer(entry.number,`entries[${index}].number`,1,100);if(number!==index+1)invalid('a peg-lista 1-től induló, egymást követő sorszámokat használjon');return {number,label:textValue(entry.label,`entries[${index}].label`,{max:120})};});
    if(new Set(entries.map((entry)=>normalizedText(entry.label))).size!==entries.length)invalid('a peg-címkék legyenek egyediek');
    return deepFreeze({entries});
  }
  if(kind==='major'){
    allowedObject(data,['entries'],'major.data');
    if(!Array.isArray(data.entries)||data.entries.length<1||data.entries.length>100)invalid('major.entries 1–100 elemű lista legyen');
    const seen=new Set(); const entries=data.entries.map((entry,index)=>{allowedObject(entry,['code','label'],`entries[${index}]`);const code=textValue(entry.code,`entries[${index}].code`,{min:2,max:2});if(!/^\d{2}$/.test(code)||seen.has(code))invalid('a Major-kód kétjegyű és egyedi legyen');seen.add(code);return {code,label:textValue(entry.label,`entries[${index}].label`,{max:120})};});
    return deepFreeze({entries});
  }
  allowedObject(data,['items','text','rubric'],'material.data');
  const items=data.items===undefined?[]:(()=>{if(!Array.isArray(data.items)||data.items.length>100)invalid('material.items legfeljebb 100 elemű lista legyen');const result=data.items.map(normalizeMaterialItem);if(new Set(result.map((entry)=>entry.id)).size!==result.length)invalid('a tananyagelemek azonosítói legyenek egyediek');return result;})();
  const materialText=data.text===undefined?'':textValue(data.text,'material.text',{min:0,max:MAX_TEXT});
  const rubric=data.rubric===undefined?[]:normalizeRubric(data.rubric,'material.rubric');
  if(!items.length&&!materialText)invalid('a tananyag items vagy text tartalmat igényel');
  return deepFreeze({items,...(materialText?{text:materialText}:{}),...(rubric.length?{rubric}:{})});
}

export function allowedHannaContentLevels(activity) {
  return CONTENT_LEVELS_BY_ACTIVITY[enumValue(activity,ACTIVITY_IDS,'activity')];
}

function normalizeResourceSnapshot(value) {
  if(value===undefined||value===null)return [];
  if(!Array.isArray(value)||value.length>20)invalid('resourceSnapshot legfeljebb 20 elemű lista legyen');
  const ids=new Set();
  return value.map((entry,index)=>{
    allowedObject(entry,['id','kind','title','revision','data','ready','createdAt','updatedAt'],`resourceSnapshot[${index}]`);
    const id=textValue(entry.id,`resourceSnapshot[${index}].id`,{max:100});if(ids.has(id))invalid('a resourceSnapshot azonosítói legyenek egyediek');ids.add(id);
    const kind=enumValue(entry.kind,['palace','peg','major','material'],`resourceSnapshot[${index}].kind`);
    return {id,kind,title:textValue(entry.title??id,`resourceSnapshot[${index}].title`,{max:200}),revision:integer(entry.revision??1,`resourceSnapshot[${index}].revision`,1,1_000_000),data:clone(normalizeHannaResource(kind,entry.data)),ready:entry.ready===true,
      ...(entry.createdAt?{createdAt:isoValue(entry.createdAt,`resourceSnapshot[${index}].createdAt`)}:{}),...(entry.updatedAt?{updatedAt:isoValue(entry.updatedAt,`resourceSnapshot[${index}].updatedAt`)}:{})};
  });
}
function normalizeReviewSnapshot(value) {
  if(value===undefined||value===null)return [];
  if(!Array.isArray(value)||value.length>50)invalid('reviewSnapshot legfeljebb 50 elemű lista legyen');
  const ids=new Set();
  return value.map((entry,index)=>{
    allowedObject(entry,['id','sourceActivity','sourceItemId','prompt','expected','accepted','hints','content','learnedAt','lastReviewedAt','intervalMs'],`reviewSnapshot[${index}]`);
    const id=textValue(entry.id,`reviewSnapshot[${index}].id`,{max:120});if(ids.has(id))invalid('a reviewSnapshot azonosítói legyenek egyediek');ids.add(id);
    const expected=Array.isArray(entry.expected)?uniqueStrings(entry.expected,`reviewSnapshot[${index}].expected`,{max:100}):textValue(entry.expected,`reviewSnapshot[${index}].expected`,{max:MAX_TEXT});
    if(Array.isArray(expected)&&!expected.length)invalid('a review expected nem lehet üres');
    if(!Array.isArray(entry.hints)||entry.hints.length!==3)invalid('minden review elemhez pontosan három segítség kell');
    const content=entry.content===undefined?[]:(()=>{if(!Array.isArray(entry.content)||entry.content.length>100)invalid('review content legfeljebb 100 elemű lista legyen');return entry.content.map((item,itemIndex)=>{allowedObject(item,['id','kind','label','image','meaning','keyword','fact','category','peg','location','code','portraitIndex'],`reviewSnapshot[${index}].content[${itemIndex}]`);const normalized={id:textValue(item.id,`reviewSnapshot[${index}].content[${itemIndex}].id`,{max:120}),kind:enumValue(item.kind,['word','picture','digit','face','concept','keyword','text'],`reviewSnapshot[${index}].content[${itemIndex}].kind`),label:textValue(item.label,`reviewSnapshot[${index}].content[${itemIndex}].label`,{max:500})};for(const key of ['image','meaning','keyword','fact','category','location','code'])if(item[key]!==undefined)normalized[key]=textValue(item[key],`reviewSnapshot[${index}].content[${itemIndex}].${key}`,{max:key==='meaning'?1000:500});if(item.peg!==undefined)normalized.peg=integer(item.peg,`reviewSnapshot[${index}].content[${itemIndex}].peg`,1,100);if(item.portraitIndex!==undefined)normalized.portraitIndex=integer(item.portraitIndex,`reviewSnapshot[${index}].content[${itemIndex}].portraitIndex`,0,11);return normalized;});})();
    return {id,sourceActivity:enumValue(entry.sourceActivity,ACTIVITY_IDS.filter((activity)=>activity!=='review'),`reviewSnapshot[${index}].sourceActivity`),sourceItemId:textValue(entry.sourceItemId??id,`reviewSnapshot[${index}].sourceItemId`,{max:120}),prompt:textValue(entry.prompt,`reviewSnapshot[${index}].prompt`,{max:1000}),expected,
      ...(entry.accepted?{accepted:uniqueStrings(entry.accepted,`reviewSnapshot[${index}].accepted`,{max:20})}:{}),hints:entry.hints.map((hint,hintIndex)=>textValue(hint,`reviewSnapshot[${index}].hints[${hintIndex}]`,{max:500})),content,
      learnedAt:isoValue(entry.learnedAt,`reviewSnapshot[${index}].learnedAt`),lastReviewedAt:entry.lastReviewedAt?isoValue(entry.lastReviewedAt,`reviewSnapshot[${index}].lastReviewedAt`):null,
      intervalMs:integer(entry.intervalMs,`reviewSnapshot[${index}].intervalMs`,600_000,31_536_000_000)};
  });
}

export function normalizeHannaSettings(raw={}) {
  try{if(new TextEncoder().encode(JSON.stringify(raw)).length>MAX_PAYLOAD_BYTES)invalid('settings payload legfeljebb 1 MB lehet');}catch(error){if(error instanceof TypeError&&String(error.message).startsWith('Hibás Hanna-adat:'))throw error;invalid('settings nem szerializálható');}
  allowedObject(raw,['hannaVersion','activity','difficulty','itemCount','encodingMs','delayMs','recallMode','reverse','adaptive','contentLevel','resourceIds','customContent','resourceSnapshot','reviewIds','reviewSnapshot'],'settings');
  const hannaVersion=integer(raw.hannaVersion??1,'hannaVersion',1,1);
  const activity=enumValue(raw.activity??'baseline',ACTIVITY_IDS,'activity');
  enumValue(raw.difficulty??'normal',DIFFICULTIES,'difficulty');const difficulty='normal';
  const [minCount,maxCount,defaultCount]=COUNTS[activity];
  let itemCount=integer(raw.itemCount??defaultCount,'itemCount',minCount,maxCount);
  if(activity==='numbers'&&![16,20,30].includes(itemCount))invalid('a Számszörny 16, 20 vagy 30 számjegyet használ');
  const encodingMs=integer(raw.encodingMs??0,'encodingMs',0,300_000);
  if(encodingMs>0&&encodingMs<1_000)invalid('encodingMs 0 vagy legalább 1000 legyen');
  const delayMs=integer(raw.delayMs??10_000,'delayMs',10_000,60_000);
  const supported=ACTIVITY_BY_ID[activity].recallModes;
  const recallMode=enumValue(raw.recallMode??ACTIVITY_BY_ID[activity].defaultRecallMode,supported,'recallMode');
  const reverse=booleanValue(raw.reverse,false,'reverse');
  if(reverse&&!['chain','loci','palace'].includes(activity))invalid('a reverse ennél a tevékenységnél nem használható');
  if(reverse&&!['reverse','ordered'].includes(recallMode))invalid('a reverse csak sorrendi felidézéssel használható');
  const adaptive=booleanValue(raw.adaptive,true,'adaptive');
  const contentLevel=enumValue(raw.contentLevel??'concrete',CONTENT_LEVELS,'contentLevel');
  if(!allowedHannaContentLevels(activity).includes(contentLevel))invalid(`a ${contentLevel} tartalmi szint ennél a tevékenységnél nem használható`);
  const resourceIds=raw.resourceIds===undefined?[]:uniqueStrings(raw.resourceIds,'resourceIds',{max:20});
  const reviewIds=raw.reviewIds===undefined?[]:uniqueStrings(raw.reviewIds,'reviewIds',{max:50});
  const customContent=raw.customContent===undefined?'':textValue(raw.customContent,'customContent',{min:0,max:MAX_TEXT});
  const resourceSnapshot=normalizeResourceSnapshot(raw.resourceSnapshot);
  const reviewSnapshot=normalizeReviewSnapshot(raw.reviewSnapshot);
  const pegSnapshot=resourceSnapshot.find((entry)=>entry.kind==='peg');
  if(activity==='peg'&&((pegSnapshot&&itemCount>pegSnapshot.data.entries.length)||(!resourceIds.length&&itemCount>HANNA_PEGS.length)))invalid('a kiválasztott peg-lista nem tartalmaz elég horgot');
  if(activity==='chain'&&contentLevel==='abstract'&&itemCount>HANNA_CONCEPTS.length)invalid('az absztrakt fogalomkészlet nem tartalmaz elég elemet ehhez a lánchoz');
  if(activity==='association'&&contentLevel==='abstract'&&itemCount*2>HANNA_CONCEPTS.length)invalid('az absztrakt fogalomkészlet nem tartalmaz elég elemet a képpárokhoz');
  const palaceSnapshot=resourceSnapshot.find((entry)=>entry.kind==='palace');
  if(['loci','palace'].includes(activity)&&palaceSnapshot&&itemCount>palaceSnapshot.data.locations.length)invalid('a kiválasztott palota nem tartalmaz elég helyet');
  if(activity!=='review'&&reviewSnapshot.length)invalid('reviewSnapshot csak review körhöz adható');
  if(activity==='review'&&reviewSnapshot.length)itemCount=Math.min(itemCount,reviewSnapshot.length);
  return deepFreeze({hannaVersion,activity,difficulty,itemCount,encodingMs,delayMs,recallMode,reverse,adaptive,contentLevel,resourceIds,customContent,resourceSnapshot,reviewIds,reviewSnapshot});
}

export function describeHannaSettings(settings) {
  const value=normalizeHannaSettings(settings),activity=ACTIVITY_BY_ID[value.activity];
  const mode={choice:'választás',ordered:'sorrend',free:'szabad felidézés',random:'véletlen kérdezés',reverse:'visszafelé',verbatim:'szó szerint',meaning:'kulcsgondolatok'}[value.recallMode];
  return `${activity.title} · ${value.itemCount} elem · ${mode} · ${value.encodingMs===0?'korlátlan tanulás':`${Math.round(value.encodingMs/1000)} mp tanulás`} · ${Math.round(value.delayMs/1000)} mp késleltetés`;
}

function selectedMaterial(settings, kind) { return settings.resourceSnapshot.find((entry)=>entry.kind===kind); }
function materialItems(settings) { return selectedMaterial(settings,'material')?.data.items || []; }

function baselinePlan(settings,seed,rng){
  const words=sample(CORE_HANNA_OBJECTS,settings.itemCount,rng),pictures=sample(CORE_HANNA_OBJECTS.filter((entry)=>!words.includes(entry)),settings.itemCount,rng);
  const digits=Array.from({length:settings.itemCount},(_,index)=>String((Math.floor(rng()*10)+index)%10));
  const content=[...words.map((item)=>({...publicItem(item,'word'),kind:'word',image:undefined})),...pictures.map((item)=>publicItem(item,'picture')), ...digits.map((digit,index)=>({id:`digit-${index}`,kind:'digit',label:digit}))];
  const groups=[['Szólista',words.map((item)=>item.label),content.slice(0,words.length).map((item)=>item.id)],['Képlista',pictures.map((item)=>item.label),content.slice(words.length,words.length+pictures.length).map((item)=>item.id)],['Számlista',digits,content.slice(-digits.length).map((item)=>item.id)]];
  const encodingSteps=groups.map(([title,labels,ids],index)=>({id:`baseline-study-${index}`,kind:'item',itemIds:ids,title,prompt:`Jegyezd meg sorrendben: ${labels.join(' · ')}`,checks:['Használd azt a módszert, amely természetesen eszedbe jut.']}));
  const recallTrials=[];for(const [groupIndex,[title,labels,ids]] of groups.entries())for(const phase of ['immediate','delayed'])recallTrials.push(makeTrial(`baseline-${groupIndex}-${phase}`,recallTrials.length,`${title}: add meg az elemeket eredeti sorrendben.`,'ordered',ids,labels,{phase,entry:'typed'}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials);
}
function chainPlan(settings,seed,rng){
  const custom=materialItems(settings);let source;
  if(settings.contentLevel==='material'){if(custom.length<settings.itemCount)invalid('a saját tananyag nem tartalmaz elég különböző elemet a lánchoz');source=custom.map((item)=>({...item,image:'🧩',category:item.category||'tananyag',kind:'concept'}));}
  else if(settings.contentLevel==='abstract'){if(HANNA_CONCEPTS.length<settings.itemCount)invalid('az absztrakt fogalomkészlet nem tartalmaz elég elemet ehhez a lánchoz');source=HANNA_CONCEPTS.map((item)=>({...item,category:'fogalom',kind:'concept'}));}
  else if(settings.contentLevel==='mixed')source=[...CORE_HANNA_OBJECTS,...HANNA_CONCEPTS.map((item)=>({...item,category:'fogalom',kind:'concept'}))];
  else source=CORE_HANNA_OBJECTS;
  const chosen=sample(source,settings.itemCount,rng),content=chosen.map((item)=>item.kind==='concept'?{id:`chain-${item.id}`,kind:'concept',label:item.label,image:item.image,meaning:item.meaning,keyword:item.keyword,category:item.category}:publicItem(item,'chain'));
  const encodingSteps=chosen.slice(0,-1).map((item,index)=>({id:`chain-pair-${index}`,kind:'pair',itemIds:[content[index].id,content[index+1].id],title:`${index+1}. kapcsolat`,prompt:`Kapcsold össze: ${item.label} → ${chosen[index+1].label}.`,example:`A ${item.label} mozog, túlzó méretű, és közvetlenül megváltoztatja ezt: ${chosen[index+1].label}.`,checks:['Van benne mozgás?','Elég szokatlan vagy túlzó?','A két elem kölcsönhatásban van?']}));
  let recallTrials=[];const labels=chosen.map((item)=>item.label),ids=content.map((item)=>item.id);
  if(settings.recallMode==='ordered'||settings.recallMode==='reverse'){
    const reversed=settings.recallMode==='reverse'||settings.reverse,orderedIds=reversed?[...ids].reverse():ids,orderedLabels=reversed?[...labels].reverse():labels;recallTrials=[makeTrial('chain-order',0,reversed?'Mondd vissza a láncot az utolsó elemtől.':'Mondd vissza a teljes láncot sorrendben.','ordered',orderedIds,orderedLabels)];
  }else if(settings.recallMode==='free')recallTrials=chosen.map((item,index)=>makeTrial(`chain-free-${index}`,index,`${index+1}. elem a történetben?`,'free',[content[index].id],item.label));
  else recallTrials=shuffle(chosen.map((item,index)=>({item,index})),rng).map(({item,index},trialIndex)=>makeTrial(`chain-random-${index}`,trialIndex,`Mi volt a(z) ${index+1}. elem?`,'choice',[content[index].id],item.label,{choices:objectChoices(chosen,item.label,rng)}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials);
}
function associationPlan(settings,seed,rng){
  const custom=materialItems(settings);let source=CORE_HANNA_OBJECTS;if(settings.contentLevel==='material'){if(custom.length<settings.itemCount*2)invalid('a saját tananyag nem tartalmaz elég elemet a képpárokhoz');source=custom.map((item)=>({...item,image:'🧩',category:item.category||'tananyag'}));}else if(settings.contentLevel==='abstract'){if(HANNA_CONCEPTS.length<settings.itemCount*2)invalid('az absztrakt fogalomkészlet nem tartalmaz elég elemet a képpárokhoz');source=HANNA_CONCEPTS.map((item)=>({...item,category:'fogalom'}));}else if(settings.contentLevel==='mixed')source=[...CORE_HANNA_OBJECTS,...HANNA_CONCEPTS];
  const chosen=sample(source,settings.itemCount*2,rng),left=chosen.slice(0,settings.itemCount),right=chosen.slice(settings.itemCount),content=chosen.map((item)=>publicItem(item,'assoc'));
  const encodingSteps=[{id:'association-warmup',kind:'pair',itemIds:[],title:'30 másodperces képkapcsoló-bemelegítés',prompt:'Kapcsold össze gyorsan: esernyő + elefánt. Nincs pontozás; a cél az ötletindítás.',example:'Az elefánt az ormányával esernyőként tart egy óriási ernyőt.',checks:['Megjelent mozgás?','Kapcsolatba került a két kép?']},...left.map((item,index)=>({id:`association-pair-${index}`,kind:'pair',itemIds:[content[index].id,content[index+settings.itemCount].id],title:`${index+1}. képpár`,prompt:`${item.label} + ${right[index].label}`,example:`A ${item.label} nem csak a ${right[index].label} mellett van: óriásira nőve beleugrik és megváltoztatja. Ez a kidolgozott példa mozgást és kölcsönhatást ad.`,checks:['Látod magad előtt?','Történik kölcsönhatás?','Van benne meglepő részlet?']}))];
  const recallTrials=left.map((item,index)=>makeTrial(`association-${index}`,index,`Mi kapcsolódott ehhez: ${item.label}?`,settings.recallMode==='choice'?'choice':'free',[content[index].id,content[index+settings.itemCount].id],right[index].label,{choices:settings.recallMode==='choice'?objectChoices(right,right[index].label,rng):undefined,hints:[`Idézd fel, mit változtatott meg a ${item.label}.`,`A jelenetben mozgás történt.`,`A pár második eleme ${right[index].label[0]} betűvel kezdődik.`]}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials);
}
function routeTraining(kind,locations,rng){
  const items=locations.map((location,index)=>({id:location.id,label:location.label??location.name,number:index+1,description:location.description,image:location.photo}));
  const trials=items.map((item,index)=>({id:`${kind}-training-${index}`,prompt:`Mi a(z) ${index+1}. hely?`,expected:item.label,choices:shuffle([item,...sample(items.filter((entry)=>entry.id!==item.id),Math.min(3,items.length-1),rng)],rng).map((entry)=>({value:entry.label,label:entry.label}))}));
  return {kind:'route',items,trials,threshold:{accuracy:0.9}};
}
function lociPlan(settings,seed,rng){
  const palace=selectedMaterial(settings,'palace');if(palace&&!palace.ready)invalid('a saját palota csak 90%-os útvonalteszt után használható tanuláshoz');
  const routeSource=palace?palace.data.locations.map((entry)=>({id:entry.id,label:entry.name,description:entry.description,photo:entry.photo})):HANNA_ROUTE;
  const locations=routeSource.slice(0,settings.itemCount),chosen=avoidAlignedLabelCollisions(sample(CORE_HANNA_OBJECTS,locations.length,rng),locations);
  const content=chosen.map((item,index)=>({...publicItem(item,'loci'),location:locations[index].label}));
  const encodingSteps=[{id:'loci-route',kind:'route',itemIds:[],title:'Útvonalbejárás',prompt:`Járd be ezt a stabil sorrendet: ${locations.map((entry)=>entry.label).join(' → ')}`,checks:['Minden hely különbözik?','Mindig ugyanabban a sorrendben járod be?']},...chosen.map((item,index)=>({id:`loci-place-${index}`,kind:'route',itemIds:[content[index].id],title:`${index+1}. hely: ${locations[index].label}`,prompt:`Helyezd a ${item.label} képét a(z) ${locations[index].label} helyre.`,example:`A ${item.label} látványosan kölcsönhatásba lép a hellyel.`,checks:['A hely és a tárgy összeér?','Van mozgás vagy túlzás?'],location:locations[index].label}))];
  const labels=chosen.map((item)=>item.label),ids=content.map((item)=>item.id);let recallTrials;
  if(settings.recallMode==='ordered'||settings.recallMode==='reverse') {const reverse=settings.recallMode==='reverse'||settings.reverse,orderedIds=reverse?[...ids].reverse():ids,orderedLabels=reverse?[...labels].reverse():labels;recallTrials=[makeTrial('loci-route-recall',0,reverse?'Járd be visszafelé: mely tárgyak következnek?':'Járd be előre: mely tárgyak következnek?','ordered',orderedIds,orderedLabels)];}
  else recallTrials=shuffle(chosen.map((item,index)=>({item,index})),rng).map(({item,index},trialIndex)=>makeTrial(`loci-random-${index}`,trialIndex,`Mi van itt: ${locations[index].label}?`,'choice',[content[index].id],item.label,{choices:objectChoices(chosen,item.label,rng),label:locations[index].label}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials,{training:routeTraining('loci',locations,rng)});
}
function palacePlan(settings,seed,rng){
  const resource=selectedMaterial(settings,'palace');
  if(resource&&!resource.ready)invalid('a saját palota csak 90%-os útvonalteszt után használható új tananyaghoz');
  const source=(resource?.data.locations||HANNA_ROUTE).slice(0,settings.itemCount),locations=source.map((entry)=>({id:entry.id,label:entry.name??entry.label,description:entry.description,photo:entry.photo})),chosen=avoidAlignedLabelCollisions(sample(CORE_HANNA_OBJECTS,locations.length,rng),locations);
  const content=chosen.map((item,index)=>({...publicItem(item,'palace-object'),location:locations[index].label}));
  const encodingSteps=[{id:'palace-route',kind:'route',itemIds:[],title:resource?.title||'Gyakorló palota',prompt:`Járd be a kész útvonalat: ${locations.map((entry)=>entry.label).join(' → ')}`,checks:['Ugrás nélkül fel tudod idézni a helysort?']},...chosen.map((item,index)=>({id:`palace-place-${index}`,kind:'route',itemIds:[content[index].id],title:`${index+1}. ${locations[index].label}`,prompt:`Kapcsold a(z) ${item.label} képét ehhez a saját helyhez.`,example:`A ${item.label} látványosan megváltoztatja ezt a helyet: ${locations[index].label}.`,checks:['A saját hely felismerhető maradt?','A tárgy kölcsönhat a hellyel?'],location:locations[index].label}))];
  const labels=chosen.map((entry)=>entry.label),ids=content.map((entry)=>entry.id);let recallTrials;
  if(settings.recallMode==='ordered'||settings.recallMode==='reverse'){const reverse=settings.recallMode==='reverse'||settings.reverse,orderedIds=reverse?[...ids].reverse():ids,orderedLabels=reverse?[...labels].reverse():labels;recallTrials=[makeTrial('palace-order',0,reverse?'Járd be a saját palotát visszafelé: mely tárgyak következnek?':'Járd be a saját palotát előre: mely tárgyak következnek?','ordered',orderedIds,orderedLabels)];}
  else recallTrials=shuffle(locations.map((location,index)=>({location,index})),rng).map(({location,index},trialIndex)=>makeTrial(`palace-random-${index}`,trialIndex,`Melyik új tárgy került ide: ${location.label}?`,'choice',[content[index].id],chosen[index].label,{choices:objectChoices(chosen,chosen[index].label,rng)}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials,{training:routeTraining('palace',locations,rng),resourceSnapshot:resource?[resource]:[]});
}
function pegPlan(settings,seed,rng){
  const resource=selectedMaterial(settings,'peg');if(settings.resourceIds.length&&!resource)invalid('a kiválasztott erőforrás nem tartalmaz elég horgot');const pool=resource?.data.entries||HANNA_PEGS;
  if(settings.itemCount>pool.length)invalid('a kiválasztott peg-lista nem tartalmaz elég horgot');
  const entries=pool.slice(0,settings.itemCount),objectPool=entries.length>CORE_HANNA_OBJECTS.length?HANNA_OBJECTS:CORE_HANNA_OBJECTS,chosen=avoidAlignedLabelCollisions(sample(objectPool,entries.length,rng),entries);
  const content=chosen.map((item,index)=>({...publicItem(item,'peg-object'),peg:entries[index].number,meaning:entries[index].label}));
  const encodingSteps=entries.map((entry,index)=>({id:`peg-link-${entry.number}`,kind:'peg',itemIds:[content[index].id],title:`${entry.number} – ${entry.label}`,prompt:`Kapcsold a ${chosen[index].label} képet ehhez a fix horoghoz: ${entry.label}.`,example:`A ${chosen[index].label} ráakad a(z) ${entry.label} képére.`,checks:['A fix horog változatlan maradt?','Az új tárgy aktívan hozzákapcsolódik?'],peg:entry.number}));
  const trainingEntries=sample(entries,Math.min(20,entries.length),rng);
  const trainingItems=trainingEntries.map((entry)=>({id:`peg-${entry.number}`,label:entry.label,number:entry.number,image:entry.image}));
  const trainingTrials=trainingEntries.flatMap((entry)=>[
    {id:`peg-number-${entry.number}`,prompt:`Mi a(z) ${entry.number}. horog?`,expected:entry.label,choices:shuffle([entry,...sample(entries.filter((candidate)=>candidate.number!==entry.number),Math.min(3,entries.length-1),rng)],rng).map((candidate)=>({value:candidate.label,label:candidate.label}))},
    {id:`peg-label-${entry.number}`,prompt:`Melyik szám tartozik ehhez: ${entry.label}?`,expected:String(entry.number),choices:shuffle([entry,...sample(entries.filter((candidate)=>candidate.number!==entry.number),Math.min(3,entries.length-1),rng)],rng).map((candidate)=>({value:String(candidate.number),label:String(candidate.number)}))},
  ]);
  const order=shuffle(entries.map((entry,index)=>({entry,index})),rng);const recallTrials=order.map(({entry,index},trialIndex)=>makeTrial(`peg-recall-${entry.number}`,trialIndex,`Mi kapcsolódott a(z) ${entry.number}. horoghoz (${entry.label})?`,settings.recallMode==='choice'?'choice':'free',[content[index].id],chosen[index].label,{choices:settings.recallMode==='choice'?objectChoices(chosen,chosen[index].label,rng):undefined}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials,{training:{kind:'peg',items:trainingItems,trials:trainingTrials,threshold:{accuracy:0.9,medianRtMs:2000}},resourceSnapshot:resource?[resource]:[]});
}
function facesPlan(settings,seed,rng){
  const chosen=sample(HANNA_FACES,settings.itemCount,rng),content=chosen.map((face)=>({id:face.id,kind:'face',label:face.label,image:face.image,keyword:face.keyword,fact:face.fact,portraitIndex:face.portraitIndex}));
  const encodingSteps=chosen.map((face)=>({id:`face-step-${face.portraitIndex}`,kind:'item',itemIds:[face.id],title:face.label,prompt:`Névkulcs: ${face.keyword}. Semleges támpont: ${face.fact}.`,example:face.story,checks:['A kulcs hasonlít a név hangzására?','A történet a semleges arcrészlethez kapcsolódik?']}));
  const recallTrials=chosen.map((face,index)=>makeTrial(`face-recall-${face.portraitIndex}`,index,'Mi a képen látható személy neve?',settings.recallMode==='choice'?'choice':'free',[face.id],face.label,{choices:settings.recallMode==='choice'?shuffle([face,...sample(chosen.filter((entry)=>entry.id!==face.id),Math.min(3,chosen.length-1),rng)],rng).map((entry)=>({value:entry.label,label:entry.label})):undefined,image:face.image,portraitIndex:face.portraitIndex,hints:[`A hangzáskulcs egy ${face.keyword}.`,`Figyeld ezt a semleges részletet: ${face.fact}.`,`${face.label[0]} betűvel kezdődik.`]}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials);
}
function keywordPlan(settings,seed,rng){
  const custom=materialItems(settings),usable=custom.filter((item)=>item.meaning&&item.keyword&&normalizedText(item.meaning)!==normalizedText(item.label)&&!normalizedText(item.meaning).includes(normalizedText(item.label))&&!normalizedText(item.label).includes(normalizedText(item.meaning)));
  if(settings.contentLevel==='material'&&usable.length<settings.itemCount)invalid(`a saját Kulcsszóhídhoz legalább ${settings.itemCount} külön szó, jelentés és képi hangzáskulcs kell; a szó és a jelentés nem árulhatja el egymást`);
  const source=settings.contentLevel==='material'?usable.map((item)=>({id:item.id,label:item.label,meaning:item.meaning,keyword:item.keyword,story:`A ${item.keyword} összekapcsolódik ezzel: ${item.meaning}.`})):HANNA_KEYWORDS;
  const chosen=sample(source,settings.itemCount,rng),content=chosen.map((item)=>({id:`keyword-${item.id}`,kind:'keyword',label:item.label,meaning:item.meaning,keyword:item.keyword}));
  const encodingSteps=chosen.map((item,index)=>({id:`keyword-step-${index}`,kind:'pair',itemIds:[content[index].id],title:`${item.label} → ${item.meaning}`,prompt:`Hangzáskulcs: ${item.keyword}.`,example:item.story,checks:['A kulcs felidézi az idegen hangalakot?','A jelenet megmutatja a jelentést?']}));
  const recallTrials=[];for(const [index,item] of chosen.entries())for(const direction of ['meaning','word']){
    const reverse=direction==='word',prompt=reverse?`Melyik tanult szó jelentése: ${item.meaning}?`:`Mit jelent: ${item.label}?`,expected=reverse?item.label:item.meaning;
    const pool=reverse?chosen.map((entry)=>({label:entry.label,image:'🌉'})):chosen.map((entry)=>({label:entry.meaning,image:'💬'}));
    recallTrials.push(makeTrial(`keyword-${index}-${direction}`,recallTrials.length,prompt,settings.recallMode==='free'?'free':'choice',[content[index].id],expected,{choices:settings.recallMode==='free'?undefined:objectChoices(pool,expected,rng),accepted:[expected]}));
  }
  return basePlan(settings,seed,content,encodingSteps,recallTrials);
}
function majorPlan(settings,seed,rng){
  const resource=selectedMaterial(settings,'major'),customEntries=resource?.data.entries||[],customCodes=new Set(customEntries.map((entry)=>entry.code));
  const selectedCustom=sample(customEntries,Math.min(10,customEntries.length),rng),fillPool=HU_MAJOR_WORDS.filter((entry)=>!customCodes.has(entry.code)),words=[...selectedCustom,...sample(fillPool,10-selectedCustom.length,rng)];
  const content=HU_MAJOR_DIGITS.map((entry)=>({id:`major-digit-${entry.digit}`,kind:'digit',label:entry.digit,meaning:entry.explanation,code:entry.sounds.join('/')}));
  const encodingSteps=HU_MAJOR_DIGITS.map((entry)=>({id:`major-step-${entry.digit}`,kind:'major',itemIds:[`major-digit-${entry.digit}`],title:`${entry.digit} = ${entry.sounds.join(', ')}`,prompt:`Mondd ki hangként: ${entry.explanation}.`,example:`Példakép: ${entry.example}. A magánhangzók, a h és a j nem számítanak.`,checks:['A beszédhangot figyeled, nem az angol betűsort?'],peg:Number(entry.digit)}));
  const items=HU_MAJOR_DIGITS.map((entry)=>({id:`major-training-${entry.digit}`,label:`${entry.digit}: ${entry.explanation}`,number:Number(entry.digit),description:entry.sounds.join(', ')}));
  const trainingTrials=[];for(const entry of HU_MAJOR_DIGITS){const alternatives=sample(HU_MAJOR_DIGITS.filter((candidate)=>candidate.digit!==entry.digit),3,rng),choiceSet=shuffle([entry,...alternatives],rng);trainingTrials.push({id:`major-d2s-${entry.digit}`,prompt:`Mely hangok tartoznak a(z) ${entry.digit} számhoz?`,expected:entry.sounds.join('/'),choices:choiceSet.map((candidate)=>({value:candidate.sounds.join('/'),label:candidate.sounds.join(', ')}))});trainingTrials.push({id:`major-s2d-${entry.digit}`,prompt:`Melyik számhoz tartozik: ${entry.sounds.join(', ')}?`,expected:entry.digit,choices:shuffle([entry,...alternatives],rng).map((candidate)=>({value:candidate.digit,label:candidate.digit}))});}
  const wordContent=words.map((entry,index)=>({id:`major-word-${index}`,kind:'keyword',label:entry.label,code:entry.code,meaning:`${entry.code} képe`}));content.push(...wordContent);
  encodingSteps.push(...words.map((entry,index)=>({id:`major-word-step-${index}`,kind:'major',itemIds:[wordContent[index].id],title:`${entry.code} → ${entry.label}`,prompt:`Mondd ki a két szám hangjait, majd rögzítsd képként: ${entry.label}.`,example:`A(z) ${entry.label} a ${entry.code} személyes képe ebben a körben.`,checks:['A szó mássalhangzó-hangjai a két számot adják?','A kép konkrétan elképzelhető?']})));
  const recallTrials=words.map((entry,index)=>makeTrial(`major-code-${index}`,index,`Melyik kép kódolja ezt a kétjegyű számot: ${entry.code}?`,'choice',[wordContent[index].id],entry.label,{choices:objectChoices(words,entry.label,rng)}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials,{training:{kind:'major',items,trials:trainingTrials,threshold:{accuracy:0.95,medianRtMs:1500}}});
}
function numberPlan(settings,seed,rng){
  const resource=selectedMaterial(settings,'major'),dictionary=resource?.data.entries||HU_MAJOR_WORDS;
  if(dictionary.length<Math.ceil(settings.itemCount/2))invalid(`a Major-szótárban legalább ${Math.ceil(settings.itemCount/2)} különböző kód kell ehhez a számsorhoz`);
  const chunks=sample(dictionary,Math.ceil(settings.itemCount/2),rng),digits=chunks.map((entry)=>entry.code).join('').slice(0,settings.itemCount);
  const content=chunks.map((entry,index)=>({id:`number-chunk-${index}`,kind:'digit',label:entry.code,meaning:entry.label,image:'🖼️',code:entry.code}));
  const encodingSteps=chunks.map((entry,index)=>({id:`number-step-${index}`,kind:'major',itemIds:[content[index].id],title:`${entry.code} → ${entry.label}`,prompt:`Lásd a(z) ${entry.label} képét, majd kösd az előző és következő képhez.`,checks:['A két számjegyet egyetlen kép hordozza?','A képek történetté kapcsolódnak?']}));
  const recallTrials=[makeTrial('number-recall',0,'Írd vissza a teljes generált számsort szóköz nélkül.','text',content.map((entry)=>entry.id),digits,{accepted:[digits],label:'digits',hints:['Idézd fel a képláncot.','Fordítsd vissza képenként a kétjegyű kódokat.',`Az első kód képe: ${chunks[0].label}.`]})];
  return basePlan(settings,seed,content,encodingSteps,recallTrials,{resourceSnapshot:resource?[resource]:[]});
}
function randomPlan(settings,seed,rng){
  const chosen=sample(CORE_HANNA_OBJECTS,settings.itemCount,rng),content=chosen.map((item)=>publicItem(item,'random'));
  const encodingSteps=[{id:'random-study',kind:'item',itemIds:content.map((item)=>item.id),title:'Hozzáférési térkép',prompt:`Tanuld meg sorszámmal és kategóriával: ${chosen.map((item,index)=>`${index+1}. ${item.label}`).join(' · ')}`,checks:['Tudsz közvetlenül egy sorszámra ugrani?','Látod az azonos kategóriájú elemeket?']}];
  const trials=[];const indices=shuffle(Array.from({length:chosen.length},(_,index)=>index),rng).slice(0,Math.min(8,chosen.length));
  for(const [trialIndex,index] of indices.entries()){
    const family=trialIndex%4;let prompt,expected,kind='choice',ids=[content[index].id],choices;
    if(family===0){prompt=`Mi volt a(z) ${index+1}. elem?`;expected=chosen[index].label;choices=objectChoices(chosen,expected,rng);}
    else if(family===1){const safe=index===0?1:index;prompt=`Mi volt közvetlenül a(z) ${chosen[safe].label} előtt?`;expected=chosen[safe-1].label;ids=[content[safe-1].id,content[safe].id];choices=objectChoices(chosen,expected,rng);}
    else if(family===2){const safe=index===chosen.length-1?chosen.length-2:index;prompt=`Mi volt közvetlenül a(z) ${chosen[safe].label} után?`;expected=chosen[safe+1].label;ids=[content[safe].id,content[safe+1].id];choices=objectChoices(chosen,expected,rng);}
    else {const category=chosen[index].category,matches=chosen.filter((item)=>item.category===category);prompt=`Mely elemek tartoztak ebbe a kategóriába: ${category}?`;expected=matches.map((item)=>item.label);kind='multi';ids=matches.map((item)=>content[chosen.indexOf(item)].id);choices=chosen.map((item)=>({value:item.label,label:item.label,image:item.image}));}
    trials.push(makeTrial(`random-${trialIndex}`,trialIndex,prompt,kind,ids,expected,{choices}));
  }
  return basePlan(settings,seed,content,encodingSteps,trials);
}
function textPlan(settings,seed){
  const resource=selectedMaterial(settings,'material'),source=resource?.data.text?{id:`${resource.id}@${resource.revision}`,title:resource.title,text:resource.data.text,rubric:resource.data.rubric}:HANNA_TEXTS[seed%HANNA_TEXTS.length];
  if(settings.contentLevel==='material'&&!resource?.data.text)invalid('a saját szöveghez material resourceSnapshot szükséges');
  if(settings.recallMode==='meaning'&&(!source.rubric||!source.rubric.length))invalid('a kulcsgondolatos szöveghez előre rögzített rubrika szükséges');
  const content=[{id:`text-${source.id}`,kind:'text',label:source.title,meaning:settings.recallMode==='meaning'?'kulcsgondolatok':'szó szerinti felidézés'}];
  const encodingSteps=[{id:'text-study',kind:'text',itemIds:[content[0].id],title:source.title,prompt:source.text,checks:['Olvasás után fordítsd el a tekinteted és mondd el saját szavaiddal.','Ellenőrzéskor keresd a kimaradt kulcsgondolatokat.']}];
  const first=settings.recallMode==='meaning'?makeTrial('text-meaning-1',0,'Első felidézés: írd le saját szavaiddal a kulcsgondolatokat.','text',[content[0].id],source.rubric.map((entry)=>entry.label),{rubric:source.rubric,accepted:source.rubric.flatMap((entry)=>entry.accepted||[]),phase:'immediate'}):makeTrial('text-verbatim-1',0,'Első felidézés: írd le a szöveget szó szerint.','text',[content[0].id],source.text,{accepted:[source.text],phase:'immediate'});
  const second=settings.recallMode==='meaning'?makeTrial('text-meaning-2',1,'Második aktív felidézés: javítás után építsd újra a kulcsgondolatokat.','text',[content[0].id],source.rubric.map((entry)=>entry.label),{rubric:source.rubric,accepted:source.rubric.flatMap((entry)=>entry.accepted||[]),phase:'delayed'}):makeTrial('text-verbatim-2',1,'Második aktív felidézés: javítás után írd le újra szó szerint.','text',[content[0].id],source.text,{accepted:[source.text],phase:'delayed'});
  const reviewItems=settings.recallMode==='meaning'?source.rubric.filter((row)=>row.accepted?.length).map((row)=>({id:`review-text-${source.id}-${row.id}`,prompt:`Mit tudsz erről a kulcsgondolatról: ${row.label}?`,expected:row.accepted[0],accepted:[...row.accepted],hints:hints(),content:clone(content)})):[{id:`review-text-${source.id}-verbatim`,prompt:'Idézd fel a tanult szöveget szó szerint.',expected:source.text,accepted:[source.text],hints:hints(),content:clone(content)}];
  return basePlan(settings,seed,content,encodingSteps,[first,second],{reviewItems,sourceTextId:source.id});
}
function conceptPlan(settings,seed,rng){
  const custom=materialItems(settings),usable=custom.filter((item)=>item.meaning&&item.keyword&&!normalizedText(item.label).includes(normalizedText(item.meaning)));
  if(settings.contentLevel==='material'&&usable.length<settings.itemCount)invalid(`a saját Fogalomból kép körhöz legalább ${settings.itemCount} külön fogalom, definíció és vizuális szimbólum kell; a kérdés nem tartalmazhatja a teljes választ`);
  const source=settings.contentLevel==='material'?usable.map((item)=>({id:item.id,label:item.label,meaning:item.meaning,image:'🧩',keyword:item.keyword})):HANNA_CONCEPTS;
  const chosen=sample(source,settings.itemCount,rng),content=chosen.map((item)=>({id:`concept-${item.id}`,kind:'concept',label:item.label,meaning:item.meaning,keyword:item.keyword,image:item.image}));
  const encodingSteps=chosen.map((item,index)=>({id:`concept-step-${index}`,kind:'item',itemIds:[content[index].id],title:item.label,prompt:`Definíció: ${item.meaning}`,example:`Kép: ${item.keyword}`,checks:['A kép a fogalom lényegi kapcsolatát mutatja?','A definíciót a képből is fel tudod építeni?']}));
  let recallTrials;if(settings.recallMode==='ordered')recallTrials=[makeTrial('concept-chain',0,'Sorold fel a fogalmakat a tanult lánc sorrendjében.','ordered',content.map((item)=>item.id),chosen.map((item)=>item.label))];else recallTrials=chosen.map((item,index)=>makeTrial(`concept-${index}`,index,`Mit jelent ez a fogalom: ${item.label}?`,settings.recallMode==='choice'?'choice':'free',[content[index].id],item.meaning,{accepted:[item.meaning],choices:settings.recallMode==='choice'?shuffle([item,...sample(chosen.filter((entry)=>entry.id!==item.id),Math.min(3,chosen.length-1),rng)],rng).map((entry)=>({value:entry.meaning,label:entry.meaning})):undefined,image:item.image}));
  return basePlan(settings,seed,content,encodingSteps,recallTrials,{resourceSnapshot:selectedMaterial(settings,'material')?[selectedMaterial(settings,'material')]:[]});
}
function reviewPlan(settings,seed){
  if(!settings.reviewSnapshot.length)invalid('review kör csak szerveres reviewSnapshotból generálható');
  const selected=settings.reviewSnapshot.filter((entry)=>!settings.reviewIds.length||settings.reviewIds.includes(entry.id)).slice(0,settings.itemCount);
  if(!selected.length)invalid('a kiválasztott reviewIds között nincs esedékes pillanatkép');
  const content=[],contentIdsByCard=new Map();
  for(const entry of selected){
    const localIds=[];
    for(const item of entry.content){
      if(!isObject(item)||typeof item.id!=='string')continue;
      const localId=`${entry.id}:${item.id}`;content.push({...clone(item),id:localId});localIds.push(localId);
    }
    contentIdsByCard.set(entry.id,localIds);
  }
  const trials=selected.map((entry,index)=>{const face=(entry.content||[]).find((item)=>item.kind==='face'),verbatim=(entry.content||[]).some((item)=>item.kind==='text'&&item.meaning==='szó szerinti felidézés'),kind=Array.isArray(entry.expected)?'ordered':verbatim?'text':'free';return makeTrial(`review-${entry.id}`,index,entry.prompt,kind,contentIdsByCard.get(entry.id)||[],entry.expected,{accepted:entry.accepted,hints:entry.hints,phase:'delayed',label:entry.sourceActivity==='numbers'?'digits':undefined,image:face?.image,portraitIndex:face?.portraitIndex});});
  const sourceActivities=[...new Set(selected.map((entry)=>entry.sourceActivity))];
  return basePlan(settings,seed,content,[],trials,{reviewItems:[],sourceActivity:sourceActivities.length===1?sourceActivities[0]:'mixed',resourceSnapshot:[]});
}
function bossPlan(settings,seed,rng){
  const objects=sample(CORE_HANNA_OBJECTS,Math.max(4,settings.itemCount),rng),face=sample(HANNA_FACES,1,rng)[0],concept=sample(HANNA_CONCEPTS,1,rng)[0],codes=sample(HU_MAJOR_WORDS,3,rng),digits=codes.map((entry)=>entry.code).join('');
  const objectContent=objects.map((item)=>publicItem(item,'boss-list')),faceContent={id:`boss-${face.id}`,kind:'face',label:face.label,image:face.image,keyword:face.keyword,fact:face.fact,portraitIndex:face.portraitIndex},conceptContent={id:`boss-concept-${concept.id}`,kind:'concept',label:concept.label,meaning:concept.meaning,keyword:concept.keyword,image:concept.image},codeContent=codes.map((entry,index)=>({id:`boss-code-${index}`,kind:'digit',label:entry.code,meaning:entry.label,code:entry.code}));
  const content=[...objectContent,faceContent,conceptContent,...codeContent];
  const encodingSteps=[
    {id:'boss-list-step',kind:'pair',itemIds:objectContent.map((item)=>item.id),title:'Lista – válassz technikát',prompt:`Lista: ${objects.map((item)=>item.label).join(' → ')}`,checks:['Rögzítetted a választott technikát?','Minden szomszédos kapcsolat élő?']},
    {id:'boss-face-step',kind:'item',itemIds:[faceContent.id],title:'Név – válassz technikát',prompt:`${face.label}: ${face.keyword}; ${face.fact}.`,example:face.story,checks:['Van hangzáskulcs és semleges támpont?']},
    {id:'boss-number-step',kind:'major',itemIds:codeContent.map((item)=>item.id),title:'Szám – válassz technikát',prompt:codes.map((entry)=>`${entry.code}=${entry.label}`).join(' · '),checks:['Képlánccá kapcsoltad a kódokat?']},
    {id:'boss-concept-step',kind:'item',itemIds:[conceptContent.id],title:'Fogalom – válassz technikát',prompt:`${concept.label}: ${concept.meaning}`,example:concept.keyword,checks:['A kép a definíció lényegét hordozza?']},
  ];
  const trials=[
    makeTrial('boss-list',0,'Lista: add meg a teljes sorrendet.','ordered',objectContent.map((item)=>item.id),objects.map((item)=>item.label)),
    makeTrial('boss-face',1,'Név: ki látható a portrén?','choice',[faceContent.id],face.label,{choices:shuffle([face,...sample(HANNA_FACES.filter((entry)=>entry.id!==face.id),3,rng)],rng).map((entry)=>({value:entry.label,label:entry.label})),image:face.image,portraitIndex:face.portraitIndex}),
    makeTrial('boss-number',2,'Szám: írd vissza a képekből a hat számjegyet.','text',codeContent.map((item)=>item.id),digits,{accepted:[digits],label:'digits'}),
    makeTrial('boss-concept',3,`Fogalom: mit jelent az, hogy ${concept.label}?`,'free',[conceptContent.id],concept.meaning,{accepted:[concept.meaning]}),
  ];
  return basePlan(settings,seed,content,encodingSteps,trials);
}

export function generateHannaSession(rawSettings,seed,resources) {
  void resources;
  const settings=normalizeHannaSettings(rawSettings),rng=seededRandom(seed);
  const builders={baseline:baselinePlan,chain:chainPlan,association:associationPlan,loci:lociPlan,palace:palacePlan,peg:pegPlan,faces:facesPlan,keyword:keywordPlan,major:majorPlan,numbers:numberPlan,random:randomPlan,text:textPlan,concept:conceptPlan,review:reviewPlan,boss:bossPlan};
  return builders[settings.activity](settings,seed,rng);
}

function isDigitRecall(plan,trial){return trial.label==='digits'||plan.activity==='numbers'||(plan.activity==='review'&&plan.sourceActivity==='numbers'&&typeof trial.expected==='string'&&/^\d+$/.test(trial.expected));}
function validateResponseValue(plan,trial,value,label){
  const digitRecall=isDigitRecall(plan,trial);
  if(typeof value==='string'){
    if(!value.trim()&&!digitRecall)invalid(`${label}.value nem lehet üres`);if(value.length>MAX_TEXT)invalid(`${label}.value túl hosszú`);
  }else if(Array.isArray(value)){
    if(!value.length||value.length>100)invalid(`${label}.value 1–100 elemű lista legyen`);
    value.forEach((entry,index)=>textValue(entry,`${label}.value[${index}]`,{min:0,max:500}));
  }else invalid(`${label}.value szöveg vagy szöveglista legyen`);
  if(trial.kind==='choice'){
    if(typeof value!=='string')invalid(`${label}.value választásnál szöveg legyen`);
    const allowed=trial.choices.map((entry)=>entry.value);if(!allowed.includes(value))invalid(`${label}.value idegen választás`);
  }
  if(trial.kind==='ordered'){
    if(!Array.isArray(value)||!Array.isArray(trial.expected)||value.length!==trial.expected.length)invalid(`${label}.value sorrendi válasznál pontos elemszámú lista legyen`);
    if(trial.entry!=='typed'){const capacity=new Map();for(const entry of trial.expected){const key=normalizedText(entry);capacity.set(key,(capacity.get(key)||0)+1);}for(const entry of value){const key=normalizedText(entry),remaining=capacity.get(key)||0;if(!remaining)invalid(`${label}.value idegen, dupla vagy határon kívüli elemet tartalmaz`);capacity.set(key,remaining-1);}}
  }
  if(trial.kind==='multi'){
    if(!Array.isArray(value)||!Array.isArray(trial.expected)||value.length!==trial.expected.length)invalid(`${label}.value többes válasznál pontos elemszámú lista legyen`);
    if(new Set(value.map(normalizedText)).size!==value.length)invalid(`${label}.value nem tartalmazhat ismétlést`);
    const allowed=new Set((trial.choices||[]).map((entry)=>entry.value));if(value.some((entry)=>!allowed.has(entry)))invalid(`${label}.value idegen választást tartalmaz`);
  }
  if(trial.kind==='text'||trial.kind==='free')if(typeof value!=='string')invalid(`${label}.value szöveg legyen`);
  if(digitRecall&&(!/^\d*$/.test(value)||value.length>String(trial.expected).length))invalid(`${label}.value legfeljebb ${String(trial.expected).length} számjegy legyen`);
}
function validateAttempt(plan,answer,context){
  if(!isObject(answer))invalid('answer objektum legyen');
  let bytes;try{bytes=new TextEncoder().encode(JSON.stringify(answer)).length;}catch{invalid('answer nem szerializálható');}
  if(bytes>MAX_PAYLOAD_BYTES)invalid('answer payload legfeljebb 1 MB lehet');
  allowedObject(answer,['version','startedAt','completedAt','events','encoding','responses','strategy','training','encodingDurationMs','delayDurationMs'],'answer');
  if(integer(answer.version,'answer.version',1,1)!==1)invalid('answer.version csak 1 lehet');
  const startedAt=Date.parse(isoValue(answer.startedAt,'answer.startedAt')),completedAt=Date.parse(isoValue(answer.completedAt,'answer.completedAt'));if(completedAt<startedAt)invalid('completedAt nem előzheti meg startedAt értékét');
  const serverDuration=context?.serverDurationMs===undefined?null:integer(context.serverDurationMs,'context.serverDurationMs',0,MAX_DURATION_MS);
  const encodingDurationMs=integer(answer.encodingDurationMs,'answer.encodingDurationMs',0,MAX_DURATION_MS),delayDurationMs=integer(answer.delayDurationMs,'answer.delayDurationMs',0,MAX_DURATION_MS);
  if(serverDuration!==null&&(encodingDurationMs>serverDuration||delayDurationMs>serverDuration))invalid('a kliens időtartama túllépi a szerver által mért kört');
  if(!Array.isArray(answer.events)||answer.events.length>4096)invalid('events legfeljebb 4096 elemű lista legyen');
  const eventIds=new Set(),allTrialIds=new Set([...plan.recallTrials.map((trial)=>trial.id),...(plan.training?.trials||[]).map((trial)=>trial.id)]);
  const events=answer.events.map((entry,index)=>{allowedObject(entry,['eventId','type','atMs','trialId','value'],`events[${index}]`);const eventId=textValue(entry.eventId,`events[${index}].eventId`,{max:100});if(eventIds.has(eventId))invalid('eventId nem ismétlődhet');eventIds.add(eventId);const type=enumValue(entry.type,EVENT_TYPES,`events[${index}].type`),atMs=numberValue(entry.atMs,`events[${index}].atMs`,0,serverDuration??MAX_DURATION_MS);if(entry.trialId!==undefined&&!allTrialIds.has(entry.trialId))invalid('events idegen trialId értéket tartalmaz');if(entry.value!==undefined&&JSON.stringify(entry.value).length>2000)invalid('egy event value túl nagy');return {...entry,eventId,type,atMs};});
  if(!Array.isArray(answer.encoding)||answer.encoding.length>plan.content.length)invalid('encoding túl sok elemet tartalmaz');const encodingIds=new Set(),contentIds=new Set(plan.content.map((item)=>item.id));
  const encoding=answer.encoding.map((entry,index)=>{allowedObject(entry,['itemId','association','checks','hintLevel'],`encoding[${index}]`);const itemId=textValue(entry.itemId,`encoding[${index}].itemId`,{max:120});if(!contentIds.has(itemId)||encodingIds.has(itemId))invalid('encoding itemId idegen vagy ismétlődik');encodingIds.add(itemId);const result={itemId};if(entry.association!==undefined)result.association=textValue(entry.association,`encoding[${index}].association`,{max:2000});if(entry.checks!==undefined){if(!Array.isArray(entry.checks)||entry.checks.length>20||entry.checks.some((check)=>typeof check!=='string'||check.length>200))invalid('encoding.checks érvénytelen');result.checks=[...entry.checks];}if(entry.hintLevel!==undefined)result.hintLevel=integer(entry.hintLevel,`encoding[${index}].hintLevel`,0,4);return result;});
  if(!Array.isArray(answer.responses))invalid('responses lista legyen');const responseIds=new Set(),trialMap=new Map(plan.recallTrials.map((trial)=>[trial.id,trial]));
  const responses=answer.responses.map((entry,index)=>{allowedObject(entry,['trialId','value','rtMs','hintLevel'],`responses[${index}]`);const trialId=textValue(entry.trialId,`responses[${index}].trialId`,{max:150});if(responseIds.has(trialId))invalid('egy trial pontosan egyszer válaszolható');responseIds.add(trialId);const trial=trialMap.get(trialId);if(!trial)invalid('responses idegen trialId értéket tartalmaz');validateResponseValue(plan,trial,entry.value,`responses[${index}]`);return {trialId,value:clone(entry.value),rtMs:numberValue(entry.rtMs,`responses[${index}].rtMs`,0,serverDuration??MAX_DURATION_MS),hintLevel:integer(entry.hintLevel,`responses[${index}].hintLevel`,0,4)};});
  let training=[];if(answer.training!==undefined){if(!plan.training)invalid('ehhez a körhöz nincs training');if(!Array.isArray(answer.training)||answer.training.length>plan.training.trials.length)invalid('training túl sok választ tartalmaz');const seen=new Set(),map=new Map(plan.training.trials.map((trial)=>[trial.id,trial]));training=answer.training.map((entry,index)=>{allowedObject(entry,['trialId','value','rtMs'],`training[${index}]`);const trialId=textValue(entry.trialId,`training[${index}].trialId`,{max:150});if(seen.has(trialId))invalid('training trialId nem ismétlődhet');seen.add(trialId);const trial=map.get(trialId);if(!trial)invalid('training idegen trialId értéket tartalmaz');const value=textValue(entry.value,`training[${index}].value`,{max:500});if(!trial.choices.some((choice)=>choice.value===value))invalid('training idegen választ tartalmaz');return {trialId,value,rtMs:numberValue(entry.rtMs,`training[${index}].rtMs`,0,serverDuration??MAX_DURATION_MS)};});}
  const strategy=answer.strategy===undefined?'':textValue(answer.strategy,'answer.strategy',{max:1000});
  return {events,encoding,responses,training,strategy,encodingDurationMs,delayDurationMs};
}
function acceptedFor(trial){
  return [trial.expected,...(trial.accepted||[])].flat().map(normalizedText);
}
function wordDiff(expected,actual){
  const left=normalizedText(expected).split(' ').filter(Boolean),right=normalizedText(actual).split(' ').filter(Boolean),length=Math.max(left.length,right.length);
  return Array.from({length},(_,index)=>({index:index+1,expected:left[index]??'—',actual:right[index]??'—',correct:left[index]===right[index]}));
}
function eventHintLevel(events,trialId){
  let level=0;
  for(const event of events){
    if(event.type!=='hint'&&event.type!=='show-answer')continue;
    if(event.trialId!==undefined&&event.trialId!==trialId)continue;
    if(event.type==='show-answer'){level=4;continue;}
    const raw=isObject(event.value)?event.value.hintLevel:event.value,parsed=Number(raw);
    level=Math.max(level,Number.isInteger(parsed)&&parsed>=1&&parsed<=4?parsed:1);
  }
  return level;
}
function scorePlan(plan,attempt,context){
  const responseMap=new Map(attempt.responses.map((entry)=>[entry.trialId,entry]));let correct=0,total=0,independentCorrect=0,assistedCorrect=0,orderCorrect=0,orderTotal=0;
  const details=[],correctRts=[],reviewOutcomes=[];const subscales={};let digitCorrect=0,digitTotal=0;
  for(const trial of plan.recallTrials){
    const response=responseMap.get(trial.id),hintLevel=Math.max(response?.hintLevel??0,eventHintLevel(attempt.events,trial.id));let trialCorrect=0,trialTotal=1;
    if(trial.rubric){
      const actual=response?.value??'';trialTotal=trial.rubric.length;trialCorrect=trial.rubric.reduce((sum,row)=>{const rowAccepted=row.accepted||[];const hit=response&&rowAccepted.some((accepted)=>normalizedText(actual).includes(normalizedText(accepted)));details.push({label:row.label,actual:response?actual:'—',expected:rowAccepted.length?rowAccepted.join(' / '):row.label,correct:!!hit,feedback:hit?'Megjelent a kulcsgondolat.':'Ez a kulcsgondolat kimaradt.'});return sum+(hit?1:0);},0);
    }else if(trial.kind==='ordered'){
      const expected=trial.expected,actual=response?.value||[];trialTotal=expected.length;trialCorrect=expected.reduce((sum,value,index)=>sum+(normalizedText(actual[index]??'')===normalizedText(value)?1:0),0);orderCorrect+=trialCorrect;orderTotal+=trialTotal;
      expected.forEach((value,index)=>details.push({label:`${trial.label||trial.prompt} – ${index+1}. hely`,actual:actual[index]??'—',expected:value,correct:normalizedText(actual[index]??'')===normalizedText(value)}));
    }else if(trial.kind==='multi'){
      const expected=trial.expected,actual=response?.value||[],actualSet=new Set(actual.map(normalizedText));trialTotal=expected.length;trialCorrect=expected.reduce((sum,value)=>sum+(actualSet.has(normalizedText(value))?1:0),0);
      expected.forEach((value)=>details.push({label:trial.label||trial.prompt,actual:actual.join(', ')||'—',expected:value,correct:actualSet.has(normalizedText(value))}));
    }else if(isDigitRecall(plan,trial)){
      const expected=String(trial.expected),actual=String(response?.value??'');trialTotal=expected.length;trialCorrect=[...expected].reduce((sum,digit,index)=>sum+(actual[index]===digit?1:0),0);digitCorrect+=trialCorrect;digitTotal+=trialTotal;
      [...expected].forEach((digit,index)=>details.push({label:`${index+1}. számjegy`,actual:actual[index]??'—',expected:digit,correct:actual[index]===digit}));
    }else if(trial.kind==='text'&&typeof trial.expected==='string'&&normalizedText(trial.expected).split(' ').length>3){
      const canonical=trial.accepted?.length===1?trial.accepted[0]:trial.expected,diff=wordDiff(canonical,response?.value??'');trialTotal=diff.length;trialCorrect=diff.filter((entry)=>entry.correct).length;details.push(...diff.map((entry)=>({label:`${entry.index}. szó`,actual:entry.actual,expected:entry.expected,correct:entry.correct,feedback:'Szó szerinti eltérés'})));
    }else{
      const actual=response?.value??'—';const hit=!!response&&acceptedFor(trial).includes(normalizedText(actual));trialCorrect=hit?1:0;details.push({label:trial.label||trial.prompt,actual,expected:Array.isArray(trial.expected)?trial.expected.join(' → '):trial.expected,correct:hit,feedback:response?(hintLevel===4?'A megoldás megtekintése után adott helyes válasz segített felidézésnek számít.':undefined):'Kihagyott válasz.'});
    }
    correct+=trialCorrect;total+=trialTotal;
    if(trialCorrect>0&&response){if(hintLevel===0)independentCorrect+=trialCorrect;else assistedCorrect+=trialCorrect;correctRts.push(response.rtMs);}
    if(plan.activity==='review')reviewOutcomes.push({itemId:trial.id.replace(/^review-/,''),correct:trialCorrect===trialTotal,rtMs:response?.rtMs??null,hintLevel});
    if(plan.activity==='baseline'){
      const group=trial.id.includes('-0-')?'word':trial.id.includes('-1-')?'picture':'digit',phase=trial.phase==='immediate'?'Immediate':'Delayed';subscales[`${group}${phase}`]={correct:trialCorrect,total:trialTotal,accuracy:trialTotal?trialCorrect/trialTotal:null};
    }
    if(plan.activity==='text'){
      const phase=trial.phase==='immediate'?'Immediate':'Delayed';subscales[`text${phase}`]={correct:trialCorrect,total:trialTotal,accuracy:trialTotal?trialCorrect/trialTotal:null};
    }
    if(plan.activity==='boss'){const family=trial.id.replace('boss-','');subscales[family]={correct:trialCorrect,total:trialTotal,accuracy:trialTotal?trialCorrect/trialTotal:null};}
  }
  if(digitTotal)subscales.number={...(subscales.number||{}),digitsCorrect:digitCorrect,digitsTotal:digitTotal,digitsPerMinute:attempt.encodingDurationMs>0?Number((digitCorrect/(attempt.encodingDurationMs/60_000)).toFixed(2)):null};
  if(plan.activity==='boss')subscales.strategy={selected:attempt.strategy||null};
  let trainingMetric=null;
  if(plan.training){const map=new Map(attempt.training.map((entry)=>[entry.trialId,entry])),hits=[],rts=[];for(const trial of plan.training.trials){const response=map.get(trial.id),hit=!!response&&normalizedText(response.value)===normalizedText(trial.expected);hits.push(hit);if(hit)rts.push(response.rtMs);}const accuracy=hits.filter(Boolean).length/hits.length,medianRtMs=median(rts),threshold=plan.training.threshold,passed=accuracy>=threshold.accuracy&&(threshold.medianRtMs===undefined||(medianRtMs!==null&&medianRtMs<threshold.medianRtMs));trainingMetric={kind:plan.training.kind,correct:hits.filter(Boolean).length,total:hits.length,accuracy,medianRtMs,threshold:clone(threshold),passed};subscales.training=trainingMetric;}
  return {correct,total,details,independentCorrect,assistedCorrect,orderAccuracy:orderTotal?orderCorrect/orderTotal:null,medianCorrectRtMs:median(correctRts),reviewOutcomes,subscales,trainingMetric};
}
function adaptation(settings,accuracy,independentRatio){
  const [min,max]=COUNTS[settings.activity],fixed=min===max;if(!settings.adaptive||fixed)return {nextItemCount:settings.itemCount,reason:fixed?'Ennél a feladatnál rögzített az elemszám.':'Az adaptív léptetés ki van kapcsolva.'};
  const numberSteps=settings.activity==='numbers'?[16,20,30]:null,currentStep=numberSteps?.indexOf(settings.itemCount);
  if(accuracy>=0.9&&independentRatio>=0.8)return {nextItemCount:numberSteps?numberSteps[Math.min(numberSteps.length-1,currentStep+1)]:Math.min(max,settings.itemCount+(settings.itemCount>=20?5:1)),reason:'Pontos, nagyrészt önálló felidézés: következőleg nőhet az elemszám.'};
  if(accuracy<0.6)return {nextItemCount:numberSteps?numberSteps[Math.max(0,currentStep-1)]:Math.max(min,settings.itemCount-(settings.itemCount>20?5:1)),reason:'Sok elem maradt ki vagy került rossz helyre: következőleg kisebb lista segít.'};
  return {nextItemCount:settings.itemCount,reason:'A jelenlegi elemszám megfelelő következő gyakorlásnak.'};
}

export function scoreHannaAttempt(rawSettings,seed,answer,context={}){
  const settings=normalizeHannaSettings(rawSettings);
  const privateSnapshot=context?.privateSettings?.hannaResourceSnapshot;
  const privateReviewSnapshot=context?.privateSettings?.hannaReviewSnapshot;
  const scoringSettings=privateSnapshot===undefined&&privateReviewSnapshot===undefined?settings:normalizeHannaSettings({...settings,
    ...(privateSnapshot===undefined?{}:{resourceSnapshot:privateSnapshot}),...(privateReviewSnapshot===undefined?{}:{reviewSnapshot:privateReviewSnapshot})});
  const plan=generateHannaSession(scoringSettings,seed),attempt=validateAttempt(plan,answer,context),scored=scorePlan(plan,attempt,context);
  const accuracy=scored.total?scored.correct/scored.total:null,independentRatio=scored.total?scored.independentCorrect/scored.total:0,qualityFlags=[];
  if(attempt.responses.some((entry)=>entry.hintLevel===4)||attempt.events.some((entry)=>entry.type==='show-answer'))qualityFlags.push('solution-viewed');
  if(attempt.responses.some((entry)=>entry.hintLevel>0)||attempt.events.some((entry)=>entry.type==='hint'||entry.type==='show-answer'))qualityFlags.push('help-used');
  if(attempt.events.some((entry)=>entry.type==='restart'))qualityFlags.push('restarted');
  if(context.serverRetentionMs===undefined)qualityFlags.push('retention-unverified');
  if(scored.trainingMetric&&!scored.trainingMetric.passed)qualityFlags.push(`${scored.trainingMetric.kind}-training-gate-not-met`);
  if(settings.activity==='boss'&&!attempt.strategy)qualityFlags.push('strategy-not-recorded');
  const technique=ACTIVITY_BY_ID[settings.activity].technique,percent=Math.round((accuracy??0)*100),retentionMs=context.serverRetentionMs===undefined?null:integer(context.serverRetentionMs,'context.serverRetentionMs',0,MAX_RETENTION_MS);
  const sourceTextId=plan.sourceTextId??null,sourceTextKey=settings.activity==='text'?`:${encodeURIComponent(sourceTextId??'unknown')}`:'';
  const metrics={schemaVersion:1,familyId:'hanna-method',activity:settings.activity,technique,accuracy,orderAccuracy:scored.orderAccuracy,independentCorrect:scored.independentCorrect,assistedCorrect:scored.assistedCorrect,medianCorrectRtMs:scored.medianCorrectRtMs,encodingDurationMs:attempt.encodingDurationMs,retentionMs,comparabilityKey:`hanna-method:v1:${settings.activity}:${settings.itemCount}:${settings.recallMode}:${settings.contentLevel}:${settings.reverse?'reverse':'forward'}${sourceTextKey}`,...(sourceTextId?{sourceTextId}:{}),adaptation:adaptation(settings,accuracy??0,independentRatio),qualityFlags,reviewOutcomes:scored.reviewOutcomes,subscales:scored.subscales};
  return {correct:scored.correct,total:scored.total,percent,summary:`${scored.correct}/${scored.total} felidézési egység helyes. Pontosság, sorrend, idő és segítség külön látható; ez készségfejlesztő gyakorlási eredmény.`,details:scored.details,metrics,stars:null,starBasis:'hanna-method-no-stars'};
}

export function evaluatePalaceReadiness(resource,answer){
  const wrapper=resource?.kind==='palace'&&resource.data?resource:null,data=normalizeHannaResource('palace',wrapper?resource.data:resource);
  allowedObject(answer,['revision','answers'],'palace answer');if(wrapper&&answer.revision!==undefined&&integer(answer.revision,'revision',1,1_000_000)!==wrapper.revision)invalid('a palota verziója időközben megváltozott');
  if(!Array.isArray(answer.answers)||answer.answers.length>data.locations.length)invalid('answers legfeljebb minden helyhez egy választ tartalmazhat');const seen=new Set(),map=new Map();
  answer.answers.forEach((entry,index)=>{allowedObject(entry,['index','value'],`answers[${index}]`);const position=integer(entry.index,`answers[${index}].index`,0,data.locations.length-1);if(seen.has(position))invalid('egy palotahely pontosan egyszer válaszolható');seen.add(position);map.set(position,textValue(entry.value,`answers[${index}].value`,{max:120}));});
  const details=data.locations.map((location,index)=>{const actual=map.get(index)??'—';return {label:`${index+1}. hely`,actual,expected:location.name,correct:normalizedText(actual)===normalizedText(location.name)};});const correct=details.filter((entry)=>entry.correct).length,total=details.length,percent=Math.round(correct/total*100);
  return {correct,total,percent,ready:correct/total>=0.9,threshold:0.9,details};
}

export function nextHannaReview({correct,rtMs,hintLevel,previousIntervalMs=INTERVALS[0]}){
  if(typeof correct!=='boolean')invalid('correct logikai érték legyen');if(rtMs!==null)numberValue(rtMs,'rtMs',0,MAX_DURATION_MS);else if(correct)invalid('helyes válasznál rtMs szükséges');integer(hintLevel,'hintLevel',0,4);integer(previousIntervalMs,'previousIntervalMs',INTERVALS[0],31_536_000_000);
  if(!correct||hintLevel===4)return INTERVALS[0];
  let index=0;for(let cursor=0;cursor<INTERVALS.length;cursor+=1)if(previousIntervalMs>=INTERVALS[cursor])index=cursor;
  const fast=rtMs<2000&&hintLevel===0,advance=fast?2:1;
  return INTERVALS[Math.min(INTERVALS.length-1,index+advance)];
}
