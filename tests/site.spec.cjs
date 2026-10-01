const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const sizes = [{width:320,height:568}, {width:375,height:812}, {width:390,height:844}, {width:812,height:375}, {width:768,height:1024}, {width:1440,height:900}];
async function open(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.cases__slider')).toHaveClass(/owl-loaded/);
  return errors;
}
for (const viewport of sizes) {
  test(`layout ${viewport.width}x${viewport.height}`, async ({page}, info) => {
    await page.setViewportSize(viewport);
    const errors = await open(page);
    const report = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const outside = [...document.querySelectorAll('h1,h2,p,.text__big,.hero__button-container,.cases__item,.kit__item')].filter(el => {
        if (!el.getClientRects().length || el.closest('.menu,.header-fixed')) return false;
        // Horizontal carousels intentionally contain offscreen cards.
        if (el.closest('.owl-carousel,.learn__list,.reviews__list,.about__list')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.left < -1 || r.right > width + 1);
      }).map(el => ({tag:el.tagName,class:el.className,text:el.textContent.trim().slice(0,60)}));
      return { width, documentWidth:document.documentElement.scrollWidth, outside };
    });
    await info.attach('overflow', {body:JSON.stringify(report,null,2),contentType:'application/json'});
    expect(report.documentWidth).toBeLessThanOrEqual(viewport.width + 1);
    expect(report.outside).toEqual([]);
    expect(errors).toEqual([]);
    if (viewport.width < 768) {
      expect((await page.locator('.hero__title h1').boundingBox()).y).toBeGreaterThanOrEqual(60);
    }
    await page.screenshot({path:`test-results/${info.project.name}-${viewport.width}.png`,fullPage:true});
    await page.screenshot({path:`test-results/${info.project.name}-${viewport.width}-hero.png`});
  });
}
test('mobile menu scroll, navigation, Escape and resize', async ({page}) => {
  await page.setViewportSize({width:375,height:600});
  await open(page);
  await page.evaluate(() => window.scrollTo(0,900));
  await page.locator('.hamburger').click();
  await expect(page.locator('.hamburger')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('body')).toHaveClass(/audit-scroll-locked/);
  const play = page.locator('.menu .play-btn');
  await play.scrollIntoViewIfNeeded();
  const rect = await play.boundingBox();
  expect(rect.y + rect.height).toBeLessThanOrEqual(600);
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/audit-scroll-locked/);
  expect(await page.evaluate(() => window.scrollY)).toBe(900);
  await page.locator('.hamburger').click();
  await page.locator('.menu a[href="#rates"]').click();
  await expect(page.locator('.hamburger')).toHaveAttribute('aria-expanded','false');
  // Deferred images can change section positions; the destination must remain visible below the header.
  await expect.poll(() => page.locator('#rates').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(300);
  expect(await page.locator('#rates').evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(60);
  await page.locator('.hamburger').click();
  await page.setViewportSize({width:812,height:375});
  await expect(page.locator('body')).not.toHaveClass(/audit-scroll-locked/);
});
test('both video providers unload and close while loading', async ({page}) => {
  await page.setViewportSize({width:375,height:600});
  // Deterministic embedding test; provider playback itself requires a manual check.
  await page.route(/https:\/\/(?:vk\.com|vkvideo\.ru|kinescope\.io)\//, route => route.fulfill({contentType:'text/html',body:'<html><body>Test player</body></html>'}));
  await open(page);
  for (const provider of ['vk.com','kinescope.io']) {
    await page.locator('.portfolio-category').first().evaluate(el=>el.open=true);
    const button = page.locator(`.owl-item.active .play-btn[data-link*="${provider}"]`).first();
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(page.locator('.modal-component')).toBeVisible();
    await expect(page.locator('#player')).toHaveAttribute('src', /autoplay=1/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#player')).toHaveAttribute('src','about:blank');
    await expect(page.locator('body')).not.toHaveClass(/audit-scroll-locked/);
  }
  // Owl loop clones must retain video actions as the slider wraps around.
  await page.locator('.owl-item.cloned .play-btn').first().evaluate(button => button.click());
  await expect(page.locator('.modal-component')).toBeVisible();
  await page.locator('.modal__close').click();
  await page.unrouteAll();
  await page.route('https://kinescope.io/**', route => new Promise(resolve => setTimeout(resolve,3000)).then(()=>route.abort()));
  const button=page.locator('.menu .play-btn');
  await page.locator('.hamburger').click();
  await button.click();
  await page.locator('.modal__close').click();
  await expect(page.locator('.modal-component')).toBeHidden();
  await expect(page.locator('#player')).toHaveAttribute('src','about:blank');
});
test('video controls fit in portrait and landscape', async ({page}) => {
  await page.route(/https:\/\/(?:vk\.com|vkvideo\.ru|kinescope\.io)\//, route => route.fulfill({contentType:'text/html',body:'<html></html>'}));
  for (const viewport of [{width:320,height:568},{width:375,height:812},{width:812,height:375}]) {
    await page.setViewportSize(viewport);
    await open(page);
    await page.locator('.portfolio-category').last().locator('summary').click();
    const button=page.locator('.owl-item.active .play-btn[data-type="reels"]').first();
    await button.scrollIntoViewIfNeeded(); await button.click();
    for (const selector of ['.modal__close','.video-modal-component']) {
      const rect=await page.locator(selector).boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);
      expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height+1);
    }
    await page.locator('.modal__close').click();
  }
});
test('unique IDs, local assets and no local analytics', async ({page}) => {
  const remote=[];
  const missing=[];
  page.on("response", res => { if (res.url().startsWith("http://127.0.0.1:4173/") && res.status() >= 400) missing.push(res.url()); });
  page.on('request', req => {if(/github\.io|mc\.yandex|top-fwz1|top\.mail|fonts.googleapis|fonts.gstatic|cdnjs.cloudflare|cdn.jsdelivr/.test(req.url())) remote.push(req.url());});
  await open(page);
  const duplicates=await page.evaluate(()=>{
    const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);
    return ids.filter((id,i)=>ids.indexOf(id)!==i);
  });
  expect(duplicates).toEqual([]); expect(remote).toEqual([]); expect(missing).toEqual([]);
});
test('release keeps legacy resources and landing copy intact', async () => {
  for (const file of ['index.css','index.js',...fs.readdirSync('css').filter(f=>f!=='about.css').map(f=>'css/'+f)]) {
    expect(fs.readFileSync(file)).toEqual(execFileSync('git',['show',`24fdecd:${file}`]));
  }
  const aboutCss=fs.readFileSync('css/about.css','utf8');
  expect(aboutCss).toContain('.about__block--director');
  const old=execFileSync('git',['show','24fdecd:index.html']).toString();
  const current=fs.readFileSync('index.html','utf8');
  const text=s=>s.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/g,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  // Section order may change; all existing copy must still be preserved.
  const words = html => text(html).split(' ').sort();
  const normalizedCurrent=current
    .replace('180+ подкастов','170+ подкастов')
    .replace('где уже вышло 180+','где уже вышло больше 170')
    .replace('15 лет в digital и контент-маркетинге','14 лет в digital-индустрии и контент-маркетинге');
  expect(words(normalizedCurrent.replace('<h1 class="section__title dita portfolio__title" id="gallery">Научитесь делать</h1>','').replace('<span>Записаться</span>','<span>Забронировать</span>'))).toEqual(words(old));
  expect(current).toContain('<h1 class="section__title dita portfolio__title" id="gallery">Научитесь делать</h1>');
  const videoLinks=html=>[...html.matchAll(/data-link="([^"]+)"/g)].map(m=>m[1]);
  expect(videoLinks(current).sort()).toEqual(videoLinks(old).sort());
  const cdnBase = 'https://cdn.jsdelivr.net/gh/Nikkola/creatoracademy@v3.2.0/';
  const published = fs.readFileSync('dist/salebot.html','utf8');
  expect(published).toBe(current.replaceAll('https://Nikkola.github.io/creatoracademy/',cdnBase));
  expect(published).not.toMatch(/(?:localhost|127\.0\.0\.1|file:\/\/)/i);
  expect(current).toContain('https://Nikkola.github.io/creatoracademy/assets/site-audit-v3/site.css');
});

test('bundled carousel leaves the host page jQuery in place', async ({ page }) => {
  await page.addInitScript(() => {
    const host = function () {};
    host.fn = {};
    window.__hostJQuery = window.jQuery = window.$ = host;
  });
  await page.goto('/');
  const runtime = await page.evaluate(() => ({
    hostPreserved: window.jQuery === window.__hostJQuery && window.$ === window.__hostJQuery,
    carouselReady: typeof window.creatorAcademyJQuery?.fn.owlCarousel === 'function',
  }));
  expect(runtime).toEqual({hostPreserved:true, carouselReady:true});
});
for (const width of [375, 1440]) {
  test(`SaleBot scroll container navigation and top button at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:812});
    await page.route('**/index.html', async route => {
      const response = await route.fetch();
      const html = await response.text();
      // Reproduce the platform's actual separate scrolling viewport.
      await route.fulfill({response,body:html.replace('<body>', '<body style="height:100vh;overflow:hidden"><main class="salebot-landing__container" style="height:100vh;overflow-y:auto;position:relative">').replace('</body>', '</main></body>')});
    });
    await page.goto('/index.html');
    await page.evaluate(() => document.fonts.ready);
    const root = page.locator('.salebot-landing__container');
    await root.evaluate(el => el.scrollTo(0,900));
    await expect(page.locator('#scrollTopBtn')).toHaveClass(/visible/);
    if (width < 768) {
      await page.locator('.hamburger').click();
      await expect(root).toHaveCSS('overflow-y','hidden');
      await page.keyboard.press('Escape');
      await expect(root).toHaveCSS('overflow-y','auto');
      expect(await root.evaluate(el=>el.scrollTop)).toBe(900);
    }
    for (const block of ['about','gallery','programme','cases','reviews','rates']) {
      if (width < 768) await page.locator('.hamburger').click();
      const menu = width < 768 ? '.menu' : '.header-fixed';
      await page.locator(`${menu} [data-block="${block}"]`).click();
      await expect.poll(()=>page.locator(`#${block}`).evaluate(el=>{const top=el.getBoundingClientRect().top; return top>=60 && top<300;}), {message:`Navigation target: ${block}`}).toBe(true);
    }
    if (width >= 768) await page.locator('#scrollTopBtn button').click();
    else {
      // The existing design hides the entire right toolbar on phones.
      await expect(page.locator('.fixed')).toBeHidden();
      await root.evaluate(el=>el.scrollTo(0,0));
    }
    await expect.poll(()=>root.evaluate(el=>el.scrollTop)).toBe(0);
    await expect(page.locator('#scrollTopBtn')).not.toHaveClass(/visible/);
    expect(await page.evaluate(()=>scrollY)).toBe(0);
  });
}
for (const viewport of [{width:375,height:812},{width:1440,height:900}]) {
  test(`navigation stays fixed at ${viewport.width}px`, async ({page}) => {
    await page.setViewportSize(viewport);
    await open(page);
    const header=page.locator(viewport.width < 768 ? '.hamburger-header' : '.header-fixed');
    for(const position of [0,100,900,3000,0]) {
      await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),position);
      await expect(header).toBeVisible();
      await expect.poll(()=>header.evaluate(el=>el.getBoundingClientRect().top)).toBe(0);
      expect(await header.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
    }
    if(viewport.width >= 768) {
      await expect(page.locator('.page > header:not(.header-fixed)')).toHaveAttribute('inert','');
    }
  });
}
test('hero remains closable after a domain-restricted response and never starts hidden', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const requests=[];
  await page.route('https://kinescope.io/embed/**', route => {
    requests.push(route.request().url());
    return route.fulfill({status:403,contentType:'text/html',body:'<html><body>Доступ запрещен. Видео недоступно на этом сайте</body></html>'});
  });
  await open(page);
  expect(requests).toEqual([]);
  const responsePromise=page.waitForResponse(r=>r.url().startsWith('https://kinescope.io/embed/'));
  await page.locator('.hero__play-btn .play-btn').click();
  expect((await responsePromise).status()).toBe(403);
  await expect.poll(()=>requests[0]).toBe('https://kinescope.io/embed/u2Tb99aoUmhahUHxd3xX4q?autoplay=1');
  // An HTTP refusal may be rendered as the browser's error page rather than
  // its response body. Verify the refusal and accessible parent controls.
  await expect(page.locator('.modal-component')).toBeVisible();
  await expect(page.locator('.modal__close')).toBeVisible();
  await page.locator('.modal__close').click();
  await expect(page.locator('#player')).toHaveAttribute('src','about:blank');
  await expect(page.locator('.modal-component')).toBeHidden();
  await expect.poll(()=>page.frames().filter(f=>f.url().includes('kinescope.io/embed')).length).toBe(0);
  expect(requests).toHaveLength(1);
});

