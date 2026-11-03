(()=>{
 const section=document.querySelector('#sequence-proof');if(!section)return;
 let grid=section.querySelector('.sequence-proof-grid'),videos=[...grid.querySelectorAll('video')];
 const prev=section.querySelector('.sequence-proof-prev'),next=section.querySelector('.sequence-proof-next'),count=section.querySelector('.sequence-proof-count'),template=grid.cloneNode(true);
 const viewport=document.createElement('div');viewport.className='sequence-proof-viewport';grid.before(viewport);viewport.append(grid);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let pairs=[],index=0,requested=0,busy=false,visible=false,touchStart=null,direction=1;
 const blocked=()=>document.querySelector('#player')?.open||document.querySelector('#case-story')?.open;
 const mayPlay=()=>visible&&!document.hidden&&!motion.matches&&!blocked();
 function render(){videos.forEach(v=>{if(mayPlay()&&!busy)v.play().catch(()=>{});else v.pause()})}
 function configure(panel,target){
  const pair=pairs[target];panel.querySelector('figcaption p').textContent=pair.id==='22'?'Рассказ перед камерой.':'Один план. Рассказ в кадре.';
  panel.querySelectorAll('video').forEach((v,i)=>{const clip=pair[i?'story':'head'];v.muted=true;v.poster=clip.poster;v.querySelector('source').src=clip.src;v.preload=motion.matches?'none':'auto';v.load()});
 }
 function presented(v){
  return new Promise((resolve,reject)=>{
   let done=false,frame;
   const timer=setTimeout(()=>finish(new Error('Timed out preparing comparison video')),20000);
   function finish(error){if(done)return;done=true;clearTimeout(timer);v.removeEventListener('error',failed);if(frame&&v.cancelVideoFrameCallback)v.cancelVideoFrameCallback(frame);v.pause();error?reject(error):resolve()}
   function failed(){finish(new Error('Unable to load comparison video'))}
   v.addEventListener('error',failed,{once:true});
   v.play().then(()=>{
    if(done)return;
    if(v.requestVideoFrameCallback)frame=v.requestVideoFrameCallback(()=>finish());
    else requestAnimationFrame(()=>requestAnimationFrame(()=>v.readyState>=2?finish():failed()));
   }).catch(finish);
  });
 }
 function commit(panel,target){
  grid=panel;videos=[...grid.querySelectorAll('video')];index=target;section.dataset.sequenceIndex=String(index);count.textContent=`${index+1} / ${pairs.length}`;
  grid.className='sequence-proof-grid';grid.removeAttribute('aria-hidden');grid.inert=false;grid.setAttribute('role','group');grid.setAttribute('aria-label','Пара видеопримеров');grid.tabIndex=0;
 }
 async function transition(){
  if(busy||requested===index)return;busy=true;render();
  const target=requested,sign=direction,old=grid,panel=template.cloneNode(true);let animations=[];
  panel.className='sequence-proof-pending';panel.removeAttribute('tabindex');panel.setAttribute('aria-hidden','true');panel.inert=true;
  old.style.zIndex='1';viewport.append(panel);configure(panel,target);
  try{
   if(motion.matches){await Promise.all([...panel.querySelectorAll('video')].map(v=>{const img=new Image();img.src=v.poster;return img.decode()}))}
   else await Promise.all([...panel.querySelectorAll('video')].map(presented));
   // The actual decoded players are kept throughout: no cloned frames or source swaps.
   if(!motion.matches){
    const options={duration:500,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'};
    animations=[old.animate([{transform:'translateX(0)'},{transform:`translateX(${-sign*100}%)`}],options),panel.animate([{transform:`translateX(${sign*100}%)`},{transform:'translateX(0)'}],options)];
    await Promise.allSettled(animations.map(a=>a.finished));
   }
   const hadFocus=old.contains(document.activeElement);old.remove();commit(panel,target);animations.forEach(a=>a.cancel());grid.style.zIndex='';if(hadFocus)grid.focus({preventScroll:true});
  }catch(error){panel.querySelectorAll('video').forEach(v=>v.pause());panel.remove();old.style.zIndex='';requested=index;console.warn('Comparison kept the previous pair:',error.message)}
  finally{busy=false;if(requested!==index)transition();else render()}
 }
 function step(delta){if(!pairs.length)return;requested=(requested+delta+pairs.length)%pairs.length;direction=delta;transition()}
 prev.disabled=true;next.disabled=true;prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}});
 viewport.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')touchStart={x:e.clientX,y:e.clientY}});
 viewport.addEventListener('pointerup',e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1)});
 viewport.addEventListener('pointercancel',()=>{touchStart=null});
 new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);render()},{threshold:0}).observe(section);
 document.addEventListener('visibilitychange',render);motion.addEventListener('change',render);
 ['player','case-story'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(render).observe(el,{attributes:true,attributeFilter:['open']})});
 pairs=JSON.parse(document.getElementById('sequence-proof-data').textContent);configure(grid,0);commit(grid,0);prev.disabled=false;next.disabled=false;render();
})();
