const {test,expect}=require('@playwright/test');
const screens=[[320,568],[360,800],[375,812],[390,844],[414,896],[430,932],[568,320],[812,375],[768,1024],[820,1180],[1024,768],[1280,800],[1440,900],[1920,1080]];
for(const [width,height] of screens) test(`page sections stay in flow ${width}x${height}`,async({page},info)=>{
 await page.setViewportSize({width,height});
 // Test lazy decoding rather than measuring only empty placeholders.
 await page.route('**/lesson-demo-*.webp',async route=>{await new Promise(r=>setTimeout(r,150));await route.continue()});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 if(width===375) await page.evaluate(()=>{
  const root=document.querySelector('.page');const host=document.createElement('main');host.className='salebot-landing__container';host.style.cssText='height:100vh;overflow-y:auto;padding:0 16px';root.before(host);host.append(root);window.dispatchEvent(new Event('resize'));
 });
 for(const card of await page.locator('.lesson-demo').all()){
  await card.scrollIntoViewIfNeeded();await expect.poll(()=>card.locator('img').evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
 }
 const metrics=()=>page.evaluate(()=>{
  const box=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
  return {overflow:document.documentElement.scrollWidth-innerWidth,section:box(document.querySelector('.lesson-demos')),kit:box(document.querySelector('.kit')),cards:[...document.querySelectorAll('.lesson-demo')].map(e=>({card:box(e),button:box(e.querySelector('button')),title:box(e.querySelector('h3')),image:box(e.querySelector('img'))}))};
 });
 const check=m=>{
  expect(m.overflow).toBeLessThanOrEqual(1);expect(m.kit.top).toBeGreaterThanOrEqual(m.section.bottom-1);
  for(const c of m.cards){expect(c.card.bottom).toBeLessThanOrEqual(m.section.bottom+1);expect(c.title.top).toBeGreaterThanOrEqual(c.button.bottom+10);expect(c.card.left).toBeGreaterThanOrEqual(0);expect(c.card.right).toBeLessThanOrEqual(width+1);expect(Math.abs(c.button.height-c.button.width*9/16)).toBeLessThan(3);expect(c.image.bottom).toBeLessThanOrEqual(c.button.bottom+1);}
  if(width<768) for(let i=1;i<m.cards.length;i++)expect(m.cards[i].card.top-m.cards[i-1].card.bottom).toBeGreaterThanOrEqual(25);
 };
 check(await metrics());
 await page.locator('.faq').scrollIntoViewIfNeeded();await page.locator('.faq summary').first().click();await page.waitForTimeout(550);check(await metrics());
 await page.locator('.lesson-demos').scrollIntoViewIfNeeded();check(await metrics());
 if([375,812,1440].includes(width))await page.locator('.lesson-demos').screenshot({path:`previews/compat-${info.project.name}-${width}.png`});
});
