(()=>{
 const hero=document.querySelector('[data-hero-showreel]');if(!hero)return;
 const media=hero.querySelector('.hero-preview-film'),video=media.querySelector('video'),cover=media.querySelector('img');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let delayPassed=false,visible=true,playing=false;
 video.muted=true;video.playsInline=true;
 const allowed=()=>delayPassed&&visible&&!document.hidden&&!motion.matches&&!document.querySelector('#player')?.open;
 const sync=()=>{
  if(!allowed()){video.pause();playing=false;return;}
  if(playing||video.readyState<2)return;playing=true;
  video.play().then(()=>{const reveal=()=>{if(allowed()&&!video.paused)media.classList.add('is-playing')};if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(reveal);else reveal();}).catch(()=>{playing=false;});
 };
 cover.decode().catch(()=>{}).then(()=>setTimeout(()=>{delayPassed=true;sync();},innerWidth>=768?1000:0));
 video.addEventListener('loadeddata',sync);document.addEventListener('visibilitychange',sync);
 new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:.05}).observe(media);
 const load=()=>{if(!motion.matches){video.preload='auto';video.load();}else{video.pause();media.classList.remove('is-playing');}};
 motion.addEventListener('change',()=>{load();sync();});
 const player=document.querySelector('#player');if(player)new MutationObserver(sync).observe(player,{attributes:true,attributeFilter:['open']});
 document.addEventListener('pointerdown',sync,{passive:true});document.addEventListener('keydown',sync);load();
})();
