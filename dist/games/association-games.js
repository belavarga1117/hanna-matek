import {pointerDrag} from '../drag.js';
import { h, shuffle, sample } from '../core.js';

const STATION_NAMES = ['Boróka tér','Csillagliget','Diófa kapu','Ezüstpatak','Fecskevár','Gesztenye sor','Hajnalkert','Ibolya híd','Kavics-part','Lombos-rét','Meseerdő','Napraforgó út','Pillangóliget','Szivárvány-hegy'];
const STREET_NAMES = ['Akácfa utca','Boglárka köz','Csermely sétány','Darázs utca','Erdei körút','Fenyves köz','Galagonya utca','Harmat sétány','Jegenye sor','Kikelet utca','Levendula köz','Mályva tér','Napsugár utca','Orgona sétány'];
const ROUTE_STORIES = [
  ['Indulj el a könyvtár bejáratától.','Fordulj balra a nagy tölgyfánál.','Sétálj át a virágos kis hídon.','Haladj tovább a pékség kirakata mellett.','Érkezz meg a szökőkúthoz.'],
  ['Lépj ki az iskola főkapuján.','Menj jobbra a gesztenyefák alatt.','A játszótér után kelj át a zebrán.','Fordulj be a keskeny sétányra.','Állj meg a kék óratoronynál.'],
  ['Indulj a piac virágos standjától.','Haladj a pékség felé.','A pékségnél fordulj balra.','Menj át a patak fölötti hídon.','A túlparton keresd a piros padot.'],
  ['Kezdd az utat a vasútállomásnál.','Sétálj végig a platánfák során.','A postánál térj jobbra.','Haladj el két zöld kapu mellett.','Érkezz meg a múzeum lépcsőjéhez.'],
];
const FACE_CATALOG = [
  {id:0,name:'Anna'}, {id:1,name:'Bence'}, {id:2,name:'Csenge'}, {id:3,name:'Dávid'},
  {id:4,name:'Félix'}, {id:5,name:'Emma'}, {id:6,name:'Hunor'}, {id:7,name:'Gréta'},
  {id:8,name:'Júlia'}, {id:9,name:'Kristóf'}, {id:10,name:'Lili'}, {id:11,name:'Márk'},
];
const MEDICAL_SPECIALTIES = ['belgyógyász','bőrgyógyász','fogorvos','fül-orr-gégész','gyermekorvos','kardiológus','neurológus','ortopéd orvos','radiológus','reumatológus','szemész','sebész'];
const ROOM_NUMBERS = [12,14,16,18,21,23,25,27,31,34,36,38,42,45,47,51,54,56,62,65,67,71,74,76,81,84,86,92,94,97];
export const GROCERY_ITEMS = [
  {id:'alma',emoji:'🍎',name:'alma'}, {id:'banan',emoji:'🍌',name:'banán'}, {id:'kenyer',emoji:'🍞',name:'kenyér'}, {id:'tej',emoji:'🥛',name:'tej'},
  {id:'sajt',emoji:'🧀',name:'sajt'}, {id:'tojas',emoji:'🥚',name:'tojás'}, {id:'paradicsom',emoji:'🍅',name:'paradicsom'}, {id:'repa',emoji:'🥕',name:'sárgarépa'},
  {id:'szolo',emoji:'🍇',name:'szőlő'}, {id:'eper',emoji:'🍓',name:'eper'}, {id:'joghurt',emoji:'🥣',name:'joghurt'}, {id:'rizs',emoji:'🍚',name:'rizs'},
  {id:'citrom',emoji:'🍋',name:'citrom'}, {id:'brokkoli',emoji:'🥦',name:'brokkoli'}, {id:'hal',emoji:'🐟',name:'hal'}, {id:'mez',emoji:'🍯',name:'méz'},
];
const TWO_DIGIT_PRICES = Array.from({length:90},(_,index)=>index+10);
const DISCOUNTS = [5,10,15,20,25,30,35,40,45,50];

