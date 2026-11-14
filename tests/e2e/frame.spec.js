/* =====================================================================
   MEEPLE — frame mode on a desktop (frame.js, frame.css §3b)
   ---------------------------------------------------------------------
   The phone frame is a desktop preview. These run in the desktop projects
   (chrome, safari): the frame is the default there, the toggle works and
   is remembered, full mode fills the window without the page itself
   scrolling, and a window too narrow to hold the frame is treated like a
   phone. What an actual phone sees is phone.spec.js.

   Also here: the home-screen manifest and icons resolve, because a broken
   icon path fails silently — the phone just shows a screenshot instead.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp } = require('./helpers/app');

const frameOf = (page) => page.evaluate(() => ({
  mode: document.documentElement.getAttribute('data-frame'),
  locked: document.documentElement.hasAttribute('data-frame-locked'),
}));

test('the phone frame is the default, and the toggle switches it and is remembered', async ({ page }) => {
  await openApp(page);
  const toggle = page.locator('[data-frame-toggle]');
  expect(await frameOf(page)).toEqual({ mode: 'phone', locked: false });
  await expect(toggle).toBeVisible();

  await toggle.click();
  expect((await frameOf(page)).mode).toBe('full');
  await page.reload();
  expect((await frameOf(page)).mode).toBe('full');
  await expect(toggle).toHaveText(/phone/i);
});

test('full mode fills the window and the page itself never scrolls', async ({ page }) => {
  await openApp(page);
  await page.locator('[data-frame-toggle]').click();

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

test('a window narrower than the frame is treated as a phone, and widening gives the choice back', async ({ page }) => {
  await openApp(page);
  const toggle = page.locator('[data-frame-toggle]');
  expect((await frameOf(page)).mode).toBe('phone');

  await page.setViewportSize({ width: 400, height: 800 });
  await expect.poll(() => frameOf(page)).toEqual({ mode: 'full', locked: true });
  await expect(toggle).toBeHidden();
  // Locking is not choosing: the stored desktop preference is untouched.
  expect(await page.evaluate(() => localStorage.getItem('meeple:frame'))).toBeNull();

  await page.setViewportSize({ width: 460, height: 940 });
  await expect.poll(() => frameOf(page)).toEqual({ mode: 'phone', locked: false });
  await expect(toggle).toBeVisible();
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
