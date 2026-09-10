import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {PGlite} from '@electric-sql/pglite';
import {pglitePool} from './helpers/pglite-pool.mjs';
import {createServer} from '../server/index.js';
import {migrate} from '../server/migrate.js';
import {generateDigitsRound} from '../dist/games/core-games.js';
import {seededRandom} from '../dist/game-engine.js';

test('independent real-engine school workflow survives account changes and duplicate submission',async t=>{
  let db,pool,admin,schema;
  if(process.env.SCHOOL_TEST_DATABASE_URL){
    const connectionString=process.env.SCHOOL_TEST_DATABASE_URL;
    schema='qa_school_'+randomBytes(10).toString('hex');admin=new pg.Pool({connectionString,max:1});
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool=new pg.Pool({connectionString,max:5,options:`-c search_path=${schema}`});
  }else{db=new PGlite();pool=pglitePool(db);}
  await migrate(pool);
  const origin='http://127.0.0.1';const password=randomBytes(20).toString('base64url');const token=randomBytes(32).toString('base64url');
  const server=createServer({pool,config:{bootstrapToken:token,allowedOrigins:[origin],secureCookies:false}});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));if(admin){await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}else await db.close();});
  function client(){let cookie,csrf;return{get cookie(){return cookie;},async req(path,method='GET',body,extra={}){const response=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(method!=='GET'?{origin,'x-csrf-token':csrf||''}:{}),...extra},body:body?JSON.stringify(body):undefined});const json=await response.json();const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];if(json.csrfToken)csrf=json.csrfToken;return{status:response.status,json,headers:response.headers};}};}
  const teacher=client(),a=client(),b=client(),anonymous=client();
  let r=await teacher.req('/api/auth/setup','POST',{token,username:'qa-teacher',displayName:'Próbaoktató',password});assert.equal(r.status,201,JSON.stringify(r.json));
  r=await teacher.req('/api/teacher/groups','POST',{name:'Memória próbacsoport'});assert.equal(r.status,201);const groupId=r.json.group.id;
  r=await teacher.req('/api/teacher/students','POST',{username:'qa-learner-a',displayName:'Próba Anna',groupIds:[groupId]});assert.equal(r.status,201);const studentA=r.json.student.id;const activationA=r.json.activationToken;
  r=await a.req('/api/auth/activate','POST',{token:activationA,password});assert.equal(r.status,200,JSON.stringify(r.json));
  r=await teacher.req('/api/teacher/students','POST',{username:'qa-learner-b',displayName:'Próba Bence'});assert.equal(r.status,201);const studentB=r.json.student.id;
  r=await b.req('/api/auth/activate','POST',{token:r.json.activationToken,password});assert.equal(r.status,200);
  r=await b.req('/api/teacher/students');assert.equal(r.status,403);
  const assignmentBody={title:'Két irány, két kör',instructions:'Előbb előre, majd visszafelé.',groupIds:[groupId],steps:[{gameId:'digits',settings:{count:3,seconds:3,reverse:false,level:1},repetitions:1},{gameId:'digits',settings:{count:3,seconds:3,reverse:true,level:1},repetitions:1}]};
  r=await teacher.req('/api/teacher/assignments','POST',assignmentBody,{'Idempotency-Key':'workflow-assignment-1'});assert.equal(r.status,201,JSON.stringify(r.json));const assignmentId=r.json.assignment.id;
  r=await teacher.req('/api/teacher/assignments','POST',assignmentBody,{'Idempotency-Key':'workflow-assignment-1'});assert.equal(r.json.assignment.id,assignmentId);
  r=await a.req('/api/student/assignments');assert.equal(r.status,200);const assigned=r.json.assignments.find(x=>x.id===assignmentId);assert.equal(assigned.total,2);assert.equal(assigned.steps.length,2);
  r=await b.req('/api/student/assignments');assert.equal(r.json.assignments.length,0);
  r=await b.req('/api/attempts','POST',{gameId:'digits',assignmentStepId:assigned.steps[0].id});assert.ok([403,404].includes(r.status));
  let lastResult;
  for(let i=0;i<2;i++){
    r=await a.req('/api/attempts','POST',{gameId:'digits',settings:{count:8,reverse:!Boolean(i)},assignmentStepId:assigned.steps[i].id});assert.equal(r.status,201,JSON.stringify(r.json));const attempt=r.json.attempt;assert.equal(attempt.settings.count,3);assert.equal(attempt.settings.reverse,Boolean(i));
    const expected=generateDigitsRound(attempt.settings,seededRandom(attempt.seed)).expected.join('');
    r=await b.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:{digits:expected}});assert.ok([403,404].includes(r.status));
    r=await anonymous.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:{digits:expected}});assert.equal(r.status,401);
    const answer=i===0?expected:expected.split('').map((d,j)=>j===0?String((Number(d)+1)%10):d).join('');
    const replies=await Promise.all([a.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:{digits:answer}}),a.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:{digits:answer}})]);
    for(const q of replies)assert.equal(q.status,200,JSON.stringify(q.json));assert.equal(replies[0].json.result.id,replies[1].json.result.id);lastResult=replies[0].json.result;assert.equal(lastResult.correct,i===0?3:2);assert.equal(lastResult.total,3);
    r=await a.req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:{digits:'000'+expected}});assert.equal(r.status,409);
    r=await a.req('/api/attempts','POST',{gameId:'digits',assignmentStepId:assigned.steps[i].id});assert.equal(r.status,409);
  }
  r=await a.req('/api/auth/logout','POST',{});assert.equal(r.status,200);r=await a.req('/api/results');assert.equal(r.status,401);
  r=await a.req('/api/auth/login','POST',{username:'qa-learner-a',password});assert.equal(r.status,200);
  r=await a.req('/api/student/assignments');assert.equal(r.json.assignments[0].completed,2);
  r=await a.req('/api/results');assert.equal(r.json.results.length,2);assert.equal(r.json.results.reduce((s,x)=>s+x.correct,0),5);
  r=await b.req('/api/results');assert.equal(r.json.results.length,0);
  r=await teacher.req(`/api/teacher/results?studentId=${studentA}&assignmentId=${assignmentId}`);assert.equal(r.json.results.length,2);
  r=await teacher.req(`/api/teacher/results/${lastResult.id}`);assert.equal(r.status,200);assert.equal(r.json.result.details.length,3);
  r=await teacher.req(`/api/teacher/assignments/${assignmentId}`);assert.equal(r.status,200);assert.equal(r.json.students[0].completed,2);
  r=await teacher.req(`/api/teacher/students/${studentA}`,'PATCH',{active:false});assert.equal(r.status,200);r=await a.req('/api/results');assert.equal(r.status,401);
  r=await teacher.req(`/api/teacher/students/${studentB}/reset`,'POST',{});assert.equal(r.status,200);r=await b.req('/api/results');assert.equal(r.status,401);
});