function boundedCount(value,max=8){return Math.max(3,Math.min(max,Math.trunc(Number(value)||3)));}
function readAnswer(answers,id){return answers instanceof Map?answers.get(id):answers?.[id];}
function result(correct,total,summary,details){return {correct,total,summary,details};}
function positional(expected,actual,label='hely'){return expected.map((value,index)=>({label:`${index+1}. ${label}`,expected:String(value),actual:actual[index]===undefined?'—':String(actual[index]),correct:actual[index]===value}));}
function clone(value){return JSON.parse(JSON.stringify(value));}
function forceChangedOrder(items,rng){const ordered=shuffle(items,rng);return ordered.length>1&&ordered.every((item,index)=>item===items[index])?[...ordered.slice(1),ordered[0]]:ordered;}
function isFilled(map,faces,fields){return faces.every(face=>fields.every(field=>map.get(face.id)?.[field]));}

export function createRetrySession(maxAttempts=2){
  const attempts=[];let closed=false;
  return {
    record(entry,successful=false){if(closed)throw new Error('A próbálkozássor már lezárult.');if(attempts.length>=maxAttempts)throw new Error('Elfogytak a próbálkozások.');attempts.push(clone(entry));closed=successful||attempts.length>=maxAttempts;return {number:attempts.length,finished:closed,canRetry:!closed};},
    raw(){return {attempts:clone(attempts)};},
    get size(){return attempts.length;},
    get finished(){return closed;},
  };
}

export function generateStations(count,rng=Math.random,theme='stations'){return sample(theme==='streets'?STREET_NAMES:STATION_NAMES,boundedCount(count,6),rng);}
export function generateStationsRound(settings,rng=Math.random){
  if(Number(settings?.level)===2){const items=[...ROUTE_STORIES[Math.floor(rng()*ROUTE_STORIES.length)]];return {level:2,items,expected:settings?.reverse?[...items].reverse():items};}
  const catalog=settings?.theme==='streets'?STREET_NAMES:STATION_NAMES,items=generateStations(settings?.count,rng,settings?.theme),expected=settings?.reverse?[...items].reverse():items;
  const distractors=catalog.filter(item=>!items.includes(item));
  const choicesByPosition=expected.map(item=>shuffle([item,...sample(distractors,2,rng)],rng));
  return {level:1,items,expected,choicesByPosition};
}
export function scoreStationOrder(expected,actual){return {correct:expected.reduce((sum,item,index)=>sum+(actual[index]===item?1:0),0),total:expected.length};}

export function generateFaces(_count,rng=Math.random){
  const faces=sample(FACE_CATALOG,5,rng),jobs=sample(MEDICAL_SPECIALTIES,5,rng),rooms=sample(ROOM_NUMBERS,5,rng);
  return faces.map((face,index)=>({...face,job:jobs[index],room:String(rooms[index])}));
}
export function shuffleFacesForRecall(faces,rng=Math.random){const recalled=shuffle(faces,rng),unchanged=recalled.length>1&&recalled.every((face,index)=>face.id===faces[index].id);return unchanged?[...recalled.slice(1),recalled[0]]:recalled;}
export function scoreFaceAnswers(faces,answers,level=1){
  let correct=0;const fields=['name',...(level>=2?['job']:[]),...(level>=3?['room']:[])];
  for(const face of faces){const answer=readAnswer(answers,face.id);for(const field of fields)correct+=(typeof answer==='object'?answer?.[field]:field==='name'?answer:undefined)===face[field]?1:0;}
  return {correct,total:faces.length*fields.length};
}

export function generatePrices(count,_difficulty='normal',rng=Math.random,_level=1){
  const safeCount=boundedCount(count,5),items=sample(GROCERY_ITEMS,safeCount,rng),prices=sample(TWO_DIGIT_PRICES,safeCount,rng),discounts=sample(DISCOUNTS,safeCount,rng);
  return items.map((item,index)=>({...item,price:prices[index],discount:discounts[index]}));
}
export function scorePriceAnswers(items,answers,level=1){
  let correct=0;for(const item of items){const answer=readAnswer(answers,item.id),price=typeof answer==='object'?answer?.price:answer;correct+=Number(price)===item.price?1:0;if(level>=2)correct+=Number(answer?.discount)===item.discount?1:0;}
  return {correct,total:items.length*(level>=2?2:1)};
}

