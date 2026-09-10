import test from 'node:test';
import assert from 'node:assert/strict';
import {pointerDrag} from '../dist/drag.js';

function fixture(){
 const listeners=new Map(),classes=new Set(),targetClasses=new Set(),dropped=[];
 const target={disabled:false,classList:{add:x=>targetClasses.add(x),remove:x=>targetClasses.delete(x)}};
 const source={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);},setPointerCapture(id){this.captured=id;},hasPointerCapture(id){return this.captured===id;},releasePointerCapture(){this.captured=null;}};
 const root={isConnected:true,contains:x=>x===target};globalThis.document={elementFromPoint:()=>({closest:()=>target})};
 const event=(type,x=20)=>({type,currentTarget:source,pointerId:9,button:0,clientX:x,clientY:10,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}});
 pointerDrag(root,'.slot',x=>dropped.push(x))(event('pointerdown',10));
 return {listeners,classes,targetClasses,dropped,target,source,root,event};
}
test('real pointer movement drops once, releases capture and suppresses accidental source click',()=>{
 const f=fixture();f.listeners.get('pointermove')(f.event('pointermove',30));assert.ok(f.classes.has('is-dragging'));assert.ok(f.targetClasses.has('is-drop-target'));
 f.listeners.get('pointerup')(f.event('pointerup',30));assert.deepEqual(f.dropped,[f.target]);assert.equal(f.source.captured,null);assert.equal(f.listeners.has('pointermove'),false);
 const click=f.event('click');f.listeners.get('click')(click);assert.equal(click.stopped,true);
});
test('tap, cancelled gesture, disabled destination and detached game do not drop',()=>{
 for(const mode of ['tap','cancel','disabled','detached']){
  const f=fixture();if(mode!=='tap')f.listeners.get('pointermove')(f.event('pointermove',30));
  if(mode==='disabled')f.target.disabled=true;if(mode==='detached')f.root.isConnected=false;
  f.listeners.get(mode==='cancel'?'pointercancel':'pointerup')(f.event(mode==='cancel'?'pointercancel':'pointerup',30));
  assert.equal(f.dropped.length,0,mode);assert.equal(f.listeners.has('pointermove'),false,mode);
 }
});
