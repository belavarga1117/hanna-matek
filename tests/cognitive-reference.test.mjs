import test from 'node:test';
import assert from 'node:assert/strict';
import cognitiveReferenceData,{cognitiveReferenceData as named} from '../dist/cognitive/reference-data.js';

test('quantitative reference records keep point provenance, rights and personal comparison closed',()=>{
  assert.equal(cognitiveReferenceData,named);
  assert.equal(cognitiveReferenceData.length,9);
  const points=cognitiveReferenceData.flatMap(record=>record.table.values.map(value=>({record,value})));
  assert.equal(points.length,129);
  for(const record of cognitiveReferenceData){
    assert.match(record.url,/^https:\/\//);
    assert.equal(record.applicability.personalPercentile,false);
    assert.ok(['data-reuse','link-only'].includes(record.license.reuse));
    assert.ok(record.table.locator);
    for(const value of record.table.values){
      assert.equal(value.sourceId,record.sourceId);
      assert.equal(value.locator,record.table.locator);
      assert.equal(typeof value.ageLabel,'string');
      assert.equal(typeof value.metric,'string');
      assert.ok(value.n===null||Number.isInteger(value.n));
      assert.ok(value.mean===null||Number.isFinite(value.mean));
      assert.ok(value.sd===null||Number.isFinite(value.sd));
    }
  }
  assert.ok(cognitiveReferenceData.some(record=>record.task.name.includes('eCorsi')&&record.license.reuse==='data-reuse'));
  assert.ok(cognitiveReferenceData.some(record=>record.task.name.includes('Continuous Paired Associate')&&record.license.reuse==='data-reuse'));
  assert.ok(cognitiveReferenceData.some(record=>record.task.name.toLowerCase().includes('n-back')&&record.sample.ageMin===7&&record.sample.ageMax===13));
  assert.ok(cognitiveReferenceData.some(record=>record.task.name.includes('WAIS-R')&&record.license.reuse==='link-only'));
});

test('manual source-table spot checks retain the verified published values',()=>{
  const nback=cognitiveReferenceData.find(record=>record.sourceId==='10.3389/fpsyg.2015.01544');
  const boyAge7=nback.table.values.find(value=>value.ageLabel==='7'&&value.nBack===1&&value.subgroup?.sex==='boys');
  assert.equal(boyAge7.n,193);assert.equal(boyAge7.mean,8.05);assert.equal(boyAge7.sd,3.04);
  const cpal=cognitiveReferenceData.find(record=>record.sourceId==='10.1371/journal.pone.0101750');
  const age5to6Load8=cpal.table.values.find(value=>value.ageLabel==='5–6'&&value.memoryLoad===8);
  assert.equal(age5to6Load8.n,30);assert.equal(age5to6Load8.mean,73.9);assert.equal(age5to6Load8.sd,38);
});