export function generateShopping(_count,rng=Math.random,settings={}){
  const level=Number(settings?.level)||1,difficulty=settings?.difficulty==='hard'?'hard':'easy',optionCount=level===2&&difficulty==='easy'?9:14;
  const options=sample(GROCERY_ITEMS,optionCount,rng).map(item=>({...item})),targets=sample(options,9,rng).map(item=>({...item}));
  return {targets,options};
}
export function scoreShopping(targets,selectedIds,level=1){
  const selected=selectedIds instanceof Set?[...selectedIds]:[...selectedIds];
  return {correct:level>=2?targets.reduce((sum,item,index)=>sum+(selected[index]===item.id?1:0),0):targets.reduce((sum,item)=>sum+(selected.includes(item.id)?1:0),0),total:targets.length};
}

function clear(root){root.replaceChildren();}
function actionRow(...buttons){return h('div',{className:'answer-row'},...buttons);}
function makeButton(label,onClick,disabled=false,kind='primary'){return h('button',{type:'button',className:`${kind}-button`,onClick,disabled},label);}
function itemTile(item,suffix=''){return h('div',{className:'memory-tile object-tile'},h('span',{className:'object-emoji','aria-hidden':'true'},item.emoji),h('strong',{},item.name),suffix?h('span',{className:'association-hint'},suffix):null);}
function portrait(face,index,fields=[]){return h('div',{className:'memory-tile association-card'},h('div',{className:'portrait',role:'img','aria-label':`${index+1}. személy portréja`,style:{width:'96px',height:'96px',backgroundImage:"url('./assets/portraits.png')",backgroundSize:'400% 300%',backgroundPosition:`${(face.id%4)*100/3}% ${Math.floor(face.id/4)*50}%`}}),...fields.map(field=>h('span',{className:'name-chip'},face[field])));}
function solutionList(items,formatter){return h('ol',{className:'association-solution'},...items.map((item,index)=>h('li',{},formatter(item,index))));}
function finishScreen(ctx,title,message,localResult,raw,solution){
  ctx.phase(title,message);clear(ctx.root);const stack=h('div',{className:'game-stack association-feedback'},h('p',{className:'game-note','aria-live':'polite'},message));
  const finish=()=>ctx.done(localResult,raw);
  if(solution){const show=makeButton('Megoldás megtekintése',()=>{stack.replaceChildren(h('h3',{},'A helyes megoldás'),solution,actionRow(makeButton('Befejezés',finish)));});stack.append(actionRow(show));}
  else stack.append(actionRow(makeButton('Befejezés',finish)));
  ctx.root.append(stack);
}
function comparisonScreen(ctx,message,details,localResult,raw){
  ctx.phase('Összehasonlítás',message);clear(ctx.root);
  const rows=h('div',{className:'association-comparison'},...details.map(detail=>h('div',{className:`association-comparison-row${detail.correct?' is-correct':' is-wrong'}`},h('strong',{},detail.label),h('span',{},`Saját válasz: ${detail.actual}`),h('span',{},`Helyes válasz: ${detail.expected}`))));
  ctx.root.append(h('div',{className:'game-stack'},h('p',{className:'game-note','aria-live':'polite'},message),rows,actionRow(makeButton('Befejezés',()=>ctx.done(localResult,raw)))));
}

