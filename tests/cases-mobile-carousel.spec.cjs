const { test, expect } = require('@playwright/test');

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

    const target = count - 1;
    await dots.nth(target).click();
    await expect.poll(() => rail.evaluate((element) => {
      const carousel = window.creatorAcademyJQuery(element).data('owl.carousel');
      return carousel.relative(carousel.current());
    })).toBe(target);
    await expect(dots.nth(target)).toHaveAttribute('aria-current', 'true');
    await expect(dots.nth(0)).not.toHaveAttribute('aria-current', 'true');
  });
}
