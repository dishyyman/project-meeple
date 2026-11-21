/* =====================================================================
   MEEPLE — the number pad under the Game Master's forms
   ---------------------------------------------------------------------
   The hero and enemy editors are columns of numbers. Each used to raise the
   phone's keyboard — on an iPhone a number pad with no minus key, so −1
   Evasion could not be entered. Now every such field is inputmode="none"
   and docks the app's own pad under the form (main.js "NUMBER PAD",
   dice.css §11b). These drive it by its keys, the way a GM on a phone
   would:
     · a tapped field is retyped, not appended to (10 → 2, 5 → 25);
     · ± makes a negative — lit only where a negative is allowed;
     · Next walks the number fields, and says Done on the last;
     · an attack's Damage gets the dice keys, built as the calculator
       builds them;
     · a desktop keyboard still types, held to digits (and a leading minus);
     · Done and Escape put the pad away without touching the form.

   That a real phone keeps its own keyboard down is inputmode="none",
   asserted here as an attribute and checked by hand on a device.
   ===================================================================== */
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr } = require('./helpers/app');

async function newCampaign(page) {
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await page.fill('[data-campaign-name]', 'The Ashen Road');
  await press(page, '[data-campaign-save]');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
}

const heroForm = (page) => page.locator('.modal--hero-form');
const enemyForm = (page) => page.locator('.modal--enemy-form');
// A key on the pad inside `form`.
const key = (form, k) => form.locator(`.numpad [data-numpad-key="${k}"]`);
const keys = async (form, ...ks) => { for (const k of ks) await key(form, k).click(); };

async function openHeroForm(page) {
  await openApp(page);
  await newCampaign(page);
  await page.getByRole('button', { name: 'Add Hero' }).click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('hero-form');
  await page.fill('[data-hero-field="name"]', 'Brin Ashford');
}

async function openEnemyForm(page) {
  await openApp(page);
  await newCampaign(page);
  await press(page, '.tabbar__btn[data-campaign-tab="enemies"]');
  await page.getByRole('button', { name: 'Add Enemy' }).click();
  await page.locator('.modal--monsters').getByRole('button', { name: 'New Enemy' }).click();
  await expect.poll(() => appAttr(page, 'data-modal')).toBe('enemy-form');
  await page.fill('[data-enemy-field="name"]', 'Ogre Brute');
}

test('a number field raises the pad, not the device keyboard; a text field does not', async ({ page }) => {
  await openHeroForm(page);
  const form = heroForm(page);
  // The name field is text: the phone's own keyboard is right there.
  await expect(form).not.toHaveAttribute('data-numpad-open', /.*/);
  await expect(form.locator('.numpad')).toBeHidden();

  const hp = page.locator('[data-hero-field="hp"]');
  await expect(hp).toHaveAttribute('inputmode', 'none');
  await hp.click();
  await expect(form).toHaveAttribute('data-numpad-open', 'count');
  await expect(form.locator('.numpad')).toBeVisible();
  await expect(form.locator('[data-numpad-for]')).toHaveText('Health');
  await expect(hp).toBeFocused();
  // Health cannot go below 0, so ± is there but dimmed.
  await expect(form.locator('[data-numpad-sign]')).toHaveAttribute('aria-disabled', 'true');
  // A count field has no dice row and no + / −.
  await expect(key(form, 'd6')).toBeHidden();
  await expect(key(form, '+')).toBeHidden();

  // Back to a text field: the pad goes.
  await page.locator('[data-hero-field="label"]').click();
  await expect(form).not.toHaveAttribute('data-numpad-open', /.*/);
});

test('a tapped field is retyped; keys keep focus in it; Next walks the fields to Done', async ({ page }) => {
  await openHeroForm(page);
  const form = heroForm(page);
  const hp = page.locator('[data-hero-field="hp"]');
  await expect(hp).toHaveValue('10');       // the class base block's Health
  await hp.click();
  await keys(form, '2', '5');
  await expect(hp).toHaveValue('25');        // replaced, not "1025"
  await expect(hp).toBeFocused();            // a real click on a key left it there

  await form.locator('[data-numpad-next]').click();
  const mana = page.locator('[data-hero-field="mana"]');
  await expect(mana).toBeFocused();
  await expect(form.locator('[data-numpad-for]')).toHaveText('Mana');
  // 0 then 4 is 4, not 04.
  await keys(form, '0', '4');
  await expect(mana).toHaveValue('4');

  // Walk on to Speed, the last: Next says Done there.
  for (let i = 0; i < 6; i++) await form.locator('[data-numpad-next]').click();
  await expect(page.locator('[data-hero-field="speed"]')).toBeFocused();
  await expect(form.locator('[data-numpad-next]')).toHaveText('Done');
  await form.locator('[data-numpad-next]').click();
  await expect(form).not.toHaveAttribute('data-numpad-open', /.*/);
  // The form is still open — Done put the pad away, nothing more.
  expect(await appAttr(page, 'data-modal')).toBe('hero-form');
});

