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
