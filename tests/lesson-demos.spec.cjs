const { test, expect } = require('@playwright/test');
const ids = ['9H4x5vpPJF9uvFiD5mD4Au', 'axob3HKytcGC6WuFz6vfRU', 'vGdNur3hEk5d86sVE7TaLG', '97tKDqSc4hEuJpVdc7hG22'];
for (const width of [320, 375, 390, 1440]) {
  test(`lesson previews fit and open the correct videos at ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('https://kinescope.io/**', route => route.fulfill({ contentType: 'text/html', body: '<p>Test player</p>' }));
    await page.goto('/#lesson-demos');
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator('.lesson-demo');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('#player')).toHaveAttribute('src', 'about:blank');
    for (let i = 0; i < 4; i++) {
      const card = cards.nth(i);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      const image = card.locator('img');
      await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      const button = card.locator('button');
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#player')).toHaveAttribute('src', `https://kinescope.io/embed/${ids[i]}?autoplay=1`);
      await page.keyboard.press('Escape');
      await expect(page.locator('#player')).toHaveAttribute('src', 'about:blank');
      await expect(button).toBeFocused();
    }
    if (width < 768) {
      const first = await cards.nth(0).boundingBox();
      const second = await cards.nth(1).boundingBox();
      expect(second.y).toBeGreaterThan(first.y + first.height);
      expect(second.x).toBe(first.x);
    }
    await page.locator('#lesson-demos').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `previews/lesson-demos-${info.project.name}-${width}.png` });
  });
}
