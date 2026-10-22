const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('#navlinks');
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open)});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false')}));
const dialog=document.querySelector('#player');const host=dialog.querySelector('.video-host');let opener;
// The fourth version keeps the complete source stories in accessible dialogs.
const caseDialog=document.querySelector('#case-story');
const overlays=[dialog,caseDialog];
const overlayOpen=()=>overlays.some(overlay=>overlay.open);
function observeOverlays(render){const observer=new MutationObserver(render);overlays.forEach(overlay=>observer.observe(overlay,{attributes:true,attributeFilter:['open']}))}
let caseOpener,casePreviousOverflow='';
document.addEventListener('click',event=>{
 const button=event.target.closest('.case-more');if(!button)return;
 const story=button.closest('.case')?.querySelector('.case-story-content');if(!story)return;
 event.preventDefault();event.stopPropagation();
 const body=caseDialog.querySelector('.case-story-body');body.replaceChildren(story.content.cloneNode(true));
 body.querySelector('h2').id='case-story-title';caseOpener=button;casePreviousOverflow=document.body.style.overflow;
 caseDialog.showModal();document.body.style.overflow='hidden';caseDialog.scrollTop=0;caseDialog.querySelector('.close-case').focus();
},true);
caseDialog.querySelector('.close-case').addEventListener('click',()=>caseDialog.close());
caseDialog.addEventListener('click',event=>{const r=caseDialog.getBoundingClientRect();if(event.target===caseDialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))caseDialog.close()});
caseDialog.addEventListener('close',()=>{document.body.style.overflow=casePreviousOverflow;caseDialog.querySelector('.case-story-body').replaceChildren();caseOpener?.focus()});
document.addEventListener('click',event=>{const button=event.target.closest('[data-video]');if(!button)return;const url=new URL(button.dataset.video);if(!['kinescope.io','vk.com','vk.ru','vkvideo.ru','www.youtube-nocookie.com'].includes(url.hostname))return;opener=button;const iframe=document.createElement('iframe');iframe.src=url.href;iframe.title=button.getAttribute('aria-label');iframe.allow='autoplay; fullscreen; picture-in-picture; encrypted-media';iframe.allowFullscreen=true;host.replaceChildren(iframe);dialog.showModal();document.body.style.overflow='hidden'});
function closePlayer(){dialog.close()}
dialog.querySelector('.close-player').addEventListener('click',closePlayer);
dialog.addEventListener('click',e=>{if(e.target===dialog)closePlayer()});
dialog.addEventListener('close',()=>{host.replaceChildren();document.body.style.overflow='';opener?.focus()});

// A selected local recording uses native video controls in the same dialog.
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-local-video]');if(!button)return;
 const url=new URL(button.dataset.localVideo,location.href);
 const local=url.origin===location.origin&&url.pathname.startsWith('/assets/site-editorial-v4/media/');
 const published=url.protocol==='https:'&&url.hostname==='cdn.jsdelivr.net'&&/^\/gh\/Nikkola\/creatoracademy@[^/]+\/assets\/site-editorial-v4\/media\//.test(url.pathname);
 if(!local&&!published)return;
 opener=button;const video=document.createElement('video');video.src=url.href;video.controls=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label',button.getAttribute('aria-label'));
 host.replaceChildren(video);dialog.showModal();document.body.style.overflow='hidden';video.play().catch(()=>{});
});

nav.addEventListener("keydown",event=>{if(event.key==="Escape"){nav.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.focus()}});