function mountStationChoices(ctx,round){
  ctx.memorize(()=>{
    const chosen=[],picked=h('div',{className:'association-picked','aria-live':'polite'}),choices=h('div',{className:'choice-grid'}),note=h('p',{className:'game-note'}),check=makeButton('Ellenőrzés',()=>{const scored=scoreStationOrder(round.expected,chosen),details=positional(round.expected,chosen,'útvonalhely'),raw={items:[...chosen]},local=result(scored.correct,scored.total,`${scored.correct} helyes választás ${scored.total}-ból.`,details);comparisonScreen(ctx,`${scored.correct} helyes választás ${scored.total}-ból.`,details,local,raw);},true);
    function draw(){
      picked.replaceChildren(...chosen.map((item,index)=>h('span',{className:'name-chip'},`${index+1}. ${item}`)));
      const index=chosen.length;choices.replaceChildren(...(round.choicesByPosition[index]||[]).map(item=>h('button',{type:'button',className:'memory-tile association-choice',onClick:()=>{chosen.push(item);draw();}},item)));
      note.textContent=index<round.expected.length?`${index+1}. hely: válassz a három lehetőség közül.`:'Minden helyhez választottál. Ellenőrizheted a sorrendet.';check.disabled=index!==round.expected.length;
    }
    ctx.phase('Útvonal felidézése','Minden helyhez külön három lehetőségből válassz.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},picked,choices,note,actionRow(check)));draw();
  });
}

function mountSentenceOrder(ctx,round){
  ctx.memorize(()=>{
    const ordered=forceChangedOrder(round.items,ctx.rand),list=h('div',{className:'association-sort','aria-live':'polite'});let dragged=-1;
    const move=(from,to)=>{if(from<0||to<0||from>=ordered.length||to>=ordered.length||from===to)return;const [item]=ordered.splice(from,1);ordered.splice(to,0,item);draw();};
    const check=makeButton('Ellenőrzés',()=>{const scored=scoreStationOrder(round.expected,ordered);ctx.done(result(scored.correct,scored.total,`${scored.correct} mondat került a pontos helyére ${scored.total}-ból.`,positional(round.expected,ordered,'mondat')),{items:[...ordered]});});
    function draw(){list.replaceChildren(...ordered.map((item,index)=>h('div',{className:'association-sort-row',dataset:{position:String(index)},draggable:true,onPointerdown:pointerDrag(ctx.root,'.association-sort-row',target=>move(index,Number(target.dataset.position))),onDragstart:event=>{dragged=index;event.dataTransfer?.setData('text/plain',String(index));},onDragover:event=>event.preventDefault(),onDrop:event=>{event.preventDefault();move(dragged,index);dragged=-1;}},h('span',{className:'association-grip','aria-hidden':'true'},'⠿'),h('span',{className:'association-sort-text'},item),h('div',{className:'association-move'},makeButton('Fel',()=>move(index,index-1),index===0,'secondary'),makeButton('Le',()=>move(index,index+1),index===ordered.length-1,'secondary')))));}
    ctx.phase('Útleírás felidézése','Húzd sorrendbe az öt mondatot, vagy használd a Fel és Le gombokat.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},list,actionRow(check)));draw();
  });
}

function mountOrder(ctx,round){
  ctx.phase('Megállóról megállóra',round.level===2?'Jegyezd meg az útleírás mondatainak sorrendjét!':'Jegyezd meg az útvonal sorrendjét!');clear(ctx.root);
  ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid'},...round.items.map((item,index)=>h('div',{className:'memory-tile association-card'},h('strong',{},`${index+1}.`),h('span',{},item))))));
  if(round.level===2)mountSentenceOrder(ctx,round);else mountStationChoices(ctx,round);
}
function mountStations(ctx){mountOrder(ctx,generateStationsRound(ctx.settings,ctx.rand));}

function mountFaces(ctx){
  const level=Number(ctx.settings.level)||1,faces=generateFaces(ctx.settings.count,ctx.rand),fields=['name',...(level>=2?['job']:[]),...(level>=3?['room']:[])],labels={name:'Név',job:'Szakterület',room:'Rendelő'},retry=createRetrySession();
  ctx.phase('Arcok és adatok','Jegyezd meg, melyik portréhoz mely adatok tartoznak!');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid'},...faces.map((face,index)=>portrait(face,index,fields)))));
  ctx.memorize(()=>{
    const recalled=faces,bankValues=Object.fromEntries(fields.map(field=>[field,forceChangedOrder(faces.map(face=>face[field]),ctx.rand)])),answers=new Map(),board=h('div',{className:'game-stack'});let selected=null;
    function assign(faceId,field,value){for(const answer of answers.values())if(answer[field]===value)delete answer[field];const answer=answers.get(faceId)||{};answer[field]=value;answers.set(faceId,answer);selected=null;draw();}
    function rawEntry(){return {answers:faces.map(face=>({faceId:face.id,...Object.fromEntries(fields.map(field=>[field,answers.get(face.id)?.[field]||'']))}))};}
    function evaluate(){
      if(!isFilled(answers,faces,fields))return;const scored=scoreFaceAnswers(faces,answers,level),entry=rawEntry(),successful=scored.correct===scored.total,state=retry.record(entry,successful);
      const local=result(scored.correct,scored.total,`${scored.correct} adat helyes ${scored.total}-ból.`,faces.flatMap(face=>fields.map(field=>{const actual=entry.answers.find(answer=>answer.faceId===face.id)?.[field]||'—';return {label:`${face.id+1}. portré – ${labels[field]}`,expected:face[field],actual,correct:actual===face[field]};})));
      if(state.canRetry){answers.clear();selected=null;draw('Az első kitöltésben volt hiba. Minden mezőt kiürítettünk; töltsd ki újra az öt portrét.');return;}
      finishScreen(ctx,'Arcok és adatok',successful?'Minden adat helyes.':'A második kitöltés eredménye kerül mentésre.',local,retry.raw());
    }
    function draw(message='Válassz egy címkét, majd a portré megfelelő mezőjét. A címkéket húzással is elhelyezheted.'){
      const banks=fields.map(field=>h('section',{className:'association-label-bank'},h('h3',{},labels[field]),h('div',{className:'association-labels'},...bankValues[field].filter(value=>![...answers.values()].some(answer=>answer[field]===value)).map(value=>h('button',{type:'button',className:`name-chip association-label${selected?.field===field&&selected?.value===value?' is-selected':''}`,draggable:true,onPointerdown:pointerDrag(ctx.root,`.association-slot[data-field="${field}"]`,target=>assign(Number(target.dataset.faceId),field,value)),onClick:()=>{selected={field,value};draw();},onDragstart:event=>{selected={field,value};event.dataTransfer?.setData('text/plain',value);}},value)))));
      const rows=recalled.map((face,index)=>h(
        'div',
        {className:'match-row association-face-row'},
        portrait(face,index),
        ...fields.map(field=>{
          const value=answers.get(face.id)?.[field];
          return h('button',{
            type:'button',
            className:`association-slot${value?' is-filled':''}`,
            'aria-label':`${labels[field]} a(z) ${index+1}. portréhoz`,
            dataset:{faceId:String(face.id),field},
            onClick:()=>{if(selected?.field===field)assign(face.id,field,selected.value);else if(value){delete answers.get(face.id)[field];draw();}},
            onDragover:event=>{if(selected?.field===field)event.preventDefault();},
            onDrop:event=>{event.preventDefault();if(selected?.field===field)assign(face.id,field,selected.value);},
          },value||`${labels[field]} helye`);
        }),
      ));
      const check=makeButton('Ellenőrzés',evaluate,!isFilled(answers,faces,fields));board.replaceChildren(h('p',{className:'game-note','aria-live':'polite'},message),...banks,h('div',{className:'association-grid'},...rows),actionRow(check));
    }
    ctx.phase('Arcok és adatok felidézése','Húzd a címkéket a megfelelő portrékhoz. Kattintással és billentyűzettel is kitölthető.');clear(ctx.root);ctx.root.append(board);draw();
  });
}

function numericInput(label,min,max){
  const input=h('input',{className:'price-input',type:'text',inputmode:'numeric',autocomplete:'off',maxlength:'2',pattern:'[0-9]{1,2}','aria-label':label});let accepted='';
  input.addEventListener('input',()=>{if(/^\d{0,2}$/.test(input.value))accepted=input.value;else input.value=accepted;input.setCustomValidity(input.value!==''&&Number(input.value)>=min&&Number(input.value)<=max?'':`${min} és ${max} közötti egész számot írj be.`);input.dispatchEvent(new Event('association-value-change',{bubbles:true}));});
  return input;
}
function mountPrices(ctx){
  const level=Number(ctx.settings.level)||1,items=generatePrices(ctx.settings.count,ctx.settings.difficulty,ctx.rand,level),answers=new Map();
  ctx.phase('Árcédulák',level>=2?'Jegyezd meg külön az árat és a kedvezményt!':'Jegyezd meg az árat; a kedvezmény százaléka támpont marad.');clear(ctx.root);
  ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid association-study-grid price-study-grid'},...items.map(item=>itemTile(item,`${item.price} Ft · ${item.discount}% kedvezmény`)))));
  ctx.memorize(()=>{
    const inputs=[];let check;
    const valid=()=>inputs.every(({input,min,max})=>/^\d{1,2}$/.test(input.value)&&Number(input.value)>=min&&Number(input.value)<=max);
    const rows=items.map(item=>{const price=numericInput(`${item.name} ára`,0,99),discount=level>=2?numericInput(`${item.name} kedvezménye`,0,99):null;inputs.push({input:price,min:0,max:99},...(discount?[{input:discount,min:0,max:99}]:[]));for(const input of [price,discount].filter(Boolean))input.addEventListener('association-value-change',()=>{answers.set(item.id,{price:price.value,discount:discount?.value});check.disabled=!valid();});return h('div',{className:'match-row'},itemTile(item,level===1?`${item.discount}% kedvezmény`:''),h('label',{},'Ár',price,' Ft'),level>=2?h('label',{},'Kedvezmény',discount,' %'):null);});
    check=makeButton('Ellenőrzés',()=>{
      if(!valid())return;const raw={answers:items.map(item=>({itemId:item.id,price:Number(answers.get(item.id)?.price),...(level>=2?{discount:Number(answers.get(item.id)?.discount)}:{})}))},map=Object.fromEntries(raw.answers.map(answer=>[answer.itemId,answer])),scored=scorePriceAnswers(items,map,level),details=items.flatMap(item=>[{label:`${item.name} ára`,expected:`${item.price} Ft`,actual:`${map[item.id].price} Ft`,correct:map[item.id].price===item.price},...(level>=2?[{label:`${item.name} kedvezménye`,expected:`${item.discount}%`,actual:`${map[item.id].discount}%`,correct:map[item.id].discount===item.discount}]:[])]),local=result(scored.correct,scored.total,`${scored.correct} mező helyes ${scored.total}-ból.`,details),solution=solutionList(items,item=>`${item.name}: ${item.price} Ft${level>=2?` és ${item.discount}% kedvezmény`:` (${item.discount}% támpont)`}`);
      finishScreen(ctx,'Árcédulák',scored.correct===scored.total?'Minden válasz helyes.':'Volt hibás válasz. Nézd meg a megoldást a befejezés előtt.',local,raw,scored.correct===scored.total?null:solution);
    },true);
    ctx.phase('Árcédulák felidézése',level>=2?'Írd be külön a két korábban látott értéket.':'Írd be az árat; a százalék továbbra is látható támpont.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'association-grid'},...rows),actionRow(check)));
  });
}

function mountShopping(ctx){
  const level=Number(ctx.settings.level)||1,round=generateShopping(ctx.settings.count,ctx.rand,ctx.settings),retry=createRetrySession();
  ctx.phase('Bevásárlólista',level>=2?'Jegyezd meg a termékek pontos polcsorrendjét!':'Jegyezd meg, mi van a listán!');clear(ctx.root);
  ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid association-study-grid shopping-study-grid','aria-label':level>=2?'Kilenc termék polcsorrendben':'Kilenc megjegyzendő termék'},...round.targets.map((item,index)=>h('div',{className:'shopping-study-item'},level>=2?h('strong',{className:'shopping-study-number'},`${index+1}.`):null,itemTile(item))))));
  ctx.memorize(()=>{
    const chosen=Array(9).fill(null),board=h('div',{className:'game-stack'});let selected=null,dragged=null;
    const place=(id,index)=>{const source=chosen.indexOf(id),displaced=chosen[index];chosen[index]=id;if(source>=0&&source!==index)chosen[source]=displaced;selected=null;dragged=null;draw();};
    const rawEntry=()=>({itemIds:[...chosen]});
    function evaluate(){
      if(chosen.some(id=>!id))return;const entry=rawEntry(),scored=scoreShopping(round.targets,entry.itemIds,level),successful=scored.correct===scored.total,state=retry.record(entry,successful),expected=round.targets.map(item=>item.id),details=level>=2?positional(expected,entry.itemIds,'polchely'):round.targets.map(item=>({label:item.name,expected:'A listán volt',actual:entry.itemIds.includes(item.id)?'Kiválasztva':'Kimaradt',correct:entry.itemIds.includes(item.id)}));
      const local=result(scored.correct,scored.total,`${scored.correct} termék helyes ${scored.total}-ból.`,details);
      if(state.canRetry){chosen.fill(null);selected=null;dragged=null;draw('Volt hiba az első kosárban. Mind a kilenc helyet kiürítettük; töltsd fel újra.');return;}
      const solution=successful?null:solutionList(round.targets,(item,index)=>level>=2?`${index+1}. ${item.name}`:item.name);
      finishScreen(ctx,'Bevásárlólista',successful?'A kosár teljesen helyes.':'A második próbálkozás eredménye kerül mentésre. Nézd meg a megoldást.',local,retry.raw(),solution);
    }
    function draw(message=level>=2?'Húzd a termékeket a kilenc számozott helyre. Kattintással is kiválaszthatod a terméket és a helyét.':'Töltsd meg a kilenchelyes kosarat. A termékek sorrendje nem számít.'){
      const used=new Set(chosen.filter(Boolean)),options=h('div',{className:'choice-grid association-shop-options'},...round.options.map(item=>h('button',{type:'button',className:`memory-tile object-tile${selected===item.id?' is-selected':''}`,disabled:used.has(item.id),draggable:true,onPointerdown:pointerDrag(ctx.root,'.association-cart-slot',target=>place(item.id,Number(target.dataset.slot))),onClick:()=>{selected=item.id;draw();},onDragstart:event=>{dragged=item.id;event.dataTransfer?.setData('text/plain',item.id);}},h('span',{className:'object-emoji','aria-hidden':'true'},item.emoji),h('strong',{},item.name))));
      const slots=h('div',{className:'association-cart','aria-label':'Kilenc kosárhely'},...chosen.map((id,index)=>{const item=round.options.find(option=>option.id===id);return h('button',{type:'button',className:`association-cart-slot${item?' is-filled':''}${selected===id?' is-selected':''}`,'aria-label':`${index+1}. kosárhely${item?`: ${item.name}`:''}`,dataset:{slot:String(index)},draggable:!!item,onPointerdown:item?pointerDrag(ctx.root,'.association-cart-slot',target=>place(item.id,Number(target.dataset.slot))):null,onClick:()=>{if(selected&&selected!==id)place(selected,index);else if(id){selected=selected===id?null:id;draw();}},onDragstart:event=>{if(item){dragged=item.id;event.dataTransfer?.setData('text/plain',item.id);}},onDragover:event=>{if(dragged)event.preventDefault();},onDrop:event=>{event.preventDefault();if(dragged)place(dragged,index);}},h('span',{className:'association-slot-number'},`${index+1}.`),item?h('span',{},item.emoji,item.name):h('span',{},'üres'));}));
      const reset=makeButton('Kosár ürítése',()=>{chosen.fill(null);selected=null;draw();},chosen.every(id=>!id),'secondary'),check=makeButton('Ellenőrzés',evaluate,chosen.some(id=>!id));
      board.replaceChildren(h('p',{className:'game-note','aria-live':'polite'},message),slots,options,actionRow(reset,check));
    }
    ctx.phase('Bevásárlólista felidézése',level>=2?'Töltsd fel a kilenc polchelyet a pontos sorrendben.':'Válassz kilenc terméket a kosárba, bármilyen sorrendben.');clear(ctx.root);ctx.root.append(board);draw();
  });
}

export const associationGames={stations:{mount:mountStations},faces:{mount:mountFaces},prices:{mount:mountPrices},shopping:{mount:mountShopping}};
