const {test,expect}=require('@playwright/test');

test('responsive hero keeps its approved pyramid, full portrait and first-screen action',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const width of [320,390,768,1100,1280,1440,1920,2048]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  const m=await page.locator('.hero').evaluate(el=>{
   const rect=s=>el.querySelector(s).getBoundingClientRect(),film=rect('.hero-preview-film'),button=rect('.actions>.btn'),h=rect('h1');
   const copy=el.querySelector(innerWidth<768?'.hero-mobile-copy':'.hero-desktop-copy');
   const widths=[...copy.children].map(n=>{const r=document.createRange();r.selectNodeContents(n);return r.getBoundingClientRect().width});
   return {ratio:film.width/film.height,overflow:document.documentElement.scrollWidth-innerWidth,buttonBottom:button.bottom,center:Math.abs(h.x+h.width/2-innerWidth/2),widths};
  });
  expect(m.overflow,JSON.stringify({width,...m})).toBeLessThanOrEqual(1);expect(m.ratio).toBeCloseTo(16/9,2);
  if(width<768){expect(m.center).toBeLessThan(1);expect(m.buttonBottom).toBeLessThan(1000);expect(m.widths[0]).toBeGreaterThan(m.widths.at(-1));await expect(page.locator('.hero-mobile-portrait')).toBeVisible()}
  else {await expect(page.locator('.hero-mobile-portrait')).toBeHidden();await expect(page.locator('.hero-preview-footer .hero-author-note')).toBeVisible()}
 }
});

test('author signature remains readable with and without reduced motion',async({page})=>{
 for(const width of [390,1440])for(const reducedMotion of ['reduce','no-preference']){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion});await page.goto('/');
  const note=page.locator(width<768?'.hero-mobile-portrait .hero-author-note':'.hero-preview-footer .hero-author-note');
  await note.scrollIntoViewIfNeeded();await expect(note).toHaveText('Авторский курс Николая Чернобаева');await expect(note).toBeVisible();expect(await note.evaluate(n=>getComputedStyle(n).opacity)).toBe('1');
 }
});

test('FAQ closes the previous answer smoothly and keeps one selected through quick keyboard changes',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const items=page.locator('.faq details'),a=items.nth(0),b=items.nth(1),c=items.nth(2);
 await a.locator('summary').click();await expect.poll(()=>a.locator('.faq-answer').evaluate(el=>el.getAnimations().length)).toBe(0);
 const heights=await b.evaluate(async (el)=>{const first=el.parentElement.querySelector('details .faq-answer'),values=[];el.querySelector('summary').click();const start=performance.now();await new Promise(resolve=>{function sample(){values.push(first.getBoundingClientRect().height);performance.now()-start<650?requestAnimationFrame(sample):resolve()}requestAnimationFrame(sample)});return values});
 const max=Math.max(...heights);expect(max).toBeGreaterThan(20);expect(new Set(heights.filter(h=>h>1&&h<max-1).map(Math.round)).size).toBeGreaterThan(3);
 await expect(a).not.toHaveAttribute('open','');await expect(b).toHaveAttribute('open','');
 await c.locator('summary').focus();await page.keyboard.press('Enter');await a.locator('summary').focus();await page.keyboard.press('Space');
 await expect.poll(()=>items.locator('summary[aria-expanded="true"]').count()).toBe(1);
 await expect.poll(()=>page.locator('.faq details[open]').count()).toBe(1);await expect(a).toHaveAttribute('open','');
 await page.emulateMedia({reducedMotion:'reduce'});await b.locator('summary').click();await expect(page.locator('.faq details[open]')).toHaveCount(1);await expect(b).toHaveAttribute('open','');
 await expect(page.locator('.faq')).not.toContainText('Освоение конкретного интерфейса');
});

