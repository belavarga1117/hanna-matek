import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {
  allowedHannaContentLevels,
  describeHannaSettings,
  evaluatePalaceReadiness,
  generateHannaSession,
  nextHannaReview,
  normalizeHannaResource,
  normalizeHannaSettings,
  scoreHannaAttempt,
} from '../dist/hanna/engine.js';
import {HANNA_ACTIVITIES,HANNA_OBJECTS,HANNA_PEGS,HANNA_TEXTS,HU_MAJOR_DIGITS,HU_MAJOR_WORDS} from '../dist/hanna/content.js';

const SEED=20260911;

function clone(value){return JSON.parse(JSON.stringify(value));}
function correctValue(trial){
  if(trial.rubric)return trial.rubric.map((row)=>row.accepted?.[0]).filter(Boolean).join('. ');
  return clone(trial.expected);
}
function correctAnswer(plan,{rtMs=700,hintLevel=0,trainingRtMs=700}={}){
  return {version:1,startedAt:'2026-09-11T10:00:00.000Z',completedAt:'2026-09-11T10:01:00.000Z',events:[],encoding:[],responses:plan.recallTrials.map((trial)=>({trialId:trial.id,value:correctValue(trial),rtMs,hintLevel})),
    ...(plan.training?{training:plan.training.trials.map((trial)=>({trialId:trial.id,value:trial.expected,rtMs:trainingRtMs}))}:{}),encodingDurationMs:12_000,delayDurationMs:10_000};
}
function wrongValue(trial){
  if(trial.kind==='choice')return trial.choices.find((choice)=>choice.value!==trial.expected).value;
  if(trial.kind==='ordered'||trial.kind==='multi')return [...trial.expected.slice(1),trial.expected[0]];
  if(typeof trial.expected==='string'&&/^\d+$/.test(trial.expected))return `${trial.expected[0]==='9'?'8':'9'}${trial.expected.slice(1)}`;
  return 'biztosan hibás válasz';
}
function wrongAnswer(plan){
  const trial=plan.recallTrials[0];
  return {version:1,startedAt:'2026-09-11T10:00:00.000Z',completedAt:'2026-09-11T10:01:00.000Z',events:[],encoding:[],responses:[{trialId:trial.id,value:wrongValue(trial),rtMs:900,hintLevel:0}],encodingDurationMs:9_000,delayDurationMs:10_000};
}
function omittedAnswer(){return {version:1,startedAt:'2026-09-11T10:00:00.000Z',completedAt:'2026-09-11T10:01:00.000Z',events:[],encoding:[],responses:[],encodingDurationMs:5_000,delayDurationMs:10_000};}
function reviewSnapshot(overrides={}){
  return [{id:'00000000-0000-4000-8000-000000000001',sourceActivity:'chain',sourceItemId:'chain-item-1',prompt:'Mi követte az almát?',expected:'kulcs',hints:['Idézd fel a történetet.','Az alma kinyitott valamit.','K betűvel kezdődik.'],content:[{id:'chain-kulcs',kind:'picture',label:'kulcs',image:'🔑'}],learnedAt:'2026-09-11T08:00:00.000Z',lastReviewedAt:null,intervalMs:600_000,...overrides}];
}
function allSettings(activity){return activity==='review'?{activity,reviewSnapshot:reviewSnapshot()}:{activity};}
function plain(value){return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU').replace(/[^a-z0-9]+/g,' ').trim();}
function hungarianMajorCode(value){
  const source=String(value).toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ddzs/g,'dzs').replace(/ccs/g,'cs').replace(/ssz/g,'sz').replace(/zzs/g,'zs').replace(/nny/g,'ny');
  const sounds=[['dzs','6'],['cs','6'],['zs','6'],['sz','0'],['ny','2'],['z','0'],['t','1'],['d','1'],['n','2'],['m','3'],['r','4'],['l','5'],['s','6'],['k','7'],['g','7'],['f','8'],['v','8'],['p','9'],['b','9']];
  let result='',index=0,last=null;
  while(index<source.length){if(/[aeiou]/.test(source[index])||/[hj]/.test(source[index])){last=null;index+=1;continue;}const match=sounds.find(([sound])=>source.startsWith(sound,index));if(!match){index+=1;continue;}if(match[0]!==last)result+=match[1];last=match[0];index+=match[0].length;}
  return result;
}

test('a katalógus pontosan a 15 különálló Hanna-tevékenységet exportálja',()=>{
  assert.equal(HANNA_ACTIVITIES.length,15);
  assert.deepEqual(HANNA_ACTIVITIES.map((entry)=>entry.id),['baseline','chain','association','loci','palace','peg','faces','keyword','major','numbers','random','text','concept','review','boss']);
  for(const entry of HANNA_ACTIVITIES){assert.deepEqual(Object.keys(entry),['id','title','technique','description','instruction','icon','recallModes','defaultRecallMode']);assert.ok(entry.recallModes.includes(entry.defaultRecallMode));}
  assert.ok(HANNA_OBJECTS.length>=100);
  assert.equal(new Set(HANNA_OBJECTS.map((entry)=>entry.id)).size,HANNA_OBJECTS.length);
  assert.equal(new Set(HANNA_OBJECTS.map((entry)=>entry.label)).size,HANNA_OBJECTS.length);
  assert.equal(new Set(HANNA_OBJECTS.map((entry)=>`${entry.label}\u0000${entry.image}`)).size,HANNA_OBJECTS.length);
  assert.ok(HANNA_OBJECTS.every((entry)=>entry.label&&entry.image&&entry.category));
  assert.match(HANNA_ACTIVITIES.find((entry)=>entry.id==='association').instruction,/felismerés.*szabad mód.*önálló felidézést/);
});

test('a settings explicit engedélylistát és tevékenységfüggő módokat használ',()=>{
  const value=normalizeHannaSettings({activity:'chain',difficulty:'hard',itemCount:'30',encodingMs:'0',delayMs:'60000',recallMode:'reverse',reverse:'true',adaptive:'false',contentLevel:'mixed',resourceIds:'a,b'});
  assert.deepEqual({activity:value.activity,itemCount:value.itemCount,reverse:value.reverse,adaptive:value.adaptive,resourceIds:value.resourceIds},{activity:'chain',itemCount:30,reverse:true,adaptive:false,resourceIds:['a','b']});
  assert.equal(value.difficulty,'normal');
  assert.match(describeHannaSettings(value),/Láncsztori · 30 elem · visszafelé · korlátlan tanulás/);
  assert.throws(()=>normalizeHannaSettings({activity:'faces',recallMode:'ordered'}),/recallMode/);
  assert.throws(()=>normalizeHannaSettings({activity:'numbers',itemCount:19}),/16, 20 vagy 30/);
  assert.throws(()=>normalizeHannaSettings({activity:'major',itemCount:9}),/itemCount/);
  assert.throws(()=>normalizeHannaSettings({activity:'faces',reverse:true}),/reverse/);
  assert.throws(()=>normalizeHannaSettings({activity:'chain',unknown:true}),/ismeretlen mezőt/);
  assert.equal(normalizeHannaSettings({activity:'peg',itemCount:100,resourceIds:'sajat-100-as-peg'}).itemCount,100);
});

