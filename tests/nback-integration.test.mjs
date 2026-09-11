import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes,randomUUID} from 'node:crypto';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {pglitePool} from './helpers/pglite-pool.mjs';
import {createServer} from '../server/index.js';
import {migrate} from '../server/migrate.js';
import {generateDigitsRound} from '../dist/games/core-games.js';
import {generateSession,isChannelMatch,scoreSession} from '../dist/nback/engine.js';
import {seededRandom} from '../dist/game-engine.js';
import {historyStats,normalizeResult,parseRoute,readHistory,settingsQuery} from '../dist/core.js';

test('N-back links and local result normalization preserve canonical settings, operations, N and engine percent',()=>{
  const settings={nbackVersion:1,mode:8,n:4,trialCount:36,intervalMs:1700,selfPaced:false,adaptive:true,variable:false,crab:false,multiStim:1,identity:'image',interference:0.25,scoreProfile:'workshop',operations:['+','/'],numberMax:18,allowNegative:true,allowFractions:true,lowScoreCount:0};
  const route=parseRoute(`#/jatek/nback?${settingsQuery(settings)}`,['digits','nback']);
  assert.deepEqual(route,{page:'game',id:'nback',settings});
  const raw={gameId:'nback',correct:2,total:3,percent:66,stars:null,starBasis:'brainworkshop-no-stars',rulesVersion:2,summary:'floor',details:[],metrics:null};
  assert.equal(normalizeResult(raw).percent,66);
  const at=new Date().toISOString();
  const stored=readHistory({getItem:()=>JSON.stringify([{...raw,at,settings,duration:5}])},['nback']);
  assert.equal(stored[0].settings.n,4);assert.deepEqual(stored[0].settings.operations,['+','/']);assert.equal(stored[0].percent,66);
  const maximal={...raw,correct:1800,total:2000,percent:90,at,settings,duration:5};
  assert.deepEqual(normalizeResult(maximal),{...normalizeResult(maximal),correct:1800,total:2000});
  assert.equal(readHistory({getItem:()=>JSON.stringify([maximal])},['nback']).length,1);
  const badMode={...maximal,settings:{...settings,mode:999}};
  const surviving=readHistory({getItem:()=>JSON.stringify([stored[0],badMode])},['nback']);
  assert.equal(surviving.length,1,'one invalid legacy row must not erase valid history');
  assert.deepEqual(historyStats([{gameId:'digits',correct:9,total:10,percent:90},{gameId:'nback',correct:1,total:1,percent:0}]),{rounds:2,games:2,percent:90});
});

function binaryAnswer(session,{hits=Infinity,falseAlarms=0}={}){
  const matches=[],nonmatches=[];
  for(const trial of session.trials){
    if(trial.warmup)continue;
    for(const channel of session.channels){
      if(channel.id==='arithmetic')continue;
      const event={trialIndex:trial.index,channel:channel.id,atMs:0,value:true};
      (isChannelMatch(session,trial.index,channel.id)?matches:nonmatches).push(event);
    }
  }
  return {version:1,events:[...matches.slice(0,hits),...nonmatches.slice(0,falseAlarms)]};
}

function mediumAnswer(session){
  const all=binaryAnswer(session),matches=all.events;
  const nonmatches=binaryAnswer(session,{hits:0,falseAlarms:Infinity}).events;
  for(let hits=1;hits<=matches.length;hits++)for(let falseAlarms=0;falseAlarms<=nonmatches.length;falseAlarms++){
    const answer={version:1,events:[...matches.slice(0,hits),...nonmatches.slice(0,falseAlarms)]};
    const percent=scoreSession(session,answer).percent;
    if(percent>=50&&percent<80)return answer;
  }
  throw new Error('A fixture seed nem adott 50–79%-os bináris választ.');
}

