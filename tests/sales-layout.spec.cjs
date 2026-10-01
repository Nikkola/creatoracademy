const { test, expect } = require('@playwright/test');

test('sales sections appear before author portfolio and retain all quotes', async ({ page }) => {
  await page.goto('/');
  const order = await page.locator('.cases,.programme,.how,.kit,.rates,.about,.portfolio-category').evaluateAll(nodes => nodes.map(el => el.className.split(' ').find(c => ['cases','programme','how','kit','rates','about','portfolio-category'].includes(c))));
  expect(order.slice(0, 6)).toEqual(['cases','programme','how','kit','rates','about']);
  expect(await page.locator('.goal').count()).toBe(7);
  await expect(page.locator('.hero__button-container button')).toHaveText(/Записаться/);
});

test('about slider keeps three original cards, photos and working slide dots', async ({ page }, info) => {
  await page.setViewportSize({ width:375, height:812 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.screenshot({ path:`previews/${info.project.name}-about-slider.png` });
  const track = page.locator('.about__list');
  await expect(track.locator(':scope > .about__block')).toHaveCount(3);
  await expect(page.locator('.about-slider-dots button')).toHaveCount(3);
  const before = await track.evaluate(el => ({ client:el.clientWidth, scroll:el.scrollWidth }));
  expect(before.scroll).toBeGreaterThan(before.client);
  for (const image of ['bg-images-about-7.webp','bg-images-about-2.webp','bg-images-about-1.webp']) {
    const response = await page.request.get(`/assets/site-audit-v3/images/${image}`);
    expect(response.ok()).toBe(true);
  }
  await page.locator('.about-slider-dots button').nth(2).click();
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  await expect(page.locator('.about-slider-dots button').nth(2)).toHaveAttribute('aria-current','true');
  await page.waitForTimeout(500);
  await page.screenshot({ path:`previews/${info.project.name}-about-slider-last.png` });
  const last = await track.locator(':scope > .about__block').nth(2).boundingBox();
  const viewport = await track.boundingBox();
  expect(last.x).toBeGreaterThanOrEqual(viewport.x - 1);
  expect(last.x).toBeLessThan(viewport.x + viewport.width);
});

test('about entrepreneur title keeps its original large desktop scale and fits its slide', async ({ page }) => {
  await page.setViewportSize({ width:2048, height:1140 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.locator('.about-slider-dots button').nth(2).click();
  await expect.poll(() => page.locator('.about__list').evaluate(el => {
    const slide = el.querySelectorAll(':scope > .about__block')[2];
    return Math.abs(slide.getBoundingClientRect().left - el.getBoundingClientRect().left);
  })).toBeLessThan(2);
  await expect(page.locator('.about-slider-dots button').nth(2)).toHaveAttribute('aria-current','true');
  const title = page.locator('.about__block:nth-child(3) .text__big');
  const facts = page.locator('.about__block:nth-child(3) .text__small-item');
  await expect(facts.first()).toContainText('15 лет в digital и контент-маркетинге');
  const factLines = await facts.evaluateAll(items => items.map(el => {
    const style = getComputedStyle(el);
    return el.getBoundingClientRect().height / parseFloat(style.lineHeight);
  }));
  const metrics = await title.evaluate(el => ({
    fontSize: parseFloat(getComputedStyle(el).fontSize),
    title: el.getBoundingClientRect().toJSON(),
    slide: el.closest('.about__block').getBoundingClientRect().toJSON(),
  }));
  expect(metrics.fontSize).toBe(218);
  expect(metrics.title.width).toBeGreaterThan(700);
  expect(metrics.title.left).toBeGreaterThanOrEqual(metrics.slide.left - 1);
  expect(metrics.title.right).toBeLessThanOrEqual(metrics.slide.right + 1);
  expect(factLines.every(lines => lines <= 2.2)).toBe(true);
  for (const image of ['bg-images-about-7-wide.webp','bg-images-about-2-wide.webp','bg-images-about-1-wide.webp']) {
    expect((await page.request.get(`/assets/site-audit-v3/images/${image}`)).ok()).toBe(true);
  }
  await expect.poll(() => page.locator('.about__block:nth-child(3)').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('-wide.webp');
  await page.screenshot({ path:'previews/chromium-about-desktop-last.png' });
});

test('about slider advances after a short touch swipe', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright touch emulation through CDP is Chromium-only');
  await page.setViewportSize({ width:375, height:812 });
  await page.goto('/');
  const track = page.locator('.about__list');
  await track.scrollIntoViewIfNeeded();
  const bounds = await track.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled:true, maxTouchPoints:1 });
  const x = Math.round(bounds.x + bounds.width * .78);
  const y = Math.round(bounds.y + bounds.height * .5);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x, y, id:1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:x - 75, y, id:1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect(page.locator('.about-slider-dots button').nth(1)).toHaveAttribute('aria-current','true');
});

test('about slider can be dragged with the mouse', async ({ page }) => {
  await page.setViewportSize({ width:375, height:812 });
  await page.route('https://vk.com/**', route => route.fulfill({contentType:'text/html',body:'<html><body>Test player</body></html>'}));
  await page.goto('/');
  const track = page.locator('.about__list');
  await track.scrollIntoViewIfNeeded();
  const rect = await track.boundingBox();
  await page.mouse.move(rect.x + rect.width * .8, rect.y + rect.height * .5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .2, rect.y + rect.height * .5, { steps:12 });
  await page.mouse.up();
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(20);
  await expect(page.locator('.about-slider-dots button').nth(1)).toHaveAttribute('aria-current','true');
  await track.locator('.about__block').nth(1).locator('.play-btn').click();
  await expect(page.locator('.modal-component')).toBeVisible();
});

test('short hero proposal works separately from landing', async ({ page }, info) => {
  await page.setViewportSize({ width:375, height:812 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/previews/hero-proposal.html');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.hero__text p')).toHaveCount(2);
  await expect(page.locator('.hero__text')).toContainText('сообщество в одном месте');
  await expect(page.locator('.hero__text')).toContainText('первых подписчиков');
  await expect(page.locator('.hero__button-container button')).toHaveText(/Записаться/);
  await page.screenshot({ path:`previews/${info.project.name}-hero-proposal.png` });
  await page.locator('.hero__button-container button').click();
  await expect.poll(() => page.locator('#rates').evaluate(el => Math.abs(el.getBoundingClientRect().top - 75))).toBeLessThan(180);
  expect(errors).toEqual([]);
});
