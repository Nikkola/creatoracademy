const { test, expect } = require('@playwright/test');

test('all case cards fit beneath the mobile header at iPhone 13 mini width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 635 });
  await page.goto('/');
  await expect(page.locator('.cases__slider')).toHaveClass(/owl-loaded/);
  await page.evaluate(() => document.fonts.ready);
  const cards = await page.locator('.cases__slider .owl-item:not(.cloned) .cases__item').evaluateAll(elements => elements.map(card => ({
    name: card.querySelector('.cases__name').textContent,
    height: card.getBoundingClientRect().height,
    font: getComputedStyle(card.querySelector('.cases__text')).fontFamily,
    clipped: card.scrollHeight > card.clientHeight + 2,
  })));
  expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    expect(card.height, card.name).toBeLessThanOrEqual(635 - 60 - 44);
    expect(card.font).toContain('Montserrat');
    expect(card.clipped, card.name).toBe(false);
  }
  await expect(page.locator('.rate__text').filter({ hasText: '7 модулей, 32 урока, больше 12 часов видео' })).toHaveCount(3);
  await expect(page.locator('.lesson-demos__description')).toHaveText('Это фрагменты из нескольких уроков курса, чтобы вы могли ознакомиться с моей подачей материала. Почти 5 минут из более чем 12 часов материала.');
});

for (const width of [320, 375, 390]) {
  test(`case carousel shows one complete slide with working dots at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    const rail = page.locator('.cases__slider');
    await expect(rail).toHaveClass(/owl-loaded/);

    const dots = page.locator('.cases-slider-dots button');
    const count = await rail.locator('> .owl-stage-outer > .owl-stage > .owl-item:not(.cloned)').count();
    await expect(dots).toHaveCount(count);
    await expect(dots.first()).toHaveAttribute('aria-current', 'true');

    const bounds = await rail.evaluate((element) => {
      const slide = element.querySelector('.owl-item.active .cases__item').getBoundingClientRect();
      const viewport = element.getBoundingClientRect();
      return { left: slide.left, right: slide.right, railLeft: viewport.left, railRight: viewport.right };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(bounds.railLeft - 1);
    expect(bounds.right).toBeLessThanOrEqual(bounds.railRight + 1);
    expect(bounds.right - bounds.left).toBeLessThanOrEqual(width - 30);

    for (let target = 0; target < count; target++) {
      await dots.nth(target).click();
      await expect.poll(() => rail.evaluate((element) => {
        const carousel = window.creatorAcademyJQuery(element).data('owl.carousel');
        return carousel.relative(carousel.current());
      })).toBe(target);
      await expect(dots.nth(target)).toHaveAttribute('aria-current', 'true');
      await page.waitForTimeout(400);
      const bounds = await rail.evaluate((element, target) => {
        const slide = element.querySelector('.owl-item.active .cases__item').getBoundingClientRect();
        const viewport = element.getBoundingClientRect();
        return { left: slide.left, right: slide.right, width: slide.width, railLeft: viewport.left, railRight: viewport.right, railWidth: viewport.width };
      }, target);
      expect(bounds.left).toBeGreaterThanOrEqual(bounds.railLeft - 1);
      expect(bounds.right).toBeLessThanOrEqual(bounds.railRight + 1);
      expect(bounds.width).toBeCloseTo(bounds.railWidth, 0);
    }
    await expect(dots.first()).not.toHaveAttribute('aria-current', 'true');
  });
}

test('embedded SaleBot case outline remains visible at iPhone 13 mini width', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.evaluate(() => {
    const wrapper = document.createElement('main');
    wrapper.className = 'salebot-landing__container';
    wrapper.style.cssText = 'height:100vh;overflow-y:auto;padding:0 16px;box-sizing:border-box';
    const root = document.querySelector('#root') || document.querySelector('.page');
    root.before(wrapper);
    wrapper.append(root);
    window.dispatchEvent(new Event('resize'));
  });
  const rail = page.locator('.cases__slider');
  await expect(rail).toHaveClass(/owl-loaded/);
  await page.waitForTimeout(400);
  await rail.evaluate((element) => window.creatorAcademyJQuery(element).data('owl.carousel').refresh());
  const metrics = await rail.evaluate((element) => {
    const card = element.querySelector('.owl-item.active .cases__item');
    const border = card.getBoundingClientRect();
    const viewport = element.getBoundingClientRect();
    const style = getComputedStyle(card);
    return {
      border: { left: border.left, right: border.right, width: border.width },
      rail: { left: viewport.left, right: viewport.right, width: viewport.width },
      boxSizing: style.boxSizing,
      borderLeft: style.borderLeftWidth + ' ' + style.borderLeftStyle,
    };
  });
  await rail.screenshot({ path: 'test-results/cases-375-salebot.png' });
  await info.attach('salebot-case-bounds', { body: JSON.stringify(metrics), contentType: 'application/json' });
  expect(metrics.border.left).toBeGreaterThanOrEqual(metrics.rail.left - 1);
  expect(metrics.border.right).toBeLessThanOrEqual(metrics.rail.right + 1);
});
