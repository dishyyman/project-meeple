/* =====================================================================
   MEEPLE — Game Master Tools, phase 2: the Party tab
   ---------------------------------------------------------------------
   docs/testing.md §5, Flow 15. A hero is a CARD (the build half of every
   stat, worked out on the player's device) plus VITALS the GM changes
   through the player's own rules (mechanics.js). These pin:
     · a file's hero shows the numbers the player's sheet shows;
     · damage takes the hero's Armor off, Armor Piercing does not;
     · Wounds and Boons & Conditions move the defences as on the sheet;
     · a newer file updates the card and keeps the GM's vitals;
     · NOTHING the GM does reaches the open character, or the GM's own
       compendium;
     · a hostile file is text, a multi-character file asks who.
   ===================================================================== */
const path = require('path');
const fs = require('fs');
const { test, expect } = require('./helpers/test');
const { openApp, press, appAttr } = require('./helpers/app');

const FILES = path.join(__dirname, '..', 'fixtures', 'files');
const ELARA = path.join(FILES, 'elara.meeple.json');
const MALICIOUS = path.join(FILES, 'malicious.meeple.json');

async function newCampaign(page) {
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-campaign-new]');
  await page.fill('[data-campaign-name]', 'The Ashen Road');
  await press(page, '[data-campaign-save]');
  await expect.poll(() => appAttr(page, 'data-view')).toBe('campaign');
}

// "From a File", answered with `file` (a path, or { name, mimeType, buffer }).
async function fromFile(page, file) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'From a File' }).click(),
  ]);
  await chooser.setFiles(file);
}

const card = (page, name) => page.locator('.hero-card', { has: page.locator('.hero-card__name', { hasText: name }) });
const health = (c) => c.locator('.vital[data-resource="health"] .vital__value');
const defences = (c) => c.locator('.combat-cell__value').allInnerTexts();

// The player's own save, untouched by anything on the GM side.
const playerSave = (page) => page.evaluate(() => localStorage.getItem('meeple.character.aurelia'));

async function hit(page, c, amount, { pierce = false } = {}) {
  await c.locator('[data-hero-calc="health"]').click();
  expect(await appAttr(page, 'data-modal')).toBe('calc');
  await page.fill('[data-calc-input]', String(amount));
  if (pierce) await page.locator('[data-pierce-toggle]').click();
  await page.locator('.modal--calc [data-calc-apply="damage"]').click();
}

test('a hero from a file shows the numbers the player\'s sheet shows', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await fromFile(page, ELARA);

  const elara = card(page, 'Elara Starwhisper');
  await expect(elara).toHaveCount(1);
  await expect(elara.locator('.hero-card__label')).toHaveText('5 Hunter');
  await expect(health(elara)).toHaveText('7 / 9');
  expect(await defences(elara)).toEqual(['14', '+2', '10', '5']);
  await expect(elara.locator('.pip.is-on')).toHaveCount(1);
  await expect(elara.locator('.effect-row__name')).toHaveText(['Protection', 'Bleed']);
  // The file's content snapshot was BORROWED, not kept.
  expect(await page.evaluate(() => localStorage.getItem('meeple.imported-entries'))).toBeNull();
  await expect(page.locator('[data-block="partyEmpty"]')).toBeHidden();
});

test('damage takes the hero\'s Armor off; Armor Piercing does not', async ({ page }) => {
  await openApp(page);
  const before = await playerSave(page);
  await newCampaign(page);
  await fromFile(page, ELARA);
  const elara = card(page, 'Elara Starwhisper');

  await hit(page, elara, 5);                         // Armor +2 → 3 lands
  await expect(health(elara)).toHaveText('4 / 9');
  await hit(page, elara, 3, { pierce: true });       // all 3 land
  await expect(health(elara)).toHaveText('1 / 9');

  // The open character is the player's, and never moved.
  expect(await playerSave(page)).toBe(before);
});

test('a hit through the bar takes a Wound, clears Boons, and moves the defences', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await fromFile(page, ELARA);
  const elara = card(page, 'Elara Starwhisper');

  await hit(page, elara, 9);                         // 7 Armor-adjusted: empties 7 → Wound 2, refill
  await expect(elara.locator('.pip.is-on')).toHaveCount(2);
  await expect(elara.locator('.effect-row__name')).toHaveText(['Bleed']);   // Protection was a Boon
  await expect(page.locator('[data-toast-text]')).toContainText('Boons were cleared');
  // Armor: +2 with Protection 2 and one Wound → 0 + shield 2, two Wounds, no Protection.
  expect((await defences(elara))[1]).toBe('-2');
});

test('the last Wound downs the hero, and the card says so', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await fromFile(page, ELARA);
  const elara = card(page, 'Elara Starwhisper');
  await elara.locator('[data-hero-wound]').last().click();
  await expect(elara).toHaveAttribute('data-downed', '');
  await expect(elara.locator('.hero-card__state')).toHaveText('Downed');
  await expect(page.locator('[data-toast-text]')).toHaveText('Elara Starwhisper is downed.');
  expect(await defences(elara)).toEqual(['8', '0', '8', '0']);   // the downed profile
});

