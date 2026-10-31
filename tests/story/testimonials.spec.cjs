const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const sharp=require('sharp');
test('twelve testimonials retain the requested order and full video links',async({page},testInfo)=>{
 await page.goto('/');
 const cards=page.locator('#reviews .owl-item:not(.cloned)>.film');
 await expect(cards.locator('h3')).toHaveText(['Сергей Ухлов','Витя Никифоров','Нияз Валиуллин','Кирилл Усиков','Александр Слудников','Дмитрий Ким','Евгений Ракитин','Анна Корзун','Максим Поярче','Анна Адамец','Тимур Сафин','Александр Панкратов']);
 const urls=await cards.locator('[data-video]').evaluateAll(nodes=>nodes.map(n=>n.dataset.video));
 expect(urls[0]).toBe('https://kinescope.io/embed/vJXFgL6yzTPcvNmWUkBRn4');
 expect(urls.slice(-3)).toEqual(['https://kinescope.io/embed/8h4yBYJAn8TSR6nbex8Pyz','https://kinescope.io/embed/65SxUiHd4Lg3yfaLU5wViL','https://kinescope.io/embed/wToAmgMaWFcLYRNDChG75e']);
 expect(new Set(urls).size).toBe(12);
 await expect(cards.nth(8).locator('img')).toHaveAttribute('src','/assets/student-reviews-2026-10-31/images/videoreview-poyarche.webp');
 expect(urls[8]).toBe('https://kinescope.io/embed/99Tdrcz8jXmd2Z4F8g1fLe');
 for(const name of ['ukhlov','adamets','safin','pankratov','poyarche']){
  const file=`assets/student-reviews-2026-10-31/images/videoreview-${name}.webp`;
  const meta=await sharp(file).metadata();expect([meta.width,meta.height]).toEqual([840,549]);expect(fs.statSync(file).size).toBeLessThan(50000);
 }
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000});
  const dots=page.locator('#reviews .gallery__block .carousel-pagination button');
  await expect(dots).toHaveCount(12);await dots.first().click();
  await expect(cards.first().locator('img')).toBeVisible();
  await page.locator('#reviews .gallery__block').screenshot({path:testInfo.outputPath(`reviews-${width}-first.png`)});
  await dots.last().click();
  await expect.poll(()=>page.locator('#reviews .owl-carousel').evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(11);
  await expect(cards.last().locator('img')).toBeVisible();
  await page.locator('#reviews .gallery__block').screenshot({path:testInfo.outputPath(`reviews-${width}-last.png`)});
 }
});
