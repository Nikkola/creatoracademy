const {test,expect}=require('@playwright/test');
for(const width of [1440,390])test(`paired slider moves continuously and handles rapid navigation at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');
 const section=page.locator('#sequence-proof'),grid=section.locator('.sequence-proof-grid').first(),next=section.locator('.sequence-proof-next');
 await section.scrollIntoViewIfNeeded();await expect.poll(()=>section.locator('video').evaluateAll(vs=>vs.every(v=>v.currentTime>0))).toBe(true);
 const height=await section.evaluate(e=>e.getBoundingClientRect().height);
 await next.click();
 await expect.poll(()=>section.locator('.sequence-proof-pending').evaluate(e=>e.getAnimations().length)).toBe(1);
 await page.waitForTimeout(120);
 const middle=await section.locator('.sequence-proof-pending').evaluate(e=>({x:new DOMMatrix(getComputedStyle(e).transform).m41,width:e.getBoundingClientRect().width}));
 expect(middle.x).toBeGreaterThan(0);expect(middle.x).toBeLessThan(middle.width);
 expect(await section.locator('video').count()).toBe(4);
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
