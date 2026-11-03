const {test,expect}=require('@playwright/test');
for(const width of [1440,390])test(`new videos stay covered through the slide and reveal only after playing at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.route('**/pair-02-*.mp4',async route=>{await new Promise(resolve=>setTimeout(resolve,900));await route.continue()});
 await page.goto('/');const section=page.locator('#sequence-proof'),grid=section.locator('.sequence-proof-grid');await section.scrollIntoViewIfNeeded();
 await expect.poll(()=>grid.locator('video').evaluateAll(vs=>vs.every(v=>v.currentTime>0&&!v.paused))).toBe(true);
 await expect(grid.locator('.sequence-proof-cover.is-playing')).toHaveCount(2);
 await section.locator('.sequence-proof-next').click();
 await expect.poll(()=>grid.evaluate(e=>e.getAnimations().length)).toBe(1);
 expect(await grid.locator('video').evaluateAll(vs=>vs.every(v=>v.paused))).toBe(true);
 expect(await grid.locator('.sequence-proof-cover').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0&&getComputedStyle(i).opacity==='1'))).toBe(true);
 await expect(section.locator('.sequence-proof-outgoing')).toHaveCount(0);
 await expect(grid.locator('.sequence-proof-cover.is-playing')).toHaveCount(2);
 await expect.poll(()=>grid.locator('video').evaluateAll(vs=>vs.every(v=>!v.paused&&v.currentTime>0))).toBe(true);
 // Revisited media also stays covered until its own frame has been presented.
 await section.locator('.sequence-proof-prev').click();await expect(section).toHaveAttribute('data-sequence-index','0');
 await expect(section.locator('.sequence-proof-outgoing')).toHaveCount(0);await expect(grid.locator('.sequence-proof-cover.is-playing')).toHaveCount(2);
 expect(await section.locator('video').count()).toBe(2);
});
