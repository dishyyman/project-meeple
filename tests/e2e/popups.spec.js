/* =====================================================================
   MEEPLE — the three popup shapes: sheet, alert, notice
   ---------------------------------------------------------------------
   Every short popup in the app is one of three shapes (dice.css §11a,
   docs/design-system.md §12.1), each borrowed from the phone conventions
   players already know:

     SHEET   pick one of several — rises from the bottom, rows, a Cancel
     ALERT   yes or no — centred, Cancel | the verb
     NOTICE  something happened — centred, one OK

   These pin the shape of each, by REAL clicks where it matters (a
   control under something else fails), plus the rules that came with
   them: every one has a visible way out, Escape is Cancel (never the
   verb), and the wording is general — no character-specific numbers,
   except on an effect tick, where the total is the decision.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter, addEffect, applyCalc } = require('./helpers/app');

const modal = (page) => appAttr(page, 'data-modal');

test('Rest is a sheet: icon rows, a Cancel, general wording, and a row commits', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await applyCalc(page, 'health', 'damage', 3);

  await press(page, '[data-action="rest"]');
  const sheet = page.locator('.modal--rest .action-sheet');
  await expect(sheet).toBeVisible();
  // It sits on the bottom edge of the app — that is what makes it a sheet.
  // Measured once it has finished rising (it animates up from below).
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const app = await page.locator('.app').boundingBox();
  const box = await sheet.boundingBox();
  expect(Math.round(box.y + box.height)).toBe(Math.round(app.y + app.height));

  // General words: nothing on it is a number about this character.
  expect(await sheet.innerText()).not.toMatch(/\d/);

  // Cancel is a real, reachable button and leaves everything as it was.
  const before = await page.locator('[data-bind="healthCur"]').first().textContent().catch(() => null);
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  expect(await modal(page)).toBe('closed');
  if (before !== null) await expect(page.locator('[data-bind="healthCur"]').first()).toHaveText(before);

  // Tapping a row IS the choice — no second step.
  await press(page, '[data-action="rest"]');
  await page.locator('.modal--rest').getByRole('button', { name: /Short Rest/ }).click();
  expect(await modal(page)).toBe('closed');
});

test('Advantage is a sheet that names the roll, with a Cancel', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const toHit = page.locator('[data-roll="tohit"]:visible').first();
  await toHit.focus();
  await page.keyboard.press('Shift+Enter');
  expect(await modal(page)).toBe('adv');

  const sheet = page.locator('.modal--adv .action-sheet');
  await expect(sheet.locator('.action-sheet__sub')).toHaveText(/^To-Hit/);
  await expect(sheet.locator('.action-sheet__row')).toHaveCount(4);
  await sheet.getByRole('button', { name: 'Cancel' }).click();
  expect(await modal(page)).toBe('closed');
});

test('Spend a Patch is an alert: Cancel | Spend, and Escape cancels', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await applyCalc(page, 'health', 'damage', 3);

  // A Patch opens on a HOLD; Shift+Enter is its keyboard twin.
  await page.locator('[data-patch="0"]').focus();
  await page.keyboard.press('Shift+Enter');
  expect(await modal(page)).toBe('patch');

  const alert = page.locator('.modal--patch .alert');
  await expect(alert.locator('.alert__icon')).toBeVisible();
  const buttons = alert.locator('.alert__actions button');
  await expect(buttons).toHaveText(['Cancel', 'Spend']);
  expect(await alert.innerText()).not.toMatch(/\d+ Patch/);   // no "2 Patches remaining"

  // The two buttons share one row, side by side.
  const [a, b] = [await buttons.nth(0).boundingBox(), await buttons.nth(1).boundingBox()];
  expect(Math.round(a.y)).toBe(Math.round(b.y));

  // Escape is Cancel, never the verb: still a Patch to spend afterwards.
  await page.keyboard.press('Escape');
  expect(await modal(page)).toBe('closed');
  await page.locator('[data-patch="0"]').focus();
  await page.keyboard.press('Shift+Enter');
  expect(await modal(page)).toBe('patch');
});

test('an effect tick is an alert that keeps its total, with the right icon', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  await addEffect(page, 'condition.bleed');
  await press(page, '[data-effect-tick="condition.bleed"]');
  expect(await modal(page)).toBe('tick');

  const alert = page.locator('.modal--tick .alert');
  await expect(alert.locator('[data-tick-confirm]')).toHaveText(/^Take \d+$/);
  await expect(alert.locator('.tick__icon--damage')).toBeVisible();
  await expect(alert.locator('.tick__icon--heal')).toBeHidden();
  await expect(alert.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('Downed is a notice: one plain OK, general wording', async ({ page }) => {
  await openApp(page);
  await openFirstCharacter(page);
  const last = await page.locator('[data-wound]').count();
  await press(page, `[data-wound="${last - 1}"]`);
  expect(await modal(page)).toBe('downed');

  const notice = page.locator('.modal--downed .alert');
  await expect(notice.locator('.alert__actions button')).toHaveText(['OK']);
  // Not the red "destructive" fill: acknowledging destroys nothing.
  await expect(notice.locator('.alert__actions .btn-save--danger')).toHaveCount(0);
  expect(await notice.innerText()).not.toMatch(/\d/);
  await notice.getByRole('button', { name: 'OK' }).click();
  expect(await modal(page)).toBe('closed');
});

test('every sheet and alert has a visible way out', async ({ page }) => {
  await openApp(page);
  const missing = await page.evaluate(() =>
    [...document.querySelectorAll('.modal')]
      .filter((m) => m.querySelector('.action-sheet, .alert'))
      .filter((m) => !m.querySelector('button[data-modal="close"]'))
      .map((m) => m.className));
  expect(missing).toEqual([]);
});
