import {randomUUID} from 'node:crypto';
import {badRequest, conflict, forbidden, notFound} from './errors.js';
import {readJson, sendJson} from './http.js';
import {transaction} from './db.js';
import {sha256, stableStringify} from './security.js';

const GAME = 'hanna-method';
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MILESTONES = {
  'first-chain':'Premiere: az első Láncsztori', 'chain-10':'10 elemű lánc', 'chain-20':'20 elemű lánc',
  'first-palace':'Az első kész memóriapalota', 'faces-10':'10 arc felidézve',
  'digits-20':'20 számjegy felidézve', 'recall-24h':'24 óra után hibátlan', 'retention-7d':'7 nap után hibátlan',
};
const DAILY = [
  {activity:'association',label:'Asszociációs bemelegítés',minutes:2},
  {activity:'chain',label:'A mai fő technika',minutes:4},
  {activity:'random',label:'Közvetlen előhívás',minutes:2},
  {activity:'review',label:'Esedékes korábbi anyag',minutes:2},
  {activity:'boss',label:'Vegyes módszerpróba',minutes:2},
];
const jsonb = value => JSON.stringify(value);
const assertId = value => {
  if (typeof value !== 'string' || !ID_RE.test(value)) throw badRequest('Érvénytelen azonosító.', 'INVALID_ID');
  return value;
};
const text = (value, max, label) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw badRequest(`A(z) ${label} mező érvénytelen.`, 'INVALID_RESOURCE');
  return value.trim();
};
const ids = value => {
  if (value == null) return [];
  if (typeof value === 'string') value = value.split(',').filter(Boolean);
  if (!Array.isArray(value) || value.length > 30) throw badRequest('Túl sok erőforrás.', 'INVALID_RESOURCE');
  const list=value.map(assertId);
  if(new Set(list).size!==list.length)throw badRequest('Az erőforrások nem ismétlődhetnek.', 'INVALID_RESOURCE');
  return list;
};
export function hannaDailyPlan(results,dueCount,now=new Date()) {
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'});
  const today=day.format(now),done=new Set(results.filter(row=>day.format(new Date(row.created_at))===today).map(row=>row.settings.activity));
  return DAILY.map(item=>({...item,completed:done.has(item.activity),available:item.activity!=='review'||dueCount>0}));
}
export const hannaResourceRow = row => ({
  id:row.id,kind:row.kind,title:row.title,revision:row.revision,data:row.data,ready:row.ready,
  createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString(),
});
const reviewCardRow = row => ({
  id:row.id,sourceActivity:row.source_activity,label:row.snapshot.prompt,
  dueAt:row.due_at,lastReviewedAt:row.last_reviewed_at,intervalMs:Number(row.interval_ms),
});
async function ownedResource(db,userId,id,lock=false) {
  const found=await db.query(`SELECT * FROM hanna_resources WHERE id=$1 AND user_id=$2 AND NOT archived${lock?' FOR UPDATE':''}`,[assertId(id),userId]);
  if(!found.rowCount)throw notFound('A saját eszköz nem található.');
  return found.rows[0];
}
function normalizeResource(engine,kind,data) {
  try {
    const result=engine.normalizeHannaResource(kind,data);
    if(Buffer.byteLength(jsonb(result))>950_000)throw new Error('Az eszköz képei együtt túl nagyok.');
    return result;
  } catch(error) {throw badRequest(error.message || 'Érvénytelen saját eszköz.', 'INVALID_RESOURCE');}
}

