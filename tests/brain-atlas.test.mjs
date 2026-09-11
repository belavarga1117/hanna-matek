import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {decodeCortex} from '../dist/cognitive/brain-explorer.js';
import {BRAIN_TASKS,BRAIN_REGIONS} from '../dist/cognitive/brain-knowledge.js';
const base=new URL('../dist/assets/brain/',import.meta.url);
const atlas=JSON.parse(await readFile(new URL('atlas.json',base),'utf8'));
const arrayBuffer=buffer=>buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);

test('both shipped cortices preserve the pinned atlas counts, parcel coverage and valid geometry',async()=>{
  for(const hemisphere of atlas.hemispheres){
    const file=await readFile(new URL(hemisphere.file,base));
    assert.equal(createHash('sha256').update(file).digest('hex'),hemisphere.sha256);
    const mesh=decodeCortex(arrayBuffer(file));
    assert.equal(mesh.count,10242);assert.equal(mesh.triangles,20480);
    assert.ok([...mesh.positions,...mesh.sulc].every(Number.isFinite));
    assert.ok(mesh.indices.every(index=>index<mesh.count));
    assert.ok(mesh.labels.every(label=>label<atlas.labels.length));
    for(const [index,label] of atlas.labels.entries())assert.equal(mesh.labels.filter(x=>x===index).length,hemisphere.parcelCounts[label]);
    for(const region of Object.values(BRAIN_REGIONS))for(const parcel of region.parcels)assert.ok(hemisphere.parcelCounts[atlas.labels[parcel]]>0);
    assert.ok(mesh.positions.filter((_x,index)=>index%3===0).reduce((a,b)=>a+b,0)*(hemisphere.id==='left'?-1:1)>0,'left and right RAS signs must not be mirrored');
  }
});

test('decoder rejects truncated, wrong-version and wrong-resolution cortical data',async()=>{
  const buffer=arrayBuffer(await readFile(new URL(atlas.hemispheres[0].file,base)));
  assert.throws(()=>decodeCortex(buffer.slice(0,15)));
  assert.throws(()=>decodeCortex(buffer.slice(0,-1)));
  for(const [offset,value] of [[0,0],[12,2],[4,100]]){const copy=buffer.slice(0);new DataView(copy).setUint32(offset,value,true);assert.throws(()=>decodeCortex(copy));}
});

test('each task has a cited anatomical selection and deep structures are not relabeled as cortical parcels',()=>{
  assert.equal(Object.keys(BRAIN_TASKS).length,7);
  for(const task of Object.values(BRAIN_TASKS)){
    assert.ok(task.sources.length);
    for(const [region,side] of task.regions){assert.ok(BRAIN_REGIONS[region]);assert.ok(['left','right','both'].includes(side));}
    for(const source of task.sources)assert.equal(new URL(source.url).protocol,'https:');
  }
  assert.deepEqual(BRAIN_REGIONS.parahippocampal.parcels.map(id=>atlas.labels[id]),['G_oc-temp_med-Parahip']);
  assert.deepEqual(BRAIN_REGIONS.visual.parcels.map(id=>atlas.labels[id]),['G_oc-temp_lat-fusifor']);
  assert.match(BRAIN_TASKS['picture-place'].detail,/hippocampus mélyebben fekszik/);
});
