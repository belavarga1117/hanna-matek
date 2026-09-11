import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createPglitePool} from '../server/testing/pglite-pool.js';
import {checkpointHannaV2,validateHannaV2Completion,hannaFlowPrefix,hannaMasteryScope} from '../server/hanna-v2.js';
import {hannaDailyPlan} from '../server/hanna.js';
import * as hannaEngine from '../dist/hanna/engine.js';

const plan={settings:{hannaVersion:2,delayMs:10000},encodingSteps:[{id:'learn'},{id:'restudy'}],recallTrials:[{id:'first'},{id:'second'}],training:null,flow:[
  {id:'study',phase:'encoding',stepIds:['learn']},{id:'delay1',phase:'distractor',gateId:'one',durationMs:10000},
  {id:'recall1',phase:'recall',trialIds:['first']},{id:'study2',phase:'encoding',stepIds:['restudy']},
  {id:'delay2',phase:'distractor',gateId:'two',durationMs:300000},{id:'recall2',phase:'recall',trialIds:['second']},
]};
const engine={generateHannaSession:()=>plan,scoreHannaAttempt:()=>({metrics:{}})};
const first={version:2,events:[],encoding:[{stepId:'learn',association:'Első kép'}],training:[],responses:[],encodingDurationMs:0};
const second={...first,encoding:[...first.encoding,{stepId:'restudy',association:'Újabb kapcsolat'}],responses:[{trialId:'first',value:'alma',rtMs:500,hintLevel:0}]};
const complete={...second,responses:[...second.responses,{trialId:'second',value:'alma',rtMs:500,hintLevel:0}]};

test('V2 flow hashes only completed phase prefix, preserving restudy while detecting rewritten memory and restart',()=>{
  assert.equal(hannaFlowPrefix(plan,'one',first).hash,hannaFlowPrefix(plan,'one',complete).hash);
  assert.notEqual(hannaFlowPrefix(plan,'two',second).hash,hannaFlowPrefix(plan,'two',{...second,responses:[{...second.responses[0],value:'más'}]}).hash);
  assert.notEqual(hannaFlowPrefix(plan,'one',first).hash,hannaFlowPrefix(plan,'one',{...first,events:[{type:'restart',eventId:'r'}]}).hash);
  assert.throws(()=>hannaFlowPrefix(plan,'one',complete,{checkpoint:true}),/lezárt/);
  assert.throws(()=>hannaFlowPrefix(plan,'foreign',first),/Ismeretlen/);
  assert.notEqual(hannaFlowPrefix(plan,'one',first).hash,hannaFlowPrefix(plan,'one',{...first,events:[{type:'show-answer',eventId:'global-help'}]}).hash,'global help cannot be removed after checkpoint');
  assert.throws(()=>hannaFlowPrefix(plan,'one',{...first,events:[{type:'show-answer',eventId:'future',trialId:'first'}]},{checkpoint:true}),/Későbbi/);
  assert.notEqual(hannaFlowPrefix(plan,'two',second).hash,hannaFlowPrefix(plan,'two',{...second,events:[{type:'hint',eventId:'old-help',trialId:'first',value:1}]}).hash,'earlier help cannot be erased after checkpoint');
});

test('V2 independent gates preserve retries, require previous real delay, and enforce 5-minute expert delay',async()=>{
  const db=new PGlite(),pool=createPglitePool(db),id='00000000-0000-4000-8000-000000000001';
  await pool.query('CREATE TABLE attempts(id uuid PRIMARY KEY,available_at timestamptz,delay_checkpoint_at timestamptz)');
  await pool.query('CREATE TABLE hanna_attempt_gates(attempt_id uuid,gate_id text,prefix_hash text,available_at timestamptz,checkpoint_at timestamptz,PRIMARY KEY(attempt_id,gate_id))');
  await pool.query('INSERT INTO attempts(id) VALUES($1)',[id]);
  const start=new Date('2026-09-11T12:00:00Z'),attempt={id,seed:4,settings:plan.settings,created_at:new Date(start-1000)};
  try{
    const one=await checkpointHannaV2(pool,attempt,{gateId:'one',answer:first},engine,start);
    assert.equal((await checkpointHannaV2(pool,attempt,{gateId:'one',answer:first},engine,new Date(start.valueOf()+5000))).availableAt,one.availableAt);
    await assert.rejects(()=>checkpointHannaV2(pool,attempt,{gateId:'two',answer:second},engine,new Date(start.valueOf()+9000)),/korábbi/);
    await assert.rejects(()=>validateHannaV2Completion(pool,attempt,complete,engine,new Date(start.valueOf()+11000)),/nem kezdődött/);
    const two=await checkpointHannaV2(pool,attempt,{gateId:'two',answer:second},engine,new Date(start.valueOf()+10000));
    assert.equal(Date.parse(two.availableAt),start.valueOf()+310000);
    await assert.rejects(()=>validateHannaV2Completion(pool,attempt,complete,engine,new Date(start.valueOf()+309999)),/nem telt le/);
    await validateHannaV2Completion(pool,attempt,complete,engine,new Date(start.valueOf()+310000));
    await assert.rejects(()=>validateHannaV2Completion(pool,attempt,{...complete,encoding:[{stepId:'learn',association:'átírt'},second.encoding[1]]},engine,new Date(start.valueOf()+310000)),/megváltozott/);
    const restart={...first,events:[{eventId:'r',type:'restart'}]};
    await checkpointHannaV2(pool,attempt,{gateId:'one',answer:restart},engine,new Date(start.valueOf()+311000));
    assert.equal((await pool.query('SELECT * FROM hanna_attempt_gates')).rows.length,1,'restart invalidates later gates');
  }finally{await db.close();}
});

