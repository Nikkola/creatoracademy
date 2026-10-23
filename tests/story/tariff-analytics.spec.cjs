const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');

test('tariff checkout clicks preserve the original three goals without reporting payments',async({page})=>{
 const html=fs.readFileSync(path.join(root,'dist/salebot.html'),'utf8');
 const source=fs.readFileSync(path.join(root,'source/story/baseline.html'),'utf8');
 const pattern=/<!-- Yandex.Metrika: цели по кнопкам тарифов -->[\s\S]*?<!-- \/Yandex.Metrika: цели по кнопкам тарифов -->/g;
 const original=source.match(pattern),restored=html.match(pattern);
 expect(restored).toHaveLength(1);expect(restored[0]).toBe(original[0]);
 await page.goto('/');
 await page.evaluate(()=>{window.analyticsProof=[];window.ym=(...args)=>analyticsProof.push(args);document.addEventListener('click',e=>e.preventDefault(),true)});
 for(const [tariff,goal] of [['25374','buy_solo'],['25376','buy_support'],['25375','buy_mentor']]){
  await page.locator('#rates a[href*="tariff='+tariff+'"]').evaluate(a=>{a.innerHTML+='<span data-test-click>nested</span>';a.querySelector('[data-test-click]').click()});
  expect(await page.evaluate(()=>analyticsProof.splice(0))).toEqual([[106221169,'reachGoal',goal]]);
 }
 await page.locator('.hero .btn').evaluate(a=>a.click());
 expect(await page.evaluate(()=>analyticsProof.splice(0))).toEqual([]);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{delete window.ym;document.querySelector('#rates a[href*="tariff=25374"]').click()});
 expect(errors).toEqual([]);expect(restored[0]).not.toContain('order_price');expect(restored[0]).not.toContain('ecommerce');
});
