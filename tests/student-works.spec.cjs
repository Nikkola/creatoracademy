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

for (const width of [390, 1440]) test(`updated testimonials at ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 900 });
  await page.route('https://kinescope.io/**', route => route.fulfill({ contentType: 'text/html', body: '<html>Test player</html>' }));
  await page.goto('/');
  const list = page.locator('#video-reviews .gallery__list');
  await expect(list).toHaveClass(/owl-loaded/);
  const items = list.locator('.owl-item:not(.cloned) > li');
  await expect(items).toHaveCount(8);
  for (const [position, [key, name, description, video]] of [
    ['valiullin', 'Нияз Валиуллин', 'Участник и победитель восьмого потока', 'sCWgjnD9DYLWmujL3ZAk81'],
    ['nikiforov', 'Витя Никифоров', 'Участник восьмого потока', 'rUhTpT69rM5FVHLWhaHnjF'],
  ].entries()) {
    await expect(items.nth(position)).toHaveAttribute('data-student-review', key);
    await list.evaluate((el, position) => window.creatorAcademyJQuery(el).trigger('to.owl.carousel', [position, 0]), position);
    const card = list.locator(`.owl-item.active [data-student-review="${key}"]`).first();
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.gallery__subtitle')).toHaveText(name);
    await expect(card.locator('.gallery__description')).toHaveText(description);
    await expect.poll(() => card.locator('img').evaluate(el => [el.naturalWidth, el.naturalHeight, Number(getComputedStyle(el).opacity)])).toEqual([840, 549, 1]);
    await page.screenshot({ path: `previews/reviews-2026-10-19/${key}-${info.project.name}-${width}.png` });
    await card.locator('button').click();
    await expect(page.locator('#player')).toHaveAttribute('src', new RegExp(`kinescope.io/embed/${video}`));
    await page.keyboard.press('Escape');
    await expect(page.locator('#player')).toHaveAttribute('src', 'about:blank');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
