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
  {id:0,name:'Anna',job:'állatorvos',room:'12'}, {id:1,name:'Bence',job:'építész',room:'24'},
  {id:2,name:'Csenge',job:'kertész',room:'31'}, {id:3,name:'Dávid',job:'zenetanár',room:'18'},
  {id:4,name:'Félix',job:'szakács',room:'27'}, {id:5,name:'Emma',job:'könyvtáros',room:'14'},
  {id:6,name:'Hunor',job:'fotós',room:'35'}, {id:7,name:'Gréta',job:'mérnök',room:'22'},
  {id:8,name:'Júlia',job:'gyógytornász',room:'16'}, {id:9,name:'Kristóf',job:'csillagász',room:'29'},
  {id:10,name:'Lili',job:'rajztanár',room:'33'}, {id:11,name:'Márk',job:'biológus',room:'20'},
];
export const GROCERY_ITEMS = [
  {id:'alma',emoji:'🍎',name:'alma'}, {id:'banan',emoji:'🍌',name:'banán'}, {id:'kenyer',emoji:'🍞',name:'kenyér'}, {id:'tej',emoji:'🥛',name:'tej'},
  {id:'sajt',emoji:'🧀',name:'sajt'}, {id:'tojas',emoji:'🥚',name:'tojás'}, {id:'paradicsom',emoji:'🍅',name:'paradicsom'}, {id:'repa',emoji:'🥕',name:'sárgarépa'},
  {id:'szolo',emoji:'🍇',name:'szőlő'}, {id:'eper',emoji:'🍓',name:'eper'}, {id:'joghurt',emoji:'🥣',name:'joghurt'}, {id:'rizs',emoji:'🍚',name:'rizs'},
  {id:'citrom',emoji:'🍋',name:'citrom'}, {id:'brokkoli',emoji:'🥦',name:'brokkoli'}, {id:'hal',emoji:'🐟',name:'hal'}, {id:'mez',emoji:'🍯',name:'méz'},
];
const PRICE_RULES = {easy:{min:100,max:900,step:100},normal:{min:100,max:1990,step:10},hard:{min:50,max:2995,step:5}};
const DISCOUNTS = [5,10,15,20,25,30,35,40,50];

function boundedCount(value,max=8){return Math.max(3,Math.min(max,Math.trunc(Number(value)||3)));}
function pricePool({min,max,step}){const values=[];for(let value=min;value<=max;value+=step)values.push(value);return values;}
function readAnswer(answers,id){return answers instanceof Map?answers.get(id):answers?.[id];}
function result(correct,total,summary,details){return {correct,total,summary,details};}
function positional(expected,actual,label='hely'){return expected.map((value,index)=>({label:`${index+1}. ${label}`,expected:String(value),actual:actual[index]===undefined?'—':String(actual[index]),correct:actual[index]===value}));}

export function generateStations(count,rng=Math.random,theme='stations'){return sample(theme==='streets'?STREET_NAMES:STATION_NAMES,boundedCount(count,6),rng);}
export function generateStationsRound(settings,rng=Math.random){
  if(Number(settings?.level)===2){const items=[...ROUTE_STORIES[Math.floor(rng()*ROUTE_STORIES.length)]];return {level:2,items,expected:settings?.reverse?[...items].reverse():items};}
  const items=generateStations(settings?.count,rng,settings?.theme);return {level:1,items,expected:settings?.reverse?[...items].reverse():items};
}
export function scoreStationOrder(expected,actual){return {correct:expected.reduce((sum,item,index)=>sum+(actual[index]===item?1:0),0),total:expected.length};}

export function generateFaces(count,rng=Math.random){return sample(FACE_CATALOG,boundedCount(count,6),rng).map(face=>({...face}));}
export function shuffleFacesForRecall(faces,rng=Math.random){const recalled=shuffle(faces,rng),unchanged=recalled.length>1&&recalled.every((face,index)=>face.id===faces[index].id);return unchanged?[...recalled.slice(1),recalled[0]]:recalled;}
export function scoreFaceAnswers(faces,answers,level=1){
  let correct=0;const fields=['name',...(level>=2?['job']:[]),...(level>=3?['room']:[])];
  for(const face of faces){const answer=readAnswer(answers,face.id);for(const field of fields)correct+=(typeof answer==='object'?answer?.[field]:field==='name'?answer:undefined)===face[field]?1:0;}
  return {correct,total:faces.length*fields.length};
}