// Fit the original closing quote to the actual longest UTP line, after fonts load.
const heroHeader=document.querySelector('header');
if(heroHeader){
 const measureHeroHeader=()=>document.documentElement.style.setProperty('--hero-header-height',`${heroHeader.getBoundingClientRect().height}px`);
 measureHeroHeader();new ResizeObserver(measureHeroHeader).observe(heroHeader);
}
const heroName=document.querySelector('.hero .course-name');
const heroUtp=document.querySelector('.hero h1');
if(heroName&&heroUtp){
 let nameUnits=0;
 const fitHeroName=()=>{
  if(!nameUnits)return;
  const range=document.createRange();range.selectNodeContents(heroUtp);
  const lines=[...range.getClientRects()];if(!lines.length)return;
  const left=heroName.getBoundingClientRect().left;
  const target=Math.min(heroUtp.clientWidth,Math.max(...lines.map(line=>line.right))-left);
  heroName.style.setProperty('--hero-name-size',`${target/nameUnits}px`);
 };
 document.fonts.ready.then(()=>{
  const quote=heroName.querySelector('.hero__quotes-right');if(!quote)return;
  nameUnits=(quote.getBoundingClientRect().right-heroName.getBoundingClientRect().left)/parseFloat(getComputedStyle(heroName).fontSize);
  fitHeroName();new ResizeObserver(fitHeroName).observe(heroUtp);
 });
}

