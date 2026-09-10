import {normalizeSettings} from './core.js';
import * as legacy from './legacy/v1/game-engine.js';
import {awardStars} from './scoring.js';
export const CURRENT_RULES_VERSION = 2;
export function normalizeSettingsForVersion(gameId, raw, version=2) {
  if(version===1)return legacy.normalizeGameSettings(gameId,raw);
  if(version!==2)throw new RangeError('Ismeretlen játékszabály-verzió.');
  return normalizeGameSettings(gameId,raw);
}
import {generateDigitsRound,generateGridRound,generatePathRound,generateMissingRound,scoreDigits,scoreGrid,scorePath,scoreMissing} from './games/core-games.js';
import {generateStationsRound,scoreStationOrder,generateFaces,scoreFaceAnswers,generatePrices,scorePriceAnswers,generateShopping,scoreShopping} from './games/association-games.js';
import {generatePictureRounds,generateCodeRound} from './games/advanced-games.js';

export const GAME_RULES=Object.freeze({
  digits:{levels:[1],count:[3,8]},grid:{levels:[1],count:[3,8]},path:{levels:[1],count:[3,8]},missing:{levels:[1],count:[3,8]},
  stations:{levels:[1,2],count:[3,6],themes:['stations','streets'],level2Count:5},faces:{levels:[1,2,3],fixedCount:5},
  prices:{levels:[1,2],count:[3,5]},shopping:{levels:[1,2],fixedCount:9},picture:{levels:[1,2],rounds:[3,5]},
  code:{levels:[1,2,3],rounds:[3,5],symbolSets:['objects','abstract'],messageLengths:{1:3,2:4,3:5}},
});
export const RAW_ANSWER_SHAPES=Object.freeze({
  digits:'{digits:string}',grid:'{cells:number[]}',path:'{cells:number[]}',missing:'{choiceId:string}',stations:'{items:string[]}',
  faces:'{attempts:[{answers:[{faceId,name,job?,room?}]}]}',prices:'{answers:[{itemId,price,discount?}]}',shopping:'{attempts:[{itemIds:string[]}]}',
  picture:'level1 {rounds:[{choiceId:string}]}; level2 {rounds:[{attempts:[{itemIds:string[]}]}]}',code:'{mapping:[{digit,symbolId}],answers:[{attempts:string[]}]} ',
});
const UINT32_MAX=0xffffffff;
export const COMMON_GAME_SETTINGS=Object.freeze({
  seconds:{min:5,max:180,step:5,default:10},difficulty:['easy','normal','hard'],reverse:'boolean',levelDefault:1,roundsDefault:3,
});

export function seededRandom(seed){
  const numeric=Number(seed);
  if(!Number.isInteger(numeric)||numeric<0||numeric>UINT32_MAX)throw new TypeError('A seed 0 és 4294967295 közötti egész szám lehet.');
  let state=numeric>>>0;
  return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/0x100000000;};
}