test('a tartalmi szintek csak ott választhatók, ahol valódi mechanikát módosítanak',()=>{
  assert.deepEqual(allowedHannaContentLevels('chain'),['concrete','mixed','abstract','material']);
  assert.deepEqual(allowedHannaContentLevels('association'),['concrete','mixed','abstract','material']);
  for(const activity of ['keyword','text','concept'])assert.deepEqual(allowedHannaContentLevels(activity),['concrete','material']);
  for(const activity of ['baseline','loci','palace','peg','faces','major','numbers','random','review','boss'])assert.deepEqual(allowedHannaContentLevels(activity),['concrete']);
  assert.throws(()=>normalizeHannaSettings({activity:'baseline',contentLevel:'abstract'}),/nem használható/);
  assert.throws(()=>normalizeHannaSettings({activity:'boss',contentLevel:'material'}),/nem használható/);
  assert.throws(()=>allowedHannaContentLevels('idegen'),/activity/);
});

test('a névleges difficulty nem töri szét az azonos valós paraméterű idősorokat',()=>{
  const easySettings={activity:'chain',difficulty:'easy'},hardSettings={activity:'chain',difficulty:'hard'},easyPlan=generateHannaSession(easySettings,41),hardPlan=generateHannaSession(hardSettings,41);
  assert.deepEqual(easyPlan,hardPlan);assert.equal(easyPlan.settings.difficulty,'normal');
  const easy=scoreHannaAttempt(easySettings,41,correctAnswer(easyPlan),{serverDurationMs:60_000}),hard=scoreHannaAttempt(hardSettings,41,correctAnswer(hardPlan),{serverDurationMs:60_000});assert.equal(easy.metrics.comparabilityKey,hard.metrics.comparabilityKey);assert.doesNotMatch(easy.metrics.comparabilityKey,/easy|normal|hard/);
});

test('azonos seed és settings byte-azonos tervet ad; az ismert példák kézzel ellenőrizhetők',()=>{
  const first=generateHannaSession({activity:'chain'},SEED),second=generateHannaSession({activity:'chain'},SEED);
  assert.deepEqual(first,second);
  assert.deepEqual(first.content.map((item)=>item.label),['repülő','gyertya','pillangó','kancsó','roller','vonat','kalap','hal']);
  assert.deepEqual(first.recallTrials[0].expected,['repülő','gyertya','pillangó','kancsó','roller','vonat','kalap','hal']);
  assert.deepEqual(generateHannaSession({activity:'faces'},SEED).content.map((item)=>item.label),['Ferenc','László','Ilona','Bence','Éva']);
  assert.equal(generateHannaSession({activity:'numbers'},SEED).recallTrials[0].expected,'0820226375659827');
  const digest=createHash('sha256').update(JSON.stringify(first)).digest('hex');
  assert.equal(digest,'482f9fb6cef84e3932e2ef5f63a8e5221e8c6c37783d5807b99a054725901b3b');
});

test('minden terv közös, DOM-független alakú és saját mechanikát hordoz',()=>{
  const plans=Object.fromEntries(HANNA_ACTIVITIES.map(({id})=>[id,generateHannaSession(allSettings(id),SEED)]));
  for(const [id,plan] of Object.entries(plans)){
    assert.equal(plan.version,1);assert.equal(plan.activity,id);assert.equal(plan.protocolId,`hanna-${id}-v1`);assert.ok(plan.instructions.title);assert.ok(Array.isArray(plan.content));assert.ok(Array.isArray(plan.encodingSteps));assert.ok(Array.isArray(plan.recallTrials));assert.ok('training' in plan);assert.ok(Array.isArray(plan.reviewItems));assert.ok(Array.isArray(plan.resourceSnapshot));
    for(const trial of plan.recallTrials){assert.equal(trial.hints.length,3);assert.ok(['immediate','delayed','recall'].includes(trial.phase));}
  }
  assert.deepEqual(plans.baseline.recallTrials.map((trial)=>trial.phase),['immediate','delayed','immediate','delayed','immediate','delayed']);
  assert.equal(plans.chain.encodingSteps.filter((step)=>step.kind==='pair').length,7);
  assert.match(plans.association.encodingSteps[0].title,/30 másodperces/);assert.ok(plans.association.encodingSteps.slice(1).every((step)=>step.example.includes('mozgást és kölcsönhatást')));
  assert.equal(plans.loci.training.kind,'route');assert.equal(plans.palace.training.threshold.accuracy,0.9);
  assert.equal(plans.peg.training.kind,'peg');assert.equal(plans.peg.training.threshold.medianRtMs,2000);
  assert.ok(plans.faces.content.every((item)=>Number.isInteger(item.portraitIndex)));assert.equal(new Set(plans.faces.content.map((item)=>item.portraitIndex)).size,plans.faces.content.length);
  assert.ok(plans.keyword.content.every((item)=>item.keyword&&item.meaning));
  assert.equal(plans.major.training.threshold.accuracy,0.95);assert.equal(plans.major.training.threshold.medianRtMs,1500);
  assert.equal(plans.numbers.content.length,8);assert.ok(plans.random.recallTrials.some((trial)=>/előtt|után/.test(trial.prompt)));
  assert.ok(plans.text.recallTrials[0].rubric.length>=3);assert.ok(plans.concept.content.every((item)=>item.meaning&&item.keyword));
  assert.equal(plans.review.encodingSteps.length,0);assert.equal(plans.review.sourceActivity,'chain');assert.equal(plans.boss.encodingSteps.length,4);
});

test('minden támogatott recallMode érvényes tervet és elérhető helyes választ ad',()=>{
  for(const activity of HANNA_ACTIVITIES)for(const recallMode of activity.recallModes){const settings={...allSettings(activity.id),recallMode},plan=generateHannaSession(settings,123);const contentIds=new Set(plan.content.map((item)=>item.id));assert.equal(new Set(plan.recallTrials.map((trial)=>trial.id)).size,plan.recallTrials.length,`${activity.id}/${recallMode}`);for(const trial of plan.recallTrials){assert.ok(trial.itemIds.every((id)=>contentIds.has(id)),`${activity.id}/${recallMode}: itemId`);if(trial.kind==='choice')assert.ok(trial.choices.some((choice)=>choice.value===trial.expected),`${activity.id}/${recallMode}: correct choice`);}}
});

test('a 30 elemes lánc 30 külön tárgyat és 29 valódi szomszédos tanítási lépést használ',()=>{
  const plan=generateHannaSession({activity:'chain',itemCount:30},77);
  assert.equal(plan.content.length,30);assert.equal(new Set(plan.content.map((item)=>item.id)).size,30);assert.equal(plan.encodingSteps.length,29);
  for(let index=0;index<29;index+=1)assert.deepEqual(plan.encodingSteps[index].itemIds,[plan.content[index].id,plan.content[index+1].id]);
});

test('a 100-as saját peg teljes, determinisztikus kört és hibátlanul pontozható 100 egyedi tárgyat ad',()=>{
  const pegResource={id:'peg-100',kind:'peg',title:'Saját 100-as peg',revision:1,ready:true,data:{entries:Array.from({length:100},(_,index)=>({number:index+1,label:`${index+1}. horog`}))}};
  const settings={activity:'peg',itemCount:100,resourceIds:['peg-100'],resourceSnapshot:[pegResource],adaptive:false};
  const first=generateHannaSession(settings,100100),second=generateHannaSession(settings,100100);
  assert.deepEqual(first,second);
  assert.equal(first.content.length,100);
  assert.equal(first.encodingSteps.length,100);
  assert.equal(first.recallTrials.length,100);
  assert.equal(first.training.items.length,20);
  assert.equal(first.training.trials.length,40);
  assert.equal(new Set(first.content.map((item)=>item.id)).size,100);
  assert.equal(new Set(first.content.map((item)=>item.label)).size,100);
  assert.ok(first.recallTrials.every((trial)=>first.content.some((item)=>item.id===trial.itemIds[0]&&item.label===trial.expected)));
  const result=scoreHannaAttempt(settings,100100,correctAnswer(first,{trainingRtMs:700}),{serverDurationMs:120_000});
  assert.equal(result.correct,100);
  assert.equal(result.total,100);
  assert.equal(result.percent,100);
  assert.equal(result.metrics.subscales.training.passed,true);
});

