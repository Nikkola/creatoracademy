const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('#navlinks');
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}));
const dialog=document.querySelector('#player');const host=dialog.querySelector('.video-host');let opener;
document.addEventListener('click',event=>{const button=event.target.closest('[data-video]');if(!button)return;const url=new URL(button.dataset.video);if(!['kinescope.io','vk.com','vk.ru','vkvideo.ru'].includes(url.hostname))return;opener=button;const iframe=document.createElement('iframe');iframe.src=url.href;iframe.title=button.getAttribute('aria-label');iframe.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';iframe.allowFullscreen=true;host.replaceChildren(iframe);dialog.showModal();document.body.style.overflow='hidden'});
function closePlayer(){dialog.close()}
dialog.querySelector('.close-player').addEventListener('click',closePlayer);
dialog.addEventListener('click',e=>{if(e.target===dialog)closePlayer()});
dialog.addEventListener('close',()=>{host.replaceChildren();document.body.style.overflow='';opener?.focus()});

// A selected local recording uses native video controls in the same dialog.
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-local-video]');if(!button)return;
 const url=new URL(button.dataset.localVideo,location.href);
 const local=url.origin===location.origin&&url.pathname.startsWith('/assets/site-story-v1/media/');
 const published=url.protocol==='https:'&&url.hostname==='cdn.jsdelivr.net'&&/^\/gh\/Nikkola\/creatoracademy@[^/]+\/assets\/site-story-v1\/media\//.test(url.pathname);
 if(!local&&!published)return;
 opener=button;const video=document.createElement('video');video.src=url.href;video.controls=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label',button.getAttribute('aria-label'));
 host.replaceChildren(video);dialog.showModal();document.body.style.overflow='hidden';video.play().catch(()=>{});
});

nav.addEventListener("keydown",event=>{if(event.key==="Escape"){nav.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.focus()}});