test('process and materials carousels move by dragging at mobile and desktop widths', async ({page}) => {
  for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    await open(page);
    await expect(page.locator('#learn-container')).toHaveClass(/learn__list/);
    if (width < 768) {
      const learn = page.locator('#learn-container');
      await expect(learn).toHaveClass(/owl-loaded/);
      await expect(learn.locator('.owl-item:not(.cloned) > .learn__item')).toHaveCount(7);
      await expect.poll(() => learn.locator('.owl-item.cloned').count()).toBeGreaterThan(0);
    } else {
      await expect(page.locator('#learn-container > .learn__item')).toHaveCount(7);
      await expect(page.locator('#learn-container')).not.toHaveClass(/owl-loaded/);
    }
    for (const selector of ['.how__bottom','.kit__grid']) {
      const slider=page.locator(selector);
      await expect(slider).toHaveClass(/owl-loaded/);
      await slider.scrollIntoViewIfNeeded();
      const stage=slider.locator('.owl-stage');
      const before=await stage.evaluate(el=>getComputedStyle(el).transform);
      const box=await slider.boundingBox();
      const x=box.x+box.width*0.8, y=box.y+Math.min(box.height/2,100);
      await page.mouse.move(x,y);
      await page.mouse.down();
      await page.mouse.move(x-box.width*0.6,y,{steps:12});
      await page.mouse.up();
      await expect.poll(()=>stage.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
      const gestures=await slider.evaluate(el=>{const o=window.creatorAcademyJQuery(el).data('owl.carousel');return [o.settings.touchDrag,o.settings.mouseDrag];});
      expect(gestures).toEqual([true,true]);
    }
  }
});

