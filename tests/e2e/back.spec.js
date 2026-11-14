/* =====================================================================
   MEEPLE — going back: the swipe, and the phone's own back
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 20. Every screen but Home has a back button
   marked data-back, and "back" is whatever it does. These pin the other
   ways of saying it (main.js, BACK):
     · HISTORY — the browser's Back, Android's back gesture and button,
       iPhone Safari's edge swipe all arrive as popstate: a popup or the
       drawer closes first, then the screen's back button is pressed;
     · the SWIPE — in from the left edge, only on an iPhone home-screen
       install (navigator.standalone). It follows the finger with the
       screen underneath showing, commits past a third of the width or on
       a flick, springs back otherwise, stays out of the way of popups,
       and under Reduce Motion simply goes back.
   The swipe tests drive real touch events through Chrome's DevTools
   protocol, so they run in Chrome only.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

const view = (page) => appAttr(page, 'data-view');

test.describe('the phone\'s own back (history)', () => {
  test('back walks out of a screen, and from Home there is nothing left to spend', async ({ page }) => {
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    expect(await view(page)).toBe('characters');
    await page.goBack();
    await expect.poll(() => view(page)).toBe('home');
    // A screen's own button home spends the guard too, so the next back
    // from Home leaves the app instead of doing nothing once.
    await press(page, '[data-nav="settings"]');
    await press(page, '.screen--settings [data-back]');
    await expect.poll(() => page.evaluate(() => history.state)).toBeNull();
  });

  test('back from Rules returns to the sheet and the tab it was opened from', async ({ page }) => {
    await openApp(page);
    await openFirstCharacter(page);
    await press(page, '.tabbar__btn[data-tab="gear"]');
    await press(page, '[data-menu="open"]');
    await press(page, '.drawer [data-nav="rules"]');
    expect(await view(page)).toBe('rules');
    await page.goBack();
    await expect.poll(() => view(page)).toBe('sheet');
    expect(await appAttr(page, 'data-tab')).toBe('gear');
    await page.goBack();
    await expect.poll(() => view(page)).toBe('home');
  });

  test('a popup or the drawer closes first, and the screen stays', async ({ page }) => {
    await openApp(page);
    await press(page, '[data-nav="campaigns"]');
    await press(page, '[data-campaign-new]');
    expect(await appAttr(page, 'data-modal')).toBe('campaign-form');
    await page.goBack();
    await expect.poll(() => appAttr(page, 'data-modal')).toBe('closed');
    expect(await view(page)).toBe('campaigns');

    await openFirstCharacter(page);
    await press(page, '[data-menu="open"]');
    await page.goBack();
    await expect.poll(() => appAttr(page, 'data-menu')).toBe('closed');
    expect(await view(page)).toBe('sheet');
    await page.goBack();
    await expect.poll(() => view(page)).toBe('home');
  });

  test('inside creation, back is the wizard\'s Back: a step, then out', async ({ page }) => {
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    await press(page, '[data-action="create-character"]');
    expect(await view(page)).toBe('create');
    await page.goBack();
    await expect.poll(() => view(page)).toBe('characters');
  });
});

test.describe('the swipe (iPhone home-screen install)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch events driven through Chrome DevTools');
  test.use({ hasTouch: true });

  let cdp;
  // A home-screen install is what turns the swipe on; Safari and Android
  // have their own back gesture, which reaches the app through history.
  const asInstalled = (page) => page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
  });

  // A finger from `from` px in from the app's left edge to `to`, in `steps`.
  // `hold` stops before lifting, to look at the screen mid-swipe.
  async function swipe(page, { from = 6, to = 300, steps = 12, y = 420, hold = false } = {}) {
    const box = await page.locator('.app').boundingBox();
    const at = (x) => [{ x: box.x + x, y: box.y + y }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(from) });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(from + ((to - from) * i) / steps) });
    }
    if (!hold) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  const lift = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  test.beforeEach(async ({ page }) => {
    cdp = await page.context().newCDPSession(page);
  });

  test('a swipe from the edge follows the finger over the screen beneath, and goes back', async ({ page }) => {
    await asInstalled(page);
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    await swipe(page, { to: 200, hold: true });
    expect(await appAttr(page, 'data-swipe')).toBe('drag');
    await expect(page.locator('.screen--characters')).toHaveAttribute('data-swiping', 'top');
    await expect(page.locator('.screen--home')).toHaveAttribute('data-swiping', 'under');
    await expect(page.locator('.screen--home')).toBeVisible();
    await lift();
    await expect.poll(() => view(page)).toBe('home');
    await expect(page.locator('.screen[data-swiping]')).toHaveCount(0);
    expect(await page.evaluate(() => document.querySelector('.app').style.getPropertyValue('--swipe-x'))).toBe('');
  });

  test('a short swipe springs back; one that starts away from the edge, or goes up, is no swipe', async ({ page }) => {
    await asInstalled(page);
    await openApp(page);
    await press(page, '[data-nav="settings"]');
    await swipe(page, { to: 26, steps: 4 });                     // too short, too slow to flick
    await expect(page.locator('.screen[data-swiping]')).toHaveCount(0, { timeout: 2000 });
    expect(await view(page)).toBe('settings');
    await swipe(page, { from: 120, to: 380 });                   // not from the edge
    expect(await appAttr(page, 'data-swipe')).toBeNull();
    expect(await view(page)).toBe('settings');
    // Mostly vertical from the edge: a scroll, not a back.
    const box = await page.locator('.app').boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 6, y: box.y + 500 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 12, y: box.y + 380 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + 60, y: box.y + 300 }] });
    await lift();
    expect(await view(page)).toBe('settings');
  });

  test('a swipe does what the back button does: Rules to its tab, a campaign to the list', async ({ page }) => {
    await asInstalled(page);
    await openApp(page);
    await openFirstCharacter(page);
    await press(page, '.tabbar__btn[data-tab="gear"]');
    await press(page, '[data-menu="open"]');
    await press(page, '.drawer [data-nav="rules"]');
    await swipe(page);
    await expect.poll(() => view(page)).toBe('sheet');
    expect(await appAttr(page, 'data-tab')).toBe('gear');

    await press(page, '[data-nav="campaigns"]');
    await press(page, '[data-campaign-new]');
    await page.fill('[data-campaign-name]', 'The Ashen Road');
    await press(page, '[data-campaign-save]');
    expect(await view(page)).toBe('campaign');
    await swipe(page);
    await expect.poll(() => view(page)).toBe('campaigns');
  });

  test('never over a popup or the drawer, never from Home', async ({ page }) => {
    await asInstalled(page);
    await openApp(page);
    await swipe(page);
    expect(await appAttr(page, 'data-swipe')).toBeNull();
    expect(await view(page)).toBe('home');

    await press(page, '[data-nav="campaigns"]');
    await press(page, '[data-campaign-new]');
    await swipe(page);
    expect(await appAttr(page, 'data-swipe')).toBeNull();
    expect(await appAttr(page, 'data-modal')).toBe('campaign-form');
    expect(await view(page)).toBe('campaigns');
  });

  test('only on a home-screen install: in a browser tab the phone\'s own gesture does it', async ({ page }) => {
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    await swipe(page);
    expect(await appAttr(page, 'data-swipe')).toBeNull();
    expect(await view(page)).toBe('characters');
  });

  test('Reduce Motion: nothing slides, a swipe far enough just goes back', async ({ page }) => {
    await asInstalled(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    await press(page, '[data-nav="characters"]');
    await swipe(page, { to: 200, hold: true });
    await expect(page.locator('.screen--home')).toBeHidden();      // nothing drawn underneath
    await lift();
    expect(await view(page)).toBe('home');                          // at once, no settle
  });
});
