import {h,shuffle,sample} from '../core.js';

export const COLORS=['#6844b6','#e3a224','#269e91','#e46c5f'];
export const SHAPES=['●','▲','■','◆'];

// Frozen legacy helpers. The current Storyboard UI uses SCENES below.
export function makePictureRound(difficulty='normal',rng=Math.random){
  const size=difficulty==='easy'?4:difficulty==='hard'?9:6;
  const target=Array.from({length:size},()=>({shape:Math.floor(rng()*4),color:Math.floor(rng()*4)}));
  const changed=sample(Array.from({length:size},(_,i)=>i),3,rng);
  const variants=changed.map((index,k)=>target.map((value,i)=>i===index?{...value,[k%2?'shape':'color']:(value[k%2?'shape':'color']+1+k)%4}:{...value}));
  return {target,choices:shuffle([{picture:target,correct:true},...variants.map(picture=>({picture,correct:false}))],rng),size};
}

const BASE_SCENE_LABELS=[
  'Konyha – piros bögre baloldalt','Konyha – sárga bögre','Konyha – zöld bögre és egy alma','Konyha – piros bögre jobboldalt',
  'Park – piros labda és fehér virág','Park – kék labda és sárga virág','Park – zöld labda és rózsaszín virág','Park – narancssárga labda és lila virág',
  'Íróasztal – piros füzet és három építőkocka','Íróasztal – kék füzet és három építőkocka','Íróasztal – zöld füzet és egy piros kocka','Íróasztal – lila füzet és négy építőkocka',
  'Olvasósarok – piros párna és zöld könyv','Olvasósarok – sárga párna és piros könyv','Olvasósarok – zöld párna és kék könyv','Olvasósarok – mintás párna és lila könyv',
];
const EXTRA_SCENE_LABELS=[
  'Konyha – két körte','Konyha – fehér tejeskancsó a teáskanna helyén',
  'Park – piros autó a labda helyén','Park – kutya a padon',
  'Íróasztal – vonalzó az olló helyén','Íróasztal – két építőkocka',
  'Olvasósarok – nyitott könyv','Olvasósarok – mackó a macska helyén',
];
const BASE_SCENE_X=[0.1,33.33,66.61,99.9];
const BASE_SCENE_Y=[0.73,33.6,65.54,99.14];
const EXTRA_SCENE_Y=[0,32.69,65.77,96.58];

export const SCENE_ATLASES=Object.freeze({
  base:Object.freeze({src:'./assets/scenes.png',width:1254,height:1254,columns:4,rows:4,backgroundSize:'404% 424%',xPositions:Object.freeze(BASE_SCENE_X),yPositions:Object.freeze(BASE_SCENE_Y)}),
  extra:Object.freeze({src:'./assets/scenes-extra-v2.png',width:887,height:1774,columns:2,rows:4,yBounds:Object.freeze([0,435,875,1285,1774]),backgroundSize:'200% 400%',xPositions:Object.freeze([0,100]),yPositions:Object.freeze(EXTRA_SCENE_Y)}),
});

const baseScenes=BASE_SCENE_LABELS.map((label,index)=>Object.freeze({
  id:`scene-${index}`,label,row:Math.floor(index/4),column:index%4,atlas:'base',atlasRow:Math.floor(index/4),atlasColumn:index%4,
}));
const extraScenes=EXTRA_SCENE_LABELS.map((label,index)=>Object.freeze({
  id:`scene-${16+index}`,label,row:Math.floor(index/2),column:4+(index%2),atlas:'extra',atlasRow:Math.floor(index/2),atlasColumn:index%2,
}));
export const SCENES=Object.freeze([...baseScenes,...extraScenes]);

function sceneFamily(row){return SCENES.filter(item=>item.row===row);}
function recognitionChoices(family,target,difficulty,rng){
  if(difficulty==='hard')return family;
  return [target,...sample(family.filter(item=>item.id!==target.id),3,rng)];
}
export function generatePictureRounds(settings,rng=Math.random){
  const rounds=[],count=Math.max(3,Math.min(5,Number(settings?.rounds)||3)),level=Number(settings?.level)||1;
  for(let index=0;index<count;index+=1){
    const row=Math.floor(rng()*4),family=sceneFamily(row);
    if(level===2){
      const items=sample(family,4,rng);
      rounds.push({sequence:shuffle(items,rng),choices:shuffle(items,rng)});
    }else{
      const target=family[Math.floor(rng()*family.length)];
      rounds.push({target,choices:shuffle(recognitionChoices(family,target,settings?.difficulty,rng),rng)});
    }
  }
  return rounds;
}

