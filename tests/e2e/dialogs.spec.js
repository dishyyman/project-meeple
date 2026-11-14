/* =====================================================================
   MEEPLE — modals behave as dialogs
   ---------------------------------------------------------------------
   The Codex review found the modals had no dialog semantics and no focus
   handling: focus stayed on the page behind, Tab wandered out to it, and
   closing left focus nowhere in particular. Every modal card is now a named
   role="dialog", and watchModals() in main.js moves focus in, keeps it in,
   and gives it back. These drive that with real keys.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

const modal = (page) => appAttr(page, 'data-modal');
// Option+Tab is what moves between buttons in Safari — see keyboard.spec.js.
const tabKey = (browserName, shift = false) =>
  `${shift ? 'Shift+' : ''}${browserName === 'webkit' ? 'Alt+' : ''}Tab`;

// Where focus is, described well enough to assert on.
const focusInfo = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return {
    role: el.getAttribute('role'),
    inModal: el.closest('.modal')?.className.match(/modal--([a-z-]+)/)?.[1] || null,
    html: el.outerHTML.slice(0, 80),
  };
});

test('every modal card is a dialog with aria-modal and a name', async ({ page }) => {
  await openApp(page);
  const report = await page.evaluate(() => [...document.querySelectorAll('.app > .modal')].map((m) => {
    const name = m.className.match(/modal--([a-z-]+)/)[1];
    const dialogs = m.querySelectorAll('[role="dialog"]');
    const d = dialogs[0];
    const labelledBy = d?.getAttribute('aria-labelledby');
    return {
      name,
      count: dialogs.length,
      modal: d?.getAttribute('aria-modal'),
      focusable: d?.getAttribute('tabindex'),
      // A name either spoken directly, or taken from an element that exists.
      named: !!(d?.getAttribute('aria-label') || (labelledBy && document.getElementById(labelledBy))),
    };
  }));
  expect(report.length).toBeGreaterThan(20);
  for (const r of report) expect(r, r.name).toMatchObject({ count: 1, modal: 'true', focusable: '-1', named: true });
});

test('a destructive confirmation: focus moves in, stays in, and comes back', async ({ page, browserName }) => {
  await openApp(page);
  await press(page, '[data-nav="characters"]');
  await press(page, '[data-roster-edit]');

  const del = page.locator('[data-char-del]').first();
  await del.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('char-del');
  await expect(page.getByRole('dialog', { name: 'Delete character?' })).toBeVisible();

  // Focus is on the dialog itself — NOT on Delete, so a second Enter is safe.
  expect(await focusInfo(page)).toMatchObject({ role: 'dialog', inModal: 'char-del' });
  // The page behind is out of reach.
  expect(await del.evaluate((el) => !!el.closest('[inert]'))).toBe(true);

  // Tab and Shift+Tab never leave the dialog, however many times.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(tabKey(browserName));
    expect((await focusInfo(page)).inModal, `Tab #${i + 1}`).toBe('char-del');
  }
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(tabKey(browserName, true));
    expect((await focusInfo(page)).inModal, `Shift+Tab #${i + 1}`).toBe('char-del');
  }

  // Escape is Cancel on an alert (dice.css §11a) — never the verb. The
  // character is still there, and focus goes back to the Delete control.
  await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
  expect(await del.evaluate((el) => !el.closest('[inert]'))).toBe(true);
  await expect(del).toBeFocused();
  expect(await page.locator('[data-char-del]').count()).toBeGreaterThan(0);

  // Cancel from the keyboard does the same.
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('char-del');
  await page.locator('.modal--char-del').getByRole('button', { name: 'Cancel' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('closed');
  await expect(del).toBeFocused();
});

test('an opener that focuses a field keeps it: the calculator starts in its input', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const bar = page.locator('[data-calc="health"]').first();
  await bar.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('calc');
  await expect(page.locator('[data-calc-input]')).toBeFocused();
});

test('Escape closes scrim-only modals and every sheet, and focus returns', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);

  // The calculator: opened from the health bar.
  const bar = page.locator('[data-calc="health"]').first();
  await bar.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('calc');
  await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
  await expect(bar).toBeFocused();

  // A roll result: opened from a roll box.
  const box = page.locator('[data-roll="damage"]:visible').first();
  await box.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('roll');
  await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
  await expect(box).toBeFocused();

  // The Advantage chooser: opened with Shift+Enter, left without choosing.
  const toHit = page.locator('[data-roll="tohit"]:visible').first();
  await toHit.focus();
  await page.keyboard.press('Shift+Enter');
  await expect.poll(() => modal(page)).toBe('adv');
  await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
  await expect(toHit).toBeFocused();

  // The Rest sheet. It has a Cancel now, but it is a sheet, and Escape is
  // Cancel on every sheet and alert (see the Escape rule in main.js).
  await press(page, '[data-menu="open"]');
  await press(page, '[data-action="rest"]');
  await expect.poll(() => modal(page)).toBe('rest');
  await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
});

test('focus finds its way back even when the opener was re-rendered', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  // Pressing the last Wound pip downs Elara. The pips are re-rendered on the
  // press, so the element that opened "You are downed!" is gone by the time
  // it closes — focus goes to its replacement.
  const last = await page.locator('[data-wound]').count();
  await page.locator(`[data-wound="${last - 1}"]`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('downed');

  await page.locator('.modal--downed').getByRole('button', { name: 'OK' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('closed');
  await expect(page.locator(`[data-wound="${last - 1}"]`)).toBeFocused();
});

/* Round-2 review, finding 7. Only .app's children were made inert, and the
   FULL/PHONE frame toggle lives outside .app (index.html, frame.js) — so it
   could be tabbed to or tapped while a dialog was open, changing the whole
   shell behind it. Everything outside the open modal is inert now. */
test('the shell outside the app is out of reach while a modal is open, and back after', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const toggle = page.locator('[data-frame-toggle]');
  const frame = () => page.evaluate(() => document.documentElement.getAttribute('data-frame'));
  const before = await frame();

  await press(page, '[data-menu="open"]');
  await press(page, '[data-action="rest"]');
  await expect.poll(() => modal(page)).toBe('rest');
  expect(await toggle.evaluate((el) => el.inert)).toBe(true);

  // Not focusable…
  await toggle.focus();
  await expect(toggle).not.toBeFocused();
  // …and a tap where it sits does not reach it. (Whatever is under that
  // point may take the tap instead — the assertion is only about the shell.)
  const box = await toggle.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await frame()).toBe(before);

  // Closed: given back, and it works.
  if ((await modal(page)) !== 'closed') await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
  expect(await toggle.evaluate((el) => el.inert)).toBe(false);
  await toggle.click();
  expect(await frame()).not.toBe(before);
});

test('a modal handing over to another keeps the shell inert throughout', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const toggleInert = () => page.locator('[data-frame-toggle]').evaluate((el) => el.inert);
  // Advantage hands over to the roll result: two modals, no gap between.
  await page.locator('[data-roll="tohit"]:visible').first().focus();
  await page.keyboard.press('Shift+Enter');
  await expect.poll(() => modal(page)).toBe('adv');
  expect(await toggleInert()).toBe(true);
  await press(page, '[data-adv]');
  await expect.poll(() => modal(page)).toBe('roll');
  expect(await toggleInert()).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => modal(page)).toBe('closed');
  expect(await toggleInert()).toBe(false);
});