// Motion is progressive enhancement; the original Owl slider code is untouched.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const handwrittenNote=document.querySelector('.hero-author-note');
if(handwrittenNote&&!reducedMotion.matches){
 let played=false,observer,animation;
 const showHandwriting=()=>{handwrittenNote.style.opacity='1';animation?.cancel();observer?.disconnect()};
 handwrittenNote.style.opacity='0';
 document.fonts.ready.then(()=>{
  if(reducedMotion.matches){showHandwriting();return}
  observer=new IntersectionObserver(entries=>{
   if(played||!entries.some(entry=>entry.isIntersecting))return;
   played=true;handwrittenNote.dataset.noteRevealed='true';observer.disconnect();
   animation=handwrittenNote.animate([{opacity:0},{opacity:1}],{duration:1000,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
   animation.finished.then(showHandwriting).catch(()=>{});
  },{threshold:.25});observer.observe(handwrittenNote);
 });
 reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){played=true;showHandwriting()}});
}
const feedbackDemo=document.querySelector('.feedback-demo');
if(feedbackDemo){
 const video=feedbackDemo.querySelector('video');
 video.addEventListener('loadeddata',()=>video.classList.add('has-frame'));
 let visible=false;
 function render(){
  if(visible&&!reducedMotion.matches&&!document.hidden&&!overlayOpen()){video.play().catch(()=>{})}else video.pause();
 }
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;render()},{threshold:.25}).observe(video);
 document.addEventListener('visibilitychange',render);
 reducedMotion.addEventListener('change',render);
 observeOverlays(render);render();
}
if(!reducedMotion.matches&&'IntersectionObserver' in window){
 const reveals=document.querySelectorAll('.chapter>.wrap>h2,.scene-copy,.scene-image,.editorial-lead');
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}}),{threshold:.12});
 reveals.forEach(el=>{el.classList.add('reveal');observer.observe(el)});document.body.classList.add('motion-ready');
}
// Every quote enters on each visit; jumping past one must not pre-reveal it.
if(!reducedMotion.matches&&'IntersectionObserver' in window){
 const quotes=[...document.querySelectorAll('.editorial-quote,.author-manifesto')];
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  entry.target.classList.toggle('quote-shown',entry.isIntersecting);
 }),{threshold:0});
 quotes.forEach(quote=>quote.classList.add('quote-entrance'));
 // Establish the hidden style before any initially visible quote is revealed.
 quotes.forEach(quote=>getComputedStyle(quote.querySelector('.quote-copy')).opacity);
 quotes.forEach(quote=>observer.observe(quote));
 reducedMotion.addEventListener('change',event=>{if(event.matches){
  observer.disconnect();quotes.forEach(quote=>quote.classList.add('quote-shown'));
 }});
}
// Decorative loops start only while visible; explanations keep sound in the player.
document.querySelectorAll('video[data-ambient]:not(#tools video)').forEach(video=>{
 let visible=false;
 video.addEventListener('loadeddata',()=>video.classList.add('has-frame'));
 function render(){if(visible&&!reducedMotion.matches&&!document.hidden&&!overlayOpen())video.play().catch(()=>{});else video.pause()}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;render()},{threshold:.2}).observe(video);
 document.addEventListener('visibilitychange',render);reducedMotion.addEventListener('change',render);
 observeOverlays(render);
});
const demo=document.querySelector('.device-demo');
const chatDemo=document.querySelector('[data-chat-demo]');
if(chatDemo){
 const card=chatDemo.closest('.process-card'),messages=[...chatDemo.querySelectorAll('[data-chat-message]')],viewport=chatDemo.querySelector('.chat-viewport'),typing=chatDemo.querySelector('[data-chat-typing]');
 let elapsed=0,last=performance.now(),phase=-1;
 function renderChat(next){
  if(next===phase)return;phase=next;chatDemo.dataset.chatPhase=String(next);
  messages.forEach((message,i)=>message.classList.toggle('is-shown',i<next));
  typing.textContent=['Участник печатает','Николай печатает','Участница печатает',''][next];
 }
 function tickChat(){const now=performance.now(),active=card.classList.contains('is-visible')&&!document.hidden&&!reducedMotion.matches&&!overlayOpen();if(active)elapsed=(elapsed+Math.min(now-last,500))%23000;last=now;renderChat(reducedMotion.matches?3:elapsed<1800?0:elapsed<6500?1:elapsed<12500?2:3)}
 new ResizeObserver(()=>{viewport.scrollTop=viewport.scrollHeight}).observe(chatDemo.querySelector('.chat-thread'));
 document.addEventListener('visibilitychange',()=>{last=performance.now()});reducedMotion.addEventListener('change',tickChat);
 observeOverlays(()=>{last=performance.now();tickChat()});setInterval(tickChat,100);tickChat();
}
const processCards=new Set();
{
 const syncProcessMotion=()=>processCards.forEach(card=>card.style.setProperty('--process-motion',card.classList.contains('is-visible')&&!document.hidden&&!reducedMotion.matches&&!overlayOpen()?'running':'paused'));
 const processObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.target.classList.toggle('is-visible',entry.isIntersecting));syncProcessMotion()},{threshold:.1});
 function observeCards(){
  processCards.forEach(card=>{if(!card.isConnected){processObserver.unobserve(card);processCards.delete(card)}});
  document.querySelectorAll('#process .process-card,#tools .tool').forEach(card=>{if(!processCards.has(card)){processCards.add(card);card.classList.remove('is-visible');processObserver.observe(card)}});
 }
 observeCards();
 new MutationObserver(observeCards).observe(document.querySelector('#tools .kit__grid'),{childList:true,subtree:true});
 document.addEventListener('visibilitychange',syncProcessMotion);reducedMotion.addEventListener('change',syncProcessMotion);observeOverlays(syncProcessMotion);
}
if(demo){
 const video=demo.querySelector('[data-demo-video]'),phoneLesson=demo.querySelector('[data-phone-lesson-video]'),phoneLighting=demo.querySelector('[data-phone-lighting-video]'),pause=demo.querySelector('.demo-motion');
 const lessonVideos=[video,phoneLesson,phoneLighting];
 let phase=0,timer=null,visible=false,paused=reducedMotion.matches;
 lessonVideos.forEach(v=>v.addEventListener('loadeddata',()=>v.classList.add('has-frame')));
 function render(){demo.dataset.phase=String(phase);const play=visible&&!paused&&!document.hidden&&!overlayOpen();lessonVideos.forEach(v=>{const active=v===phoneLighting?phase===1||phase===2:phase===1;if(active&&play)v.play().catch(()=>{});else v.pause()})}
 function stop(){clearInterval(timer);timer=null;lessonVideos.forEach(v=>v.pause());demo.classList.add('is-paused')}
 function start(){stop();if(!visible||paused||document.hidden||overlayOpen())return;demo.classList.remove('is-paused');render();timer=setInterval(()=>{phase=(phase+1)%3;render()},6000)}
 pause.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.setAttribute('aria-label',paused?'Продолжить анимацию обучения':'Остановить анимацию обучения');pause.querySelector('path').setAttribute('d',paused?'M8 5l11 7-11 7Z':'M9 6v12M15 6v12');if(paused)stop();else start()});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else stop()},{threshold:.2}).observe(demo);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else start()});
 reducedMotion.addEventListener('change',event=>{paused=event.matches;pause.setAttribute('aria-pressed',String(paused));if(paused){phase=0;render();stop()}else start()});
 observeOverlays(()=>{if(overlayOpen())stop();else start()});render();
}

