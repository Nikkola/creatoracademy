const {test,expect}=require('@playwright/test');
for(const width of [1440,390])test(`paired slider moves continuously and handles rapid navigation at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 const section=page.locator('#sequence-proof'),grid=section.locator('.sequence-proof-grid').first(),next=section.locator('.sequence-proof-next');
 await section.scrollIntoViewIfNeeded();await expect.poll(()=>section.locator('video').evaluateAll(vs=>vs.every(v=>v.currentTime>0))).toBe(true);
 const height=await section.evaluate(e=>e.getBoundingClientRect().height);
 await section.evaluate(e=>{
  window.__sequenceFrames=[];const start=performance.now();
  function sample(){const panel=e.querySelector('.sequence-proof-pending');if(panel?.getAnimations().length){const x=new DOMMatrix(getComputedStyle(panel).transform).m41;window.__sequenceFrames.push({x,width:panel.getBoundingClientRect().width,videos:e.querySelectorAll('video').length})}if(performance.now()-start<20000)requestAnimationFrame(sample)}requestAnimationFrame(sample);
 });
 await next.click();
 await expect.poll(()=>page.evaluate(()=>window.__sequenceFrames.filter(f=>f.x>0&&f.x<f.width).length),{timeout:20000}).toBeGreaterThan(1);
 const frames=await page.evaluate(()=>window.__sequenceFrames);expect(frames.every(f=>f.videos===4)).toBe(true);
 await expect(section.locator('.sequence-proof-pending')).toHaveCount(0);
 expect(Math.abs(await section.evaluate(e=>e.getBoundingClientRect().height)-height)).toBeLessThan(1);
 // Every input is counted, without overlapping transitions or reloading the outgoing player.
 await next.evaluate(b=>{b.click();b.click();b.click()});
 await expect(section).toHaveAttribute('data-sequence-index','4');await expect(section.locator('.sequence-proof-pending')).toHaveCount(0);
 await expect.poll(()=>section.locator('video').evaluateAll(vs=>vs.every(v=>v.currentTime>0&&!v.paused))).toBe(true);
 await section.locator('.sequence-proof-prev').click();await expect(section).toHaveAttribute('data-sequence-index','3');await expect(section.locator('.sequence-proof-pending')).toHaveCount(0);
 await page.emulateMedia({reducedMotion:'reduce'});await next.click();await expect(section).toHaveAttribute('data-sequence-index','4');await expect(section.locator('.sequence-proof-pending')).toHaveCount(0);
 expect(await grid.evaluate(e=>e.getAnimations().length)).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
