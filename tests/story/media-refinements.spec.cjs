const {test,expect}=require('@playwright/test');

test('all twenty-two ambient videos decode, play silently and seek near their loop seam',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const urls=await page.locator('video source').evaluateAll(nodes=>[...new Set(nodes.map(el=>el.src))]);expect(urls).toHaveLength(22);
 for(let start=0;start<urls.length;start+=3){
  const checks=await page.evaluate(async urls=>Promise.all(urls.map(async url=>{
   const video=document.createElement('video');video.muted=true;video.playsInline=true;video.loop=true;
   video.style.cssText='position:fixed;width:1px;height:1px;bottom:0;left:0;opacity:0;pointer-events:none';document.body.append(video);
   const ready=event=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error(event+' timed out: '+url)),7000);video.addEventListener(event,()=>{clearTimeout(timeout);resolve()},{once:true});video.addEventListener('error',()=>{clearTimeout(timeout);reject(new Error('Video error '+video.error?.code+': '+url))},{once:true})});
   try{
    const loaded=ready('loadeddata');video.src=url;await loaded;await video.play();await new Promise(r=>setTimeout(r,160));const advanced=video.currentTime>0&&!video.paused;
    video.pause();const seek=ready('seeked');video.currentTime=video.duration-.12;await seek;
    return {url,width:video.videoWidth,height:video.videoHeight,duration:video.duration,advanced,readyState:video.readyState,muted:video.muted};
   }finally{video.pause();video.removeAttribute('src');video.load();video.remove()}
  })),urls.slice(start,start+3));
  for(const check of checks){expect(check.width,check.url).toBe(1280);expect(check.height,check.url).toBe(720);expect(check.duration,check.url).toBeGreaterThan(3);expect(check.advanced,check.url).toBe(true);expect(check.readyState,check.url).toBeGreaterThanOrEqual(2);expect(check.muted,check.url).toBe(true)}
 }
});

test('cabinet click stays on its lesson and both phone lessons play and pause',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
 const demo=page.locator('.device-demo');await demo.scrollIntoViewIfNeeded();
 const target=()=>demo.evaluate(el=>{const canvas=el.querySelector('.cabinet-canvas').getBoundingClientRect(),cursor=el.querySelector('.demo-cursor').getBoundingClientRect(),selection=el.querySelector('.screen-selection').getBoundingClientRect();return{x:(cursor.x-canvas.x)/canvas.width,y:(cursor.y-canvas.y)/canvas.height,inside:cursor.x>selection.x&&cursor.x<selection.right&&cursor.y>selection.y&&cursor.y<selection.bottom}});
 await expect.poll(async()=>{const s=await target();return s.inside&&Math.abs(s.x-.585)<.001&&Math.abs(s.y-.473)<.001}).toBe(true);
 const atClick=await target();
 const frames=await demo.evaluate(async el=>{const rows=el.querySelector('.phone-course-list'),scene=el.querySelector('.phone-cabinet'),frames=[],start=performance.now();let switched=0;
  await new Promise((resolve,reject)=>{function sample(){const now=performance.now(),phase=el.dataset.phase;frames.push({phase,y:new DOMMatrixReadOnly(getComputedStyle(rows).transform).m42,opacity:Number(getComputedStyle(scene).opacity)});if(phase==='1'&&!switched)switched=now;if(switched&&now-switched>850)resolve();else if(now-start>10000)reject(new Error('Demo did not reach its lesson phase'));else requestAnimationFrame(sample)}requestAnimationFrame(sample)});return frames;});
 const boundary=frames.findIndex((frame,i)=>i>0&&frame.phase==='1'&&frames[i-1].phase==='0');expect(boundary).toBeGreaterThan(0);expect(Math.abs(frames[boundary].y-frames[boundary-1].y)).toBeLessThan(.5);expect(frames.some(frame=>frame.opacity>.05&&frame.opacity<.95)).toBe(true);
 const after=await target();expect(Math.abs(after.x-atClick.x)).toBeLessThan(.001);expect(Math.abs(after.y-atClick.y)).toBeLessThan(.001);
 const phone=demo.locator('.phone-display video');await expect(phone).toHaveCount(2);await expect.poll(()=>phone.evaluateAll(ns=>ns.every(v=>!v.paused&&v.currentTime>0))).toBe(true);
 await expect.poll(()=>demo.getAttribute('data-phase'),{timeout:8000}).toBe('2');
 const setup=demo.locator('.phone-lighting-demo [data-phone-lighting-video]');await expect.poll(()=>setup.evaluate(v=>!v.paused&&v.currentTime>0)).toBe(true);
 expect(await demo.locator('.phone-lighting-demo').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
 await expect(demo.locator('.demo-motion')).toHaveCount(0);await page.locator('.hero').scrollIntoViewIfNeeded();await expect.poll(()=>phone.evaluateAll(ns=>ns.every(v=>v.paused))).toBe(true);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await demo.locator('.demo-cursor').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('video cards keep original type, complete covers, centered Play and eight cinema podcasts',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const categories=page.locator('.portfolio-category');for(const category of await categories.all())await category.locator('summary').click();
 const podcasts=categories.filter({has:page.locator('summary',{hasText:'Видеоподкасты'})});await expect(podcasts.locator('.owl-item:not(.cloned)>.film')).toHaveCount(12);
 for(const name of ['Егор Чичканов','Сергей Калужанов','Николай Шишкин','Антон Маслов','Иван Соснин','Никита Горелкин','Andbery','Никита Пугачёв'])await expect(podcasts).toContainText(name);
 const vlogs=categories.filter({has:page.locator('summary',{hasText:'Влоги'})});await expect(vlogs.locator('.owl-item:not(.cloned)>.film')).toHaveCount(11);
 const additions=page.locator('#author-works .owl-item:not(.cloned) img[src*="-cover-v4.webp"]');await expect(additions).toHaveCount(13);
 await additions.evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode()})));
 expect(await additions.evaluateAll(images=>images.every(image=>image.naturalWidth===1280&&image.naturalHeight===837))).toBe(true);
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  for(const section of ['#gallery','#reviews','#author-works','#lessons']){
   const card=page.locator(`${section} .owl-item:not(.cloned) .film`).first();
   expect(await card.locator('h3').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Bebas');
   const frame=await card.locator('.media').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.querySelector('.play').getBoundingClientRect();return{radius:parseFloat(getComputedStyle(el).borderRadius),fit:getComputedStyle(el.querySelector('img')).objectFit,dx:Math.abs(p.x+p.width/2-r.x-r.width/2),dy:Math.abs(p.y+p.height/2-r.y-r.height/2)}});
   expect(frame.radius).toBeGreaterThan(0);expect(frame.fit).toBe(section==='#reviews'?'cover':'contain');expect(frame.dx).toBeLessThan(1);expect(frame.dy).toBeLessThan(1);
  }
 }
 const peter=page.locator('#author-works .owl-item:not(.cloned) .film').filter({has:page.locator('h3',{hasText:'Питер на плёнку'})});
 await expect(peter).toHaveCount(1);expect(await peter.locator('img').evaluate(el=>getComputedStyle(el).objectFit)).toBe('contain');
 const authorButton=page.locator('#about .owl-item:not(.cloned) .round__btn').first();
 expect(await authorButton.locator('svg').evaluate(el=>getComputedStyle(el).stroke)).not.toBe('none');
 await page.route('https://vk.com/video_ext.php**',route=>route.fulfill({contentType:'text/html',body:'Player check'}));await authorButton.dispatchEvent('click');await expect(page.locator('#player iframe')).toHaveAttribute('src',await authorButton.getAttribute('data-video'));
});
