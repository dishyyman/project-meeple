/* =====================================================================
   MEEPLE — the device preview on a desktop (frame.js, frame.css §3)
   ---------------------------------------------------------------------
   The drawn device is a desktop preview, and the preview bar picks which
   one. These run in the desktop projects (chrome, safari): the iPhone is
   the default, a preset draws at its own size and is remembered, rotating
   swaps the sides, a device too big for the window is scaled to fit,
   "Fit window" fills the window without the page itself scrolling, and a
   window too narrow to hold a phone is treated like one. What an actual
   phone or tablet sees is phone.spec.js; what each size's LAYOUT does is
   layout.spec.js.

   Also here: the home-screen manifest and icons resolve, because a broken
   icon path fails silently — the phone just shows a screenshot instead.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp } = require('./helpers/app');

const shell = (page) => page.evaluate(() => {
  const r = document.documentElement;
  const d = document.querySelector('.device');
  return {
    mode: r.getAttribute('data-frame'),
    device: r.getAttribute('data-device'),
    locked: r.hasAttribute('data-frame-locked'),
    orient: r.getAttribute('data-orient'),
    // The size the layout inside sees — not the bounding box, which a
    // scaled-down device shrinks.
    w: d.offsetWidth, h: d.offsetHeight,
  };
});
const pick = (page, id) => page.locator('[data-preview-device]').selectOption(id);

test('the iPhone is the default preview, at the size the layout is tuned for', async ({ page }) => {
  await openApp(page);
  expect(await shell(page)).toEqual({ mode: 'device', device: 'iphone', locked: false, orient: 'portrait', w: 402, h: 874 });
  await expect(page.locator('[data-preview]')).toBeVisible();
  await expect(page.locator('[data-preview-device]')).toHaveValue('iphone');
});

test('a preset draws at its own size, is remembered, and rotates', async ({ page }) => {
  await openApp(page);
  await pick(page, 'duo-closed');
  expect(await shell(page)).toMatchObject({ mode: 'device', device: 'duo-closed', w: 466, h: 678, orient: 'portrait' });

  await page.locator('[data-preview-rotate]').click();
  expect(await shell(page)).toMatchObject({ device: 'duo-closed', w: 678, h: 466, orient: 'landscape' });

  await page.reload();
  expect(await shell(page)).toMatchObject({ device: 'duo-closed', w: 678, h: 466, orient: 'landscape' });
  await expect(page.locator('[data-preview-device]')).toHaveValue('duo-closed');

  // The open Duo is landscape to begin with; rotating it stands it on end.
  await pick(page, 'duo-open');
  await page.locator('[data-preview-rotate]').click();
  expect(await shell(page)).toMatchObject({ device: 'duo-open', orient: 'portrait' });
});

test('a device too big for the window is scaled to fit, and the page does not scroll', async ({ page }) => {
  await openApp(page);
  await pick(page, 'ipad-pro');
  const fit = await page.evaluate(() => {
    const box = document.querySelector('.device').getBoundingClientRect();
    const doc = document.scrollingElement;
    return {
      scale: Number(document.documentElement.style.getPropertyValue('--preview-scale')),
      layoutW: document.querySelector('.device').offsetWidth,
      right: box.right, bottom: box.bottom, innerWidth, innerHeight,
      overflowX: doc.scrollWidth - innerWidth, overflowY: doc.scrollHeight - innerHeight,
    };
  });
  // Still a 1032px iPad to the layout inside — only what is painted shrinks.
  expect(fit.layoutW).toBe(1032);
  expect(fit.scale).toBeGreaterThan(0);
  expect(fit.scale).toBeLessThan(1);
  expect(fit.right).toBeLessThanOrEqual(fit.innerWidth);
  expect(fit.bottom).toBeLessThanOrEqual(fit.innerHeight);
  expect(fit.overflowX).toBeLessThanOrEqual(0);
  expect(fit.overflowY).toBeLessThanOrEqual(0);
  // The readout says so (it is hidden in a window this narrow, but present).
  await expect(page.locator('[data-preview-size]')).toHaveText(/^1032 × 1376 · expanded · \d+%$/);
});

test('a free size starts as the device it came from and remembers where it was left', async ({ page }) => {
  await openApp(page);
  await pick(page, 'iphone-se');
  await pick(page, 'free');
  expect(await shell(page)).toMatchObject({ device: 'free', w: 375, h: 667 });
  expect(await page.locator('.device').evaluate((el) => getComputedStyle(el).resize)).toBe('both');

  // What the browser's own resize handle does: write the element's size.
  await page.locator('.device').evaluate((el) => { el.style.width = '640px'; el.style.height = '700px'; });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('meeple:preview')).free))
    .toEqual({ w: 640, h: 700 });
  await page.reload();
  expect(await shell(page)).toMatchObject({ device: 'free', w: 640, h: 700 });

  // Leaving it drops the size it was holding.
  await pick(page, 'iphone');
  expect(await shell(page)).toMatchObject({ device: 'iphone', w: 402, h: 874 });
});

test('Fit window fills the window and the page itself never scrolls', async ({ page }) => {
  await openApp(page);
  await pick(page, 'full');
  expect((await shell(page)).mode).toBe('full');
  await expect(page.locator('[data-preview-rotate]')).toBeDisabled();

  const fit = await page.evaluate(() => {
    const box = document.querySelector('.device').getBoundingClientRect();
    const doc = document.scrollingElement;
    return {
      top: box.top, height: box.height, innerHeight,
      overflowY: doc.scrollHeight - innerHeight,
      overflowX: doc.scrollWidth - innerWidth,
    };
  });
  // Before the fix the body's 32px frame padding sat above a 100dvh app,
  // so the page was taller than the window by 64px and scrolled.
  expect(fit.top).toBe(0);
  expect(fit.height).toBe(fit.innerHeight);
  expect(fit.overflowY).toBeLessThanOrEqual(0);
  expect(fit.overflowX).toBeLessThanOrEqual(0);
});

test('a desktop that chose full window with the old toggle keeps it', async ({ page }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('meeple:preview')) localStorage.setItem('meeple:frame', 'full'); });
  await openApp(page);
  expect((await shell(page)).mode).toBe('full');
  await expect(page.locator('[data-preview-device]')).toHaveValue('full');
});

test('a window narrower than a phone is treated as one, and widening gives the choice back', async ({ page }) => {
  await openApp(page);
  const bar = page.locator('[data-preview]');
  await pick(page, 'ipad-mini');
  const chosen = await page.evaluate(() => localStorage.getItem('meeple:preview'));

  await page.setViewportSize({ width: 400, height: 800 });
  await expect.poll(() => shell(page).then((s) => [s.mode, s.locked, s.device])).toEqual(['full', true, null]);
  await expect(bar).toBeHidden();
  // Locking is not choosing: the stored desktop preference is untouched.
  expect(await page.evaluate(() => localStorage.getItem('meeple:preview'))).toBe(chosen);

  await page.setViewportSize({ width: 460, height: 1000 });
  await expect.poll(() => shell(page).then((s) => [s.mode, s.locked, s.device])).toEqual(['device', false, 'ipad-mini']);
  await expect(bar).toBeVisible();
});

test('the home-screen manifest and every icon it names resolve', async ({ page, request }) => {
  await openApp(page);
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const res = await request.get(`/${manifestHref}`);
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe('standalone');

  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  for (const src of [touchIcon, favicon, ...manifest.icons.map((i) => i.src)]) {
    const icon = await request.get(`/${src}`);
    expect(icon.ok(), `${src} did not load`).toBe(true);
    expect(icon.headers()['content-type']).toContain('image/png');
  }
});

/* Found on a real iPhone (iOS 26), 2026-11-13: with black-translucent, the
   home-screen app's viewport came up ~60pt short and iOS painted nothing in
   the strip left at the bottom, covering the tab bar. No emulator shows it,
   so this guards the one line that caused it (index.html explains). */
test('the home-screen status bar is opaque, not black-translucent', async ({ page }) => {
  await openApp(page);
  const style = await page.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content');
  expect(style).toBe('black');
});
