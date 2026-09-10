import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {pglitePool} from './helpers/pglite-pool.mjs';
import {migrate} from '../server/migrate.js';
import {createServer} from '../server/index.js';
import {once} from 'node:events';
import {hashPassword} from '../server/security.js';
import * as engine from '../dist/game-engine.js';
import * as old from '../dist/legacy/v1/game-engine.js';
import {generateCodeRound as oldCode} from '../dist/legacy/v1/games/advanced-games.js';
import {generateStationsRound,generateFaces,generatePrices,generateShopping} from '../dist/games/association-games.js';
import {generateCodeRound,generatePictureRounds} from '../dist/games/advanced-games.js';

function perfectRaw(gameId,settings,seed){
 const rng=engine.seededRandom(seed);
 if(gameId==='stations')return {items:generateStationsRound(settings,rng).expected};
 if(gameId==='faces')return {attempts:[{answers:generateFaces(5,rng).map(face=>({faceId:face.id,name:face.name,...(settings.level>=2?{job:face.job}:{}),...(settings.level>=3?{room:face.room}:{})}))}]};
 if(gameId==='prices')return {answers:generatePrices(settings.count,settings.difficulty,rng,settings.level).map(item=>({itemId:item.id,price:item.price,...(settings.level===2?{discount:item.discount}:{})}))};
 if(gameId==='shopping'){const ids=generateShopping(9,rng,settings).targets.map(item=>item.id);return {attempts:[{itemIds:settings.level===1?ids.reverse():ids}]};}
 if(gameId==='picture')return {rounds:generatePictureRounds(settings,rng).map(round=>settings.level===1?{choiceId:round.target.id}:{attempts:[{itemIds:round.sequence.map(item=>item.id)}]})};
 const round=generateCodeRound(settings,rng);
 // A custom key may use all sixteen visible choices, not only the default ten.
 return {mapping:round.pool.slice(-10).map((item,digit)=>({digit,symbolId:item.id})),answers:round.messages.map(message=>({attempts:[message.join('')]}))};
}