test('az absztrakt, vegyes és saját lánctartalom ténylegesen eltérő forrást használ',()=>{
  const abstract=generateHannaSession({activity:'chain',contentLevel:'abstract',itemCount:8},8);assert.ok(abstract.content.every((item)=>item.kind==='concept'));
  const mixed=generateHannaSession({activity:'chain',contentLevel:'mixed',itemCount:12},8);assert.ok(mixed.content.some((item)=>item.kind==='concept'));assert.ok(mixed.content.some((item)=>item.kind==='picture'));
  const material={id:'mat-1',kind:'material',title:'Saját',revision:1,ready:true,data:{items:Array.from({length:8},(_,index)=>({id:`s${index}`,label:`Saját ${index+1}`,meaning:`Jelentés ${index+1}`}))}};
  const custom=generateHannaSession({activity:'chain',contentLevel:'material',itemCount:8,resourceSnapshot:[material]},8);assert.ok(custom.content.every((item)=>item.label.startsWith('Saját')));
});

test('a saját Kulcsszóhíd és Fogalomból kép csak teljes, nem önáruló tételeket fogad el',()=>{
  const resource=(items)=>({id:'mat-teljesseg',kind:'material',title:'Saját tételek',revision:1,ready:true,data:{items}}),labelOnly=resource(Array.from({length:3},(_,index)=>({id:`x${index}`,label:`Tétel ${index+1}`})));
  for(const activity of ['keyword','concept'])assert.throws(()=>generateHannaSession({activity,itemCount:3,contentLevel:'material',resourceSnapshot:[labelOnly]},4),/szó, jelentés és képi hangzáskulcs|fogalom, definíció és vizuális szimbólum/);
  const leaking=resource(Array.from({length:3},(_,index)=>({id:`l${index}`,label:`bridge${index}`,meaning:`bridge${index} jelentése`,keyword:`bricska ${index}`})));
  assert.throws(()=>generateHannaSession({activity:'keyword',itemCount:3,contentLevel:'material',resourceSnapshot:[leaking]},4),/nem árulhatja el/);
  const complete=resource(Array.from({length:3},(_,index)=>({id:`ok${index}`,label:`foreign${index}`,meaning:`magyar jelentés ${index}`,keyword:`képi kulcs ${index}`})));
  for(const activity of ['keyword','concept']){
    const plan=generateHannaSession({activity,itemCount:3,contentLevel:'material',resourceSnapshot:[complete]},4);assert.equal(plan.content.length,3);assert.ok(plan.content.every((item)=>item.meaning&&item.keyword));
    for(const trial of plan.recallTrials){const expected=Array.isArray(trial.expected)?trial.expected.join(' '):trial.expected;assert.equal(plain(trial.prompt).includes(plain(expected)),false,`${activity}: ${trial.prompt}`);}
  }
});

test('mind a 15 szabálycsalád helyes, hibás és kihagyott választ külön pontoz',()=>{
  for(const {id} of HANNA_ACTIVITIES){
    const settings=allSettings(id),plan=generateHannaSession(settings,SEED),context={serverDurationMs:60_000,serverRetentionMs:10_000};
    const perfect=scoreHannaAttempt(settings,SEED,correctAnswer(plan),context);assert.equal(perfect.correct,perfect.total,`${id}: perfect`);assert.equal(perfect.percent,100,`${id}: percent`);assert.equal(perfect.stars,null);assert.equal(perfect.starBasis,'hanna-method-no-stars');assert.doesNotMatch(perfect.summary,/IQ|klinikai teszt/i);
    const wrong=scoreHannaAttempt(settings,SEED,wrongAnswer(plan),context);assert.ok(wrong.correct<wrong.total,`${id}: wrong`);
    const omitted=scoreHannaAttempt(settings,SEED,omittedAnswer(),context);assert.equal(omitted.correct,0,`${id}: omitted`);assert.equal(omitted.details.some((detail)=>detail.actual==='—'),true,`${id}: omitted detail`);
  }
});

test('a baseline azonnali és késleltetett szó/kép/szám alskálákat őriz',()=>{
  const settings={activity:'baseline'},plan=generateHannaSession(settings,9),result=scoreHannaAttempt(settings,9,correctAnswer(plan),{serverDurationMs:60_000,serverRetentionMs:12_000});
  assert.deepEqual(Object.keys(result.metrics.subscales).sort(),['digitDelayed','digitImmediate','pictureDelayed','pictureImmediate','wordDelayed','wordImmediate']);
  assert.ok(Object.values(result.metrics.subscales).every((scale)=>scale.accuracy===1));
  assert.equal(result.metrics.retentionMs,12_000);assert.equal(result.metrics.encodingDurationMs,12_000);
});

test('a baseline gépelt sorrendi válasza részpontozható üres és téves mezőkkel is',()=>{
  const settings={activity:'baseline',itemCount:5},plan=generateHannaSession(settings,71),answer=correctAnswer(plan),wordImmediate=plan.recallTrials.find((trial)=>trial.id==='baseline-0-immediate');
  assert.equal(wordImmediate.entry,'typed');
  const response=answer.responses.find((entry)=>entry.trialId===wordImmediate.id);response.value=[wordImmediate.expected[0],'','biztosan idegen szó','',''];
  const score=scoreHannaAttempt(settings,71,answer,{serverDurationMs:60_000});assert.equal(score.metrics.subscales.wordImmediate.correct,1);assert.equal(score.metrics.subscales.wordImmediate.total,5);
  const wrongLength=correctAnswer(plan);wrongLength.responses.find((entry)=>entry.trialId===wordImmediate.id).value=['csak egy mező'];assert.throws(()=>scoreHannaAttempt(settings,71,wrongLength,{serverDurationMs:60_000}),/pontos elemszámú/);
  const poolRound=generateHannaSession({activity:'chain'},71),poolAnswer=correctAnswer(poolRound);poolAnswer.responses[0].value[0]='';assert.throws(()=>scoreHannaAttempt({activity:'chain'},71,poolAnswer),/idegen, dupla vagy határon kívüli/);
});

test('a score külön őrzi a pontosságot, sorrendet, időt és segítséget',()=>{
  const settings={activity:'chain'},plan=generateHannaSession(settings,4),answer=correctAnswer(plan,{rtMs:1234,hintLevel:4});answer.events=[{eventId:'show-1',type:'show-answer',atMs:5000,trialId:plan.recallTrials[0].id}];
  const result=scoreHannaAttempt(settings,4,answer,{serverDurationMs:60_000,serverRetentionMs:10_000});
  assert.equal(result.percent,100);assert.equal(result.metrics.accuracy,1);assert.equal(result.metrics.orderAccuracy,1);assert.equal(result.metrics.independentCorrect,0);assert.equal(result.metrics.assistedCorrect,result.total);assert.equal(result.metrics.medianCorrectRtMs,1234);assert.ok(result.metrics.qualityFlags.includes('solution-viewed'));
});