// Called only after the common session/origin/CSRF gate in app.js.
export async function handleHannaRoute({req,res,url,pool,user,engine,resultRow}) {
  const pathname=url.pathname.replace(/\/+$/,'');
  if(!pathname.startsWith('/api/hanna/'))return false;
  if(!user)throw forbidden('A Hanna Módszer használatához jelentkezz be.');
  if(pathname==='/api/hanna/resources' && req.method==='GET') {
    const rows=await pool.query('SELECT * FROM hanna_resources WHERE user_id=$1 AND NOT archived ORDER BY updated_at DESC',[user.id]);
    sendJson(res,200,{resources:rows.rows.map(hannaResourceRow)});return true;
  }
  if(pathname==='/api/hanna/resources' && req.method==='POST') {
    const body=await readJson(req,1_000_000);
    const title=text(body.title,100,'név'),data=normalizeResource(engine,body.kind,body.data);
    const result=await transaction(pool,async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[user.id,'hanna-resources']);
      const count=await db.query('SELECT count(*)::int count FROM hanna_resources WHERE user_id=$1 AND NOT archived',[user.id]);
      if(count.rows[0].count>=100)throw conflict('Legfeljebb 100 saját eszköz tárolható. Archiválj egy régebbit.', 'RESOURCE_LIMIT');
      return db.query('INSERT INTO hanna_resources(id,user_id,kind,title,data) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),user.id,body.kind,title,jsonb(data)]);
    });
    sendJson(res,201,{resource:hannaResourceRow(result.rows[0])});return true;
  }
  const match=pathname.match(/^\/api\/hanna\/resources\/([^/]+)(\/readiness)?$/);
  if(match) {
    const id=assertId(match[1]);
    if(req.method==='PATCH' && !match[2]) {
      const body=await readJson(req,1_000_000);
      const resource=await transaction(pool,async db=>{
        const current=await ownedResource(db,user.id,id,true);
        if(body.revision!==current.revision)throw conflict('Az eszköz közben megváltozott. Töltsd újra a szerkesztőt.', 'RESOURCE_CHANGED');
        const title=text(body.title,100,'név'),data=normalizeResource(engine,current.kind,body.data);
        const next=await db.query('UPDATE hanna_resources SET title=$2,data=$3,revision=revision+1,ready=false,updated_at=now() WHERE id=$1 RETURNING *',[id,title,jsonb(data)]);
        return hannaResourceRow(next.rows[0]);
      });
      sendJson(res,200,{resource});return true;
    }
    if(req.method==='DELETE' && !match[2]) {
      await transaction(pool,async db=>{await ownedResource(db,user.id,id,true);await db.query('UPDATE hanna_resources SET archived=true,updated_at=now() WHERE id=$1',[id]);});
      sendJson(res,200,{ok:true});return true;
    }
    if(req.method==='POST' && match[2]) {
      const body=await readJson(req);
      const output=await transaction(pool,async db=>{
        const current=await ownedResource(db,user.id,id,true);
        if(current.kind!=='palace')throw badRequest('Útvonalpróba palotához tartozik.', 'INVALID_RESOURCE');
        if(body.revision!==current.revision)throw conflict('A palota közben megváltozott. Indíts új útvonalpróbát.', 'RESOURCE_CHANGED');
        const locations=current.data.locations;
        if(!Array.isArray(body.answers)||body.answers.length!==locations.length)throw badRequest('Minden memóriahelyre adj választ.', 'INVALID_ANSWER');
        let readiness;
        try {readiness=engine.evaluatePalaceReadiness(hannaResourceRow(current),body);}
        catch(error){throw badRequest(error.message,'INVALID_ANSWER');}
        const {correct,percent,ready}=readiness;
        const updated=await db.query('UPDATE hanna_resources SET ready=$2,updated_at=now() WHERE id=$1 RETURNING *',[id,ready]);
        if(ready&&user.role==='student')await awardMilestone(db,user.id,'first-palace',null);
        return {resource:hannaResourceRow(updated.rows[0]),correct,total:locations.length,percent,ready};
      });
      sendJson(res,200,output);return true;
    }
  }
  if(pathname==='/api/hanna/dashboard' && req.method==='GET') {
    let studentId=user.id;
    const requested=url.searchParams.get('studentId');
    if(requested && requested!==user.id) {
      assertId(requested);
      if(user.role!=='teacher')throw forbidden();
      const found=await pool.query("SELECT id FROM users WHERE id=$1 AND created_by=$2 AND role='student'",[requested,user.id]);
      if(!found.rowCount)throw notFound('A tanuló nem található.');
      studentId=requested;
    }
    const [resources,cards,dueSummary,results,milestones]=await Promise.all([
      studentId===user.id?pool.query('SELECT * FROM hanna_resources WHERE user_id=$1 AND NOT archived ORDER BY updated_at DESC',[user.id]):Promise.resolve({rows:[]}),
      pool.query(`SELECT c.* FROM hanna_review_cards c LEFT JOIN attempts a ON a.id=c.reserved_attempt_id WHERE c.student_id=$1 AND c.due_at<=now() AND (c.reserved_attempt_id IS NULL OR a.expires_at<=now() OR a.submitted_at IS NOT NULL) ORDER BY c.due_at LIMIT 100`,[studentId]),
      pool.query(`SELECT count(*) FILTER(WHERE c.due_at<=now() AND (c.reserved_attempt_id IS NULL OR a.expires_at<=now() OR a.submitted_at IS NOT NULL))::int count,min(c.due_at) FILTER(WHERE c.due_at>now()) next_due_at FROM hanna_review_cards c LEFT JOIN attempts a ON a.id=c.reserved_attempt_id WHERE c.student_id=$1`,[studentId]),
      pool.query("SELECT * FROM results WHERE student_id=$1 AND game_id='hanna-method' ORDER BY created_at DESC LIMIT 500",[studentId]),
      pool.query('SELECT * FROM hanna_milestones WHERE student_id=$1 ORDER BY achieved_at',[studentId]),
    ]);
    sendJson(res,200,{
      resources:resources.rows.map(hannaResourceRow),due:cards.rows.map(row=>studentId===user.id?reviewCardRow(row):{...reviewCardRow(row),label:"Esedékes saját tananyag"}),dueCount:dueSummary.rows[0].count,
      nextDueAt:dueSummary.rows[0].next_due_at,results:results.rows.map(row=>resultRow(row,false,studentId!==user.id)),
      milestones:milestones.rows.map(row=>({id:row.milestone_id,label:MILESTONES[row.milestone_id]||row.milestone_id,at:row.achieved_at})),
      dailyPlan:hannaDailyPlan(results.rows,dueSummary.rows[0].count),serverNow:new Date().toISOString(),
    });return true;
  }
  throw notFound('A Hanna Módszer művelet nem található.');
}