export function createEmptyPictureSlots(){return Array.from({length:4},()=>null);}
export function isWholePictureSequenceCorrect(expected,actual){
  return expected.length===4&&actual.length===4&&expected.every((id,index)=>id===actual[index]);
}
export function appendPictureAttempt(attempts,itemIds){return [...attempts,{itemIds:[...itemIds]}];}

function sceneStyle(item){
  if(item.atlas==='extra')return {
    backgroundImage:`url('${SCENE_ATLASES.extra.src}')`,
    backgroundSize:SCENE_ATLASES.extra.backgroundSize,
    backgroundPosition:`${SCENE_ATLASES.extra.xPositions[item.atlasColumn]}% ${SCENE_ATLASES.extra.yPositions[item.atlasRow]}%`,
  };
  return {
    backgroundImage:`url('${SCENE_ATLASES.base.src}')`,
    backgroundSize:SCENE_ATLASES.base.backgroundSize,
    backgroundPosition:`${SCENE_ATLASES.base.xPositions[item.atlasColumn]}% ${SCENE_ATLASES.base.yPositions[item.atlasRow]}%`,
  };
}
function scene(item,label,button=false,props={}){
  const atlas=SCENE_ATLASES[item.atlas];
  return h(button?'button':'div',{
    ...(button?{type:'button'}:{}),
    ...props,
    className:`scene-card${button?' scene-choice':''}${props.className?` ${props.className}`:''}`,
    'aria-label':label,
    dataset:{sceneId:item.id,atlas:item.atlas,atlasColumn:String(item.atlasColumn),atlasYStart:String(item.atlas==='extra'?atlas.yBounds[item.atlasRow]:Math.round(item.atlasRow*atlas.height/4)),atlasYEnd:String(item.atlas==='extra'?atlas.yBounds[item.atlasRow+1]:Math.round((item.atlasRow+1)*atlas.height/4))},
    style:{...sceneStyle(item),...(props.style||{})},
  },h('span',{className:'sr-only'},label));
}
function labelFor(round,id){return [...(round.choices||[]),...(round.sequence||[]),...(round.target?[round.target]:[])].find(item=>item.id===id)?.label||'Ismeretlen jelenet';}