test('a show-answer esemény response hint 0 mellett sem ad önálló helyest',()=>{
  const settings={activity:'faces'},plan=generateHannaSession(settings,14),answer=correctAnswer(plan);answer.events=[{eventId:'reveal-1',type:'show-answer',atMs:400,trialId:plan.recallTrials[0].id}];
  const result=scoreHannaAttempt(settings,14,answer,{serverDurationMs:60_000});assert.equal(result.correct,result.total);assert.equal(result.metrics.independentCorrect,result.total-1);assert.equal(result.metrics.assistedCorrect,1);assert.deepEqual(result.metrics.reviewOutcomes,[]);assert.ok(result.metrics.qualityFlags.includes('help-used'));assert.ok(result.metrics.qualityFlags.includes('solution-viewed'));
  const hintAnswer=correctAnswer(plan);hintAnswer.events=[{eventId:'hint-1',type:'hint',atMs:300,trialId:plan.recallTrials[1].id,value:2}];const hinted=scoreHannaAttempt(settings,14,hintAnswer,{serverDurationMs:60_000});assert.equal(hinted.metrics.independentCorrect,hinted.total-1);assert.deepEqual(hinted.metrics.reviewOutcomes,[]);
});

test('a Szövegépítő kulcsgondolat-rubrikája és verbatim szóeltérése külön működik',()=>{
  const meaning={activity:'text',recallMode:'meaning'},meaningPlan=generateHannaSession(meaning,1),meaningAnswer=correctAnswer(meaningPlan);meaningAnswer.responses[0].value=meaningPlan.recallTrials[0].rubric[0].accepted[0];
  const meaningScore=scoreHannaAttempt(meaning,1,meaningAnswer,{serverDurationMs:60_000});assert.equal(meaningScore.correct,4);assert.equal(meaningScore.total,6);assert.match(meaningScore.summary,/gyakorlási eredmény/);
  const verbatim={activity:'text',recallMode:'verbatim'},verbatimPlan=generateHannaSession(verbatim,1),verbatimAnswer=correctAnswer(verbatimPlan);verbatimAnswer.responses[0].value=String(verbatimPlan.recallTrials[0].expected).replace(/^\S+/,'Más');
  assert.equal(meaningScore.details.at(-1).feedback,'Megjelent a kulcsgondolat.');
  const verbatimScore=scoreHannaAttempt(verbatim,1,verbatimAnswer,{serverDurationMs:60_000});assert.equal(verbatimScore.total-verbatimScore.correct,1);assert.equal(verbatimScore.details.at(-1).feedback,'Szó szerinti eltérés');
});

test('a beépített szövegek seedelten váltakoznak, és a forrásazonosító szétválasztja az idősorukat',()=>{
  assert.ok(HANNA_TEXTS.length>=4);assert.equal(new Set(HANNA_TEXTS.map((entry)=>entry.id)).size,HANNA_TEXTS.length);
  const plans=[0,1,2,3].map((seed)=>generateHannaSession({activity:'text'},seed));assert.equal(new Set(plans.map((plan)=>plan.sourceTextId)).size,4);assert.deepEqual(generateHannaSession({activity:'text'},2),plans[2]);
  const keys=plans.map((plan,seed)=>scoreHannaAttempt({activity:'text'},seed,correctAnswer(plan),{serverDurationMs:60_000}).metrics.comparabilityKey);assert.equal(new Set(keys).size,4);assert.ok(keys.every((key,index)=>key.endsWith(encodeURIComponent(plans[index].sourceTextId))));
});

test('a szöveges review kérdés nem tartalmazza a választ, a verbatim kártya pedig szavanként pontoz',()=>{
  for(const {id} of HANNA_ACTIVITIES){if(id==='review')continue;const plan=generateHannaSession({activity:id},8);for(const item of plan.reviewItems){const expected=plain(item.expected);if(expected.length>=4)assert.equal(plain(item.prompt).includes(expected),false,`${id}: ${item.prompt}`);}}
  const source=generateHannaSession({activity:'text',recallMode:'meaning'},8);assert.ok(source.reviewItems.every((item)=>item.accepted.length>=1&&item.expected===item.accepted[0]&&!plain(item.prompt).includes(plain(item.expected))));
  const verbatim=generateHannaSession({activity:'text',recallMode:'verbatim'},8),card=verbatim.reviewItems[0],snapshot=[{id:'00000000-0000-4000-8000-000000000099',sourceActivity:'text',sourceItemId:card.content[0].id,prompt:card.prompt,expected:card.expected,hints:card.hints,content:card.content,learnedAt:'2026-09-11T08:00:00.000Z',lastReviewedAt:null,intervalMs:600_000}],settings={activity:'review',reviewSnapshot:snapshot},review=generateHannaSession(settings,9),answer=correctAnswer(review);
  assert.equal(review.recallTrials[0].kind,'text');answer.responses[0].value=String(answer.responses[0].value).replace(/^\S+/,'Más');const score=scoreHannaAttempt(settings,9,answer,{serverDurationMs:60_000,serverRetentionMs:600_000});assert.equal(score.total-score.correct,1);assert.ok(score.details.length>4);assert.ok(score.details.every((detail)=>detail.feedback==='Szó szerinti eltérés'));
});

test('a Major-változat magyar beszédhangokat dokumentál, angol sh/ch kód nélkül',()=>{
  assert.deepEqual(HU_MAJOR_DIGITS.map((entry)=>[entry.digit,entry.sounds]),[
    ['0',['sz','z']],['1',['t','d']],['2',['n','ny']],['3',['m']],['4',['r']],['5',['l']],['6',['s','zs','cs','dzs']],['7',['k','g']],['8',['f','v']],['9',['p','b']],
  ]);
  assert.equal(HU_MAJOR_DIGITS.some((entry)=>entry.sounds.includes('sh')||entry.sounds.includes('ch')),false);
  assert.deepEqual(HU_MAJOR_WORDS.slice(0,10).map((entry)=>`${entry.code}:${entry.label}`),['00:szósz','01:szita','02:zóna','03:szem','04:szár','05:szél','06:szusi','07:szék','08:szív','09:szép']);
  assert.equal(HU_MAJOR_WORDS.length,100);assert.deepEqual(HU_MAJOR_WORDS.map((entry)=>entry.code),Array.from({length:100},(_,index)=>String(index).padStart(2,'0')));
  for(const entry of HU_MAJOR_WORDS)assert.equal(hungarianMajorCode(entry.label),entry.code,`${entry.code}: ${entry.label}`);
  const leadingDigits=new Set();for(let seed=0;seed<100;seed+=1){const digits=generateHannaSession({activity:'numbers'},seed).recallTrials[0].expected;for(let index=0;index<digits.length;index+=2)leadingDigits.add(digits[index]);}assert.deepEqual([...leadingDigits].sort(),['0','1','2','3','4','5','6','7','8','9']);
});

test('a Major-kör a hangkód után explicit kétjegyű képeket tanít, és a saját szótárat használja',()=>{
  const own={id:'major-1',kind:'major',title:'Saját kódok',revision:2,ready:true,data:{entries:[{code:'50',label:'lasszó'},{code:'51',label:'láda'},{code:'52',label:'lánc'},{code:'53',label:'láma'}]}};
  const plan=generateHannaSession({activity:'major',resourceSnapshot:[own]},31);assert.equal(plan.encodingSteps.filter((step)=>step.id.startsWith('major-word-step-')).length,10);assert.ok(plan.content.some((item)=>item.label==='lasszó'));assert.ok(plan.encodingSteps.some((step)=>step.prompt.includes('lasszó')));
});

