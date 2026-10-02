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
  await expect(track).toHaveClass(/owl-loaded/);
  await expect(track.locator('.owl-item:not(.cloned) > .about__block')).toHaveCount(3);
  await expect(page.locator('.about-slider-dots button')).toHaveCount(3);
  await expect.poll(() => track.locator('.owl-item.cloned').count()).toBeGreaterThan(0);
  for (const image of ['bg-images-about-7.webp','bg-images-about-2.webp','bg-images-about-1.webp']) {
    const response = await page.request.get(`/assets/site-audit-v3/images/${image}`);
    expect(response.ok()).toBe(true);
  }
  await page.locator('.about-slider-dots button').nth(2).click();
  await expect.poll(() => track.evaluate(el => { const owl=window.creatorAcademyJQuery(el).data('owl.carousel'); return owl.relative(owl.current()); })).toBe(2);
  await expect(page.locator('.about-slider-dots button').nth(2)).toHaveAttribute('aria-current','true');
  await page.waitForTimeout(500);
  await page.screenshot({ path:`previews/${info.project.name}-about-slider-last.png` });
  const last = await track.locator('.owl-item.active .about__block--entrepreneur').boundingBox();
  const viewport = await track.locator('.owl-stage-outer').boundingBox();
  expect(last.x).toBeGreaterThanOrEqual(viewport.x - 1);
  expect(last.x).toBeLessThan(viewport.x + viewport.width);
});

test('about slider advances by clicking and wraps on the last slide', async ({ page }) => {
  await page.setViewportSize({ width:375, height:812 });
  await page.goto('/');
  const track = page.locator('.about__list');
  await track.scrollIntoViewIfNeeded();
  await track.locator('.owl-item.active .text__big').click();
  await expect(page.locator('.about-slider-dots button').nth(1)).toHaveAttribute('aria-current','true');
  await expect.poll(() => track.evaluate(el => { const owl=window.creatorAcademyJQuery(el).data('owl.carousel'); return owl.relative(owl.current()); })).toBe(1);
  await page.locator('.about-slider-dots button').nth(2).click();
  await track.locator('.owl-item.active .text__big').click();
  await expect(page.locator('.about-slider-dots button').nth(0)).toHaveAttribute('aria-current','true');
});

test('about entrepreneur title keeps its original large desktop scale and fits its slide', async ({ page }) => {
  await page.setViewportSize({ width:2048, height:1140 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.locator('.about-slider-dots button').nth(2).click();
  await expect.poll(() => page.locator('.about__list').evaluate(el => {
    const slide = el.querySelector('.owl-item.active .about__block--entrepreneur');
    return Math.abs(slide.getBoundingClientRect().left - el.querySelector('.owl-stage-outer').getBoundingClientRect().left);
  })).toBeLessThan(2);
  await expect(page.locator('.about-slider-dots button').nth(2)).toHaveAttribute('aria-current','true');
  const title = page.locator('.owl-item.active .about__block--entrepreneur .text__big');
  const facts = page.locator('.owl-item.active .about__block--entrepreneur .text__small-item');
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
  await expect.poll(() => page.locator('.owl-item.active .about__block--entrepreneur').evaluate(el => getComputedStyle(el).backgroundImage)).toContain('-wide.webp');
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
  for (let step=1; step<=12; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:Math.round(x - 75*step/12), y, id:1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] });
  await expect(page.locator('.about-slider-dots button').nth(1)).toHaveAttribute('aria-current','true');
});

test('desktop carousel cards can be clicked to bring that card into focus', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto('/');
  const slider = page.locator('.how__bottom');
  await slider.scrollIntoViewIfNeeded();
  const card = slider.locator('.owl-item:not(.cloned)').nth(1);
  await card.click();
  await expect.poll(() => slider.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    return owl.relative(owl.current());
  })).toBe(1);
});

test('click direction follows the selected Video Podcasts card', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto('/');
  const category = page.locator('.portfolio-category').filter({ hasText:'Видеоподкасты' });
  await category.locator('summary').click();
  const slider = category.locator('.owl-carousel');
  await expect(slider).toHaveClass(/owl-loaded/);
  const card = slider.locator('.owl-item:not(.cloned)').last();
  const expectedPosition = await card.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el.closest('.owl-carousel')).data('owl.carousel');
    return owl.relative(Array.prototype.indexOf.call(el.parentElement.children, el));
  });
  await card.click();
  await expect.poll(() => slider.evaluate(el => window.creatorAcademyJQuery(el).data('owl.carousel').current())).toBe(expectedPosition);
});