function pictureMount(ctx){
  const settings={...ctx.settings,level:Number(ctx.settings.level)||1,rounds:Number(ctx.settings.rounds)||3};
  const rounds=generatePictureRounds(settings,ctx.rand),rawRounds=[],details=[];
  let correct=0,currentIndex=0,finished=false;

  function finish(){
    if(finished)return;
    finished=true;
    const raw={rounds:rawRounds.map(round=>round.choiceId!==undefined?{choiceId:round.choiceId}:{attempts:round.attempts.map(attempt=>({itemIds:[...attempt.itemIds]}))})};
    ctx.done({correct,total:rounds.length,summary:`${correct} teljes képkör helyes ${rounds.length}-ból.`,details},raw);
  }
  function advance(){
    if(currentIndex+1<rounds.length){currentIndex+=1;study();}
    else finish();
  }
  function study(){
    const round=rounds[currentIndex];
    ctx.phase(`${currentIndex+1}. képkör`,settings.level===2?'Jegyezd meg a négy jelenet sorrendjét!':'Jegyezd meg pontosan ezt a jelenetet!');
    ctx.root.replaceChildren(settings.level===2
      ?h('div',{className:'scene-sequence'},...round.sequence.map((item,index)=>scene(item,`${index+1}. jelenet: ${item.label}`)))
      :scene(round.target,`A megjegyzendő jelenet: ${round.target.label}`));
    ctx.memorize(settings.level===2?recallSequence:recallRecognition);
  }
  function recallRecognition(){
    const round=rounds[currentIndex];
    let selected='',evaluated=false;
    ctx.phase(`${currentIndex+1}. képkör felidézése`,'Válaszd ki az eredeti jelenetet, majd ellenőrizd.');
    const grid=h('div',{className:'scene-grid'}),feedback=h('p',{className:'game-note scene-feedback',role:'status'});
    const action=h('button',{type:'button',className:'primary-button',disabled:true,onClick:()=>{
      if(evaluated){advance();return;}
      if(!selected)return;
      evaluated=true;
      const choiceId=String(selected),ok=choiceId===round.target.id;
      rawRounds.push({choiceId});
      correct+=ok?1:0;
      details.push({label:`${currentIndex+1}. kör`,expected:round.target.label,actual:labelFor(round,choiceId),correct:ok});
      feedback.textContent=ok?'Helyes jelenet. Mehetsz tovább.':'Ez most nem az eredeti jelenet. Mehetsz tovább.';
      render();
    }},'Ellenőrzés');
    function render(){
      grid.replaceChildren(...round.choices.map((item,index)=>{
        const button=scene(item,`${index+1}. válasz: ${item.label}`,true,{disabled:evaluated});
        button.classList.toggle('is-selected',selected===item.id);
        button.addEventListener('click',()=>{if(evaluated)return;selected=item.id;render();});
        return button;
      }));
      action.disabled=!evaluated&&!selected;
      action.textContent=evaluated?'Tovább':'Ellenőrzés';
      if(!evaluated)feedback.textContent=selected?'Kiválasztottad a jelenetet.':'Válassz egy jelenetet.';
    }
    ctx.root.replaceChildren(grid,feedback,h('div',{className:'answer-row'},action));
    render();
  }
  function recallSequence(){
    const round=rounds[currentIndex],expected=round.sequence.map(item=>item.id);
    let placements=createEmptyPictureSlots(),selectedId='',attempts=[],mode='check',terminalActual=[],notice='';
    ctx.phase(`${currentIndex+1}. képkör felidézése`,'Húzd a négy képet a négy üres helyre. Kattintással és billentyűzettel is rendezheted.');
    const slots=h('div',{className:'scene-drop-grid','aria-label':'Négy üres sorrendi hely'});
    const palette=h('div',{className:'scene-palette','aria-label':'Rendezhető jelenetek'});
    const feedback=h('p',{className:'game-note scene-feedback',role:'status'});
    const action=h('button',{type:'button',className:'primary-button',disabled:true,onClick:()=>{
      if(mode==='next'){advance();return;}
      if(mode==='solution'){
        placements=[...expected];
        mode='next';
        notice='Ez a helyes sorrend. A megoldás nem írta át a válaszodat.';
        render();
        return;
      }
      if(placements.some(id=>!id))return;
      const snapshot=[...placements];
      attempts=appendPictureAttempt(attempts,snapshot);
      const ok=isWholePictureSequenceCorrect(expected,snapshot);
      if(ok){
        correct+=1;terminalActual=snapshot;mode='next';
        rawRounds.push({attempts:attempts.map(attempt=>({itemIds:[...attempt.itemIds]}))});
        details.push({label:`${currentIndex+1}. képsor`,expected:'A teljes képsor helyes sorrendben',actual:'A teljes képsor helyes sorrendben',correct:true});
        notice='A teljes képsor helyes. Mehetsz tovább.';
      }else if(attempts.length<2){
        placements=createEmptyPictureSlots();selectedId='';
        notice='A sorrend még nem helyes. A helyek kiürültek; próbáld újra.';
      }else{
        terminalActual=snapshot;mode='solution';
        rawRounds.push({attempts:attempts.map(attempt=>({itemIds:[...attempt.itemIds]}))});
        details.push({label:`${currentIndex+1}. képsor`,expected:expected.map(id=>labelFor(round,id)).join(' → '),actual:terminalActual.map(id=>labelFor(round,id)).join(' → '),correct:false});
        notice='Két próbálkozás után megnézheted a megoldást.';
      }
      render();
    }},'Ellenőrzés');
    function place(itemId,slotIndex){
      if(mode!=='check'||!round.choices.some(item=>item.id===itemId))return;
      const previous=placements.indexOf(itemId);
      if(previous>=0)placements[previous]=null;
      placements[slotIndex]=itemId;selectedId='';notice='';render();
    }
    function dragId(event,itemId){
      if(mode!=='check')return;
      event.dataTransfer?.setData('text/plain',itemId);
      if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
    }
    function render(){
      slots.replaceChildren(...placements.map((itemId,slotIndex)=>{
        const item=round.choices.find(candidate=>candidate.id===itemId);
        return h('button',{
          type:'button',className:`scene-drop${item?' is-filled':''}`,disabled:mode!=='check',
          'aria-label':item?`${slotIndex+1}. hely: ${item.label}. Kattints az eltávolításhoz.`:`${slotIndex+1}. üres hely`,
          dataset:{slot:String(slotIndex),empty:item?'false':'true'},
          onClick:()=>{if(mode!=='check')return;if(selectedId)place(selectedId,slotIndex);else if(item){placements[slotIndex]=null;notice='';render();}},
          onDragover:event=>{if(mode==='check')event.preventDefault();},
          onDrop:event=>{event.preventDefault();place(event.dataTransfer?.getData('text/plain')||'',slotIndex);},
        },item?scene(item,`${slotIndex+1}. helyen: ${item.label}`,false,{draggable:true,onDragstart:event=>dragId(event,item.id)}):h('span',{className:'scene-drop-number','aria-hidden':'true'},String(slotIndex+1)));
      }));
      palette.replaceChildren(...round.choices.map((item,index)=>{
        const used=placements.includes(item.id),button=scene(item,`${index+1}. kép: ${item.label}${used?', már elhelyezve':''}`,true,{
          disabled:mode!=='check'||used,draggable:mode==='check'&&!used,
          onDragstart:event=>dragId(event,item.id),
          onClick:()=>{if(mode!=='check'||used)return;selectedId=selectedId===item.id?'':item.id;notice='';render();},
        });
        button.classList.toggle('is-selected',selectedId===item.id);
        return button;
      }));
      action.textContent=mode==='solution'?'Megoldás megtekintése':mode==='next'?'Tovább':'Ellenőrzés';
      action.disabled=mode==='check'&&placements.some(id=>!id);
      feedback.textContent=notice||(mode==='check'?(selectedId?'Válassz egy üres helyet.':`${placements.filter(Boolean).length}/4 hely kitöltve.`):'');
    }
    ctx.root.replaceChildren(h('div',{className:'sequence-recall'},slots,palette),feedback,h('div',{className:'answer-row'},action));
    render();
  }
  study();
}