export async function resolveHannaResources(db,userId,settings,engine,{assignment=false}={}) {
  // Only IDs are accepted from untrusted callers. Snapshot objects are server-owned.
  const {resourceSnapshot:_snapshot,reviewSnapshot:_review,customContent:_custom, ...raw}=settings||{};
  const resourceIds=ids(raw.resourceIds);
  const resourceSnapshot=[];
  for(const id of resourceIds) {
    const row=await ownedResource(db,userId,id);
    resourceSnapshot.push(hannaResourceRow(row));
  }
  if(raw.activity==='palace'&&!resourceSnapshot.some(resource=>resource.kind==='palace'&&resource.ready))throw badRequest('Előbb készíts és tanulj meg egy saját palotát.', 'PALACE_NOT_READY');
  if(raw.activity==='review'&&assignment&&ids(raw.reviewIds).length)throw badRequest('Kiosztásban minden tanuló a saját esedékes anyagát kapja.', 'INVALID_GAME_SETTINGS');
  return engine.normalizeHannaSettings({...raw,resourceIds,resourceSnapshot});
}

function adaptationIdentity(settings) {
  const {itemCount:_count,encodingMs:_encoding,resourceSnapshot:_snapshot,reviewSnapshot:_review,...identity}=settings;
  return stableStringify(identity);
}
export async function adaptHannaSettings(db,studentId,settings,stepId,engine) {
  if(!settings.adaptive||settings.activity==='review')return settings;
  const previous=await db.query("SELECT settings,metrics FROM results WHERE student_id=$1 AND game_id='hanna-method' AND assignment_step_id IS NOT DISTINCT FROM $2::uuid ORDER BY created_at DESC LIMIT 100",[studentId,stepId]);
  const matching=previous.rows.find(row=>adaptationIdentity(row.settings)===adaptationIdentity(settings));
  const next=matching?.metrics?.adaptation?.nextItemCount;
  return Number.isInteger(next)?engine.normalizeHannaSettings({...settings,itemCount:next}):settings;
}
export async function prepareHannaReview(db,studentId,settings,engine) {
  const requested=ids(settings.reviewIds);
  const rows=await db.query(`SELECT c.* FROM hanna_review_cards c LEFT JOIN attempts a ON a.id=c.reserved_attempt_id
    WHERE c.student_id=$1 AND c.due_at<=now() AND (c.reserved_attempt_id IS NULL OR a.expires_at<=now() OR a.submitted_at IS NOT NULL)
    AND ($2::uuid[] IS NULL OR c.id=ANY($2::uuid[])) ORDER BY c.due_at LIMIT $3 FOR UPDATE OF c`,[studentId,requested.length?requested:null,settings.itemCount||5]);
  if(!rows.rowCount)throw conflict('Most nincs esedékes ismétlésed. A megtanult elemek először 10 perc múlva térnek vissza.', 'NO_REVIEWS_DUE');
  if(requested.length&&rows.rowCount!==requested.length)throw conflict('A kiválasztott ismétlés még nem esedékes vagy már folyamatban van.', 'REVIEW_NOT_DUE');
  const reviewSnapshot=rows.rows.map(row=>({...row.snapshot,id:row.id,sourceItemId:row.source_item_id,sourceActivity:row.source_activity,learnedAt:new Date(row.learned_at).toISOString(),lastReviewedAt:row.last_reviewed_at?new Date(row.last_reviewed_at).toISOString():null,intervalMs:Number(row.interval_ms)}));
  return engine.normalizeHannaSettings({...settings,itemCount:reviewSnapshot.length,reviewSnapshot});
}
export async function reserveHannaReview(db,settings,attemptId) {
  if(settings.activity!=='review')return;
  for(const item of settings.reviewSnapshot||[])await db.query('UPDATE hanna_review_cards SET reserved_attempt_id=$2 WHERE id=$1',[item.id,attemptId]);
}
function checkpointIdentity(answer,plan) {
  const immediateIds=new Set(plan.recallTrials.filter(trial=>trial.phase==='immediate').map(trial=>trial.id));
  return {encoding:answer.encoding||[],training:answer.training||[],encodingDurationMs:answer.encodingDurationMs||0,
    responses:(answer.responses||[]).filter(response=>immediateIds.has(response.trialId)),
    restarts:(answer.events||[]).filter(event=>event.type==='restart')};
}
export function hannaCheckpointHash(settings,seed,answer,engine) {
  const plan=engine.generateHannaSession(settings,seed);
  if(!answer||answer.version!==1||!Array.isArray(answer.responses)||!Array.isArray(answer.encoding)||!Array.isArray(answer.events))throw badRequest('Érvénytelen kódolási állapot.', 'INVALID_DELAY_CHECKPOINT');
  const immediate=new Set(plan.recallTrials.filter(trial=>trial.phase==='immediate').map(trial=>trial.id));
  if(answer.responses.some(response=>!immediate.has(response?.trialId)))throw badRequest('Felidézés előtti állapot szükséges.', 'INVALID_DELAY_CHECKPOINT');
  if(new Set(answer.responses.map(response=>response.trialId)).size!==answer.responses.length)throw badRequest('Egy feladatra csak egy válasz küldhető.', 'INVALID_DELAY_CHECKPOINT');
  try {const checked=engine.scoreHannaAttempt(settings,seed,answer);if(plan.training&&!checked.metrics.subscales?.training?.passed)throw new Error('Előbb teljesítsd a technika betanító próbáját.');}
  catch(error){throw badRequest(error.message||'Érvénytelen kódolási állapot.', 'INVALID_DELAY_CHECKPOINT');}
  return sha256(stableStringify(checkpointIdentity(answer,plan)));
}
export function validateHannaCompletion(attempt,answer,engine,now=Date.now()) {
  if(attempt.settings.activity==='review')return;
  if(Number(attempt.settings.delayMs)<=0)return;
  if(!attempt.available_at||!attempt.delay_checkpoint_at||!attempt.delay_checkpoint_hash)throw conflict('A köztes feladat még nem kezdődött el.', 'DELAY_NOT_STARTED');
  if(new Date(attempt.available_at).valueOf()>now)throw conflict('A köztes feladat ideje még nem telt le.', 'DELAY_NOT_COMPLETE');
  const plan=engine.generateHannaSession(attempt.settings,Number(attempt.seed));
  const hash=sha256(stableStringify(checkpointIdentity(answer,plan)));
  if(hash!==attempt.delay_checkpoint_hash)throw conflict('A kódolás közben újrakezdődött. Játssz le egy teljes új kört.', 'DELAY_CHECKPOINT_CHANGED');
}
async function awardMilestone(db,studentId,id,resultId) {
  await db.query('INSERT INTO hanna_milestones(student_id,milestone_id,result_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[studentId,id,resultId]);
}
export async function saveHannaLearning(db,{attempt,result,score,answer,engine,now=new Date()}) {
  const studentId=attempt.student_id;
  const settings=attempt.settings;
  if(settings.activity==='review') {
    const outcomes=new Map((score.metrics.reviewOutcomes||[]).map(item=>[item.itemId,item]));
    let allIndependent=true,minRetention=Infinity;
    for(const snapshot of settings.reviewSnapshot||[]) {
      const found=await db.query('SELECT * FROM hanna_review_cards WHERE id=$1 AND student_id=$2 FOR UPDATE',[snapshot.id,studentId]);
      if(!found.rowCount)throw conflict('Az ismétlés már nem elérhető.', 'REVIEW_UNAVAILABLE');
      const card=found.rows[0];
      if(card.reserved_attempt_id!==attempt.id)throw conflict('Ez az ismétlés már másik körben folytatódik.', 'REVIEW_CHANGED');
      const outcome=outcomes.get(snapshot.id)||{correct:false,rtMs:null,hintLevel:0};
      const correct=outcome.correct===true&&outcome.hintLevel<4;
      const retentionMs=Math.max(0,now.valueOf()-new Date(card.last_reviewed_at||card.learned_at).valueOf());
      const intervalMs=engine.nextHannaReview({correct,rtMs:outcome.rtMs,hintLevel:outcome.hintLevel,previousIntervalMs:Number(card.interval_ms)});
      await db.query('INSERT INTO hanna_review_history(card_id,result_id,correct,rt_ms,hint_level,retention_ms,reviewed_at) VALUES($1,$2,$3,$4,$5,$6,$7)',[card.id,result.id,correct,outcome.rtMs==null?null:Math.round(outcome.rtMs),outcome.hintLevel||0,retentionMs,now]);
      await db.query('UPDATE hanna_review_cards SET last_reviewed_at=$2,due_at=$3,interval_ms=$4,review_count=review_count+1,reserved_attempt_id=NULL WHERE id=$1',[card.id,now,new Date(now.valueOf()+intervalMs),intervalMs]);
      minRetention=Math.min(minRetention,retentionMs);
      if(!correct||outcome.hintLevel>0)allIndependent=false;
    }
    if(allIndependent&&minRetention>=24*3600_000)await awardMilestone(db,studentId,'recall-24h',result.id);
    if(allIndependent&&minRetention>=7*24*3600_000)await awardMilestone(db,studentId,'retention-7d',result.id);
  } else {
    const plan=engine.generateHannaSession({...settings,...(attempt.private_settings?.hannaResourceSnapshot?{resourceSnapshot:attempt.private_settings.hannaResourceSnapshot}:{})},Number(attempt.seed));
    // These exact frozen questions return later, never a newly generated list.
    for(const item of plan.reviewItems||[]) {
      const snapshot={...item};
      const contentIds=new Set((item.content||[]).map(content=>content.id));
      const association=(answer.encoding||[]).find(entry=>contentIds.has(entry.itemId)&&entry.association)?.association;
      if(association){let cue=association;for(const target of [snapshot.expected,...(snapshot.accepted||[])].flat().filter(value=>typeof value==='string'&&value.length>1)){const escaped=target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');cue=cue.replace(new RegExp(escaped,'giu'),'[…]');}snapshot.hints=[snapshot.hints[0],`A saját képed: ${cue}`.slice(0,500),snapshot.hints[2]];}
      await db.query('INSERT INTO hanna_review_cards(id,student_id,source_result_id,source_item_id,source_activity,snapshot,learned_at,due_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(source_result_id,source_item_id) DO NOTHING',[randomUUID(),studentId,result.id,item.id,settings.activity,jsonb(snapshot),now,new Date(now.valueOf()+600_000)]);
    }
    if(settings.activity==='chain') {
      await awardMilestone(db,studentId,'first-chain',result.id);
      if(score.metrics.accuracy===1&&score.metrics.assistedCorrect===0) {
        if(settings.itemCount>=10)await awardMilestone(db,studentId,'chain-10',result.id);
        if(settings.itemCount>=20)await awardMilestone(db,studentId,'chain-20',result.id);
      }
    }
    if(settings.activity==='faces'&&settings.itemCount>=10&&score.metrics.accuracy===1&&score.metrics.assistedCorrect===0)await awardMilestone(db,studentId,'faces-10',result.id);
    if(settings.activity==='numbers'&&score.metrics.accuracy===1&&score.metrics.assistedCorrect===0&&Number(score.metrics.subscales?.number?.digitsTotal)>=20)await awardMilestone(db,studentId,'digits-20',result.id);
  }
}

export function splitHannaPrivateSettings(settings) {
  const full=settings.resourceSnapshot||[];
  let hasPrivate=false;
  const safe=full.map(resource=>{
    if(resource.kind!=='material'||!resource.data?.rubric)return resource;
    const rubric=resource.data.rubric.map(row=>{if(row.accepted?.length)hasPrivate=true;const {accepted,...publicRow}=row;return publicRow;});
    return {...resource,data:{...resource.data,rubric}};
  });
  const fullReview=settings.reviewSnapshot||[];
  const safeReview=fullReview.map(item=>{const {accepted,...visible}=item;return visible;});
  const hasReviewPrivate=fullReview.some(item=>item.accepted?.length);
  return {settings:{...settings,resourceSnapshot:safe,reviewSnapshot:safeReview},privateSettings:hasPrivate||hasReviewPrivate?{...(hasPrivate?{hannaResourceSnapshot:full}:{}),...(hasReviewPrivate?{hannaReviewSnapshot:fullReview}:{})}:null};
}
