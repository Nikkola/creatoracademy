const {test,expect}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const expected=JSON.parse(fs.readFileSync(path.join(root,'source/story/expected.json')));
const originals=selector=>`${selector}:not(.cloned *)`;
test('full content parity and original slider implementation',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.locator('#casesSlider')).toHaveClass(/owl-loaded/);
 const videos=await page.locator('[data-video]').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.video))].sort());expect(videos).toEqual(expected.videos);
 const payments=await page.locator('#rates a[href*="get_form"]').evaluateAll(nodes=>nodes.map(n=>n.href).sort());expect(payments).toEqual(expected.payments);
 expect(await page.locator('#casesSlider .owl-item:not(.cloned)>.case').count()).toBe(expected.counts.cases);
 expect(await page.locator('#gallery .owl-item:not(.cloned)>.film').count()).toBe(expected.counts.works);
 expect(await page.locator('#reviews .owl-item:not(.cloned)>.film').count()).toBe(expected.counts.video_reviews);
 expect(await page.locator('#reviews-container>.review').count()).toBe(expected.counts.written_reviews);
 expect(await page.locator('#lessons .owl-item:not(.cloned)>.film').count()).toBe(expected.counts.lessons);
 expect(await page.locator('.programme-module h3').count()).toBe(7);
 const before=fs.readFileSync(path.join(root,'assets/site-audit-v9/site.js'));const after=fs.readFileSync(path.join(root,'assets/site-editorial-v4/legacy-interactions.js'));expect(after.equals(before)).toBe(true);
 const local=await page.content();expect(local).not.toContain('mc.yandex.ru/metrika/tag.js');expect(local).not.toContain('top-fwz1.mail.ru/js');
 expect(errors).toEqual([]);
});
for(const [width,height] of [[320,800],[390,844],[768,1024],[1440,1000],[2048,1152]])test(`layout, full photograph, readable hierarchy ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.hero-portrait img')).toBeVisible();await page.locator('.hero-portrait img').evaluate(im=>im.decode());
 const metrics=await page.evaluate(()=>{const im=document.querySelector('.hero-portrait img'),r=im.getBoundingClientRect(),brand=document.querySelector('.nav>.brand').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth-innerWidth,center:Math.abs(brand.left+brand.width/2-innerWidth/2),ratio:r.width/r.height,natural:im.naturalWidth/im.naturalHeight,mask:getComputedStyle(im).maskImage,font:parseFloat(getComputedStyle(document.querySelector('.fine')).fontSize)}});
 expect(metrics.overflow).toBeLessThanOrEqual(1);expect(metrics.center).toBeLessThan(1);expect(metrics.ratio).toBeCloseTo(metrics.natural,2);expect(metrics.mask).toBe('none');expect(metrics.font).toBeGreaterThanOrEqual(14);
 const placement=await page.locator('.hero-portrait').evaluate(el=>{const photo=el.querySelector('img').getBoundingClientRect(),button=el.querySelector('.intro-video-button').getBoundingClientRect();return {edge:innerWidth>1100?Math.abs(button.x+button.width/2-photo.x):Math.abs(button.y+button.height/2-photo.y),size:button.width,photoWidth:photo.width}});expect(placement.edge).toBeLessThan(1);expect(placement.size).toBeCloseTo(Math.min(70,Math.max(36,placement.photoWidth*.11)),1);
 await expect(page.locator('main>section').nth(1)).toHaveAttribute('id','course-facts');await expect(page.locator('main>section').nth(2)).toHaveAttribute('id','begin');expect(await page.locator('.course-numbers>li').count()).toBe(6);await expect(page.locator('#first-proof')).toHaveCount(0);
 const audience=page.locator('#audience-gallery');expect(await audience.locator('img').evaluateAll(nodes=>new Set(nodes.map(im=>im.getAttribute('src'))).size)).toBe(4);await expect(page.locator('#begin')).toContainText('Блогерам и экспертам');await expect(page.locator('#begin')).toContainText('Предпринимателям');
 if(width<768)expect(await audience.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').settings.loop)).toBe(true);
 await expect(page.locator('h1')).toContainText(width<768?'Продвигай себя и своё дело через контент.':'Научись продвигать себя и своё дело');await expect(page.locator('.hero .kicker')).toHaveCount(0);
 if(width<760){await page.locator('.menu-toggle').click();await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','true');await page.locator('#navlinks a[href="#rates"]').click();await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false')}
 await page.locator('#rates').scrollIntoViewIfNeeded();expect(await page.locator('.included-tools li').count()).toBe(6);await expect(page.locator('.included')).toContainText('Все практические материалы остаются навсегда');
});
test('unchanged Owl loops, drag, focus-on-card and review rail',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('#gallery .owl-carousel')).toHaveClass(/owl-loaded/);
 const settings=await page.locator('#gallery .owl-carousel').evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return {loop:o.settings.loop,mouseDrag:o.settings.mouseDrag,touchDrag:o.settings.touchDrag,items:o.settings.items}});expect(settings).toEqual({loop:true,mouseDrag:true,touchDrag:true,items:4});
 const rail=page.locator('#gallery .owl-carousel');await rail.scrollIntoViewIfNeeded();
 const current=()=>rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())});const before=await current();
 await rail.locator('.owl-item.active h3').first().click();await expect.poll(current).not.toBe(before);
 const rect=await rail.boundingBox();const prior=await current();await page.mouse.move(rect.x+rect.width*.75,rect.y+100);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.15,rect.y+100,{steps:12});await page.mouse.up();await expect.poll(current).not.toBe(prior);
 await rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');o.to(o.items().length-1,0);o.next(0)});await expect.poll(current).toBe(0);
 const reviews=page.locator('#reviews-container');await reviews.scrollIntoViewIfNeeded();await reviews.locator('h3').first().click();await expect.poll(()=>reviews.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
});
test('portfolio disclosures keep every original work and carousel',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('#about>.wrap>details')).toHaveCount(0);
 await expect.poll(()=>page.locator('.about__list').evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').width())).toBeGreaterThan(0);
 const categories=page.locator('.portfolio-category');expect(await categories.count()).toBe(6);let count=0;
 for(let i=0;i<await categories.count();i++){const cat=categories.nth(i);await cat.locator('summary').click();await expect(cat.locator('.owl-carousel')).toHaveClass(/owl-loaded/);count+=await cat.locator('.owl-item:not(.cloned)>.film').count();expect(await cat.locator('.owl-carousel').evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').settings.loop)).toBe(true)}
 expect(count).toBe(expected.counts.portfolio);
});
test('video buttons including cloned slides open and release focus',async({page})=>{
 await page.goto('/');await page.route(/https:\/\/(kinescope\.io|vk\.com|vk\.ru|vkvideo\.ru)\//,r=>r.fulfill({contentType:'text/html',body:'<html><body>Player URL test</body></html>'}));
 const intro=page.locator('.hero .intro-video-button');await intro.click();await expect(page.locator('dialog iframe')).toHaveAttribute('src','https://kinescope.io/embed/u2Tb99aoUmhahUHxd3xX4q');await page.keyboard.press('Escape');await expect(page.locator('dialog iframe')).toHaveCount(0);await expect(intro).toBeFocused();
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.intro-video-arrow').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
 const button=page.locator('#gallery .owl-item.active [data-video]').first();await button.click();await expect(page.locator('#player')).toHaveAttribute('open','');await expect(page.locator('dialog iframe')).toHaveAttribute('src',/https:\/\//);await page.keyboard.press('Escape');await expect(page.locator('dialog iframe')).toHaveCount(0);await expect(button).toBeFocused();
});
test('learning demonstration clicks, swipes, pauses and respects reduced motion',async({page})=>{
 await page.goto('/');const demo=page.locator('.device-demo');await demo.scrollIntoViewIfNeeded();await expect(demo.locator('.learning-tabs')).toHaveCount(0);await expect(demo.locator('.demo-cursor')).toHaveCount(1);await expect(demo.locator('.swipe-touch')).toHaveCount(2);
 await expect.poll(()=>demo.getAttribute('data-phase'),{timeout:12000}).toBe('1');const video=demo.locator('[data-demo-video]');await expect.poll(()=>video.evaluate(v=>v.readyState)).toBeGreaterThanOrEqual(2);expect(await video.evaluate(v=>v.muted)).toBe(true);
 const phoneVideo=demo.locator('[data-phone-lesson-video]');await expect.poll(()=>phoneVideo.evaluate(v=>!v.paused&&v.readyState>=2)).toBe(true);const initial=await phoneVideo.evaluate(v=>v.currentTime);await expect.poll(()=>phoneVideo.evaluate(v=>v.currentTime)).toBeGreaterThan(initial+.1);
 await expect(demo.locator('.demo-motion')).toHaveCount(0);await page.locator('.hero').scrollIntoViewIfNeeded();const phase=await demo.getAttribute('data-phase');await page.waitForTimeout(6500);await expect(demo).toHaveAttribute('data-phase',phase);expect(await video.evaluate(v=>v.paused)).toBe(true);
 expect(await phoneVideo.evaluate(v=>v.paused)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(demo).toHaveAttribute('data-phase','0');expect(await demo.locator('.demo-cursor').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});
test('SaleBot build and security boundaries',async({page,request})=>{
 const html=fs.readFileSync(path.join(root,'dist/salebot.html'),'utf8');expect(html).not.toMatch(/127\.0\.0\.1|localhost|file:\/\/|\.\.\/creatoracademy/);expect(html).toContain('106221169');expect(html).toContain('3632078');expect(html).not.toContain('src="/assets/');expect(html).not.toContain('href="/assets/');expect(html).toContain('<style>');
 for(const url of ['/source/story/baseline.html','/.git/config','/node_modules/package.json','/scripts/build.mjs'])expect((await request.get(url)).status()).toBe(404);
 // The unpublished preview assets are mirrored locally for this artifact-render check.
 // Their public HTTPS availability is a separate release check.
 await page.route('https://cdn.jsdelivr.net/gh/Nikkola/creatoracademy@*/assets/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;const asset=pathname.slice(pathname.indexOf('/assets/')+1);
  const file=path.resolve(root,asset);expect(file.startsWith(path.join(root,'assets')+path.sep)).toBe(true);expect(fs.existsSync(file)).toBe(true);
  await route.fulfill({path:file});
 });
 await page.goto('/dist/salebot.html');await expect(page.locator('#gallery .owl-carousel')).toHaveClass(/owl-loaded/);
});
test('complete image inventory, latest wording and original back-to-top',async({page,request})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
 const broken=await page.locator('img').evaluateAll(async nodes=>{await Promise.all(nodes.map(im=>{im.loading='eager';return im.decode().catch(()=>null)}));return nodes.filter(im=>!im.complete||!im.naturalWidth).map(im=>im.src)});expect(broken).toEqual([]);
 await expect(page.locator('#rates .copper')).toContainText('Самостоятельная практика');await expect(page.locator('#rates .gold')).toContainText('Личная работа со мной');await expect(page.locator('#rates .gold')).toContainText('Гибкий процесс под тебя');
 const response=await request.get('/assets/site-editorial-v4/media/lesson-preview.mp4',{headers:{Range:'bytes=0-1'}});expect(response.status()).toBe(206);expect(response.headers()['content-type']).toBe('video/mp4');
 await page.locator('footer').scrollIntoViewIfNeeded();await expect(page.locator('#scrollTopBtn')).toHaveClass(/visible/);await page.locator('#scrollTopBtn button').click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
});

const production=JSON.parse(fs.readFileSync(path.join(root,'source/story/production-audit.json')));
const requestedClients=['Т-Банк','Мовавика','Яндекс Доставка','Строки','Авито Реклама','Selectel','Notion','Точка','Crello','Skyeng','Hollyland','Яндекс Директ','Alibra School','Advance','Aputure','Deity','GigaChat','Периодика','Zigmund.online','Юздеск','Контур','НЕТМОНЕТ','Frame Set','Битрикс 24','Ингосстрах','Kaspersky','Мегамаркет','Модульбанк','МТС','Яндекс'];
test('wide audience gallery loops, drags and keeps whole current cards after resize',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const rail=page.locator('#audience-gallery');await rail.scrollIntoViewIfNeeded();await expect(rail).toHaveClass(/owl-loaded/);
 const current=()=>rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())});
 await expect(rail.locator('.owl-item:not(.cloned)>.audience-card')).toHaveCount(4);
 const card=await rail.locator('.owl-item.center .audience-card').boundingBox();expect(card.x).toBeGreaterThan(30);expect(card.x+card.width).toBeLessThan(1410);
 await page.locator('#begin .carousel-pagination button').nth(3).click();await expect.poll(current).toBe(3);
 await rail.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').next(0));await expect.poll(current).toBe(0);
 const box=await rail.boundingBox();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.15,box.y+box.height*.6,{steps:15});await page.mouse.up();await expect.poll(current).not.toBe(0);
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>rail.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').settings.stagePadding)).toBe(20);
 const visible=rail.locator('.owl-item.center .audience-card');await visible.locator('img').evaluate(im=>im.decode());expect(await visible.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
test('contained navigation, matching title widths, quote scale and stable source sidebar',async({page})=>{
 for(const [width,height,size] of [[768,1024,31],[1440,1000,43],[1920,1080,70]]){
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.fixed-video-trigger')).toBeHidden();
  const buttons=page.locator('.site-fixed .fixed__auth .fixed__btn,.site-fixed .fixed__socials .fixed__btn');await expect(buttons).toHaveCount(5);
  const original=await buttons.evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,blur:getComputedStyle(el).backdropFilter}}));
  expect(original.every(r=>Math.abs(r.w-size)<1&&Math.abs(r.h-size)<1&&r.blur==='none')).toBe(true);expect(new Set(original.map(r=>r.x)).size).toBe(1);
  await page.locator('.site-fixed .auth__btn').hover();await page.waitForTimeout(650);
  expect(await buttons.evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}))).toEqual(original.map(r=>[r.x,r.y,r.w,r.h]));
  if(width>=1200){const layout=await page.evaluate(()=>({nav:document.querySelector('#navlinks').getBoundingClientRect().width,hero:document.querySelector('.hero-inner').getBoundingClientRect().width,gap:document.querySelector('.hero-inner').getBoundingClientRect().top-document.querySelector('.nav').getBoundingClientRect().bottom,ys:[...document.querySelectorAll('.course-numbers>li')].map(el=>el.getBoundingClientRect().y),factsGap:Math.abs(document.querySelector('#course-facts').getBoundingClientRect().top-document.querySelector('.hero').getBoundingClientRect().bottom),nameWidth:document.querySelector('.course-name').getBoundingClientRect().width,utpWidth:document.querySelector('.hero h1').getBoundingClientRect().width,photoGap:document.querySelector('.hero-portrait').getBoundingClientRect().left-document.querySelector('.hero-copy').getBoundingClientRect().right,titleSize:parseFloat(getComputedStyle(document.querySelector('.hero h1')).fontSize),leadSize:parseFloat(getComputedStyle(document.querySelector('.hero-lead')).fontSize)}));expect(layout.nav).toBeLessThanOrEqual(1600);expect(Math.abs(layout.nav-layout.hero)).toBeLessThan(1);expect(layout.gap).toBeGreaterThanOrEqual(48);expect(new Set(layout.ys).size).toBe(2);expect(layout.factsGap).toBeLessThan(1);expect(Math.abs(layout.nameWidth-layout.utpWidth)).toBeLessThan(1);expect(layout.photoGap).toBeCloseTo(96,0);expect(layout.titleSize).toBe(40);expect(layout.leadSize).toBe(18)}
  await expect(page.locator('.facts-note,.course-label')).toHaveCount(0);
  const sizes=await page.locator('.editorial-quote').evaluateAll(nodes=>nodes.map(el=>getComputedStyle(el).fontSize));expect(new Set(sizes).size).toBe(1);
 }
});
const compact=s=>s.replace(/\s+/g,' ').trim();
test('editorial audit preserves modules, original photos, quotes and complete reviews',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 expect(await page.locator('.programme-module h3').allTextContents()).toEqual(production.modules.map(m=>m.title));
 for(let i=0;i<production.modules.length;i++){const card=page.locator('.programme-module').nth(i);expect(compact(await card.innerText())).toContain(production.modules[i].description.replace('как генерировать оригинальные','как формировать оригинальные'));expect(await card.evaluate(el=>!!el.closest('details'))).toBe(false)}
 for(const filename of [...production.skillPhotos,...production.materialPhotos])expect(await page.locator(`img[src$="/${filename}"]`).count()).toBeGreaterThan(0);
 const text=compact(await page.locator('main').innerText());for(const quote of production.quotes)expect(text).toContain(quote);
 expect(await page.locator('details').evaluateAll(nodes=>nodes.filter(el=>!el.closest('#faq,#author-works')).length)).toBe(0);
 await expect(page.locator('#course-facts h2')).toHaveText('Курс в цифрах');await expect(page.locator('.paper')).toHaveCount(0);
 await expect(page.locator('#process h2')).toHaveText('Как устроен процесс');await expect(page.locator('#subscription img')).toHaveCount(1);await expect(page.locator('#subscription a')).toHaveAttribute('href','https://t.me/chernobaev_nick');
 for(let i=0;i<production.reviews.length;i++){const review=page.locator('#reviews-container>.review').nth(i);expect(compact(await review.locator('.review-text').innerText())).toBe(production.reviews[i].text)}
 for(let i=0;i<production.cases.length;i++){const card=page.locator('#casesSlider .owl-item:not(.cloned)>.case').filter({has:page.locator('h3',{hasText:production.cases[i].name})});await expect(card).toHaveCount(1);expect(compact(await card.innerText())).toContain(production.cases[i].cohort)}
});
test('proof geometry: all requested readable logos, round avatars, quotes and lesson Play',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const logos=page.locator(width<768?'.client-mobile-page img':'.client-marquee-group:not([aria-hidden]) img');expect((await logos.evaluateAll(nodes=>nodes.map(im=>im.alt))).sort()).toEqual([...requestedClients].sort());
  const visible=page.locator(width<768?'.client-mobile-page.is-active .client-mobile-brand':'.client-marquee-group:not([aria-hidden]) .client-logo-tile');
  const sizes=await visible.evaluateAll(nodes=>nodes.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));expect(sizes.every(s=>s.w>100&&s.h>=80)).toBe(true);
  const portraits=await page.locator('#casesSlider .owl-item:not(.cloned) .person img').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height,radius:getComputedStyle(el).borderRadius}}));expect(portraits).toHaveLength(expected.counts.cases);expect(portraits.every(r=>r.w===64&&r.h===64&&r.radius==='50%')).toBe(true);
  expect(await page.locator('#reviews-container>.review').evaluateAll(nodes=>nodes.every(el=>el.querySelector('.quote-mark').getBoundingClientRect().bottom<=el.querySelector('h3').getBoundingClientRect().top+1))).toBe(true);
  const buttons=await page.locator('#lessons .owl-item:not(.cloned) .play').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect(),icon=el.querySelector('svg').getBoundingClientRect();return {round:Math.abs(b.width-b.height),offset:Math.abs(icon.x+icon.width/2-b.x-b.width/2),text:el.textContent.trim()}}));expect(buttons).toHaveLength(4);expect(buttons.every(b=>b.round<1&&b.offset<=2.1&&b.text==='')).toBe(true);
  expect(await page.locator('.rate h3').allTextContents()).toEqual(['Наставничество','Поддержка','Самостоятельно']);
  expect(parseFloat(await page.locator('.included-tools li').first().evaluate(el=>getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
 }
});
test('all carousel types expose synchronized position bullets',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const [selector,count] of [['#gallery .carousel-pagination',19],['#reviews .gallery__block .carousel-pagination',8],['#learn .carousel-pagination',8],['#begin .carousel-pagination',4],['#tools .carousel-pagination',7],['#reviews-container+.carousel-pagination',20]])await expect(page.locator(selector).locator('button')).toHaveCount(count);
 const dots=page.locator('#gallery .carousel-pagination');await dots.locator('button').nth(5).click();await expect.poll(()=>page.locator('#gallery .owl-carousel').evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(5);await expect(dots.locator('button').nth(5)).toHaveAttribute('aria-current','true');
 const category=page.locator('.portfolio-category').first();await category.locator('summary').click();expect(await category.locator('.carousel-pagination button').count()).toBe(await category.locator('.owl-item:not(.cloned)').count());
 await page.locator('#reviews-container+.carousel-pagination button').nth(4).click();await expect.poll(()=>page.locator('#reviews-container').evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('#learn .carousel-pagination button')).toHaveCount(8);await expect(page.locator('#begin .carousel-pagination button')).toHaveCount(4);await expect(page.locator('#clients .carousel-pagination')).toBeHidden();
});
test('FAQ animates opening, closing, rapid reversal and respects reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const item=page.locator('#faq details').first(),summary=item.locator('summary'),answer=item.locator('.faq-answer');
 await summary.click();await expect(summary).toHaveAttribute('aria-expanded','true');expect(await answer.evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);await expect.poll(()=>answer.evaluate(el=>el.getAnimations().length)).toBe(0);
 await summary.click();await expect.poll(()=>item.evaluate(el=>el.open)).toBe(false);
 await summary.click();await summary.click();await expect.poll(()=>item.evaluate(el=>el.open)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});await summary.focus();await summary.press('Enter');await expect(item).toHaveAttribute('open','');expect(await answer.evaluate(el=>el.getAnimations().length)).toBe(0);await expect(page.locator('#faq')).toContainText('бесплатную версию');
});

test('fourth version: natural case stories, distinct type roles, uncropped Reels and materials',async({page})=>{
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  expect(await page.locator('#casesSlider .owl-item:not(.cloned) .case').evaluateAll(nodes=>nodes.every(el=>el.scrollHeight-el.clientHeight<=1))).toBe(true);
  const roles=await page.evaluate(()=>({quote:getComputedStyle(document.querySelector('.editorial-quote')).fontFamily,title:getComputedStyle(document.querySelector('.chapter h2')).fontFamily,body:getComputedStyle(document.body).fontFamily}));expect(roles.quote).toContain('Bebas');expect(roles.title).toContain('Dita');expect(roles.body).toContain('Mont');
  expect(await page.locator('.module-visual img').count()).toBe(7);
  const reels=page.locator('.portfolio-reels');await reels.locator('summary').click();await expect(reels.locator('.owl-carousel')).toHaveClass(/owl-loaded/);
  const ratio=await reels.locator('.owl-item:not(.cloned) .media').first().evaluate(el=>{const r=el.getBoundingClientRect();return r.width/r.height});expect(ratio).toBeCloseTo(9/16,2);
  const material=await page.locator('#tools .owl-item:not(.cloned) img').first().evaluate(el=>{const r=el.getBoundingClientRect();return {ratio:r.width/r.height,background:getComputedStyle(el).backgroundColor}});expect(material.background).toBe('rgba(0, 0, 0, 0)');expect(await page.locator('#tools .owl-item:not(.cloned) .tool-media img').first().evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');
  expect(await page.locator('.btn .btn-label').count()).toBe(await page.locator('.btn').count());expect(await page.locator('.btn .btn-arrow svg').count()).toBe(await page.locator('.btn').count());
 }
});

test('full original case stories are visible on each card without a second button',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const rail=page.locator('#casesSlider');await expect(rail).toHaveClass(/owl-loaded/);
 await expect(rail.locator('.case-more,.case-story-content')).toHaveCount(0);
 for(let i=0;i<production.cases.length;i++){
  const item=production.cases[i],card=rail.locator('.owl-item:not(.cloned)>.case').filter({has:page.locator('h3',{hasText:item.name})});await expect(card).toHaveCount(1);
  expect(compact(await card.locator('.case-before>p:last-child').innerText())).toBe(item.before);
  expect(compact(await card.locator('.case-after>p:last-child').innerText())).toBe(item.after);
  await expect(card).toContainText(item.cohort);await expect(card.locator('.kicker')).toHaveText(['Точка А','Точка Б']);
 }
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  const shapes=await page.locator('.btn').evaluateAll(nodes=>nodes.map(el=>({radius:getComputedStyle(el).borderRadius,height:el.getBoundingClientRect().height})));expect(shapes.every(s=>s.radius==='0px'&&s.height>=40)).toBe(true);
  expect(await rail.locator('.owl-item:not(.cloned) .case').evaluateAll(nodes=>nodes.every(el=>el.scrollHeight<=el.clientHeight+1))).toBe(true);
 }
});
test('restored footer, floating login, button hover and continuous clients',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.locator('.site-fixed .auth__btn')).toHaveAttribute('href','https://salebot.pro/courses');expect(await page.locator('.site-fixed').evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
 await expect(page.locator('.site-footer .footer__socials-list .round__btn > svg, .site-footer .footer__socials-list .round__btn > img.social-brand-icon')).toHaveCount(4);
 expect(await page.locator('.site-footer .footer__socials-list .footer__btn').evaluateAll(nodes=>nodes.length===4&&nodes.every(el=>{const r=el.getBoundingClientRect();return Math.abs(r.width-r.height)<.01&&getComputedStyle(el).borderRadius==='100%'}))).toBe(true);
 const center=await page.locator('.site-footer .footer__logo').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)});expect(center).toBeLessThan(1);
 const strip=page.locator('.client-marquee');await strip.scrollIntoViewIfNeeded();await page.mouse.move(1,1);await expect.poll(()=>strip.locator('.client-marquee-track').first().evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('running');await expect(strip.locator('.client-marquee-group:not([aria-hidden]) img')).toHaveCount(30);expect(await strip.locator('.client-marquee-group[aria-hidden="true"]').evaluateAll(nodes=>nodes.every(el=>el.inert))).toBe(true);
 await strip.hover();await expect.poll(()=>strip.locator('.client-marquee-track').first().evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('running');
 await expect(strip.locator('.client-motion-toggle')).toHaveCount(0);await expect(strip.locator('.client-marquee-row')).toHaveCount(2);const directions=await strip.locator('.client-marquee-track').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).animationDirection));expect(directions).toEqual(['normal','reverse']);
 const play=page.locator('#lessons .owl-item.center .play').first();await play.hover();await expect.poll(()=>play.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
 const button=page.locator('#rates .btn').first();await button.hover();await expect.poll(()=>button.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.site-fixed')).toBeHidden();await page.locator('.menu-toggle').click();await expect(page.locator('#navlinks .nav-login')).toBeVisible();
});

test('case cards fit the rail completely at each breakpoint and remain draggable',async({page})=>{
 for(const [width,count] of [[390,1],[768,1],[1440,1],[2048,1]]){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  const rail=page.locator('#casesSlider');await rail.scrollIntoViewIfNeeded();
  const metrics=await rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel'),r=el.getBoundingClientRect();return {items:o.settings.items,stagePadding:o.settings.stagePadding,cards:[...el.querySelectorAll('.owl-item.active .case')].map(c=>{const b=c.getBoundingClientRect();return {left:b.left-r.left,right:r.right-b.right,overflow:c.scrollWidth-c.clientWidth}})}});
  expect(metrics.items).toBe(count);expect(metrics.stagePadding).toBe(0);expect(metrics.cards).toHaveLength(count);
  expect(metrics.cards.every(c=>c.left>=-1&&c.right>=-1&&c.overflow<=1)).toBe(true);
 }
 const rail=page.locator('#casesSlider'),rect=await rail.boundingBox();const current=()=>rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())});const before=await current();
 await page.mouse.move(rect.x+rect.width*.8,rect.y+150);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.2,rect.y+150,{steps:12});await page.mouse.up();await expect.poll(current).not.toBe(before);
});

test('feedback video plays silently in view, pauses and respects reduced motion without extra labels',async({page,request})=>{
 for(const name of ['feedback-students-v3.mp4','feedback-excerpt.mp4']){
  const response=await request.get('/assets/site-editorial-v4/media/'+name,{headers:{Range:'bytes=0-1'}});expect(response.status()).toBe(206);expect(response.headers()['content-type']).toBe('video/mp4');
 }
 expect((await request.get('/assets/site-editorial-v4/media/feedback-students-v3.webp')).status()).toBe(200);
 await page.goto('/');await expect(page.locator('.feedback-still')).toHaveAttribute('src','/assets/site-editorial-v4/media/feedback-students-v3.webp');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const video=page.locator('.feedback-preview');expect(await video.evaluate(v=>v.paused)).toBe(true);
 await page.locator('.feedback-demo').scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);expect(await video.evaluate(v=>v.muted)).toBe(true);
 await page.locator('.hero').scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 await page.locator('.feedback-demo').scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 await expect(page.locator('.feedback-demo figcaption,.feedback-window-bar,.feedback-watch,.feedback-pause')).toHaveCount(0);
 expect(await video.evaluate(v=>v.muted&&v.loop&&!v.controls)).toBe(true);
 const html=fs.readFileSync(path.join(root,'dist/salebot.html'),'utf8');expect(html).not.toMatch(/(?:poster|data-local-video)="\/assets\//);
});

test('latest refinements preserve film order, vector logos, signature and aligned controls',async({page})=>{
 for(const width of [390,1440,2048]){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.client-marquee-group:not([aria-hidden]) img.client-mark')).toHaveCount(30);
  expect(await page.locator('.client-vector').evaluateAll(nodes=>nodes.every(im=>im.src.startsWith('data:image/svg+xml;base64,')))).toBe(true);
  await expect(page.locator('#source-quote-6 .goal__name')).toHaveText('Николай Чернобаев');await expect(page.locator('#source-quote-6 .goal__occupation')).toContainText('Автор и режиссер');
  const arrow=await page.locator('.subscription-arrow').boundingBox();expect(arrow.x).toBeGreaterThanOrEqual(0);expect(arrow.x+arrow.width).toBeLessThanOrEqual(width);
  const panel=await page.locator('.finish-action').evaluate(el=>({background:getComputedStyle(el).backgroundImage,radius:getComputedStyle(el).borderRadius,overflow:el.scrollWidth-el.clientWidth}));expect(panel.background).toBe('none');expect(parseFloat(panel.radius)).toBe(0);expect(panel.overflow).toBeLessThanOrEqual(1);
  if(width>=768){const login=await page.locator('.site-fixed .auth__btn').evaluate(el=>{const b=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el);const r=range.getBoundingClientRect();return {textWidth:r.width,width:b.width,cx:Math.abs(r.x+r.width/2-b.x-b.width/2),cy:Math.abs(r.y+r.height/2-b.y-b.height/2),bg:getComputedStyle(el).backgroundColor}});expect(login.textWidth).toBeLessThan(login.width-8);expect(login.cx).toBeLessThan(1);expect(login.cy).toBeLessThan(3);expect(login.bg).toBe('rgb(255, 255, 255)');expect(await page.locator('.site-fixed .fixed__btn:visible').evaluateAll(nodes=>nodes.every(el=>{const r=el.getBoundingClientRect(),p=el.closest('.site-fixed').getBoundingClientRect();return Math.abs(r.width-p.width)<1&&Math.abs(r.height-p.width)<1}))).toBe(true)}
  const category=page.locator('.portfolio-category').filter({has:page.locator('.portfolio-title',{hasText:'Короткометражки'})});await category.locator('summary').click();const first=category.locator('.owl-item:not(.cloned)>.film').first();await expect(first.locator('h3')).toHaveText('Книжные романтики');await expect(first.locator('.play')).toHaveAttribute('data-video','https://www.youtube-nocookie.com/embed/0HvvxPjGvBE?rel=0');await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'<html>Film embed</html>'}));await first.locator('.play').click();await expect(page.locator('#player iframe')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/0HvvxPjGvBE?rel=0');await page.keyboard.press('Escape');
 }
});

test('requested media refinements preserve metrics, sound-first lessons and smooth disclosure icons',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 expect(await page.locator('.course-numbers b').allTextContents()).toEqual(['3+','7','32+','12+','85%','100+']);
 await expect(page.locator('#course-facts')).toContainText('Участников считают, что этот курс');
 await expect(page.locator('.hero-facts dt')).toHaveText(['Старт','Рассрочка']);
 await expect(page.locator('.hero-facts dd')).toHaveText(['2 ноября','От 4 666 ₽/мес.']);
 expect(await page.locator('.course-name .quotes').count()).toBe(2);expect(await page.locator('h1').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
 expect(await page.locator('#lessons video').count()).toBe(0);await expect(page.locator('#lessons .sound-lesson-copy p')).toHaveCount(0);
 await expect(page.locator('#tools')).toContainText('Памятки и шпаргалки');await expect(page.locator('#tools .preset-tool a').first()).toHaveAttribute('href','https://nickchernobaev.com/shop/film-emulation-pack');
 const first=page.locator('.portfolio-category').first();await first.locator('summary').click();await expect(first.locator('summary')).toHaveAttribute('aria-expanded','true');
 expect(await first.locator('.accordion-icon').evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0.45s');await expect.poll(()=>first.locator('.disclosure-content').evaluate(el=>el.getAnimations().length)).toBe(0);
 await first.locator('summary').click();await expect.poll(()=>first.evaluate(el=>el.open)).toBe(false);
 for(const width of [390,1440,2048]){await page.setViewportSize({width,height:1000});const sizes=await page.locator('#source-quote-6 .editorial-quote').evaluate(el=>({quote:parseFloat(getComputedStyle(el).fontSize),signature:parseFloat(getComputedStyle(el.querySelector('.goal__name')).fontSize)}));expect(sizes.quote).toBeGreaterThan(sizes.signature*1.5)}
});

test('unified process, complete media, source pricing copy and matching material windows',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('#process .process-card')).toHaveCount(6);
 await expect(page.locator('#process #support')).toHaveCount(1);await expect(page.locator('main>section#support')).toHaveCount(0);
 await expect(page.locator('#process .process-card h3')).toHaveText(['Личный кабинет','Все знания в одном месте','Практика в каждом модуле','Сообщество','Живая встреча раз в месяц','Собственный контент-проект']);
 expect(await page.locator('#process .process-card').evaluateAll(nodes=>nodes.every(el=>el.querySelector('.process-media img,.process-media video')))).toBe(true);
 await expect(page.locator('#process .workload,#process .course-invitation,#tools .stat-line')).toHaveCount(0);
 await expect(page.locator('#tools .preset-tool h3').first()).toHaveText('Фото и видеопресеты');
 await expect(page.locator('.included-head')).not.toContainText('Полная программа курса');
 expect(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
 await expect(page.locator('.rate-note')).toContainText('в одно из моих будущих видео');
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  const boxes=await page.locator('#tools .owl-item:not(.cloned) .tool-media').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,fit:getComputedStyle(el.querySelector('img')).objectFit}}));
  expect(boxes).toHaveLength(7);expect(boxes.every((b,i)=>b.fit===(i===6?'cover':'contain')&&Math.abs(b.width/b.height-1.5)<.01)).toBe(true);expect(Math.max(...boxes.map(b=>b.height))-Math.min(...boxes.map(b=>b.height))).toBeLessThan(1);
  const imageBoxes=await page.locator('#tools .owl-item:not(.cloned) .tool-media img').evaluateAll(nodes=>nodes.map(im=>{const r=im.getBoundingClientRect(),m=im.closest('.tool-media').getBoundingClientRect();return {complete:im.complete&&im.naturalWidth>0,inside:r.left>=m.left-1&&r.right<=m.right+1&&r.top>=m.top-1&&r.bottom<=m.bottom+1}}));
  expect(imageBoxes).toHaveLength(7);expect(imageBoxes.every(b=>b.complete&&b.inside)).toBe(true);
 }
 await expect(page.locator('.module-scene video[data-ambient]')).toHaveCount(7);
 expect(await page.locator('#learn video[data-slide-ambient]').evaluateAll(nodes=>new Set(nodes.map(v=>v.querySelector('source').getAttribute('src'))).size)).toBe(8);
 expect(await page.locator('#learn video,.module-scene video').evaluateAll(nodes=>nodes.every(v=>v.muted&&v.loop))).toBe(true);
 await expect(page.locator('.phone-lesson [data-phone-lesson-video]')).toHaveCount(1);
});

test('case stories use natural mobile heights and equal desktop heights after resize',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');const rail=page.locator('#casesSlider');
 for(const width of [320,390,768,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  if(width<768){
   for(let i=0;i<expected.counts.cases;i++){
    await rail.evaluate((el,index)=>creatorAcademyJQuery(el).data('owl.carousel').to(index,0),i);
    const card=rail.locator('.owl-item.active .case').first();
    const gap=await card.evaluate(el=>el.getBoundingClientRect().bottom-el.querySelector('.case-after>p:last-child').getBoundingClientRect().bottom);
    expect(gap).toBeLessThan(65);
    await expect.poll(async()=>Math.abs((await rail.locator('.owl-stage-outer').boundingBox()).height-(await card.boundingBox()).height)).toBeLessThan(2);
   }
   continue;
  }
  await expect.poll(()=>rail.locator('.owl-item:not(.cloned) .case').evaluateAll(nodes=>Math.max(...nodes.map(el=>el.clientHeight))-Math.min(...nodes.map(el=>el.clientHeight)))).toBeLessThanOrEqual(1);
  const heights=[];for(let i=0;i<expected.counts.cases;i++){await rail.evaluate((el,index)=>creatorAcademyJQuery(el).data('owl.carousel').to(index,0),i);heights.push((await rail.boundingBox()).height)}
  expect(Math.max(...heights)-Math.min(...heights),JSON.stringify({width,heights})).toBeLessThan(1);
  expect(await rail.locator('.case').evaluateAll(nodes=>nodes.every(el=>el.scrollHeight<=el.clientHeight+1))).toBe(true);
 }
});

test('portfolio opening and closing have intermediate frames without competing handlers',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const category=page.locator('.portfolio-category').first();await category.scrollIntoViewIfNeeded();
 for(const opening of [true,false,true]){
  const heights=await category.evaluate(async el=>{const panel=el.querySelector('.disclosure-content'),values=[];el.querySelector('summary').click();const start=performance.now();await new Promise(resolve=>{function sample(){values.push(panel.getBoundingClientRect().height);performance.now()-start<650?requestAnimationFrame(sample):resolve()}requestAnimationFrame(sample)});return values});
  const min=Math.min(...heights),max=Math.max(...heights);expect(max).toBeGreaterThan(50);expect(new Set(heights.filter(h=>h>min+2&&h<max-2).map(h=>Math.round(h))).size).toBeGreaterThan(3);expect(heights.at(-1)).toBe(opening?max:0);
  await expect(category.locator('summary')).toHaveAttribute('aria-expanded',String(opening));
 }
});

test('community conversation appears in sequence and pauses away from the screen',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');const chat=page.locator('[data-chat-demo]');await chat.scrollIntoViewIfNeeded();
 await expect.poll(()=>chat.locator('.chat-message.is-shown').count(),{timeout:17000}).toBe(3);
 await expect(chat.locator('.chat-author')).toContainText('Николай');await page.locator('.hero').scrollIntoViewIfNeeded();await page.waitForTimeout(200);const phase=await chat.getAttribute('data-chat-phase');await page.waitForTimeout(1500);await expect(chat).toHaveAttribute('data-chat-phase',phase);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(chat.locator('.chat-message.is-shown')).toHaveCount(3);
 await expect(page.locator('#support .support-cta')).toHaveCount(0);await expect(page.locator('.rate-icon')).toHaveCount(3);
 expect(await page.locator('.client-marquee-group:not([aria-hidden]) .client-logo-tile').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).filter==='grayscale(1)'))).toBe(true);
});
test('lesson highlights retain four original sound players through slide navigation and resize',async({page})=>{
 await page.route(/https:\/\/(kinescope\.io|vk\.com|vk\.ru|vkvideo\.ru)\//,r=>r.fulfill({contentType:'text/html',body:'<html>Player URL test</html>'}));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const rail=page.locator('#lessons-gallery');await expect(rail).toHaveClass(/owl-loaded/);await expect(page.locator('#lessons .carousel-pagination button')).toHaveCount(4);
 for(let i=0;i<4;i++){
  await page.locator('#lessons .carousel-pagination button').nth(i).click();
  await expect.poll(()=>rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(i);
  const button=rail.locator('.owl-item.center .play').first(),url=await button.getAttribute('data-video');await button.click();
  await expect(page.locator('#player iframe')).toHaveAttribute('src',url);expect(new URL(url).searchParams.get('muted')).not.toBe('1');
  await page.keyboard.press('Escape');await expect(button).toBeFocused();
 }
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>rail.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').settings.stagePadding)).toBe(20);
 expect(await rail.locator('.owl-item.center .sound-lesson').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
});

test('skill highlights play only the selected slide and preserve all eight complete skills',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const rail=page.locator('#skills-gallery');await expect(rail).toHaveClass(/owl-loaded/);
 const originals=rail.locator('.owl-item:not(.cloned) .outcome-card');await expect(originals).toHaveCount(8);await expect(originals.last()).toContainText('Экологично продвигать свой контент и бренд');
 expect(await originals.locator('h3').evaluateAll(nodes=>nodes.every(n=>/^[А-ЯЁ]/.test(n.textContent)))).toBe(true);
 expect(await rail.locator('video').evaluateAll(nodes=>nodes.every(v=>v.paused))).toBe(true);
 for(let i=0;i<8;i++){
  await page.locator('#learn .carousel-pagination button').nth(i).click();await rail.scrollIntoViewIfNeeded();
  await expect.poll(()=>rail.evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(i);
  await expect.poll(()=>rail.evaluate(el=>{const playing=[...el.querySelectorAll('video')].filter(v=>!v.paused&&v.currentTime>.1);return playing.length===1&&!!playing[0].closest('.owl-item.center')})).toBe(true);
 }
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>rail.evaluate(el=>creatorAcademyJQuery(el).data('owl.carousel').settings.stagePadding)).toBe(20);
 await rail.scrollIntoViewIfNeeded();await expect.poll(()=>rail.locator('video').evaluateAll(nodes=>nodes.filter(v=>!v.paused).length)).toBe(1);
 await page.locator('.hero').scrollIntoViewIfNeeded();await expect.poll(()=>rail.locator('video').evaluateAll(nodes=>nodes.every(v=>v.paused))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await rail.scrollIntoViewIfNeeded();expect(await rail.locator('video').evaluateAll(nodes=>nodes.every(v=>v.paused))).toBe(true);
});

test('programme media, process scenes and covers are distinct and use complete frames',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('#programme figcaption')).toHaveCount(0);
 await expect(page.locator('#programme')).toContainText('как формировать оригинальные идеи');
 await expect(page.locator('.finish-action')).toContainText('Записывайся на ближайший 9-й поток. Старт 2 ноября 2026 года');
 const videos=await page.locator('#programme video,#skills-gallery .owl-item:not(.cloned) video,#process video').evaluateAll(nodes=>nodes.map(v=>v.querySelector('source').getAttribute('src')));
 expect(new Set(videos).size).toBe(videos.length);
 const moduleHashes=videos.filter(s=>s.includes('programme-')).map(s=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,s))).digest('hex'));
 expect(new Set(moduleHashes).size).toBe(7);
 expect(await page.locator('.module-visual .scene-media').evaluateAll(nodes=>nodes.every(el=>{const r=el.getBoundingClientRect();return Math.abs(r.width/r.height-16/9)<.01}))).toBe(true);
 const covers=await page.locator('#lessons .owl-item:not(.cloned) img').evaluateAll(nodes=>nodes.map(im=>im.getAttribute('src').split('/').at(-1)));expect(covers).toEqual(['lesson-cover-light-v3.webp','lesson-cover-framing-v4.webp','lesson-cover-editing-v3.webp','lesson-cover-storytelling-v4.webp']);
 const category=page.locator('.portfolio-category').filter({has:page.locator('.portfolio-title',{hasText:'Короткометражки'})});await category.locator('summary').click();
 const film=category.locator('.owl-item:not(.cloned) .book-romantics');const box=await film.locator('.media').evaluate(el=>{const r=el.getBoundingClientRect();return {ratio:r.width/r.height,fit:getComputedStyle(el.querySelector('img')).objectFit}});expect(box.ratio).toBeCloseTo(840/549,2);expect(box.fit).toBe('contain');
 for(const width of [390,1440,2048]){await page.setViewportSize({width,height:1000});const buttons=await page.locator('.film .media').evaluateAll(nodes=>nodes.filter(el=>el.getBoundingClientRect().width>0).map(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('.play')?.getBoundingClientRect();return b?{image:r.width,button:b.width}:null}).filter(Boolean));expect(buttons.every(x=>x.button>=35.9&&x.button<=70.1&&x.button<=Math.max(36,x.image*.14))).toBe(true)}
});

test('process illustrations advance, pause offscreen and show a static reduced-motion result',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const practiceStory=page.locator('.practice-demo'),practice=practiceStory.locator('video');await practiceStory.scrollIntoViewIfNeeded();
 expect(await practiceStory.evaluate(el=>el.getBoundingClientRect().height)).toBe(380);await expect(practiceStory.locator('[data-story-panel]')).toHaveCount(4);
 await expect.poll(()=>practiceStory.getAttribute('data-story-phase'),{timeout:22000}).toBe('3');await expect.poll(()=>practice.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);
 await page.locator('.hero').scrollIntoViewIfNeeded();await expect.poll(()=>practice.evaluate(v=>v.paused)).toBe(true);
 for(const name of ['knowledge','project']){
  const story=page.locator(`[data-process-story="${name}"]`);await story.scrollIntoViewIfNeeded();await expect(story).toHaveClass(/is-running/);
  await expect.poll(()=>story.getAttribute('data-story-phase'),{timeout:11000}).toBe('1');
  if(name==='project'){const video=story.locator('video');await expect.poll(()=>video.evaluate(v=>!v.paused&&v.readyState>=2)).toBe(true)}
  await page.locator('.hero').scrollIntoViewIfNeeded();await page.waitForTimeout(250);const phase=await story.getAttribute('data-story-phase');await page.waitForTimeout(900);await expect(story).toHaveAttribute('data-story-phase',phase);await expect(story).not.toHaveClass(/is-running/);
  if(name==='project')expect(await story.locator('video').evaluate(v=>v.paused)).toBe(true);
 }
 await page.emulateMedia({reducedMotion:'reduce'});for(const story of await page.locator('[data-process-story]').all()){const staticPhase=await story.getAttribute('data-process-story')==='practice'?'3':'2';await expect(story).toHaveAttribute('data-story-phase',staticPhase)}
 for(const width of [320,390,768,1440,2048]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);expect(await page.locator('[data-process-story]').evaluateAll(nodes=>nodes.every(el=>el.getBoundingClientRect().width<=el.parentElement.clientWidth+1))).toBe(true)}
});

test('quotes match the statistics edges and Sergey has a sourced complete case',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const width of [320,390,768,1440,2048]){await page.setViewportSize({width,height:1000});const widths=await page.evaluate(()=>{const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,w:r.width}};return {reference:box(document.querySelector('#course-facts .wrap')),quotes:[...document.querySelectorAll('.editorial-quote-wrap .wrap,#about .author-manifesto')].map(box)}});expect(widths.quotes.length).toBeGreaterThan(5);expect(widths.quotes.every(q=>Math.abs(q.x-widths.reference.x)<1&&Math.abs(q.w-widths.reference.w)<1)).toBe(true)}
 await expect(page.locator('#casesSlider .owl-item:not(.cloned)>.case').first()).toHaveAttribute('data-case','sergey-ukhlov');
 const card=page.locator('#casesSlider .owl-item:not(.cloned) [data-case="sergey-ukhlov"]');await expect(card).toContainText('0 подписчиков');await expect(card).toContainText('56 509');await expect(card.locator('a').first()).toHaveAttribute('href',/youtube\.com/);
});

test('community and process animations pause behind both dialogs and resume on close',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const chat=page.locator('[data-chat-demo]');await chat.scrollIntoViewIfNeeded();
 await expect(chat).toHaveAttribute('data-chat-phase','0');
 for(const selector of ['#player','#case-story']){
  await page.locator(selector).evaluate(el=>el.showModal());
  const phase=await chat.getAttribute('data-chat-phase');
  await expect.poll(()=>chat.locator('.chat-typing i').first().evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
  await page.waitForTimeout(2100);await expect(chat).toHaveAttribute('data-chat-phase',phase);
  await page.locator(selector).evaluate(el=>el.close());
  await expect.poll(()=>chat.locator('.chat-typing i').first().evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('running');
 }
 await expect.poll(()=>chat.getAttribute('data-chat-phase'),{timeout:8000}).not.toBe('0');
 const story=page.locator('[data-process-story="knowledge"]');await story.scrollIntoViewIfNeeded();await expect(story).toHaveClass(/is-running/);
 await page.locator('#case-story').evaluate(el=>el.showModal());await expect(story).not.toHaveClass(/is-running/);
 await page.locator('#case-story').evaluate(el=>el.close());await expect(story).toHaveClass(/is-running/);
});

test('learning and feedback videos stop behind complete case dialogs and resume',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const demo=page.locator('.device-demo');await demo.scrollIntoViewIfNeeded();
 await expect.poll(()=>demo.getAttribute('data-phase'),{timeout:12000}).toBe('1');
 const videos=demo.locator('video');await expect.poll(()=>videos.evaluateAll(ns=>ns.every(v=>!v.paused&&v.currentTime>0))).toBe(true);
 await page.locator('#case-story').evaluate(el=>el.showModal());
 await expect.poll(()=>videos.evaluateAll(ns=>ns.every(v=>v.paused))).toBe(true);
 const phase=await demo.getAttribute('data-phase');await page.waitForTimeout(6500);await expect(demo).toHaveAttribute('data-phase',phase);
 await page.locator('#case-story').evaluate(el=>el.close());await expect.poll(()=>videos.evaluateAll(ns=>ns.every(v=>!v.paused))).toBe(true);
 const feedback=page.locator('.feedback-preview');await feedback.scrollIntoViewIfNeeded();await expect.poll(()=>feedback.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);
 await page.locator('#case-story').evaluate(el=>el.showModal());await expect.poll(()=>feedback.evaluate(v=>v.paused)).toBe(true);
 await page.locator('#case-story').evaluate(el=>el.close());await expect.poll(()=>feedback.evaluate(v=>!v.paused)).toBe(true);
});
