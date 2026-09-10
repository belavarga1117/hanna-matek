import test from 'node:test';
import assert from 'node:assert/strict';
import {awardStars} from '../dist/scoring.js';
import {normalizeGameSettings,normalizeSettingsForVersion,scoreAttempt,seededRandom} from '../dist/game-engine.js';
import {generateCodeRound,generatePictureRounds} from '../dist/games/advanced-games.js';

// Exact recorded end states from reference-audit-2026-09-10/result-index.json.
const priceCases=[{level:1,total:5,correct:[0,1,2,3,4,5],stars:[0,0,0,1,2,3]}, {level:2,total:6,correct:[0,1,2,3,4,5,6],stars:[0,1,1,2,3,3,3]}, {level:2,total:10,correct:[3,4,5,6,7,8,9,10],stars:[0,0,1,1,2,3,3,3]}];
test('Price Question uses all recorded star endpoints, including different stars at 50 percent',()=>{
 for(const c of priceCases)c.correct.forEach((correct,i)=>assert.equal(awardStars('prices',{level:c.level},{correct,total:c.total}).stars,c.stars[i],`L${c.level} ${correct}/${c.total}`));
 assert.equal(awardStars('prices',{level:2},{correct:3,total:6}).stars,2);
 assert.equal(awardStars('prices',{level:2},{correct:5,total:10}).stars,1);
 assert.equal(awardStars('prices',{level:2},{correct:4,total:8}).stars,null,'unmeasured boundaries must stay explicit');
});
test('game-specific recorded partial endpoints cannot share a percentage formula',()=>{
 for(const [gameId,settings,correct,total,stars] of [['code',{level:3},2,3,1],['picture',{level:2},2,3,1],['stations',{level:1},2,3,2],['shopping',{level:2,difficulty:'hard'},7,9,3]])assert.equal(awardStars(gameId,settings,{correct,total}).stars,stars);
 assert.equal(awardStars('stations',{level:2},{correct:4,total:5}).stars,null);
 for(const level of [1,2,3])for(const symbolSet of ['objects','abstract'])assert.equal(awardStars('code',{level,symbolSet},{correct:2,total:3}).stars,1,`ATM L${level} ${symbolSet}: separate reference limit-result fixture`);
 assert.equal(awardStars('picture',{level:1,difficulty:'hard'},{correct:3,total:3}).stars,3,'picture-l1-hard-perfect-saved');
 assert.equal(awardStars('prices',{level:2},{correct:5,total:6},1).stars,2,'historical v1 result retains v1 stars');
});
test('new controls normalize the actual game dimensions while legacy settings remain intact',()=>{
 assert.equal(normalizeGameSettings('faces',{count:3}).count,5);
 assert.equal(normalizeGameSettings('shopping',{level:1,count:3,difficulty:'hard'}).difficulty,'easy');
 assert.equal(normalizeGameSettings('shopping',{level:2,count:3,difficulty:'hard'}).count,9);
 assert.equal(normalizeGameSettings('prices',{difficulty:'hard'}).difficulty,'normal');
 assert.equal(normalizeGameSettings('stations',{level:2,count:6,theme:'streets'}).count,5);
 assert.equal(normalizeSettingsForVersion('faces',{count:3},1).count,3);
 assert.throws(()=>normalizeSettingsForVersion('faces',{},99),/verzió/);
});
test('v2 ATM scores whole codes and validates retry history without accepting shown solutions',()=>{
 const seed=818;const settings=normalizeGameSettings('code',{level:3,rounds:3});const round=generateCodeRound(settings,seededRandom(seed));
 const values=round.messages.map(x=>x.join(''));const wrong=s=>String((Number(s[0])+1)%10)+s.slice(1);
 const mapping=round.symbols.slice(0,10).map((x,digit)=>({digit,symbolId:x.id}));
 const answer={mapping,answers:[{attempts:[wrong(values[0]),wrong(values[0]),wrong(values[0])]},{attempts:[values[1]]},{attempts:[values[2]]}]};
 const score=scoreAttempt('code',settings,seed,answer);assert.equal(score.correct,2);assert.equal(score.total,3);assert.equal(score.stars,1);assert.equal(score.details.length,3);
 const corrected=structuredClone(answer);corrected.answers[0].attempts[2]=values[0];assert.equal(scoreAttempt('code',settings,seed,corrected).correct,3);
 const extra=structuredClone(answer);extra.answers[0].attempts.push(values[0]);assert.throws(()=>scoreAttempt('code',settings,seed,extra),/1–3/);
 const afterSuccess=structuredClone(corrected);afterSuccess.answers[1].attempts.push(values[1]);assert.throws(()=>scoreAttempt('code',settings,seed,afterSuccess),/helyes válasz után/);
 const unfinished=structuredClone(answer);unfinished.answers[0].attempts.pop();assert.throws(()=>scoreAttempt('code',settings,seed,unfinished),/nincs lezárva/);
 assert.throws(()=>scoreAttempt('code',settings,seed,{...answer,correct:3}),/mezői/);
});
test('v2 Storyboard counts full sequences; two correct rounds and a swapped pair scores two, not ten',()=>{
 const seed=812;const settings=normalizeGameSettings('picture',{level:2,rounds:3});const generated=generatePictureRounds(settings,seededRandom(seed));
 const answers=generated.map(x=>x.sequence.map(y=>y.id));const swapped=[answers[1][1],answers[1][0],...answers[1].slice(2)];
 const answer={rounds:[{attempts:[{itemIds:answers[0]}]},{attempts:[{itemIds:swapped},{itemIds:swapped}]},{attempts:[{itemIds:answers[2]}]}]};
 const result=scoreAttempt('picture',settings,seed,answer);assert.equal(result.correct,2);assert.equal(result.total,3);assert.equal(result.stars,1);
 const solution=structuredClone(answer);solution.rounds[1].attempts.push({itemIds:answers[1]});assert.throws(()=>scoreAttempt('picture',settings,seed,solution),/1–2/);
});
