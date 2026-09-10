import {h,shuffle,sample} from '../core.js';

export const COLORS=['#6844b6','#e3a224','#269e91','#e46c5f'];
export const SHAPES=['●','▲','■','◆'];
export function makePictureRound(difficulty='normal',rng=Math.random){
  const size=difficulty==='easy'?4:difficulty==='hard'?9:6,target=Array.from({length:size},()=>({shape:Math.floor(rng()*4),color:Math.floor(rng()*4)})),changed=sample(Array.from({length:size},(_,i)=>i),3,rng);
  const variants=changed.map((index,k)=>target.map((value,i)=>i===index?{...value,[k%2?'shape':'color']:(value[k%2?'shape':'color']+1+k)%4}:{...value}));
  return {target,choices:shuffle([{picture:target,correct:true},...variants.map(picture=>({picture,correct:false}))],rng),size};
}

const SCENE_LABELS=[
  'Konyha – piros bögre baloldalt','Konyha – sárga bögre','Konyha – zöld bögre és egy alma','Konyha – piros bögre jobboldalt',
  'Park – piros labda és fehér virág','Park – kék labda és sárga virág','Park – zöld labda és rózsaszín virág','Park – narancssárga labda és lila virág',
  'Íróasztal – piros füzet és három építőkocka','Íróasztal – kék füzet és három építőkocka','Íróasztal – zöld füzet és egy piros kocka','Íróasztal – lila füzet és négy építőkocka',
  'Olvasósarok – piros párna és zöld könyv','Olvasósarok – sárga párna és piros könyv','Olvasósarok – zöld párna és kék könyv','Olvasósarok – mintás párna és lila könyv',
];
const SCENE_X=[0.1,33.33,66.61,99.9];
const SCENE_Y=[0.73,33.6,65.54,99.14];
export const SCENES=Object.freeze(SCENE_LABELS.map((label,index)=>({id:`scene-${index}`,label,row:Math.floor(index/4),column:index%4})));
function expandedSceneChoices(family,target,difficulty){
  if(difficulty!=='hard')return family;
  const warm=family[(target.column+1)%family.length],cool=family[(target.column+2)%family.length];
  return [...family,{...warm,id:`${warm.id}-warm`,label:`${warm.label} – meleg színváltozat`,filter:'saturate(.82) hue-rotate(12deg) brightness(1.05)'},{...cool,id:`${cool.id}-cool`,label:`${cool.label} – hűvös színváltozat`,filter:'saturate(1.18) hue-rotate(-12deg) contrast(1.05)'}];
}
export function generatePictureRounds(settings,rng=Math.random){
  const rounds=[];
  for(let index=0;index<settings.rounds;index+=1){
    const row=Math.floor(rng()*4),family=SCENES.filter(scene=>scene.row===row);
    if(settings.level===2){const sequence=shuffle(family,rng);rounds.push({sequence,choices:shuffle(family,rng)});}
    else {const target=family[Math.floor(rng()*family.length)],choices=expandedSceneChoices(family,target,settings.difficulty);rounds.push({target,choices:shuffle(choices,rng)});}
  }
  return rounds;
}
function scene(scene,label,button=false){return h(button?'button':'div',{...(button?{type:'button'}:{}),className:`scene-card${button?' scene-choice':''}`,'aria-label':label,style:{backgroundImage:"url('./assets/scenes.png')",backgroundSize:'404% 424%',backgroundPosition:`${SCENE_X[scene.column]}% ${SCENE_Y[scene.row]}%`,filter:scene.filter||''}},h('span',{className:'sr-only'},label));}
function labelFor(round,id){return [...(round.choices||[]),...(round.sequence||[]),...(round.target?[round.target]:[])].find(item=>item.id===id)?.label||'Ismeretlen jelenet';}
function detail(expected,actual,index){return {label:`${index+1}. kör`,expected,actual:actual||'—',correct:expected===actual};}
function pictureMount(ctx){
  const settings={...ctx.settings,level:Number(ctx.settings.level)||1,rounds:Number(ctx.settings.rounds)||3},rounds=generatePictureRounds(settings,ctx.rand),rawRounds=[],details=[];let correct=0,index=0,finished=false;
  function study(){
    const round=rounds[index];ctx.phase(`${index+1}. képkör`,settings.level===2?'Jegyezd meg a négy jelenet sorrendjét!':'Jegyezd meg pontosan ezt a jelenetet!');
    ctx.root.replaceChildren(settings.level===2?h('div',{className:'scene-sequence'},...round.sequence.map((item,i)=>scene(item,`${i+1}. jelenet: ${item.label}`))):scene(round.target,`A megjegyzendő jelenet: ${round.target.label}`));
    ctx.memorize(recall);
  }
  function recall(){
    const round=rounds[index],chosen=[];let selected='',submitted=false;ctx.phase(`${index+1}. képkör felidézése`,settings.level===2?'Rakd sorrendbe a jeleneteket.':'Válaszd ki az eredeti jelenetet.');
    const grid=h('div',{className:'scene-grid'}),note=h('p',{className:'game-note','aria-live':'polite'}),undo=h('button',{type:'button',className:'secondary-button',onClick:()=>{chosen.pop();render();}},'Visszavonás');
    const check=h('button',{type:'button',className:'primary-button',disabled:true,onClick:()=>{
      if(finished||submitted)return;submitted=true;check.disabled=true;const expected=settings.level===2?round.sequence.map(item=>item.id):round.target.id,actual=settings.level===2?[...chosen]:selected;
      if(settings.level===2){rawRounds.push({itemIds:actual});expected.forEach((id,i)=>{const ok=actual[i]===id;correct+=ok?1:0;details.push({label:`${index+1}. kör, ${i+1}. hely`,expected:labelFor(round,id),actual:actual[i]?labelFor(round,actual[i]):'—',correct:ok});});}
      else {rawRounds.push({choiceId:actual});const rowDetail=detail(round.target.label,actual?labelFor(round,actual):'—',index);correct+=actual===expected?1:0;rowDetail.correct=actual===expected;details.push(rowDetail);}
      index+=1;if(index<rounds.length)study();else {finished=true;const total=settings.level===2?rounds.length*4:rounds.length;ctx.done({correct,total,summary:`${correct} helyes válasz ${total}-ból.`,details},{rounds:rawRounds});}
    }},index===rounds.length-1?'Ellenőrzés és befejezés':'Ellenőrzés és következő');
    function render(){
      grid.replaceChildren(...round.choices.map((item,i)=>{const used=chosen.includes(item.id),active=selected===item.id,button=scene(item,`${i+1}. válasz: ${item.label}`,true);button.disabled=settings.level===2&&used;button.classList.toggle('is-selected',settings.level===2?used:active);if(settings.level===2&&used){const position=chosen.indexOf(item.id)+1;button.append(h('span',{className:'scene-order','aria-hidden':'true'},String(position)));button.setAttribute('aria-label',`${i+1}. válasz: ${item.label}, ${position}. választás`);}button.addEventListener('click',()=>{if(settings.level===2){if(!used&&chosen.length<4)chosen.push(item.id);}else selected=item.id;render();});return button;}));
      check.disabled=settings.level===2?chosen.length!==4:!selected;undo.hidden=settings.level!==2;undo.disabled=chosen.length===0;note.textContent=settings.level===2?`Sorrend: ${chosen.length}/4 jelenet`:(selected?'Kiválasztottad a jelenetet.':'Válassz egy jelenetet.');
    }
    ctx.root.replaceChildren(grid,note,h('div',{className:'answer-row'},undo,check));render();
  }
  study();
}

