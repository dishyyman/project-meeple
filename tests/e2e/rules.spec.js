/* =====================================================================
   MEEPLE — rules lookup (Flow 10)
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 10: from the sheet's Gear tab, open Rules from
   the menu, search, go back — and land where you were.

   Was a known bug (marked test.fail() until 2026-11-14): back from Rules
   landed on the Action tab. Rules now remembers where it was opened from —
   the sheet and its tab, Edit Character with its draft, or Settings — and
   its back button returns there (rememberRulesFrom() in main.js).
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

test('Flow 10 — look up a rule from the Gear tab, and come back to it', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '.tabbar__btn[data-tab="gear"]');
  expect(await appAttr(page, 'data-tab')).toBe('gear');

  // Open Rules the way a player does: the menu, then Rules in the drawer.
  await press(page, '[data-menu="open"]');
  await press(page, '[data-nav="rules"]');
  expect(await appAttr(page, 'data-view')).toBe('rules');

  // Results filter as you type: a real term gives a count of sections and
  // shows matching text; nonsense gives the empty note, not a blank list.
  const search = page.locator('[data-rules-search]');
  const count = page.locator('[data-bind="rulesCount"]');
  await search.fill('wound');
  await expect(count).toHaveText(/^\d+ sections?$/);
  await expect(page.locator('[data-list="rules"]')).toContainText(/wound/i);
  await search.fill('zzqqxx');
  await expect(page.locator('[data-list="rules"] .empty-note')).toContainText('Nothing in the guide matches');

  // Back — to the sheet, AND to the tab the player left.
  await press(page, '.screen--rules [data-nav="sheet"]');
  expect(await appAttr(page, 'data-view')).toBe('sheet');
  expect(await appAttr(page, 'data-tab')).toBe('gear');
});

test('Rules opened from Edit Character returns there, with the draft kept', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-menu="open"]');
  await press(page, '.drawer [data-nav="edit"]');
  expect(await appAttr(page, 'data-view')).toBe('edit');
  const name = page.locator('.screen--edit input').first();
  await name.fill('Elara the Bold');
  await press(page, '[data-menu="open"]');
  await press(page, '.drawer [data-nav="rules"]');
  const back = page.locator('.screen--rules [data-back]');
  await expect(back).toHaveAttribute('aria-label', 'Back to Edit Character');
  await press(page, '.screen--rules [data-back]');
  expect(await appAttr(page, 'data-view')).toBe('edit');
  await expect(name).toHaveValue('Elara the Bold');
});

test('Rules opened from Settings returns to Settings', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '[data-menu="open"]');
  await press(page, '.drawer [data-nav="settings"]');
  await press(page, '[data-menu="open"]');
  await press(page, '.drawer [data-nav="rules"]');
  await press(page, '.screen--rules [data-back]');
  expect(await appAttr(page, 'data-view')).toBe('settings');
});

/* The Player's Guide is the one long read in the app, and many readers are
   new to the game, so it is set at --fs-read rather than the sheet's 14px
   --fs-body (2026-11-20). Read back against the tokens, not a pixel number,
   so a deliberate change to either size never breaks this — only the Guide
   slipping back to the scanning size does. */
test('the Guide is set at the reading size, a step above the sheet\'s body text', async ({ page }) => {
  await openApp(page);
  await press(page, '[data-nav="rules"]');
  await page.locator('[data-rules-search]').fill('wound');
  const sizes = await page.evaluate(() => {
    const px = (v) => parseFloat(v);
    const root = getComputedStyle(document.documentElement);
    const size = (sel) => px(getComputedStyle(document.querySelector(sel)).fontSize);
    return {
      read: px(root.getPropertyValue('--fs-read')),
      body: px(root.getPropertyValue('--fs-body')),
      p: size('.rules__p'),
      h: document.querySelector('.rules__h') ? size('.rules__h') : null,
      table: document.querySelector('.rules__table') ? size('.rules__table') : null,
    };
  });
  expect(sizes.p).toBe(sizes.read);
  expect(sizes.read).toBeGreaterThan(sizes.body);
  if (sizes.h !== null) expect(sizes.h).toBe(sizes.read);
  if (sizes.table !== null) expect(sizes.table).toBe(sizes.body);
});
