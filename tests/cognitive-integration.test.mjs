import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {startServer} from '../server/index.js';
import {createPglitePool} from '../server/testing/pglite-pool.js';
import {generateCognitiveAssessment} from '../dist/cognitive/engine.js';

const ORIGIN='http://cognitive-test.local';

function uuid(index){return `10000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`;}
function raw(events){return {version:1,startedAt:'2026-09-11T08:00:00.000Z',completedAt:'2026-09-11T08:20:00.000Z',events,device:{pointer:'fine',viewportBucket:'large'}};}
function event(trial,value,index){return {eventId:uuid(index),type:'response',trialIndex:trial.trialIndex,atMs:trial.onsetMs+10,value};}

function client(base){
  let cookie='',csrf='';
  return {async req(path,method='GET',body){
    const response=await fetch(base+path,{method,headers:{origin:ORIGIN,...(cookie?{cookie}:{}),...(!['GET','HEAD'].includes(method)&&csrf?{'x-csrf-token':csrf}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();
    const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];
    if(data.csrfToken)csrf=data.csrfToken;
    return {status:response.status,json:data};
  }};
}

test('cognitive school flow keeps private answers server-side, enforces delays, persists metrics and separates progress',async()=>{
  const db=new PGlite(),pool=createPglitePool(db);
  const running=await startServer({pool,host:'127.0.0.1',port:0,config:{bootstrapToken:'cognitive-bootstrap-token',allowedOrigins:[ORIGIN],secureCookies:false}});
  const base=`http://127.0.0.1:${running.server.address().port}`;
  const teacher=client(base),student=client(base);
  try{
    let reply=await teacher.req('/api/auth/setup','POST',{token:'cognitive-bootstrap-token',username:'cognitive-teacher',displayName:'Kognitív teszttanár',password:'hosszú-biztonságos-jelszó'});
    assert.equal(reply.status,201);
    reply=await teacher.req('/api/teacher/students','POST',{username:'cognitive-student',displayName:'Kognitív teszttanuló',ageYears:11});
    assert.equal(reply.status,201);const studentId=reply.json.student.id,activationToken=reply.json.activationToken;
    assert.equal(reply.json.student.ageYears,11);
    reply=await teacher.req(`/api/teacher/students/${studentId}`,'PATCH',{ageYears:12});
    assert.equal(reply.status,200);assert.equal(reply.json.student.ageYears,12);
    reply=await student.req('/api/auth/activate','POST',{token:activationToken,password:'másik-hosszú-biztonságos-jelszó'});
    assert.equal(reply.status,200);assert.equal(reply.json.user.ageYears,12);

    reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'spatial-span',settings:{minLength:2,maxLength:2,inputModality:'mouse'}});
    assert.equal(reply.status,201);const spatialAttempt=reply.json.attempt;
    const spatialPlan=generateCognitiveAssessment('spatial-span',spatialAttempt.settings,spatialAttempt.seed);
    const spatialEvents=spatialPlan.trials.map((trial,index)=>event(trial,trial.stimulus.direction==='forward'?trial.stimulus.sequence:[...trial.stimulus.sequence].reverse(),index));
    reply=await student.req(`/api/attempts/${spatialAttempt.id}/submit`,'POST',{answer:raw(spatialEvents)});
    assert.equal(reply.status,200);assert.equal(reply.json.result.percent,100);assert.equal(reply.json.result.stars,null);
    assert.equal(reply.json.result.starBasis,'cognitive-no-stars');assert.match(reply.json.result.metrics.comparabilityKey,/^[0-9a-f]{64}$/);

    reply=await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Saját aktív felidézés',studentIds:[studentId],steps:[{gameId:'active-recall',repetitions:2,settings:{mode:'assessment',reviewDelayMinutes:1,items:[{prompt:'Mi Magyarország fővárosa?',studyText:'Budapest Magyarország fővárosa.',acceptedAnswers:['Budapest']},{prompt:'Mennyi hét szorozva nyolccal?',studyText:'7 × 8 = 56.',acceptedAnswers:['56','ötvenhat']}]}}]});
    assert.equal(reply.status,201);const step=reply.json.assignment.steps[0];
    assert.equal(JSON.stringify(step).includes('acceptedAnswers'),false);assert.equal(JSON.stringify(step).includes('ötvenhat'),false);
    const stored=await pool.query('SELECT settings,private_settings FROM assignment_steps WHERE id=$1',[step.id]);
    assert.equal(JSON.stringify(stored.rows[0].settings).includes('ötvenhat'),false);assert.equal(stored.rows[0].private_settings.acceptedAnswers[1].answers[1],'ötvenhat');

    reply=await student.req('/api/student/assignments');
    const visibleStep=reply.json.assignments[0].steps[0];assert.equal(JSON.stringify(visibleStep).includes('acceptedAnswers'),false);
    reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:step.id});
    assert.equal(reply.status,201);const firstRecall=reply.json.attempt;
    const recallPlan=generateCognitiveAssessment('active-recall',firstRecall.settings,firstRecall.seed);
    const recallAnswer=raw(recallPlan.trials.map((trial,index)=>event(trial,index===0?'Budapest':'ÖTVENHAT',index)));
    reply=await student.req(`/api/attempts/${firstRecall.id}/submit`,'POST',{answer:recallAnswer});
    assert.equal(reply.status,200);assert.equal(reply.json.result.percent,100);assert.equal(JSON.stringify(reply.json.result).includes('ötvenhat'),false);
    reply=await student.req(`/api/attempts/${firstRecall.id}/submit`,'POST',{answer:recallAnswer});assert.equal(reply.status,200);assert.equal(reply.json.duplicate,true);
    reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:step.id});assert.equal(reply.status,409);assert.equal(reply.json.error.code,'REVIEW_NOT_DUE');
    await pool.query("UPDATE results SET created_at=now() - interval '2 minutes' WHERE assignment_step_id=$1",[step.id]);
    reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:step.id});
    assert.equal(reply.status,201);const reviewAttempt=reply.json.attempt;assert.equal(reviewAttempt.settings.reviewRound,'review');assert.ok(reviewAttempt.availableAt);
    const reviewPlan=generateCognitiveAssessment('active-recall',reviewAttempt.settings,reviewAttempt.seed);
    reply=await student.req(`/api/attempts/${reviewAttempt.id}/submit`,'POST',{answer:raw(reviewPlan.trials.map((trial,index)=>event(trial,index===0?'Budapest':'56',index)))});
    assert.equal(reply.status,200);assert.equal(reply.json.result.metrics.subscales.reviewRound,'review');

    reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'picture-place',settings:{itemCount:4,gridSize:6}});
    assert.equal(reply.status,201);
    const pictureAttempt=reply.json.attempt;
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/submit`,'POST',{answer:raw([])});
    assert.equal(reply.status,409);assert.equal(reply.json.error.code,'DELAY_NOT_STARTED');
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/delay-ready`,'POST',{});
    assert.equal(reply.status,400);assert.equal(reply.json.error.code,'INVALID_DELAY_CHECKPOINT');
    const picturePlan=generateCognitiveAssessment('picture-place',pictureAttempt.settings,pictureAttempt.seed);
    const mapping=new Map(picturePlan.trials.find(trial=>trial.kind==='association-study').stimulus.associations.map(item=>[item.itemId,item.cell]));
    const checkpointEvents=picturePlan.trials.filter(trial=>trial.kind==='place-recall'&&trial.phase!=='delayed').map((trial,index)=>event(trial,mapping.get(trial.stimulus.itemId),index));
    const checkpointAnswer=raw(checkpointEvents);
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/delay-ready`,'POST',{answer:checkpointAnswer});
    assert.equal(reply.status,409);assert.equal(reply.json.error.code,'DELAY_CHECKPOINT_TOO_EARLY');
    await pool.query("UPDATE attempts SET created_at=now() - interval '30 seconds' WHERE id=$1",[pictureAttempt.id]);
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/delay-ready`,'POST',{answer:checkpointAnswer});
    assert.equal(reply.status,200);const delayReadyAt=reply.json.availableAt;assert.ok(Date.parse(delayReadyAt)>Date.now());
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/delay-ready`,'POST',{answer:checkpointAnswer});
    assert.equal(reply.status,200);assert.equal(reply.json.availableAt,delayReadyAt,'delay gate must be idempotent and never move earlier');
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/submit`,'POST',{answer:raw([])});
    assert.equal(reply.status,409);assert.equal(reply.json.error.code,'DELAY_NOT_COMPLETE');
    const restartedCheckpoint=raw([{eventId:uuid(100),type:'recovery',atMs:0,value:'reload'},...checkpointEvents]);
    await pool.query("UPDATE attempts SET available_at=now() - interval '1 second' WHERE id=$1",[pictureAttempt.id]);
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/delay-ready`,'POST',{answer:restartedCheckpoint});
    assert.equal(reply.status,200);assert.ok(Date.parse(reply.json.availableAt)>Date.now(),'restart checkpoint must begin a fresh delay');
    await pool.query("UPDATE attempts SET available_at=now() - interval '1 second',delay_checkpoint_at=now() - interval '2 minutes',created_at=now() - interval '2 minutes' WHERE id=$1",[pictureAttempt.id]);
    reply=await student.req(`/api/attempts/${pictureAttempt.id}/submit`,'POST',{answer:raw([])});
    assert.equal(reply.status,200);assert.equal(reply.json.result.metrics.familyId,'picture-place');

    reply=await student.req('/api/progress');assert.equal(reply.status,200);assert.equal(reply.json.cognitiveRounds,4);assert.equal(reply.json.legacyRounds,0);assert.equal(reply.json.stars,0);
    reply=await teacher.req('/api/teacher/results');assert.equal(reply.status,200);assert.equal(reply.json.results.length,4);
  }finally{await running.close();await db.close();}
});
