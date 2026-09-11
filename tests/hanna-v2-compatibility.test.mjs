import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as router from '../dist/hanna/engine.js';
import * as legacy from '../dist/hanna/engine-v1.js';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('explicit published V1 routes preserve content, settings and score while new defaults select V2',()=>{
  const settings=legacy.normalizeHannaSettings({hannaVersion:1,activity:'chain',itemCount:8,adaptive:false});
  const old=legacy.generateHannaSession(settings,20260911),routed=router.generateHannaSession(settings,20260911);
  assert.equal(digest(routed),digest(old));
  assert.deepEqual(router.normalizeHannaSettings(settings),settings);
  const answer={version:1,startedAt:'2026-09-11T00:00:00Z',completedAt:'2026-09-11T00:00:30Z',events:[],encoding:[],responses:old.recallTrials.map(trial=>({trialId:trial.id,value:trial.expected,rtMs:500,hintLevel:0})),encodingDurationMs:1000,delayDurationMs:settings.delayMs};
  assert.deepEqual(router.scoreHannaAttempt(settings,20260911,answer),legacy.scoreHannaAttempt(settings,20260911,answer));
  assert.equal(router.normalizeHannaSettings({activity:'chain'}).hannaVersion,2);
  assert.equal(router.generateHannaSession({activity:'chain'},20260911).version,2);
});