// Motion is progressive enhancement; the original Owl slider code is untouched.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const feedbackDemo=document.querySelector('.feedback-demo');
if(feedbackDemo){
 const video=feedbackDemo.querySelector('video');
 video.addEventListener('loadeddata',()=>video.classList.add('has-frame'));
 let visible=false;
 function render(){
  if(visible&&!reducedMotion.matches&&!document.hidden&&!dialog.open){video.play().catch(()=>{})}else video.pause();
 }
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;render()},{threshold:.25}).observe(video);
 document.addEventListener('visibilitychange',render);
 reducedMotion.addEventListener('change',render);
 new MutationObserver(render).observe(dialog,{attributes:true,attributeFilter:['open']});render();
}
if(!reducedMotion.matches&&'IntersectionObserver' in window){
 const reveals=document.querySelectorAll('.chapter>.wrap>h2,.scene-copy,.scene-image,.editorial-lead');
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}}),{threshold:.12});
 reveals.forEach(el=>{el.classList.add('reveal');observer.observe(el)});document.body.classList.add('motion-ready');
}
const demo=document.querySelector('.learning-demo');
if(demo){
 const labels=['Выбираешь нужную тему в личном кабинете.','Смотришь урок и разбираешь приём на живом примере.','Открываешь материалы и применяешь знания в своём проекте.'];
 const tabs=[...demo.querySelectorAll('[data-scene-target]')];const caption=demo.querySelector('.learning-caption');const video=demo.querySelector('video');const pause=demo.querySelector('.motion-pause');
 let scene=0,timer=null,visible=false,paused=reducedMotion.matches;
 function render(){demo.dataset.scene=String(scene);tabs.forEach((button,i)=>{if(i===scene)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')});caption.textContent=labels[scene];if(scene===1&&visible&&!paused)video.play().catch(()=>{});else video.pause()}
 function stop(){clearInterval(timer);timer=null;demo.classList.remove('is-running');video.pause()}
 function start(){stop();if(!visible||paused||document.hidden)return;demo.classList.add('is-running');render();timer=setInterval(()=>{scene=(scene+1)%3;demo.classList.remove('is-running');render();void demo.offsetWidth;demo.classList.add('is-running')},6000)}
 tabs.forEach(button=>button.addEventListener('click',()=>{scene=Number(button.dataset.sceneTarget);render();start()}));
 pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Продолжить анимацию':'Остановить анимацию');pause.textContent=paused?'▶':'Ⅱ';if(paused)stop();else start()});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else stop()},{threshold:.2}).observe(demo);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
 reducedMotion.addEventListener('change',event=>{paused=event.matches;pause.setAttribute('aria-pressed',String(paused));if(paused)stop();else start()});render();
}

// Add position controls around the existing Owl instances, preserving their
// original drag, loop, click-to-focus, responsive settings and item order.
const siteJQ=window.creatorAcademyJQuery;
if(siteJQ){
 // This branch shows complete case cards: three on desktop, two on tablet.
 siteJQ(function(){
  const rail=siteJQ('#casesSlider'),carousel=rail.data('owl.carousel');if(!carousel)return;
  carousel.options.responsive={0:{items:1,margin:0,stagePadding:0,autoHeight:true},768:{items:2,margin:20,stagePadding:0,autoHeight:false},1200:{items:3,margin:24,stagePadding:0,autoHeight:false}};
  carousel.refresh();
 });
 const paginations=new WeakMap();
 function owlPagination(rail,instance){
  if(!instance||!rail.classList.contains('owl-loaded')||rail.id==='casesSlider'||rail.classList.contains('about__list'))return;
  const count=instance.items().length;if(count<2)return;
  let nav=paginations.get(rail);
  if(!nav){nav=document.createElement('nav');nav.className='carousel-pagination';nav.setAttribute('aria-label','Навигация: '+(rail.closest('section')?.querySelector('h2')?.textContent||'слайды'));rail.after(nav);paginations.set(rail,nav)}
  if(nav.children.length!==count){nav.replaceChildren();for(let i=0;i<count;i++){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Слайд ${i+1} из ${count}`);button.addEventListener('click',()=>{instance.to(i,reducedMotion.matches?0:300)});nav.append(button)}}
  const index=instance.relative(instance.current()??0);
  [...nav.children].forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')});
 }
 siteJQ(document).on('initialized.owl.carousel changed.owl.carousel refreshed.owl.carousel',function(event){const rail=event.target;if(rail.matches?.('.owl-carousel'))owlPagination(rail,event.relatedTarget||siteJQ(rail).data('owl.carousel'))});
 siteJQ(document).on('destroyed.owl.carousel',function(event){const nav=paginations.get(event.target);if(nav){nav.remove();paginations.delete(event.target)}});
 siteJQ(function(){document.querySelectorAll('.owl-loaded').forEach(rail=>owlPagination(rail,siteJQ(rail).data('owl.carousel')))});
 new MutationObserver(records=>records.forEach(({target})=>{if(paginations.has(target)&&!target.classList.contains('owl-loaded')){paginations.get(target).remove();paginations.delete(target)}})).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
}

// Written reviews keep their native draggable rail and gain matching bullets.
const reviewRail=document.querySelector('#reviews-container');
if(reviewRail){
 const cards=[...reviewRail.children];const nav=document.createElement('nav');nav.className='carousel-pagination';nav.setAttribute('aria-label','Навигация по текстовым отзывам');
 cards.forEach((card,i)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Отзыв ${i+1} из ${cards.length}`);button.addEventListener('click',()=>{reviewRail.scrollTo({left:reviewRail.scrollLeft+card.getBoundingClientRect().left-reviewRail.getBoundingClientRect().left,behavior:reducedMotion.matches?'auto':'smooth'})});nav.append(button)});
 reviewRail.after(nav);
 function syncReviews(){const left=reviewRail.getBoundingClientRect().left;let index=0,distance=Infinity;cards.forEach((card,i)=>{const d=Math.abs(card.getBoundingClientRect().left-left);if(d<distance){distance=d;index=i}});[...nav.children].forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current')})}
 reviewRail.addEventListener('scroll',syncReviews,{passive:true});window.addEventListener('resize',syncReviews);syncReviews();
}

// Native details semantics with an interruptible height animation for FAQ.
document.querySelectorAll('#faq details').forEach(details=>{
 const summary=details.querySelector('summary');const answer=details.querySelector('.faq-answer');if(!answer)return;
 let expanded=details.open,animation=null;
 summary.addEventListener('click',event=>{
  event.preventDefault();expanded=!expanded;
  const from=details.open?answer.getBoundingClientRect().height:0;
  animation?.cancel();summary.setAttribute('aria-expanded',String(expanded));
  if(reducedMotion.matches){details.open=expanded;answer.style.height='';animation=null;return}
  details.open=true;answer.style.height=from+'px';
  const current=answer.animate([{height:from+'px',opacity:from?1:0},{height:(expanded?answer.scrollHeight:0)+'px',opacity:expanded?1:0}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});animation=current;
  current.onfinish=()=>{if(animation!==current)return;details.open=expanded;answer.style.height='';animation=null;current.cancel()};
 });
});

const clientMarquee=document.querySelector('.client-marquee');
if(clientMarquee){
 const track=clientMarquee.querySelector('.client-marquee-track'),group=track.querySelector('.client-marquee-group'),copy=group.cloneNode(true),control=clientMarquee.querySelector('.client-motion-toggle');
 copy.setAttribute('aria-hidden','true');copy.inert=true;track.append(copy);
 control.addEventListener('click',()=>{const paused=clientMarquee.classList.toggle('is-paused');control.setAttribute('aria-pressed',String(paused));control.setAttribute('aria-label',paused?'Продолжить движение логотипов':'Остановить движение логотипов');control.textContent=paused?'▶':'Ⅱ'});
 new IntersectionObserver(entries=>clientMarquee.classList.toggle('is-offscreen',!entries[0].isIntersecting)).observe(clientMarquee);
}
