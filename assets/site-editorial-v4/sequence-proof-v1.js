(()=>{
 const section=document.querySelector("#sequence-proof");if(!section)return;
 const videos=[...section.querySelectorAll("[data-sequence-example]")],grid=section.querySelector(".sequence-proof-grid"),prev=section.querySelector(".sequence-proof-prev"),next=section.querySelector(".sequence-proof-next"),count=section.querySelector(".sequence-proof-count");
 const motion=matchMedia("(prefers-reduced-motion: reduce)");let visible=false,loaded=false,pairs=[],index=0,touchStart=null;
 const blocked=()=>document.querySelector("#player")?.open||document.querySelector("#case-story")?.open;
 function render(){
  const play=visible&&!document.hidden&&!motion.matches&&!blocked();
  if(play&&!loaded){videos.forEach(v=>{v.muted=true;v.preload="auto";v.load()});loaded=true}
  videos.forEach(v=>{if(play)v.play().catch(()=>{});else v.pause()});
 }
 function select(target){
  if(!pairs.length)return;index=(target+pairs.length)%pairs.length;
  const pair=pairs[index];section.dataset.sequenceIndex=String(index);count.textContent=`${index+1} / ${pairs.length}`;
  grid.querySelector('figcaption p').textContent=pair.id==='22'?'Рассказ перед камерой.':'Один план. Рассказ в кадре.';
  videos.forEach((v,i)=>{const clip=pair[i===0?"head":"story"];v.pause();v.poster=clip.poster;v.querySelector("source").src=clip.src;v.preload=visible&&!motion.matches?"auto":"none";v.load()});
  loaded=true;render();
 }
 prev.disabled=true;next.disabled=true;
 prev.addEventListener("click",()=>select(index-1));next.addEventListener("click",()=>select(index+1));
 grid.addEventListener("keydown",e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();select(index+(e.key==="ArrowRight"?1:-1))}});
 grid.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.pointerType==="pen")touchStart={x:e.clientX,y:e.clientY}});
 grid.addEventListener("pointerup",e=>{if(!touchStart)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)select(index+(dx<0?1:-1))});
 grid.addEventListener("pointercancel",()=>{touchStart=null});
 new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);render()},{threshold:0}).observe(section);
 document.addEventListener("visibilitychange",render);motion.addEventListener("change",render);
 ["player","case-story"].forEach(id=>{const el=document.getElementById(id);if(el)new MutationObserver(render).observe(el,{attributes:true,attributeFilter:["open"]})});
 Promise.resolve(JSON.parse(document.getElementById("sequence-proof-data").textContent)).then(items=>{pairs=items;prev.disabled=false;next.disabled=false;select(0)}).catch(e=>console.error(e));
 render();
})();