export const CODE_SYMBOL_SETS=Object.freeze({
  objects:[{id:'lemon',glyph:'🍋',label:'citrom'},{id:'bike',glyph:'🚲',label:'bicikli'},{id:'cactus',glyph:'🌵',label:'kaktusz'},{id:'balloon',glyph:'🎈',label:'lufi'},{id:'umbrella',glyph:'☂️',label:'esernyő'},{id:'key',glyph:'🔑',label:'kulcs'},{id:'mushroom',glyph:'🍄',label:'gomba'},{id:'boat',glyph:'⛵',label:'vitorlás'},{id:'gift',glyph:'🎁',label:'ajándék'},{id:'sunflower',glyph:'🌻',label:'napraforgó'}],
  abstract:[{id:'circle',glyph:'●',label:'kör'},{id:'triangle',glyph:'▲',label:'háromszög'},{id:'square',glyph:'■',label:'négyzet'},{id:'diamond',glyph:'◆',label:'rombusz'},{id:'star4',glyph:'✦',label:'négyágú csillag'},{id:'star5',glyph:'★',label:'csillag'},{id:'spiral',glyph:'➰',label:'hurok'},{id:'wave',glyph:'≋',label:'hullám'},{id:'cross',glyph:'✚',label:'kereszt'},{id:'hex',glyph:'⬢',label:'hatszög'}],
});
export const CODE_SYMBOLS=CODE_SYMBOL_SETS.objects.map(item=>[item.glyph,item.label]);
export function makeCodeRound(count=5,difficulty='normal',rng=Math.random){const size=difficulty==='easy'?4:difficulty==='hard'?8:6;return {digits:Array.from({length:size},(_,i)=>i),symbols:sample(CODE_SYMBOLS,size,rng),message:Array.from({length:count},()=>Math.floor(rng()*size))};}
export function scoreCode(message,answer){return message.reduce((n,d,i)=>n+(String(d)===answer[i]?1:0),0);}
export function generateCodeRound(settings,rng=Math.random){
  const length=settings.level===1?3:settings.level===2?4:5,symbols=shuffle(CODE_SYMBOL_SETS[settings.symbolSet]||CODE_SYMBOL_SETS.objects,rng).map(item=>({...item}));
  return {symbols,messages:Array.from({length:settings.rounds},()=>Array.from({length},()=>Math.floor(rng()*10)))};
}
function codeMount(ctx){
  const settings={...ctx.settings,level:Number(ctx.settings.level)||1,rounds:Number(ctx.settings.rounds)||3},round=generateCodeRound(settings,ctx.rand),mapping=[...round.symbols],answers=[];let messageIndex=0,finished=false;
  const grid=h('div',{className:'code-map'});
  function drawEditor(){
    grid.replaceChildren(...mapping.map((symbol,digit)=>{const select=h('select',{'aria-label':`${digit} számjegy jele`},...round.symbols.map(option=>h('option',{value:option.id,selected:option.id===symbol.id},`${option.glyph} ${option.label}`)));select.addEventListener('change',()=>{const other=mapping.findIndex(item=>item.id===select.value);[mapping[digit],mapping[other]]=[mapping[other],mapping[digit]];drawEditor();});return h('label',{className:'code-pair'},h('strong',{className:'code-digit'},digit),select); }));
  }
  function study(){ctx.phase('Jegyezd meg a saját kódkulcsodat','Minden számjegyhez egyedi jel tartozik.');drawEditor();ctx.root.replaceChildren(grid);ctx.memorize(recall);}
  function recall(){
    const message=round.messages[messageIndex];let submitted=false;ctx.phase(`${messageIndex+1}. titkos üzenet`,'Írd be a jelekhez tartozó számjegyeket.');
    const input=h('input',{className:'sequence-input',type:'text',inputMode:'numeric',autocomplete:'off',maxLength:message.length,'aria-label':'A megfejtett számsor'}),error=h('p',{className:'input-error',role:'status'});
    const form=h('form',{className:'game-stack',onSubmit:event=>{event.preventDefault();if(submitted)return;const answer=input.value;if(!new RegExp(`^\\d{${message.length}}$`).test(answer)){error.textContent=`Pontosan ${message.length} számjegyet írj be.`;return;}submitted=true;answers.push(answer);messageIndex+=1;if(messageIndex<round.messages.length)recall();else finish();}},h('div',{className:'code-message'},...message.map((digit,i)=>h('div',{className:'object-tile'},h('span',{className:'object-emoji',role:'img','aria-label':mapping[digit].label},mapping[digit].glyph),h('small',{},`${i+1}. jel`)))),input,error,h('button',{className:'primary-button',type:'submit'},messageIndex===round.messages.length-1?'Befejezés':'Következő üzenet'));
    ctx.root.replaceChildren(form);input.focus();
  }
  function finish(){if(finished)return;finished=true;let correct=0;const details=round.messages.flatMap((message,roundIndex)=>message.map((digit,index)=>{const ok=String(digit)===answers[roundIndex]?.[index];correct+=ok?1:0;return {label:`${roundIndex+1}. üzenet, ${index+1}. jegy`,expected:String(digit),actual:answers[roundIndex]?.[index]||'—',correct:ok};}));const total=details.length;ctx.done({correct,total,summary:`${correct} számjegy helyes ${total}-ból.`,details},{mapping:mapping.map((symbol,digit)=>({digit,symbolId:symbol.id})),answers});}
  ctx.phase('Készíts saját kódkulcsot','Minden sor külön módosítható; az egyedi párosítás megmarad.');drawEditor();ctx.root.replaceChildren(grid,h('div',{className:'answer-row'},h('button',{type:'button',className:'secondary-button',onClick:()=>{mapping.splice(0,mapping.length,...shuffle(mapping,ctx.rand));drawEditor();}},'Új párosítás'),h('button',{type:'button',className:'primary-button',onClick:study},'Megjegyzem')));
}

export const advancedGames={picture:{mount:pictureMount},code:{mount:codeMount}};
