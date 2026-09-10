import test from 'node:test';
import assert from 'node:assert/strict';
import {advancedGames,generateCodeRound,generatePictureRounds} from '../dist/games/advanced-games.js';
import {seededRandom,normalizeGameSettings,scoreAttempt} from '../dist/game-engine.js';

class Element {
 constructor(tag,text=''){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.style={};this.className='';this.disabled=false;this.value='';this.own=text;this.classList={toggle:(key,on)=>{const set=new Set(this.className.split(' '));on?set.add(key):set.delete(key);this.className=[...set].join(' ');}};}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;this.own='';}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 dispatch(e){for(const fn of this.listeners[e.type]||[])fn(e);}
 click(){if(!this.disabled)this.dispatch({type:'click'});}
 focus(){}
 get textContent(){return this.own+this.children.map(x=>x.textContent).join('');}
 set textContent(v){this.own=String(v);this.children=[];}
}
function all(root,predicate){return [...(predicate(root)?[root]:[]),...root.children.flatMap(x=>all(x,predicate))];}
function cls(root,name){return all(root,x=>x.className.split(' ').includes(name));}
function button(root,label){const b=all(root,x=>x.tagName==='button'&&x.textContent===label)[0];assert.ok(b,`visible button ${label}`);return b;}
function harness(game,rawSettings,seed){
 globalThis.Node=Element;globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text)};
 const settings=normalizeGameSettings(game,rawSettings),root=new Element('root'),done=[];let recall;
 advancedGames[game].mount({root,settings,rand:seededRandom(seed),phase(){},memorize(fn){recall=fn;},done:(local,answer)=>done.push({local,answer})});
 return {root,settings,done,recall:()=>recall()};
}

test('mounted ATM edits a key from the full pool and preserves exhausted attempts through solution display',()=>{
 const seed=728,game=harness('code',{level:1,symbolSet:'abstract'},seed),round=generateCodeRound(game.settings,seededRandom(seed));
 let selects=all(game.root,x=>x.tagName==='select');assert.equal(selects.length,10);assert.equal(selects[0].children.length,16);
 const extra=round.pool.find(x=>!round.symbols.some(y=>y.id===x.id));selects[0].value=extra.id;selects[0].dispatch({type:'change'});
 button(game.root,'Megjegyzem').click();game.recall();
 const enter=value=>{for(let i=0;i<value.length;i++){button(game.root,value[i]).click();assert.equal(cls(game.root,'code-position').findIndex(x=>x.className.includes('is-active')),i,'entering a digit stays on the current position');if(i<value.length-1)button(game.root,'→').click();}button(game.root,'Ellenőrzés').click();};
 const values=round.messages.map(x=>x.join('')),wrong=String((Number(values[0][0])+1)%10)+values[0].slice(1);
 enter(wrong);assert.equal(cls(game.root,'code-position').filter(x=>x.textContent==='–').length,3);enter(wrong);
 assert.match(game.root.textContent,new RegExp(`A helyes kód: ${values[0]}`));button(game.root,'Tovább').click();
 enter(values[1]);button(game.root,'Tovább').click();enter(values[2]);button(game.root,'Befejezés').click();
 assert.equal(game.done.length,1);const raw=game.done[0].answer;assert.equal(raw.mapping[0].symbolId,extra.id);
 assert.deepEqual(raw.answers[0].attempts,[wrong,wrong]);assert.equal(game.done[0].local.correct,2);
 const scored=scoreAttempt('code',game.settings,seed,raw);assert.equal(scored.correct,2);assert.equal(scored.total,3);assert.equal(scored.stars,1);
});

test('mounted Storyboard resets four slots, freezes both failed attempts and scores complete sequences after showing a solution',()=>{
 const seed=329,game=harness('picture',{level:2},seed),rounds=generatePictureRounds(game.settings,seededRandom(seed));
 const fill=ids=>{for(let index=0;index<4;index++){const source=cls(game.root,'scene-choice').find(x=>x.dataset.sceneId===ids[index]);assert.equal(source.attributes.draggable,'true');source.click();cls(game.root,'scene-drop')[index].click();}button(game.root,'Ellenőrzés').click();};
 game.recall();assert.equal(cls(game.root,'scene-drop').filter(x=>x.dataset.empty==='true').length,4);
 const ordered=rounds[0].sequence.map(x=>x.id),wrong=[ordered[1],ordered[0],...ordered.slice(2)];fill(wrong);
 assert.equal(cls(game.root,'scene-drop').filter(x=>x.dataset.empty==='true').length,4);fill(wrong);
 button(game.root,'Megoldás megtekintése').click();button(game.root,'Tovább').click();game.recall();
 fill(rounds[1].sequence.map(x=>x.id));button(game.root,'Tovább').click();game.recall();fill(rounds[2].sequence.map(x=>x.id));button(game.root,'Tovább').click();
 const raw=game.done[0].answer;assert.deepEqual(raw.rounds[0].attempts,[{itemIds:wrong},{itemIds:wrong}]);
 const scored=scoreAttempt('picture',game.settings,seed,raw);assert.equal(scored.correct,2);assert.equal(scored.total,3);assert.equal(scored.stars,1);
});