test('player has the original plain cross and half-black backdrop with rounded video corners',async({page})=>{
 await page.route('https://kinescope.io/**',r=>r.fulfill({contentType:'text/html',body:'Player layout check'}));await page.goto('/');
 for(const width of [390,900,1440]){
  await page.setViewportSize({width,height:1000});const opener=page.locator(width<768?'.hero-mobile-portrait .intro-video-button':'.hero-preview-footer .intro-video-button');await opener.click();
  const m=await page.locator('#player').evaluate(el=>{const b=el.querySelector('.close-player'),s=getComputedStyle(b),p=getComputedStyle(b,'::before'),d=getComputedStyle(el,'::backdrop'),r=el.getBoundingClientRect();return {width:r.width,ratio:r.width/r.height,bw:b.clientWidth,bh:b.clientHeight,bg:s.backgroundColor,border:s.borderWidth,radius:s.borderRadius,crossWidth:p.width,blur:d.backdropFilter,backdrop:d.backgroundColor,videoRadius:getComputedStyle(el.querySelector('iframe')).borderRadius}});
  expect(m.width).toBeCloseTo(width===900?600:Math.min(width*.8,800),0);expect(m.ratio).toBeCloseTo(16/9,2);expect(m.bw).toBe(44);expect(m.bh).toBe(44);expect(m.bg).toBe('rgba(0, 0, 0, 0)');expect(m.border).toBe('0px');expect(m.radius).toBe('0px');expect(m.crossWidth).toBe('1px');expect(m.blur).toBe('none');expect(m.backdrop).toBe('rgba(0, 0, 0, 0.5)');expect(m.videoRadius).toBe('12px');
  await page.keyboard.press('Escape');await expect(opener).toBeFocused();await expect.poll(()=>page.locator('body').evaluate(el=>el.style.overflow)).toBe('');
 }
});

test('author Play is truly circular, uses the original triangle and does not blur its background',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const [width,size,triangle] of [[390,45,13],[900,39,13],[1440,63,16],[2048,63,16]]){
  await page.setViewportSize({width,height:1000});const button=page.locator('#about .owl-item:not(.cloned) .round__btn').first();
  const m=await button.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),svg=el.querySelector('svg');return {width:r.width,height:r.height,blur:s.backdropFilter,shadow:s.boxShadow,view:svg.getAttribute('viewBox'),sw:svg.getBoundingClientRect().width,border:s.borderTopWidth}});
  expect(m.width).toBe(size);expect(m.height).toBe(size);expect(m.sw).toBe(triangle);expect(m.blur).toBe('none');expect(m.shadow).toBe('none');expect(m.view).toBe('0 0 10 11');expect(parseFloat(m.border)).toBeGreaterThan(0);
  const author=await page.locator('#about').evaluate(el=>{const heading=el.querySelector('h2').getBoundingClientRect(),photo=el.querySelector('.about__block').getBoundingClientRect();return{headingMiddle:heading.top+heading.height/2,photoTop:photo.top,links:[...el.querySelectorAll('a.kinopoisk')].map(a=>({color:getComputedStyle(a).color,parent:getComputedStyle(a.parentElement).color,underline:getComputedStyle(a).textDecorationLine}))}});
  expect(Math.abs(author.headingMiddle-author.photoTop)).toBeLessThan(1);expect(author.links.every(a=>a.color!==a.parent&&a.underline.includes('underline'))).toBe(true);
 }
});

test('material stories survive Owl clones and resize, pause offscreen and reveal the real templates',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const rail=page.locator('#tools .kit__grid');await rail.scrollIntoViewIfNeeded();
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await expect(rail).toHaveClass(/owl-loaded/);
  await rail.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').to(0,0));
  const story=rail.locator('.owl-item.active [data-process-story]').first();await story.scrollIntoViewIfNeeded();await expect(story).toHaveClass(/is-running/);
  await expect.poll(()=>story.getAttribute('data-story-phase'),{timeout:8000}).toBe('1');
  await page.locator('.hero').scrollIntoViewIfNeeded();await expect(story).not.toHaveClass(/is-running/);const phase=await story.getAttribute('data-story-phase');await page.waitForTimeout(800);await expect(story).toHaveAttribute('data-story-phase',phase);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await rail.scrollIntoViewIfNeeded();
 const originals=rail.locator('.owl-item:not(.cloned) [data-process-story]');await expect(originals).toHaveCount(6);
 for(const story of await originals.all()){await expect(story).toHaveAttribute('data-story-phase','2');await expect(story.locator('[data-story-panel="2"]')).toHaveAttribute('aria-hidden','false');expect(await story.locator('img').evaluate(im=>im.complete&&im.naturalWidth>0)).toBe(true)}
 await page.emulateMedia({reducedMotion:'no-preference'});await rail.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').to(6,0));
 const preset=rail.locator('.owl-item.active .preset-tool video').first();await preset.scrollIntoViewIfNeeded();await expect.poll(()=>preset.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);
 await page.locator('#player').evaluate(el=>el.showModal());await expect.poll(()=>preset.evaluate(v=>v.paused)).toBe(true);await page.locator('#player').evaluate(el=>el.close());await expect.poll(()=>preset.evaluate(v=>!v.paused)).toBe(true);
});