// Distinct illustrative stories advance only while their card is on screen.
const storyStates=new Map();
function initializeStories(){document.querySelectorAll('[data-process-story]').forEach(story=>{
 if(storyStates.has(story))return;
 const card=story.closest('.process-card,.tool'),video=story.querySelector('[data-project-demo-video],[data-practice-demo-video]'),durations=story.dataset.processStory==='project'?[6000,10000,7500]:story.dataset.processStory==='practice'?[5000,5000,5000,7680]:[6500,6500,6500];
 const total=durations.reduce((a,b)=>a+b,0);let elapsed=0,last=performance.now(),phase=-1;
 video?.addEventListener('loadeddata',()=>video.classList.add('has-frame'));
 function tick(){const now=performance.now(),active=card.isConnected&&card.classList.contains('is-visible')&&!document.hidden&&!reducedMotion.matches&&!overlayOpen();
  if(active)elapsed=(elapsed+Math.min(now-last,500))%total;last=now;
  const next=reducedMotion.matches?durations.length-1:durations.findIndex((duration,index)=>elapsed<durations.slice(0,index+1).reduce((a,b)=>a+b,0));
  if(next!==phase){phase=next;story.dataset.storyPhase=String(next);story.querySelectorAll('[data-story-panel]').forEach(panel=>panel.setAttribute('aria-hidden',String(Number(panel.dataset.storyPanel)!==next)))}
  story.classList.toggle('is-running',active);
  if(video){const videoPhase=story.dataset.processStory==='practice'?3:1;if(active&&phase===videoPhase){if(video.paused)video.play().catch(()=>{})}else video.pause()}
 }
 storyStates.set(story,tick);tick();
})}
function tickStories(){storyStates.forEach((tick,story)=>{if(!story.isConnected)storyStates.delete(story);else tick()})}
initializeStories();setInterval(tickStories,100);observeOverlays(tickStories);document.addEventListener('visibilitychange',tickStories);reducedMotion.addEventListener('change',tickStories);
new MutationObserver(initializeStories).observe(document.querySelector('#tools .kit__grid'),{childList:true,subtree:true});

// Owl creates new material clones after initialization and responsive refreshes.
// Bind their real video too, then let IntersectionObserver handle visibility.
const materialVideos=new Map();
function initializeMaterialVideos(){document.querySelectorAll('#tools video[data-ambient]').forEach(video=>{
 if(materialVideos.has(video))return;let visible=false;
 const render=()=>{if(video.isConnected&&visible&&!reducedMotion.matches&&!document.hidden&&!overlayOpen())video.play().catch(()=>{});else video.pause()};
 video.addEventListener('loadeddata',()=>video.classList.add('has-frame'));
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;render()},{threshold:.2});observer.observe(video);
 materialVideos.set(video,{render,observer});
})}
function renderMaterialVideos(){materialVideos.forEach(({render,observer},video)=>{if(!video.isConnected){video.pause();observer.disconnect();materialVideos.delete(video)}else render()})}
initializeMaterialVideos();new MutationObserver(()=>{renderMaterialVideos();initializeMaterialVideos()}).observe(document.querySelector('#tools .kit__grid'),{childList:true,subtree:true});
document.addEventListener('visibilitychange',renderMaterialVideos);reducedMotion.addEventListener('change',renderMaterialVideos);observeOverlays(renderMaterialVideos);