export const CODE_SYMBOL_SETS=Object.freeze({
  objects:Object.freeze([
    {id:'lemon',glyph:'🍋',label:'citrom'},{id:'bike',glyph:'🚲',label:'bicikli'},{id:'cactus',glyph:'🌵',label:'kaktusz'},{id:'balloon',glyph:'🎈',label:'lufi'},
    {id:'umbrella',glyph:'☂️',label:'esernyő'},{id:'key',glyph:'🔑',label:'kulcs'},{id:'mushroom',glyph:'🍄',label:'gomba'},{id:'boat',glyph:'⛵',label:'vitorlás'},
    {id:'gift',glyph:'🎁',label:'ajándék'},{id:'sunflower',glyph:'🌻',label:'napraforgó'},{id:'camera',glyph:'📷',label:'fényképezőgép'},{id:'bell',glyph:'🔔',label:'csengő'},
    {id:'rocket',glyph:'🚀',label:'rakéta'},{id:'apple',glyph:'🍎',label:'alma'},{id:'guitar',glyph:'🎸',label:'gitár'},{id:'clock',glyph:'⏰',label:'ébresztőóra'},
  ]),
  abstract:Object.freeze([
    {id:'violet-circle',glyph:'●',label:'lila kör',color:'#7650c8'},{id:'amber-triangle',glyph:'▲',label:'borostyán háromszög',color:'#db921c'},
    {id:'teal-square',glyph:'■',label:'türkiz négyzet',color:'#228d83'},{id:'coral-diamond',glyph:'◆',label:'korall rombusz',color:'#dc6155'},
    {id:'blue-star4',glyph:'✦',label:'kék négyágú csillag',color:'#3977c5'},{id:'rose-star5',glyph:'★',label:'rózsaszín csillag',color:'#ce4f81'},
    {id:'green-loop',glyph:'⌁',label:'zöld hurok',color:'#4a914f'},{id:'orange-wave',glyph:'≋',label:'narancs hullám',color:'#dd7b27'},
    {id:'purple-cross',glyph:'✚',label:'lila kereszt',color:'#7040a3'},{id:'cyan-hex',glyph:'⬢',label:'cián hatszög',color:'#238fa7'},
    {id:'red-heart',glyph:'♥',label:'piros szív',color:'#c9474f'},{id:'navy-moon',glyph:'☾',label:'sötétkék hold',color:'#45558c'},
    {id:'lime-clover',glyph:'♣',label:'lime lóhere',color:'#6d9d32'},{id:'gold-sun',glyph:'☀',label:'arany nap',color:'#d8a51c'},
    {id:'magenta-flower',glyph:'✿',label:'magenta virág',color:'#bd4d9c'},{id:'brown-ring',glyph:'◉',label:'barna gyűrű',color:'#956341'},
  ]),
});
export const CODE_SYMBOLS=CODE_SYMBOL_SETS.objects.map(item=>[item.glyph,item.label]);

