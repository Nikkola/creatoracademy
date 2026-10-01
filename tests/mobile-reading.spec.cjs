const { test, expect } = require('@playwright/test');

for (const width of [320, 375, 390]) {
  test(`mobile reading ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const report = await page.evaluate(() => {
      const bounds = el => {
        const r = el.getBoundingClientRect();
        return { top: r.top + window.scrollY, left: r.left, right: r.right, height: r.height };
      };
      return {
        titles: [...document.querySelectorAll('.about__list .owl-item:not(.cloned) .text__big')].map(el => {
          const slide = bounds(el.closest('.about__block'));
          return { text:el.textContent.trim(), slide, title:bounds(el) };
        }),
        goal: bounds([...document.querySelectorAll('.goal')].at(-1)),
        author: bounds(document.querySelector('.goal__author')),
        footer: bounds(document.querySelector('.footer')),
        logo: bounds(document.querySelector('.footer__logo')),
        mail: bounds(document.querySelector('.footer__mail')),
        socials: bounds(document.querySelector('.footer__socials-mobile')),
      };
    });
    await info.attach('mobile-reading', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    console.log(info.project.name, width, JSON.stringify(report));
    await page.locator('.about__list .owl-item.active .about__block').screenshot({ path: `test-results/${info.project.name}-${width}-about.png` });
    await page.locator('.goal').last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/${info.project.name}-${width}-ending.png` });
    for (const [index, title] of report.titles.entries()) {
      expect(title.title.left).toBeGreaterThanOrEqual(title.slide.left);
      expect(title.title.right).toBeLessThanOrEqual(title.slide.right + 1);
      await page.locator('.about-slider-dots button').nth(index).click();
      await expect.poll(() => page.locator('.about__list').evaluate((el,index) => {
        const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
        return owl.relative(owl.current()) === index ? 0 : 1000;
      }, index)).toBeLessThan(1);
      await page.waitForTimeout(350);
      const visible = await page.locator('.about__list').evaluate((el,index) => {
        const owl=window.creatorAcademyJQuery(el).data('owl.carousel');
        return owl.items(index).get(0).querySelector('.text__big').getBoundingClientRect().toJSON();
      }, index);
      expect(visible.x).toBeGreaterThanOrEqual(-1);
      expect(visible.x + visible.width).toBeLessThanOrEqual(width + 1);
    }
    expect(report.logo.top - (report.author.top + report.author.height)).toBeLessThanOrEqual(80);
    expect(report.mail.top - (report.logo.top + report.logo.height)).toBeLessThanOrEqual(32);
    expect(report.socials.top - (report.mail.top + report.mail.height)).toBeLessThanOrEqual(32);
  });
}
