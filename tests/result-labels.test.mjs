import test from 'node:test';
import assert from 'node:assert/strict';
import {resultDetailLabel} from '../dist/result-labels.js';
test('teacher sees round positions 1–5 while stored portrait ids and answers stay unchanged',()=>{
 const details=[12,2,7,8,10].flatMap(id=>['név','szakterület','rendelő'].map(field=>({label:`${id}. portré – ${field}`,actual:'eredeti válasz'})));
 const result={gameId:'faces',rulesVersion:2,settings:{level:3},details};const snapshot=structuredClone(result);
 const labels=details.map((detail,index)=>resultDetailLabel(result,detail,index));
 assert.deepEqual(labels.map(label=>Number(label.split('.')[0])),[1,1,1,2,2,2,3,3,3,4,4,4,5,5,5]);
 assert.deepEqual(result,snapshot);
 assert.equal(resultDetailLabel({...result,rulesVersion:1},details[0],0),'12. portré – név','v1 display contract is kept');
});
