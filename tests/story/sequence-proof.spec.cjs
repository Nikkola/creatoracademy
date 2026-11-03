const {test,expect}=require('@playwright/test');
const pairs=require('../../source/story/sequence-proof.json');

for(const width of [1440,390])test(`all twenty paired examples play and navigate at ${width}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:900});await page.goto('/');
 const section=page.locator('#sequence-proof'),next=section.locator('.sequence-proof-next'),prev=section.locator('.sequence-proof-prev');
 await section.scrollIntoViewIfNeeded();await expect(next).toBeEnabled();
 expect(pairs).toHaveLength(20);expect(pairs.slice(0,5).map(p=>p.id)).toEqual(['01','02','02b','02c','03']);
 const placement=await section.evaluate(s=>({previous:s.previousElementSibling.id,next:s.nextElementSibling.nextElementSibling.id}));
 expect(placement).toEqual({previous:'course-facts',next:'source-quote-0'});
 for(let i=0;i<pairs.length;i++){
  await expect(section).toHaveAttribute('data-sequence-index',String(i));
  await expect(section.locator('.sequence-proof-count')).toHaveText(`${i+1} / 20`);
  await expect.poll(()=>section.locator('video').evaluateAll(vs=>vs.every(v=>v.readyState>=2&&!v.paused&&v.currentTime>0))).toBe(true);
  const media=await section.locator('video').evaluateAll(vs=>vs.map(v=>({path:new URL(v.currentSrc).pathname,duration:v.duration,width:v.videoWidth,height:v.videoHeight,muted:v.muted,fit:getComputedStyle(v).objectFit})));
  expect(media).toHaveLength(2);
  for(let k=0;k<2;k++){
   expect(media[k].path).toBe(pairs[i][k?'story':'head'].src);expect(media[k].duration).toBeCloseTo(pairs[i][k?'story':'head'].duration,2);
   expect(media[k].width).toBe(960);expect(media[k].height).toBe(640);expect(media[k].muted).toBe(true);expect(media[k].fit).toBe('contain');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await next.click();
 }
 await expect(section).toHaveAttribute('data-sequence-index','0');await prev.click();await expect(section).toHaveAttribute('data-sequence-index','19');
 await section.locator('.sequence-proof-grid').focus();await page.keyboard.press('ArrowRight');await expect(section).toHaveAttribute('data-sequence-index','0');
 if(width===390){
  const grid=section.locator('.sequence-proof-grid');await grid.dispatchEvent('pointerdown',{pointerType:'touch',clientX:300,clientY:200});await grid.dispatchEvent('pointerup',{pointerType:'touch',clientX:150,clientY:205});await expect(section).toHaveAttribute('data-sequence-index','1');
 }
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,0)});
 await expect.poll(()=>section.locator('video').evaluateAll(vs=>vs.every(v=>v.paused))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await section.scrollIntoViewIfNeeded();await expect.poll(()=>section.locator('video').evaluateAll(vs=>vs.every(v=>v.paused))).toBe(true);
});

for(const width of [320,768])test(`comparison keeps its layout and accessible navigation at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const section=page.locator('#sequence-proof');await section.scrollIntoViewIfNeeded();await expect(section.locator('.sequence-proof-next')).toBeEnabled();
 const cards=await section.locator('figure').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y})));
 if(width<768)expect(cards[1].y).toBeGreaterThan(cards[0].y);else expect(cards[1].x).toBeGreaterThan(cards[0].x);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await expect(section.getByRole('button',{name:'Следующая пара примеров'})).toBeVisible();
 await expect(section.locator('.sequence-proof-toggle')).toHaveCount(0);
});