test('Boons & Conditions on a hero, through the player\'s own picker', async ({ page }) => {
  await openApp(page);
  const before = await playerSave(page);
  await newCampaign(page);
  await fromFile(page, ELARA);
  const elara = card(page, 'Elara Starwhisper');

  await elara.locator('[data-hero-effect-open]').click();
  expect(await appAttr(page, 'data-modal')).toBe('effects');
  await press(page, '[data-effect-add="condition.slow"]');
  await expect(elara.locator('.effect-row__name')).toHaveText(['Protection', 'Bleed', 'Slow']);
  expect((await defences(elara))[3]).toBe('4');                 // Speed 5, Slow 1
  await elara.locator('[data-hero-effect-step="condition.slow:-1"]').click();
  await expect(elara.locator('.effect-row__name')).toHaveText(['Protection', 'Bleed']);
  expect(await playerSave(page)).toBe(before);
});

test('a newer file updates the card and keeps the GM\'s vitals', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await fromFile(page, ELARA);
  const elara = card(page, 'Elara Starwhisper');
  await hit(page, elara, 5);
  await expect(health(elara)).toHaveText('4 / 9');

  // The player levels up their Constitution and sends a new file.
  const file = JSON.parse(fs.readFileSync(ELARA, 'utf8'));
  const con = file.characters[0].stats.find((s) => s.name === 'Constitution');
  con.value += 2;
  await page.locator('[data-hero-menu]').click();
  await expect(page.locator('[data-hero-edit]')).toBeHidden();      // the player's numbers, not the GM's
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('.modal--hero-menu').getByRole('button', { name: /Update from File/ }).click(),
  ]);
  await chooser.setFiles({ name: 'elara.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });

  await expect(page.locator('.hero-card')).toHaveCount(1);
  await expect(health(elara)).toHaveText('4 / 11');
  await expect(page.locator('[data-toast-text]')).toHaveText('Elara Starwhisper\'s card is up to date.');
});

test('a file of several characters asks who is joining', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  const file = JSON.parse(fs.readFileSync(ELARA, 'utf8'));
  file.characters.push({ ...file.characters[0], id: 'brin', name: 'Brin Ashford' });
  await fromFile(page, { name: 'party.meeple.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });

  expect(await appAttr(page, 'data-modal')).toBe('file-ask');
  await expect(page.locator('#file-ask-title')).toHaveText('Who is joining?');
  await page.locator('.modal--file-ask').getByRole('button', { name: 'All 2' }).click();
  await expect(page.locator('.hero-card__name')).toHaveText(['Elara Starwhisper', 'Brin Ashford']);
});

test('a hostile file: its name is text, and nothing runs', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await fromFile(page, MALICIOUS);
  await expect(page.locator('.hero-card__name')).toHaveText(/^Mallory <img/);
  expect(await page.locator('.hero-card img').count()).toBe(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('a hero typed in: added, edited, noted, removed — and kept over a reload', async ({ page }) => {
  await openApp(page);
  await newCampaign(page);
  await page.getByRole('button', { name: 'Add Hero' }).click();
  // A name is needed.
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('[data-hero-error]')).toBeVisible();
  await page.fill('[data-hero-field="name"]', 'Brin Ashford');
  await page.fill('[data-hero-field="label"]', 'Warden 5');
  await page.fill('[data-hero-field="hp"]', '12');
  await page.fill('[data-hero-field="armor"]', '4');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const brin = card(page, 'Brin Ashford');
  await expect(health(brin)).toHaveText('12 / 12');
  expect(await defences(brin)).toEqual(['8', '+4', '8', '5']);

  // Typed in → the GM can edit the numbers.
  await brin.locator('[data-hero-menu]').click();
  await expect(page.locator('[data-hero-update]')).toBeHidden();
  await page.locator('.modal--hero-menu').getByRole('button', { name: 'Edit Hero' }).click();
  await page.fill('[data-hero-field="evasion"]', '11');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  expect((await defences(brin))[0]).toBe('11');

  // Notes are the GM's, and say they were saved.
  await brin.locator('[data-hero-menu]').click();
  await page.locator('.modal--hero-menu').getByRole('button', { name: 'Notes' }).click();
  await page.fill('[data-hero-notes]', 'Owes the guild 40 gold.');
  await page.locator('[data-hero-notes-save]').click();
  await expect(page.locator('[data-toast-text]')).toHaveText('Notes saved.');

  await page.reload();
  await page.waitForFunction(() => document.querySelector('.app')?.getAttribute('data-view') === 'home');
  await press(page, '[data-nav="campaigns"]');
  await press(page, '[data-open-campaign]');
  await expect(health(card(page, 'Brin Ashford'))).toHaveText('12 / 12');
  const saved = await page.evaluate(() => {
    const { ids } = JSON.parse(localStorage.getItem('meeple.campaigns'));
    return JSON.parse(localStorage.getItem(`meeple.campaign.${ids[0]}`)).heroes[0];
  });
  expect(saved).toMatchObject({ name: 'Brin Ashford', notes: 'Owes the guild 40 gold.', source: 'manual' });

  // Removing asks first.
  await card(page, 'Brin Ashford').locator('[data-hero-menu]').click();
  await page.locator('.modal--hero-menu').getByRole('button', { name: 'Remove from Party' }).click();
  expect(await appAttr(page, 'data-modal')).toBe('hero-del');
  await page.locator('.modal--hero-del').getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.hero-card')).toHaveCount(0);
  await expect(page.locator('[data-block="partyEmpty"]')).toBeVisible();
});
