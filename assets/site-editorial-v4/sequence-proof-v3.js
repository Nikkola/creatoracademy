(()=>{
 const section=document.querySelector("#sequence-proof");if(!section)return;
 const videos=[...section.querySelectorAll("[data-sequence-example]")],grid=section.querySelector(".sequence-proof-grid"),prev=section.querySelector(".sequence-proof-prev"),next=section.querySelector(".sequence-proof-next"),count=section.querySelector(".sequence-proof-count");
 const motion=matchMedia("(prefers-reduced-motion: reduce)");let visible=false,loaded=false,pairs=[],index=0,touchStart=null,requested=0,busy=false,pendingDirection=1;
 const viewport=document.createElement("div");viewport.className="sequence-proof-viewport";grid.before(viewport);viewport.append(grid);
 const generations=videos.map(()=>0),revealing=videos.map(()=>-1);
 const covers=videos.map(v=>{const img=new Image();img.className="sequence-proof-cover";img.alt="";img.setAttribute("aria-hidden","true");img.src=v.poster;v.after(img);return img});
 function reveal(v,i){
  const token=generations[i];if(revealing[i]===token)return;revealing[i]=token;
  const ready=()=>{
   if(token!==generations[i])return;
   if(!busy&&!v.paused&&v.readyState>=2){covers[i].classList.add("is-playing");return}
   revealing[i]=-1;
  };
  if(v.requestVideoFrameCallback)v.requestVideoFrameCallback(ready);
  else requestAnimationFrame(()=>requestAnimationFrame(ready));
 }
 const blocked=()=>document.querySelector("#player")?.open||document.querySelector("#case-story")?.open;
 function render(){
  const play=visible&&!busy&&!document.hidden&&!motion.matches&&!blocked();
  if(play&&!loaded){videos.forEach(v=>{v.muted=true;v.preload="auto";v.load()});loaded=true}
  videos.forEach((v,i)=>{if(play)v.play().then(()=>reveal(v,i)).catch(()=>{});else v.pause()});
 }
 function applyPair(target){
  if(!pairs.length)return;index=(target+pairs.length)%pairs.length;
  const pair=pairs[index];section.dataset.sequenceIndex=String(index);count.textContent=`${index+1} / ${pairs.length}`;
  grid.querySelector('figcaption p').textContent=pair.id==='22'?'Рассказ перед камерой.':'Один план. Рассказ в кадре.';
  videos.forEach((v,i)=>{const clip=pair[i===0?"head":"story"];v.pause();generations[i]++;revealing[i]=-1;covers[i].classList.remove("is-playing");covers[i].src=clip.poster;v.poster=clip.poster;v.querySelector("source").src=clip.src;v.preload=visible&&!motion.matches?"auto":"none";v.load()});
  loaded=true;render();
 }
 // A frozen copy avoids extra video decoders and preserves the outgoing frame.
 function snapshot(){
  const old=grid.cloneNode(true);old.classList.replace("sequence-proof-grid","sequence-proof-outgoing");old.removeAttribute("tabindex");old.removeAttribute("role");old.removeAttribute("aria-label");old.setAttribute("aria-hidden","true");old.inert=true;
  old.querySelectorAll("video").forEach((copy,i)=>{
   const v=videos[i];let still;
   if(v.readyState>=2){
    still=document.createElement("canvas");still.width=v.videoWidth;still.height=v.videoHeight;
    try{still.getContext("2d").drawImage(v,0,0,still.width,still.height)}catch{still=null}
   }
   if(!still){still=new Image();still.src=v.poster;still.alt=""}copy.replaceWith(still);
  });return old;
 }
 const posterCache=new Map();
 function poster(url){
  if(!posterCache.has(url)){const img=new Image();img.src=url;posterCache.set(url,img.decode().catch(()=>{}))}return posterCache.get(url);
 }
 function warm(){for(const offset of [-1,1]){const pair=pairs[(index+offset+pairs.length)%pairs.length];poster(pair.head.poster);poster(pair.story.poster)}}
 async function transition(){
  if(busy||requested===index)return;busy=true;
  const target=requested,direction=pendingDirection;
  if(motion.matches){applyPair(target);warm();busy=false;return}
  const old=snapshot();viewport.append(old);viewport.classList.add("is-transitioning");grid.style.visibility="hidden";
  try{
   const pair=pairs[target];
   await Promise.all([poster(pair.head.poster),poster(pair.story.poster)]);
   applyPair(target);await Promise.all(covers.map(img=>img.decode().catch(()=>{})));grid.style.visibility="";
   if(!motion.matches){
    const options={duration:500,easing:"cubic-bezier(.25,.1,.25,1)",fill:"both"};
    const incoming=grid.animate([{transform:`translateX(${direction*100}%)`},{transform:"translateX(0)"}],options);
    const outgoing=old.animate([{transform:"translateX(0)"},{transform:`translateX(${-direction*100}%)`}],options);
    await Promise.allSettled([incoming.finished,outgoing.finished]);incoming.cancel();outgoing.cancel();
   }
  }finally{
   old.remove();grid.style.visibility="";viewport.classList.remove("is-transitioning");busy=false;warm();
   if(requested!==index)transition();else render();
  }
 }
 function step(direction){if(!pairs.length)return;requested=(requested+direction+pairs.length)%pairs.length;pendingDirection=direction;transition()}
 prev.disabled=true;next.disabled=true;
 prev.addEventListener("click",()=>step(-1));next.addEventListener("click",()=>step(1));
 grid.addEventListener("keydown",e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();step(e.key==="ArrowRight"?1:-1)}});
 grid.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.pointerType==="pen")touchStart={x:e.clientX,y:e.clientY}});
 grid.addEventListener("pointerup",e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)step(dx<0?1:-1)});
 grid.addEventListener("pointercancel",()=>{touchStart=null});
 new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);render()},{threshold:0}).observe(section);
 document.addEventListener("visibilitychange",render);motion.addEventListener("change",render);
 ["player","case-story"].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(render).observe(el,{attributes:true,attributeFilter:["open"]})});
 Promise.resolve(JSON.parse(document.getElementById("sequence-proof-data").textContent)).then(items=>{pairs=items;prev.disabled=false;next.disabled=false;applyPair(0);warm()}).catch(e=>console.error(e));
 render();
})();