test('a major 95% és 1500 ms alatti, a peg mintája 90% és 2 mp alatti betanítási kaput mér',()=>{
  const majorSettings={activity:'major'},majorPlan=generateHannaSession(majorSettings,2),majorAnswer=correctAnswer(majorPlan,{trainingRtMs:1499});majorAnswer.training[0].value=majorPlan.training.trials[0].choices.find((choice)=>choice.value!==majorPlan.training.trials[0].expected).value;
  const pass=scoreHannaAttempt(majorSettings,2,majorAnswer,{serverDurationMs:60_000});assert.equal(pass.metrics.subscales.training.accuracy,0.95);assert.equal(pass.metrics.subscales.training.passed,true);
  majorAnswer.training.forEach((entry)=>{entry.rtMs=1500;});const boundary=scoreHannaAttempt(majorSettings,2,majorAnswer,{serverDurationMs:60_000});assert.equal(boundary.metrics.subscales.training.passed,false);
  const pegSettings={activity:'peg'},pegPlan=generateHannaSession(pegSettings,2),pegFast=scoreHannaAttempt(pegSettings,2,correctAnswer(pegPlan,{trainingRtMs:1999}),{serverDurationMs:60_000});assert.equal(pegFast.metrics.subscales.training.passed,true);
  const pegBoundary=scoreHannaAttempt(pegSettings,2,correctAnswer(pegPlan,{trainingRtMs:2000}),{serverDurationMs:60_000});assert.equal(pegBoundary.metrics.subscales.training.passed,false);
  const twoWrong=correctAnswer(pegPlan,{trainingRtMs:1999});for(const response of twoWrong.training.slice(0,2)){const trial=pegPlan.training.trials.find((entry)=>entry.id===response.trialId);response.value=trial.choices.find((choice)=>choice.value!==trial.expected).value;}const ninety=scoreHannaAttempt(pegSettings,2,twoWrong,{serverDurationMs:60_000});assert.equal(ninety.metrics.subscales.training.accuracy,0.9);assert.equal(ninety.metrics.subscales.training.passed,true);
  const threeWrong=correctAnswer(pegPlan,{trainingRtMs:1999});for(const response of threeWrong.training.slice(0,3)){const trial=pegPlan.training.trials.find((entry)=>entry.id===response.trialId);response.value=trial.choices.find((choice)=>choice.value!==trial.expected).value;}assert.equal(scoreHannaAttempt(pegSettings,2,threeWrong,{serverDurationMs:60_000}).metrics.subscales.training.passed,false);
});

test('a palotaerőforrás szigorú, és 90%-os útvonaltudásnál lesz kész',()=>{
  const data={locations:Array.from({length:10},(_,index)=>({id:`hely-${index}`,name:`Hely ${index+1}`,description:`Leírás ${index+1}`}))};
  assert.deepEqual(normalizeHannaResource('palace',data),data);
  const nine={answers:Array.from({length:10},(_,index)=>({index,value:index===9?'rossz':`Hely ${index+1}`}))};const ready=evaluatePalaceReadiness(data,nine);assert.equal(ready.correct,9);assert.equal(ready.ready,true);
  nine.answers[8].value='rossz';assert.equal(evaluatePalaceReadiness(data,nine).ready,false);
  assert.throws(()=>evaluatePalaceReadiness(data,{answers:[{index:0,value:'Hely 1'},{index:0,value:'Hely 1'}]}),/pontosan egyszer/);
  assert.throws(()=>normalizeHannaResource('palace',{locations:data.locations.map((entry,index)=>index?entry:{...entry,photo:`data:image/png;base64,${'A'.repeat(270_000)}`} )}),/200 KB/);
});

test('a peg, Major és tananyag szerkesztőadatai kiszűrik a hibás alakokat',()=>{
  assert.deepEqual(normalizeHannaResource('peg',{entries:Array.from({length:5},(_,index)=>({number:index+1,label:`Horog ${index+1}`}))}).entries.length,5);
  assert.throws(()=>normalizeHannaResource('peg',{entries:Array.from({length:5},(_,index)=>({number:index+2,label:`Horog ${index+1}`}))}),/1-től induló/);
  assert.throws(()=>normalizeHannaResource('major',{entries:[{code:'01',label:'szita'},{code:'01',label:'másik'}]}),/egyedi/);
  assert.throws(()=>normalizeHannaResource('material',{items:[{id:'x',label:'Első'},{id:'x',label:'Második'}]}),/azonosítói/);
  assert.doesNotThrow(()=>normalizeHannaResource('material',{text:'Tanári szöveg.',rubric:[{id:'r1',label:'Kulcsgondolat'}]}));
  assert.throws(()=>normalizeHannaResource('material',{text:'A Nap melegíti a vizet.',rubric:[{id:'r1',label:'A Nap melegíti a vizet',accepted:['a nap melegíti a vizet']}]}),/nem tartalmazhatja a teljes elfogadott választ/);
});

test('az erőforrás-pillanatkép klónozott, fagyasztott, és a harmadik resources paraméter nem írhatja felül',()=>{
  const source={id:'palota-1',kind:'palace',title:'Saját palota',revision:3,ready:true,data:{locations:Array.from({length:5},(_,index)=>({id:`p${index}`,name:`Pont ${index+1}`,description:'stabil'}))}};
  const plan=generateHannaSession({activity:'palace',itemCount:5,resourceSnapshot:[source]},5);source.data.locations[0].name='Átírva';
  assert.equal(plan.resourceSnapshot[0].data.locations[0].name,'Pont 1');assert.throws(()=>{plan.resourceSnapshot[0].data.locations[0].name='Más';},TypeError);
  const injected=generateHannaSession({activity:'palace',itemCount:5},5,[source]);assert.deepEqual(injected.resourceSnapshot,[]);assert.equal(injected.content[0].location,'bejárati ajtó');
});

test('a kész saját palota helyeihez új tárgyak kapcsolódnak; készültség nélkül nem használható',()=>{
  const base={id:'palota-2',kind:'palace',title:'Otthon',revision:1,data:{locations:Array.from({length:5},(_,index)=>({id:`otthon-${index}`,name:`Saját hely ${index+1}`,description:'ismert pont'}))}};
  assert.throws(()=>generateHannaSession({activity:'palace',itemCount:5,resourceSnapshot:[{...base,ready:false}]},5),/90%/);
  const plan=generateHannaSession({activity:'palace',itemCount:5,resourceSnapshot:[{...base,ready:true}]},5);assert.equal(plan.content.length,5);assert.ok(plan.content.every((item,index)=>item.kind==='picture'&&item.location===`Saját hely ${index+1}`));assert.equal(plan.encodingSteps.filter((step)=>step.id.startsWith('palace-place-')).length,5);assert.ok(plan.recallTrials[0].expected.every((value)=>!value.startsWith('Saját hely')));
});

test('a fordított chain, loci és palace itemId-je ugyanazt az elemet és helyet jelöli, mint az expected',()=>{
  for(const activity of ['chain','loci','palace'])for(const mode of [{recallMode:'reverse'},{recallMode:'ordered',reverse:true}]){
    const plan=generateHannaSession({activity,itemCount:5,...mode},71),trial=plan.recallTrials[0],byId=new Map(plan.content.map((item)=>[item.id,item]));
    assert.deepEqual(trial.itemIds.map((id)=>byId.get(id)?.label),trial.expected,`${activity}/${mode.recallMode}`);
    for(const card of plan.reviewItems){assert.equal(card.content[0].label,card.expected);if(activity!=='chain')assert.equal(card.content[0].location,byId.get(card.content[0].id).location);}
  }
});

