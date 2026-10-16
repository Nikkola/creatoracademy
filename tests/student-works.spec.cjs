const { test, expect } = require('@playwright/test');

for (const width of [390, 1440]) test(`new participant works at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.route('https://kinescope.io/**', route => route.fulfill({ contentType: 'text/html', body: '<html>Test player</html>' }));
  await page.goto('/');
  await expect(page.locator('#students-works .gallery__list')).toHaveClass(/owl-loaded/);
  const list = page.locator('#students-works .gallery__list');
  const items = list.locator('.owl-item:not(.cloned) > li');
  const works = [
    ['ukhlov', '69gCEKefwdQePKhfqDGSCN', 'Индивидуальное годовое наставничество'],
    ['valiullin', 'bthyztQaJuWcmJStpmtfRF', 'Участник и победитель восьмого потока'],
    ['nikiforov', '3S6hkWbXGq6Ub3DzMgPvtZ', 'Участник восьмого потока'],
  ];
  for (const [position, [key, video, description]] of works.entries()) {
    await expect(items.nth(position)).toHaveAttribute('data-student-work', key);
    await list.evaluate((el, position) => window.creatorAcademyJQuery(el).trigger('to.owl.carousel', [position, 0]), position);
    const card = list.locator(`.owl-item.active [data-student-work="${key}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.gallery__description')).toHaveText(description);
    const img = card.locator('img');
    await expect.poll(() => img.evaluate(el => [el.naturalWidth, el.naturalHeight])).toEqual([840, 549]);
    await expect.poll(() => img.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1);
    await page.screenshot({ path: `previews/student-works-2026-10-16-${info.project.name}-${width}-${key}.png` });
    await card.locator('button').click();
    await expect(page.locator('.modal-component')).toBeVisible();
    await expect(page.locator('#player')).toHaveAttribute('src', new RegExp(`kinescope.io/embed/${video}`));
    await page.keyboard.press('Escape');
    await expect(page.locator('#player')).toHaveAttribute('src', 'about:blank');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