test('finish invitation gives both sentences the same typography',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const width of [320,390,768,1000,1440,1920,2048]){await page.setViewportSize({width,height:1000});const title=page.locator('#finish .finish-title'),date=page.locator('#finish .finish-date');await expect(title).toHaveText('Записывайся на ближайший 9-й поток.');await expect(date).toHaveText('Старт 2 ноября 2026 года');await expect(page.locator('#finish .btn-label')).toHaveText('Записаться');expect(await title.evaluate(el=>getComputedStyle(el).font)).toBe(await date.evaluate(el=>getComputedStyle(el).font));
  for(const text of [title,date]){const m=await text.evaluate(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight),overflow:el.scrollWidth-el.clientWidth,font:getComputedStyle(el).fontFamily,size:parseFloat(getComputedStyle(el).fontSize)}));if(width<768){expect(m.height).toBeLessThanOrEqual(m.line*2+1);expect(m.font).toContain('Bebas');expect(m.size).toBeGreaterThanOrEqual(26)}else expect(Math.abs(m.height-m.line)).toBeLessThan(1);expect(m.overflow).toBeLessThanOrEqual(1)}
  const action=await page.locator('#finish .finish-action').evaluate(el=>{const b=el.querySelector('.btn').getBoundingClientRect(),copy=el.querySelector('div').getBoundingClientRect(),r=el.getBoundingClientRect();return{button:b.toJSON(),copy:copy.toJSON(),right:r.right,center:r.left+r.width/2}});if(width<768)expect(Math.abs(action.button.left+action.button.width/2-action.center)).toBeLessThan(1);else{expect(Math.abs(action.button.right-action.right)).toBeLessThan(1);expect(action.button.left-action.copy.right).toBeGreaterThanOrEqual(23)}
  const edges=await page.evaluate(()=>{const a=document.querySelector('#finish .wrap').getBoundingClientRect(),b=document.querySelector('footer.wrap').getBoundingClientRect();return {left:Math.abs(a.left-b.left),right:Math.abs(a.right-b.right)}});expect(edges.left).toBeLessThan(1);expect(edges.right).toBeLessThan(1);
  if(width<768){for(const text of [title,date]){const r=await text.boundingBox();expect(r.x).toBeGreaterThanOrEqual(19);expect(r.x+r.width).toBeLessThanOrEqual(width-19)}}
  if(width===390)await page.locator('#finish .finish-action').screenshot({path:'diagnostics/mobile-final-20261023/finish-'+page.context().browser().browserType().name()+'.png',style:'.nav{visibility:hidden}'});
 }
});

test('hero gives the outcome briefly and the course facts have a separate two-row rhythm',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('.hero-lead .hero-desktop-copy')).toHaveText('Научись создавать кинематографичные рилз,подкасты и влоги с единой системойзнаний, практикой и поддержкой.');
 await expect(page.locator('#course-facts h2')).toHaveText('Курс в цифрах');
 for(const width of [320,390,768,1440,1920]){await page.setViewportSize({width,height:1000});const m=await page.locator('#course-facts').evaluate(el=>{const cards=[...el.querySelectorAll('.course-numbers>li')].map(n=>n.getBoundingClientRect()),groups=new Map();cards.forEach(r=>{const y=Math.round(r.top);groups.set(y,(groups.get(y)||0)+1)});return{rows:[...groups.values()],widths:cards.map(r=>r.width),gap:el.querySelector('h2').getBoundingClientRect().top-document.querySelector('.hero').getBoundingClientRect().bottom}});expect(m.rows).toEqual(width<768?[2,2,2]:[3,3]);expect(Math.max(...m.widths)-Math.min(...m.widths)).toBeLessThan(1);expect(m.gap).toBeGreaterThanOrEqual(width<768?47:79)}
});

test('six material palettes and their compositions are distinct from the other process stories',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('#tools .kit__grid')).toHaveClass(/owl-loaded/);
 const m=await page.locator('#tools .owl-item:not(.cloned) .material-story').evaluateAll(nodes=>{const other=[...document.querySelectorAll('#process img')].map(im=>im.getAttribute('src')),panels=[...document.querySelectorAll('#process .graphic-panel')].map(p=>p.innerHTML);return {colors:nodes.map(n=>getComputedStyle(n).backgroundColor),images:nodes.map(n=>n.querySelector('img').getAttribute('src')),duplicateImages:nodes.flatMap(n=>[...n.querySelectorAll('img')]).filter(im=>other.includes(im.getAttribute('src'))).length,duplicatePanels:nodes.flatMap(n=>[...n.querySelectorAll('.graphic-panel')]).filter(p=>panels.includes(p.innerHTML)).length}});
 expect(new Set(m.colors).size).toBe(6);expect(new Set(m.images).size).toBe(6);expect(m.duplicateImages).toBe(0);expect(m.duplicatePanels).toBe(0);
});
