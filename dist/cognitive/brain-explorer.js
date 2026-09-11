import {BRAIN_REGIONS, BRAIN_TASKS, ATLAS_SOURCES} from './brain-knowledge.js';

const ASSET_BASE=new URL('../assets/brain/',import.meta.url);
const VIEWS={left:[-330,35,15],right:[330,35,15],top:[0,360,1],medial:[300,15,20],inferior:[-150,-270,130]};
const HEMISPHERES={both:'Mindkét félteke',left:'Bal félteke',right:'Jobb félteke'};

// Testable binary boundary: preserve the original surface and vertex annotations.
export function decodeCortex(buffer){
  const header=new DataView(buffer);
  if(buffer.byteLength<16||header.getUint32(0,true)!==0x31414248||header.getUint32(12,true)!==1)throw new Error('Nem támogatott anatómiai modell.');
  const count=header.getUint32(4,true),triangles=header.getUint32(8,true);
  if(count!==10242||triangles!==20480)throw new Error('Hiányos anatómiai felszín.');
  let offset=16;
  const positions=new Float32Array(buffer,offset,count*3);offset+=count*12;
  const indices=new Uint16Array(buffer,offset,triangles*3);offset+=triangles*6;
  const labels=new Uint8Array(buffer,offset,count);offset+=count;offset=Math.ceil(offset/4)*4;
  if(buffer.byteLength!==offset+count*4)throw new Error('Sérült anatómiai adat.');
  const sulc=new Float32Array(buffer,offset,count);
  return {count,triangles,positions,indices,labels,sulc};
}

