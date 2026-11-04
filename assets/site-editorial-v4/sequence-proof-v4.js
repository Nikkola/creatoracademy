(()=>{
 const section=document.querySelector('#sequence-proof');if(!section)return;
 let grid=section.querySelector('.sequence-proof-grid'),videos=[...grid.querySelectorAll('video')];
 const prev=section.querySelector('.sequence-proof-prev'),next=section.querySelector('.sequence-proof-next'),count=section.querySelector('.sequence-proof-count'),template=grid.cloneNode(true);
 const viewport=document.createElement('div');viewport.className='sequence-proof-viewport';grid.before(viewport);viewport.append(grid);
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),desktopClick=matchMedia('(min-width:768px) and (hover:hover) and (pointer:fine)');let pairs=[],index=0,requested=0,busy=false,visible=false,touchStart=null,mouseStart=null,mouseDragged=false,direction=1;
 const blocked=()=>document.querySelector('#player')?.open||document.querySelector('#case-story')?.open;
 const mayPlay=()=>visible&&!document.hidden&&!motion.matches&&!blocked();
 const revealed=new WeakSet(),revealing=new WeakSet();
 function reveal(v){
  if(revealed.has(v)||revealing.has(v))return;revealing.add(v);
  const show=()=>{revealing.delete(v);if(!v.isConnected)return;revealed.add(v);v.style.opacity='1';v.parentElement.querySelector('.sequence-proof-cover')?.classList.add('is-ready')};
  if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(show);
  else if(v.readyState>=2)requestAnimationFrame(show);
  else v.addEventListener('loadeddata',show,{once:true});
 }
 function render(){videos.forEach(v=>{if(mayPlay()&&!busy){v.play().then(()=>reveal(v)).catch(()=>{})}else v.pause()})}
 function configure(panel,target){
  const pair=pairs[target];panel.querySelector('figcaption p').textContent=pair.id==='22'?'Рассказ перед камерой.':'Один план. Рассказ в кадре.';
  panel.querySelectorAll('video').forEach((v,i)=>{
   const clip=pair[i?'story':'head'];v.parentElement.title=i?'Следующая пара':'Предыдущая пара';v.muted=true;v.poster=clip.poster;v.style.opacity='0';v.querySelector('source').src=clip.src;v.preload=motion.matches?'none':'metadata';v.load();
   let cover=v.parentElement.querySelector('.sequence-proof-cover');if(!cover){cover=new Image();cover.className='sequence-proof-cover';cover.alt='';cover.setAttribute('aria-hidden','true');v.after(cover)}cover.classList.remove('is-ready');cover.src=clip.poster;
  });
 }
 const warmed=new Map();
 function warm(){for(const delta of [-1,1]){const pair=pairs[(index+delta+pairs.length)%pairs.length];for(const clip of [pair.head,pair.story]){if(warmed.has(clip.poster))continue;const img=new Image();img.src=clip.poster;warmed.set(clip.poster,img)}}}
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
   // Navigation never waits for media: covers stay visible until a decoded frame arrives.
   if(!motion.matches){
    const options={duration:500,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'};
    animations=[old.animate([{transform:'translateX(0)'},{transform:`translateX(${-sign*100}%)`}],options),panel.animate([{transform:`translateX(${sign*100}%)`},{transform:'translateX(0)'}],options)];
    await Promise.allSettled(animations.map(a=>a.finished));
   }
   const hadFocus=old.contains(document.activeElement);old.remove();commit(panel,target);animations.forEach(a=>a.cancel());grid.style.zIndex='';warm();if(hadFocus)grid.focus({preventScroll:true});
  }catch(error){panel.querySelectorAll('video').forEach(v=>v.pause());panel.remove();old.style.zIndex='';requested=index;console.warn('Comparison kept the previous pair:',error.message)}
  finally{busy=false;if(requested!==index)transition();else render()}
 }
 function step(delta){if(!pairs.length)return;requested=(requested+delta+pairs.length)%pairs.length;direction=delta;transition()}
 prev.disabled=true;next.disabled=true;prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
 viewport.addEventListener('click',e=>{
  if(!desktopClick.matches||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||mouseDragged||e.pointerType&&e.pointerType!=='mouse'||e.target.closest('a,button,input,select,textarea,[contenteditable]'))return;
  const rect=viewport.getBoundingClientRect(),media=grid.querySelector('.sequence-proof-media').getBoundingClientRect(),middle=rect.left+rect.width/2,gap=parseFloat(getComputedStyle(grid).columnGap)||0;
  if(e.clientY<rect.top||e.clientY>rect.top+media.height||e.clientX<rect.left||e.clientX>rect.right||Math.abs(e.clientX-middle)<gap/2)return;
  step(e.clientX<middle?-1:1);
 });
 viewport.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}});
 viewport.addEventListener('pointerdown',e=>{mouseStart=e.pointerType==='mouse'&&e.button===0?{x:e.clientX,y:e.clientY}:null;mouseDragged=false;if(e.pointerType==='touch'||e.pointerType==='pen')touchStart={x:e.clientX,y:e.clientY}});
 viewport.addEventListener('pointermove',e=>{if(mouseStart&&Math.hypot(e.clientX-mouseStart.x,e.clientY-mouseStart.y)>5)mouseDragged=true});
 viewport.addEventListener('pointerup',e=>{mouseStart=null;if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1)});
 viewport.addEventListener('pointercancel',()=>{touchStart=null;mouseStart=null;mouseDragged=true});
 new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);render()},{threshold:0}).observe(section);
 document.addEventListener('visibilitychange',render);motion.addEventListener('change',render);
 ['player','case-story'].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(render).observe(el,{attributes:true,attributeFilter:['open']})});
 pairs=JSON.parse(document.getElementById('sequence-proof-data').textContent);configure(grid,0);commit(grid,0);warm();prev.disabled=false;next.disabled=false;render();
})();