test('process and materials carousels keep looping in both directions', async ({page}) => {
  for (const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    await open(page);
    for (const selector of ['.how__bottom','.kit__grid']) {
      const slider=page.locator(selector);
      await slider.scrollIntoViewIfNeeded();
      const state=await slider.evaluate(el=>{
        const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
        return {loop:owl.settings.loop,items:owl.items().length,clones:owl.clones().length,maximum:owl.maximum(true)};
      });
      expect(state.loop).toBe(true);
      expect(state.clones).toBeGreaterThan(0);
      await slider.evaluate(el=>{
        const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
        owl.to(owl.maximum(true),0);
      });
      await slider.evaluate(el=>window.creatorAcademyJQuery(el).data('owl.carousel').next(0));
      await expect.poll(()=>slider.evaluate(el=>{
        const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
        return owl.relative(owl.current());
      })).toBe(0);
      await slider.evaluate(el=>window.creatorAcademyJQuery(el).data('owl.carousel').prev(0));
      await expect.poll(()=>slider.evaluate(el=>{
        const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
        return owl.relative(owl.current());
      })).toBe(state.maximum);
    }
  }
});

test('process and materials carousels wrap after mouse drags at both ends', async ({page}) => {
  await page.setViewportSize({width:375,height:812});
  await open(page);
  for (const selector of ['.how__bottom','.kit__grid']) {
    const slider=page.locator(selector);
    await slider.scrollIntoViewIfNeeded();
    const maximum=await slider.evaluate(el=>{
      const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
      owl.to(owl.maximum(true),0);
      return owl.maximum(true);
    });
    await page.waitForTimeout(300);
    const bounds=await slider.locator('.owl-stage-outer').boundingBox();
    const y=bounds.y+bounds.height/2;
    await page.mouse.move(bounds.x+bounds.width*.8,y);
    await page.mouse.down();
    await page.mouse.move(bounds.x+bounds.width*.2,y,{steps:12});
    await page.mouse.up();
    await expect.poll(()=>slider.evaluate(el=>{
      const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
      return owl.relative(owl.current());
    })).toBe(0);
    await page.waitForTimeout(300);
    await page.mouse.move(bounds.x+bounds.width*.2,y);
    await page.mouse.down();
    await page.mouse.move(bounds.x+bounds.width*.8,y,{steps:12});
    await page.mouse.up();
    await expect.poll(()=>slider.evaluate(el=>{
      const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
      return owl.relative(owl.current());
    })).toBe(maximum);
  }
});