test('a concept és face választások mindig tartalmazzák a célt, de a névopció nem árul portréindexet',()=>{
  for(let seed=0;seed<100;seed+=1){const concept=generateHannaSession({activity:'concept',recallMode:'choice'},seed);for(const trial of concept.recallTrials)assert.ok(trial.choices.some((choice)=>choice.value===trial.expected));const faces=generateHannaSession({activity:'faces',recallMode:'choice'},seed);for(const trial of faces.recallTrials){assert.ok(trial.choices.some((choice)=>choice.value===trial.expected));assert.ok(trial.choices.every((choice)=>choice.portraitIndex===undefined));}}
});

test('a review kizárólag snapshotból készül, megőrzi a sourceItemId-t és DB-kártya ID-val ad outcome-ot',()=>{
  assert.equal(normalizeHannaSettings({activity:'review'}).reviewSnapshot.length,0);assert.throws(()=>generateHannaSession({activity:'review'},1),/reviewSnapshot/);
  const settings={activity:'review',reviewIds:['00000000-0000-4000-8000-000000000001'],reviewSnapshot:reviewSnapshot()},normalized=normalizeHannaSettings(settings),plan=generateHannaSession(settings,99);
  assert.equal(normalized.reviewSnapshot[0].sourceItemId,'chain-item-1');assert.equal(plan.recallTrials[0].expected,'kulcs');assert.equal(plan.sourceActivity,'chain');assert.equal(plan.reviewItems.length,0);
  const score=scoreHannaAttempt(settings,99,correctAnswer(plan),{serverDurationMs:60_000,serverRetentionMs:600_000});assert.equal(score.metrics.reviewOutcomes[0].itemId,'00000000-0000-4000-8000-000000000001');
  assert.throws(()=>generateHannaSession({...settings,reviewIds:['idegen']},99),/nincs esedékes|kiválasztott/);
});

test('a review tartalomazonosítója kártyánként névterezett, ezért két kör azonos nyers id-je nem olvad össze',()=>{
  const common={sourceActivity:'peg',sourceItemId:'peg-object-alma',expected:'alma',hints:['Első','Második','Harmadik'],learnedAt:'2025-01-01T00:00:00.000Z',lastReviewedAt:null,intervalMs:600_000};
  const reviewSnapshot=[
    {...common,id:'card-a',prompt:'Mi volt a 3. horgon?',content:[{id:'peg-object-alma',kind:'picture',label:'alma',image:'🍎',peg:3,meaning:'háromágú villa'}]},
    {...common,id:'card-b',prompt:'Mi volt a 7. horgon?',content:[{id:'peg-object-alma',kind:'picture',label:'alma',image:'🍎',peg:7,meaning:'kasza'}]},
  ];
  const plan=generateHannaSession({activity:'review',reviewSnapshot},91),byId=new Map(plan.content.map((item)=>[item.id,item]));
  assert.equal(plan.content.length,2);assert.equal(new Set(plan.content.map((item)=>item.id)).size,2);
  assert.deepEqual(plan.recallTrials.map((trial)=>byId.get(trial.itemIds[0]).peg),[3,7]);
  assert.ok(plan.recallTrials[0].itemIds[0].startsWith('card-a:'));assert.ok(plan.recallTrials[1].itemIds[0].startsWith('card-b:'));
});

test('a faces és boss face review visszakapja a portréképet, de a prompt nem árulja el a nevet',()=>{
  for(const activity of ['faces','boss']){
    const source=generateHannaSession({activity},23),item=source.reviewItems.find((candidate)=>candidate.content.some((content)=>content.kind==='face')),face=item.content.find((content)=>content.kind==='face');
    const snapshot=[{id:activity==='faces'?'00000000-0000-4000-8000-000000000011':'00000000-0000-4000-8000-000000000012',sourceActivity:activity,sourceItemId:face.id,prompt:item.prompt,expected:item.expected,...(item.accepted?{accepted:item.accepted}:{}),hints:item.hints,content:item.content,learnedAt:'2026-09-11T08:00:00.000Z',lastReviewedAt:null,intervalMs:600_000}];
    const review=generateHannaSession({activity:'review',reviewSnapshot:snapshot},24),trial=review.recallTrials[0];assert.equal(trial.image,'./assets/portraits.png');assert.equal(trial.portraitIndex,face.portraitIndex);assert.doesNotMatch(trial.prompt,new RegExp(String(item.expected),'i'));assert.match(trial.prompt,/portrén|látható/);
  }
});

test('a privát resource és review snapshot elfogadott alakjai csak pontozáskor lépnek be',()=>{
  const publicResource={id:'anyag-1',kind:'material',title:'Víz',revision:1,ready:true,data:{text:'A Nap melegíti a vizet.',rubric:[{id:'nap',label:'A Nap szerepe'}]}};
  const privateResource=clone(publicResource);privateResource.data.rubric[0].accepted=['a nap melegíti a vizet'];
  const settings={activity:'text',recallMode:'meaning',resourceSnapshot:[publicResource]},plan=generateHannaSession(settings,3),answer=correctAnswer(plan);answer.responses.forEach((response)=>{response.value='A Nap melegíti a vizet.';});
  const withoutPrivate=scoreHannaAttempt(settings,3,answer,{serverDurationMs:60_000});assert.equal(withoutPrivate.correct,0);
  const withPrivate=scoreHannaAttempt(settings,3,answer,{serverDurationMs:60_000,privateSettings:{hannaResourceSnapshot:[privateResource]}});assert.equal(withPrivate.correct,2);
  const publicReview=reviewSnapshot(),privateReview=reviewSnapshot({accepted:['az ajtó kulcsa']});const reviewSettings={activity:'review',reviewSnapshot:publicReview},reviewPlan=generateHannaSession(reviewSettings,3),reviewAnswer=correctAnswer(reviewPlan);reviewAnswer.responses[0].value='az ajtó kulcsa';
  assert.equal(scoreHannaAttempt(reviewSettings,3,reviewAnswer,{serverDurationMs:60_000}).correct,0);
  assert.equal(scoreHannaAttempt(reviewSettings,3,reviewAnswer,{serverDurationMs:60_000,privateSettings:{hannaReviewSnapshot:privateReview}}).correct,1);
});

test('a kontextus közvetlen acceptedFor kulcsai nem bővíthetik a helyes válaszokat',()=>{
  const settings={activity:'chain',recallMode:'free',itemCount:5},plan=generateHannaSession(settings,18),answer=correctAnswer(plan),trialId=plan.recallTrials[0].id;answer.responses[0].value='bármi';
  for(const key of ['privateAccepted','acceptedByTrialId']){
    const result=scoreHannaAttempt(settings,18,answer,{serverDurationMs:60_000,[key]:{[trialId]:['bármi']}});assert.equal(result.correct,result.total-1,key);
  }
});

