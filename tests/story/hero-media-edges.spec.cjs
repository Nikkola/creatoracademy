const{test,expect}=require('@playwright/test');const sharp=require('sharp');
for(const width of [390,393,1440])test(`hero hides the still and covers Safari fractional edges at ${width}`,async({browser},testInfo)=>{
 const c=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:3});const p=await c.newPage();try{await p.goto('/');const film=p.locator('.hero-preview-film'),v=film.locator('video');await expect.poll(()=>v.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);await expect(film).toHaveClass(/is-playing/);await expect(film.locator('picture')).toHaveCSS('opacity','0');
 await film.locator('img').evaluate(im=>im.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><path fill="%23ff00ff" d="M0 0h10v10H0z"/></svg>');
 const fit=await v.evaluate(v=>{const a=v.getBoundingClientRect(),b=v.parentElement.getBoundingClientRect();return[b.left-a.left,a.right-b.right,b.top-a.top,a.bottom-b.bottom]});fit.forEach(x=>expect(x).toBeCloseTo(1,1));const buffer=await film.screenshot();const{data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});let leaked=0;for(let n=0;n<data.length;n+=info.channels)if(data[n]>245&&data[n+1]<10&&data[n+2]>245)leaked++;expect(leaked).toBe(0);await testInfo.attach('hero-edges',{body:buffer,contentType:'image/png'});
 await p.emulateMedia({reducedMotion:'reduce'});await expect(film.locator('picture')).toHaveCSS('opacity','1');
 }finally{await c.close()}
});
test('practice still and fourth-panel video fill the same frame on desktop and mobile',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');for(const width of[390,1440]){await page.setViewportSize({width,height:1000});const panel=page.locator('.practice-live');await panel.scrollIntoViewIfNeeded();await panel.locator('img').evaluate(im=>im.decode());const m=await panel.evaluate(el=>{const im=el.querySelector('img'),v=el.querySelector('video');return{a:im.getBoundingClientRect().toJSON(),b:v.getBoundingClientRect().toJSON(),fit:getComputedStyle(im).objectFit}});for(const k of['x','y','width','height'])expect(m.a[k]).toBeCloseTo(m.b[k],1);expect(m.fit).toBe('cover')}
});
