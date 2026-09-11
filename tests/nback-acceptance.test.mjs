import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSession,scoreSession,normalizeConfig,channelsForConfig} from '../dist/nback/engine.js';

function fixture(raw,rows,targets){
 const config=normalizeConfig(raw),session=generateSession({seed:818,config});
 assert.equal(rows.length,session.trials.length);
 session.trials=session.trials.map((trial,index)=>({...trial,index,warmup:index<config.n,targetIndex:targets?.[index]??(index<config.n?null:index-config.n),stimuli:{...trial.stimuli,...rows[index]}}));
 return session;
}
const answer=pairs=>({version:1,events:pairs.map(([trialIndex,channel,value=true])=>({trialIndex,channel,value,atMs:100}))});

test('independent Position 2-back oracle: two real matches, floor scoring, silence, spam, and warmup',()=>{
 const session=fixture({mode:10,n:2,trialCount:4},[1,2,1,3,4,3].map(position=>({positions:[position],objects:[{id:1,position,color:1,image:1}]})));
 const perfect=scoreSession(session,answer([[2,'position1'],[5,'position1']]));assert.equal(perfect.percent,100);
 const partial=scoreSession(session,answer([[2,'position1'],[3,'position1']]));assert.equal(partial.percent,33);
 assert.deepEqual(partial.metrics.totals,{hits:1,falseAlarms:1,misses:1,correctRejections:1});
 assert.equal(scoreSession(session,answer([])).percent,0);
 assert.equal(scoreSession(session,answer([2,3,4,5].map(i=>[i,'position1']))).percent,50);
 assert.equal(scoreSession(session,answer([[0,'position1'],[1,'position1'],[2,'position1'],[5,'position1']])).percent,100);
});

test('independent Combination oracle keeps visual→past-audio and audio→past-visual separate',()=>{
 const rows=[[1,2],[2,1],[2,2],[1,2],[1,1]].map(([visual,audio])=>({visual,audio,image:visual}));
 const session=fixture({mode:4,n:1,trialCount:4},rows);
 const expected=[[1,'visaudio'],[1,'audiovis'],[2,'visvis'],[2,'audiovis'],[3,'audiovis'],[3,'audio'],[4,'visvis'],[4,'audiovis']];
 const result=scoreSession(session,answer(expected));assert.equal(result.percent,100);
 assert.deepEqual(Object.fromEntries(result.metrics.channels.map(c=>[c.id,c.hits])),{visvis:2,visaudio:1,audiovis:4,audio:1});
 const reversed=expected.map(([i,c])=>[i,c==='visaudio'?'audiovis':c==='audiovis'?'visaudio':c]);
 assert.ok(scoreSession(session,answer(reversed)).percent<100);
});

test('independent Crab blocks compare against reverse prior block including a second boundary',()=>{
 const session=fixture({mode:10,n:3,trialCount:6,crab:true},[1,2,3,3,4,1,1,4,8].map(position=>({positions:[position],objects:[{id:1,position,color:1,image:1}]})),[null,null,null,2,1,0,5,4,3]);
 assert.equal(scoreSession(session,answer([3,5,6,7].map(i=>[i,'position1']))).percent,100);
 assert.equal(scoreSession(session,answer([4,8].map(i=>[i,'position1']))).percent,0);
});

test('multi-stim object swap is two nonmatches even when the occupied cells stay the same',()=>{
 const positions=[[1,2],[2,1],[2,3],[4,3],[4,3]];
 const session=fixture({mode:10,n:1,trialCount:4,multiStim:2},positions.map(pair=>({positions:pair,objects:pair.map((position,i)=>({id:i+1,position,color:i+1,image:1}))})));
 const result=scoreSession(session,answer([[2,'position1'],[3,'position2'],[4,'position1'],[4,'position2']]));
 assert.equal(result.percent,100);
 const swap=scoreSession(session,answer([[1,'position1'],[1,'position2']]));assert.equal(swap.metrics.totals.falseAlarms,2);assert.equal(swap.metrics.totals.hits,0);
 assert.equal(channelsForConfig(session.config).length,2);
});

test('arithmetic order, negative result, exact fraction and explicit zero are independently specified',()=>{
 const session=fixture({mode:7,n:1,trialCount:4,allowFractions:true},[3,5,2,0,4].map(number=>({number})));
 session.trials[1].operation='-';session.trials[2].operation='/';session.trials[3].operation='*';session.trials[4].operation='+';
 const correct=answer([[1,'arithmetic','-2'],[2,'arithmetic','5/2'],[3,'arithmetic','0'],[4,'arithmetic','4']]);
 assert.equal(scoreSession(session,correct).percent,100);
 const missingZero=scoreSession(session,answer([[1,'arithmetic','-2'],[2,'arithmetic','2.5'],[4,'arithmetic','4']]));
 assert.equal(missingZero.percent,75);assert.equal(missingZero.metrics.totals.misses,1);
 assert.equal(scoreSession(session,answer([])).percent,0);
});

test('audible fixed trials leave enough time for natural speech; pure visuals keep the fast range',()=>{
  assert.throws(()=>generateSession({seed:1,config:{mode:2,intervalMs:1100}}),/1200/);
  assert.throws(()=>generateSession({seed:1,config:{mode:7,intervalMs:400}}),/1200/);
  assert.doesNotThrow(()=>generateSession({seed:1,config:{mode:10,intervalMs:400}}));
  assert.doesNotThrow(()=>generateSession({seed:1,config:{mode:2,intervalMs:400,selfPaced:true}}));
});
