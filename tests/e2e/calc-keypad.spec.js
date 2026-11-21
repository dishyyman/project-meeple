/* =====================================================================
   MEEPLE — the heal / damage calculator's keypad
   ---------------------------------------------------------------------
   Tapping Health used to raise the phone's own keyboard over the bar being
   changed. The calculator now carries the app's keypad (pages/modals/
   dice.html; main.js "THE CALCULATOR'S KEYPAD"), and these drive it the way
   a player would: by tapping keys.

   The flow, as decided with the designer:
     · numbers and sums apply directly — 12 → Damage, 6+4 → Heal;
     · dice must be ROLLED before Heal / Damage will take them, so no number
       reaches a bar unseen.

   Tried first on Health, then given to Mana and the Game Master's heroes
   and enemies (2026-11-20): Mana is checked at the bottom, and the GM side
   taps these same keys in party.spec.js.

   What no browser test can prove is that a real phone keeps its keyboard
   down: that is inputmode="none", asserted here as an attribute, and
   checked by hand on a device.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr, openFirstCharacter } = require('./helpers/app');

const health = (page) => page.locator('[data-bind="healthCur"]').first().textContent().then(Number);
const field = (page) => page.locator('[data-calc-input]');
const out = (page) => page.locator('[data-calc-out]');
const keys = async (page, ...ks) => { for (const k of ks) await press(page, `[data-calc-key="${k}"]`); };

// Waits for the sheet to finish rising, too. A pointer that lands on a sheet
// still in motion CATCHES it (main.js "SHEETS — drag to dismiss"), and the
// taps just after that are swallowed — right for a finger, noise for a test.
async function openHealth(page) {
  await openFirstCharacter(page);
  await press(page, '[data-calc="health"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('calc');
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('.modal--calc .modal__card').getAnimations().length)).toBe(0);
}
const healthMax = (page) => page.locator('[data-bind="healthMax"]').first().textContent().then(Number);

// Take some health off first, so a heal has room to show.
async function hurt(page, n) {
  await keys(page, ...String(n).split(''));
  await press(page, '[data-calc-apply="damage"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('closed');
  await press(page, '[data-calc="health"]');
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('.modal--calc .modal__card').getAnimations().length)).toBe(0);
}

test.beforeEach(async ({ page }) => { await openApp(page); });

test('Health opens the keypad, and the field raises no device keyboard', async ({ page }) => {
  await openHealth(page);
  await expect(page.locator('.modal--calc .calc-pad')).toBeVisible();
  await expect(field(page)).toHaveAttribute('inputmode', 'none');
  await expect(field(page)).toHaveAttribute('type', 'text');
  await expect(field(page)).toHaveValue('');
  // Nothing to roll yet, so Roll is not lit; nothing waits on a roll, so
  // Heal and Damage are.
  await expect(page.locator('[data-calc-roll]')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('[data-calc-apply="damage"]')).toHaveAttribute('aria-disabled', 'false');
});

test('a number typed on the keypad applies directly', async ({ page }) => {
  await openHealth(page);
  const before = await health(page);
  // Two digits, then delete one: the sample character has 10 Health, and 12
  // would take a Wound rather than test the keypad.
  await keys(page, '1', '2');
  await expect(field(page)).toHaveValue('12');
  await press(page, '[data-calc-back]');
  await keys(page, '3');
  await expect(field(page)).toHaveValue('13');
  await press(page, '[data-calc-back]');
  await press(page, '[data-calc-back]');
  await keys(page, '3');
  // A plain number is its own answer — no "= 3" under it.
  await expect(out(page)).toHaveText('');
  await press(page, '[data-calc-apply="damage"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('closed');
  expect(await health(page)).toBe(before - 3);
});

test('a sum shows what it comes to, and Heal takes the total', async ({ page }) => {
  await openHealth(page);
  const full = await health(page);
  await hurt(page, 6);
  await keys(page, '2', '+', '3', '−', '1');
  await expect(field(page)).toHaveValue('2+3−1');
  await expect(out(page)).toHaveText('= 4');
  await press(page, '[data-calc-apply="heal"]');
  await expect.poll(() => health(page)).toBe(full - 2);
});

test('dice must be rolled before Heal will take them', async ({ page }) => {
  await openHealth(page);
  const full = await health(page);
  const max = await healthMax(page);
  await hurt(page, 6);
  await keys(page, 'd4', 'd4', '+', '1');
  // insertDieKey(), shared with the roller: the second d4 is one more die.
  await expect(field(page)).toHaveValue('2d4+1');
  await expect(out(page)).toHaveText('Roll to get the total');
  const heal = page.locator('[data-calc-apply="heal"]');
  await expect(heal).toHaveAttribute('aria-disabled', 'true');
  // Pressing it anyway does nothing: the dialog stays, health is unchanged.
  await press(page, '[data-calc-apply="heal"]');
  expect(await appAttr(page, 'data-modal')).toBe('calc');
  expect(await health(page)).toBe(full - 6);

  await press(page, '[data-calc-roll]');
  await expect(heal).toHaveAttribute('aria-disabled', 'false');
  const total = Number(await page.locator('.calc-out__total').textContent());
  expect(total).toBeGreaterThanOrEqual(3);
  expect(total).toBeLessThanOrEqual(9);
  // Written out term by term, the +1 included: "2d4 (3 + 1) + 1 = 5". (The
  // + between faces is spaced by CSS, .die-op, so the text has none.)
  await expect(out(page)).toHaveText(/^2d4 \(\d\s*\+\s*\d\) \+ 1 = \d$/);
  await press(page, '[data-calc-apply="heal"]');
  await expect.poll(() => health(page)).toBe(Math.min(max, full - 6 + total));
});

test('editing after a roll drops it; Roll again rerolls in the open', async ({ page }) => {
  await openHealth(page);
  await keys(page, 'd8');
  await press(page, '[data-calc-roll]');
  await expect(page.locator('[data-calc-apply="damage"]')).toHaveAttribute('aria-disabled', 'false');
  await keys(page, '+', '2');
  await expect(field(page)).toHaveValue('d8+2');
  await expect(out(page)).toHaveText('Roll to get the total');
  await expect(page.locator('[data-calc-apply="damage"]')).toHaveAttribute('aria-disabled', 'true');
});

test('a subtracted die is written out in its place, and the total agrees', async ({ page }) => {
  await openHealth(page);
  await keys(page, '1', '0', '−', 'd4');
  await press(page, '[data-calc-roll]');
  await expect(page.locator('[data-calc-apply="damage"]')).toHaveAttribute('aria-disabled', 'false');
  const text = await out(page).textContent();
  const [, face, total] = text.match(/^10 − 1d4 \((\d)\) = (\d+)$/);
  expect(Number(total)).toBe(10 - Number(face));
});

test('delete removes a whole die; holding it clears the field', async ({ page }) => {
  await openHealth(page);
  await keys(page, '2', 'd20');
  await expect(field(page)).toHaveValue('2d20');
  await press(page, '[data-calc-back]');
  await expect(field(page)).toHaveValue('2');
  await keys(page, '+', '5');
  const back = page.locator('[data-calc-back]');
  const box = await back.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(field(page)).toHaveValue('');
  await page.mouse.up();
  // The release's click must not also backspace (it would be a no-op on an
  // empty field, so type again to prove the next tap is a tap).
  await keys(page, '7');
  await expect(field(page)).toHaveValue('7');
});

test('a desktop keyboard still types into the field, and Enter rolls then heals', async ({ page }) => {
  await openHealth(page);
  const full = await health(page);
  await hurt(page, 6);
  await expect(field(page)).toBeFocused();
  await page.keyboard.type('d4-x');
  // Read back as keypad tokens: the ASCII minus becomes the keypad's −, and
  // a letter the grammar has no use for is dropped.
  await expect(field(page)).toHaveValue('d4−');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('+1');
  await page.keyboard.press('Enter');          // dice unrolled: Enter rolls
  expect(await appAttr(page, 'data-modal')).toBe('calc');
  await expect(page.locator('[data-calc-apply="heal"]')).toHaveAttribute('aria-disabled', 'false');
  const total = Number(await page.locator('.calc-out__total').textContent());
  await field(page).focus();
  await page.keyboard.press('Enter');          // rolled: Enter heals by it
  await expect.poll(() => health(page)).toBe(full - 6 + total);
});

test('an expression that cannot be read says so on Damage, and applies nothing', async ({ page }) => {
  await openHealth(page);
  const before = await health(page);
  await keys(page, '6', '+');
  await press(page, '[data-calc-apply="damage"]');
  await expect(out(page).locator('.status--error')).toHaveText('incomplete roll');
  expect(await appAttr(page, 'data-modal')).toBe('calc');
  expect(await health(page)).toBe(before);
});

test('Mana has the keypad too: Spend takes what the keys say', async ({ page }) => {
  await openFirstCharacter(page);
  const mana = () => page.locator('[data-bind="manaCur"]').first().textContent().then(Number);
  const before = await mana();
  await press(page, '[data-calc="mana"]');
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('calc');
  await expect(page.locator('.modal--calc .calc-pad')).toBeVisible();
  await expect(field(page)).toHaveAttribute('inputmode', 'none');
  await expect(page.locator('[data-calc-apply="damage"]')).toHaveText('Spend');
  await keys(page, '2');
  await press(page, '[data-calc-apply="damage"]');
  await expect.poll(mana).toBe(Math.max(0, before - 2));
});