test('process and materials carousels wrap after touch swipes at both ends', async ({page,browserName}) => {
  test.skip(browserName!=='chromium','CDP touch emulation is available in Chromium');
  await page.setViewportSize({width:375,height:812});
  await open(page);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  for (const selector of ['.how__bottom','.kit__grid']) {
    const slider=page.locator(selector);
    await slider.scrollIntoViewIfNeeded();
    const maximum=await slider.evaluate(el=>{
      const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
      owl.to(owl.maximum(true),0);
      return owl.maximum(true);
    });
    await page.waitForTimeout(300);
    const bounds=await slider.locator('.owl-stage-outer').boundingBox();
    const x1=Math.round(bounds.x+bounds.width*.8), x2=Math.round(bounds.x+bounds.width*.2), y=Math.round(bounds.y+bounds.height/2);
    const swipe=async(from,to)=>{
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y,id:1}]});
      for(let step=1;step<=12;step++){
        const x=Math.round(from+(to-from)*step/12);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y,id:1}]});
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    };
    await swipe(x1,x2);
    await expect.poll(()=>slider.evaluate(el=>{
      const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
      return owl.relative(owl.current());
    })).toBe(0);
    await page.waitForTimeout(300);
    await swipe(x2,x1);
    await expect.poll(()=>slider.evaluate(el=>{
      const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
      return owl.relative(owl.current());
    })).toBe(maximum);
  }
});