test('mastery belongs to versioned own tools and daily random references today learned material',()=>{
  const settings={activity:'peg',trainingSize:100,resourceSnapshot:[{id:'a',kind:'peg',title:'Horgok',revision:1,data:{entries:Array.from({length:10},(_,i)=>({number:i+1,label:`Horog ${i+1}`}))}}]};
  assert.notEqual(hannaMasteryScope(settings,hannaEngine),hannaMasteryScope({...settings,resourceSnapshot:settings.resourceSnapshot.map(row=>({...row,revision:2}))},hannaEngine));
  const now=new Date('2026-09-11T12:00:00Z'),old={id:'old',settings:{hannaVersion:2,activity:'chain',itemCount:8},created_at:'2026-09-10T12:00:00Z'};
  assert.equal(hannaDailyPlan([old],0,now).find(row=>row.activity==='random').available,false);
  const fresh={...old,id:'today',created_at:now.toISOString()};
  assert.equal(hannaDailyPlan([fresh],0,now).find(row=>row.activity==='random').sourceResultId,'today');
  const methods=new Set([0,1,2].map(offset=>hannaDailyPlan([],0,new Date(now.valueOf()+offset*86400000))[1].activity));
  assert.equal(methods.size,3);
});


test('encoding and selected strategy are required before a Boss recall gate',async()=>{
  const boss={...plan,activity:'boss',encodingSteps:[{id:'learn',kind:'boss-section',strategyOptions:[{id:'loci'}]},{id:'restudy'}]};
  const bossEngine={...engine,generateHannaSession:()=>boss};
  const noDatabase={query(){throw new Error('Must reject before database access');}};
  const attempt={settings:plan.settings,seed:1,created_at:new Date()};
  await assert.rejects(()=>checkpointHannaV2(noDatabase,attempt,{gateId:'one',answer:{...first,encoding:[]}},bossEngine),error=>error.code==='ENCODING_NOT_READY');
  await assert.rejects(()=>checkpointHannaV2(noDatabase,attempt,{gateId:'one',answer:first},bossEngine),error=>error.code==='ENCODING_NOT_READY');
});

test('route-tour needs no invented association and failed training is rejected before a delay opens',async()=>{
 const route={...plan,activity:'loci',encodingSteps:[{id:'learn',kind:'route-tour'},{id:'restudy',kind:'loci-place'}]};
 const routeEngine={...engine,generateHannaSession:()=>route};
 let reached=false;const db={query(){reached=true;throw new Error('DB reached');}};
 const attempt={settings:plan.settings,seed:1,created_at:new Date()};
 await assert.rejects(()=>checkpointHannaV2(db,attempt,{gateId:'one',answer:{...first,encoding:[]}},routeEngine),/DB reached/);assert.equal(reached,true);
 const trained={...plan,training:{trials:[{id:'t',expected:'a'}]},flow:[{id:'train',phase:'training',trialIds:['t']},...plan.flow]};
 const failedEngine={...engine,generateHannaSession:()=>trained,scoreHannaAttempt:()=>({metrics:{subscales:{training:{passed:false}}}})};
 reached=false;await assert.rejects(()=>checkpointHannaV2(db,attempt,{gateId:'one',answer:{...first,training:[{trialId:'t',value:'a',rtMs:90}]}},failedEngine),error=>error.code==='TRAINING_NOT_READY');assert.equal(reached,false);
});
