const {test,expect}=require('@playwright/test');
for(const width of [390,1440])test(`hero plays its complete 16:9 showreel and pauses for intro at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.route('https://kinescope.io/**',r=>r.fulfill({contentType:'text/html',body:'Intro player'}));await page.goto('/');
 const film=page.locator('.hero-preview-film'),video=film.locator('video');
 await expect.poll(()=>video.evaluate(v=>v.currentTime>0&&!v.paused)).toBe(true);await expect(film).toHaveClass(/is-playing/);
 expect(await video.evaluate(v=>v.videoWidth/v.videoHeight)).toBeCloseTo(16/9,3);expect(await video.evaluate(v=>v.duration)).toBeCloseTo(172.64,1);
 await page.locator(width<768?'.hero-mobile-portrait .intro-video-button':'.hero-preview-footer .intro-video-button').click();
 await expect(page.locator('#player iframe')).toHaveAttribute('src',/u2Tb99aoUmhahUHxd3xX4q/);await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);await page.keyboard.press('Escape');
 await film.scrollIntoViewIfNeeded();await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});await expect(film).not.toHaveClass(/is-playing/);await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);
 const img=film.locator('img');await img.evaluate(im=>im.decode());await expect(img).toBeVisible();expect(await img.evaluate(im=>im.naturalWidth)).toBeGreaterThan(0);
 if(width>=768)expect(await img.evaluate(im=>im.currentSrc)).toContain('hero-portrait-wide-v1.webp');
});

test('mobile course name restores the previous size and centers its actual lettering',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(const width of [320,375,390,430]){await page.setViewportSize({width,height:667});await page.evaluate(()=>document.fonts.ready);
 const m=await page.locator('.course-name').evaluate(n=>{const a=n.querySelector('.hero__quotes-anchor-left').getBoundingClientRect(),b=n.querySelector('.hero__quotes-anchor-right').getBoundingClientRect();return{center:(a.left+b.right)/2,target:innerWidth/2,size:parseFloat(getComputedStyle(n).fontSize),buttonBottom:document.querySelector('.hero .actions>.btn').getBoundingClientRect().bottom}});
 expect(Math.abs(m.center-m.target),JSON.stringify(m)).toBeLessThan(1);expect(m.size).toBeCloseTo(Math.min(40,Math.max(30,width*.092)),1);expect(m.buttonBottom).toBeLessThan(667);
 }
});