export function generatePrices(count,difficulty='normal',rng=Math.random,level=1){
  const safeCount=boundedCount(count,5),rules=PRICE_RULES[difficulty]||PRICE_RULES.normal,items=sample(GROCERY_ITEMS,safeCount,rng),prices=sample(pricePool(rules),safeCount,rng),discounts=sample(DISCOUNTS,safeCount,rng);
  return items.map((item,index)=>({...item,price:prices[index],...(level>=2?{discount:discounts[index]}:{})}));
}
export function scorePriceAnswers(items,answers,level=1){
  let correct=0;for(const item of items){const answer=readAnswer(answers,item.id),price=typeof answer==='object'?answer?.price:answer;correct+=Number(price)===item.price?1:0;if(level>=2)correct+=Number(answer?.discount)===item.discount?1:0;}
  return {correct,total:items.length*(level>=2?2:1)};
}

export function generateShopping(count,rng=Math.random){
  const safeCount=boundedCount(count),options=sample(GROCERY_ITEMS,safeCount+3,rng).map(item=>({...item})),targetIds=new Set(sample(options,safeCount,rng).map(item=>item.id));
  return {targets:options.filter(item=>targetIds.has(item.id)),options:shuffle(options,rng)};
}
export function scoreShopping(targets,selectedIds,level=1){
  const selected=selectedIds instanceof Set?[...selectedIds]:[...selectedIds];
  return {correct:level>=2?targets.reduce((sum,item,index)=>sum+(selected[index]===item.id?1:0),0):targets.reduce((sum,item)=>sum+(selected.includes(item.id)?1:0),0),total:targets.length};
}

function clear(root){root.replaceChildren();}
function actionRow(...buttons){return h('div',{className:'answer-row'},...buttons);}
function makeButton(label,onClick,disabled=false,kind='primary'){return h('button',{type:'button',className:`${kind}-button`,onClick,disabled},label);}
function itemTile(item,suffix=''){return h('div',{className:'memory-tile object-tile'},h('span',{className:'object-emoji','aria-hidden':'true'},item.emoji),h('strong',{},item.name),suffix?h('span',{},suffix):null);}
function portrait(face,index,fields=[]){return h('div',{className:'memory-tile association-card'},h('div',{className:'portrait',role:'img','aria-label':`${index+1}. személy portréja`,style:{width:'96px',height:'96px',backgroundImage:"url('./assets/portraits.png')",backgroundSize:'400% 300%',backgroundPosition:`${(face.id%4)*100/3}% ${Math.floor(face.id/4)*50}%`}}),...fields.map(field=>h('span',{className:'name-chip'},face[field])));}

