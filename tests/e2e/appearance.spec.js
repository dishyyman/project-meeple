/* =====================================================================
   MEEPLE — Settings → Appearance (theme.js, tokens.css "THEMES")
   ---------------------------------------------------------------------
   What a player can see happen: the picker re-skins the app at once, the
   choice survives a reload, Auto follows the device, and a player who never
   opens Appearance gets the app exactly as it always was (Ember, dark).

   Colours are read back from computed tokens rather than from pixels, so a
   palette tweak in tokens.css never breaks these — only a broken switch
   does. Whether each palette is READABLE is tests/unit/themes.test.js (the
   contrast pairs) and a11y.spec.js (axe, every theme and mode).
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press } = require('./helpers/app');

const root = (page, attr) => page.evaluate((a) => document.documentElement.getAttribute(a), attr);
const token = (page, name) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('meeple:appearance')));

// Put a choice in storage before the app boots, as a returning player has it.
const choose = (page, pref) => page.addInitScript((p) => {
  if (!sessionStorage.getItem('meeple-test-appearance')) {
    sessionStorage.setItem('meeple-test-appearance', '1');
    localStorage.setItem('meeple:appearance', typeof p === 'string' ? p : JSON.stringify(p));
  }
}, pref);

test('a first run is Ember dark — the app as it shipped', async ({ page }) => {
  await openApp(page);
  expect(await root(page, 'data-theme')).toBe('ember');
  expect(await root(page, 'data-mode')).toBe('dark');
  expect(await token(page, '--bg-page')).toBe('#232323');
  // The default is not written until the player picks something.
  expect(await stored(page)).toBeNull();
});

test('picking a colour and a mode re-skins the app at once and survives a reload', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="settings"]');
  await press(page, '[data-ap-theme="moss"]');
  await press(page, '[data-ap-mode="light"]');

  expect(await root(page, 'data-theme')).toBe('moss');
  expect(await root(page, 'data-mode')).toBe('light');
  expect(await token(page, '--bg-page')).toBe('#f3f3f0');
  // The browser's own chrome follows the page.
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f3f3f0');
  // The picker shows exactly one of each as chosen.
  await expect(page.locator('[data-ap-theme][aria-pressed="true"]')).toHaveAttribute('data-ap-theme', 'moss');
  await expect(page.locator('[data-ap-mode][aria-pressed="true"]')).toHaveAttribute('data-ap-mode', 'light');
  expect(await stored(page)).toEqual({ theme: 'moss', mode: 'light' });

  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  expect(await root(page, 'data-theme')).toBe('moss');
  expect(await root(page, 'data-mode')).toBe('light');
  await press(page, '[data-nav="settings"]');
  await expect(page.locator('[data-ap-theme="moss"]')).toHaveAttribute('aria-pressed', 'true');
});

test('every colour chip carries its swatch, hidden from assistive tech', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="settings"]');
  const chips = page.locator('[data-ap-theme]');
  await expect(chips).toHaveCount(5);
  await expect(chips).toHaveText(['Ember', 'Field Journal', 'Moss', 'Dusk', 'Ink & Iron']);
  for (const id of ['ember', 'journal', 'moss', 'dusk', 'ink']) {
    await expect(page.locator(`[data-ap-theme="${id}"] .tag-pick__swatch--${id}[aria-hidden="true"]`)).toHaveCount(1);
  }
});

test('the stored theme is on <html> before the screens have even loaded', async ({ page }) => {
  await choose(page, { theme: 'dusk', mode: 'light' });
  // Recorded at DOMContentLoaded — long before boot.js has fetched a single
  // fragment — so a light theme can never open on a flash of the dark one.
  await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
    window.__atDomReady = [document.documentElement.dataset.theme, document.documentElement.dataset.mode];
  }));
  await openApp(page);
  expect(await page.evaluate(() => window.__atDomReady)).toEqual(['dusk', 'light']);
});

test.describe('Auto follows the device', () => {
  test('light device → light, and it switches live when the device does', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await choose(page, { theme: 'journal', mode: 'system' });
    await openApp(page);
    expect(await root(page, 'data-mode')).toBe('light');
    expect(await token(page, '--bg-page')).toBe('#f3e7cf');

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(() => root(page, 'data-mode')).toBe('dark');
    expect(await token(page, '--bg-page')).toBe('#211d18');
    // The picker still says Auto: the CHOICE did not change, only what it resolves to.
    await press(page, '[data-nav="settings"]');
    await expect(page.locator('[data-ap-mode="system"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a fixed mode ignores the device', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await choose(page, { theme: 'ember', mode: 'dark' });
    await openApp(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    expect(await root(page, 'data-mode')).toBe('dark');
  });
});

test('a damaged or out-of-date preference falls back to Ember dark', async ({ page }) => {
  await choose(page, '{"theme":"journal-classic","mode":"sepia"');   // not even valid JSON
  await openApp(page);
  expect(await root(page, 'data-theme')).toBe('ember');
  expect(await root(page, 'data-mode')).toBe('dark');
});

test('an unknown theme keeps a known mode', async ({ page }) => {
  await choose(page, { theme: 'neon', mode: 'light' });
  await openApp(page);
  expect(await root(page, 'data-theme')).toBe('ember');
  expect(await root(page, 'data-mode')).toBe('light');
});

test('the preference stays out of a backup — it belongs to this device', async ({ page }) => {
  await choose(page, { theme: 'ink', mode: 'light' });
  await openApp(page);
  await press(page, '[data-nav="settings"]');
  const [download] = await Promise.all([page.waitForEvent('download'), press(page, '[data-backup-export]')]);
  const text = require('fs').readFileSync(await download.path(), 'utf8');
  expect(text).not.toContain('meeple:appearance');
  expect(text).not.toContain('"ink"');
});
