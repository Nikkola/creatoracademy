const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const sharp=require('sharp');
test('fourteen testimonials retain the requested order and full video links',async({page},testInfo)=>{
 await page.route('https://kinescope.io/**',route=>route.fulfill({contentType:'text/html',body:'<html>Review player</html>'}));
 await page.goto('/');
 const cards=page.locator('#reviews .owl-item:not(.cloned)>.film');
 await expect(cards.locator('h3')).toHaveText(['Сергей Ухлов','Витя Никифоров','Александр Корс','Алексей Подъяпольский','Нияз Валиуллин','Кирилл Усиков','Александр Слудников','Дмитрий Ким','Евгений Ракитин','Анна Корзун','Максим Поярче','Анна Адамец','Тимур Сафин','Александр Панкратов']);
 const urls=await cards.locator('[data-video]').evaluateAll(nodes=>nodes.map(n=>n.dataset.video));
 expect(urls[0]).toBe('https://kinescope.io/embed/vJXFgL6yzTPcvNmWUkBRn4');
 expect(urls.slice(-3)).toEqual(['https://kinescope.io/embed/8h4yBYJAn8TSR6nbex8Pyz','https://kinescope.io/embed/65SxUiHd4Lg3yfaLU5wViL','https://kinescope.io/embed/wToAmgMaWFcLYRNDChG75e']);
 expect(new Set(urls).size).toBe(14);
 expect(urls.slice(2,4)).toEqual(['https://kinescope.io/embed/0YuA5j6AVdkHx9NFwqx6t2','https://kinescope.io/embed/jebbevNFqr1P4x1wjTsTPS']);
 await expect(cards.nth(2)).toContainText('Участник седьмого потока');
 await expect(cards.nth(3)).toContainText('Участник восьмого потока');
 await expect(cards.nth(10).locator('img')).toHaveAttribute('src','/assets/student-reviews-2026-10-31/images/videoreview-poyarche.webp');
 expect(urls[10]).toBe('https://kinescope.io/embed/99Tdrcz8jXmd2Z4F8g1fLe');
 for(const name of ['kors','podyapolskiy']){
  const file=`assets/student-reviews-2026-11-03/images/videoreview-${name}.webp`;
  const meta=await sharp(file).metadata();expect([meta.width,meta.height]).toEqual([840,549]);expect(fs.statSync(file).size).toBeLessThan(50000);
 }
 for(const name of ['ukhlov','adamets','safin','pankratov','poyarche']){
  const file=`assets/student-reviews-2026-10-31/images/videoreview-${name}.webp`;
  const meta=await sharp(file).metadata();expect([meta.width,meta.height]).toEqual([840,549]);expect(fs.statSync(file).size).toBeLessThan(50000);
 }
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  const dots=page.locator('#reviews .gallery__block .carousel-pagination button');
  await expect(dots).toHaveCount(14);await dots.first().click();
  await expect(cards.first().locator('img')).toBeVisible();
  await page.locator('#reviews .gallery__block').screenshot({path:testInfo.outputPath(`reviews-${width}-first.png`)});
  for(const index of [2,3]){
   await dots.nth(index).click();
   await expect.poll(()=>page.locator('#reviews .owl-carousel').evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(index);
   const card=cards.nth(index);await expect(card.locator('img')).toBeVisible();
   await expect.poll(()=>card.locator('img').evaluate(im=>im.complete&&im.naturalWidth===840)).toBe(true);
   await card.locator('[data-video]').click();
   await expect(page.locator('#player iframe')).toHaveAttribute('src',urls[index]);
   await page.locator('#player .close-player').click();
   await expect(page.locator('#player iframe')).toHaveCount(0);
   await page.locator('#reviews .gallery__block').screenshot({path:testInfo.outputPath(`reviews-${width}-${index+1}.png`)});
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  await dots.last().click();
  await expect.poll(()=>page.locator('#reviews .owl-carousel').evaluate(el=>{const o=creatorAcademyJQuery(el).data('owl.carousel');return o.relative(o.current())})).toBe(13);
  await expect(cards.last().locator('img')).toBeVisible();
  await page.locator('#reviews .gallery__block').screenshot({path:testInfo.outputPath(`reviews-${width}-last.png`)});
 }
});