function requestedInteger(raw,key,fallback){
  if(raw?.[key]===undefined||raw?.[key]===null||raw?.[key]==='')return fallback;
  const value=Number(raw[key]);if(!Number.isInteger(value))throw new TypeError(`A(z) ${key} egész szám legyen.`);return value;
}
export function normalizeGameSettings(gameId,raw={}){
  const rule=GAME_RULES[gameId];if(!rule)throw new RangeError(`Ismeretlen játék: ${String(gameId)}`);const levels=rule.levels;
  if(raw===null||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('A játékbeállítások objektumként adhatók meg.');
  const level=requestedInteger(raw,'level',1);if(!levels.includes(level))throw new RangeError(`A(z) ${gameId} játékban nincs ${level}. szint.`);
  if(gameId==='stations'&&raw.theme!==undefined&&!['stations','streets'].includes(raw.theme))throw new RangeError('Ismeretlen útvonaltéma.');
  if(gameId==='code'&&raw.symbolSet!==undefined&&!['objects','abstract'].includes(raw.symbolSet))throw new RangeError('Ismeretlen szimbólumkészlet.');
  const base=normalizeSettings({...raw,level});
  const [countMin,countMax]=rule.count||[3,8];
  base.count=Math.max(countMin,Math.min(countMax,requestedInteger(raw,'count',5)));
  base.seconds=Math.max(5,Math.min(180,Math.round(requestedInteger(raw,'seconds',10)/5)*5));
  base.rounds=Math.max(1,Math.min(5,requestedInteger(raw,'rounds',3)));
  if(['picture','code'].includes(gameId))base.rounds=Math.max(3,base.rounds);
  if(gameId==='stations'&&level===2)base.count=5;
  if(gameId==='code')base.count=level===1?3:level===2?4:5;
  if(gameId==='faces')base.count=5;
  if(gameId==='shopping')base.count=9;
  if(['picture','shopping'].includes(gameId))base.difficulty=base.difficulty==='hard'?'hard':'easy';
  if((gameId==='picture'&&level===2)||(gameId==='shopping'&&level===1))base.difficulty='easy';
  if(['faces','prices','stations'].includes(gameId))base.difficulty='normal';
  if(gameId==='stations')base.reverse=false;
  if(gameId==='stations'&&level===2)base.theme='stations';
  return base;
}

function invalid(message){throw new TypeError(`Hibás nyers válasz: ${message}`);}
function exactObject(value,keys,label='válasz'){
  if(value===null||typeof value!=='object'||Array.isArray(value))invalid(`${label} objektum legyen`);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index]))invalid(`${label} mezői: ${expected.join(', ')}`);
  return value;
}
function exactArray(value,length,label){if(!Array.isArray(value)||value.length!==length)invalid(`${label} pontosan ${length} elemet tartalmazzon`);return value;}
function unique(values,label){if(new Set(values).size!==values.length)invalid(`${label} nem tartalmazhat ismétlést`);}
function integer(value,label,min=Number.MIN_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER){if(!Number.isSafeInteger(value)||value<min||value>max)invalid(`${label} érvénytelen egész szám`);return value;}
function ensureAllowed(values,allowed,label){const set=new Set(allowed);if(values.some(value=>!set.has(value)))invalid(`${label} idegen elemet tartalmaz`);}
function complete(scored,summary=scored.summary,details=scored.details||[]){const percent=Math.round(scored.correct/scored.total*100);return {correct:scored.correct,total:scored.total,percent,summary:summary||`${scored.correct}/${scored.total} helyes válasz.`,details};}
function positionDetails(expected,actual,label='hely'){return expected.map((value,index)=>({label:`${index+1}. ${label}`,expected:String(value),actual:actual[index]===undefined?'—':String(actual[index]),correct:actual[index]===value}));}