test('a szerver által mért 400 napos megtartás érvényes, és a normál kör nem ad review outcome-ot',()=>{
  const settings={activity:'review',reviewSnapshot:reviewSnapshot()},plan=generateHannaSession(settings,29),answer=correctAnswer(plan),retentionMs=400*24*60*60*1000;answer.events=[{eventId:'reveal-review',type:'show-answer',atMs:400,trialId:plan.recallTrials[0].id}];
  const result=scoreHannaAttempt(settings,29,answer,{serverDurationMs:60_000,serverRetentionMs:retentionMs});assert.equal(result.metrics.retentionMs,retentionMs);assert.deepEqual(result.metrics.reviewOutcomes,[{itemId:'00000000-0000-4000-8000-000000000001',correct:true,rtMs:700,hintLevel:4}]);
  const normalSettings={activity:'chain',itemCount:5},normalPlan=generateHannaSession(normalSettings,29),normal=scoreHannaAttempt(normalSettings,29,correctAnswer(normalPlan),{serverDurationMs:60_000});assert.deepEqual(normal.metrics.reviewOutcomes,[]);
});

test('a review intervallum hibás, lassú és gyors helyes válasznál eltérő numerikus ms',()=>{
  const wrong=nextHannaReview({correct:false,rtMs:null,hintLevel:0,previousIntervalMs:600_000});
  const slow=nextHannaReview({correct:true,rtMs:6000,hintLevel:0,previousIntervalMs:600_000});
  const ordinary=nextHannaReview({correct:true,rtMs:3000,hintLevel:0,previousIntervalMs:600_000});
  const fast=nextHannaReview({correct:true,rtMs:900,hintLevel:0,previousIntervalMs:600_000});
  assert.deepEqual([wrong,slow,ordinary,fast],[600_000,3_600_000,3_600_000,86_400_000]);assert.equal(typeof fast,'number');assert.equal(nextHannaReview({correct:true,rtMs:500,hintLevel:4,previousIntervalMs:86_400_000}),600_000);
});

test('a kategória-visszahívás halmazként, a Számszörny számjegyenként és percenként pontoz',()=>{
  const randomSettings={activity:'random',itemCount:10},randomPlan=generateHannaSession(randomSettings,SEED),multi=randomPlan.recallTrials.find((trial)=>trial.kind==='multi'),randomAnswer=correctAnswer(randomPlan);const multiResponse=randomAnswer.responses.find((entry)=>entry.trialId===multi.id);multiResponse.value.reverse();const randomScore=scoreHannaAttempt(randomSettings,SEED,randomAnswer,{serverDurationMs:60_000});assert.equal(randomScore.percent,100);assert.equal(randomScore.metrics.orderAccuracy,null);
  const numberSettings={activity:'numbers',itemCount:16},numberPlan=generateHannaSession(numberSettings,SEED),numberAnswer=correctAnswer(numberPlan);numberAnswer.responses[0].value=`9${numberAnswer.responses[0].value.slice(1)}`;numberAnswer.encodingDurationMs=30_000;const numberScore=scoreHannaAttempt(numberSettings,SEED,numberAnswer,{serverDurationMs:60_000});assert.equal(numberScore.correct,15);assert.equal(numberScore.total,16);assert.deepEqual(numberScore.metrics.subscales.number,{digitsCorrect:15,digitsTotal:16,digitsPerMinute:30});assert.equal(numberScore.metrics.adaptation.nextItemCount,20);
  const weak=wrongAnswer(numberPlan);weak.responses[0].value=[...numberPlan.recallTrials[0].expected].map((digit)=>String((Number(digit)+1)%10)).join('');weak.encodingDurationMs=30_000;const weakScore=scoreHannaAttempt(numberSettings,SEED,weak,{serverDurationMs:60_000});assert.equal(weakScore.metrics.adaptation.nextItemCount,16);
});

test('a Számszörny rövid és üres számjegyválaszt részpontoz, a túl hosszút vagy idegen karaktert elutasítja',()=>{
  const settings={activity:'numbers',itemCount:16},plan=generateHannaSession(settings,61),expected=plan.recallTrials[0].expected;
  const short=correctAnswer(plan);short.responses[0].value=expected.slice(0,14);const shortScore=scoreHannaAttempt(settings,61,short,{serverDurationMs:60_000});assert.equal(shortScore.correct,14);assert.equal(shortScore.total,16);assert.equal(shortScore.details.at(-1).actual,'—');
  const empty=correctAnswer(plan);empty.responses[0].value='';const emptyScore=scoreHannaAttempt(settings,61,empty,{serverDurationMs:60_000});assert.equal(emptyScore.correct,0);assert.equal(emptyScore.total,16);
  const long=correctAnswer(plan);long.responses[0].value=`${expected}1`;assert.throws(()=>scoreHannaAttempt(settings,61,long,{serverDurationMs:60_000}),/legfeljebb 16 számjegy/);
  const foreign=correctAnswer(plan);foreign.responses[0].value='123 45';assert.throws(()=>scoreHannaAttempt(settings,61,foreign,{serverDurationMs:60_000}),/legfeljebb 16 számjegy/);
});

test('a Szövegépítő külön azonnali és javítás utáni alskálát ad',()=>{
  const settings={activity:'text',recallMode:'meaning'},plan=generateHannaSession(settings,3),answer=correctAnswer(plan);answer.responses[1].value='egyik kulcsgondolat sem szerepel';const score=scoreHannaAttempt(settings,3,answer,{serverDurationMs:60_000});
  assert.equal(score.metrics.subscales.textImmediate.accuracy,1);assert.equal(score.metrics.subscales.textDelayed.accuracy,0);assert.equal(score.metrics.subscales.textImmediate.total,3);assert.equal(score.metrics.subscales.textDelayed.total,3);
});

test('a lista review-kártyái elemenkéntiek, és a Szövegépítő két aktív felidézést ad',()=>{
  const chain=generateHannaSession({activity:'chain',itemCount:8},19);assert.equal(chain.reviewItems.length,8);assert.deepEqual(chain.reviewItems.map((item)=>item.expected),chain.recallTrials[0].expected);assert.equal(new Set(chain.reviewItems.map((item)=>item.id)).size,8);
  const baseline=generateHannaSession({activity:'baseline',itemCount:5},19);assert.equal(baseline.reviewItems.length,15);assert.equal(new Set(baseline.reviewItems.map((item)=>`${item.content[0].id}|${item.prompt}|${item.expected}`)).size,15);assert.ok(baseline.reviewItems.every((item)=>item.id.includes('immediate')));
  const text=generateHannaSession({activity:'text',recallMode:'meaning'},19);assert.deepEqual(text.recallTrials.map((trial)=>trial.phase),['immediate','delayed']);assert.equal(text.reviewItems.length,3);
});

test('a multi kategória review-kártyája az eredeti lista konkrét helyére kérdez',()=>{
  const plan=generateHannaSession({activity:'random',itemCount:10},SEED),multi=plan.recallTrials.find((trial)=>trial.kind==='multi'),cards=plan.reviewItems.filter((item)=>item.id.startsWith(`review-${multi.id}-`));assert.equal(cards.length,multi.expected.length);
  for(const card of cards){const sourceId=card.content[0].id,position=plan.content.findIndex((item)=>item.id===sourceId)+1;assert.equal(card.prompt,`Mi volt az eredeti lista ${position}. helyén?`);assert.equal(card.expected,plan.content[position-1].label);}
});

test('az ordered review-kártya is az eredeti listahelyet nevezi meg fordított körben',()=>{
  const plan=generateHannaSession({activity:'chain',itemCount:8,recallMode:'reverse'},73);
  for(const card of plan.reviewItems){const position=plan.content.findIndex((item)=>item.id===card.content[0].id)+1;assert.equal(card.prompt,`Mi volt az eredeti lista ${position}. helyén?`);assert.equal(card.expected,plan.content[position-1].label);}
});

