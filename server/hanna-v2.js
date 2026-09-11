import {badRequest,conflict,notFound} from './errors.js';
import {sha256,stableStringify} from './security.js';

const learnedActivities=new Set(['chain','loci','palace','peg']);
const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu').replace(/[^a-z0-9]+/g,' ').trim();
export const isHannaV2=settings=>Number(settings?.hannaVersion)===2;

export const hannaMasteryScope = (settings, engine) => engine.hannaTrainingScope(settings);

export async function prepareHannaV2Context(db,studentId,settings,engine) {
  if(!isHannaV2(settings))return settings;
  const scopeKey=hannaMasteryScope(settings,engine);
  const mastery=scopeKey?await db.query('SELECT item_id,evidence FROM hanna_training_mastery WHERE user_id=$1 AND scope_key=$2',[studentId,scopeKey]):{rows:[]};
  let learnedSnapshot;
  let sourceResultId=settings.sourceResultId;
  if(settings.activity==='random') {
    const source=await db.query(`SELECT r.*,a.seed,a.private_settings FROM results r JOIN attempts a ON a.id=r.attempt_id
      WHERE r.student_id=$1 AND r.game_id='hanna-method' AND r.settings->>'hannaVersion'='2'
      AND r.settings->>'activity'=ANY($2::text[]) AND ($3::uuid IS NULL OR r.id=$3)
      ORDER BY r.created_at DESC LIMIT 20`,[studentId,[...learnedActivities],sourceResultId||null]);
    if(!source.rowCount)throw notFound('Előbb tanulj meg egy láncot, útvonalat vagy peg-listát. Innen ugyanazt az anyagot kérdezzük vissza.');
    for(const row of source.rows){
      try{
        const full={...row.settings,...(row.private_settings?.hannaResourceSnapshot?{resourceSnapshot:row.private_settings.hannaResourceSnapshot}:{})};
        const plan=engine.generateHannaSession(full,Number(row.seed));
        learnedSnapshot={...engine.createHannaLearnedSnapshot(plan,row.answer),learnedAt:new Date(row.created_at).toISOString()};
        sourceResultId=row.id;break;
      }catch{ /* Historical incomplete rounds are not usable learned sources. */ }
    }
    if(!learnedSnapshot)throw notFound('A kiválasztott korábbi körben nincs teljes tanult anyag. Előbb fejezz be egy új lánc-, útvonal- vagy peg-kört.');
  }
  return engine.normalizeHannaSettings({...settings,...(sourceResultId?{sourceResultId}:{}),...(learnedSnapshot?{learnedSnapshot}:{}),
    ...(scopeKey?{trainingMastery:{scopeKey,items:mastery.rows.map(row=>({itemId:row.item_id,...row.evidence}))}}:{})});
}

export function hannaFlowPrefix(plan,gateId,answer,{checkpoint=false}={}) {
  const gateIndex=plan.flow?.findIndex(step=>step.phase==='distractor'&&step.gateId===gateId)??-1;
  if(gateIndex<0)throw badRequest('Ismeretlen felidézési szakasz.', 'INVALID_DELAY_GATE');
  const prefix=plan.flow.slice(0,gateIndex),gate=plan.flow[gateIndex];
  const stepIds=new Set(prefix.flatMap(row=>row.stepIds||[]));
  const trialIds=new Set(prefix.filter(row=>row.phase==='recall').flatMap(row=>row.trialIds||[]));
  const trainingIds=new Set(prefix.filter(row=>row.phase==='training').flatMap(row=>row.trialIds||[]));
  const allTraining=prefix.some(row=>row.phase==='training'&&!row.trialIds?.length);
  if(allTraining)for(const trial of plan.training?.trials||[])trainingIds.add(trial.id);
  const eventTrialIds=new Set([...trialIds,...trainingIds]);
  if(!answer||answer.version!==2||!Array.isArray(answer.events)||!Array.isArray(answer.encoding)||!Array.isArray(answer.responses)||!Array.isArray(answer.training))throw badRequest('Érvénytelen V2 tanulási állapot.', 'INVALID_DELAY_CHECKPOINT');
  if(checkpoint&&(answer.encoding.some(row=>!stepIds.has(row.stepId))||answer.responses.some(row=>!trialIds.has(row.trialId))||answer.training.some(row=>!trainingIds.has(row.trialId))))throw badRequest('Csak a már lezárt szakaszok állapota küldhető.', 'INVALID_DELAY_CHECKPOINT');
  if(checkpoint&&answer.events.some(row=>row.trialId&&!eventTrialIds.has(row.trialId)))throw badRequest('Későbbi felidézés eseménye még nem küldhető.', 'INVALID_DELAY_CHECKPOINT');
  const encoding=answer.encoding.filter(row=>stepIds.has(row.stepId));
  const responses=answer.responses.filter(row=>trialIds.has(row.trialId));
  const training=answer.training.filter(row=>trainingIds.has(row.trialId));
  const identity={version:2,gateId,encoding,responses,training,restarts:answer.events.filter(row=>row.type==='restart'),recallHelp:answer.events.filter(row=>(!row.trialId||eventTrialIds.has(row.trialId))&&['hint','show-answer'].includes(row.type))};
  return {gate,gateIndex,prefix,identity,hash:sha256(stableStringify(identity)),trainingIds,stepIds,trialIds};
}