// RAW_ANSWER_SHAPES describes v2; the frozen legacy engine accepts v1 contracts.
export function scoreAttempt(gameId,rawSettings,seed,answer,version=2){
  if(version===1){const score=legacy.scoreAttempt(gameId,rawSettings,seed,answer);return {...score,...awardStars(gameId,rawSettings,score,1),rulesVersion:1};}
  if(version!==2)throw new RangeError('Ismeretlen játékszabály-verzió.');
  const settings=normalizeGameSettings(gameId,rawSettings);
  const score=scoreCurrent(gameId,settings,seed,answer);
  return {...score,...awardStars(gameId,settings,score,2),rulesVersion:2};
}
function checkedHistory(value,label,check,max=2){
  if(!Array.isArray(value)||value.length<1||value.length>max)invalid(`${label} 1–${max} próbát tartalmazzon`);
  const scores=value.map(check);
  if(scores.slice(0,-1).some(score=>score.correct===score.total))invalid('helyes válasz után nincs további próba');
  if(scores.at(-1).correct!==scores.at(-1).total && scores.length<max)invalid('a hibás kör újrapróbája még nincs lezárva');
  return {...scores.at(-1),attemptCount:scores.length};
}
function scoreCurrent(gameId,settings,seed,answer){
  const rng=seededRandom(seed);
  if(gameId==='digits'){
    exactObject(answer,['digits']);const round=generateDigitsRound(settings,rng);
    if(typeof answer.digits!=='string'||!new RegExp(`^\\d{${round.expected.length}}$`).test(answer.digits))invalid('a digits mező hossza vagy tartalma hibás');
    return complete(scoreDigits(round.expected,answer.digits));
  }
  if(gameId==='grid'||gameId==='path'){
    exactObject(answer,['cells']);const round=gameId==='grid'?generateGridRound(settings,rng):generatePathRound(settings,rng),expected=gameId==='grid'?round.cells:round.expected,cells=exactArray(answer.cells,expected.length,'cells');
    cells.forEach((cell,index)=>integer(cell,`cells[${index}]`,0,gameId==='grid'?round.size*round.size-1:15));unique(cells,'cells');
    return complete(gameId==='grid'?scoreGrid(expected,cells):scorePath(expected,cells));
  }
  if(gameId==='missing'){
    exactObject(answer,['choiceId']);const round=generateMissingRound(settings,rng);if(typeof answer.choiceId!=='string')invalid('choiceId szöveg legyen');ensureAllowed([answer.choiceId],round.choices.map(item=>item.label),'choiceId');
    return complete(scoreMissing(round.missing,round.choices.find(item=>item.label===answer.choiceId)));
  }
  if(gameId==='stations'){
    exactObject(answer,['items']);const round=generateStationsRound(settings,rng),items=exactArray(answer.items,round.expected.length,'items');if(items.some(item=>typeof item!=='string'))invalid('minden útvonalrész szöveg legyen');if(settings.level===2){unique(items,'items');ensureAllowed(items,round.items,'items');}else{items.forEach((item,index)=>ensureAllowed([item],round.choicesByPosition[index],`items[${index}]`));}
    const scored=scoreStationOrder(round.expected,items);return complete(scored,`${scored.correct} rész helyes ${scored.total}-ból.`,positionDetails(round.expected,items,settings.level===2?'mondat':'megálló'));
  }
  if(gameId==='faces'){
    exactObject(answer,['attempts']);const faces=generateFaces(settings.count,rng),fields=['name',...(settings.level>=2?['job']:[]),...(settings.level>=3?['room']:[])];
    return checkedHistory(answer.attempts,'attempts',entry=>{
    exactObject(entry,['answers']);const entries=exactArray(entry.answers,faces.length,'answers');
    const ids=entries.map((entry,index)=>{exactObject(entry,['faceId',...fields],`answers[${index}]`);return integer(entry.faceId,`answers[${index}].faceId`,0,11);});unique(ids,'faceId');ensureAllowed(ids,faces.map(face=>face.id),'faceId');
    for(const field of fields){const values=entries.map(entry=>entry[field]);if(values.some(value=>typeof value!=='string'))invalid(`${field} szöveg legyen`);ensureAllowed(values,faces.map(face=>face[field]),field);}
    const map=Object.fromEntries(entries.map(entry=>[entry.faceId,entry])),scored=scoreFaceAnswers(faces,map,settings.level),details=faces.flatMap(face=>fields.map(field=>({label:`${face.id+1}. portré – ${{name:'név',job:'szakterület',room:'rendelő'}[field]}`,expected:face[field],actual:map[face.id]?.[field]||'—',correct:map[face.id]?.[field]===face[field]})));
    return complete(scored,`${scored.correct} adat helyes ${scored.total}-ból.`,details);
    });
  }
  if(gameId==='prices'){
    exactObject(answer,['answers']);const items=generatePrices(settings.count,settings.difficulty,rng,settings.level),keys=['itemId','price',...(settings.level>=2?['discount']:[])],entries=exactArray(answer.answers,items.length,'answers');
    const ids=entries.map((entry,index)=>{exactObject(entry,keys,`answers[${index}]`);if(typeof entry.itemId!=='string')invalid('itemId szöveg legyen');integer(entry.price,`answers[${index}].price`,0,99);if(settings.level>=2)integer(entry.discount,`answers[${index}].discount`,0,99);return entry.itemId;});unique(ids,'itemId');ensureAllowed(ids,items.map(item=>item.id),'itemId');
    const map=Object.fromEntries(entries.map(entry=>[entry.itemId,entry])),scored=scorePriceAnswers(items,map,settings.level),details=items.flatMap(item=>[{label:`${item.name} ára`,expected:String(item.price),actual:String(map[item.id].price),correct:map[item.id].price===item.price},...(settings.level>=2?[{label:`${item.name} kedvezménye`,expected:`${item.discount}%`,actual:`${map[item.id].discount}%`,correct:map[item.id].discount===item.discount}]:[])]);
    return complete(scored,`${scored.correct} mező helyes ${scored.total}-ból.`,details);
  }
  if(gameId==='shopping'){
    exactObject(answer,['attempts']);const round=generateShopping(settings.count,rng,settings);
    return checkedHistory(answer.attempts,'attempts',entry=>{
      exactObject(entry,['itemIds']);const ids=exactArray(entry.itemIds,round.targets.length,'itemIds');if(ids.some(id=>typeof id!=='string'))invalid('itemIds csak szöveges azonosítókat tartalmazhat');unique(ids,'itemIds');ensureAllowed(ids,round.options.map(item=>item.id),'itemIds');
      const scored=scoreShopping(round.targets,ids,settings.level),expected=round.targets.map(item=>item.id),details=settings.level>=2?positionDetails(expected,ids,'polchely'):round.targets.map(item=>({label:item.name,expected:'A listán volt',actual:ids.includes(item.id)?'Kiválasztva':'Kimaradt',correct:ids.includes(item.id)}));
      return complete(scored,`${scored.correct} termék helyes ${scored.total}-ból.`,details);
    });
  }
  if(gameId==='picture'){
    exactObject(answer,['rounds']);const rounds=generatePictureRounds(settings,rng),entries=exactArray(answer.rounds,rounds.length,'rounds');let correct=0;const details=[];
    entries.forEach((entry,roundIndex)=>{
      const round=rounds[roundIndex],labelFor=id=>round.choices.find(item=>item.id===id)?.label||'Ismeretlen jelenet';
      if(settings.level===1){
        exactObject(entry,['choiceId'],`rounds[${roundIndex}]`);if(typeof entry.choiceId!=='string')invalid('choiceId szöveg legyen');ensureAllowed([entry.choiceId],round.choices.map(item=>item.id),'choiceId');const ok=entry.choiceId===round.target.id;correct+=ok?1:0;details.push({label:`${roundIndex+1}. kör`,expected:round.target.label,actual:labelFor(entry.choiceId),correct:ok});
      }else{
        exactObject(entry,['attempts'],`rounds[${roundIndex}]`);
        const scored=checkedHistory(entry.attempts,`rounds[${roundIndex}].attempts`,trial=>{
          exactObject(trial,['itemIds']);const ids=exactArray(trial.itemIds,4,'itemIds');if(ids.some(id=>typeof id!=='string'))invalid('itemIds szöveges legyen');unique(ids,'itemIds');ensureAllowed(ids,round.choices.map(item=>item.id),'itemIds');
          const ok=round.sequence.every((item,index)=>item.id===ids[index]);
          return {correct:ok?1:0,total:1,details:round.sequence.map((item,index)=>({label:`${roundIndex+1}. kör, ${index+1}. hely`,expected:item.label,actual:labelFor(ids[index]),correct:item.id===ids[index]}))};
        });
        correct+=scored.correct;details.push({label:`${roundIndex+1}. teljes képsor`,expected:'Mind a négy kép helyes sorrendben',actual:scored.correct?'Helyes képsor':'Eltérő képsor',correct:scored.correct===1},...scored.details);
      }
    });
    return complete({correct,total:rounds.length},`${correct} teljes kör helyes ${rounds.length}-ból.`,details);
  }
  if(gameId==='code'){
    exactObject(answer,['mapping','answers']);const round=generateCodeRound(settings,rng),mapping=exactArray(answer.mapping,10,'mapping'),answers=exactArray(answer.answers,round.messages.length,'answers');
    mapping.forEach((entry,index)=>{exactObject(entry,['digit','symbolId'],`mapping[${index}]`);integer(entry.digit,`mapping[${index}].digit`,0,9);if(typeof entry.symbolId!=='string')invalid('symbolId szöveg legyen');});unique(mapping.map(entry=>entry.digit),'mapping digit');unique(mapping.map(entry=>entry.symbolId),'mapping symbolId');ensureAllowed(mapping.map(entry=>entry.symbolId),round.pool.map(item=>item.id),'mapping symbolId');
    let correct=0;const details=[];
    answers.forEach((entry,roundIndex)=>{
      exactObject(entry,['attempts'],`answers[${roundIndex}]`);const expected=round.messages[roundIndex].join('');
      const scored=checkedHistory(entry.attempts,`answers[${roundIndex}].attempts`,value=>{
        if(typeof value!=='string'||!new RegExp(`^\\d{${expected.length}}$`).test(value))invalid(`answers[${roundIndex}] hossza vagy tartalma hibás`);
        return {correct:value===expected?1:0,total:1,details:[{label:`${roundIndex+1}. teljes kód`,expected,actual:value,correct:value===expected}]};
      }, settings.level===3?3:2);
      correct+=scored.correct;details.push(...scored.details);
    });
    return complete({correct,total:round.messages.length},`${correct} teljes kód helyes ${round.messages.length}-ból.`,details);
  }
  throw new RangeError(`Ismeretlen játék: ${String(gameId)}`);
}

export function validateAnswer(gameId,settings,seed,answer){scoreAttempt(gameId,settings,seed,answer);return true;}