function mountOrder(ctx,round){
  let finished=false;ctx.phase('Megállóról megállóra',round.level===2?'Jegyezd meg az útleírás mondatainak sorrendjét!':'Jegyezd meg az útvonal sorrendjét!');
  clear(ctx.root);
  const studyGrid=h('div',{className:'memory-grid'},...round.items.map((item,index)=>
    h('div',{className:'memory-tile association-card'},h('strong',{},`${index+1}.`),h('span',{},item)),
  ));
  ctx.root.append(h('div',{className:'game-stack'},studyGrid));
  ctx.memorize(()=>{
    const choices=shuffle(round.items,ctx.rand),chosen=[],chosenGrid=h('div',{className:'memory-grid','aria-live':'polite'}),choiceGrid=h('div',{className:'choice-grid'}),note=h('p',{className:'game-note'});
    const undo=makeButton('Visszavonás',()=>{chosen.pop();draw();},true,'secondary'),reset=makeButton('Újrakezdem',()=>{chosen.length=0;draw();},true,'secondary');
    const check=makeButton('Ellenőrzés',()=>{if(finished||chosen.length!==round.items.length)return;finished=true;const scored=scoreStationOrder(round.expected,chosen);ctx.done(result(scored.correct,scored.total,`${scored.correct} rész került a pontos helyére ${scored.total}-ból.`,positional(round.expected,chosen,round.level===2?'mondat':'megálló')),{items:[...chosen]});},true);
    function draw(){
      chosenGrid.replaceChildren(...chosen.map((item,index)=>h('div',{className:'memory-tile association-card is-selected'},h('strong',{},`${index+1}.`),item)));
      choiceGrid.replaceChildren(...choices.map(item=>{const used=chosen.includes(item);return h('button',{type:'button',className:`memory-tile${used?' is-selected':''}`,disabled:used,onClick:()=>{chosen.push(item);draw();}},item);}));
      undo.disabled=reset.disabled=chosen.length===0;check.disabled=chosen.length!==round.items.length;note.textContent=`${chosen.length}/${round.items.length} rész kiválasztva.`;
    }
    ctx.phase('Útvonal felidézése','Rakd a részeket a megfelelő sorrendbe.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},chosenGrid,choiceGrid,note,actionRow(undo,reset,check)));draw();
  });
}
function mountStations(ctx){mountOrder(ctx,generateStationsRound(ctx.settings,ctx.rand));}

function mountFaces(ctx){
  const level=Number(ctx.settings.level)||1,faces=generateFaces(ctx.settings.count,ctx.rand),fields=['name',...(level>=2?['job']:[]),...(level>=3?['room']:[])];let finished=false;
  ctx.phase('Arcok és adatok','Jegyezd meg, melyik portréhoz mely adatok tartoznak!');clear(ctx.root);
  ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid'},...faces.map((face,index)=>portrait(face,index,fields)))));
  ctx.memorize(()=>{
    const recalled=shuffleFacesForRecall(faces,ctx.rand),answers=new Map(),selects=[],labels={name:'Név',job:'Foglalkozás',room:'Szobaszám'};
    const rows=recalled.map((face,index)=>h('div',{className:'match-row'},portrait(face,index),...fields.map(field=>{const options=shuffle(faces.map(item=>item[field]),ctx.rand),select=h('select',{'aria-label':`${labels[field]} a(z) ${index+1}. személyhez`},h('option',{value:''},`${labels[field]}…`),...options.map(value=>h('option',{value},value)));select.addEventListener('change',()=>{const answer=answers.get(face.id)||{};answer[field]=select.value;answers.set(face.id,answer);check.disabled=selects.some(input=>!input.value);});selects.push(select);return select;})));
    const check=makeButton('Ellenőrzés',()=>{if(finished||selects.some(input=>!input.value))return;finished=true;const scored=scoreFaceAnswers(faces,answers,level),details=faces.flatMap(face=>fields.map(field=>({label:`${face.id+1}. portré – ${labels[field]}`,expected:face[field],actual:answers.get(face.id)?.[field]||'—',correct:answers.get(face.id)?.[field]===face[field]}))),raw={answers:faces.map(face=>({faceId:face.id,...answers.get(face.id)}))};ctx.done(result(scored.correct,scored.total,`${scored.correct} adat helyes ${scored.total}-ból.`,details),raw);},true);
    ctx.phase('Arcok és adatok felidézése','Töltsd ki minden portré adatait.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'association-grid'},...rows),actionRow(check)));
  });
}

function mountPrices(ctx){
  const level=Number(ctx.settings.level)||1,items=generatePrices(ctx.settings.count,ctx.settings.difficulty,ctx.rand,level),answers=new Map();let finished=false;
  ctx.phase('Árcédulák',level>=2?'Jegyezd meg az árat és a kedvezményt!':'Jegyezd meg az árakat!');clear(ctx.root);
  ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid'},...items.map(item=>itemTile(item,`${item.price} Ft${level>=2?` · ${item.discount}% kedvezmény`:''}`)))));
  ctx.memorize(()=>{
    const inputs=[];const rows=items.map(item=>{const price=h('input',{className:'price-input',type:'number',min:'0',step:'1','aria-label':`${item.name} ára`}),discount=level>=2?h('input',{className:'price-input',type:'number',min:'0',max:'100',step:'1','aria-label':`${item.name} kedvezménye`}):null;for(const field of [price,discount].filter(Boolean)){field.addEventListener('input',()=>{answers.set(item.id,{price:price.value,discount:discount?.value});check.disabled=inputs.some(input=>input.value==='');});inputs.push(field);}return h('div',{className:'match-row'},itemTile(item),h('label',{},'Ár',price,' Ft'),level>=2?h('label',{},'Kedvezmény',discount,' %'):null);});
    const check=makeButton('Ellenőrzés',()=>{if(finished||inputs.some(input=>input.value===''))return;finished=true;const scored=scorePriceAnswers(items,answers,level),details=items.flatMap(item=>[{label:`${item.name} ára`,expected:`${item.price} Ft`,actual:`${answers.get(item.id)?.price} Ft`,correct:Number(answers.get(item.id)?.price)===item.price},...(level>=2?[{label:`${item.name} kedvezménye`,expected:`${item.discount}%`,actual:`${answers.get(item.id)?.discount}%`,correct:Number(answers.get(item.id)?.discount)===item.discount}]:[])]);ctx.done(result(scored.correct,scored.total,`${scored.correct} mező helyes ${scored.total}-ból.`,details),{answers:items.map(item=>({itemId:item.id,price:Number(answers.get(item.id)?.price),...(level>=2?{discount:Number(answers.get(item.id)?.discount)}:{})}))});},true);
    ctx.phase('Árcédulák felidézése','Írd be a korábban látott értékeket.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'association-grid'},...rows),actionRow(check)));
  });
}

function mountShopping(ctx){
  const level=Number(ctx.settings.level)||1,round=generateShopping(ctx.settings.count,ctx.rand),chosen=[];let finished=false;
  ctx.phase('Bevásárlólista',level>=2?'Jegyezd meg a termékek polcsorrendjét!':'Jegyezd meg, mi van a listán!');clear(ctx.root);
  ctx.root.append(h('div',{className:'game-stack'},h('div',{className:'memory-grid'},...round.targets.map((item,index)=>h('div',{},level>=2?h('strong',{},`${index+1}. `):null,itemTile(item))))));
  ctx.memorize(()=>{
    const grid=h('div',{className:'choice-grid'}),note=h('p',{className:'game-note'}),undo=makeButton('Visszavonás',()=>{chosen.pop();draw();},true,'secondary');
    const check=makeButton('Ellenőrzés',()=>{if(finished||chosen.length!==round.targets.length)return;finished=true;const scored=scoreShopping(round.targets,chosen,level),expected=round.targets.map(item=>item.id);ctx.done(result(scored.correct,scored.total,`${scored.correct} termék helyes ${scored.total}-ból.`,level>=2?positional(expected,chosen,'polchely'):round.targets.map(item=>({label:item.name,expected:'A listán volt',actual:chosen.includes(item.id)?'Kiválasztva':'Kimaradt',correct:chosen.includes(item.id)}))),{itemIds:[...chosen]});},true);
    function draw(){grid.replaceChildren(...round.options.map(item=>{const used=chosen.includes(item.id);return h('button',{type:'button',className:`memory-tile object-tile${used?' is-selected':''}`,disabled:used,onClick:()=>{if(chosen.length<round.targets.length)chosen.push(item.id);draw();}},h('span',{className:'object-emoji'},item.emoji),h('strong',{},item.name));}));undo.disabled=chosen.length===0;check.disabled=chosen.length!==round.targets.length;note.textContent=level>=2?`Sorrend: ${chosen.join(' → ')||'—'}`:`${chosen.length}/${round.targets.length} termék kiválasztva.`;}
    ctx.phase('Bevásárlólista felidézése',level>=2?'Kattints a termékekre a polc sorrendjében.':'Válaszd ki a látott termékeket.');clear(ctx.root);ctx.root.append(h('div',{className:'game-stack'},grid,note,actionRow(undo,check)));draw();
  });
}

export const associationGames={stations:{mount:mountStations},faces:{mount:mountFaces},prices:{mount:mountPrices},shopping:{mount:mountShopping}};