export async function checkpointHannaV2(db,attempt,body,engine,now=new Date()) {
  const plan=engine.generateHannaSession(attempt.settings,Number(attempt.seed));
  const prefix=hannaFlowPrefix(plan,body.gateId,body.answer,{checkpoint:true});
  if(['chain','loci','palace','peg','boss'].includes(plan.activity)){
    const completed=new Map(body.answer.encoding.map(row=>[row.stepId,row]));
    for(const step of plan.encodingSteps.filter(row=>prefix.stepIds.has(row.id)&&row.kind!=='route-tour')){
      const row=completed.get(step.id);
      if(!row?.association?.trim()||(step.strategyOptions?.length&&!step.strategyOptions.some(option=>option.id===row.strategy)))throw conflict('Minden tanulási kapcsolatot rögzíts, mielőtt felidézésre lépsz.', 'ENCODING_NOT_READY');
    }
  }
  const elapsed=now.valueOf()-new Date(attempt.created_at).valueOf();
  if(Number(body.answer.encodingDurationMs)>elapsed+1500)throw conflict('A tanulási idő még nem telhetett le.', 'INVALID_DELAY_CHECKPOINT');
  let checked;
  try {checked=engine.scoreHannaAttempt(attempt.settings,Number(attempt.seed),body.answer,{privateSettings:attempt.private_settings,serverDurationMs:elapsed});}
  catch(error){throw badRequest(error.message||'Érvénytelen tanulási állapot.', 'INVALID_DELAY_CHECKPOINT');}
  if(prefix.trainingIds.size&&!checked.metrics?.subscales?.training?.passed)throw conflict('Előbb gyakorold be a technika alapjait. A helyes felidézés és az előírt sebesség együtt számít.', 'TRAINING_NOT_READY');
  const existing=await db.query('SELECT * FROM hanna_attempt_gates WHERE attempt_id=$1 FOR UPDATE',[attempt.id]);
  const previousGates=prefix.prefix.filter(step=>step.phase==='distractor');
  for(const gate of previousGates) {
    const saved=existing.rows.find(row=>row.gate_id===gate.gateId);
    if(!saved||new Date(saved.available_at)>now||hannaFlowPrefix(plan,gate.gateId,body.answer).hash!==saved.prefix_hash)throw conflict('Egy korábbi tanulási szakaszt még teljesítened kell.', 'PREVIOUS_GATE_INCOMPLETE');
  }
  const saved=existing.rows.find(row=>row.gate_id===body.gateId);
  if(saved?.prefix_hash===prefix.hash)return {availableAt:new Date(saved.available_at).toISOString()};
  if(saved) {
    const laterIds=plan.flow.slice(prefix.gateIndex).filter(row=>row.phase==='distractor').map(row=>row.gateId);
    await db.query('DELETE FROM hanna_attempt_gates WHERE attempt_id=$1 AND gate_id=ANY($2::text[])',[attempt.id,laterIds]);
  }
  const duration=Number(prefix.gate.durationMs??attempt.settings.delayMs);
  if(!Number.isInteger(duration)||duration<10000||duration>300000)throw badRequest('Érvénytelen köztes idő.', 'INVALID_DELAY_GATE');
  const availableAt=new Date(now.valueOf()+duration);
  await db.query('INSERT INTO hanna_attempt_gates(attempt_id,gate_id,prefix_hash,available_at,checkpoint_at) VALUES($1,$2,$3,$4,$5)',[attempt.id,body.gateId,prefix.hash,availableAt,now]);
  await db.query('UPDATE attempts SET available_at=$2,delay_checkpoint_at=$3 WHERE id=$1',[attempt.id,availableAt,now]);
  return {availableAt:availableAt.toISOString()};
}

