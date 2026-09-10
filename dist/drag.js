// Pointer capture keeps mouse, pen and touch dragging on the same UI path.
// Tap/keyboard activation remains the existing button action.
export function pointerDrag(root, selector, drop) {
  return function begin(event) {
    if(event.button!==0)return;
    const source=event.currentTarget,pointerId=event.pointerId,startX=event.clientX,startY=event.clientY;
    let moved=false,ended=false,highlight=null;
    const nativeDrag=e=>e.preventDefault();
    const suppressClick=e=>{if(moved){e.preventDefault();e.stopImmediatePropagation();}};
    const targetAt=e=>{
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(selector);
      return target&&root.contains(target)&&!target.disabled?target:null;
    };
    function move(e){
      if(e.pointerId!==pointerId)return;
      if(Math.hypot(e.clientX-startX,e.clientY-startY)>6)moved=true;
      if(!moved)return;
      e.preventDefault();source.classList.add('is-dragging');
      highlight?.classList.remove('is-drop-target');highlight=targetAt(e);highlight?.classList.add('is-drop-target');
    }
    function end(e){
      if(ended||e.pointerId!==pointerId)return;ended=true;
      const target=e.type==='pointerup'&&moved?targetAt(e):null;
      source.removeEventListener('pointermove',move);source.removeEventListener('pointerup',end);source.removeEventListener('pointercancel',end);source.removeEventListener('lostpointercapture',end);source.removeEventListener('dragstart',nativeDrag);
      source.classList.remove('is-dragging');highlight?.classList.remove('is-drop-target');
      if(source.hasPointerCapture?.(pointerId))source.releasePointerCapture(pointerId);
      if(moved)setTimeout(()=>source.removeEventListener('click',suppressClick,true),0);else source.removeEventListener('click',suppressClick,true);
      if(target&&root.isConnected)drop(target);
    }
    source.addEventListener('dragstart',nativeDrag);
    source.addEventListener('click',suppressClick,true);
    source.addEventListener('pointermove',move);source.addEventListener('pointerup',end);source.addEventListener('pointercancel',end);source.addEventListener('lostpointercapture',end);
    source.setPointerCapture(pointerId);
  };
}