// Frozen legacy helpers used by the pre-parity tests.
export function makeCodeRound(count=5,difficulty='normal',rng=Math.random){
  const size=difficulty==='easy'?4:difficulty==='hard'?8:6;
  return {digits:Array.from({length:size},(_,i)=>i),symbols:sample(CODE_SYMBOLS,size,rng),message:Array.from({length:count},()=>Math.floor(rng()*size))};
}
export function scoreCode(message,answer){return message.reduce((total,digit,index)=>total+(String(digit)===answer[index]?1:0),0);}

export function generateCodeRound(settings,rng=Math.random){
  const level=Number(settings?.level)||1,length=level===1?3:level===2?4:5;
  const pool=CODE_SYMBOL_SETS[settings?.symbolSet]||CODE_SYMBOL_SETS.objects;
  const symbols=sample(pool,10,rng).map(item=>({...item}));
  const count=Math.max(3,Math.min(5,Number(settings?.rounds)||3));
  return {symbols,messages:Array.from({length:count},()=>Array.from({length},()=>Math.floor(rng()*10)))};
}
export function codeMaxAttempts(settings){return settings.level===3?3:2;}
export function isWholeCodeCorrect(message,answer){return answer===message.join('');}
export function appendCodeAttempt(attempts,answer){return [...attempts,String(answer)];}

