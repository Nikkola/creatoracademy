const {test,expect}=require('@playwright/test');

for(const width of [320,390,768,1440])test(`approved audience loops play only in the centered visible card at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width===320?568:900});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');
 const rail=page.locator('#audience-gallery');await expect(rail).toHaveClass(/owl-loaded/);
 await expect(rail.locator('.owl-item:not(.cloned) video')).toHaveCount(4);
 await rail.scrollIntoViewIfNeeded();
 const names=['bloggers-v1','business-v1','media-v1','personal-v1'];
 for(let i=0;i<names.length;i++){
  await page.locator('#begin .carousel-pagination button').nth(i).click();
  const current=rail.locator('.owl-item.center video');
  await expect(current.locator('source')).toHaveAttribute('src',new RegExp(`audience-${names[i]}.mp4$`));
  await expect.poll(()=>current.evaluate(v=>!v.paused&&v.currentTime>0&&v.videoWidth===1280&&v.videoHeight===854)).toBe(true);
  await expect(current).toHaveClass(/has-frame/);
  expect(await rail.locator('video').evaluateAll(ns=>ns.filter(v=>!v.paused).length)).toBe(1);
  const fit=await current.evaluate(v=>{const a=v.getBoundingClientRect(),b=v.parentElement.getBoundingClientRect();return {left:b.left-a.left,right:a.right-b.right,top:b.top-a.top,bottom:a.bottom-b.bottom,muted:v.muted,inline:v.playsInline}});
  expect(await current.evaluate(v=>v.getAttribute('poster')===v.parentElement.querySelector('img').getAttribute('src'))).toBe(true);
  for(const edge of ['left','right','top','bottom']){expect(fit[edge]).toBeGreaterThanOrEqual(.9);expect(fit[edge]).toBeLessThan(1.1)}
  await expect(current.locator('..').locator('img')).toHaveCSS('opacity','0');expect(fit.muted).toBe(true);expect(fit.inline).toBe(true);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect.poll(()=>rail.locator('video').evaluateAll(ns=>ns.every(v=>v.paused&&!v.classList.contains('has-frame')))).toBe(true);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.hero').scrollIntoViewIfNeeded();
 await expect.poll(()=>rail.locator('video').evaluateAll(ns=>ns.every(v=>v.paused))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
});

for(const width of [390,393])test(`photo cannot leak around audience video on a 3x mobile screen at ${width}px`,async({browser},testInfo)=>{
 const sharp=require('sharp');
 const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 const page=await context.newPage();
 try{
  await page.goto('/');
  const rail=page.locator('#audience-gallery');await expect(rail).toHaveClass(/owl-loaded/);await rail.scrollIntoViewIfNeeded();
  for(let i=0;i<4;i++){
   await page.locator('#begin .carousel-pagination button').nth(i).click();
   const media=rail.locator('.owl-item.center .scene-media'),video=media.locator('video');
   await expect(video).toHaveClass(/has-frame/);
   await expect(media.locator('img')).toHaveCSS('opacity','0');
   // A solid contrasting still reveals even one pixel of photo bleeding outside the video.
   await media.locator('img').evaluate(img=>{img.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path fill="%23ff00ff" d="M0 0h10v10H0z"/></svg>'});
   await expect.poll(()=>video.evaluate(v=>v.readyState>=2)).toBe(true);
   const buffer=await media.screenshot();
   const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
   let leaked=0;for(let p=0;p<data.length;p+=info.channels)if(data[p]>245&&data[p+1]<10&&data[p+2]>245)leaked++;
   expect(leaked,`slide ${i+1} leaked photo pixels`).toBe(0);
   await testInfo.attach(`audience-${i+1}-${width}`,{body:buffer,contentType:'image/png'});
  }
 }finally{await context.close()}
});