test('compact portfolio defers thumbnails and opens working carousels', async ({page},info)=>{
 const requests=[];
 page.on('request',r=>{if(r.url().includes('/images/gallery-'))requests.push(r.url());});
 await open(page);
 expect(requests).toEqual([]);
  await expect(page.locator('.portfolio-category')).toHaveCount(6);
 await page.locator('#gallery').scrollIntoViewIfNeeded();
 await page.screenshot({path:`test-results/${info.project.name}-portfolio-closed.png`});
 for(const category of await page.locator('.portfolio-category').all()){
  await category.locator('summary').click();
  await expect(category.locator('.owl-carousel')).toHaveClass(/owl-loaded/);
  const image=category.locator('.owl-item.active img').first();
  await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
  await expect(image).toHaveCSS('opacity','1');
  if(await category.evaluate(el=>el===document.querySelector('.portfolio-category'))){
   await category.evaluate(el=>window.scrollTo(0,window.scrollY+el.getBoundingClientRect().top-120));
   await page.screenshot({path:`test-results/${info.project.name}-portfolio-open.png`});
  }
  await category.locator('summary').click();
 }
});

test('portfolio and FAQ animate both ways and handle rapid clicks and reduced motion', async ({page})=>{
 await page.setViewportSize({width:375,height:812});
 await open(page);
 await expect(page.locator('#gallery')).toHaveText('Научитесь делать');
 for(const selector of ['.portfolio-category','.faq__item']){
  const item=page.locator(selector).last();
  const summary=item.locator('summary');
  await summary.click();
  await expect(item).not.toHaveClass(/disclosure-moving/);
  expect(await item.evaluate(el=>el.open)).toBe(true);
  expect((await item.locator('.disclosure-panel').boundingBox()).height).toBeGreaterThan(0);
  await summary.evaluate(el=>{el.click();el.click();el.click();});
  await expect(item).not.toHaveClass(/disclosure-moving/);
  expect(await item.evaluate(el=>el.open)).toBe(false);
  await page.emulateMedia({reducedMotion:'reduce'});
  await summary.click();
  expect(await item.evaluate(el=>el.open)).toBe(true);
  await expect(item.locator('.disclosure-panel')).toHaveCSS('transition-duration','0s');
  await summary.click();
  expect(await item.evaluate(el=>el.open)).toBe(false);
  await page.emulateMedia({reducedMotion:'no-preference'});
 }
});

test('disclosures render intermediate heights instead of jumping open',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await open(page);
 for(const selector of ['.portfolio-category','.faq__item']){
  const samples=await page.locator(selector).last().evaluate(async item=>{
   const panel=item.querySelector('.disclosure-panel');const samples=[];
   item.querySelector('summary').click();
   await new Promise(resolve=>{
    function frame(){samples.push(panel.getBoundingClientRect().height);if(samples.length===45)resolve();else requestAnimationFrame(frame);}
    requestAnimationFrame(frame);
   });return samples;
  });
  const full=Math.max(...samples);
  expect(full).toBeGreaterThan(40);
  expect(samples[0]).toBeLessThan(full*.2);
  expect(samples.filter(h=>h>full*.1&&h<full*.9).length).toBeGreaterThan(4);
  expect(Math.max(...samples.slice(1).map((h,i)=>Math.abs(h-samples[i])))).toBeLessThan(full*.3);
 }
});