function css(){
  if(document.querySelector('[data-brain-explorer]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./brain-explorer.css',import.meta.url).href;link.dataset.brainExplorer='true';document.head.append(link);
}

export function createBrainExplorer({h,initialTask='spatial-span'}){
  css();
  let taskId=initialTask,disposed=false,viewer=null,loading=null,atlas=null,picked=null,currentView='left',hemisphere='both';
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let rotating=!reduced?.matches;
  const title=h('h3'),description=h('p',{className:'bx-description'}),tag=h('span',{className:'bx-kicker'});
  const regionList=h('div',{className:'bx-regions'}),detail=h('p',{className:'bx-method-note'});
  const sourceList=h('div',{className:'bx-sources'});
  const taskSelect=h('select',{'aria-label':'Feladat az agymodellen'},Object.entries(BRAIN_TASKS).map(([id,task])=>h('option',{value:id},task.title)));
  taskSelect.addEventListener('change',()=>setTask(taskSelect.value));
  const status=h('div',{className:'bx-load',role:'status'},h('span',{className:'bx-load-ring'}),h('strong',{},'Anatómiai felszín betöltése'),h('span',{},'Két félteke · valódi barázdák · atlasz szerinti területek'));
  const canvasHost=h('div',{className:'bx-canvas-host'}),tooltip=h('div',{className:'bx-tooltip',hidden:true});
  const orientation=h('span',{className:'bx-orientation'},'Bal oldal · mindkét félteke');
  const rotateButton=h('button',{type:'button','aria-pressed':String(rotating),onClick:()=>{rotating=!rotating;updateRotation();}},'↻',h('span',{},'Lassú forgás'));
  const resetButton=h('button',{type:'button',onClick:()=>{setHemisphere('both');setView('left');}},'⤢',h('span',{},'Alapnézet'));
  const views=[['left','Balról'],['right','Jobbról'],['top','Felülről'],['medial','Belső felszín'],['inferior','Alulról']];
  const viewButtons=views.map(([id,label])=>h('button',{type:'button','aria-pressed':String(id===currentView),onClick:()=>setView(id)},label));
  const hemi=h('select',{'aria-label':'Látható agyfélteke'},Object.entries(HEMISPHERES).map(([id,label])=>h('option',{value:id},label)));
  hemi.addEventListener('change',()=>{setHemisphere(hemi.value);if(currentView==='medial')setView('medial');});
  const selectedLabel=h('p',{className:'bx-selected-label','aria-live':'polite'},'Húzd az agyat a forgatáshoz. A színes területekre rá is kattinthatsz.');
  const stage=h('div',{className:'bx-stage'},h('div',{className:'bx-stage-top'},h('span',{className:'bx-model-chip'},h('i'),'3D AGYKÉREG'),orientation),canvasHost,status,tooltip,
    h('div',{className:'bx-stage-bottom'},selectedLabel,h('div',{className:'bx-tools'},rotateButton,resetButton)));
  const modelSource=h('details',{className:'bx-anatomy-source'},h('summary',{},'Miből készült a modell?'),h('p',{},'FreeSurfer fsaverage5 kérgi sablon, 20 484 csúcsponttal és 40 960 háromszöggel. A Destrieux-atlasz eredeti címkéi jelölik a tekervényeket és barázdákat. A kiemelések e határokat követik.'),h('p',{},'Átlagos kérgi felszín: nem teljes agy, nem egy konkrét ember felvétele. A hippocampus, az agytörzs és a kisagy ezen a modellen nem szerepel.'),ATLAS_SOURCES.map(source=>h('a',{href:source.url,target:'_blank',rel:'noopener noreferrer'},source.title,' ↗')),h('a',{href:new URL('attribution.html',ASSET_BASE).href,target:'_blank',rel:'noopener noreferrer'},'Adatforrások, módosítások és licencek ↗'));
  const element=h('section',{className:'bx-explorer','aria-label':'Interaktív anatómiai agymodell'},
    h('header',{className:'bx-header'},h('div',{},h('span',{className:'bx-eyebrow'},'ANATÓMIA × KUTATÁS'),h('h2',{},'Fedezd fel a memória ',h('em',{},'hálózatait.')),h('p',{},'Forgasd el, nézz a belső felszínre, és ismerd meg a feladathoz kapcsolódó kérgi területeket.')),h('label',{className:'bx-task-choice'},h('span',{},'Melyik feladat érdekel?'),taskSelect)),
    h('div',{className:'bx-layout'},h('div',{className:'bx-model'},stage,h('div',{className:'bx-view-controls'},h('div',{className:'bx-views','aria-label':'Agy nézete'},viewButtons),hemi)),
      h('aside',{className:'bx-story'},tag,title,description,h('div',{className:'bx-legend-heading'},'Kiemelt kéregterületek'),regionList,
        h('details',{className:'bx-research'},h('summary',{},'Mi támasztja alá?'),detail,sourceList))),
    h('footer',{className:'bx-footer'},h('p',{},h('span',{},'Hogyan olvasd? '),'A színek a kutatásokhoz kapcsolódó anatómiai területeket jelölik. Nem aktivitáserősséget, és nem a te agyad mérését mutatják.'),modelSource));

  function setTask(id){
    if(!BRAIN_TASKS[id]||disposed)return;
    taskId=id;picked=null;taskSelect.value=id;
    const task=BRAIN_TASKS[id];tag.textContent=task.tag;title.textContent=task.title;description.textContent=task.text;detail.textContent=task.detail;
    regionList.replaceChildren(...task.regions.map(([key,side],i)=>{
      const region=BRAIN_REGIONS[key];
      return h('button',{type:'button',className:'bx-region','aria-pressed':'false',dataset:{region:key},onClick:()=>focusRegion(key,side)},h('span',{className:'bx-region-number',style:{'--region-color':region.color}},String(i+1).padStart(2,'0')),h('span',{},h('strong',{},region.title),h('small',{},`${side==='both'?'Kétoldali':side==='left'?'Bal oldali':'Jobb oldali'} · ${region.detail}`)),h('span',{className:'bx-region-arrow'},'↗'));
    }));
    sourceList.replaceChildren(...task.sources.map(source=>h('a',{href:source.url,target:'_blank',rel:'noopener noreferrer',className:'bx-study'},h('strong',{},source.authors),h('span',{},source.title),h('small',{},source.note),h('b',{},'Kutatás megnyitása ↗'))));
    viewer?.highlight(task.regions,null);
    setHemisphere(task.view==='medial'?'left':'both');setView(task.view,false);
    selectedLabel.textContent='Húzd az agyat a forgatáshoz. A színes területekre rá is kattinthatsz.';
  }
  function focusRegion(key,side){
    picked=key;rotating=false;updateRotation();
    regionList.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.region===key)));
    viewer?.highlight(BRAIN_TASKS[taskId].regions,key);
    if(key==='parahippocampal'||key==='cingulate'){setHemisphere(side==='right'?'right':'left');setView('medial');}
    else if(key==='visual')setView('inferior');
    else {setHemisphere(side==='both'?'both':side);setView(side==='right'?'right':'left');}
    selectedLabel.textContent=`${BRAIN_REGIONS[key].title} · ${BRAIN_REGIONS[key].detail}`;
  }
  function updateRotation(){rotateButton.setAttribute('aria-pressed',String(rotating));viewer?.rotation(rotating);updateOrientation();}
  function updateOrientation(){orientation.textContent=`${rotating?'Forgó nézet':views.find(([id])=>id===currentView)?.[1]||'Egyéni nézet'} · ${HEMISPHERES[hemisphere].toLocaleLowerCase('hu')}`;}
  function setHemisphere(next){hemisphere=next;hemi.value=next;viewer?.hemisphere(next);updateOrientation();}
  function setView(next,animate=true){
    currentView=next;if(next==='medial'&&hemisphere==='both')setHemisphere('left');
    viewButtons.forEach((button,i)=>button.setAttribute('aria-pressed',String(views[i][0]===next)));
    viewer?.view(next,hemisphere,animate&&!reduced?.matches);updateOrientation();
  }

  async function load(){
    if(loading||disposed)return loading;
    loading=(async()=>{
      try{
        const [THREE,metadata,...buffers]=await Promise.all([
          import('../vendor/three/brain-three.js'),
          fetch(new URL('atlas.json',ASSET_BASE)).then(response=>{if(!response.ok)throw new Error('Az atlasz nem érhető el.');return response.json();}),
          ...['left','right'].map(hemi=>fetch(new URL(`fsaverage5-${hemi}.bin`,ASSET_BASE)).then(response=>{if(!response.ok)throw new Error('A felszín nem érhető el.');return response.arrayBuffer();})),
        ]);
        if(disposed)return;
        atlas=metadata;
        viewer=makeViewer(THREE,buffers);
        viewer.highlight(BRAIN_TASKS[taskId].regions,picked);viewer.hemisphere(hemisphere);viewer.view(currentView,hemisphere,false);viewer.rotation(rotating);
        status.hidden=true;element.dataset.modelReady='true';
      }catch(error){
        if(disposed)return;
        status.replaceChildren(h('strong',{},'A 3D modell most nem jeleníthető meg.'),h('span',{},'A kéregterületek leírása és a kutatási források továbbra is elérhetők.'),h('button',{type:'button',onClick:()=>{loading=null;load();}},'Újrapróbálom'));
        element.dataset.modelReady='error';
      }
    })();
    return loading;
  }

  function makeViewer(T,buffers){
    const decoded=buffers.map(decodeCortex);
    let renderer;
    try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{throw new Error('A böngészőben nem érhető el a WebGL.');}
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.75));renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
    const canvas=renderer.domElement;canvas.setAttribute('aria-label','Forgatható, atlasz szerint jelölt 3D agykéreg');canvas.setAttribute('role','img');canvas.tabIndex=0;canvasHost.replaceChildren(canvas);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,1,1500),group=new T.Group();scene.add(group);
    scene.add(new T.HemisphereLight(0xe1f0ff,0x394458,2.5));
    const key=new T.DirectionalLight(0xfff4e3,3.2);key.position.set(-140,210,200);scene.add(key);
    const rim=new T.DirectionalLight(0x91bcdf,2.1);rim.position.set(170,110,-100);scene.add(rim);
    const fill=new T.DirectionalLight(0xe2c1a4,0.7);fill.position.set(-60,-170,90);scene.add(fill);
    const meshes=decoded.map((data,i)=>{
      const geometry=new T.BufferGeometry(),positions=new Float32Array(data.positions.length);
      for(let v=0;v<data.count;v++){positions[v*3]=data.positions[v*3];positions[v*3+1]=data.positions[v*3+2]-14;positions[v*3+2]=-data.positions[v*3+1]-18;}
      geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setIndex(new T.BufferAttribute(data.indices,1));geometry.computeVertexNormals();
      const colours=new Float32Array(positions.length);geometry.setAttribute('color',new T.BufferAttribute(colours,3));
      const material=new T.MeshStandardMaterial({vertexColors:true,roughness:0.74,metalness:0.04,side:T.DoubleSide});
      const mesh=new T.Mesh(geometry,material);mesh.userData={...data,id:i===0?'left':'right',targets:new Float32Array(colours.length)};group.add(mesh);return mesh;
    });
    const controls=new T.OrbitControls(camera,canvas);controls.target.set(0,0,0);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=0.08;controls.rotateSpeed=0.65;controls.minDistance=190;controls.maxDistance=580;controls.autoRotateSpeed=0.5;
    // Drag rotates; page scroll remains page scroll. Zoom is explicit and keyboard-accessible.
    controls.enableZoom=false;canvas.style.touchAction='pan-y';
    const zoomOut=h('button',{type:'button','aria-label':'Agy kicsinyítése',onClick:()=>zoom(1.15)},'−'),zoomIn=h('button',{type:'button','aria-label':'Agy nagyítása',onClick:()=>zoom(0.87)},'+');
    const zoomTools=h('div',{className:'bx-zoom'},zoomOut,zoomIn);stage.append(zoomTools);
    function zoom(factor){const length=Math.min(580,Math.max(190,camera.position.length()*factor));camera.position.setLength(length);requestRender();}
    let frame=null,onScreen=true,lost=false,lastTime=0,colourFrames=0,cameraTween=null,liveRegions=[];
    const now=()=>globalThis.performance.now();
    function requestRender(){if(frame===null&&!disposed&&!lost&&onScreen&&!document.hidden)frame=requestAnimationFrame(tick);}
    function tick(time){
      frame=null;if(disposed||lost||!onScreen||document.hidden)return;
      if(cameraTween){const t=Math.min(1,(time-cameraTween.at)/550),ease=1-Math.pow(1-t,3);camera.position.setFromSphericalCoords(cameraTween.radiusFrom+(cameraTween.radiusTo-cameraTween.radiusFrom)*ease,cameraTween.phiFrom+(cameraTween.phiTo-cameraTween.phiFrom)*ease,cameraTween.thetaFrom+cameraTween.thetaDelta*ease);if(t>=1)cameraTween=null;}
      if(colourFrames>0){for(const mesh of meshes){const values=mesh.geometry.attributes.color.array,target=mesh.userData.targets;for(let i=0;i<values.length;i++)values[i]+=(target[i]-values[i])*0.22;mesh.geometry.attributes.color.needsUpdate=true;}colourFrames--;}
      controls.update(lastTime?Math.min((time-lastTime)/1000,.1):0);lastTime=time;renderer.render(scene,camera);
      if(controls.autoRotate||cameraTween||colourFrames>0)requestRender();
    }
    controls.addEventListener('change',requestRender);
    const stopSpin=()=>{cameraTween=null;rotating=false;controls.autoRotate=false;currentView='custom';viewButtons.forEach(button=>button.setAttribute('aria-pressed','false'));rotateButton.setAttribute('aria-pressed','false');updateOrientation();requestRender();};
    controls.addEventListener('start',stopSpin);
    const resize=()=>{const width=canvasHost.clientWidth,height=canvasHost.clientHeight;if(width&&height){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender();}};
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvasHost);resize();
    const observer=new IntersectionObserver(entries=>{onScreen=entries[0].isIntersecting;if(onScreen)requestRender();else if(frame!==null){cancelAnimationFrame(frame);frame=null;}},{rootMargin:'80px'});observer.observe(stage);
    const visibility=()=>{lastTime=0;requestRender();};document.addEventListener('visibilitychange',visibility);
    const pointer=new T.Vector2(),raycaster=new T.Raycaster();let down=null;
    function hit(event){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const picked=raycaster.intersectObjects(meshes.filter(mesh=>mesh.visible),false)[0];if(!picked)return null;const mesh=picked.object,label=mesh.userData.labels[picked.face.a];const region=liveRegions.find(([key,side])=>(side==='both'||side===mesh.userData.id)&&BRAIN_REGIONS[key].parcels.includes(label));return {region,label,hemi:mesh.userData.id};}
    const pointerMove=event=>{if(event.buttons)return;const picked=hit(event);if(!picked?.region){tooltip.hidden=true;canvas.style.cursor='grab';return;}const region=BRAIN_REGIONS[picked.region[0]];tooltip.textContent=`${picked.hemi==='left'?'Bal':'Jobb'} · ${region.title}`;tooltip.hidden=false;const rect=stage.getBoundingClientRect();tooltip.style.left=`${Math.max(12,Math.min(rect.width-235,event.clientX-rect.left+12))}px`;tooltip.style.top=`${Math.max(54,event.clientY-rect.top-48)}px`;canvas.style.cursor='pointer';};
    const pointerDown=event=>{down={x:event.clientX,y:event.clientY};tooltip.hidden=true;};
    const pointerUp=event=>{if(!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>6)return;const picked=hit(event);if(picked?.region)focusRegion(...picked.region);};
    const pointerLeave=()=>{tooltip.hidden=true;};
    const keyboard=event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','Home'].includes(event.key))return;event.preventDefault();stopSpin();if(event.key==='Home'){setHemisphere('both');setView('left');return;}if(event.key==='+'||event.key==='-'){zoom(event.key==='+'?.87:1.15);return;}const axis=event.key.includes('Left')||event.key.includes('Right')?new T.Vector3(0,1,0):new T.Vector3(1,0,0);camera.position.applyAxisAngle(axis,event.key==='ArrowLeft'||event.key==='ArrowUp'?.12:-.12);requestRender();};
    canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointerleave',pointerLeave);canvas.addEventListener('keydown',keyboard);
    const contextLost=event=>{event.preventDefault();lost=true;status.hidden=false;status.replaceChildren(h('strong',{},'A 3D nézet szünetel.'),h('span',{},'A böngésző grafikus erőforrása felszabadult. A nézet helyreállításkor folytatódik.'));};
    const contextRestored=()=>{lost=false;status.hidden=true;requestRender();};canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
    return {
      rotation(value){controls.autoRotate=value;requestRender();},
      view(name,side,animate){let target=new T.Vector3(...VIEWS[name]);if(name==='medial'&&side==='right')target.x*=-1;if(animate){const radiusFrom=camera.position.length(),radiusTo=target.length(),thetaFrom=Math.atan2(camera.position.x,camera.position.z),thetaTo=Math.atan2(target.x,target.z);cameraTween={radiusFrom,radiusTo,phiFrom:Math.acos(camera.position.y/radiusFrom),phiTo:Math.acos(target.y/radiusTo),thetaFrom,thetaDelta:Math.atan2(Math.sin(thetaTo-thetaFrom),Math.cos(thetaTo-thetaFrom)),at:now()};}else{cameraTween=null;camera.position.copy(target);}controls.update();requestRender();},
      hemisphere(side){meshes.forEach(mesh=>mesh.visible=side==='both'||side===mesh.userData.id);requestRender();},
      highlight(regions,focus){
        liveRegions=regions;
        const base=new T.Color('#c5c9ce');
        for(const mesh of meshes){const data=mesh.userData,values=mesh.geometry.attributes.color.array;for(let v=0;v<data.count;v++){
          const region=regions.find(([key,side])=>(side==='both'||side===data.id)&&BRAIN_REGIONS[key].parcels.includes(data.labels[v]));
          const colour=region?new T.Color(BRAIN_REGIONS[region[0]].color):base;
          let shade=Math.max(.32,Math.min(.92,.73-data.sulc[v]*.19));if(data.labels[v]===42||data.labels[v]===0)shade*=.5;
          if(region)shade=Math.min(1.1,shade*1.18);if(focus&&region?.[0]!==focus)shade*=.54;
          for(let c=0;c<3;c++)data.targets[v*3+c]=colour[['r','g','b'][c]]*shade;
        }if(!element.dataset.modelReady||reduced?.matches)values.set(data.targets);mesh.geometry.attributes.color.needsUpdate=true;}
        colourFrames=reduced?.matches?0:22;requestRender();
      },
      dispose(){if(frame!==null)cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();document.removeEventListener('visibilitychange',visibility);controls.dispose();meshes.forEach(mesh=>{mesh.geometry.dispose();mesh.material.dispose();});renderer.dispose();canvas.remove();zoomTools.remove();},
    };
  }
  const reduceChange=()=>{if(reduced.matches){rotating=false;updateRotation();}};reduced?.addEventListener?.('change',reduceChange);
  const lazy=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();lazy.disconnect();}},{rootMargin:'300px'});lazy.observe(element);
  setTask(initialTask);
  return {element,setTask,load,dispose(){disposed=true;lazy.disconnect();reduced?.removeEventListener?.('change',reduceChange);viewer?.dispose();}};
}