test('± makes a negative stat, which the hero card shows', async ({ page }) => {
  await openHeroForm(page);
  const form = heroForm(page);
  const evasion = page.locator('[data-hero-field="evasion"]');
  await evasion.click();
  await expect(form).toHaveAttribute('data-numpad-open', 'signed');
  await expect(form.locator('[data-numpad-sign]')).toHaveAttribute('aria-disabled', 'false');
  await keys(form, '3');
  await form.locator('[data-numpad-sign]').click();
  await expect(evasion).toHaveValue('-3');
  // ± again flips it back; the maxlength (−999) holds a fifth character off.
  await form.locator('[data-numpad-sign]').click();
  await expect(evasion).toHaveValue('3');
  await form.locator('[data-numpad-sign]').click();
  await keys(form, '1', '2', '3');
  await expect(evasion).toHaveValue('-312');
  await page.locator('.modal--hero-form [data-numpad-back]').click();
  await page.locator('.modal--hero-form [data-numpad-back]').click();
  await expect(evasion).toHaveValue('-3');

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const card = page.locator('.hero-card', { hasText: 'Brin Ashford' });
  await expect(card.locator('.combat-cell__value').first()).toHaveText(/^[-−]3$/);
});

test('hold delete to clear the field', async ({ page }) => {
  await openHeroForm(page);
  const hp = page.locator('[data-hero-field="hp"]');
  await hp.click();
  await keys(heroForm(page), '4', '2');
  // Settled where it lands before the pointer goes down on it.
  await expect.poll(() => page.evaluate(() =>
    document.querySelector('.modal--hero-form .numpad').getAnimations().length)).toBe(0);
  const back = page.locator('.modal--hero-form [data-numpad-back]');
  const box = await back.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(hp).toHaveValue('');
  await page.mouse.up();
  await keys(heroForm(page), '7');
  await expect(hp).toHaveValue('7');
});

test('an attack: To-Hit by ±, Damage on the dice keys, both saved as written', async ({ page }) => {
  await openEnemyForm(page);
  const form = enemyForm(page);
  const row = page.locator('[data-attack-row]').first();
  await row.locator('[data-attack-field="name"]').fill('Greatclub');

  const toHit = row.locator('[data-attack-field="toHit"]');
  await toHit.click();
  // The bar names the attack as well: there may be several To-Hit fields.
  await expect(form.locator('[data-numpad-for]')).toHaveText('Greatclub · To-Hit');
  await keys(form, '2');
  await form.locator('[data-numpad-sign]').click();
  await expect(toHit).toHaveValue('-2');

  await form.locator('[data-numpad-next]').click();
  const damage = row.locator('[data-attack-field="damage"]');
  await expect(damage).toBeFocused();
  await expect(form).toHaveAttribute('data-numpad-open', 'dice');
  await expect(key(form, 'd8')).toBeVisible();
  await expect(form.locator('[data-numpad-sign]')).toBeHidden();
  // Additive dice keys, as the calculator's: d8 twice is 2d8.
  await keys(form, 'd8', 'd8', '+', '3');
  await expect(damage).toHaveValue('2d8+3');
  // Delete takes a whole die term's sides with it: 2d8+3 → 2d8+ → 2d8 → 2.
  await form.locator('[data-numpad-back]').click();
  await form.locator('[data-numpad-back]').click();
  await form.locator('[data-numpad-back]').click();
  await expect(damage).toHaveValue('2');
  await keys(form, 'd8', '-', '1');
  await expect(damage).toHaveValue('2d8-1');

  await page.getByRole('button', { name: 'Create' }).click();
  const saved = await page.evaluate(() => {
    const { ids } = JSON.parse(localStorage.getItem('meeple.campaigns'));
    return JSON.parse(localStorage.getItem(`meeple.campaign.${ids[0]}`)).enemies[0].attacks[0];
  });
  expect(saved.toHit).toBe(-2);
  expect(saved.damage).toBe('2d8-1');
});

test('a desktop keyboard still types, held to digits and a leading minus', async ({ page }) => {
  await openHeroForm(page);
  const armor = page.locator('[data-hero-field="armor"]');
  await armor.click();
  await page.keyboard.press('Backspace');   // the tap selected it all
  await page.keyboard.type('a-1b2');
  await expect(armor).toHaveValue('-12');
  // A count field takes no minus at all.
  const wounds = page.locator('[data-hero-field="wounds"]');
  await wounds.click();
  await page.keyboard.press('Backspace');
  await page.keyboard.type('-5');
  await expect(wounds).toHaveValue('5');
});

test('Escape and Done put the pad away and leave the form open', async ({ page }) => {
  await openHeroForm(page);
  const form = heroForm(page);
  await page.locator('[data-hero-field="hp"]').click();
  await expect(form).toHaveAttribute('data-numpad-open', 'count');
  await page.keyboard.press('Escape');
  await expect(form).not.toHaveAttribute('data-numpad-open', /.*/);
  expect(await appAttr(page, 'data-modal')).toBe('hero-form');

  // Tapping the same field again brings it back.
  await page.locator('[data-hero-field="hp"]').click();
  await expect(form).toHaveAttribute('data-numpad-open', 'count');
  await form.locator('[data-numpad-done]').click();
  await expect(form).not.toHaveAttribute('data-numpad-open', /.*/);
  expect(await appAttr(page, 'data-modal')).toBe('hero-form');

  // And closing the form takes the pad with it: the next form opens clean.
  await page.locator('[data-hero-field="hp"]').click();
  await form.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Add Hero' }).click();
  await expect(form).not.toHaveAttribute('data-numpad-open', /.*/);
});