function workshopFloorWitness(session){
  const matches=binaryAnswer(session).events,nonmatches=binaryAnswer(session,{hits:0,falseAlarms:Infinity}).events;
  for(let hits=1;hits<matches.length;hits++)for(let falseAlarms=1;falseAlarms<=nonmatches.length;falseAlarms++){
    const answer={version:1,events:[...matches.slice(0,hits),...nonmatches.slice(0,falseAlarms)]};
    const score=scoreSession(session,answer);
    if(score.percent!==Math.round(score.correct*100/score.total))return answer;
  }
  throw new Error('A fixture seed nem adott floor/round eltérést.');
}

function client(base,origin){
  let cookie,csrf;
  return {
    async req(path,method='GET',body,headers={}){
      const response=await fetch(base+path,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(cookie?{cookie}:{}),...(method==='GET'?{}:{origin,'x-csrf-token':csrf||''}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
      const json=await response.json();
      const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
      if(json.csrfToken)csrf=json.csrfToken;
      return {status:response.status,json};
    },
  };
}

test('N-back assignment, authoritative scoring, metrics, retry safety and persistent server adaptation',async t=>{
  const db=new PGlite(),pool=pglitePool(db);await migrate(pool);await migrate(pool);
  const origin='http://127.0.0.1',bootstrap=randomBytes(24).toString('base64url'),password=randomBytes(20).toString('base64url');
  const server=createServer({pool,config:{bootstrapToken:bootstrap,allowedOrigins:[origin],secureCookies:false}});
  server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
  const teacher=client(base,origin),student=client(base,origin),other=client(base,origin);

  let reply=await teacher.req('/api/auth/setup','POST',{token:bootstrap,username:'nback-tanar',displayName:'N-back tanár',password});
  assert.equal(reply.status,201,JSON.stringify(reply.json));
  reply=await teacher.req('/api/teacher/students','POST',{username:'nback-diak',displayName:'N-back diák'});const studentId=reply.json.student.id;
  await student.req('/api/auth/activate','POST',{token:reply.json.activationToken,password});
  reply=await teacher.req('/api/teacher/students','POST',{username:'nback-masik',displayName:'Másik diák'});
  await other.req('/api/auth/activate','POST',{token:reply.json.activationToken,password});

  const assignedSettings={nbackVersion:1,mode:3,n:2,trialCount:80,intervalMs:1600,selfPaced:false,adaptive:false,variable:false,crab:false,multiStim:1,identity:'color',interference:0.25,scoreProfile:'workshop',operations:['+','-'],numberMax:12,allowNegative:false,allowFractions:false,lowScoreCount:0};
  const assignmentBody={clientRulesVersion:2,title:'N-back csatornák',studentIds:[studentId],steps:[{gameId:'nback',settings:assignedSettings,repetitions:2}]};
  reply=await teacher.req('/api/teacher/assignments','POST',assignmentBody,{'Idempotency-Key':'nback-assignment'});
  assert.equal(reply.status,201,JSON.stringify(reply.json));const assignmentId=reply.json.assignment.id,stepId=reply.json.assignment.steps[0].id;
  assert.deepEqual(reply.json.assignment.steps[0].settings,assignedSettings);

  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'digits',settings:{n:19},assignmentStepId:stepId});
  assert.equal(reply.status,201,JSON.stringify(reply.json));const first=reply.json.attempt;
  assert.equal(first.gameId,'nback');assert.deepEqual(first.settings,assignedSettings);assert.equal(Number.isInteger(first.seed),true);
  const firstSession=generateSession({seed:first.seed,config:first.settings});
  const knownRaw=workshopFloorWitness(firstSession);
  const expected=scoreSession(firstSession,knownRaw,{lowScoreCount:0});
  assert.ok(expected.metrics.totals.hits>0);assert.ok(expected.metrics.totals.falseAlarms>0);assert.ok(expected.metrics.totals.misses>0);
  assert.notEqual(expected.percent,Math.round(expected.correct*100/expected.total));
  reply=await other.req(`/api/attempts/${first.id}/submit`,'POST',{answer:knownRaw});assert.equal(reply.status,403);
  reply=await student.req(`/api/attempts/${first.id}/submit`,'POST',{answer:knownRaw,metrics:{version:1},stars:3});assert.equal(reply.status,400);assert.equal(reply.json.error.code,'CLIENT_SCORE_REJECTED');
  const concurrent=await Promise.all([student.req(`/api/attempts/${first.id}/submit`,'POST',{answer:knownRaw}),student.req(`/api/attempts/${first.id}/submit`,'POST',{answer:knownRaw})]);
  assert.deepEqual(concurrent.map(item=>item.status),[200,200]);
  assert.deepEqual(concurrent.map(item=>item.json.duplicate).sort(),[false,true]);
  const saved=concurrent[0].json.result;assert.equal(saved.id,concurrent[1].json.result.id);
  assert.equal(saved.percent,expected.percent,'the engine floor percent is stored without generic rounding');
  assert.deepEqual(saved.metrics,expected.metrics);assert.equal(saved.stars,null);assert.equal(saved.starBasis,'brainworkshop-no-stars');
  reply=await student.req(`/api/attempts/${first.id}/submit`,'POST',{answer:{version:1,events:[]}});assert.equal(reply.status,409);

  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:stepId});const second=reply.json.attempt;
  reply=await student.req(`/api/attempts/${second.id}/submit`,'POST',{answer:{version:1,events:[]}});assert.equal(reply.status,200);assert.equal(reply.json.result.percent,0);
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:stepId});assert.equal(reply.status,409);assert.equal(reply.json.error.code,'REPETITIONS_COMPLETE');
  reply=await teacher.req(`/api/teacher/assignments/${assignmentId}`);assert.equal(reply.json.students[0].completed,2);assert.equal(reply.json.results.length,2);
  reply=await teacher.req(`/api/teacher/results/${saved.id}`);assert.equal(reply.status,200);assert.equal(reply.json.result.studentDisplayName,'N-back diák');assert.equal(reply.json.result.metrics.channels.length,3);assert.deepEqual(reply.json.result.metrics.channels.map(channel=>channel.id),firstSession.channels.map(channel=>channel.id));

  const oldStep=randomUUID(),oldAttempt=randomUUID(),badStep=randomUUID();
  await pool.query("INSERT INTO assignment_steps(id,assignment_id,position,game_id,settings,repetitions,rules_version) VALUES($1,$2,1,'nback',$3,1,1)",[oldStep,assignmentId,JSON.stringify(assignedSettings)]);
  await pool.query("INSERT INTO attempts(id,student_id,game_id,settings,seed,assignment_step_id,expires_at,rules_version) VALUES($1,$2,'nback',$3,7,$4,now()+interval '1 hour',1)",[oldAttempt,studentId,JSON.stringify(assignedSettings),oldStep]);
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:oldStep});assert.equal(reply.status,409);assert.equal(reply.json.error.code,'CLIENT_UPDATE_REQUIRED');
  reply=await student.req(`/api/attempts/${oldAttempt}/submit`,'POST',{answer:{version:1,events:[]}});assert.equal(reply.status,409);assert.equal(reply.json.error.code,'CLIENT_UPDATE_REQUIRED');
  await pool.query("INSERT INTO assignment_steps(id,assignment_id,position,game_id,settings,repetitions,rules_version) VALUES($1,$2,2,'nback',$3,1,2)",[badStep,assignmentId,JSON.stringify({...assignedSettings,mode:999})]);
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:badStep});assert.equal(reply.status,400);assert.equal(reply.json.error.code,'INVALID_GAME_SETTINGS');

  await student.req('/api/auth/logout','POST',{});await student.req('/api/auth/login','POST',{username:'nback-diak',password});
  reply=await student.req('/api/results');assert.equal(reply.json.results.length,2);assert.deepEqual(reply.json.results.find(result=>result.id===saved.id).metrics,expected.metrics);
  reply=await student.req('/api/progress');assert.equal(reply.json.nbackRounds,2);assert.equal(reply.json.nbackAveragePercent,Math.round(expected.percent/2));assert.equal(reply.json.nbackAverageN,2);assert.equal(reply.json.nbackHighestN,2);assert.equal(reply.json.legacyRounds,0);assert.equal(reply.json.correct,0);assert.equal(reply.json.total,0);assert.equal(reply.json.percent,0);assert.equal(reply.json.ungradedStars,0);assert.ok(reply.json.games.every(item=>item.gameId!=='nback'||item.n===item.level));

  const manualFree={...assignedSettings,mode:20,n:2,trialCount:24};
  const manualFirst=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:manualFree});assert.equal(manualFirst.status,201);
  const manualChanged=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:{...manualFree,n:5}});assert.equal(manualChanged.status,201);assert.notEqual(manualChanged.json.attempt.id,manualFirst.json.attempt.id);assert.equal(manualChanged.json.attempt.settings.n,5);

  const adaptive={...assignedSettings,mode:10,n:2,trialCount:200,intervalMs:1200,adaptive:true,interference:0.125,operations:['+','-','*','/']};
  async function adaptiveRound(answerFactory,incoming=adaptive){
    const created=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:incoming});assert.equal(created.status,201,JSON.stringify(created.json));
    const session=generateSession({seed:created.json.attempt.seed,config:created.json.attempt.settings});
    const answer=answerFactory(session);const submitted=await student.req(`/api/attempts/${created.json.attempt.id}/submit`,'POST',{answer});assert.equal(submitted.status,200,JSON.stringify(submitted.json));
    return {attempt:created.json.attempt,result:submitted.json.result};
  }
  let adaptiveResult=await adaptiveRound(()=>({version:1,events:[]}));assert.equal(adaptiveResult.attempt.settings.n,2);assert.equal(adaptiveResult.result.metrics.adaptation.lowScoreCount,1);
  const corruptMetrics=structuredClone(adaptiveResult.result.metrics);corruptMetrics.adaptation.fromN=19;
  await pool.query('UPDATE results SET metrics=$1 WHERE id=$2',[JSON.stringify(corruptMetrics),adaptiveResult.result.id]);
  adaptiveResult=await adaptiveRound(()=>({version:1,events:[]}));assert.equal(adaptiveResult.attempt.settings.n,2);assert.equal(adaptiveResult.attempt.settings.lowScoreCount,0);assert.equal(adaptiveResult.result.metrics.adaptation.lowScoreCount,1);
  await student.req('/api/auth/logout','POST',{});await student.req('/api/auth/login','POST',{username:'nback-diak',password});
  adaptiveResult=await adaptiveRound(mediumAnswer,{...adaptive,n:9,lowScoreCount:2});assert.ok(adaptiveResult.result.percent>=50&&adaptiveResult.result.percent<80);assert.equal(adaptiveResult.attempt.settings.n,2);assert.equal(adaptiveResult.attempt.settings.lowScoreCount,1);assert.equal(adaptiveResult.result.metrics.adaptation.lowScoreCount,1);
  adaptiveResult=await adaptiveRound(()=>({version:1,events:[]}));assert.equal(adaptiveResult.result.metrics.adaptation.lowScoreCount,2);
  adaptiveResult=await adaptiveRound(()=>({version:1,events:[]}));assert.equal(adaptiveResult.result.metrics.adaptation.action,'down');assert.equal(adaptiveResult.result.metrics.adaptation.nextN,1);
  adaptiveResult=await adaptiveRound(session=>binaryAnswer(session));assert.equal(adaptiveResult.attempt.settings.n,1);assert.equal(adaptiveResult.result.percent,100);assert.equal(adaptiveResult.result.metrics.adaptation.action,'up');assert.equal(adaptiveResult.result.metrics.adaptation.nextN,2);

  const selfPaced={...adaptive,n:6,selfPaced:true};
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:selfPaced});assert.equal(reply.status,201);assert.equal(reply.json.attempt.settings.n,6);assert.equal(reply.json.attempt.settings.lowScoreCount,0);

  const isolated={...adaptive,mode:11,n:4};
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:isolated});assert.equal(reply.status,201);assert.equal(reply.json.attempt.settings.n,4);assert.equal(reply.json.attempt.settings.lowScoreCount,0);
  const replay=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:{...isolated,n:8,lowScoreCount:2}});assert.equal(replay.json.attempt.id,reply.json.attempt.id);assert.deepEqual(replay.json.attempt.settings,reply.json.attempt.settings);
  const invalidAt={version:1,events:[{trialIndex:4,channel:'audio',atMs:isolated.intervalMs+1,value:true}]};
  const invalid=await student.req(`/api/attempts/${reply.json.attempt.id}/submit`,'POST',{answer:invalidAt});assert.equal(invalid.status,400);assert.equal(invalid.json.error.code,'INVALID_ANSWER');
  const invalidChannel=await student.req(`/api/attempts/${reply.json.attempt.id}/submit`,'POST',{answer:{version:1,events:[{trialIndex:4,channel:'position1',atMs:0,value:true}]}});assert.equal(invalidChannel.status,400);
  const oversizedEvent={trialIndex:4,channel:'audio',atMs:0,value:true};
  const oversized=await student.req(`/api/attempts/${reply.json.attempt.id}/submit`,'POST',{answer:{version:1,events:Array.from({length:1633},()=>oversizedEvent)}});assert.equal(oversized.status,400);

  const adaptiveAssignment=await teacher.req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Külön adaptív lépés',studentIds:[studentId],steps:[{gameId:'nback',settings:{...adaptive,n:5},repetitions:1}]});
  const isolatedStep=adaptiveAssignment.json.assignment.steps[0].id;
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:isolatedStep});assert.equal(reply.status,201);assert.equal(reply.json.attempt.settings.n,5);assert.equal(reply.json.attempt.settings.lowScoreCount,0);

  const jaeggi={...assignedSettings,mode:2,n:2,trialCount:20,intervalMs:2500,adaptive:false,interference:0.125,scoreProfile:'jaeggi',operations:['+','-','*','/']};
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'nback',settings:jaeggi});assert.equal(reply.status,201);
  const jaeggiSession=generateSession({seed:reply.json.attempt.seed,config:reply.json.attempt.settings});
  const jaeggiRaw={version:1,events:binaryAnswer(jaeggiSession).events.filter(event=>event.channel==='position1')};
  const jaeggiExpected=scoreSession(jaeggiSession,jaeggiRaw);
  const jaeggiSaved=await student.req(`/api/attempts/${reply.json.attempt.id}/submit`,'POST',{answer:jaeggiRaw});assert.equal(jaeggiSaved.status,200);
  assert.equal(jaeggiSaved.json.result.percent,Math.min(...jaeggiExpected.metrics.channels.map(channel=>channel.percent)));
  assert.equal(jaeggiSaved.json.result.percent,jaeggiExpected.percent);

  const groupedProgress=await student.req('/api/progress');
  const sameN=groupedProgress.json.games.filter(item=>item.gameId==='nback'&&item.n===2);
  assert.ok(sameN.some(item=>item.nbackSettings.mode===3));
  assert.ok(sameN.some(item=>item.nbackSettings.mode===2&&item.nbackSettings.scoreProfile==='jaeggi'),'different modes and scoring profiles at the same N must remain separate in progress');

  reply=await student.req('/api/attempts','POST',{gameId:'nback',settings:adaptive});assert.equal(reply.status,400);assert.equal(reply.json.error.code,'CLIENT_UPDATE_REQUIRED');
  reply=await student.req('/api/attempts','POST',{clientRulesVersion:2,gameId:'digits',settings:{level:1,count:3,seconds:5}});assert.equal(reply.status,201);
  const digits=generateDigitsRound(reply.json.attempt.settings,seededRandom(reply.json.attempt.seed)).expected.join('');
  const oldResult=await student.req(`/api/attempts/${reply.json.attempt.id}/submit`,'POST',{answer:{digits}});assert.equal(oldResult.status,200);assert.equal(oldResult.json.result.percent,100);assert.equal(oldResult.json.result.metrics,null);
  reply=await student.req('/api/progress');assert.equal(reply.json.legacyRounds,1);assert.equal(reply.json.correct,3);assert.equal(reply.json.total,3);assert.equal(reply.json.percent,100);assert.ok(reply.json.nbackRounds>2);
});
