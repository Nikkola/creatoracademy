const {test,expect}=require('@playwright/test');
test.use({isMobile:true,hasTouch:true,deviceScaleFactor:3});

test('mobile offer and complete matching menu fit short phone viewports',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1440,height:1000});await page.goto('/');
 const links=()=>page.locator('#navlinks a').evaluateAll(nodes=>nodes.filter(a=>a.getBoundingClientRect().width>0&&a.getBoundingClientRect().height>0).map(a=>[a.textContent.trim(),a.getAttribute('href')]));
 const desktop=await links();
 for(const [width,height] of [[320,568],[390,667],[430,739]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  expect(await page.locator('.hero .btn').evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThan(height-12);
  expect(await page.locator('.hero-photo-frame>img').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(height);
  const photo=await page.locator('.hero-photo-frame>img').evaluate(el=>{const r=el.getBoundingClientRect();return{ratio:r.width/r.height,natural:el.naturalWidth/el.naturalHeight,height:r.height}});expect(photo.ratio).toBeCloseTo(photo.natural,2);expect(photo.height).toBeLessThan(height-100);
  await page.locator('.menu-toggle').click();
  const mobile=await links();expect(mobile.filter(([label])=>label)).toEqual(desktop.filter(([label])=>label));
  await expect(page.locator('#navlinks .footer__socials-list a')).toHaveCount(4);
  await expect(page.locator('#navlinks a[href*="kinopoisk"]')).toBeVisible();
  const m=await page.locator('#navlinks .video-right__container').evaluate(el=>({bottom:el.getBoundingClientRect().bottom,bg:getComputedStyle(el).backgroundImage}));
  expect(m.bottom).toBeLessThan(height-8);expect(m.bg).toContain('menu-author-camera-20261023.jpg');
  await page.keyboard.press('Escape');await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','false');expect(await page.evaluate(()=>document.body.style.position)).toBe('');
 }
});

test('phone sliders keep one type size, compact text and full-width media',async({page})=>{
 await page.setViewportSize({width:390,height:667});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 const rail=page.locator('#skills-gallery');await rail.scrollIntoViewIfNeeded();
 for(let i=0;i<8;i++){
  await rail.evaluate((el,i)=>creatorAcademyJQuery(el).data('owl.carousel').to(i,0),i);
  const card=rail.locator('.owl-item.center .outcome-card');
  const m=await card.evaluate(el=>{const c=el.querySelector('.card-copy'),media=el.querySelector('.scene-media');return{height:el.getBoundingClientRect().height,parts:c.getBoundingClientRect().height+media.getBoundingClientRect().height,font:getComputedStyle(c.querySelector('h3')).fontSize}});
  expect(m.font).toBe('24px');expect(Math.abs(m.height-m.parts)).toBeLessThan(2);
 }
 const material=page.locator('#tools .kit__grid');await material.scrollIntoViewIfNeeded();
 for(let i=0;i<6;i++){
  await material.evaluate((el,i)=>creatorAcademyJQuery(el).data('owl.carousel').to(i,0),i);
  const scene=material.locator('.owl-item.active .tool-media').first();
  const gap=await scene.evaluate(el=>{const r=el.closest('.tool').getBoundingClientRect(),s=el.querySelector('.process-story').getBoundingClientRect();return Math.max(Math.abs(r.left-s.left),Math.abs(r.right-s.right))});expect(gap).toBeLessThan(2);
 }
 expect(await page.locator('.phone-course-row p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(6);
 const phone=await page.locator('.phone-shell').boundingBox();expect(phone.width/phone.height).toBeCloseTo(9/19.5,2);
 const adjust=await rail.evaluate(el=>{const s=getComputedStyle(el.querySelector('.card-copy'));return CSS.supports('text-size-adjust','100%')?s.getPropertyValue('text-size-adjust'):CSS.supports('-webkit-text-size-adjust','100%')?s.getPropertyValue('-webkit-text-size-adjust'):null});
 if(adjust!==null)expect(adjust).toBe('100%');
 expect(await page.locator('.included-tools li').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el,'::before').content.includes('✓')))).toBe(true);
 expect(await page.locator('.course-numbers .item__text').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).textAlign==='center'))).toBe(true);
});

test('all mobile client logos and their labels stay inside their own tiles',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await expect(page.locator('.client-mobile-page .client-mobile-brand')).toHaveCount(30);
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:667});await page.locator('.client-marquee').scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
  const clipped=await page.locator('.client-mobile-page .client-mobile-brand').evaluateAll(nodes=>nodes.flatMap(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(c=>{const b=c.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1}).map(c=>el.querySelector('img').alt)}));expect(clipped).toEqual([]);
  expect(await page.locator('.client-mobile-page').evaluateAll(pages=>pages.every(page=>{const r=page.getBoundingClientRect();return [...page.children].every(tile=>{const b=tile.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1})}))).toBe(true);
 }
});

