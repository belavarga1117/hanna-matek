// Display a round's portrait position, never the internal reusable portrait id.
// This leaves stored answer/score/detail snapshots untouched.
export function resultDetailLabel(result,detail,index){
  const fields=Number(result.settings?.level);
  if(result.gameId==='faces'&&result.rulesVersion===2&&[1,2,3].includes(fields)&&result.details?.length===5*fields){
    return String(detail.label||'').replace(/^\d+\. portré/,`${Math.floor(index/fields)+1}. portré`);
  }
  return detail.label||`${index+1}. válasz`;
}
