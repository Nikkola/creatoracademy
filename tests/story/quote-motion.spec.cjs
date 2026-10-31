const {test,expect}=require('@playwright/test');
const quotes='.editorial-quote,.author-manifesto';
const state=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {opacity:Number(s.opacity),y:new DOMMatrixReadOnly(s.transform).m42,height:r.height}};

for(const width of [390,1440])test(`all quotes enter smoothly once and stay visible during reverse scrolling at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 const items=page.locator(quotes);await expect(items).toHaveCount(7);
 for(const quote of await items.all()){
  const copy=quote.locator('.quote-copy');
  await expect.poll(()=>copy.evaluate(state).then(s=>s.opacity)).toBe(0);
  const samples=await quote.evaluate(async el=>{
   const copy=el.querySelector('.quote-copy'),signature=el.querySelector('cite'),samples=[];
   el.scrollIntoView({block:'center',behavior:'instant'});
   const start=performance.now();
   await new Promise(resolve=>{function sample(){const s=getComputedStyle(copy),r=el.getBoundingClientRect();samples.push({opacity:Number(s.opacity),y:new DOMMatrixReadOnly(s.transform).m42,height:r.height,signature:signature?Number(getComputedStyle(signature).opacity):null});performance.now()-start<1350?requestAnimationFrame(sample):resolve()}requestAnimationFrame(sample)});
   return samples;
  });
  expect(samples.some(s=>s.opacity>.05&&s.opacity<.95&&s.y>0)).toBe(true);
  expect(samples.at(-1).opacity).toBe(1);expect(Math.abs(samples.at(-1).y)).toBeLessThan(.01);
  expect(Math.max(...samples.map(s=>s.height))-Math.min(...samples.map(s=>s.height))).toBeLessThan(.1);
  if(samples[0].signature!==null){expect(samples.some(s=>s.opacity>.1&&s.signature<s.opacity-.05)).toBe(true);expect(samples.at(-1).signature).toBe(1)}
 }
 await page.locator('.hero').evaluate(el=>el.scrollIntoView({behavior:'instant'}));
 for(const quote of (await items.all()).reverse()){
  await expect.poll(()=>quote.locator('.quote-copy').evaluate(state).then(s=>s.opacity)).toBe(1);
  const samples=await quote.evaluate(async el=>{
   const copy=el.querySelector('.quote-copy'),values=[];el.scrollIntoView({block:'center',behavior:'instant'});const start=performance.now();
   await new Promise(resolve=>{function sample(){values.push(Number(getComputedStyle(copy).opacity));performance.now()-start<1150?requestAnimationFrame(sample):resolve()}requestAnimationFrame(sample)});return values;
  });
  expect(samples.every(opacity=>opacity===1)).toBe(true);
  for(const delta of [-24,48,-24]){
   await page.evaluate(delta=>scrollBy(0,delta),delta);
   const current=await quote.locator('.quote-copy').evaluate(state);
   expect(current.opacity).toBe(1);expect(Math.abs(current.y)).toBeLessThan(.01);
  }
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('quotes stay readable with reduced motion, a changed preference and no JavaScript',async({page,browser})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const visible=()=>page.locator(`${quotes.split(',').join('>.quote-copy,')}>.quote-copy`).evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).opacity==='1'&&el.getAnimations().length===0));
 expect(await visible()).toBe(true);
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();
 await expect.poll(()=>page.locator('.quote-copy').last().evaluate(el=>Number(getComputedStyle(el).opacity))).toBe(0);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await visible()).toBe(true);
 const context=await browser.newContext({javaScriptEnabled:false});
 try{const tab=await context.newPage();await tab.goto(page.url());expect(await tab.locator('.quote-copy').evaluateAll(nodes=>nodes.length===7&&nodes.every(el=>getComputedStyle(el).opacity==='1'))).toBe(true)}finally{await context.close()}
});