function codeMount(ctx){
  const settings={...ctx.settings,level:Number(ctx.settings.level)||1,rounds:Number(ctx.settings.rounds)||3};
  const round=generateCodeRound(settings,ctx.rand),mapping=[...round.symbols],answers=[],details=[];
  let messageIndex=0,correct=0,finished=false;
  const grid=h('div',{className:'code-map'});

  function drawEditor(){
    grid.replaceChildren(...mapping.map((symbol,digit)=>{
      const select=h('select',{'aria-label':`${digit} számjegy jele`},...round.symbols.map(option=>h('option',{value:option.id,selected:option.id===symbol.id},`${option.glyph} ${option.label}`)));
      select.addEventListener('change',()=>{
        const other=mapping.findIndex(item=>item.id===select.value);
        if(other>=0)[mapping[digit],mapping[other]]=[mapping[other],mapping[digit]];
        drawEditor();
      });
      return h('label',{className:'code-pair'},h('strong',{className:'code-digit'},digit),h('span',{className:'code-symbol','aria-hidden':'true',style:{color:symbol.color||''}},symbol.glyph),select);
    }));
  }
  function study(){
    ctx.phase('Jegyezd meg a saját kódkulcsodat','Minden számjegyhez egyedi jel tartozik.');
    drawEditor();ctx.root.replaceChildren(grid);ctx.memorize(recall);
  }
  function finish(){
    if(finished)return;
    finished=true;
    const raw={
      mapping:mapping.map((symbol,digit)=>({digit,symbolId:symbol.id})),
      answers:answers.map(answer=>({attempts:[...answer.attempts]})),
    };
    ctx.done({correct,total:round.messages.length,summary:`${correct} teljes kód helyes ${round.messages.length}-ból.`,details},raw);
  }
  function recall(){
    const message=round.messages[messageIndex],expected=message.join(''),maxAttempts=codeMaxAttempts(settings);
    let values=Array.from({length:message.length},()=>''),active=0,attempts=[],terminal=false,success=false;
    ctx.phase(`${messageIndex+1}. titkos üzenet`,'Írd be a jelekhez tartozó számjegyeket. A nyilak az aktuális kód számjegyhelyét léptetik.');
    const error=h('p',{className:'input-error code-feedback',role:'status'}),messageRow=h('div',{className:'code-message'},...message.map((digit,index)=>{
      const symbol=mapping[digit];
      return h('div',{className:'object-tile'},h('span',{className:'object-emoji',role:'img','aria-label':symbol.label,style:{color:symbol.color||''}},symbol.glyph),h('small',{},`${index+1}. jel`));
    }));
    function move(step){active=Math.max(0,Math.min(values.length-1,active+step));render();}
    function enterDigit(digit){if(terminal)return;values[active]=digit;if(active<values.length-1)active+=1;render();}
    function erase(){if(terminal)return;if(values[active])values[active]='';else if(active>0){active-=1;values[active]='';}render();}
    function submit(){
      if(terminal){messageIndex+=1;if(messageIndex<round.messages.length)recall();else finish();return;}
      if(values.some(value=>value==='')){error.textContent=`Mind a(z) ${message.length} számjegyhelyet töltsd ki.`;return;}
      const answer=values.join('');attempts=appendCodeAttempt(attempts,answer);
      if(isWholeCodeCorrect(message,answer)){
        success=true;terminal=true;correct+=1;
        error.textContent='A teljes kód helyes. Mehetsz tovább.';
      }else if(attempts.length<maxAttempts){
        values=Array.from({length:message.length},()=>''),active=0;
        error.textContent=`Nem ez a kód. Töltsd ki újra; még ${maxAttempts-attempts.length} próbálkozásod van.`;
      }else{
        terminal=true;
        error.textContent=`Elfogytak a próbálkozások. A helyes kód: ${expected}.`;
      }
      if(terminal){
        answers.push({attempts:[...attempts]});
        details.push({label:`${messageIndex+1}. üzenet`,expected,actual:attempts.at(-1)||'—',correct:success});
      }
      render();
    }
    function handleKey(event){
      if(terminal)return;
      if(/^\d$/.test(event.key)){event.preventDefault();enterDigit(event.key);}
      else if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
      else if(event.key==='ArrowRight'){event.preventDefault();move(1);}
      else if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();erase();}
    }
    function render(){
      const positions=h('div',{className:'code-positions','aria-label':'A megfejtett kód'},...values.map((value,index)=>h('button',{
        type:'button',className:`code-position${active===index?' is-active':''}`,disabled:terminal,'aria-label':`${index+1}. számjegyhely${value?`: ${value}`:': üres'}`,'aria-pressed':active===index,onClick:()=>{active=index;render();},
      },value||'–')));
      const navigation=h('div',{className:'code-navigation'},
        h('button',{type:'button',className:'secondary-button code-arrow',disabled:terminal||active===0,'aria-label':'Előző számjegyhely',onClick:()=>move(-1)},'←'),
        h('span',{className:'game-note'},`${active+1}. számjegyhely`),
        h('button',{type:'button',className:'secondary-button code-arrow',disabled:terminal||active===values.length-1,'aria-label':'Következő számjegyhely',onClick:()=>move(1)},'→'),
        h('button',{type:'button',className:'secondary-button',disabled:terminal,'aria-label':'Aktuális számjegy törlése',onClick:erase},'Törlés'),
      );
      const keypad=h('div',{className:'code-keypad','aria-label':'Számjegyek'},...Array.from({length:10},(_,digit)=>h('button',{type:'button',className:'code-key',disabled:terminal,onClick:()=>enterDigit(String(digit))},String(digit))));
      const action=h('button',{type:'button',className:'primary-button',disabled:!terminal&&values.some(value=>value===''),onClick:submit},terminal?(messageIndex===round.messages.length-1?'Befejezés':'Tovább'):'Ellenőrzés');
      const editor=h('div',{className:'code-entry',tabIndex:0,onKeydown:handleKey},messageRow,positions,navigation,keypad,error,h('div',{className:'answer-row'},action));
      ctx.root.replaceChildren(editor);
      editor.focus({preventScroll:true});
    }
    render();
  }
  ctx.phase('Készíts saját kódkulcsot','A tíz számjegyhez tíz különböző jelet rendeltünk a tizenhat elemes készletből.');
  drawEditor();
  ctx.root.replaceChildren(grid,h('div',{className:'answer-row'},
    h('button',{type:'button',className:'secondary-button',onClick:()=>{mapping.splice(0,mapping.length,...shuffle(mapping,ctx.rand));drawEditor();}},'Új párosítás'),
    h('button',{type:'button',className:'primary-button',onClick:study},'Megjegyzem'),
  ));
}

export const advancedGames={picture:{mount:pictureMount},code:{mount:codeMount}};
