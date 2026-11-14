/* =====================================================================
   MEEPLE — the app on an actual phone
   ---------------------------------------------------------------------
   Runs ONLY in the `iphone` project (playwright.config.js): WebKit at an
   iPhone 15's size, with touch and no hover. Before this file, every
   browser test ran on a 460px desktop window showing the drawn phone, so
   nothing checked what a phone itself got — which was that drawn phone,
   430px wide, inside the real one.

   What it pins down:
     · the app fills the screen and there is no toggle to undo that;
     · the page itself never scrolls, on any screen — only the screens
       inside the app do (an outer scroller is what let iOS rubber-band
       the whole app off the top);
     · the tab bar is entirely on screen;
     · no text field is under 16px, the size below which iOS zooms the
       page in on focus and leaves it zoomed.

   What it cannot: emulation draws no notch or home indicator, so
   env(safe-area-inset-*) reads 0 here. The spacing under the clock and
   above the home bar is a real-device check (testing.md §9).
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

// The page — not the app's own scroll containers — fits the screen exactly.
const pageOverflow = (page) => page.evaluate(() => {
  const doc = document.scrollingElement;
  return { x: doc.scrollWidth - innerWidth, y: doc.scrollHeight - innerHeight };
});

test('the app fills the screen, with no frame and no toggle', async ({ page }) => {
  await openApp(page);
  const root = await page.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-frame'),
    locked: document.documentElement.hasAttribute('data-frame-locked'),
  }));
  expect(root).toEqual({ mode: 'full', locked: true });
  await expect(page.locator('[data-frame-toggle]')).toBeHidden();
  await expect(page.locator('.device__notch')).toBeHidden();
  await expect(page.locator('.device__statusbar')).toBeHidden();

  const viewport = page.viewportSize();
  const box = await page.locator('.device').boundingBox();
  expect(box).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
});

test('a phone-frame choice stored on this device is ignored, and left as it was', async ({ page }) => {
  // e.g. chosen on a desktop sharing the same storage, or before this fix.
  await page.addInitScript(() => localStorage.setItem('meeple:frame', 'phone'));
  await openApp(page);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-frame'))).toBe('full');
  expect(await page.evaluate(() => localStorage.getItem('meeple:frame'))).toBe('phone');
});

test('the page itself never scrolls, on any screen', async ({ page }) => {
  await openApp(page);
  const check = async (where) => {
    const o = await pageOverflow(page);
    expect(o.x, `${where}: wider than the screen`).toBeLessThanOrEqual(0);
    expect(o.y, `${where}: taller than the screen`).toBeLessThanOrEqual(0);
  };
  await check('home');

  await openFirstCharacter(page);
  // Notes has no tab-bar button; it opens from the menu drawer.
  for (const [tab, opener] of [['action', '.tabbar__btn'], ['character', '.tabbar__btn'],
    ['gear', '.tabbar__btn'], ['notes', '.drawer-btn']]) {
    await press(page, `${opener}[data-tab="${tab}"]`);
    expect(await appAttr(page, 'data-tab')).toBe(tab);
    await check(`sheet / ${tab}`);
  }
  for (const view of ['edit', 'rules', 'settings', 'characters']) {
    await press(page, `[data-nav="${view}"]`);
    expect(await appAttr(page, 'data-view')).toBe(view);
    await check(view);
  }
});

test('the tab bar is entirely on screen', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const tabbar = await page.locator('.tabbar').boundingBox();
  const { width, height } = page.viewportSize();
  expect(tabbar.y).toBeGreaterThan(0);
  expect(tabbar.y + tabbar.height).toBeLessThanOrEqual(height);
  expect(tabbar.x).toBeGreaterThanOrEqual(0);
  expect(tabbar.x + tabbar.width).toBeLessThanOrEqual(width);
});

test('no text field is under 16px, so iOS never zooms the page on focus', async ({ page }) => {
  await openApp(page);
  // Every screen and modal is in the DOM from boot (boot.js), so one pass
  // covers fields on screens that are not showing. Computed style is read
  // whether or not the field is displayed.
  const small = await page.$$eval(
    'input:not([type="file"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), textarea, select',
    (fields) => fields
      .map((f) => ({ field: f.className || f.name || f.type, px: parseFloat(getComputedStyle(f).fontSize) }))
      .filter((f) => f.px < 16));
  expect(small).toEqual([]);
});

// A TAP, not a click: the empty hero's uploader once sat under the hero's
// gradient scrim, so a finger landed on the scrim and nothing happened.
// locator.tap() refuses a covered target, so this fails if anything is
// stacked over the button again (see also portrait.spec.js).
test('"Add a Portrait" on the sheet takes a tap and opens the photo picker', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /Add a Portrait/ }).tap(),
  ]);
  expect(chooser.isMultiple()).toBe(false);
});