test('mobile written reviews fit one viewport and reveal the exact full text in a dialog',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const [width,height] of [[320,568],[390,667],[430,739]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
  for(const card of await page.locator('#reviews-container>.review').all()){
   const m=await card.evaluate(el=>({height:el.getBoundingClientRect().height,button:el.querySelector('.review-more').getBoundingClientRect().bottom-el.getBoundingClientRect().top,author:el.querySelector('.person').getBoundingClientRect().bottom-el.getBoundingClientRect().top}));
   expect(m.height).toBeLessThan(height-70);expect(m.button).toBeLessThan(m.height);expect(m.author).toBeLessThan(m.height);
   await expect(card.getByRole('button',{name:'Читать полный отзыв'})).toBeVisible();
   expect(await card.locator('a').evaluateAll(nodes=>nodes.filter(n=>n.textContent.includes('Читать полный отзыв')&&n.getBoundingClientRect().width>0).length)).toBe(0);
  }
 }
 const card=page.locator('#reviews-container>.review').first(),text=await card.locator('.review-text').textContent(),button=card.locator('.review-more');
 await button.click();await expect(page.locator('#case-story')).toBeVisible();await expect(page.locator('.review-dialog-text')).toHaveText(text);
 await page.keyboard.press('Escape');await expect(button).toBeFocused();await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe('');
});

test('critical fonts render without CDN requests on a cold local page and the SaleBot artifact',async({page})=>{
 const fontRequests=[];page.on('request',r=>{if(r.resourceType()==='font'&&/^https?:/.test(r.url()))fontRequests.push(r.url())});
 await page.route('https://**/*',r=>r.abort());
 for(const url of ['/','/dist/salebot.html']){
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  const fonts=await page.evaluate(()=>({embedded:document.querySelector('#site-fonts').textContent.match(/data:font\/woff2;base64,/g).length,dita:document.fonts.check('400 32px Dita','Контент'),mont:document.fonts.check('500 24px Mont','Научись'),bebas:document.fonts.check('700 28px Bebas','Академия'),display:[...document.fonts].map(f=>f.display)}));
  expect(fonts.embedded).toBe(5);expect(fonts.dita&&fonts.mont&&fonts.bebas).toBe(true);expect(fonts.display.every(d=>d==='block')).toBe(true);
 }
 expect(fontRequests).toEqual([]);
});

test('mobile clients change complete adaptive pages automatically without sliding logos through an edge',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const belt=page.locator('.client-marquee');await belt.scrollIntoViewIfNeeded();
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:667});
  const clipped=await belt.locator('.client-mobile-page .client-mobile-brand').evaluateAll(nodes=>nodes.flatMap(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(c=>{const b=c.getBoundingClientRect();return b.left<r.left-1||b.right>r.right+1||b.top<r.top-1||b.bottom>r.bottom+1}).map(()=>el.querySelector('img').alt)}));expect(clipped).toEqual([]);
 }
 await belt.scrollIntoViewIfNeeded();await expect(belt).not.toHaveClass(/is-offscreen/);
 const current=await belt.locator('.client-mobile-dots [aria-current]').getAttribute('aria-label');await expect.poll(()=>belt.locator('.client-mobile-dots [aria-current]').getAttribute('aria-label'),{timeout:6000}).not.toBe(current);
 const pagePanel=belt.locator('.client-mobile-page.is-active');expect(await pagePanel.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
 await expect(belt.locator('.client-mobile-page.is-active')).toHaveCount(1);
});

test('client page transitions never paint two generations of logos together',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.locator('.client-mobile').scrollIntoViewIfNeeded();
 const samples=await page.locator('.client-mobile').evaluate(async el=>{const stage=el.querySelector('.client-mobile-stage'),samples=[],start=performance.now();el.querySelectorAll('button')[1].click();await new Promise(resolve=>{function sample(){const opacity=Number(getComputedStyle(stage).opacity),visible=[...el.querySelectorAll('.client-mobile-page')].filter(p=>getComputedStyle(p).visibility==='visible'&&Number(getComputedStyle(p).opacity)>0);samples.push({opacity,count:visible.length});performance.now()-start<850?requestAnimationFrame(sample):resolve()}requestAnimationFrame(sample)});return samples});
 expect(samples.every(s=>s.count===1)).toBe(true);expect(samples.some(s=>s.opacity>.05&&s.opacity<.95)).toBe(true);expect(samples.at(-1).opacity).toBe(1);
 await expect(page.locator('.client-mobile-dots button').nth(1)).toHaveAttribute('aria-current','true');
});

test('mobile editorial hero keeps one compact identity, a dominant promise and a visible action',async({page})=>{
 await page.goto('/');for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:667});await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.hero h1 .hero-mobile-copy')).toHaveText('Открой в себе автора.Развивай свой блог.Находи своюаудиторию.');
  await expect(page.locator('.hero .hero-lead .hero-mobile-copy')).toHaveText('Научись создавать кинематографичныевидео с единой системой знаний,практикой и поддержкой.');
  const m=await page.locator('.hero').evaluate(el=>{const name=el.querySelector('.course-name'),h=el.querySelector('h1'),lead=el.querySelector('.hero-lead');return{nameHeight:name.getBoundingClientRect().height,title:parseFloat(getComputedStyle(h).fontSize),body:parseFloat(getComputedStyle(lead).fontSize),overflow:document.documentElement.scrollWidth-innerWidth,buttonBottom:el.querySelector('.btn').getBoundingClientRect().bottom}});
  expect(m.nameHeight).toBeLessThan(60);expect(m.title).toBeGreaterThanOrEqual(19);expect(m.title).toBeGreaterThan(m.body);expect(m.body).toBeGreaterThanOrEqual(12);expect(m.overflow).toBeLessThanOrEqual(1);expect(m.buttonBottom).toBeLessThan(655);
 }
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('.hero h1 .hero-desktop-copy')).toHaveText('Открой в себе автора. Развивай свой блог.Находи свою аудиторию.');
});
