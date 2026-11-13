/* =====================================================================
   MEEPLE — keyboard: every control a player can press, pressed by key
   ---------------------------------------------------------------------
   The Codex review found controls that announce themselves as buttons
   (role="button", focusable) but only answered a click, and three
   press-and-hold gestures with no keyboard path at all. These drive the
   real keyboard — page.keyboard, never the press() helper, whose
   element.click() is exactly the shortcut that hid the gap.

   Navigation to the screen under test still uses press(): what is being
   tested is the control's own key handling, not how the player got there.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

const modal = (page) => appAttr(page, 'data-modal');

/* Safari on a Mac moves focus between BUTTONS with Option+Tab; plain Tab
   only visits form fields unless the player has turned on "Press Tab to
   highlight each item". WebKit under Playwright behaves the same, so this is
   what a real Safari keyboard user presses, not a test workaround. */
const nextKey = (browserName) => (browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return el ? el.outerHTML.slice(0, 80) : null;
});

test('every custom button on the sheet answers Enter and Space', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);

  // Collected per tab, because a tab that is not showing is display:none and
  // nothing in it can take focus. Each is pressed with each key, and whatever
  // it opened is closed again before the next.
  let checked = 0;
  for (const tab of ['action', 'character', 'gear']) {
    await press(page, `[data-tab="${tab}"]`);
    const count = await page.locator('.screen--sheet [role="button"]:not(button):visible').count();
    for (let i = 0; i < count; i++) {
      for (const key of ['Enter', ' ']) {
        const el = page.locator('.screen--sheet [role="button"]:not(button):visible').nth(i);
        await el.focus();
        await page.keyboard.press(key);
        await expect.poll(() => modal(page), `${tab} #${i} with ${JSON.stringify(key)}`).not.toBe('closed');
        await page.evaluate(() => document.querySelector('.app').setAttribute('data-modal', 'closed'));
        checked++;
      }
    }
  }
  // The sheet has roll boxes on Action and gear rows on Gear; an empty sweep
  // would pass vacuously.
  expect(checked).toBeGreaterThan(4);
});

test('Space presses a roll box without scrolling the sheet', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const box = page.locator('[data-roll="damage"]:visible').first();
  await box.scrollIntoViewIfNeeded();
  const scroller = () => page.evaluate(() => document.querySelector('.sheet__scroll').scrollTop);
  const before = await scroller();
  await box.focus();
  await page.keyboard.press(' ');
  await expect.poll(() => modal(page)).toBe('roll');
  expect(await scroller()).toBe(before);
});

test('Advantage without a pointer: Shift+Enter opens the chooser, focus lands in it, Enter rolls', async ({ page, browserName }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const toHit = page.locator('[data-roll="tohit"]:visible').first();
  await expect(toHit).toHaveAttribute('aria-keyshortcuts', 'Shift+Enter');

  await toHit.focus();
  await page.keyboard.press('Shift+Enter');
  await expect.poll(() => modal(page)).toBe('adv');
  expect(await focused(page)).toContain('data-adv="2"');          // the first row

  await page.keyboard.press(nextKey(browserName));                // → "Advantage" (2d20)
  expect(await focused(page)).toContain('data-adv="1"');
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('roll');
  await expect(page.locator('[data-bind="outAdv"]')).toContainText('Advantage');

  // And a plain Enter on the same box is still a plain roll.
  await page.keyboard.press('Escape');
  await toHit.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => modal(page)).toBe('roll');
  await expect(page.locator('[data-bind="outAdv"]')).toHaveText('');
});

test('Wound pips are reachable and pressable by keyboard', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const second = page.locator('[data-wound="1"]');
  await expect(second).toHaveAttribute('aria-label', /Set Wounds to 2/);
  await second.focus();
  await page.keyboard.press('Enter');                             // Elara: 1 Wound → 2
  await expect(page.locator('[data-wound].is-on')).toHaveCount(2);
});

test('Patch: Shift+Enter spends one the way a hold does; a plain Enter only moves the count', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  // Elara has 2 Patches. A plain Enter on the third box is a TAP: it sets
  // the count to 3 and opens nothing.
  await page.locator('[data-patch="2"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-patch].is-on')).toHaveCount(3);
  expect(await modal(page)).toBe('closed');

  // Shift+Enter is the HOLD: the spend dialog, and the count left alone.
  await page.locator('[data-patch="0"]').focus();
  await page.keyboard.press('Shift+Enter');
  await expect.poll(() => modal(page)).toBe('patch');
  await expect(page.locator('[data-patch].is-on')).toHaveCount(3);
});

test('dice roller: Shift+Enter on the delete key clears the expression', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await press(page, '.hero__btn-dice');
  await expect.poll(() => modal(page)).toBe('dice');
  await press(page, '[data-key="1"]');
  await press(page, '[data-key="d"]');
  await press(page, '[data-key="6"]');
  const expr = page.locator('[data-dice-expr]');
  await expect(expr).not.toHaveText('');

  await page.locator('[data-dice-back]').focus();
  await page.keyboard.press('Shift+Enter');
  await expect(expr).toHaveText('');
});
