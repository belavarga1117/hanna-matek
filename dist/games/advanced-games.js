import {h, shuffle, sample} from '../core.js';

export const COLORS = ['#6844b6','#e3a224','#269e91','#e46c5f'];
export const SHAPES = ['●','▲','■','◆'];
export function makePictureRound(difficulty='normal',rng=Math.random) {
  const size = difficulty === 'easy' ? 4 : difficulty === 'hard' ? 9 : 6;
  const target = Array.from({length:size},()=>({shape:Math.floor(rng()*4),color:Math.floor(rng()*4)}));
  const changed = sample(Array.from({length:size},(_,i)=>i),3,rng);
  const variants = changed.map((index,k)=>target.map((v,i)=>i===index ? {...v, [k%2 ? 'shape':'color']:(v[k%2 ? 'shape':'color']+1+k)%4} : {...v}));
  const choices = shuffle([{picture:target,correct:true},...variants.map(picture=>({picture,correct:false}))],rng);
  return {target,choices,size};
}
function pattern(picture, label) {
  return h('div',{className:'pattern-board',role:'img','aria-label':label,style:{gridTemplateColumns:`repeat(${picture.length===4?2:3},1fr)`}},picture.map(v=>h('span',{className:'pattern-shape',style:{color:COLORS[v.color]},'aria-hidden':'true'},SHAPES[v.shape])));
}
function pictureMount(ctx) {
  const round = makePictureRound(ctx.settings.difficulty,ctx.rand);
  ctx.phase('Nézd meg alaposan','A színekre és az alakzatokra is figyelj.');
  ctx.root.replaceChildren(h('div',{className:'picture-stimulus'},pattern(round.target,'A megjegyzendő alakzatminta')));
  ctx.memorize(()=>{
    ctx.phase('Melyik volt az eredeti?','Válassz egy képet, majd ellenőrizd.');
    let selected=-1;
    const check=h('button',{className:'primary-button',disabled:true,onClick:()=>{
      const correct=!!round.choices[selected]?.correct;
      const expected=round.choices.findIndex(c=>c.correct)+1;
      ctx.done({correct:correct?1:0,total:1,summary:correct?'A részletek is a helyükre kerültek.':'Egy apró részlet megváltozott.',details:[{label:'Az eredeti kép',expected:`${expected}. kép`,actual:`${selected+1}. kép`,correct}]});
    }},'Ellenőrzés');
    const cards=round.choices.map((c,i)=>h('button',{className:'picture-choice','aria-label':`${i+1}. kép`,'aria-pressed':'false',onClick:()=>{
      selected=i;cards.forEach((el,j)=>{el.classList.toggle('is-selected',j===i);el.setAttribute('aria-pressed',String(j===i));});check.disabled=false;
    }},h('span',{className:'picture-label'},`${i+1}. kép`),pattern(c.picture,`${i+1}. választható minta`)));
    ctx.root.replaceChildren(h('div',{className:'picture-choices'},cards),h('div',{className:'answer-row'},check));
  });
}

export const CODE_SYMBOLS=[['🍋','Citrom'],['🚲','Bicikli'],['🌵','Kaktusz'],['🎈','Lufi'],['☂️','Esernyő'],['🔑','Kulcs'],['🍄','Gomba'],['⛵','Vitorlás'],['🎁','Ajándék'],['🌻','Napraforgó']];
export function makeCodeRound(count=5,difficulty='normal',rng=Math.random) {
  const size=difficulty==='easy'?4:difficulty==='hard'?8:6;
  return {digits:Array.from({length:size},(_,i)=>i),symbols:sample(CODE_SYMBOLS,size,rng),message:Array.from({length:count},()=>Math.floor(rng()*size))};
}
export function scoreCode(message, answer) { return message.reduce((n,d,i)=>n+(String(d)===answer[i]?1:0),0); }
function codeMount(ctx) {
  const round=makeCodeRound(ctx.settings.count,ctx.settings.difficulty,ctx.rand);
  let symbols=[...round.symbols];
  const mapGrid=h('div',{className:'code-map'});
  const draw=()=>mapGrid.replaceChildren(...round.digits.map((d,i)=>h('div',{className:'code-pair'},h('strong',{className:'code-digit'},d),h('span',{},'='),h('span',{className:'code-symbol',role:'img','aria-label':symbols[i][1]},symbols[i][0]))));
  const remember=()=>{
    ctx.phase('Jegyezd meg a kódkulcsot','Melyik kép melyik számjegyet jelenti?');
    ctx.root.replaceChildren(mapGrid); draw();
    ctx.memorize(()=>{
      ctx.phase('Fejtsd vissza az üzenetet','Írd be a képekhez tartozó számjegyeket.');
      const input=h('input',{className:'sequence-input',type:'text',inputmode:'numeric',autocomplete:'off',maxlength:String(round.message.length),'aria-label':'A megfejtett számsor',placeholder:'Számjegyek…'});
      const error=h('p',{className:'input-error',role:'status'});
      const check=h('button',{className:'primary-button',type:'submit'},'Ellenőrzés');
      const form=h('form',{className:'game-stack',onSubmit:e=>{
        e.preventDefault();const answer=input.value.replace(/\s/g,'');
        if(!/^\d+$/.test(answer)||answer.length!==round.message.length){error.textContent=`Pontosan ${round.message.length} számjegyet írj be.`;input.focus();return;}
        const correct=scoreCode(round.message,answer);
        ctx.done({correct,total:round.message.length,summary:'A saját kódoddal dolgoztál.',details:round.message.map((d,i)=>({label:`${i+1}. jel: ${symbols[d][1]}`,expected:String(d),actual:answer[i]||'–',correct:String(d)===answer[i]}))});
      }},h('div',{className:'code-message'},round.message.map((d,i)=>h('div',{className:'object-tile'},h('span',{className:'object-emoji',role:'img','aria-label':symbols[d][1]},symbols[d][0]),h('small',{},`${i+1}. jel`)))),h('label',{className:'field-label'},'A megfejtett számsor',input),error,h('div',{className:'answer-row'},check));
      ctx.root.replaceChildren(form);input.focus();
    });
  };
  ctx.phase('Ez lesz a saját kódod','Választhatsz új párosítást, mielőtt megjegyzed.');draw();
  ctx.root.replaceChildren(mapGrid,h('div',{className:'answer-row'},h('button',{className:'secondary-button',onClick:()=>{symbols=shuffle(symbols,ctx.rand);draw();}},'Másik párosítás'),h('button',{className:'primary-button',onClick:remember},'Megjegyzem a kódot')));
}
export const advancedGames={picture:{mount:pictureMount},code:{mount:codeMount}};
