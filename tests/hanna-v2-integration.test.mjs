import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {startServer} from '../server/index.js';
import {createPglitePool} from '../server/testing/pglite-pool.js';
import {generateHannaSession,createPalaceReadinessTrials} from '../dist/hanna/engine.js';
import * as v2Engine from '../dist/hanna/engine.js';
import {prepareHannaReview,splitHannaPrivateSettings} from '../server/hanna.js';

const ORIGIN='http://hanna-v2-test.local';
test('review raw own stories remain private while safe recall cues are public',()=>{
  const review={id:'own-card',hints:['hely','[…] hangosan fut','kép'],encoding:[{stepId:'own-step',association:'A teljes válasz titkos.',checks:['mozog']}],expected:'titkos'};
  const split=splitHannaPrivateSettings({resourceSnapshot:[],reviewSnapshot:[review]});
  assert.equal(split.settings.reviewSnapshot[0].encoding,undefined);
  assert.deepEqual(split.privateSettings.hannaReviewSnapshot[0].encoding,review.encoding);
  assert.deepEqual(split.settings.reviewSnapshot[0].hints,review.hints);
});
const must=(reply,status)=>{assert.equal(reply.status,status,JSON.stringify(reply.json));return reply.json;};
function client(base){let cookie='',csrf='';return{async req(path,method='GET',body){const response=await fetch(base+path,{method,headers:{origin:ORIGIN,...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});const json=await response.json();if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];if(json.csrfToken)csrf=json.csrfToken;return{status:response.status,json};}};}
function fullAnswer(plan){
  const answer={version:2,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),events:[],encoding:[],training:(plan.training?.trials||[]).map(trial=>({trialId:trial.id,value:trial.expected,rtMs:500})),responses:plan.recallTrials.map(trial=>({trialId:trial.id,value:trial.rubric?.length?trial.rubric.map(row=>row.accepted?.[0]||row.label).join('. '):trial.expected,rtMs:500,hintLevel:0})),encodingDurationMs:0,delayDurationMs:plan.flow.filter(row=>row.phase==='distractor').reduce((n,row)=>n+row.durationMs,0)};
  for(const step of plan.encodingSteps){if(step.kind==='route-tour')continue;if(step.kind==='association-sprint'&&step.rounds?.length){for(const round of step.rounds)answer.encoding.push({stepId:step.id,roundId:round.id,choiceId:round.preferredChoiceId,association:'QA: a két tárgy közvetlenül kölcsönhatásba lép.',rtMs:1000});}else answer.encoding.push({stepId:step.id,association:'QA saját történet, megőrzött kép.',...(step.strategyOptions?.length?{strategy:step.strategyOptions[0].id}:{})});}
  return answer;
}
async function passGates(pool,actor,attempt,plan,answer){
  await pool.query("UPDATE attempts SET created_at=now()-interval '40 minutes' WHERE id=$1",[attempt.id]);
  for(let i=0;i<plan.flow.length;i++){
    const gate=plan.flow[i];if(gate.phase!=='distractor')continue;
    const prefix=plan.flow.slice(0,i),stepIds=new Set(prefix.flatMap(row=>row.stepIds||[])),trialIds=new Set(prefix.filter(row=>row.phase==='recall').flatMap(row=>row.trialIds||[]));
    const checkpoint={...answer,encoding:answer.encoding.filter(row=>stepIds.has(row.stepId)),responses:answer.responses.filter(row=>trialIds.has(row.trialId)),training:prefix.some(row=>row.phase==='training')?answer.training:[]};
    const first=must(await actor.req(`/api/attempts/${attempt.id}/hanna-ready`,'POST',{gateId:gate.gateId,answer:checkpoint}),200);
    assert.equal(must(await actor.req(`/api/attempts/${attempt.id}/hanna-ready`,'POST',{gateId:gate.gateId,answer:checkpoint}),200).availableAt,first.availableAt);
    assert.equal((await actor.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer})).status,409,'real gate refuses early completion');
    // Explicit controlled DB time fixture, not a real elapsed delay or human UAT.
    await pool.query("UPDATE hanna_attempt_gates SET available_at=now()-interval '1 second' WHERE attempt_id=$1 AND gate_id=$2",[attempt.id,gate.gateId]);
    await pool.query("UPDATE attempts SET available_at=now()-interval '1 second' WHERE id=$1",[attempt.id]);
  }
}

