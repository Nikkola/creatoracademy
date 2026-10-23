const {test,expect}=require('@playwright/test');

for(const width of [320,390,768,1440])test(`approved audience loops play only in the centered visible card at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?568:900});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');
 const rail=page.locator('#audience-gallery');await expect(rail).toHaveClass(/owl-loaded/);
 await expect(rail.locator('.owl-item:not(.cloned) video')).toHaveCount(4);
 await rail.scrollIntoViewIfNeeded();
 const names=['bloggers','business','media','personal'];
 for(let i=0;i<names.length;i++){
  await page.locator('#begin .carousel-pagination button').nth(i).click();
  const current=rail.locator('.owl-item.center video');
  await expect(current.locator('source')).toHaveAttribute('src',new RegExp(`audience-${names[i]}-v1.mp4$`));
  await expect.poll(()=>current.evaluate(v=>!v.paused&&v.currentTime>0&&v.videoWidth===1280&&v.videoHeight===854)).toBe(true);
  await expect(current).toHaveClass(/has-frame/);
  expect(await rail.locator('video').evaluateAll(ns=>ns.filter(v=>!v.paused).length)).toBe(1);
  const fit=await current.evaluate(v=>{const a=v.getBoundingClientRect(),b=v.parentElement.getBoundingClientRect();return {dx:Math.abs(a.width-b.width),dy:Math.abs(a.height-b.height),muted:v.muted,inline:v.playsInline}});
  expect(await current.evaluate(v=>v.getAttribute('poster')===v.parentElement.querySelector('img').getAttribute('src'))).toBe(true);
  expect(fit.dx).toBeLessThan(1);expect(fit.dy).toBeLessThan(1);expect(fit.muted).toBe(true);expect(fit.inline).toBe(true);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>rail.locator('video').evaluateAll(ns=>ns.every(v=>v.paused&&!v.classList.contains('has-frame')))).toBe(true);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.hero').scrollIntoViewIfNeeded();
 await expect.poll(()=>rail.locator('video').evaluateAll(ns=>ns.every(v=>v.paused))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});