test('a beépített peg képe ugyanazt a horgot ábrázolja, mint a címke',()=>{
  const first=HANNA_PEGS.slice(0,5).map((item)=>[item.label,item.image]);assert.deepEqual(first,[['gyertya','🕯️'],['hattyú','🦢'],['háromágú villa','🔱'],['szék','🪑'],['kéz','✋']]);
});

test('a beépített peg-készlet ténylegesen 100 horgot és teljes 100-as kört támogat',()=>{
  assert.equal(HANNA_PEGS.length,100);assert.equal(new Set(HANNA_PEGS.map((entry)=>entry.number)).size,100);assert.equal(new Set(HANNA_PEGS.map((entry)=>entry.label)).size,100);assert.ok(HANNA_PEGS.every((entry,index)=>entry.number===index+1&&entry.image));
  assert.equal(normalizeHannaSettings({activity:'peg',itemCount:100}).itemCount,100);const plan=generateHannaSession({activity:'peg',itemCount:100},100);assert.equal(plan.content.length,100);assert.equal(plan.training.items.length,20);assert.equal(plan.training.trials.length,40);
});

test('a peg és a saját palota helye nem árulja el a hozzá kötött tárgyat',()=>{
  for(const itemCount of [30,100])for(let seed=0;seed<100;seed+=1){
    const plan=generateHannaSession({activity:'peg',itemCount},seed);assert.ok(plan.content.every((item)=>plain(item.label)!==plain(item.meaning)),`peg ${itemCount}, seed ${seed}`);
  }
  const labels=HANNA_OBJECTS.slice(0,5).map((item)=>item.label),palace={id:'palota-utkozes',kind:'palace',title:'Tárgynevű helyek',revision:1,ready:true,data:{locations:labels.map((name,index)=>({id:`hely-${index}`,name,description:`A ${name} nevű stabil hely.`}))}};
  for(const activity of ['loci','palace'])for(let seed=0;seed<100;seed+=1){
    const plan=generateHannaSession({activity,itemCount:5,resourceIds:['palota-utkozes'],resourceSnapshot:[palace]},seed);assert.ok(plan.content.every((item)=>plain(item.label)!==plain(item.location)),`${activity}, seed ${seed}`);
  }
});

test('a peg generálás a feloldott pillanatkép tényleges horgainak számát ellenőrzi',()=>{
  const wrongKind={id:'nem-peg',kind:'material',title:'Húsz helyett idegen erőforrás',revision:1,ready:true,data:{items:[{id:'x',label:'X'}]}};
  assert.throws(()=>generateHannaSession({activity:'peg',itemCount:100,resourceIds:['nem-peg'],resourceSnapshot:[wrongKind]},8),/nem tartalmaz elég horgot/);
  const shortPeg={id:'rovid-peg',kind:'peg',title:'Rövid',revision:1,ready:true,data:{entries:Array.from({length:20},(_,index)=>({number:index+1,label:`Horog ${index+1}`}))}};
  assert.throws(()=>generateHannaSession({activity:'peg',itemCount:100,resourceIds:['rovid-peg'],resourceSnapshot:[shortPeg]},8),/nem tartalmaz elég horgot/);
});

test('a Random Recall minden kérdése létező elemre mutat és kezeli a lista széleit',()=>{
  for(let seed=0;seed<100;seed+=1){const plan=generateHannaSession({activity:'random',itemCount:5},seed),ids=new Set(plan.content.map((item)=>item.id)),labels=new Set(plan.content.map((item)=>item.label));for(const trial of plan.recallTrials){assert.ok(trial.itemIds.every((id)=>ids.has(id)));const expected=Array.isArray(trial.expected)?trial.expected:[trial.expected];assert.ok(expected.every((value)=>labels.has(value)));if(trial.choices)assert.ok(expected.every((value)=>trial.choices.some((choice)=>choice.value===value)));}}
});

test('üres, dupla, idegen, határon kívüli és túl nagy válasz elutasított',()=>{
  const settings={activity:'chain'},plan=generateHannaSession(settings,10),base=correctAnswer(plan),trial=plan.recallTrials[0];
  const empty=clone(base);empty.responses[0].value=[];assert.throws(()=>scoreHannaAttempt(settings,10,empty),/nem lehet üres|1–100/);
  const duplicateTrial=clone(base);duplicateTrial.responses.push(clone(duplicateTrial.responses[0]));assert.throws(()=>scoreHannaAttempt(settings,10,duplicateTrial),/pontosan egyszer/);
  const duplicateValue=clone(base);duplicateValue.responses[0].value[1]=duplicateValue.responses[0].value[0];assert.throws(()=>scoreHannaAttempt(settings,10,duplicateValue),/dupla/);
  const foreignTrial=clone(base);foreignTrial.responses[0].trialId='foreign';assert.throws(()=>scoreHannaAttempt(settings,10,foreignTrial),/idegen trialId/);
  const foreignValue=clone(base);foreignValue.responses[0].value[0]='99. elem';assert.throws(()=>scoreHannaAttempt(settings,10,foreignValue),/idegen.*határon kívüli/);
  const tooLarge=clone(base);tooLarge.events=[{eventId:'x',type:'phase',atMs:1,value:'x'.repeat(1_000_001)}];assert.throws(()=>scoreHannaAttempt(settings,10,tooLarge),/1 MB/);
  const forged=clone(base);forged.score={correct:999};assert.throws(()=>scoreHannaAttempt(settings,10,forged),/ismeretlen mezőt/);
  const badHint=clone(base);badHint.responses[0].hintLevel=5;assert.throws(()=>scoreHannaAttempt(settings,10,badHint),/0 és 4/);
  const overTime=clone(base);overTime.responses[0].rtMs=61_000;assert.throws(()=>scoreHannaAttempt(settings,10,overTime,{serverDurationMs:60_000}),/0 és 60000/);
  assert.equal(trial.kind,'ordered');
});

test('az eseményazonosítók egyediek, az eseménytípus és trialId ellenőrzött',()=>{
  const settings={activity:'faces'},plan=generateHannaSession(settings,11),answer=correctAnswer(plan);answer.events=[{eventId:'e1',type:'hint',atMs:10,trialId:plan.recallTrials[0].id},{eventId:'e1',type:'hint',atMs:20,trialId:plan.recallTrials[0].id}];assert.throws(()=>scoreHannaAttempt(settings,11,answer),/eventId/);
  answer.events=[{eventId:'e2',type:'response',atMs:10}];assert.throws(()=>scoreHannaAttempt(settings,11,answer),/nem támogatott/);
  answer.events=[{eventId:'e3',type:'hint',atMs:10,trialId:'idegen'}];assert.throws(()=>scoreHannaAttempt(settings,11,answer),/idegen trialId/);
});

test('a normál kör reviewItems azonosítói stabilak és a snapshot helyes választ őriz',()=>{
  const first=generateHannaSession({activity:'association'},44),second=generateHannaSession({activity:'association'},44);
  assert.deepEqual(first.reviewItems,second.reviewItems);assert.ok(first.reviewItems.every((item,index)=>item.id===`review-${first.recallTrials[index].id}`));assert.deepEqual(first.reviewItems.map((item)=>item.expected),first.recallTrials.map((trial)=>trial.expected));
});