// Add position controls around the existing Owl instances, preserving their
// original drag, loop, click-to-focus, responsive settings and item order.
const siteJQ=window.creatorAcademyJQuery;
if(siteJQ){
 // This branch shows complete case cards: three on desktop, two on tablet.
 siteJQ(function(){
  const audiencePadding=()=>innerWidth<768?20:Math.round((innerWidth-Math.min(1240,innerWidth*.76))/2);
  const highlightGalleries=siteJQ('#audience-gallery,#lessons-gallery,#skills-gallery');
  highlightGalleries.each(function(){siteJQ(this).owlCarousel({items:1,center:true,loop:true,dots:false,nav:false,mouseDrag:true,touchDrag:true,autoplay:false,smartSpeed:reducedMotion.matches?0:500,margin:24,stagePadding:audiencePadding()})});
  const skills=document.querySelector('#skills-gallery');
  if(skills){
   let visible=false,moving=false,selected=null;
   function renderSkill(){
    const video=skills.querySelector('.owl-item.center [data-slide-ambient]');
    const play=visible&&!moving&&!reducedMotion.matches&&!document.hidden&&!overlayOpen();
    skills.querySelectorAll('[data-slide-ambient]').forEach(other=>{if(other!==video||!play){other.pause();other.classList.remove('has-frame')}});
    if(selected!==video){selected=video;if(video)video.currentTime=0}
    if(video&&play)video.play().then(()=>{if(selected===video&&visible&&!moving&&!reducedMotion.matches&&!document.hidden&&!overlayOpen())video.classList.add('has-frame');else video.pause()}).catch(()=>{});
   }
   siteJQ(skills).on('translate.owl.carousel drag.owl.carousel',()=>{moving=true;renderSkill()});
   siteJQ(skills).on('translated.owl.carousel dragged.owl.carousel refreshed.owl.carousel',()=>{moving=false;requestAnimationFrame(renderSkill)});
   new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;renderSkill()},{threshold:.2}).observe(skills);
   document.addEventListener('visibilitychange',renderSkill);reducedMotion.addEventListener('change',renderSkill);
   observeOverlays(renderSkill);
   skills.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();siteJQ(skills).trigger(event.key==='ArrowRight'?'next.owl.carousel':'prev.owl.carousel')});
   renderSkill();
  }
  let audienceResize;
  window.addEventListener('resize',()=>{clearTimeout(audienceResize);audienceResize=setTimeout(()=>{highlightGalleries.each(function(){const o=siteJQ(this).data('owl.carousel');if(o){o.options.stagePadding=audiencePadding();o.refresh()}})},150)});
  const rail=siteJQ('#casesSlider'),carousel=rail.data('owl.carousel');if(!carousel)return;
  carousel.options.autoHeight=false;
  carousel.options.responsive={0:{items:1,margin:24,stagePadding:0,autoHeight:false},768:{items:1,margin:24,stagePadding:0,autoHeight:false},1200:{items:1,margin:24,stagePadding:0,autoHeight:false}};
  carousel.refresh();
  let measuredWidth=0;
  function equalizeCases(){
   rail[0].style.removeProperty('--case-height');
   const cards=carousel.items().map(item=>item[0].querySelector('.case'));
   // Dmitry Kim is the reference. A longer story can raise the shared height,
   // so neither hidden text nor a scrollbar is needed at narrow widths.
   const kim=cards.find(card=>card.querySelector('.person h3').textContent.includes('Дмитрий Ким'));
   const height=Math.ceil(Math.max(kim?.getBoundingClientRect().height||0,...cards.map(card=>card.getBoundingClientRect().height)));
   rail[0].style.setProperty('--case-height',height+'px');
   rail[0].querySelector('.owl-stage-outer').style.height='';
   measuredWidth=rail[0].clientWidth;
  }
  rail.on('refreshed.owl.carousel',equalizeCases);
  // Owl normally waits before refreshing widths after resize. Measure only
  // after that refresh, so the shared height never uses the previous slide width.
  function resizeCases(){carousel.refresh();equalizeCases()}
  new ResizeObserver(()=>{if(rail[0].clientWidth!==measuredWidth)resizeCases()}).observe(rail[0]);
  window.addEventListener('resize',resizeCases);
  document.fonts.ready.then(equalizeCases);equalizeCases();
  const materials=siteJQ('.kit__grid').data('owl.carousel');if(materials){materials.options.responsive={0:{items:1,margin:20},768:{items:2,margin:24},1200:{items:3,margin:24}};materials.refresh()}
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