test('V2 server flows: original families, same-content random, mastery, own resources, teacher assignment, reread, privacy and idempotency',async()=>{
  const db=new PGlite(),pool=createPglitePool(db),running=await startServer({pool,host:'127.0.0.1',port:0,config:{bootstrapToken:'v2-only-test',allowedOrigins:[ORIGIN],secureCookies:false}});
  const base=`http://127.0.0.1:${running.server.address().port}`,teacher=client(base),student=client(base),other=client(base);
  try{
    must(await teacher.req('/api/auth/setup','POST',{token:'v2-only-test',username:'hanna-v2-qa-teacher',displayName:'V2 QA tanár',password:'v2-isolated-password'}),201);
    const child=must(await teacher.req('/api/teacher/students','POST',{username:'hanna-v2-qa-student',displayName:'V2 QA tanuló'}),201),second=must(await teacher.req('/api/teacher/students','POST',{username:'hanna-v2-qa-other',displayName:'V2 QA másik'}),201);
    must(await student.req('/api/auth/activate','POST',{token:child.activationToken,password:'v2-isolated-password'}),200);
    must(await other.req('/api/auth/activate','POST',{token:second.activationToken,password:'v2-isolated-password'}),200);
    const create=async(settings,actor=student)=>must(await actor.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{hannaVersion:2,adaptive:false,delayMs:10000,...settings}}),201).attempt;
    const complete=async(attempt,actor=student,customize=()=>{})=>{const plan=generateHannaSession(attempt.settings,attempt.seed),answer=fullAnswer(plan);customize(answer,plan);await passGates(pool,actor,attempt,plan,answer);const r=must(await actor.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer}),200);const duplicate=must(await actor.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer}),200);assert.equal(duplicate.duplicate,true);assert.equal(duplicate.result.id,r.result.id);return{plan,answer,result:r.result};};
    const missingSource=await other.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{hannaVersion:2,activity:'random'}});assert.equal(missingSource.status,404,JSON.stringify(missingSource.json));
    const oldMaterial=must(await student.req('/api/hanna/resources','POST',{kind:'material',title:'QA régi rubrika',data:{text:'A Nap felmelegíti a vizet.',rubric:[{id:'heat',label:'Hőforrás',accepted:['a nap felmelegíti a vizet']}]}}),201).resource;
    await pool.query('UPDATE hanna_resources SET data=$2 WHERE id=$1',[oldMaterial.id,JSON.stringify({...oldMaterial.data,rubric:[{id:'heat',label:'Felmelegíti a vizet a Nap',accepted:['a nap felmelegíti a vizet']}]})]);
    const oldMaterialReply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{hannaVersion:2,activity:'text',resourceIds:[oldMaterial.id]}});
    assert.equal(oldMaterialReply.status,400);assert.equal(oldMaterialReply.json.error.code,'INVALID_RESOURCE');assert.match(oldMaterialReply.json.error.message,/QA régi rubrika/);

    const defaultVersionReply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'text',resourceIds:[oldMaterial.id]}});
    assert.equal(defaultVersionReply.status,400);assert.equal(defaultVersionReply.json.error.code,'INVALID_RESOURCE');assert.match(defaultVersionReply.json.error.message,/QA régi rubrika/);

    const locations=['QA_PRIVÁT_AJTÓ','Előszoba','Kanapé','Asztal','Ablak'].map((name,i)=>({id:`loc-${i}`,name,description:`Saját hely ${i+1}`}));
    let palace=must(await student.req('/api/hanna/resources','POST',{kind:'palace',title:'QA saját otthon',data:{locations}}),201).resource;
    const readiness=createPalaceReadinessTrials(palace);
    assert.equal(readiness.trials.length,13);
    palace=must(await student.req(`/api/hanna/resources/${palace.id}/readiness`,'POST',{version:2,revision:palace.revision,answers:readiness.trials.map(trial=>({trialId:trial.id,value:trial.expected}))}),200).resource;
    assert.equal(palace.ready,true);
    const peg=must(await student.req('/api/hanna/resources','POST',{kind:'peg',title:'QA száz horog',data:{entries:Array.from({length:100},(_,i)=>({number:i+1,label:`Saját horog ${i+1}`}))}}),201).resource;
    const ownChain=await complete(await create({activity:'chain',itemCount:5,difficulty:'hard'}));
    assert.ok(ownChain.plan.flow.filter(row=>row.phase==='recall').length>=3);
    const randomAttempt=await create({activity:'random',sourceResultId:ownChain.result.id,itemCount:5});
    assert.deepEqual(randomAttempt.settings.learnedSnapshot.content,ownChain.plan.content,'exact learned material');
    assert.ok(randomAttempt.settings.learnedSnapshot.encoding.some(row=>row.association?.includes('QA saját történet')));
    const random=await complete(randomAttempt);
    assert.ok(random.plan.recallTrials.some(row=>['before','after','positions'].includes(row.questionType)));
    assert.equal((await other.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{hannaVersion:2,activity:'random',sourceResultId:ownChain.result.id}})).status,404,'other user cannot read remembered content');
    const results=[ownChain.result,random.result];
    const activities=[['baseline',3],['association',4],['loci',5],['palace',5],['peg',100],['faces',20],['keyword',5],['major',10],['numbers',8],['text',1],['concept',3],['boss',4]];
    for(const [activity,itemCount]of activities){const attempt=await create({activity,itemCount,...(activity==='palace'?{resourceIds:[palace.id]}:{}),...(activity==='peg'?{resourceIds:[peg.id],trainingSize:10}:{}),...(activity==='faces'?{difficulty:'hard'}:{})});const played=await complete(attempt);assert.equal(played.result.metrics.schemaVersion,2);assert.equal(played.result.metrics.activity,activity);assert.ok(Number.isFinite(played.result.percent));results.push(played.result);}
    const sprint=await complete(await create({activity:'association',associationMs:30000}),student,(answer,plan)=>{
      const active=plan.encodingSteps.find(step=>step.kind==='association-sprint').rounds.slice(0,2).map(round=>round.id);
      answer.encoding=answer.encoding.filter(entry=>active.includes(entry.roundId)).map((entry,index)=>({...entry,association:`Egyedi jelenet ${index}: hangos dobbanás.`}));
      answer.responses=answer.responses.filter(entry=>active.includes(plan.recallTrials.find(trial=>trial.id===entry.trialId)?.activationRoundId));
    });
    assert.equal(sprint.result.total,2,'only two actually encoded pairs count');
    assert.equal(sprint.result.percent,100);
    const sprintCards=await pool.query('SELECT snapshot FROM hanna_review_cards WHERE source_result_id=$1',[sprint.result.id]);
    assert.equal(sprintCards.rowCount,2,'only encoded pairs get later review cards');
    assert.equal(new Set(sprintCards.rows.map(row=>row.snapshot.hints[1])).size,2,'each later card retains its own round story');
    assert.ok(sprintCards.rows.every(row=>sprint.answer.encoding.some(entry=>entry.roundId===row.snapshot.activationRoundId)));
    assert.ok(sprintCards.rows.every(row=>row.snapshot.encoding.length===1&&row.snapshot.encoding[0].roundId===row.snapshot.activationRoundId),'review card stores only its own processed round story');
    const laterSprint=await complete(await create({activity:'association',itemCount:6,associationMs:30000}),student,(answer,plan)=>{
      const active=plan.encodingSteps.find(step=>step.kind==='association-sprint').rounds.slice(1,7).map(round=>round.id);
      answer.encoding=answer.encoding.filter(entry=>active.includes(entry.roundId));answer.responses=answer.responses.filter(entry=>active.includes(plan.recallTrials.find(trial=>trial.id===entry.trialId)?.activationRoundId));
    });
    const laterCards=await pool.query('SELECT snapshot FROM hanna_review_cards WHERE source_result_id=$1',[laterSprint.result.id]);assert.equal(laterCards.rowCount,6,'later activated repeat still creates one card per actually learned connection');assert.ok(laterCards.rows.every(row=>laterSprint.answer.encoding.some(entry=>entry.roundId===row.snapshot.activationRoundId)));
    const ownBoss=await complete(await create({activity:'boss',itemCount:4,resourceIds:[palace.id,peg.id]}),student,(answer,plan)=>{
      const step=plan.encodingSteps.find(row=>row.strategyOptions?.some(option=>option.id==='loci'));
      assert.ok(step,'the saved own palace is offered as an actual strategy');
      answer.encoding.find(row=>row.stepId===step.id).strategy='loci';
    });
    const bossCards=await pool.query('SELECT snapshot FROM hanna_review_cards WHERE source_result_id=$1',[ownBoss.result.id]);
    assert.ok(bossCards.rows.some(row=>JSON.stringify(row.snapshot.hints).includes('QA_PRIVÁT_AJTÓ')),'chosen private palace remains the later recall cue');
    assert.equal(JSON.stringify(must(await teacher.req(`/api/teacher/results/${ownBoss.result.id}`),200)).includes('QA_PRIVÁT_AJTÓ'),false,'private strategy cues do not escape in teacher results');
    const mastered=await pool.query('SELECT * FROM hanna_training_mastery WHERE user_id=$1',[child.student.id]);assert.ok(mastered.rowCount>=10);
    const secondPeg=await create({activity:'peg',itemCount:100,trainingSize:10,resourceIds:[peg.id]});
    const secondPegPlan=generateHannaSession(secondPeg.settings,secondPeg.seed);
    assert.equal(secondPegPlan.training.coverage.requiredIds.length,100);
    assert.ok(secondPegPlan.training.coverage.masteredIds.length>=10,'previous ten persist across rounds');
    await complete(secondPeg);
    const assignment=must(await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'V2 kiosztott lánc',studentIds:[child.student.id],steps:[{gameId:'hanna-method',settings:{hannaVersion:2,activity:'chain',itemCount:5,delayMs:10000,adaptive:false},repetitions:1}]}),201).assignment;
    const assigned=must(await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:assignment.steps[0].id}),201).attempt;
    const assignedResult=(await complete(assigned)).result;
    assert.equal(must(await teacher.req(`/api/teacher/results/${assignedResult.id}`),200).result.metrics.schemaVersion,2);
    const privatePalace=results.find(row=>row.settings.activity==='palace');
    assert.equal(JSON.stringify(must(await teacher.req(`/api/teacher/results/${privatePalace.id}`),200)).includes('QA_PRIVÁT_AJTÓ'),false);
    const stored=await pool.query('SELECT snapshot FROM hanna_review_cards WHERE source_result_id=$1',[ownChain.result.id]);assert.ok(stored.rows.some(row=>JSON.stringify(row.snapshot).includes('QA saját történet')));
    await pool.query("UPDATE hanna_review_cards SET due_at=now()-interval '1 minute',learned_at=now()-interval '8 days' WHERE student_id=$1",[child.student.id]);
    await pool.query("INSERT INTO hanna_review_cards(id,student_id,source_result_id,source_item_id,source_activity,snapshot,learned_at,due_at) VALUES(gen_random_uuid(),$1,$2,'legacy-malformed','chain',$3,now()-interval '8 days',now()-interval '10 days')",[child.student.id,ownChain.result.id,JSON.stringify({prompt:'Incompatible historical card',expected:'',hints:[]})]);
    const compatible=await prepareHannaReview(pool,child.student.id,v2Engine.normalizeHannaSettings({activity:'review',itemCount:5}),v2Engine);assert.equal(compatible.reviewSnapshot.length,5);assert.ok(compatible.reviewSnapshot.every(row=>row.prompt!=='Incompatible historical card'));
    const incompatibleId=(await pool.query("SELECT id FROM hanna_review_cards WHERE student_id=$1 AND source_item_id='legacy-malformed'",[child.student.id])).rows[0].id;
    await assert.rejects(()=>prepareHannaReview(pool,child.student.id,v2Engine.normalizeHannaSettings({activity:'review',itemCount:5,reviewIds:[compatible.reviewSnapshot[0].id,incompatibleId]}),v2Engine),error=>error.code==='NO_COMPATIBLE_REVIEWS'&&error.message.includes(incompatibleId));
    const review=(await complete(await create({activity:'review',itemCount:5}))).result;assert.equal(review.metrics.activity,'review');assert.ok(review.metrics.retentionMs>=7*86400000);
    // The stored schedule must match the engine's cautious interpretation of implausible client speed.
    const fastReview=await create({activity:'review',itemCount:1});
    const fastReviewResult=(await complete(fastReview,student,answer=>{answer.responses.forEach(row=>row.rtMs=50);})).result;
    const fastOutcome=fastReviewResult.metrics.reviewOutcomes[0];
    const durableInterval=(await pool.query('SELECT interval_ms FROM hanna_review_cards WHERE id=$1',[fastOutcome.itemId])).rows[0].interval_ms;
    assert.equal(Number(durableInterval),fastOutcome.nextIntervalMs,'sub80ms review uses the same conservative durable interval as the reported engine result');
    assert.equal(fastOutcome.rtMs,null,'implausible timing is not persisted as fast mastery evidence');

    const before=must(await student.req('/api/hanna/dashboard'),200);assert.ok(before.learnedSources.length>0);
    assert.ok(before.results.every(row=>!row.settings.resourceSnapshot&&!row.settings.reviewSnapshot&&!row.settings.learnedSnapshot),'own result history omits repeated private snapshots');
    const faceResult=results.find(row=>row.settings.activity==='faces');
    assert.equal((await pool.query('SELECT id FROM hanna_review_cards WHERE source_result_id=$1',[faceResult.id])).rowCount,40,'twenty names and twenty personal facts persist as distinct cards');
    must(await student.req('/api/auth/logout','POST',{}),200);must(await student.req('/api/auth/login','POST',{username:'hanna-v2-qa-student',password:'v2-isolated-password'}),200);
    assert.equal(must(await student.req('/api/hanna/dashboard'),200).results.length,before.results.length);
    const dashboard=must(await teacher.req(`/api/hanna/dashboard?studentId=${child.student.id}`),200);assert.equal(JSON.stringify(dashboard).includes('QA_PRIVÁT_AJTÓ'),false);assert.equal(dashboard.learnedSources.length,0);
    assert.equal(must(await student.req('/api/student/assignments'),200).assignments.find(row=>row.id===assignment.id).completed,1);
  }finally{await running.close();await db.close();}
});