test('video reviews continue forward from the last slide to the first on desktop', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  await page.goto('/');
  const slider = page.locator('.section.gallery').filter({ hasText:'Видеоотзывы' }).locator('.gallery__list');
  await expect(slider).toHaveClass(/owl-loaded/);
  const count = await slider.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    owl.to(owl.items().length - 2, 0);
    return owl.items().length;
  });
  const nextCard = slider.locator('.owl-item.active .gallery__subtitle').nth(1);
  await nextCard.click();
  await expect.poll(() => slider.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    return owl.relative(owl.current());
  })).toBe(count - 1);
  await slider.locator('.owl-item.active .gallery__subtitle').nth(1).click();
  await expect.poll(() => slider.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    return owl.relative(owl.current());
  })).toBe(0);
});

test('mobile “Вы научитесь” carousel wraps continuously like participant work', async ({ page }) => {
  await page.setViewportSize({ width:375, height:812 });
  await page.goto('/');
  const rail = page.locator('#learn-container');
  await rail.scrollIntoViewIfNeeded();
  await expect(rail).toHaveClass(/owl-loaded/);
  const state = await rail.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    return { loop:owl.settings.loop, touchDrag:owl.settings.touchDrag, mouseDrag:owl.settings.mouseDrag, maximum:owl.maximum(true) };
  });
  expect(state).toMatchObject({loop:true,touchDrag:true,mouseDrag:true});
  await rail.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    owl.to(owl.maximum(true),0);
    owl.next(0);
  });
  await expect.poll(() => rail.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    return owl.relative(owl.current());
  })).toBe(0);
  await rail.evaluate(el => window.creatorAcademyJQuery(el).data('owl.carousel').prev(0));
  await expect.poll(() => rail.evaluate(el => {
    const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
    return owl.relative(owl.current());
  })).toBe(state.maximum);
});

test('about and learning carousels swipe forward from the last slide to the first', async ({ page }) => {
  await page.setViewportSize({ width:375, height:812 });
  await page.goto('/');
  for (const selector of ['.about__list', '#learn-container']) {
    const rail = page.locator(selector);
    await rail.scrollIntoViewIfNeeded();
    await rail.evaluate(el => {
      const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
      owl.to(owl.maximum(true), 0);
    });
    const bounds = await rail.locator('.owl-stage-outer').boundingBox();
    const x = bounds.x + bounds.width * .8;
    const y = bounds.y + bounds.height * .5;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * .2, y, { steps:12 });
    await page.mouse.up();
    await expect.poll(() => rail.evaluate(el => {
      const owl = window.creatorAcademyJQuery(el).data('owl.carousel');
      return owl.relative(owl.current());
    })).toBe(0);
  }
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
  await expect.poll(() => track.evaluate(el => { const owl=window.creatorAcademyJQuery(el).data('owl.carousel'); return owl.relative(owl.current()); })).toBe(1);
  await expect(page.locator('.about-slider-dots button').nth(1)).toHaveAttribute('aria-current','true');
  await track.locator('.owl-item.active .about__block--author .play-btn').click();
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

for (const width of [375, 1440, 2048]) {
  test(`new explanatory paragraphs match existing programme typography ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const styles = await page.evaluate(() => {
      const typography = el => {
        const s = getComputedStyle(el);
        return Object.fromEntries(['fontFamily','fontWeight','fontSize','lineHeight','letterSpacing','color','textTransform'].map(key => [key, s[key]]));
      };
      return {
        reference: typography(document.querySelector('.programme__description p')),
        paragraphs: [...document.querySelectorAll('.how__details p, .lesson-demos__description')].map(typography),
      };
    });
    expect(styles.paragraphs).toHaveLength(3);
    for (const style of styles.paragraphs) expect(style).toEqual(styles.reference);
  });
}

for (const width of [375, 768, 1440, 2048]) {
  test(`section heading spacing stays consistent ${width}`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const gaps = await page.evaluate(() => {
      const gap = (a,b) => document.querySelector(b).getBoundingClientRect().top - document.querySelector(a).getBoundingClientRect().bottom;
      const values = [gap('.lesson-demos__title','.lesson-demos__description'),gap('.kit__title','.kit__tools')];
      if (innerWidth < 768) values.push(gap('.how__title','.how__block'));
      return values;
    });
    for (const gap of gaps) expect(Math.abs(gap - gaps[0])).toBeLessThan(1);
    expect(gaps[0]).toBeGreaterThanOrEqual(20);
  });
}
