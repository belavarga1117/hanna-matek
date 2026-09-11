import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {startServer} from '../server/index.js';
import {createPglitePool} from '../server/testing/pglite-pool.js';
import {hannaDailyPlan} from '../server/hanna.js';
import {generateHannaSession} from '../dist/hanna/engine.js';

const ORIGIN='http://hanna-method-test.local';
function client(base) {
  let cookie='',csrf='';
  return {async req(path,method='GET',body,extra={}) {
    const response=await fetch(base+path,{method,headers:{origin:ORIGIN,...(cookie?{cookie}:{}),...(!['GET','HEAD'].includes(method)&&csrf?{'x-csrf-token':csrf}:{}),...(body===undefined?{}:{'content-type':'application/json'}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json();const setCookie=response.headers.get('set-cookie');if(setCookie)cookie=setCookie.split(';')[0];if(data.csrfToken)csrf=data.csrfToken;
    return {status:response.status,json:data};
  }};
}
const must=(reply,status)=>{assert.equal(reply.status,status,JSON.stringify(reply.json));return reply.json;};
function perfect(plan) {
  return {version:1,startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),events:[],encoding:[],
    responses:plan.recallTrials.map(trial=>({trialId:trial.id,value:trial.rubric?trial.rubric.map(row=>(row.accepted||[])[0]||row.label).join(". "):trial.expected,rtMs:500,hintLevel:0})),
    ...(plan.training?{training:plan.training.trials.map(trial=>({trialId:trial.id,value:trial.expected,rtMs:500}))}:{}),
    encodingDurationMs:0,delayDurationMs:plan.settings.delayMs||0,strategy:'chain'};
}
async function gate(pool,actor,attempt,answer) {
  if(attempt.settings.activity==='review'||!attempt.settings.delayMs)return;
  const plan=generateHannaSession(attempt.settings,attempt.seed);
  const immediate=new Set(plan.recallTrials.filter(trial=>trial.phase==='immediate').map(trial=>trial.id));
  const checkpoint={...answer,responses:answer.responses.filter(response=>immediate.has(response.trialId))};
  let reply=await actor.req(`/api/attempts/${attempt.id}/hanna-ready`,'POST',{answer:checkpoint});
  const first=must(reply,200).availableAt;
  reply=await actor.req(`/api/attempts/${attempt.id}/hanna-ready`,'POST',{answer:checkpoint});assert.equal(must(reply,200).availableAt,first,'checkpoint retry must not shorten or extend delay');
  reply=await actor.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer});assert.equal(reply.status,409,'server refuses early recall');
  await pool.query("UPDATE attempts SET created_at=now() - interval '20 minutes',delay_checkpoint_at=now() - interval '2 minutes',available_at=now() - interval '1 second' WHERE id=$1",[attempt.id]);
}

test('Hanna Method 15 activities, owned resources, assignment snapshots, delay gates, per-item reviews and duplicate submission',async()=>{
  const db=new PGlite(),pool=createPglitePool(db);
  const running=await startServer({pool,host:'127.0.0.1',port:0,config:{bootstrapToken:'hanna-local-bootstrap',allowedOrigins:[ORIGIN],secureCookies:false}});
  const base=`http://127.0.0.1:${running.server.address().port}`,teacher=client(base),student=client(base),other=client(base);
  try {
    must(await teacher.req('/api/auth/setup','POST',{token:'hanna-local-bootstrap',username:'hanna-method-qa-teacher',displayName:'Hanna módszer QA tanár',password:'isolated-test-password'}),201);
    const created=must(await teacher.req('/api/teacher/students','POST',{username:'hanna-method-qa-student',displayName:'Hanna módszer QA tanuló'}),201);
    const second=must(await teacher.req('/api/teacher/students','POST',{username:'hanna-method-qa-other',displayName:'Másik QA tanuló'}),201);
    const studentId=created.student.id;
    must(await student.req('/api/auth/activate','POST',{token:created.activationToken,password:'isolated-test-password'}),200);
    must(await other.req('/api/auth/activate','POST',{token:second.activationToken,password:'isolated-test-password'}),200);
    assert.equal((await teacher.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'chain'}})).status,403,'teacher preview does not create student record');
    assert.equal((await student.req(`/api/hanna/dashboard?studentId=${second.student.id}`)).status,403);

    const locations=['Ajtó','TITKOS-SZOBA','Kanapé','Asztal','Ablak'].map((name,index)=>({id:`location-${index}`,name,description:''}));
    let palace=must(await student.req('/api/hanna/resources','POST',{kind:'palace',title:'QA otthon',data:{locations}}),201).resource;
    assert.equal(palace.ready,false);
    assert.equal((await other.req(`/api/hanna/resources/${palace.id}`,'PATCH',{revision:1,title:'Idegen',data:{locations}})).status,404);
    assert.equal((await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'palace',resourceIds:[palace.id]}})).json.error.code,'PALACE_NOT_READY');
    palace=must(await student.req(`/api/hanna/resources/${palace.id}/readiness`,'POST',{revision:1,answers:locations.map((item,index)=>({index,value:item.name.normalize("NFD").replace(/[\u0300-\u036f]/g," ").replace(/ /g,"").toLowerCase()}))}),200).resource;
    assert.equal(palace.ready,true);
    const resources=must(await student.req('/api/hanna/resources'),200).resources;assert.ok(resources.some(resource=>resource.id===palace.id&&resource.ready));
    const pegs=must(await student.req('/api/hanna/resources','POST',{kind:'peg',title:'Saját horgok',data:{entries:Array.from({length:10},(_,index)=>({number:index+1,label:`Horog ${index+1}`}))}}),201).resource;
    const major=must(await student.req('/api/hanna/resources','POST',{kind:'major',title:'Saját számképek',data:{entries:[{code:'14',label:'tőr'},{code:'32',label:'manó'},{code:'58',label:'láva'},{code:'00',label:'szósz'},{code:'01',label:'szita'},{code:'02',label:'szén'},{code:'03',label:'szem'},{code:'04',label:'szőr'}]}}),201).resource;
    const material=must(await teacher.req('/api/hanna/resources','POST',{kind:'material',title:'Saját fogalmak',data:{items:[{id:'a',label:'Lomb',meaning:'A fa leveleinek összessége'},{id:'b',label:'Gyökér',meaning:'A növény föld alatti része'},{id:'c',label:'Törzs',meaning:'A fa tartó része'},{id:'d',label:'Ág',meaning:'A törzsből kiinduló rész'},{id:'e',label:'Rügy',meaning:'Fiatal hajtáskezdemény'}]}}),201).resource;
    assert.equal((await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'chain',resourceIds:[material.id]}})).status,404);

    assert.equal((await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Elutasítandó hiányos tananyag',studentIds:[studentId],steps:[{gameId:'hanna-method',settings:{activity:'chain',contentLevel:'material',itemCount:10,resourceIds:[material.id],adaptive:false},repetitions:1}]})).status,400,'an unplayable resource combination cannot be assigned');
    const assignment=must(await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Hanna Módszer E2E',studentIds:[studentId],steps:[{gameId:'hanna-method',settings:{activity:'chain',contentLevel:'material',itemCount:5,resourceIds:[material.id],adaptive:false},repetitions:2}]},{'idempotency-key':'hanna-local-assignment'}),201).assignment;
    const edited=must(await teacher.req(`/api/hanna/resources/${material.id}`,'PATCH',{revision:material.revision,title:'Átírt fogalmak',data:{items:material.data.items.map(item=>({...item,label:`ÚJ ${item.label}`}))}}),200).resource;
    assert.equal(edited.revision,2);
    assert.equal((await teacher.req(`/api/hanna/resources/${material.id}`,'PATCH',{revision:1,title:'Régi verzió',data:material.data})).status,409);
    const step=assignment.steps[0];
    const assignedAttempt=must(await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:step.id}),201).attempt;
    assert.equal(assignedAttempt.settings.resourceSnapshot[0].revision,1,'assigned material is a frozen copy');
    const assignedPlan=generateHannaSession(assignedAttempt.settings,assignedAttempt.seed),assignedAnswer=perfect(assignedPlan);
    await gate(pool,student,assignedAttempt,assignedAnswer);
    const assignedResult=must(await student.req(`/api/attempts/${assignedAttempt.id}/submit`,'POST',{answer:assignedAnswer}),200).result;
    assert.equal(assignedResult.percent,100);assert.equal(assignedResult.stars,null);assert.equal(assignedResult.starBasis,'hanna-method-no-stars');
    assert.match(assignedResult.metrics.comparabilityKey,/^[a-f0-9]{64}$/);
    assert.equal(must(await teacher.req(`/api/teacher/results/${assignedResult.id}`),200).result.studentId,studentId);

    const results=[];
    for(const activity of ['baseline','chain','association','loci','palace','peg','faces','keyword','major','numbers','random','text','concept','boss']) {
      const resourceIds=activity==='palace'?[palace.id]:activity==='peg'?[pegs.id]:activity==='numbers'?[major.id]:[];
      const attempt=must(await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity,...(!['numbers','major','text','boss'].includes(activity)?{itemCount:5}:{}),adaptive:false,resourceIds}}),201).attempt;
      const plan=generateHannaSession(attempt.settings,attempt.seed),answer=perfect(plan);
      if(activity==='chain')answer.encoding=[{itemId:plan.content[0].id,association:'SAJAT-ASSZOCIACIO'}];
      await gate(pool,student,attempt,answer);
      const responses=await Promise.all([student.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer}),student.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer})]);
      const first=must(responses[0],200),retry=must(responses[1],200);assert.equal(first.result.id,retry.result.id);assert.equal(first.duplicate===true||retry.duplicate===true,true);
      assert.equal(first.result.metrics.activity,activity);assert.equal(first.result.percent,100,`${activity}: ${JSON.stringify(first.result.details)}`);
      results.push(first.result);
    }
    const omittedAttempt=must(await other.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'baseline',adaptive:false}}),201).attempt;
    const omitted=perfect(generateHannaSession(omittedAttempt.settings,omittedAttempt.seed));omitted.responses=[];
    await gate(pool,other,omittedAttempt,omitted);
    assert.equal(must(await other.req(`/api/attempts/${omittedAttempt.id}/submit`,'POST',{answer:omitted}),200).result.percent,0,'all omitted immediate and delayed answers complete with zero');
    const partialAttempt=must(await other.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'baseline',itemCount:3,adaptive:false}}),201).attempt;
    const partialPlan=generateHannaSession(partialAttempt.settings,partialAttempt.seed),partialAnswer=perfect(partialPlan);
    partialAnswer.responses=partialPlan.recallTrials.map(trial=>({trialId:trial.id,value:[trial.expected[0],'téves emlék',''],rtMs:500,hintLevel:0}));
    await gate(pool,other,partialAttempt,partialAnswer);
    const partialSaved=must(await other.req(`/api/attempts/${partialAttempt.id}/submit`,'POST',{answer:partialAnswer}),200).result;
    assert.equal(partialSaved.correct,6);assert.equal(partialSaved.total,18);
    let dashboard=must(await student.req('/api/hanna/dashboard'),200);
    assert.equal(dashboard.milestones.some(item=>item.id==='digits-20'),false,'16 digit round does not earn 20 digit milestone');
    const twentyAttempt=must(await other.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'numbers',itemCount:20,adaptive:false}}),201).attempt;
    const twentyAnswer=perfect(generateHannaSession(twentyAttempt.settings,twentyAttempt.seed));
    await gate(pool,other,twentyAttempt,twentyAnswer);
    must(await other.req(`/api/attempts/${twentyAttempt.id}/submit`,'POST',{answer:twentyAnswer}),200);
    assert.ok(must(await other.req('/api/hanna/dashboard'),200).milestones.some(item=>item.id==='digits-20'));
    const ownAssociation=await pool.query("SELECT snapshot FROM hanna_review_cards WHERE student_id=$1 AND source_activity='chain'",[studentId]);
    assert.ok(ownAssociation.rows.some(row=>row.snapshot.hints.some(hint=>hint.includes('SAJAT-ASSZOCIACIO'))));
    assert.ok(ownAssociation.rows.some(row=>row.snapshot.hints.every(hint=>!hint.includes('SAJAT-ASSZOCIACIO'))),'association belongs only to matching item');
    assert.equal(dashboard.results.length,15);assert.equal(dashboard.dueCount,0);assert.ok(dashboard.nextDueAt);
    let reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'review',itemCount:5}});
    assert.equal(reply.status,409);assert.equal(reply.json.error.code,'NO_REVIEWS_DUE');
    const reviewAssignment=must(await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Saját esedékes anyag kiosztása',studentIds:[studentId],steps:[{gameId:'hanna-method',settings:{activity:'review',itemCount:5,adaptive:false},repetitions:1}]}),201).assignment;
    assert.equal((await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:reviewAssignment.steps[0].id})).json.error.code,'NO_REVIEWS_DUE','assignment exists but cannot fabricate future memories');
    const before=await pool.query('SELECT * FROM hanna_review_cards WHERE student_id=$1 ORDER BY source_result_id,source_item_id',[studentId]);assert.ok(before.rowCount>=15);
    // Controlled database clock fixture, not a claim of human seven-day UAT.
    await pool.query("UPDATE hanna_review_cards SET due_at=now()-interval '1 minute',learned_at=now()-interval '8 days' WHERE student_id=$1",[studentId]);
    const reviewAttempt=must(await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:reviewAssignment.steps[0].id}),201).attempt;
    assert.equal(reviewAttempt.settings.reviewSnapshot.length,5);
    const reservedDashboard=must(await student.req('/api/hanna/dashboard'),200);
    assert.equal(reservedDashboard.dueCount,before.rowCount-5,'reserved cards are not advertised as available');
    assert.equal(reservedDashboard.due.some(card=>reviewAttempt.settings.reviewSnapshot.some(item=>item.id===card.id)),false);
    for(const item of reviewAttempt.settings.reviewSnapshot)assert.deepEqual(item.expected,before.rows.find(row=>row.id===item.id).snapshot.expected,'same old learned item');
    const reviewPlan=generateHannaSession(reviewAttempt.settings,reviewAttempt.seed),reviewAnswer=perfect(reviewPlan);
    await pool.query("UPDATE attempts SET created_at=now()-interval '20 minutes' WHERE id=$1",[reviewAttempt.id]);
    const review=must(await student.req(`/api/attempts/${reviewAttempt.id}/submit`,'POST',{answer:reviewAnswer}),200).result;
    assert.equal(review.percent,100);assert.equal(review.metrics.activity,'review');
    const assignedReviewTeacher=must(await teacher.req(`/api/teacher/results/${review.id}`),200).result;
    assert.equal(assignedReviewTeacher.answer,undefined,'assigned review of private memories never exposes raw answers');
    assert.ok(assignedReviewTeacher.details.every(detail=>detail.expected==='Saját tananyag'));
    assert.equal(assignedReviewTeacher.settings.reviewSnapshot,undefined);
    const reviewAssignmentView=must(await student.req('/api/student/assignments'),200).assignments.find(item=>item.id===reviewAssignment.id);
    assert.equal(reviewAssignmentView.completed,1);assert.equal(reviewAssignmentView.total,1);

    assert.equal(must(await student.req(`/api/attempts/${reviewAttempt.id}/submit`,'POST',{answer:reviewAnswer}),200).duplicate,true);
    const history=await pool.query('SELECT * FROM hanna_review_history WHERE result_id=$1',[review.id]);assert.equal(history.rowCount,5);
    const updatedCards=await pool.query('SELECT * FROM hanna_review_cards WHERE id=ANY($1::uuid[])',[reviewAttempt.settings.reviewSnapshot.map(item=>item.id)]);
    assert.ok(updatedCards.rows.every(row=>row.review_count===1&&row.reserved_attempt_id===null&&new Date(row.due_at)>new Date()));
    dashboard=must(await student.req('/api/hanna/dashboard'),200);
    assert.ok(dashboard.milestones.some(item=>item.id==='retention-7d'),'milestone only after actual stored timestamp boundary');
    assert.equal(new Set(dashboard.milestones.map(item=>item.id)).size,dashboard.milestones.length);
    const teacherDashboard=must(await teacher.req(`/api/hanna/dashboard?studentId=${studentId}`),200);assert.equal(teacherDashboard.resources.length,0);assert.equal(teacherDashboard.results.length,16);
    assert.equal(JSON.stringify(teacherDashboard).includes('TITKOS-SZOBA'),false,'teacher cannot read private palace through snapshots, feedback or due labels');
    const privateResult=results.find(row=>row.settings.activity==='palace');
    const privateDetail=must(await teacher.req(`/api/teacher/results/${privateResult.id}`),200);
    assert.equal(JSON.stringify(privateDetail).includes('TITKOS-SZOBA'),false);
    assert.equal(privateDetail.result.answer,undefined);
    assert.equal(privateDetail.result.percent,100,'performance remains visible');
    assert.equal(must(await teacher.req('/api/hanna/dashboard'),200).results.length,0);
    const progress=must(await student.req('/api/progress'),200);assert.equal(progress.hannaRounds,16);assert.equal(progress.legacyRounds,0);assert.equal(progress.stars,0);assert.equal(progress.ungradedStars,0);
    must(await student.req('/api/auth/logout','POST',{}),200);
    must(await student.req('/api/auth/login','POST',{username:'hanna-method-qa-student',password:'isolated-test-password'}),200);
    assert.equal(must(await student.req('/api/hanna/dashboard'),200).results.length,16,'relogin persistence');
    must(await student.req(`/api/hanna/resources/${palace.id}`,'DELETE',{}),200);
    assert.equal(must(await student.req('/api/hanna/resources'),200).resources.some(resource=>resource.id===palace.id),false);
    assert.equal((await pool.query('SELECT count(*)::int count FROM hanna_review_cards WHERE student_id=$1',[studentId])).rows[0].count,before.rowCount,'archiving never deletes learned snapshots');
    // Requested review size can exceed actual due cards. Reopening must reuse the reservation.
    await pool.query("UPDATE hanna_review_cards SET due_at=now()+interval '1 day' WHERE student_id=$1",[second.student.id]);
    for(const assigned of [false,true]){
      await pool.query("UPDATE hanna_review_cards SET due_at=now()-interval '1 minute' WHERE id IN (SELECT id FROM hanna_review_cards WHERE student_id=$1 AND reserved_attempt_id IS NULL AND due_at>now() ORDER BY id LIMIT 2)",[second.student.id]);
      let body={clientRulesVersion:2,gameId:'hanna-method',settings:{activity:'review',itemCount:5,adaptive:false}};
      if(assigned){const a=must(await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Rövidebb esedékes kör folytatása',studentIds:[second.student.id],steps:[{gameId:'hanna-method',settings:body.settings,repetitions:1}]}),201).assignment;body={clientRulesVersion:2,assignmentStepId:a.steps[0].id};}
      const first=must(await other.req('/api/attempts','POST',body),201).attempt;
      assert.equal(first.settings.itemCount,2);
      const resumed=must(await other.req('/api/attempts','POST',body),201).attempt;
      assert.equal(resumed.id,first.id);assert.deepEqual(resumed.settings.reviewSnapshot,first.settings.reviewSnapshot);
    }

  } finally {await running.close();await db.close();}
});


test('daily progress follows saved results and Budapest midnight, with no empty review start',()=>{
  const rows=[{settings:{activity:'chain'},created_at:'2026-09-11T21:59:00Z'},{settings:{activity:'association'},created_at:'2026-09-11T22:01:00Z'}];
  const plan=hannaDailyPlan(rows,0,new Date('2026-09-11T22:05:00Z'));
  assert.equal(plan.find(x=>x.activity==='chain').completed,false);assert.equal(plan.find(x=>x.activity==='association').completed,true);
  assert.equal(plan.find(x=>x.activity==='review').available,false);assert.equal(hannaDailyPlan(rows,1).find(x=>x.activity==='review').available,true);
});
