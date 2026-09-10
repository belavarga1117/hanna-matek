// Reference observations are discrete fixtures, not an inferred universal formula.
// A missing fixture remains unawarded instead of silently inventing a threshold.
const PRICE_L1_FIVE = [0,0,0,1,2,3];
const PRICE_L2_SIX = [0,1,1,2,3,3,3];
const PRICE_L2_TEN = {3:0,4:0,5:1,6:1,7:2,8:3,9:3,10:3};
export function awardStars(gameId, settings, score, version=2) {
  const {correct,total}=score;
  if(version===1 || ['digits','grid','path','missing'].includes(gameId)) {
    const percent=Math.round(correct/total*100);
    return {stars:percent===100?3:percent>=60?2:percent>0?1:0,starBasis:version===1?'legacy-v1':'hanna-own'};
  }
  let stars;
  if(gameId==='prices') {
    if(settings.level===1&&total===5)stars=PRICE_L1_FIVE[correct];
    if(settings.level===2&&total===6)stars=PRICE_L2_SIX[correct];
    if(settings.level===2&&total===10)stars=PRICE_L2_TEN[correct];
  }
  if(gameId==='stations'&&settings.level===1&&total===3)stars=({2:2,3:3})[correct];
  if(gameId==='code'&&total===3) {
    const symbols=settings.symbolSet||'objects';
    if(correct===3)stars=3;
    if(correct===0&&settings.level===2&&symbols==='abstract')stars=0;
    if(correct===2&&((settings.level===3&&symbols==='objects')||(settings.level===1&&symbols==='abstract')))stars=1;
  }
  if(gameId==='picture'&&total===3) {
    if(correct===2&&(settings.level===2||settings.difficulty==='hard'))stars=1;
    if(correct===3&&(settings.level===2||settings.difficulty!=='hard'))stars=3;
  }
  if(gameId==='faces') {
    if(settings.level===1&&total===5)stars=({0:0,5:3})[correct];
    if(settings.level===2&&total===10&&correct===10)stars=3;
    if(settings.level===3&&total===15&&correct===15)stars=3;
  }
  if(gameId==='shopping'&&total===9) {
    if(correct===9)stars=3;
    if(settings.level===2&&settings.difficulty==='hard'&&correct===7)stars=3;
  }
  return stars===undefined?{stars:null,starBasis:'reference-unmeasured'}:{stars,starBasis:'reference-observed-2026-09-10'};
}