// Smooth reversible content and plus-to-cross motion across every disclosure.
const disclosures=new Map();
document.querySelectorAll('details').forEach(details=>{
 const summary=details.querySelector('summary'),answer=details.querySelector('.faq-answer,.disclosure-content');if(!answer)return;
 let expanded=details.open,animation=null,version=0,moving=false;summary.setAttribute('aria-expanded',String(expanded));
 function setExpanded(next){
  if(next===expanded)return;
  expanded=next;
  if(expanded&&details.closest('.faq'))disclosures.forEach((set,other)=>{if(other!==details&&other.closest('.faq'))set(false)});
  const turn=++version,from=details.open?answer.getBoundingClientRect().height:0,opacity=details.open?getComputedStyle(answer).opacity:0;
  animation?.cancel();summary.setAttribute('aria-expanded',String(expanded));
  // The retained original script also attaches a disclosure handler. This
  // capturing handler owns the one outer animation and keeps its inner panel natural.
  moving=true;details.classList.add('disclosure-moving');
  const legacyPanel=answer.querySelector('.disclosure-panel');
  if(legacyPanel){legacyPanel.style.height='auto';legacyPanel.style.opacity='1';legacyPanel.style.transition='none'}
  if(reducedMotion.matches){details.open=expanded;if(expanded)details.prepareDisclosure?.();answer.style.height='';details.classList.remove('disclosure-moving');animation=null;moving=false;return}
  details.open=true;answer.style.height=from+'px';
  if(expanded)details.prepareDisclosure?.();
  answer.style.height='auto';const target=expanded?answer.getBoundingClientRect().height:0;answer.style.height=from+'px';
  requestAnimationFrame(()=>{
   if(turn!==version)return;
   const current=answer.animate([{height:from+'px',opacity},{height:target+'px',opacity:expanded?1:0}],{duration:500,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});animation=current;
   current.onfinish=()=>{if(animation!==current)return;details.open=expanded;answer.style.height='';details.classList.remove('disclosure-moving');animation=null;moving=false;current.cancel()};
  });
 }
 disclosures.set(details,setExpanded);
 summary.addEventListener('click',event=>{
  event.preventDefault();event.stopImmediatePropagation();setExpanded(!expanded);
 },true);
 details.addEventListener('toggle',()=>{if(!moving&&details.open!==expanded)setExpanded(details.open)});
});

const clientMarquee=document.querySelector('.client-marquee');
if(clientMarquee){
 clientMarquee.querySelectorAll('.client-marquee-track').forEach(track=>{const group=track.querySelector('.client-marquee-group'),copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');copy.inert=true;track.append(copy)});
 let visible=false;
 const render=()=>clientMarquee.classList.toggle('is-offscreen',!visible||document.hidden||overlayOpen());
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;render()}).observe(clientMarquee);
 document.addEventListener('visibilitychange',render);observeOverlays(render);render();
}
