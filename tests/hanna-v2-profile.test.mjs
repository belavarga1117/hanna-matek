import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHannaSkillProfile,describeHannaSkillChange} from '../dist/hanna/profile.js';
const row=(id,day,key,dimensions)=>({id,at:`2026-09-${day}T12:00:00Z`,settings:{activity:'chain'},metrics:{schemaVersion:2,comparabilityKey:key,dimensions}});
test('skill profile does not fabricate missing data, merge units or compare unlike task settings',()=>{
  const result=buildHannaSkillProfile([
    row('a','10','same',{immediateRecall:{value:.5,unit:'ratio'},encodingSpeed:{value:4,unit:'items/min'}}),
    row('b','11','other',{immediateRecall:{value:1,unit:'ratio'}}),
    row('c','12','same',{immediateRecall:{value:.8,unit:'ratio'},encodingSpeed:{value:1000,unit:'ms'}}),
  ]);
  const immediate=result.find(d=>d.id==='immediateRecall');
  assert.equal(immediate.baseline.value,.5);assert.equal(immediate.current.value,.8);assert.deepEqual(immediate.series.map(row=>row.resultId),['a','c']);
  assert.equal(result.find(d=>d.id==='encodingSpeed').current.value,4);
  assert.equal(result.find(d=>d.id==='nameMemory').current,null);
});
test('long-term dimension requires actual retention >=24h and never treats a null metric as zero',()=>{
  let profile=buildHannaSkillProfile([row('a','10','same',{longTermRetention:{value:1,unit:'ratio',retentionMs:600000},randomAccess:{value:null,unit:'ms'}})]);
  assert.equal(profile.find(d=>d.id==='longTermRetention').current,null);assert.equal(profile.find(d=>d.id==='randomAccess').current,null);
  profile=buildHannaSkillProfile([row('b','11','same',{longTermRetention:{value:.7,unit:'ratio',retentionMs:86400000}})]);
  assert.equal(profile.find(d=>d.id==='longTermRetention').current.value,.7);
});

test('response-time changes explicitly distinguish slower from faster instead of praising a positive delay',()=>{
 const p=buildHannaSkillProfile([row('a','10','same',{randomAccess:{value:6000,unit:'ms'}}),row('b','11','same',{randomAccess:{value:8500,unit:'ms'}})]).find(d=>d.id==='randomAccess');
 assert.equal(p.direction,'lower');assert.equal(describeHannaSkillChange(p),'2,5 mp-cel lassabb');
 assert.equal(describeHannaSkillChange({...p,delta:-1500}),'1,5 mp-cel gyorsabb');
 assert.equal(describeHannaSkillChange({...p,delta:0}),'Nem változott');
});
