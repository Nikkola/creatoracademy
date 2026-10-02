const {test,expect}=require('@playwright/test');
for(const width of [320,390]) test(`compact mobile sections ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:644});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 const cases=page.locator('.cases__slider');await expect(cases).toHaveClass(/owl-loaded/);
 const count=await cases.evaluate(el=>window.creatorAcademyJQuery(el).data('owl.carousel').items().length);
 const heights=[];
 for(let i=0;i<count;i++){
  await cases.evaluate((el,i)=>window.creatorAcademyJQuery(el).data('owl.carousel').to(i,0),i);
  const result=await cases.evaluate(el=>{
   const owl=window.creatorAcademyJQuery(el).data('owl.carousel');const card=owl.items(owl.relative(owl.current())).get(0).firstElementChild;
   const person=card.querySelector('.cases__person').getBoundingClientRect();const col=card.querySelector('.cases__col').getBoundingClientRect();
   return {height:card.getBoundingClientRect().height,gap:col.top-person.bottom};
  });
  expect(result.gap).toBeLessThanOrEqual(17);heights.push(result.height);
 }
 if(width===390) expect(Math.max(...heights)).toBeLessThanOrEqual(584);
 await cases.evaluate(el=>window.creatorAcademyJQuery(el).data('owl.carousel').to(0,0));
 await cases.scrollIntoViewIfNeeded();await page.screenshot({path:`previews/${info.project.name}-${width}-cases-fixed.png`});
 for(let i=0;i<3;i++){
  await page.locator('.about-slider-dots button').nth(i).click();
  await expect.poll(()=>page.locator('.about__list').evaluate(el=>window.creatorAcademyJQuery(el).data('owl.carousel').relative(window.creatorAcademyJQuery(el).data('owl.carousel').current()))).toBe(i);
  await page.waitForTimeout(350);
  const slide=page.locator('.about__list .owl-item.active .about__block');
  const metrics=await slide.evaluate(el=>{const t=el.querySelector('.text__big');return {slide:el.getBoundingClientRect().toJSON(),title:t.getBoundingClientRect().toJSON(),font:parseFloat(getComputedStyle(t).fontSize)}});
  expect(metrics.font).toBeGreaterThanOrEqual(i===2?39:72);
  expect(metrics.title.left).toBeGreaterThanOrEqual(metrics.slide.left-1);
  expect(metrics.title.right).toBeLessThanOrEqual(metrics.slide.right+1);
  await slide.screenshot({path:`previews/${info.project.name}-${width}-about-${i}-fixed.png`});
 }
 const cols=await page.locator('.how__list').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().width));expect(Math.min(...cols)).toBeGreaterThan(width-40);
 await page.locator('.how').screenshot({path:`previews/${info.project.name}-${width}-how-fixed.png`});
 await page.locator('.kit').screenshot({path:`previews/${info.project.name}-${width}-kit-fixed.png`});
 await info.attach('case-heights',{body:JSON.stringify(heights),contentType:'application/json'});
});

for(const width of [320,390]) test(`SaleBot gutters keep text visible and taps advance mobile carousels ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:644});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{
  const wrapper=document.createElement('main');wrapper.className='salebot-landing__container';wrapper.style.cssText='height:100vh;overflow-y:auto;padding:0 16px;box-sizing:border-box';
  const root=document.querySelector('#root')||document.querySelector('.page');root.before(wrapper);wrapper.append(root);
  window.dispatchEvent(new Event('resize'));
 });
 // Owl needs to observe the narrower parent before measuring its cards.
 await page.waitForTimeout(400);
 for(const selector of ['#for-who-container','#learn-container','.cases__slider','.about__list','.how__bottom','.kit__grid']){
  const rail=page.locator(selector);await expect(rail).toHaveClass(/owl-loaded/);
  await rail.evaluate(el=>window.creatorAcademyJQuery(el).data('owl.carousel').refresh());
  await rail.locator('.owl-item.active').first().scrollIntoViewIfNeeded();
  const before=await rail.evaluate(el=>{const o=window.creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())});
  // Click the photo/text, leaving explicit video and external-link controls alone.
  const card=rail.locator('.owl-item.active').first();
  await card.click({position:{x:24,y:100}});
  await expect.poll(()=>rail.evaluate(el=>{const o=window.creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(before+1);
 }
 const about=page.locator('.about__list');
 for(let i=0;i<3;i++){
  await about.evaluate((el,i)=>window.creatorAcademyJQuery(el).data('owl.carousel').to(i,0),i);
  const m=await about.locator('.owl-item.active .about__block').evaluate(el=>{
   const t=el.querySelector('.text__big');const range=document.createRange();range.selectNodeContents(t);
   return {slide:el.getBoundingClientRect().toJSON(),glyph:range.getBoundingClientRect().toJSON(),overflow:t.scrollWidth-t.clientWidth};
  });
  expect(m.glyph.left).toBeGreaterThanOrEqual(m.slide.left-1);expect(m.glyph.right).toBeLessThanOrEqual(m.slide.right+1);expect(m.overflow).toBeLessThanOrEqual(1);
  await about.locator('.owl-item.active .about__block').screenshot({path:`previews/${info.project.name}-${width}-salebot-role-${i}.png`});
 }
 const audience=page.locator('#for-who-container');
 for(let i=0;i<4;i++){
  await audience.evaluate((el,i)=>window.creatorAcademyJQuery(el).data('owl.carousel').to(i,0),i);
  await audience.locator('.owl-item.active').scrollIntoViewIfNeeded();
  await expect.poll(()=>audience.locator('.owl-item.active img').evaluate(el=>el.complete && el.naturalWidth>0 && parseFloat(getComputedStyle(el).opacity)===1)).toBe(true);
  const m=await audience.locator('.owl-item.active .learn__description').evaluate(el=>{
   const r=document.createRange();r.selectNodeContents(el);return {box:el.closest('.learn__item').getBoundingClientRect().toJSON(),text:r.getBoundingClientRect().toJSON(),overflow:el.scrollWidth-el.clientWidth};
  });
  expect(m.text.left).toBeGreaterThanOrEqual(m.box.left-1);expect(m.text.right).toBeLessThanOrEqual(m.box.right+1);expect(m.overflow).toBeLessThanOrEqual(1);
 }
 const gap=await page.evaluate(()=>{
  const quote=document.querySelector('.hero').nextElementSibling.querySelector('.goal__text');const next=document.querySelector('.info__list');return next.getBoundingClientRect().top-quote.getBoundingClientRect().bottom;
 });expect(gap).toBeLessThanOrEqual(64);
});