export async function validateHannaV2Completion(db,attempt,answer,engine,now=new Date()) {
  const plan=engine.generateHannaSession(attempt.settings,Number(attempt.seed));
  const gates=await db.query('SELECT * FROM hanna_attempt_gates WHERE attempt_id=$1',[attempt.id]);
  for(const gate of plan.flow.filter(step=>step.phase==='distractor')) {
    const saved=gates.rows.find(row=>row.gate_id===gate.gateId);
    if(!saved)throw conflict('A köztes szakasz még nem kezdődött el.', 'DELAY_NOT_STARTED');
    if(new Date(saved.available_at)>now)throw conflict('A köztes szakasz ideje még nem telt le.', 'DELAY_NOT_COMPLETE');
    if(hannaFlowPrefix(plan,gate.gateId,answer).hash!==saved.prefix_hash)throw conflict('Egy korábbi válasz vagy tanulási kép megváltozott. Kezdj teljes új kört.', 'DELAY_CHECKPOINT_CHANGED');
  }
}

export async function saveHannaV2Mastery(db,{attempt,answer,engine}) {
  if(!isHannaV2(attempt.settings))return;
  const plan=engine.generateHannaSession(attempt.settings,Number(attempt.seed));
  if(!plan.training)return;
  const responses=new Map((answer.training||[]).map(row=>[row.trialId,row]));
  const scopeKey=hannaMasteryScope(attempt.settings,engine);
  const previous=await db.query('SELECT item_id,evidence FROM hanna_training_mastery WHERE user_id=$1 AND scope_key=$2 FOR UPDATE',[attempt.student_id,scopeKey]);
  const map=new Map(previous.rows.map(row=>[row.item_id,row.evidence]));
  for(const trial of plan.training.trials||[]) {
    const response=responses.get(trial.id);
    if(!response||norm(response.value)!==norm(trial.expected))continue;
    const itemId=trial.itemId||trial.anchorId||trial.id;
    const evidence=map.get(itemId)||{directions:[],bestRtMs:null,mastered:false};
    const direction=trial.direction||trial.relation||'position';
    if(Number.isFinite(response.rtMs)&&response.rtMs>=100&&response.rtMs<(plan.training.threshold?.medianRtMs??Infinity)) {
      evidence.directions=[...new Set([...evidence.directions,direction])];
      evidence.bestRtMs=evidence.bestRtMs===null?response.rtMs:Math.min(evidence.bestRtMs,response.rtMs);
    }
    evidence.mastered=plan.training.kind==='peg'||plan.training.kind==='major'
      ?evidence.directions.includes('forward')&&evidence.directions.includes('reverse')
      :evidence.directions.includes('position');
    map.set(itemId,evidence);
  }
  for(const [itemId,evidence] of map)await db.query(`INSERT INTO hanna_training_mastery(user_id,scope_key,item_id,evidence) VALUES($1,$2,$3,$4)
    ON CONFLICT(user_id,scope_key,item_id) DO UPDATE SET evidence=EXCLUDED.evidence,updated_at=now()`,[attempt.student_id,scopeKey,itemId,JSON.stringify(evidence)]);
}

export function hannaLearnedSources(rows) {
  return rows.filter(row=>Number(row.settings?.hannaVersion)===2&&learnedActivities.has(row.settings.activity)).slice(0,20).map(row=>({resultId:row.id,activity:row.settings.activity,title:({chain:'Láncsztori',loci:'Memóriaútvonal',palace:'Saját palota',peg:'Peg Master'})[row.settings.activity],itemCount:row.settings.itemCount,createdAt:row.created_at}));
}

export function hannaMasterySummary(resources, rows, engine) {
  return resources.filter(resource=>resource.kind==='peg').map(resource=>{
    const scope=engine.hannaTrainingScope({activity:'peg',resourceSnapshot:[resource]});
    const matching=rows.filter(row=>row.scope_key===scope);
    const mastered=matching.filter(row=>row.evidence?.mastered===true&&row.evidence.directions?.includes('forward')&&row.evidence.directions?.includes('reverse')).length;
    const required=resource.data.entries.length;
    return {resourceId:resource.id,revision:resource.revision,kind:resource.kind,required,mastered:Math.min(required,mastered),tested:matching.length,ready:mastered>=required};
  });
}