// This starts at the released SQL schema and inserts historical data before v2 migration.
test('upgrade freezes historical stars, assignments, pending rounds and old browser contracts',async t=>{
 const db=new PGlite(),pool=pglitePool(db);t.after(()=>db.close());
 await db.exec(await readFile(new URL('../migrations/001_initial.sql',import.meta.url),'utf8'));
 await db.exec("CREATE TABLE schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());INSERT INTO schema_migrations(name) VALUES('001_initial.sql')");
 const teacher=randomUUID(),student=randomUUID(),assignment=randomUUID(),step=randomUUID(),attempt=randomUUID(),past=randomUUID(),result=randomUUID();
 await pool.query('INSERT INTO users(id,username,username_key,display_name,role,owner,password_hash) VALUES($1,$2,$2,$3,$4,true,$5)',[teacher,'version_teacher','Tanár','teacher',await hashPassword('version-teacher-pass')]);
 await pool.query('INSERT INTO users(id,username,username_key,display_name,role,created_by,password_hash) VALUES($1,$2,$2,$3,$4,$5,$6)',[student,'version_student','Teszt tanuló','student',teacher,await hashPassword('version-student-pass')]);
 await pool.query('INSERT INTO assignments(id,teacher_id,title) VALUES($1,$2,$3)',[assignment,teacher,'Régi feladatsor']);
 await pool.query('INSERT INTO assignment_students(assignment_id,student_id) VALUES($1,$2)',[assignment,student]);
 const settings=old.normalizeGameSettings('code',{level:1,rounds:3});
 await pool.query('INSERT INTO assignment_steps(id,assignment_id,position,game_id,settings,repetitions) VALUES($1,$2,0,$3,$4,2)',[step,assignment,'code',JSON.stringify(settings)]);
 await pool.query("INSERT INTO attempts(id,student_id,game_id,settings,seed,assignment_step_id,expires_at) VALUES($1,$2,'code',$3,17,$4,now()+interval '1 hour')",[attempt,student,JSON.stringify(settings),step]);
 await pool.query("INSERT INTO attempts(id,student_id,game_id,settings,seed,expires_at,submitted_at) VALUES($1,$2,'code',$3,18,now()+interval '1 hour',now())",[past,student,JSON.stringify(settings)]);
 await pool.query("INSERT INTO results(id,attempt_id,student_id,game_id,settings,answer,answer_hash,correct,total,percent,summary,details,duration) VALUES($1,$2,$3,'code',$4,'{}','old',6,9,67,'Régi eredmény','[]',2)",[result,past,student,JSON.stringify(settings)]);
 await migrate(pool);await migrate(pool);
 assert.deepEqual((await pool.query('SELECT rules_version,stars,correct,total,percent FROM results WHERE id=$1',[result])).rows[0],{rules_version:1,stars:2,correct:6,total:9,percent:67});
 assert.equal((await pool.query('SELECT rules_version FROM assignment_steps WHERE id=$1',[step])).rows[0].rules_version,1);
 const server=createServer({pool,gameEngine:engine,config:{allowedOrigins:['http://127.0.0.1'],secureCookies:false}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
 async function req(path,method='GET',body,auth={}){const r=await fetch(base+path,{method,headers:{origin:'http://127.0.0.1','content-type':'application/json',...(auth.cookie?{cookie:auth.cookie,'x-csrf-token':auth.csrf}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,json:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const login=await req('/api/auth/login','POST',{username:'version_student',password:'version-student-pass'});assert.equal(login.status,200);const auth={cookie:login.cookie,csrf:login.json.csrfToken};
 const pending=await req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:step,gameId:'shopping',settings:{count:9}},auth);
 assert.equal(pending.json.attempt.id,attempt);assert.equal(pending.json.attempt.rulesVersion,1);
 assert.deepEqual(pending.json.attempt.settings,settings);
 const round=oldCode(settings,old.seededRandom(17));const answer={mapping:round.symbols.map((x,digit)=>({digit,symbolId:x.id})),answers:round.messages.map(x=>x.join(''))};
 const saved=await req(`/api/attempts/${attempt}/submit`,'POST',{answer},auth);assert.equal(saved.status,200);assert.equal(saved.json.result.total,9);assert.equal(saved.json.result.rulesVersion,1);assert.equal(saved.json.result.stars,3);
 const duplicate=await req(`/api/attempts/${attempt}/submit`,'POST',{answer},auth);assert.equal(duplicate.json.duplicate,true);
 const oldClient=await req('/api/attempts','POST',{gameId:'code',settings},auth);assert.equal(oldClient.json.attempt.rulesVersion,1);
 const newClient=await req('/api/attempts','POST',{clientRulesVersion:2,gameId:'code',settings,rulesVersion:1},auth);assert.equal(newClient.json.attempt.rulesVersion,2);
 const badVersion=await req('/api/attempts','POST',{clientRulesVersion:99,gameId:'code',settings},auth);assert.equal(badVersion.status,400);
 const teacherLogin=await req('/api/auth/login','POST',{username:'version_teacher',password:'version-teacher-pass'});const teacherAuth={cookie:teacherLogin.cookie,csrf:teacherLogin.json.csrfToken};
 const created=await req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Új kilenctermékes feladat',studentIds:[student],steps:[{gameId:'shopping',settings:{level:2,difficulty:'hard',count:3},repetitions:1}]},teacherAuth);
 assert.equal(created.status,201);const newStep=created.json.assignment.steps[0];assert.equal(newStep.rulesVersion,2);assert.equal(newStep.settings.count,9);
 const cachedOld=await req('/api/attempts','POST',{assignmentStepId:newStep.id},auth);assert.equal(cachedOld.status,409);assert.equal(cachedOld.json.error.code,'CLIENT_UPDATE_REQUIRED');
 const progress=await req('/api/progress','GET',undefined,auth);assert.equal(progress.json.stars,5);assert.equal(progress.json.rounds,2);
 const detail=await req(`/api/teacher/results/${saved.json.result.id}`,'GET',undefined,teacherAuth);assert.equal(detail.json.result.total,9);assert.deepEqual(detail.json.result.answer,answer);

 const variants=[
  ['stations',{level:1,theme:'stations',count:3},3],['stations',{level:1,theme:'streets',count:3},3],['stations',{level:2},5],
  ...[1,2,3].map(level=>['faces',{level},5*level]),
  ['prices',{level:1,count:5},5],['prices',{level:2,count:3},6],
  ['shopping',{level:1},9],['shopping',{level:2,difficulty:'easy'},9],['shopping',{level:2,difficulty:'hard'},9],
  ['picture',{level:1,difficulty:'easy'},3],['picture',{level:1,difficulty:'hard'},3],['picture',{level:2},3],
  ...[1,2,3].flatMap(level=>['objects','abstract'].map(symbolSet=>['code',{level,symbolSet},3])),
 ];
 const bundle=await req('/api/teacher/assignments','POST',{clientRulesVersion:2,title:'Mind a húsz aktív változat',studentIds:[student],steps:variants.map(([gameId,settings])=>({gameId,settings,repetitions:1}))},teacherAuth);
 assert.equal(bundle.status,201);
 for(let i=0;i<variants.length;i++){
  const [gameId,,total]=variants[i],assigned=bundle.json.assignment.steps[i];
  const createdAttempt=await req('/api/attempts','POST',{clientRulesVersion:2,assignmentStepId:assigned.id},auth);
  assert.equal(createdAttempt.status,201,`${gameId} attempt: ${JSON.stringify(createdAttempt.json)}`);
  const attempt=createdAttempt.json.attempt,raw=perfectRaw(gameId,attempt.settings,attempt.seed);
  const expected=engine.scoreAttempt(gameId,attempt.settings,attempt.seed,raw,2);
  const forged=await req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:raw,correct:0,stars:0},auth);
  assert.equal(forged.status,400);assert.equal(forged.json.error.code,'CLIENT_SCORE_REJECTED');
  const submitted=await req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:raw},auth);
  assert.equal(submitted.status,200,`${gameId}: ${JSON.stringify(submitted.json)}`);
  assert.equal(submitted.json.result.correct,total);assert.equal(submitted.json.result.total,total);
  assert.equal(submitted.json.result.rulesVersion,2);assert.equal(submitted.json.result.stars,expected.stars);
  const repeated=await req(`/api/attempts/${attempt.id}/submit`,'POST',{answer:raw},auth);
  assert.equal(repeated.json.duplicate,true);assert.equal(repeated.json.result.id,submitted.json.result.id);
  const teacherDetail=await req(`/api/teacher/results/${submitted.json.result.id}`,'GET',undefined,teacherAuth);
  assert.deepEqual(teacherDetail.json.result.answer,raw);assert.deepEqual(teacherDetail.json.result.details,expected.details);
  assert.equal(teacherDetail.json.result.stars,expected.stars);
 }
 const freshLogin=await req('/api/auth/login','POST',{username:'version_student',password:'version-student-pass'});
 const freshAuth={cookie:freshLogin.cookie,csrf:freshLogin.json.csrfToken};
 const laterProgress=await req('/api/progress','GET',undefined,freshAuth);
 assert.equal(laterProgress.json.rounds,22,'all twenty v2 variants survive re-login beside historical results');
 const listed=await req('/api/results','GET',undefined,freshAuth);assert.equal(listed.json.results.filter(x=>x.rulesVersion===2).length,20);
});
